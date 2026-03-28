import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { requirePro, requireCapacity } from '@/lib/pro-gate'
import { buildBlueprint } from '@/lib/pattern-builder/math'
import { blueprintToPattern } from '@/lib/pattern-builder/templates'
import { PROJECT_TYPES, type PatternBuilderInput } from '@/lib/pattern-builder/types'
import {
  resolveGaugeAndNeedle,
  resolveSizes,
  writePatternToDb,
} from '@/lib/pattern-builder/generate-helpers'

export const dynamic = 'force-dynamic'

// ─── Validation ─────────────────────────────────────────────────────────────

const YarnSelectionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  weight: z.string(),
  fiber_content: z.string().nullish(),
  strands: z.number().int().min(1).max(5).default(1),
})

const PatternBuilderInputSchema = z.object({
  project_type: z.enum(PROJECT_TYPES),
  yarns: z.array(YarnSelectionSchema).min(1).max(5),
  needle_size_mm: z.number().min(1).max(25).optional(),
  gauge_override: z.object({
    stitches_per_10cm: z.number().min(2).max(60),
    rows_per_10cm: z.number().min(2).max(80),
  }).optional(),
  options: z.record(z.unknown()),
  target_size: z.string().max(50).optional(),
  custom_measurements: z.record(z.number()).optional(),
  use_my_measurements: z.boolean().optional(),
})

/**
 * POST /api/v1/patterns/generate
 * Generate a knitting pattern using the template layer (no AI).
 * Available to ALL tiers — no requirePro().
 */
export const POST = withAuth(async (req, user) => {
  const proErr = requirePro(user, 'AI pattern builder')
  if (proErr) return proErr

  // Validate input
  const body = await req.json()
  const parsed = PatternBuilderInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const input = parsed.data as unknown as PatternBuilderInput

  // Check saved patterns capacity
  const patternCount = await prisma.patterns.count({
    where: { user_id: user.id, deleted_at: null },
  })
  const capacityError = requireCapacity(user, 'savedPatterns', patternCount, 'Saved patterns')
  if (capacityError) return capacityError

  // Resolve gauge, sizes, and build blueprint
  const { gauge, needleMm, effectiveWeight } = resolveGaugeAndNeedle(input)
  const sizes = await resolveSizes(input, user.id)

  if (sizes.length === 0) {
    return NextResponse.json(
      { error: 'No sizes available for this project type', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const targetSize = input.target_size ?? sizes[Math.floor(sizes.length / 2)].name
  if (!sizes.find((s) => s.name === targetSize)) {
    return NextResponse.json(
      { error: `Size "${targetSize}" not found in available sizes`, code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  // Run deterministic math
  const blueprint = buildBlueprint(input.project_type, gauge, needleMm, sizes, input.options)

  // Template layer — instant, no AI
  const output = blueprintToPattern(blueprint, targetSize, input.options)

  // Write to DB (ai_generated = false)
  const fullPattern = await writePatternToDb(
    user, blueprint, output, input, sizes, targetSize,
    gauge, needleMm, effectiveWeight, false,
  )

  return NextResponse.json({ success: true, data: fullPattern }, { status: 201 })
})
