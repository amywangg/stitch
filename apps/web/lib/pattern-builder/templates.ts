/**
 * Template layer: converts PatternBlueprint → AIPatternOutput without AI.
 * Same output interface as the AI route, so the DB write path is 100% reusable.
 */

import type {
  PatternBlueprint,
  AIPatternOutput,
  AIPatternSection,
  StepBlueprint,
  SectionBlueprint,
  ProjectOptions,
} from './types'

/** Convert a PatternBlueprint into pattern output without AI. */
export function blueprintToPattern(
  blueprint: PatternBlueprint,
  targetSize: string,
  options: ProjectOptions | Record<string, unknown>,
): AIPatternOutput {
  const sections = blueprint.sections_per_size[targetSize] ?? []

  return {
    title: generateTitle(blueprint, options as Record<string, unknown>),
    description: generateDescription(blueprint, options as Record<string, unknown>),
    sections: sections.map(formatSection),
  }
}

/** Deterministic title from blueprint metadata + options. */
function generateTitle(
  blueprint: PatternBlueprint,
  options: Record<string, unknown>,
): string {
  const parts: string[] = []

  // Stitch pattern qualifier
  const bodyStitch = options.body_stitch ?? options.stitch_pattern
  if (bodyStitch && bodyStitch !== 'stockinette') {
    parts.push(formatOption(bodyStitch as string))
  }

  // Style qualifier
  const style = options.hat_style ?? options.style ?? options.form
  if (style) {
    parts.push(formatOption(style as string))
  }

  // Garment type
  parts.push(formatOption(blueprint.garment_type))

  return parts.join(' ')
}

/** Deterministic 2-sentence description. */
function generateDescription(
  blueprint: PatternBlueprint,
  options: Record<string, unknown>,
): string {
  const difficulty = blueprint.difficulty
  const garment = blueprint.garment_type
  const needle = blueprint.needle_size_mm
  const gauge = blueprint.gauge

  const bodyStitch = options.body_stitch ?? options.stitch_pattern ?? 'stockinette'
  const stitchLabel = formatOption(bodyStitch as string).toLowerCase()

  const sizeNames = blueprint.sizes.map((s) => s.name)
  const sizeList = sizeNames.length > 4
    ? `${sizeNames.slice(0, 3).join(', ')}, and ${sizeNames.length - 3} more`
    : sizeNames.join(', ')

  return (
    `A ${difficulty} ${garment} knit in ${stitchLabel} on ${needle}mm needles. ` +
    `Gauge: ${gauge.stitches_per_10cm} sts and ${gauge.rows_per_10cm} rows per 10cm. ` +
    `Sizes: ${sizeList}.`
  )
}

/** Format a section blueprint into an AI output section. */
function formatSection(section: SectionBlueprint): AIPatternSection {
  return {
    name: section.name,
    steps: section.steps.map(formatStep),
  }
}

/** Format a single step — description is already usable, enhance slightly. */
function formatStep(step: StepBlueprint): {
  step_number: number
  instruction: string
  stitch_count: number | null
  notes: string | null
} {
  const notes: string[] = []

  if (step.math_notes) {
    notes.push(step.math_notes)
  }

  if (step.row_type === 'work_to_measurement' && step.target_measurement_cm) {
    notes.push(`Measure frequently — target ${step.target_measurement_cm}cm`)
  }

  if (step.is_repeat && step.repeat_count) {
    notes.push(`Repeat ${step.repeat_count} times total`)
  }

  return {
    step_number: step.step_number,
    instruction: step.description,
    stitch_count: step.stitch_count,
    notes: notes.length > 0 ? notes.join('. ') : null,
  }
}

/** Convert snake_case option value to Title Case. */
function formatOption(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
