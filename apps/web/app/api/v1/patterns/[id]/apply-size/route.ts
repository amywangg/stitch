import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { requireCapacity } from '@/lib/pro-gate'
import { parsePatternForSize } from '@/lib/openai'


export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = withAuth(async (req, user, params) => {
  const id = params!.id

  const body = await req.json()
  const sizeName = body.size_name as string | undefined
  if (!sizeName) {
    return NextResponse.json({ error: 'size_name is required' }, { status: 400 })
  }

  const pattern = await findOwned<{
    id: string; raw_text: string | null; sizes: { id: string; name: string; sort_order: number }[]
  }>(prisma.patterns, id, user.id, { include: { sizes: true } })
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  if (!pattern.raw_text) {
    return NextResponse.json(
      { error: 'Pattern has no stored raw text. Re-upload the PDF to enable size-specific parsing.' },
      { status: 422 }
    )
  }

  const size = pattern.sizes.find((s) => s.name === sizeName)
  if (!size) {
    return NextResponse.json(
      { error: `Size "${sizeName}" not found. Available sizes: ${pattern.sizes.map((s) => s.name).join(', ')}` },
      { status: 400 }
    )
  }

  // Check if we already have cached sections for this size
  const cachedSections = await prisma.pattern_sections.findMany({
    where: { pattern_id: id, size_id: size.id },
    include: { rows: { orderBy: { row_number: 'asc' } } },
    orderBy: { sort_order: 'asc' },
  })

  if (cachedSections.length > 0) {
    // Cached — just update selected_size and return
    await prisma.patterns.update({
      where: { id },
      data: { selected_size: sizeName },
    })

    const updated = await prisma.patterns.findUnique({
      where: { id },
      include: {
        sections: {
          where: { size_id: size.id },
          include: { rows: { orderBy: { row_number: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
        sizes: { orderBy: { sort_order: 'asc' } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  }

  // Not cached — check tier capacity before making AI call
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlyCount = await prisma.pdf_uploads.count({
    where: { user_id: user.id, created_at: { gte: startOfMonth } },
  })

  const capacityError = requireCapacity(user, 'pdfUploadsPerMonth', monthlyCount, 'PDF parses')
  if (capacityError) return capacityError

  // Get existing size-agnostic section names (from Stage 1) to guide the parse
  const shellSections = await prisma.pattern_sections.findMany({
    where: { pattern_id: id, size_id: null },
    orderBy: { sort_order: 'asc' },
  })
  const sectionNames = shellSections.map((s) => s.name)

  // Parse with AI for this specific size
  let parsed
  try {
    parsed = await parsePatternForSize(pattern.raw_text, sizeName, sectionNames)
  } catch {
    return NextResponse.json({ error: 'AI parsing failed for this size' }, { status: 500 })
  }

  // Create new sections with size_id — do NOT delete other sizes' data
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < parsed.sections.length; i++) {
      const section = parsed.sections[i]
      await tx.pattern_sections.create({
        data: {
          pattern_id: id,
          size_id: size.id,
          name: section.name,
          sort_order: i,
          rows: {
            create: section.steps.map((step) => ({
              row_number: step.step_number,
              instruction: step.instruction,
              stitch_count: step.stitch_count,
              row_type: step.row_type,
              rows_in_step: step.rows_in_step,
              is_repeat: step.is_repeat ?? false,
              repeat_count: step.repeat_count,
              rows_per_repeat: step.rows_per_repeat,
              target_measurement_cm: step.target_measurement_cm,
              notes: step.notes,
              size_id: size.id,
            })),
          },
        },
      })
    }

    // Update pattern with selected size
    await tx.patterns.update({
      where: { id },
      data: { selected_size: sizeName },
    })
  })

  // Return the full updated pattern (only sections for this size)
  const updated = await prisma.patterns.findUnique({
    where: { id },
    include: {
      sections: {
        where: { size_id: size.id },
        include: { rows: { orderBy: { row_number: 'asc' } } },
        orderBy: { sort_order: 'asc' },
      },
      sizes: { orderBy: { sort_order: 'asc' } },
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
