import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { requirePro } from '@/lib/pro-gate'
import { getOpenAI } from '@/lib/openai'
import {
  scoreSizes,
  checkMeasurementCoverage,
  EASE_PREFERENCES,
  type BodyMeasurements,
  type PatternSize,
  type EasePreference,
} from '@/lib/size-math'
import { buildSizeRecPrompt, type SizeRecAIResponse } from '@/lib/prompts/size-rec'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ─── Input validation ────────────────────────────────────────────────────────

const requestSchema = z.object({
  pattern_id: z.string().uuid(),
  ease_preference: z.enum(EASE_PREFERENCES as unknown as [string, ...string[]]).default('standard'),
  // Optional body measurement overrides (otherwise pulled from user_measurements)
  measurements: z
    .object({
      bust_cm: z.number().positive().optional(),
      waist_cm: z.number().positive().optional(),
      hip_cm: z.number().positive().optional(),
      shoulder_width_cm: z.number().positive().optional(),
      back_length_cm: z.number().positive().optional(),
      arm_length_cm: z.number().positive().optional(),
      upper_arm_cm: z.number().positive().optional(),
      head_circumference_cm: z.number().positive().optional(),
      foot_length_cm: z.number().positive().optional(),
    })
    .optional(),
})

// ─── Route handler ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/size-rec
 * Size recommendation tool — scores all pattern sizes against body measurements,
 * accounting for ease preference and garment type.
 *
 * Uses user_measurements from DB by default; request can override individual values.
 * Returns deterministic scoring + AI-generated fit advice.
 */
export const POST = withAuth(async (req, user) => {
  const proError = requirePro(user, 'size recommendation')
  if (proError) return proError

  let body: z.infer<typeof requestSchema>
  try {
    const raw = await req.json()
    body = requestSchema.parse(raw)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: err.errors },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  // ─── 1. Fetch pattern + sizes ──────────────────────────────────────────

  const pattern = await prisma.patterns.findFirst({
    where: { id: body.pattern_id, user_id: user.id, deleted_at: null },
    include: {
      sizes: { orderBy: { sort_order: 'asc' } },
    },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (pattern.sizes.length === 0) {
    return NextResponse.json(
      { error: 'Pattern has no size data — parse the pattern first', code: 'MISSING_SIZE_DATA' },
      { status: 422 },
    )
  }

  // ─── 2. Resolve body measurements ──────────────────────────────────────

  const savedMeasurements = await prisma.user_measurements.findUnique({
    where: { user_id: user.id },
  })

  // Merge: request overrides take priority over saved measurements
  const measurements: BodyMeasurements = {
    bust_cm: body.measurements?.bust_cm ?? savedMeasurements?.bust_cm ?? null,
    waist_cm: body.measurements?.waist_cm ?? savedMeasurements?.waist_cm ?? null,
    hip_cm: body.measurements?.hip_cm ?? savedMeasurements?.hip_cm ?? null,
    shoulder_width_cm: body.measurements?.shoulder_width_cm ?? savedMeasurements?.shoulder_width_cm ?? null,
    back_length_cm: body.measurements?.back_length_cm ?? savedMeasurements?.back_length_cm ?? null,
    arm_length_cm: body.measurements?.arm_length_cm ?? savedMeasurements?.arm_length_cm ?? null,
    upper_arm_cm: body.measurements?.upper_arm_cm ?? savedMeasurements?.upper_arm_cm ?? null,
    head_circumference_cm: body.measurements?.head_circumference_cm ?? savedMeasurements?.head_circumference_cm ?? null,
    foot_length_cm: body.measurements?.foot_length_cm ?? savedMeasurements?.foot_length_cm ?? null,
  }

  // ─── 3. Check measurement coverage ────────────────────────────────────

  const patternSizes: PatternSize[] = pattern.sizes.map((s) => ({
    name: s.name,
    finished_bust_cm: s.finished_bust_cm,
    finished_length_cm: s.finished_length_cm,
    hip_cm: s.hip_cm,
    shoulder_width_cm: s.shoulder_width_cm,
    arm_length_cm: s.arm_length_cm,
    upper_arm_cm: s.upper_arm_cm,
    back_length_cm: s.back_length_cm,
    head_circumference_cm: s.head_circumference_cm,
    foot_length_cm: s.foot_length_cm,
    yardage: s.yardage,
  }))

  const coverage = checkMeasurementCoverage(measurements, patternSizes)

  if (!coverage.sufficient) {
    return NextResponse.json(
      {
        error: 'No body measurements available to compare against this pattern',
        code: 'MISSING_MEASUREMENTS',
        missing: coverage.missing_but_helpful,
      },
      { status: 422 },
    )
  }

  // ─── 4. Score sizes (deterministic) ────────────────────────────────────

  const easePreference = body.ease_preference as EasePreference
  const rankedSizes = scoreSizes(measurements, patternSizes, pattern.garment_type, easePreference)

  const topSize = rankedSizes[0]
  const runnerUp = rankedSizes.length > 1 ? rankedSizes[1] : null
  const hasWarnings = rankedSizes.some((s) => s.warnings.length > 0)

  // ─── 5. AI fit advice ─────────────────────────────────────────────────

  const prompt = buildSizeRecPrompt({
    pattern_title: pattern.title,
    garment_type: pattern.garment_type,
    ease_preference: easePreference,
    ranked_sizes: rankedSizes,
    top_size: topSize,
    runner_up: runnerUp,
    has_warnings: hasWarnings,
  })

  let aiResult: SizeRecAIResponse
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })
    const content = completion.choices[0].message.content ?? '{}'
    aiResult = JSON.parse(content) as SizeRecAIResponse
  } catch {
    aiResult = {
      recommendation_summary: `Based on your measurements, ${topSize.size_name} is the best fit for ${easePreference} ease.`,
      fit_notes: [],
      between_sizes_advice: null,
      modification_suggestions: [],
    }
  }

  // ─── 6. Response ──────────────────────────────────────────────────────

  return NextResponse.json({
    success: true,
    data: {
      recommended_size: topSize.size_name,
      ease_preference: easePreference,
      ranked_sizes: rankedSizes,
      recommendation_summary: aiResult.recommendation_summary,
      fit_notes: aiResult.fit_notes,
      between_sizes_advice: aiResult.between_sizes_advice,
      modification_suggestions: aiResult.modification_suggestions,
      measurement_coverage: coverage,
    },
  })
})
