import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/route-helpers'
import { requirePro, requireCapacity } from '@/lib/pro-gate'
import { getOpenAI } from '@/lib/openai'
import { buildBlueprint } from '@/lib/pattern-builder/math'
import { buildPatternBuilderPrompt } from '@/lib/prompts/pattern-builder'
import { PROJECT_TYPES, type PatternBuilderInput, type AIPatternOutput } from '@/lib/pattern-builder/types'
import {
  resolveGaugeAndNeedle,
  resolveSizes,
  writePatternToDb,
} from '@/lib/pattern-builder/generate-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
 * POST /api/v1/ai/pattern-builder
 * Generate a new knitting pattern from structured questionnaire input.
 * Pro-gated. Uses deterministic math for construction + AI for instruction prose.
 */
export const POST = withAuth(async (req, user) => {
  const proError = requirePro(user, 'AI pattern builder')
  if (proError) return proError

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

  const blueprint = buildBlueprint(input.project_type, gauge, needleMm, sizes, input.options)

  // Call AI for selected size
  const prompt = buildPatternBuilderPrompt(blueprint, targetSize, input.options)

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const aiContent = completion.choices[0].message.content ?? '{}'
  let aiOutput: AIPatternOutput
  try {
    aiOutput = JSON.parse(aiContent) as AIPatternOutput
  } catch {
    return NextResponse.json(
      { error: 'AI returned invalid JSON', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }

  if (!aiOutput.sections || !Array.isArray(aiOutput.sections)) {
    return NextResponse.json(
      { error: 'AI returned invalid pattern structure', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }

  // Write to DB
  const fullPattern = await writePatternToDb(
    user, blueprint, aiOutput, input, sizes, targetSize,
    gauge, needleMm, effectiveWeight, true,
  )

  return NextResponse.json({ success: true, data: fullPattern }, { status: 201 })
})
