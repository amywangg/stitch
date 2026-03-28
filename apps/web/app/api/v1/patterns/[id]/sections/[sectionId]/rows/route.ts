import { NextRequest, NextResponse } from 'next/server'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
// POST — Create a new row (step) in a section
export const POST = withAuth(async (req, user, params) => {
  const { id, sectionId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const section = await prisma.pattern_sections.findFirst({
    where: { id: sectionId, pattern_id: id },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const body = await req.json()
  const { instruction, stitch_count, row_type, rows_in_step, is_repeat, repeat_count, rows_per_repeat, target_measurement_cm, notes } = body

  if (!instruction?.trim()) {
    return NextResponse.json({ error: 'Instruction text is required' }, { status: 400 })
  }

  // Get next row_number
  const maxRow = await prisma.pattern_rows.aggregate({
    where: { section_id: sectionId },
    _max: { row_number: true },
  })
  const rowNumber = (maxRow._max.row_number ?? 0) + 1

  const row = await prisma.pattern_rows.create({
    data: {
      section_id: sectionId,
      row_number: rowNumber,
      instruction: instruction.trim(),
      stitch_count: stitch_count ?? null,
      row_type: row_type ?? null,
      rows_in_step: rows_in_step ?? null,
      is_repeat: is_repeat ?? false,
      repeat_count: repeat_count ?? null,
      rows_per_repeat: rows_per_repeat ?? null,
      target_measurement_cm: target_measurement_cm ?? null,
      notes: notes?.trim() ?? null,
      size_id: section.size_id,
    },
  })

  return NextResponse.json({ success: true, data: row }, { status: 201 })
})

// PUT — Reorder rows within a section
export const PUT = withAuth(async (req, user, params) => {
  const { id, sectionId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const section = await prisma.pattern_sections.findFirst({
    where: { id: sectionId, pattern_id: id },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const body = await req.json()
  const { row_ids } = body as { row_ids: string[] }

  if (!Array.isArray(row_ids) || row_ids.length === 0) {
    return NextResponse.json({ error: 'row_ids array is required' }, { status: 400 })
  }

  // Verify all rows belong to this section
  const rows = await prisma.pattern_rows.findMany({
    where: { id: { in: row_ids }, section_id: sectionId },
  })
  if (rows.length !== row_ids.length) {
    return NextResponse.json({ error: 'One or more rows not found' }, { status: 400 })
  }

  await prisma.$transaction(
    row_ids.map((rowId, idx) =>
      prisma.pattern_rows.update({
        where: { id: rowId },
        data: { row_number: idx + 1 },
      })
    )
  )

  return NextResponse.json({ success: true, data: {} })
})
