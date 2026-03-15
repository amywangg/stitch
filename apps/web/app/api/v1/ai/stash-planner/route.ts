import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { getOpenAI } from '@/lib/openai'
import { isValidYarnWeight, YARN_WEIGHT_ORDER, type YarnWeight } from '@/lib/yarn-math'
import {
  buildStashPlannerPrompt,
  type StashYarnCandidate,
  type StashPlannerAIResponse,
} from '@/lib/prompts/stash-planner'

export const maxDuration = 30

// ─── Input validation ────────────────────────────────────────────────────────

const requestSchema = z.object({
  pattern_id: z.string().uuid(),
  // Optional: only consider stash items matching these filters
  weight_filter: z.enum([
    'lace', 'fingering', 'sport', 'dk', 'worsted', 'aran', 'bulky', 'super_bulky',
  ]).optional(),
  include_adjacent_weights: z.boolean().default(true),
})

// ─── Route handler ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/stash-planner
 * Stash-to-project planner — scans the user's stash and recommends which yarns
 * could work for a given pattern, considering weight, yardage, fiber, and color.
 *
 * Deterministic filtering (weight match, yardage) narrows candidates,
 * then AI evaluates fiber suitability and suggests multi-strand combos.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const user = await getDbUser(clerkId)
  const proError = requirePro(user, 'stash planning')
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

  // ─── 1. Fetch pattern ─────────────────────────────────────────────────

  const pattern = await prisma.patterns.findFirst({
    where: { id: body.pattern_id, user_id: user.id, deleted_at: null },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  // ─── 2. Fetch user's stash ────────────────────────────────────────────

  const stashItems = await prisma.user_stash.findMany({
    where: {
      user_id: user.id,
      status: 'in_stash', // Only available yarn
    },
    include: {
      yarn: { include: { company: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 100, // Cap to prevent excessive AI token usage
  })

  if (stashItems.length === 0) {
    return NextResponse.json(
      { error: 'Your stash is empty — add yarn to your stash first', code: 'EMPTY_STASH' },
      { status: 422 },
    )
  }

  // ─── 3. Deterministic filtering ───────────────────────────────────────

  const patternWeight = body.weight_filter ?? pattern.yarn_weight
  const patternYardage = pattern.yardage_max ?? pattern.yardage_min

  // Build list of acceptable weights
  const acceptableWeights = new Set<string>()
  if (patternWeight && isValidYarnWeight(patternWeight)) {
    acceptableWeights.add(patternWeight)
    if (body.include_adjacent_weights) {
      const level = YARN_WEIGHT_ORDER[patternWeight]
      // Add one weight above and below
      for (const [name, order] of Object.entries(YARN_WEIGHT_ORDER)) {
        if (Math.abs(order - level) <= 1) acceptableWeights.add(name)
      }
    }
  }

  // Filter and score candidates
  const candidates: (StashYarnCandidate & { _weight_match: 'exact' | 'adjacent' | 'any' })[] = []

  for (const item of stashItems) {
    const yarnWeight = item.yarn.weight
    let weightMatch: 'exact' | 'adjacent' | 'any' = 'any'

    if (acceptableWeights.size > 0 && yarnWeight) {
      if (yarnWeight === patternWeight) {
        weightMatch = 'exact'
      } else if (acceptableWeights.has(yarnWeight)) {
        weightMatch = 'adjacent'
      } else {
        // Include anyway but mark — AI will evaluate multi-strand potential
        weightMatch = 'any'
      }
    }

    const totalYardage = item.yarn.yardage_per_skein
      ? Math.round(item.skeins * item.yarn.yardage_per_skein)
      : null

    candidates.push({
      stash_item_id: item.id,
      yarn_name: item.yarn.name,
      company: item.yarn.company?.name ?? null,
      weight: yarnWeight ?? 'unknown',
      fiber_content: item.yarn.fiber_content,
      colorway: item.colorway ?? item.yarn.colorway ?? null,
      total_yardage: totalYardage,
      skeins: item.skeins,
      _weight_match: weightMatch,
    })
  }

  // Sort: exact weight matches first, then adjacent, then others
  const weightOrder = { exact: 0, adjacent: 1, any: 2 }
  candidates.sort((a, b) => weightOrder[a._weight_match] - weightOrder[b._weight_match])

  // Cap at 20 candidates for AI evaluation (prioritize weight matches)
  const topCandidates = candidates.slice(0, 20)

  // Deterministic yardage check
  const candidatesWithYardage = topCandidates.map((c) => {
    const { _weight_match, ...candidate } = c
    return {
      ...candidate,
      weight_match: _weight_match,
      yardage_sufficient:
        patternYardage != null && c.total_yardage != null
          ? c.total_yardage >= patternYardage
          : null,
      yardage_deficit:
        patternYardage != null && c.total_yardage != null
          ? Math.max(0, patternYardage - c.total_yardage)
          : null,
    }
  })

  // ─── 4. AI evaluation ─────────────────────────────────────────────────

  const promptCandidates: StashYarnCandidate[] = topCandidates.map(
    ({ _weight_match: _, ...c }) => c,
  )

  const prompt = buildStashPlannerPrompt({
    pattern_title: pattern.title,
    garment_type: pattern.garment_type,
    craft_type: pattern.craft_type,
    yarn_weight: patternWeight,
    yardage_needed: patternYardage,
    gauge_stitches_per_10cm: pattern.gauge_stitches_per_10cm,
    gauge_rows_per_10cm: pattern.gauge_rows_per_10cm,
    needle_size_mm: pattern.needle_size_mm,
    candidates: promptCandidates,
  })

  let aiResult: StashPlannerAIResponse
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
    aiResult = JSON.parse(content) as StashPlannerAIResponse
  } catch {
    // Fall back to deterministic-only results
    aiResult = {
      evaluations: promptCandidates.map((c) => ({
        stash_item_id: c.stash_item_id,
        suitability: c.weight === patternWeight ? 'good' : 'possible' as const,
        reason: c.weight === patternWeight ? 'Weight matches pattern' : 'Different weight — may need gauge adjustment',
        fiber_notes: null,
      })),
      multi_strand_suggestions: [],
      general_advice: 'AI evaluation unavailable — results based on weight matching only.',
    }
  }

  // ─── 5. Merge deterministic + AI results ──────────────────────────────

  // Build a map of AI evaluations by stash_item_id for fast lookup
  const aiEvalMap = new Map(aiResult.evaluations.map((e) => [e.stash_item_id, e]))

  const results = candidatesWithYardage.map((c) => {
    const aiEval = aiEvalMap.get(c.stash_item_id)
    return {
      stash_item_id: c.stash_item_id,
      yarn_name: c.yarn_name,
      company: c.company,
      weight: c.weight,
      weight_match: c.weight_match,
      fiber_content: c.fiber_content,
      colorway: c.colorway,
      total_yardage: c.total_yardage,
      skeins: c.skeins,
      yardage_sufficient: c.yardage_sufficient,
      yardage_deficit: c.yardage_deficit,
      suitability: aiEval?.suitability ?? 'possible',
      reason: aiEval?.reason ?? 'Not evaluated',
      fiber_notes: aiEval?.fiber_notes ?? null,
    }
  })

  // Sort by AI suitability
  const suitabilityOrder = { excellent: 0, good: 1, possible: 2, poor: 3 }
  results.sort(
    (a, b) =>
      suitabilityOrder[a.suitability as keyof typeof suitabilityOrder] -
      suitabilityOrder[b.suitability as keyof typeof suitabilityOrder],
  )

  // ─── 6. Response ──────────────────────────────────────────────────────

  return NextResponse.json({
    success: true,
    data: {
      pattern: {
        title: pattern.title,
        garment_type: pattern.garment_type,
        yarn_weight: patternWeight,
        yardage_needed: patternYardage,
      },
      candidates: results,
      multi_strand_suggestions: aiResult.multi_strand_suggestions,
      general_advice: aiResult.general_advice,
      stash_items_evaluated: results.length,
      stash_items_total: stashItems.length,
    },
  })
}
