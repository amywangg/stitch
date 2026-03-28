/**
 * AI prompt builder for the Pattern Builder.
 * Turns a deterministic PatternBlueprint into natural-language knitting instructions.
 * AI is called once per size — it only writes prose, never calculates.
 */

import { KNITTING_ABBREVIATIONS } from '@/lib/prompts/abbreviations'
import type { SectionBlueprint, PatternBlueprint, ProjectOptions } from '@/lib/pattern-builder/types'

export function buildPatternBuilderPrompt(
  blueprint: PatternBlueprint,
  sizeName: string,
  options: ProjectOptions,
): { system: string; user: string } {
  const sizeSections = blueprint.sections_per_size[sizeName]
  if (!sizeSections) {
    throw new Error(`No sections found for size "${sizeName}"`)
  }

  const system = `You are an expert knitting pattern writer. Your job is to transform pre-calculated construction math into clear, professional knitting instructions.

CRITICAL RULES:
1. All stitch counts, row counts, measurements, and decrease schedules are PRE-CALCULATED. DO NOT recalculate or second-guess them.
2. Write clear instructions using standard knitting abbreviations.
3. Include the stitch count in parentheses at the end of each step instruction, e.g., "(134 sts)".
4. Specify RS (right side) and WS (wrong side) where relevant.
5. Note needle size changes when they occur.
6. Use the math_notes field for context but translate them into natural instruction language.
7. Write in imperative mood ("Cast on", "Knit", "Work") — not conversational.
8. For repeats, write out the full repeat instruction clearly with asterisks for repeat markers.
9. Each section and step must match the provided blueprint exactly — same names, same order, same step numbers.

Common abbreviations:
${KNITTING_ABBREVIATIONS}

Respond with valid JSON matching the exact schema requested. No markdown, no code fences.`

  const sectionsData = sizeSections.map((section) => ({
    name: section.name,
    sort_order: section.sort_order,
    steps: section.steps.map((s) => ({
      step_number: s.step_number,
      description: s.description,
      stitch_count: s.stitch_count,
      row_type: s.row_type,
      rows_in_step: s.rows_in_step,
      is_repeat: s.is_repeat,
      repeat_count: s.repeat_count,
      rows_per_repeat: s.rows_per_repeat,
      target_measurement_cm: s.target_measurement_cm,
      math_notes: s.math_notes,
    })),
  }))

  const user = `Transform these pre-calculated construction instructions into a professional knitting pattern for size "${sizeName}".

Pattern info:
- Type: ${blueprint.garment_type}
- Gauge: ${blueprint.gauge.stitches_per_10cm} sts × ${blueprint.gauge.rows_per_10cm} rows per 10cm
- Main needle: ${blueprint.needle_size_mm}mm
- Ribbing needle: ${blueprint.ribbing_needle_mm}mm
- Options: ${JSON.stringify(options)}

Sections with pre-calculated steps:
${JSON.stringify(sectionsData, null, 2)}

Return JSON with this exact shape:
{
  "title": "Pattern title (creative, descriptive)",
  "description": "2-3 sentence pattern description mentioning the key design choices",
  "sections": [
    {
      "name": "Section Name",
      "steps": [
        {
          "step_number": 1,
          "instruction": "Professional knitting instruction text with stitch count at end (N sts)",
          "stitch_count": 134,
          "notes": "Optional note for the knitter, or null"
        }
      ]
    }
  ]
}`

  return { system, user }
}
