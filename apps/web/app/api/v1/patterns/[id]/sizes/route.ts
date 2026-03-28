import { NextRequest, NextResponse } from 'next/server'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
// POST — Create a new size for a pattern
export const POST = withAuth(async (req, user, params) => {
  const { id } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const body = await req.json()
  const { name } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Size name is required' }, { status: 400 })
  }

  // Get next sort_order
  const maxSort = await prisma.pattern_sizes.aggregate({
    where: { pattern_id: id },
    _max: { sort_order: true },
  })
  const sortOrder = (maxSort._max.sort_order ?? -1) + 1

  const size = await prisma.pattern_sizes.create({
    data: {
      pattern_id: id,
      name: name.trim(),
      sort_order: sortOrder,
      finished_bust_cm: body.finished_bust_cm ?? null,
      finished_length_cm: body.finished_length_cm ?? null,
      hip_cm: body.hip_cm ?? null,
      shoulder_width_cm: body.shoulder_width_cm ?? null,
      arm_length_cm: body.arm_length_cm ?? null,
      upper_arm_cm: body.upper_arm_cm ?? null,
      back_length_cm: body.back_length_cm ?? null,
      head_circumference_cm: body.head_circumference_cm ?? null,
      foot_length_cm: body.foot_length_cm ?? null,
      yardage: body.yardage ?? null,
    },
  })

  return NextResponse.json({ success: true, data: size }, { status: 201 })
})
