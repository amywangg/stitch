/**
 * Prompt builder for AI-powered yarn equivalence evaluation.
 * AI refines deterministic scoring with knowledge of how yarns
 * actually knit up — stitch definition, drape, bloom, pilling, etc.
 */

import type { ScoredYarn, YarnProfile } from '@/lib/yarn-equiv'

export interface YarnEquivPromptInput {
  source: YarnProfile
  candidates: ScoredYarn[]
  context?: string | null // e.g. "for a lace shawl" or "for baby blanket"
}

export interface YarnEquivEvaluation {
  yarn_id: string
  verdict: 'drop-in' | 'close' | 'workable' | 'not recommended'
  reason: string
  knitting_difference: string | null
  gauge_notes: string | null
}

export interface YarnEquivAIResponse {
  evaluations: YarnEquivEvaluation[]
  top_pick: string | null // yarn_id of the best substitute
  general_notes: string
}

export function buildYarnEquivPrompt(input: YarnEquivPromptInput): {
  system: string
  user: string
} {
  const sourceDesc = [
    input.source.name,
    input.source.company ? `by ${input.source.company}` : null,
    input.source.weight ? `(${input.source.weight})` : null,
    input.source.fiber_content ? `— ${input.source.fiber_content}` : null,
    input.source.yardage_per_skein ? `${input.source.yardage_per_skein}yds/skein` : null,
    input.source.grams_per_skein ? `${input.source.grams_per_skein}g/skein` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const candidateList = input.candidates
    .map((c, i) => {
      const parts = [`[${i + 1}] id:${c.yarn.id} — ${c.yarn.name}`]
      if (c.yarn.company) parts[0] += ` (${c.yarn.company})`
      const details: string[] = []
      if (c.yarn.weight) details.push(`weight: ${c.yarn.weight}`)
      if (c.yarn.fiber_content) details.push(`fiber: ${c.yarn.fiber_content}`)
      if (c.yarn.yardage_per_skein) details.push(`${c.yarn.yardage_per_skein}yds/skein`)
      if (c.yarn.grams_per_skein) details.push(`${c.yarn.grams_per_skein}g`)
      details.push(`match score: ${Math.round(c.score * 100)}%`)
      return `${parts[0]}\n    ${details.join(', ')}`
    })
    .join('\n  ')

  return {
    system: `You are a yarn substitution expert. You know how different fibers and yarn constructions affect the knitting experience and finished fabric.

Key knowledge:
- **Stitch definition**: wool > cotton > silk > alpaca > mohair. Cables and texture need good stitch definition.
- **Drape**: silk > alpaca > bamboo > cotton > wool. Lace and garments that hang need drape.
- **Bloom/halo**: mohair > alpaca > wool. Affects visibility of stitch patterns.
- **Memory/elasticity**: wool > acrylic > cotton (none) > silk (none). Ribbing needs memory.
- **Warmth**: wool > alpaca > acrylic > cotton > linen. Matters for garment season.
- **Superwash vs non-superwash**: superwash is heavier, grows more, less bouncy. Not interchangeable for fitted garments.
- **Pilling**: soft merino > alpaca > silk blends. Single ply pills more than plied.
- **Gauge**: same weight category doesn't guarantee same gauge — fiber and construction matter.

Verdicts:
- "drop-in": will knit up virtually the same — same gauge, same fabric hand
- "close": very similar, may need minor needle adjustment, fabric will feel slightly different
- "workable": right weight but different character — swatch essential, expect different drape/texture
- "not recommended": wrong weight, wrong character, or will produce a fundamentally different fabric

Respond with valid JSON only. Be honest — "not recommended" is fine.`,

    user: `Source yarn: ${sourceDesc}
${input.context ? `Context: ${input.context}` : ''}

Evaluate these as substitutes:
  ${candidateList}

Return JSON:
{
  "evaluations": [
    {
      "yarn_id": "uuid",
      "verdict": "drop-in" | "close" | "workable" | "not recommended",
      "reason": "1-sentence why",
      "knitting_difference": "how it will knit differently, or null if drop-in",
      "gauge_notes": "gauge adjustment advice, or null if not needed"
    }
  ],
  "top_pick": "yarn_id of best substitute, or null if none are good",
  "general_notes": "1-2 sentence overall advice"
}

Evaluate every yarn. Order from best to worst substitute.`,
  }
}
