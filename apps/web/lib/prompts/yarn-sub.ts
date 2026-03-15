/**
 * Prompt builder for AI-powered yarn substitution refinement.
 * Adds fiber-aware gauge adjustment and practical knitting advice
 * on top of the deterministic math from yarn-math.ts.
 */

export interface YarnSubPromptInput {
  yarns: Array<{
    name: string
    weight: string
    fiber_content: string | null
    strands: number
  }>
  effective_weight: string
  estimated_gauge: { stitches_per_10cm: number; rows_per_10cm: number }
  needle_mm: number
  pattern: {
    title: string
    craft_type: string
    gauge_stitches_per_10cm: number
    gauge_rows_per_10cm: number
    needle_size_mm: number | null
    yarn_weight: string | null
  }
  user_gauge?: { stitches_per_10cm: number; rows_per_10cm: number } | null
}

export interface YarnSubAIResponse {
  refined_gauge: { stitches_per_10cm: number; rows_per_10cm: number }
  gauge_confidence: 'high' | 'medium' | 'low'
  notes: string[]
  swatch_recommendation: string
}

export function buildYarnSubPrompt(input: YarnSubPromptInput): {
  system: string
  user: string
} {
  const yarnDescriptions = input.yarns
    .map((y) => {
      const parts = [`${y.name} (${y.weight})`]
      if (y.fiber_content) parts.push(`fiber: ${y.fiber_content}`)
      if (y.strands > 1) parts.push(`${y.strands} strands`)
      return parts.join(', ')
    })
    .join('\n  - ')

  const isMultiStrand = input.yarns.length > 1 || input.yarns.some((y) => y.strands > 1)
  const hasUserGauge = input.user_gauge != null

  return {
    system: `You are a knitting gauge and yarn substitution expert. You understand how fiber content, yarn structure, and needle size affect gauge.

Key principles:
- Superwash wool knits looser than non-superwash
- Cotton and linen have no elasticity — gauge tends to be tighter and fabric heavier
- Alpaca grows/droops over time — slightly tighter gauge compensates
- Mohair held with a base yarn adds halo but minimal stitch structure
- Silk adds drape and shine, slightly looser gauge than wool
- Acrylic behaves predictably but lacks memory — gauge tends to relax after washing
- Nylon/polyamide adds durability but doesn't affect gauge significantly
${isMultiStrand ? '- Multi-strand combos: the base yarn determines stitch definition, mohair/silk adds texture' : ''}

${hasUserGauge ? 'The user has already swatched. Do NOT change their gauge — focus only on practical advice.' : 'Refine the mathematical gauge estimate based on the specific fiber content and yarn structure.'}

Always respond with valid JSON matching the exact schema requested. Keep notes concise and actionable (2-5 bullet points). No disclaimers.`,

    user: `${hasUserGauge ? 'The user has swatched with this yarn combo. Their measured gauge is definitive — do not override it.' : 'Refine this gauge estimate based on the fiber content and yarn properties.'}

Pattern: "${input.pattern.title}" (${input.pattern.craft_type})
Pattern gauge: ${input.pattern.gauge_stitches_per_10cm} sts × ${input.pattern.gauge_rows_per_10cm} rows per 10cm
Pattern needle: ${input.pattern.needle_size_mm ? `${input.pattern.needle_size_mm}mm` : 'not specified'}
Pattern yarn weight: ${input.pattern.yarn_weight ?? 'not specified'}

Substitution yarn:
  - ${yarnDescriptions}
  Effective combined weight: ${input.effective_weight}
  Suggested needle: ${input.needle_mm}mm

${hasUserGauge
  ? `User's swatch gauge: ${input.user_gauge!.stitches_per_10cm} sts × ${input.user_gauge!.rows_per_10cm} rows per 10cm`
  : `Mathematical gauge estimate: ${input.estimated_gauge.stitches_per_10cm} sts × ${input.estimated_gauge.rows_per_10cm} rows per 10cm`
}

Return JSON:
{
  "refined_gauge": { "stitches_per_10cm": number, "rows_per_10cm": number },
  "gauge_confidence": "high" | "medium" | "low",
  "notes": ["practical tip 1", "practical tip 2", ...],
  "swatch_recommendation": "specific swatch instructions for this yarn combo"
}

${hasUserGauge ? 'For refined_gauge, return the user\'s swatch gauge exactly as given. Set confidence to "high".' : 'Adjust the mathematical estimate based on fiber behavior. Set confidence based on how predictable this yarn combo is.'}`,
  }
}
