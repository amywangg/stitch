import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPushClient } from '@/lib/ravelry-push'
import { emitActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50')

  const [items, total] = await Promise.all([
    prisma.user_stash.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { yarn: { include: { company: true } } },
    }),
    prisma.user_stash.count({ where: { user_id: user.id } }),
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
  const body = await req.json()
  const { yarn_id, colorway, skeins, grams, notes } = body

  // Accept either an existing yarn_id OR ravelry yarn data to auto-create
  const { ravelry_yarn } = body as {
    ravelry_yarn?: {
      ravelry_id: number
      name: string
      company_name: string
      weight?: string | null
      yardage?: number | null
      grams?: number | null
      photo_url?: string | null
      fiber_content?: string | null
    }
  }

  let resolvedYarnId = yarn_id

  // If ravelry_yarn is provided, find or create the yarn + company
  if (!resolvedYarnId && ravelry_yarn) {
    // Check if we already have this yarn by ravelry_id
    const existing = await prisma.yarns.findUnique({
      where: { ravelry_id: String(ravelry_yarn.ravelry_id) },
    })
    if (existing) {
      resolvedYarnId = existing.id
    } else {
      // Find or create company
      let companyId: string | null = null
      if (ravelry_yarn.company_name) {
        const company = await prisma.yarn_companies.upsert({
          where: { name: ravelry_yarn.company_name },
          update: {},
          create: { name: ravelry_yarn.company_name },
        })
        companyId = company.id
      }

      // Create yarn
      const newYarn = await prisma.yarns.create({
        data: {
          name: ravelry_yarn.name,
          company_id: companyId,
          ravelry_id: String(ravelry_yarn.ravelry_id),
          weight: ravelry_yarn.weight ?? null,
          yardage_per_skein: ravelry_yarn.yardage ?? null,
          grams_per_skein: ravelry_yarn.grams ?? null,
          image_url: ravelry_yarn.photo_url ?? null,
          fiber_content: ravelry_yarn.fiber_content ?? null,
        },
      })
      resolvedYarnId = newYarn.id
    }
  }

  if (!resolvedYarnId) return NextResponse.json({ error: 'yarn_id or ravelry_yarn is required' }, { status: 400 })

  const yarn = await prisma.yarns.findUnique({ where: { id: resolvedYarnId } })
  if (!yarn) return NextResponse.json({ error: 'Yarn not found' }, { status: 404 })

  const item = await prisma.user_stash.create({
    data: {
      user_id: user.id,
      yarn_id: resolvedYarnId,
      colorway: colorway ?? null,
      skeins: skeins ?? 1,
      grams: grams ?? null,
      notes: notes ?? null,
    },
    include: { yarn: { include: { company: true } } },
  })

  emitActivity({
    userId: user.id,
    type: 'stash_added',
    metadata: { yarnName: yarn.name },
  })

  // Ravelry write-back
  const push = await getRavelryPushClient(user.id)
  if (push) {
    try {
      const { stash: rs } = await push.client.createStashItem({
        name: colorway ? `${yarn.name} - ${colorway}` : yarn.name,
        colorway: colorway ?? undefined,
        skeins: skeins ?? undefined,
        grams: grams ?? undefined,
        notes: notes ?? undefined,
      })
      await prisma.user_stash.update({
        where: { id: item.id },
        data: { ravelry_id: String(rs.id) },
      })
    } catch {
      // Ravelry unavailable — stash item still created in Stitch
    }
  }

  return NextResponse.json({ success: true, data: item }, { status: 201 })
}
