import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { buildBlueprint } from '@/lib/pattern-builder/math'
import { blueprintToPattern } from '@/lib/pattern-builder/templates'
import type { PatternBuilderInput, SizeSpec } from '@/lib/pattern-builder/types'
import {
  resolveGaugeAndNeedle,
  getSizeChart,
  writeSectionsForSize,
  fetchFullPattern,
} from '@/lib/pattern-builder/generate-helpers'

export const dynamic = 'force-dynamic'

const GenerateSizeSchema = z.object({
  size_name: z.string().trim().min(1).max(50),
})

/**
 * POST /api/v1/patterns/generate/[patternId]/size
 * Generate instructions for an additional size of a template-generated pattern.
 * Available to ALL tiers — no requirePro().
 */
export const POST = withAuth(async (req, user, params) => {
  const { patternId } = params!

  const pattern = await findOwned<any>(prisma.patterns, patternId, user.id, {
    include: { sizes: true, sections: { include: { rows: true } } },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (!pattern.builder_input) {
    return NextResponse.json(
      { error: 'Pattern is missing builder input data', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const body = await req.json()
  const parsed = GenerateSizeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { size_name } = parsed.data

  const targetSizeRecord = pattern.sizes.find((s: any) => s.name === size_name)
  if (!targetSizeRecord) {
    return NextResponse.json(
      { error: `Size "${size_name}" not found on this pattern`, code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  // Check if sections already exist (cache hit)
  const existingSections = pattern.sections.filter((s: any) => s.size_id === targetSizeRecord.id)
  if (existingSections.length > 0) {
    const fullPattern = await fetchFullPattern(pattern.id)
    return NextResponse.json({ success: true, data: fullPattern })
  }

  const input = pattern.builder_input as unknown as PatternBuilderInput
  const { gauge, needleMm } = resolveGaugeAndNeedle(input)

  const sizeChart = getSizeChart(input.project_type)
  let sizes: SizeSpec[]

  if (input.project_type === 'scarf_cowl') {
    const opts = input.options as { width_cm?: number; length_cm?: number; circumference_cm?: number }
    sizes = [{
      name: 'One Size',
      measurements: {
        width_cm: opts.width_cm ?? 20,
        length_cm: opts.length_cm ?? 150,
        circumference_cm: opts.circumference_cm ?? 60,
      },
    }]
  } else {
    sizes = Object.entries(sizeChart).map(([name, measurements]) => ({
      name,
      measurements: measurements as Record<string, number>,
    }))
  }

  if (!sizes.find((s) => s.name === size_name)) {
    return NextResponse.json(
      { error: `Size "${size_name}" not found in size chart`, code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const blueprint = buildBlueprint(input.project_type, gauge, needleMm, sizes, input.options)

  // Template layer — instant, no AI
  const output = blueprintToPattern(blueprint, size_name, input.options)

  await writeSectionsForSize(pattern.id, targetSizeRecord.id, blueprint, output, size_name)

  const fullPattern = await fetchFullPattern(pattern.id)
  return NextResponse.json({ success: true, data: fullPattern })
})
