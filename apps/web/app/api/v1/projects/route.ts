import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro, FREE_LIMITS } from '@/lib/pro-gate'
import { slugify } from '@/lib/utils'
import { getRavelryPushClient } from '@/lib/ravelry-push'
import { emitActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20')

  const [items, total] = await Promise.all([
    prisma.projects.findMany({
      where: { user_id: user.id, deleted_at: null },
      orderBy: { updated_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sections: { orderBy: { sort_order: 'asc' } },
        photos: { orderBy: { sort_order: 'asc' }, take: 1 },
      },
    }),
    prisma.projects.count({ where: { user_id: user.id, deleted_at: null } }),
  ])

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize: limit, hasMore: total > page * limit },
  })
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  // Free tier: max 3 active projects
  if (!user.is_pro) {
    const activeCount = await prisma.projects.count({
      where: { user_id: user.id, deleted_at: null, status: 'active' },
    })
    if (activeCount >= FREE_LIMITS.activeProjects) {
      const err = requirePro(user, `more than ${FREE_LIMITS.activeProjects} active projects`)
      return err!
    }
  }

  const body = await req.json()
  const { title, description, craft_type, started_at } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  let slug = slugify(title)
  let attempt = 0
  while (await prisma.projects.findUnique({ where: { user_id_slug: { user_id: user.id, slug } } })) {
    attempt++
    slug = `${slugify(title)}-${attempt}`
  }

  const project = await prisma.projects.create({
    data: {
      user_id: user.id,
      slug,
      title: title.trim(),
      description: description?.trim() ?? null,
      craft_type: craft_type ?? 'knitting',
      started_at: started_at ? new Date(started_at) : null,
      sections: {
        create: [{ name: 'Main', sort_order: 0 }],
      },
    },
    include: { sections: true },
  })

  // Ravelry write-back: create project on Ravelry and store returned IDs
  const push = await getRavelryPushClient(user.id)
  if (push) {
    try {
      const { project: rp } = await push.client.createProject({
        name: project.title,
        status_name: 'In Progress',
        craft_name: project.craft_type === 'crochet' ? 'Crochet' : 'Knitting',
        ...(project.started_at ? { started: project.started_at.toISOString().slice(0, 10) } : {}),
      })
      await prisma.projects.update({
        where: { id: project.id },
        data: { ravelry_id: String(rp.id), ravelry_permalink: rp.permalink },
      })
    } catch {
      // Ravelry unavailable — project still created in Stitch
    }
  }

  emitActivity({ userId: user.id, type: 'project_started', projectId: project.id })

  return NextResponse.json({ success: true, data: project }, { status: 201 })
}
