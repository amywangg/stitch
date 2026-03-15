/**
 * Prompt builder for AI-powered size recommendation.
 * AI adds contextual advice on top of the deterministic scoring
 * from size-math.ts — fit tips, between-sizes guidance, modification suggestions.
 */

import type { SizeScore, EasePreference } from '@/lib/size-math'

export interface SizeRecPromptInput {
  pattern_title: string
  garment_type: string | null
  ease_preference: EasePreference
  ranked_sizes: SizeScore[]
  top_size: SizeScore
  runner_up: SizeScore | null
  has_warnings: boolean
}

export interface SizeRecAIResponse {
  recommendation_summary: string
  fit_notes: string[]
  between_sizes_advice: string | null
  modification_suggestions: string[]
}

export function buildSizeRecPrompt(input: SizeRecPromptInput): {
  system: string
  user: string
} {
  const sizeDetails = input.ranked_sizes
    .slice(0, 4) // Only show top 4 to the AI
    .map((s) => {
      const parts = [`${s.size_name}: ${s.fit_quality} fit`]
      if (s.bust_ease_cm != null) parts.push(`bust ease ${s.bust_ease_cm}cm`)
      if (s.warnings.length > 0) parts.push(`warnings: ${s.warnings.join('; ')}`)
      if (s.measurement_deltas.length > 0) {
        const deltaStr = s.measurement_deltas
          .map((d) => `${d.measurement}: ${d.difference_cm > 0 ? '+' : ''}${d.difference_cm}cm`)
          .join(', ')
        parts.push(`deltas: ${deltaStr}`)
      }
      return `  - ${parts.join(' | ')}`
    })
    .join('\n')

  return {
    system: `You are a knitting fit expert. You help knitters choose the right pattern size based on their body measurements and desired ease.

Key principles:
- Bust ease is the primary sizing axis for tops/sweaters/cardigans
- Cardigans need more ease than pullovers for comfortable layering
- Accessories (hats, socks) use circumference as the primary measurement
- Between sizes: size up for relaxed/oversized preference, size down for close/negative
- If shoulders are tight but bust fits, suggest sizing up and adding waist shaping
- If a measurement is tight but within 2cm, blocking may resolve it
- Never suggest altering the core construction — only simple modifications (shorter sleeves, added length)

Respond with valid JSON only. Keep advice concise and practical. No disclaimers.`,

    user: `Pattern: "${input.pattern_title}" (${input.garment_type ?? 'garment'})
Ease preference: ${input.ease_preference}

Size scoring (best to worst):
${sizeDetails}

Top recommendation: ${input.top_size.size_name} (${input.top_size.fit_quality} fit${input.top_size.bust_ease_cm != null ? `, ${input.top_size.bust_ease_cm}cm bust ease` : ''})
${input.runner_up ? `Runner-up: ${input.runner_up.size_name} (${input.runner_up.fit_quality} fit${input.runner_up.bust_ease_cm != null ? `, ${input.runner_up.bust_ease_cm}cm bust ease` : ''})` : 'No close runner-up.'}
${input.has_warnings ? 'There are fit warnings — address them in your notes.' : ''}

Return JSON:
{
  "recommendation_summary": "1-2 sentence summary of which size to pick and why",
  "fit_notes": ["specific fit observation 1", "specific fit observation 2"],
  "between_sizes_advice": "advice if the two top sizes are close, or null if one size is clearly best",
  "modification_suggestions": ["simple mod suggestion if any fit issues exist, or empty array"]
}`,
  }
}
