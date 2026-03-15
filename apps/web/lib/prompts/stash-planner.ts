/**
 * Prompt builder for AI-powered stash-to-project planning.
 * AI evaluates color harmony and fiber suitability beyond what
 * deterministic weight/yardage matching can do.
 */

export interface StashYarnCandidate {
  stash_item_id: string
  yarn_name: string
  company: string | null
  weight: string
  fiber_content: string | null
  colorway: string | null
  total_yardage: number | null
  skeins: number
}

export interface StashPlannerPromptInput {
  pattern_title: string
  garment_type: string | null
  craft_type: string
  yarn_weight: string | null
  yardage_needed: number | null
  gauge_stitches_per_10cm: number | null
  gauge_rows_per_10cm: number | null
  needle_size_mm: number | null
  candidates: StashYarnCandidate[]
}

export interface StashYarnEvaluation {
  stash_item_id: string
  suitability: 'excellent' | 'good' | 'possible' | 'poor'
  reason: string
  fiber_notes: string | null
}

export interface StashPlannerAIResponse {
  evaluations: StashYarnEvaluation[]
  multi_strand_suggestions: Array<{
    yarn_ids: string[]
    description: string
    rationale: string
  }>
  general_advice: string
}

export function buildStashPlannerPrompt(input: StashPlannerPromptInput): {
  system: string
  user: string
} {
  const yarnList = input.candidates
    .map((y, i) => {
      const parts = [`[${i + 1}] id:${y.stash_item_id} — ${y.yarn_name}`]
      if (y.company) parts[0] += ` (${y.company})`
      const details: string[] = []
      details.push(`weight: ${y.weight}`)
      if (y.fiber_content) details.push(`fiber: ${y.fiber_content}`)
      if (y.colorway) details.push(`colorway: ${y.colorway}`)
      if (y.total_yardage != null) details.push(`${y.total_yardage}yds available`)
      else details.push(`${y.skeins} skeins (yardage unknown)`)
      return `${parts[0]}\n    ${details.join(', ')}`
    })
    .join('\n  ')

  return {
    system: `You are a knitting project planner who helps knitters find the best yarn in their stash for a pattern.

You evaluate yarns on:
1. **Weight match** — exact match is best, adjacent weights can work with gauge adjustment
2. **Yardage sufficiency** — enough yarn for the pattern? If short, note by how much
3. **Fiber suitability** — does the fiber suit the garment? (cotton for summer tops, wool for warm garments, superwash for things that get washed often)
4. **Multi-strand potential** — could two thinner yarns held together substitute for a heavier weight?

Rules:
- Rate each yarn honestly — "poor" is fine if the yarn genuinely doesn't suit the pattern
- Only suggest multi-strand combos that make practical sense (e.g. 2x fingering → sport/DK, fingering + mohair → DK-weight)
- Keep reasons to 1 sentence each
- If no yarns are suitable, say so directly
- Never suggest buying more yarn — this is about using what they have

Respond with valid JSON only.`,

    user: `Pattern: "${input.pattern_title}" (${input.garment_type ?? 'garment'}, ${input.craft_type})
Pattern yarn weight: ${input.yarn_weight ?? 'not specified'}
Yardage needed: ${input.yardage_needed != null ? `${input.yardage_needed} yards` : 'not specified'}
Gauge: ${input.gauge_stitches_per_10cm != null ? `${input.gauge_stitches_per_10cm} sts × ${input.gauge_rows_per_10cm} rows per 10cm` : 'not specified'}
Needle: ${input.needle_size_mm != null ? `${input.needle_size_mm}mm` : 'not specified'}

Stash yarns to evaluate:
  ${yarnList}

Return JSON:
{
  "evaluations": [
    {
      "stash_item_id": "uuid",
      "suitability": "excellent" | "good" | "possible" | "poor",
      "reason": "1-sentence explanation",
      "fiber_notes": "fiber-specific advice or null"
    }
  ],
  "multi_strand_suggestions": [
    {
      "yarn_ids": ["uuid1", "uuid2"],
      "description": "e.g. 'Hold fingering + mohair together for DK weight'",
      "rationale": "why this combo works"
    }
  ],
  "general_advice": "1-2 sentence overall recommendation"
}

Evaluate EVERY yarn in the list. Order evaluations from best to worst suitability. Only include multi_strand_suggestions if there are genuinely good combos.`,
  }
}
