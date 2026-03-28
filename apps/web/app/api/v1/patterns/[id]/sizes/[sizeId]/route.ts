import { NextRequest, NextResponse } from 'next/server'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
// PATCH — Update a size
export const PATCH = withAuth(async (req, user, params) => {
  const { id, sizeId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const size = await prisma.pattern_sizes.findFirst({
    where: { id: sizeId, pattern_id: id },
  })
  if (!size) return NextResponse.json({ error: 'Size not found' }, { status: 404 })

  const body = await req.json()
  const allowed = [
    'name', 'finished_bust_cm', 'finished_length_cm', 'hip_cm',
    'shoulder_width_cm', 'arm_length_cm', 'upper_arm_cm', 'back_length_cm',
    'head_circumference_cm', 'foot_length_cm', 'yardage',
  ] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if ('name' in updates && !(updates.name as string)?.trim()) {
    return NextResponse.json({ error: 'Size name cannot be empty' }, { status: 400 })
  }

  const updated = await prisma.pattern_sizes.update({
    where: { id: sizeId },
    data: updates,
  })

  return NextResponse.json({ success: true, data: updated })
})

// DELETE — Delete a size (cascades to size-specific sections and rows)
export const DELETE = withAuth(async (_req, user, params) => {
  const { id, sizeId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const size = await prisma.pattern_sizes.findFirst({
    where: { id: sizeId, pattern_id: id },
  })
  if (!size) return NextResponse.json({ error: 'Size not found' }, { status: 404 })

  // Cascade: pattern_sections and pattern_rows with this size_id are deleted via schema cascade
  await prisma.pattern_sizes.delete({ where: { id: sizeId } })

  return NextResponse.json({ success: true, data: {} })
})
