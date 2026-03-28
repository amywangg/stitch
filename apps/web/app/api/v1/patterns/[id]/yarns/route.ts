import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// GET /api/v1/patterns/:id/yarns — list yarns for a pattern
export const GET = withAuth(async (_req, user, params) => {
  const { id } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const yarns = await prisma.pattern_yarns.findMany({
    where: { pattern_id: id },
    include: { yarn: { include: { company: true } } },
    orderBy: { sort_order: 'asc' },
  })

  return NextResponse.json({ success: true, data: yarns })
})

// POST /api/v1/patterns/:id/yarns — add a yarn to a pattern
export const POST = withAuth(async (req, user, params) => {
  const { id } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const body = await req.json()
  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Yarn name is required' }, { status: 400 })
  }

  // Auto sort_order
  const maxOrder = await prisma.pattern_yarns.aggregate({
    where: { pattern_id: id },
    _max: { sort_order: true },
  })

  const yarn = await prisma.pattern_yarns.create({
    data: {
      pattern_id: id,
      yarn_id: body.yarn_id ?? null,
      name,
      weight: body.weight ?? null,
      colorway: body.colorway ?? null,
      fiber_content: body.fiber_content ?? null,
      strands: body.strands ?? 1,
      sort_order: (maxOrder._max.sort_order ?? -1) + 1,
    },
    include: { yarn: { include: { company: true } } },
  })

  return NextResponse.json({ success: true, data: yarn }, { status: 201 })
})

// DELETE all pattern yarns (not used, but PUT for reorder)
export const PUT = withAuth(async (req, user, params) => {
  const { id } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const body = await req.json()
  const yarnIds: string[] = body.yarn_ids
  if (!Array.isArray(yarnIds)) {
    return NextResponse.json({ error: 'yarn_ids array required' }, { status: 400 })
  }

  await Promise.all(
    yarnIds.map((yarnId, i) =>
      prisma.pattern_yarns.updateMany({
        where: { id: yarnId, pattern_id: id },
        data: { sort_order: i },
      })
    )
  )

  return NextResponse.json({ success: true, data: {} })
})
