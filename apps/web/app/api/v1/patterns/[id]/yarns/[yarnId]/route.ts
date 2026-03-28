import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// PATCH /api/v1/patterns/:id/yarns/:yarnId — update a pattern yarn
export const PATCH = withAuth(async (req, user, params) => {
  const { id, yarnId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const existing = await prisma.pattern_yarns.findFirst({
    where: { id: yarnId, pattern_id: id },
  })
  if (!existing) return NextResponse.json({ error: 'Yarn not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['name', 'weight', 'colorway', 'fiber_content', 'strands', 'yarn_id'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await prisma.pattern_yarns.update({
    where: { id: yarnId },
    data: updates,
    include: { yarn: { include: { company: true } } },
  })

  return NextResponse.json({ success: true, data: updated })
})

// DELETE /api/v1/patterns/:id/yarns/:yarnId — remove a pattern yarn
export const DELETE = withAuth(async (_req, user, params) => {
  const { id, yarnId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const existing = await prisma.pattern_yarns.findFirst({
    where: { id: yarnId, pattern_id: id },
  })
  if (!existing) return NextResponse.json({ error: 'Yarn not found' }, { status: 404 })

  await prisma.pattern_yarns.delete({ where: { id: yarnId } })

  return NextResponse.json({ success: true, data: {} })
})
