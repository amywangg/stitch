/**
 * AI-powered features — no chat interface.
 * Each function is a discrete action called by a specific API route.
 * GPT-4o is the engine, buttons are the interface.
 */

import { openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { searchRavelryPatterns } from '@/lib/ravelry-search'
import { compareGauges } from '@/lib/gauge'

// ─── Stash matching: "What can I make with this yarn?" ──────────────────────

export interface StashMatchResult {
  stash_item: {
    yarn_name: string
    company: string | null
    weight: string | null
    total_yardage: number | null
    skeins: number
  }
  ravelry_results: Array<{
    ravelry_id: number
    name: string
    permalink: string
    designer: string | null
    weight: string | null
    yardage_max: number | null
    difficulty: number | null
    photo_url: string | null
    free: boolean
  }>
  total_found: number
}

export async function matchStashToPatterns(
  userId: string,
  stashItemId: string,
  opts?: { craft?: 'knitting' | 'crochet'; category?: string; page?: number },
): Promise<StashMatchResult> {
  const stashItem = await prisma.user_stash.findFirst({
    where: { id: stashItemId, user_id: userId },
    include: { yarn: { include: { company: true } } },
  })

  if (!stashItem) throw new Error('Stash item not found')

  const totalYardage = stashItem.yarn.yardage_per_skein
    ? Math.round(stashItem.skeins * stashItem.yarn.yardage_per_skein)
    : undefined

  const results = await searchRavelryPatterns({
    craft: opts?.craft ?? undefined,
    weight: stashItem.yarn.weight ?? undefined,
    yardage_max: totalYardage,
    pc: opts?.category ?? undefined,
    page: opts?.page ?? 1,
    page_size: 20,
  }, userId)

  return {
    stash_item: {
      yarn_name: stashItem.yarn.name,
      company: stashItem.yarn.company?.name ?? null,
      weight: stashItem.yarn.weight,
      total_yardage: totalYardage ?? null,
      skeins: stashItem.skeins,
    },
    ravelry_results: results.patterns,
    total_found: results.paginator.results,
  }
}

// ─── Saved pattern matching: "Which saved pattern fits my stash?" ───────────

export interface SavedPatternMatch {
  pattern: {
    id: string
    ravelry_id: number
    name: string
    permalink: string
    designer: string | null
    weight: string | null
    yardage_min: number | null
    yardage_max: number | null
    difficulty: number | null
    photo_url: string | null
    free: boolean
  }
  matching_yarn: {
    id: string
    yarn_name: string
    weight: string | null
    total_yardage: number | null
    colorway: string | null
  } | null
  match_quality: 'perfect' | 'good' | 'possible'
  reason: string
}

export async function matchSavedPatternsToStash(userId: string): Promise<SavedPatternMatch[]> {
  const [savedPatterns, stashItems] = await Promise.all([
    prisma.saved_patterns.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    }),
    prisma.user_stash.findMany({
      where: { user_id: userId },
      include: { yarn: true },
      take: 50,
    }),
  ])

  if (savedPatterns.length === 0 || stashItems.length === 0) return []

  const stashByWeight = new Map<string, typeof stashItems>()
  for (const item of stashItems) {
    const w = item.yarn.weight ?? 'unknown'
    if (!stashByWeight.has(w)) stashByWeight.set(w, [])
    stashByWeight.get(w)!.push(item)
  }

  const matches: SavedPatternMatch[] = []

  for (const pattern of savedPatterns) {
    const candidates = pattern.weight ? stashByWeight.get(pattern.weight) ?? [] : []
    let bestYarn: (typeof stashItems)[number] | null = null
    let quality: 'perfect' | 'good' | 'possible' = 'possible'
    let reason = ''

    for (const item of candidates) {
      const totalYardage = item.yarn.yardage_per_skein
        ? Math.round(item.skeins * item.yarn.yardage_per_skein)
        : null

      if (pattern.yardage_max && totalYardage && totalYardage >= pattern.yardage_max) {
        bestYarn = item
        quality = 'perfect'
        reason = `Your ${item.yarn.name} (${totalYardage}yds) covers the ${pattern.yardage_max}yd requirement`
        break
      } else if (pattern.yardage_min && totalYardage && totalYardage >= pattern.yardage_min) {
        bestYarn = item
        quality = 'good'
        reason = `Your ${item.yarn.name} (${totalYardage}yds) meets the minimum ${pattern.yardage_min}yds`
      } else if (!bestYarn) {
        bestYarn = item
        quality = 'possible'
        reason = `Weight matches (${pattern.weight}) but check yardage`
      }
    }

    // Include patterns even without a stash match — just no yarn attached
    matches.push({
      pattern: {
        id: pattern.id,
        ravelry_id: pattern.ravelry_id,
        name: pattern.name,
        permalink: pattern.permalink,
        designer: pattern.designer,
        weight: pattern.weight,
        yardage_min: pattern.yardage_min,
        yardage_max: pattern.yardage_max,
        difficulty: pattern.difficulty,
        photo_url: pattern.photo_url,
        free: pattern.free,
      },
      matching_yarn: bestYarn ? {
        id: bestYarn.id,
        yarn_name: bestYarn.yarn.name,
        weight: bestYarn.yarn.weight,
        total_yardage: bestYarn.yarn.yardage_per_skein
          ? Math.round(bestYarn.skeins * bestYarn.yarn.yardage_per_skein)
          : null,
        colorway: bestYarn.colorway,
      } : null,
      match_quality: bestYarn ? quality : 'possible',
      reason: bestYarn ? reason : 'No matching yarn in stash',
    })
  }

  // Sort: perfect first, then good, then possible
  const order = { perfect: 0, good: 1, possible: 2 }
  matches.sort((a, b) => order[a.match_quality] - order[b.match_quality])

  return matches
}

// ─── Pattern gauge conversion ───────────────────────────────────────────────

export interface ConvertedSection {
  name: string
  rows: Array<{
    row_number: number
    original_instruction: string
    converted_instruction: string
  }>
}

export interface GaugeConversionResult {
  pattern_title: string
  original_gauge: { stitches_per_10cm: number; rows_per_10cm: number }
  new_gauge: { stitches_per_10cm: number; rows_per_10cm: number }
  stitch_ratio: number
  row_ratio: number
  sections: ConvertedSection[]
}

export async function convertPatternGauge(
  userId: string,
  patternId: string,
  newStitchesPer10cm: number,
  newRowsPer10cm: number,
  originalStitchesPer10cm: number,
  originalRowsPer10cm: number,
): Promise<GaugeConversionResult> {
  const pattern = await prisma.patterns.findFirst({
    where: { id: patternId, user_id: userId, deleted_at: null },
    include: {
      sections: {
        include: { rows: { orderBy: { row_number: 'asc' } } },
        orderBy: { sort_order: 'asc' },
      },
    },
  })

  if (!pattern) throw new Error('Pattern not found')

  const stitchRatio = newStitchesPer10cm / originalStitchesPer10cm
  const rowRatio = newRowsPer10cm / originalRowsPer10cm

  // Use GPT-4o to intelligently convert the instructions
  const sectionsForAI = pattern.sections.map(s => ({
    name: s.name,
    rows: s.rows.map(r => ({ row_number: r.row_number, instruction: r.instruction })),
  }))

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a knitting pattern converter. Given a stitch ratio and row ratio, adjust all stitch counts and row counts in the pattern instructions.
Rules:
- Multiply any explicit stitch count by the stitch_ratio (${stitchRatio.toFixed(3)}) and round to nearest whole number
- Multiply any row count or repeat count by the row_ratio (${rowRatio.toFixed(3)}) and round to nearest whole number
- Keep abbreviations and structure identical — only change numbers
- If a number is clearly not a stitch/row count (like "US 7" needle size), leave it unchanged
- Return valid JSON only`,
      },
      {
        role: 'user',
        content: `Convert these pattern sections. Stitch ratio: ${stitchRatio.toFixed(3)}, Row ratio: ${rowRatio.toFixed(3)}.

${JSON.stringify(sectionsForAI)}

Return JSON array: [{ "name": "...", "rows": [{ "row_number": 1, "original_instruction": "...", "converted_instruction": "..." }] }]`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = completion.choices[0].message.content ?? '{"sections":[]}'
  const parsed = JSON.parse(content) as { sections: ConvertedSection[] }

  return {
    pattern_title: pattern.title,
    original_gauge: { stitches_per_10cm: originalStitchesPer10cm, rows_per_10cm: originalRowsPer10cm },
    new_gauge: { stitches_per_10cm: newStitchesPer10cm, rows_per_10cm: newRowsPer10cm },
    stitch_ratio: Math.round(stitchRatio * 1000) / 1000,
    row_ratio: Math.round(rowRatio * 1000) / 1000,
    sections: parsed.sections ?? [],
  }
}

// ─── Explain a pattern row ──────────────────────────────────────────────────

export interface RowExplanation {
  row_number: number
  instruction: string
  explanation: string
  stitch_count_after: number | null
}

export async function explainPatternRow(
  instruction: string,
  context?: { craft_type?: string; experience_level?: string; previous_row?: string },
): Promise<RowExplanation> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a knitting/crochet instructor. Explain a single pattern row in plain, friendly language.
${context?.experience_level === 'beginner' ? 'The user is a beginner — spell out every abbreviation and describe the motion.' : 'Be concise but clear.'}
Return JSON: { "explanation": "...", "stitch_count_after": number | null }`,
      },
      {
        role: 'user',
        content: `Explain this ${context?.craft_type ?? 'knitting'} instruction: "${instruction}"${context?.previous_row ? `\nPrevious row was: "${context.previous_row}"` : ''}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })

  const content = completion.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(content) as { explanation: string; stitch_count_after: number | null }

  return {
    row_number: 0,
    instruction,
    explanation: parsed.explanation ?? 'Could not explain this instruction.',
    stitch_count_after: parsed.stitch_count_after ?? null,
  }
}
