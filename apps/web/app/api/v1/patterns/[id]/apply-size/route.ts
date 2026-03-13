import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { parsePatternForSize } from '@/lib/openai'

export const maxDuration = 60

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/patterns/[id]/apply-size
 * Stage 2: Parse instruction steps for a selected size.
 * Requires stored raw_text on the pattern.
 * Pro required (expensive AI call).
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const proError = requirePro(user, 'AI pattern parsing')
  if (proError) return proError

  const body = await req.json()
  const sizeName = body.size_name as string | undefined
  if (!sizeName) {
    return NextResponse.json({ error: 'size_name is required' }, { status: 400 })
  }

  const pattern = await prisma.patterns.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
    include: { sizes: true, sections: true },
  })
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

  // Parse with AI for this specific size
  const sectionNames = pattern.sections.map((s) => s.name)
  let parsed
  try {
    parsed = await parsePatternForSize(pattern.raw_text, sizeName, sectionNames)
  } catch {
    return NextResponse.json({ error: 'AI parsing failed for this size' }, { status: 500 })
  }

  // Delete existing rows (re-parse case) and recreate
  await prisma.$transaction(async (tx) => {
    // Delete old rows for all sections
    const existingSectionIds = pattern.sections.map((s) => s.id)
    if (existingSectionIds.length > 0) {
      await tx.pattern_rows.deleteMany({
        where: { section_id: { in: existingSectionIds } },
      })
      await tx.pattern_sections.deleteMany({
        where: { pattern_id: id },
      })
    }

    // Create new sections with steps
    for (let i = 0; i < parsed.sections.length; i++) {
      const section = parsed.sections[i]
      await tx.pattern_sections.create({
        data: {
          pattern_id: id,
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

  // Return the full updated pattern
  const updated = await prisma.patterns.findUnique({
    where: { id },
    include: {
      sections: {
        include: { rows: { orderBy: { row_number: 'asc' } } },
        orderBy: { sort_order: 'asc' },
      },
      sizes: { orderBy: { sort_order: 'asc' } },
    },
  })

  return NextResponse.json({ success: true, data: updated })
}
