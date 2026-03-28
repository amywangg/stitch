import { NextRequest, NextResponse } from 'next/server'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
// PATCH — Update a row (step)
export const PATCH = withAuth(async (req, user, params) => {
  const { id, sectionId, rowId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const row = await prisma.pattern_rows.findFirst({
    where: { id: rowId, section_id: sectionId },
  })
  if (!row) return NextResponse.json({ error: 'Row not found' }, { status: 404 })

  // Verify section belongs to pattern
  const section = await prisma.pattern_sections.findFirst({
    where: { id: sectionId, pattern_id: id },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const body = await req.json()
  const allowed = [
    'instruction', 'stitch_count', 'row_type', 'rows_in_step',
    'is_repeat', 'repeat_count', 'rows_per_repeat', 'target_measurement_cm', 'notes',
  ] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if ('instruction' in updates && !(updates.instruction as string)?.trim()) {
    return NextResponse.json({ error: 'Instruction text cannot be empty' }, { status: 400 })
  }

  const updated = await prisma.pattern_rows.update({
    where: { id: rowId },
    data: updates,
  })

  return NextResponse.json({ success: true, data: updated })
})

// DELETE — Delete a row and renumber remaining rows
export const DELETE = withAuth(async (_req, user, params) => {
  const { id, sectionId, rowId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const section = await prisma.pattern_sections.findFirst({
    where: { id: sectionId, pattern_id: id },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const row = await prisma.pattern_rows.findFirst({
    where: { id: rowId, section_id: sectionId },
  })
  if (!row) return NextResponse.json({ error: 'Row not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.pattern_rows.delete({ where: { id: rowId } })

    // Renumber remaining rows sequentially
    const remaining = await tx.pattern_rows.findMany({
      where: { section_id: sectionId },
      orderBy: { row_number: 'asc' },
    })
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].row_number !== i + 1) {
        await tx.pattern_rows.update({
          where: { id: remaining[i].id },
          data: { row_number: i + 1 },
        })
      }
    }
  })

  return NextResponse.json({ success: true, data: {} })
})
