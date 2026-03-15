import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { getOpenAI } from '@/lib/openai'
import { compareGauges } from '@/lib/gauge'
import { convertPatternGauge } from '@/lib/agent'
import {
  isValidYarnWeight,
  estimateEffectiveWeight,
  recommendNeedleRange,
  estimateGaugeRange,
  recalculateYardage,
  calculateYardagePerYarn,
  findMatchingNeedles,
  isMohairYarn,
  type YarnWeight,
  type YarnStrand,
  type YarnInCombo,
  type UserNeedle,
} from '@/lib/yarn-math'
import { buildYarnSubPrompt, type YarnSubAIResponse } from '@/lib/prompts/yarn-sub'

export const maxDuration = 120

// ─── Input validation ────────────────────────────────────────────────────────

const yarnWeights = [
  'lace', 'fingering', 'sport', 'dk', 'worsted', 'aran', 'bulky', 'super_bulky',
] as const

const stashYarnSchema = z.object({
  source: z.literal('stash'),
  stash_item_id: z.string().uuid(),
  strands: z.number().int().min(1).max(4),
})

const catalogYarnSchema = z.object({
  source: z.literal('catalog'),
  yarn_id: z.string().uuid(),
  strands: z.number().int().min(1).max(4),
})

const manualYarnSchema = z.object({
  source: z.literal('manual'),
  weight: z.enum(yarnWeights),
  fiber_content: z.string().optional(),
  name: z.string().optional(),
  yardage_per_skein: z.number().positive().optional(),
  strands: z.number().int().min(1).max(4),
})

const yarnEntrySchema = z.discriminatedUnion('source', [
  stashYarnSchema,
  catalogYarnSchema,
  manualYarnSchema,
])

const requestSchema = z.object({
  pattern_id: z.string().uuid(),
  yarn_combo: z.array(yarnEntrySchema).min(1).max(6),
  needle_size_mm: z.number().positive().optional(),
  user_gauge: z
    .object({
      stitches_per_10cm: z.number().positive(),
      rows_per_10cm: z.number().positive(),
    })
    .optional(),
  convert_instructions: z.boolean().default(false),
})

// ─── Resolved yarn type ──────────────────────────────────────────────────────

interface ResolvedYarn {
  name: string
  weight: YarnWeight
  fiber_content: string | null
  strands: number
  yardage_per_skein: number | null
  skeins_available: number | null
}

// ─── Route handler ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/yarn-sub
 * Yarn substitution tool — recommends needles, estimates gauge, adjusts
 * stitch/row counts, and recalculates yardage for a substitute yarn or
 * multi-strand combo.
 */
export async function POST(req: NextRequest) {
  // Auth
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const user = await getDbUser(clerkId)
  const proError = requirePro(user, 'yarn substitution')
  if (proError) return proError

  // Parse + validate body
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

  // ─── 1. Fetch pattern ────────────────────────────────────────────────────

  const pattern = await prisma.patterns.findFirst({
    where: { id: body.pattern_id, user_id: user.id, deleted_at: null },
    include: {
      sections: {
        include: { rows: { orderBy: { row_number: 'asc' } } },
        orderBy: { sort_order: 'asc' },
      },
    },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (!pattern.gauge_stitches_per_10cm || !pattern.gauge_rows_per_10cm) {
    return NextResponse.json(
      { error: 'Pattern has no gauge data — parse the pattern first', code: 'MISSING_PATTERN_GAUGE' },
      { status: 422 },
    )
  }

  // ─── 2. Resolve yarn data ────────────────────────────────────────────────

  const resolvedYarns: ResolvedYarn[] = []

  for (const entry of body.yarn_combo) {
    if (entry.source === 'stash') {
      const stashItem = await prisma.user_stash.findFirst({
        where: { id: entry.stash_item_id, user_id: user.id },
        include: { yarn: true },
      })
      if (!stashItem) {
        return NextResponse.json(
          { error: `Stash item ${entry.stash_item_id} not found`, code: 'NOT_FOUND' },
          { status: 404 },
        )
      }
      const weight = stashItem.yarn.weight
      if (!weight || !isValidYarnWeight(weight)) {
        return NextResponse.json(
          { error: `Stash yarn "${stashItem.yarn.name}" has no valid weight`, code: 'VALIDATION_ERROR' },
          { status: 422 },
        )
      }
      resolvedYarns.push({
        name: stashItem.yarn.name,
        weight,
        fiber_content: stashItem.yarn.fiber_content,
        strands: entry.strands,
        yardage_per_skein: stashItem.yarn.yardage_per_skein,
        skeins_available: stashItem.skeins,
      })
    } else if (entry.source === 'catalog') {
      const yarn = await prisma.yarns.findUnique({ where: { id: entry.yarn_id } })
      if (!yarn) {
        return NextResponse.json(
          { error: `Yarn ${entry.yarn_id} not found`, code: 'NOT_FOUND' },
          { status: 404 },
        )
      }
      const weight = yarn.weight
      if (!weight || !isValidYarnWeight(weight)) {
        return NextResponse.json(
          { error: `Yarn "${yarn.name}" has no valid weight`, code: 'VALIDATION_ERROR' },
          { status: 422 },
        )
      }
      resolvedYarns.push({
        name: yarn.name,
        weight,
        fiber_content: yarn.fiber_content,
        strands: entry.strands,
        yardage_per_skein: yarn.yardage_per_skein,
        skeins_available: null,
      })
    } else {
      // manual
      resolvedYarns.push({
        name: entry.name ?? `${entry.weight} yarn`,
        weight: entry.weight,
        fiber_content: entry.fiber_content ?? null,
        strands: entry.strands,
        yardage_per_skein: entry.yardage_per_skein ?? null,
        skeins_available: null,
      })
    }
  }

  // ─── 3. Deterministic math ───────────────────────────────────────────────

  const strandData: YarnStrand[] = resolvedYarns.map((y) => ({
    weight: y.weight,
    fiber_content: y.fiber_content,
    strands: y.strands,
  }))

  const effectiveWeight = estimateEffectiveWeight(strandData)
  const isMultiStrand = resolvedYarns.length > 1 || resolvedYarns.some((y) => y.strands > 1)

  // Needle recommendation
  const needleRec = recommendNeedleRange(effectiveWeight)
  const needleMm = body.needle_size_mm ?? needleRec.suggested_mm

  // Gauge estimation (deterministic baseline)
  const estimatedGauge = estimateGaugeRange(effectiveWeight, needleMm)

  // ─── 4. AI enrichment ────────────────────────────────────────────────────

  const promptInput = {
    yarns: resolvedYarns.map((y) => ({
      name: y.name,
      weight: y.weight,
      fiber_content: y.fiber_content,
      strands: y.strands,
    })),
    effective_weight: effectiveWeight,
    estimated_gauge: estimatedGauge,
    needle_mm: needleMm,
    pattern: {
      title: pattern.title,
      craft_type: pattern.craft_type,
      gauge_stitches_per_10cm: pattern.gauge_stitches_per_10cm,
      gauge_rows_per_10cm: pattern.gauge_rows_per_10cm,
      needle_size_mm: pattern.needle_size_mm,
      yarn_weight: pattern.yarn_weight,
    },
    user_gauge: body.user_gauge ?? null,
  }

  const prompt = buildYarnSubPrompt(promptInput)

  let aiResult: YarnSubAIResponse
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
    aiResult = JSON.parse(content) as YarnSubAIResponse
  } catch {
    // Fall back to deterministic gauge if AI fails
    aiResult = {
      refined_gauge: body.user_gauge ?? estimatedGauge,
      gauge_confidence: body.user_gauge ? 'high' : 'low',
      notes: ['AI enrichment unavailable — using mathematical estimate'],
      swatch_recommendation: 'Swatch in stockinette on the suggested needle size, wash and block before measuring.',
    }
  }

  // Use refined gauge (or user's swatch gauge) for all downstream calculations
  const finalGauge = body.user_gauge ?? aiResult.refined_gauge
  const gaugeSource = body.user_gauge ? 'user_swatch' : 'ai_refined'

  // ─── 5. Gauge comparison ─────────────────────────────────────────────────

  const gaugeComparison = compareGauges(
    pattern.gauge_stitches_per_10cm,
    pattern.gauge_rows_per_10cm,
    finalGauge.stitches_per_10cm,
    finalGauge.rows_per_10cm,
  )

  // ─── 6. Yardage calculation ──────────────────────────────────────────────

  const patternYardage = pattern.yardage_max ?? pattern.yardage_min
  let yardageResult = null

  if (patternYardage) {
    const totalYardsNeeded = recalculateYardage(
      patternYardage,
      gaugeComparison.stitch_ratio,
      gaugeComparison.row_ratio,
    )

    const comboForYardage: YarnInCombo[] = resolvedYarns.map((y) => ({
      name: y.name,
      strands: y.strands,
      yardage_per_skein: y.yardage_per_skein,
      skeins_available: y.skeins_available,
    }))

    yardageResult = {
      original_yards: patternYardage,
      total_yards_needed: totalYardsNeeded,
      per_yarn: calculateYardagePerYarn(totalYardsNeeded, comboForYardage),
    }
  }

  // ─── 7. Needle inventory check ───────────────────────────────────────────

  const userNeedles = await prisma.user_needles.findMany({
    where: { user_id: user.id },
    select: { id: true, type: true, size_mm: true, size_label: true, material: true },
  })

  const matchingNeedles = findMatchingNeedles(
    userNeedles as UserNeedle[],
    needleRec,
  )

  // ─── 8. Optional instruction conversion ──────────────────────────────────

  let adjustments = null

  if (body.convert_instructions && !gaugeComparison.matches) {
    try {
      const conversion = await convertPatternGauge(
        user.id,
        pattern.id,
        finalGauge.stitches_per_10cm,
        finalGauge.rows_per_10cm,
        pattern.gauge_stitches_per_10cm,
        pattern.gauge_rows_per_10cm,
      )
      adjustments = conversion.sections
    } catch {
      // Instruction conversion failed — return results without it
      adjustments = null
    }
  }

  // ─── 9. Build response ───────────────────────────────────────────────────

  return NextResponse.json({
    success: true,
    data: {
      yarn_summary: {
        yarns: resolvedYarns.map((y) => ({
          name: y.name,
          weight: y.weight,
          fiber_content: y.fiber_content,
          strands: y.strands,
          is_mohair: isMohairYarn(y.fiber_content),
        })),
        effective_weight: effectiveWeight,
        is_multi_strand: isMultiStrand,
      },
      needle_recommendation: {
        suggested_mm: needleMm,
        range_min_mm: needleRec.range_min_mm,
        range_max_mm: needleRec.range_max_mm,
        user_owns: matchingNeedles.length > 0,
        matching_needles: matchingNeedles,
      },
      estimated_gauge: {
        stitches_per_10cm: finalGauge.stitches_per_10cm,
        rows_per_10cm: finalGauge.rows_per_10cm,
        confidence: aiResult.gauge_confidence,
        source: gaugeSource,
      },
      gauge_comparison: gaugeComparison,
      yardage: yardageResult,
      notes: aiResult.notes,
      swatch_recommendation: aiResult.swatch_recommendation,
      adjustments,
    },
  })
}
