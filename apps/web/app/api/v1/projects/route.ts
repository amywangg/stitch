import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePro, FREE_LIMITS } from '@/lib/pro-gate'
import { emitActivity } from '@/lib/activity'
import { withAuth, parsePagination, paginatedResponse, generateUniqueSlug } from '@/lib/route-helpers'
import { getRavelryClient } from '@/lib/ravelry-client'
import { ravelryCreateProject } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req)

  const [items, total] = await Promise.all([
    prisma.projects.findMany({
      where: { user_id: user.id, deleted_at: null },
      orderBy: { updated_at: 'desc' },
      skip,
      take: limit,
      include: {
        sections: { orderBy: { sort_order: 'asc' } },
        photos: { orderBy: { sort_order: 'asc' }, take: 1 },
      },
    }),
    prisma.projects.count({ where: { user_id: user.id, deleted_at: null } }),
  ])

  return paginatedResponse(items, total, page, limit)
})

export const POST = withAuth(async (req, user) => {
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

  const slug = await generateUniqueSlug(prisma.projects, user.id, title)

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

  emitActivity({ userId: user.id, type: 'project_started', projectId: project.id })

  // Push to Ravelry (non-blocking) — create project and capture ravelry_id
  getRavelryClient(user.id).then(async (client) => {
    if (!client) return
    const conn = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
    if (!conn) return
    const ravelryId = await ravelryCreateProject(client, conn.ravelry_username, {
      name: project.title,
      notes: project.description ?? undefined,
      craft_type: project.craft_type,
      started_at: project.started_at,
    })
    if (ravelryId) {
      await prisma.projects.update({
        where: { id: project.id },
        data: { ravelry_id: String(ravelryId) },
      })
    }
  }).catch(err => console.error('[ravelry-push] project create:', err))

  return NextResponse.json({ success: true, data: project }, { status: 201 })
})
