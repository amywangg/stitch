import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { getOpenAI } from '@/lib/openai'
import { isValidYarnWeight, YARN_WEIGHT_ORDER, type YarnWeight } from '@/lib/yarn-math'
import { rankEquivalents, type YarnProfile } from '@/lib/yarn-equiv'
import { buildYarnEquivPrompt, type YarnEquivAIResponse } from '@/lib/prompts/yarn-equiv'

export const maxDuration = 30

// ─── Input validation ────────────────────────────────────────────────────────

const yarnWeights = [
  'lace', 'fingering', 'sport', 'dk', 'worsted', 'aran', 'bulky', 'super_bulky',
] as const

const requestSchema = z.object({
  // Source yarn — what they're trying to replace
  source: z.discriminatedUnion('from', [
    z.object({
      from: z.literal('stash'),
      stash_item_id: z.string().uuid(),
    }),
    z.object({
      from: z.literal('catalog'),
      yarn_id: z.string().uuid(),
    }),
    z.object({
      from: z.literal('manual'),
      name: z.string().min(1),
      weight: z.enum(yarnWeights),
      fiber_content: z.string().optional(),
      yardage_per_skein: z.number().positive().optional(),
      grams_per_skein: z.number().positive().optional(),
    }),
  ]),
  // Where to search for equivalents
  search_in: z.enum(['stash', 'catalog', 'both']).default('both'),
  // Optional context for AI evaluation
  context: z.string().max(200).optional(),
  // Max results to return
  limit: z.number().int().min(1).max(30).default(15),
})

// ─── Route handler ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/yarn-equiv
 * Yarn equivalence finder — "What yarn is similar to X?"
 *
 * Deterministic scoring (weight, fiber, yardage, grams) narrows candidates,
 * then AI evaluates how each will actually knit up compared to the source.
 *
 * Searches user's stash, the yarn catalog, or both.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const user = await getDbUser(clerkId)
  const proError = requirePro(user, 'yarn equivalence')
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

  // ─── 1. Resolve source yarn ───────────────────────────────────────────

  let source: YarnProfile

  if (body.source.from === 'stash') {
    const stashItem = await prisma.user_stash.findFirst({
      where: { id: body.source.stash_item_id, user_id: user.id },
      include: { yarn: { include: { company: true } } },
    })
    if (!stashItem) {
      return NextResponse.json(
        { error: 'Stash item not found', code: 'NOT_FOUND' },
        { status: 404 },
      )
    }
    source = {
      id: stashItem.yarn.id,
      name: stashItem.yarn.name,
      company: stashItem.yarn.company?.name ?? null,
      weight: stashItem.yarn.weight,
      fiber_content: stashItem.yarn.fiber_content,
      yardage_per_skein: stashItem.yarn.yardage_per_skein,
      grams_per_skein: stashItem.yarn.grams_per_skein,
      image_url: stashItem.yarn.image_url,
    }
  } else if (body.source.from === 'catalog') {
    const yarn = await prisma.yarns.findUnique({
      where: { id: body.source.yarn_id },
      include: { company: true },
    })
    if (!yarn) {
      return NextResponse.json(
        { error: 'Yarn not found', code: 'NOT_FOUND' },
        { status: 404 },
      )
    }
    source = {
      id: yarn.id,
      name: yarn.name,
      company: yarn.company?.name ?? null,
      weight: yarn.weight,
      fiber_content: yarn.fiber_content,
      yardage_per_skein: yarn.yardage_per_skein,
      grams_per_skein: yarn.grams_per_skein,
      image_url: yarn.image_url,
    }
  } else {
    // Manual entry
    source = {
      id: 'manual',
      name: body.source.name,
      company: null,
      weight: body.source.weight,
      fiber_content: body.source.fiber_content ?? null,
      yardage_per_skein: body.source.yardage_per_skein ?? null,
      grams_per_skein: body.source.grams_per_skein ?? null,
    }
  }

  // ─── 2. Gather candidates ────────────────────────────────────────────

  const candidates: YarnProfile[] = []

  // Build weight filter: same weight + adjacent weights
  const weightFilter: string[] = []
  if (source.weight && isValidYarnWeight(source.weight)) {
    const level = YARN_WEIGHT_ORDER[source.weight as YarnWeight]
    for (const [name, order] of Object.entries(YARN_WEIGHT_ORDER)) {
      if (Math.abs(order - level) <= 1) weightFilter.push(name)
    }
  }

  const weightWhere = weightFilter.length > 0 ? { in: weightFilter } : undefined

  // Search stash
  if (body.search_in === 'stash' || body.search_in === 'both') {
    const stashItems = await prisma.user_stash.findMany({
      where: {
        user_id: user.id,
        status: 'in_stash',
        yarn: { weight: weightWhere },
      },
      include: { yarn: { include: { company: true } } },
      take: 50,
    })

    for (const item of stashItems) {
      candidates.push({
        id: item.yarn.id,
        name: item.yarn.name,
        company: item.yarn.company?.name ?? null,
        weight: item.yarn.weight,
        fiber_content: item.yarn.fiber_content,
        yardage_per_skein: item.yarn.yardage_per_skein,
        grams_per_skein: item.yarn.grams_per_skein,
        image_url: item.yarn.image_url,
      })
    }
  }

  // Search catalog
  if (body.search_in === 'catalog' || body.search_in === 'both') {
    const catalogYarns = await prisma.yarns.findMany({
      where: { weight: weightWhere },
      include: { company: true },
      take: 100,
    })

    // Deduplicate against stash results
    const existingIds = new Set(candidates.map((c) => c.id))
    for (const yarn of catalogYarns) {
      if (!existingIds.has(yarn.id)) {
        candidates.push({
          id: yarn.id,
          name: yarn.name,
          company: yarn.company?.name ?? null,
          weight: yarn.weight,
          fiber_content: yarn.fiber_content,
          yardage_per_skein: yarn.yardage_per_skein,
          grams_per_skein: yarn.grams_per_skein,
          image_url: yarn.image_url,
        })
      }
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        source,
        equivalents: [],
        top_pick: null,
        general_notes: 'No candidate yarns found — try adding yarn to your stash or broadening the search.',
        candidates_evaluated: 0,
      },
    })
  }

  // ─── 3. Deterministic scoring + ranking ───────────────────────────────

  const ranked = rankEquivalents(source, candidates, body.limit)

  if (ranked.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        source,
        equivalents: [],
        top_pick: null,
        general_notes: 'No similar yarns found in the search results.',
        candidates_evaluated: candidates.length,
      },
    })
  }

  // ─── 4. AI evaluation ─────────────────────────────────────────────────

  const prompt = buildYarnEquivPrompt({
    source,
    candidates: ranked,
    context: body.context ?? null,
  })

  let aiResult: YarnEquivAIResponse
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
    aiResult = JSON.parse(content) as YarnEquivAIResponse
  } catch {
    // Fall back to deterministic results only
    aiResult = {
      evaluations: ranked.map((r) => ({
        yarn_id: r.yarn.id,
        verdict: r.weight_match === 'exact' && r.fiber_overlap >= 0.7
          ? 'close' as const
          : 'workable' as const,
        reason: `${Math.round(r.score * 100)}% match — ${r.weight_match} weight, ${Math.round(r.fiber_overlap * 100)}% fiber overlap`,
        knitting_difference: null,
        gauge_notes: r.weight_match !== 'exact' ? 'Different weight — swatch to check gauge' : null,
      })),
      top_pick: ranked[0]?.yarn.id ?? null,
      general_notes: 'AI evaluation unavailable — results based on weight and fiber matching only.',
    }
  }

  // ─── 5. Merge results ─────────────────────────────────────────────────

  const aiEvalMap = new Map(aiResult.evaluations.map((e) => [e.yarn_id, e]))

  const equivalents = ranked.map((r) => {
    const ai = aiEvalMap.get(r.yarn.id)
    return {
      yarn_id: r.yarn.id,
      name: r.yarn.name,
      company: r.yarn.company,
      weight: r.yarn.weight,
      fiber_content: r.yarn.fiber_content,
      yardage_per_skein: r.yarn.yardage_per_skein,
      grams_per_skein: r.yarn.grams_per_skein,
      image_url: r.yarn.image_url ?? null,
      // Deterministic scores
      match_score: r.score,
      weight_match: r.weight_match,
      fiber_overlap: r.fiber_overlap,
      yardage_similarity: r.yardage_similarity,
      // AI evaluation
      verdict: ai?.verdict ?? 'workable',
      reason: ai?.reason ?? 'Not evaluated',
      knitting_difference: ai?.knitting_difference ?? null,
      gauge_notes: ai?.gauge_notes ?? null,
    }
  })

  // Re-sort by AI verdict quality
  const verdictOrder = { 'drop-in': 0, close: 1, workable: 2, 'not recommended': 3 }
  equivalents.sort(
    (a, b) =>
      verdictOrder[a.verdict as keyof typeof verdictOrder] -
      verdictOrder[b.verdict as keyof typeof verdictOrder],
  )

  // ─── 6. Response ──────────────────────────────────────────────────────

  return NextResponse.json({
    success: true,
    data: {
      source: {
        name: source.name,
        company: source.company,
        weight: source.weight,
        fiber_content: source.fiber_content,
        yardage_per_skein: source.yardage_per_skein,
        grams_per_skein: source.grams_per_skein,
      },
      equivalents,
      top_pick: aiResult.top_pick,
      general_notes: aiResult.general_notes,
      candidates_evaluated: candidates.length,
    },
  })
}
