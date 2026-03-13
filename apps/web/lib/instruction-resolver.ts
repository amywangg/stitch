import type { pattern_rows } from '@stitch/db'

type PatternStep = Pick<
  pattern_rows,
  | 'row_number'
  | 'instruction'
  | 'stitch_count'
  | 'row_type'
  | 'rows_in_step'
  | 'is_repeat'
  | 'repeat_count'
  | 'rows_per_repeat'
  | 'target_measurement_cm'
  | 'notes'
>

export type ResolvedStep = {
  step_number: number
  instruction: string
  stitch_count: number | null
  row_type: string | null
  notes: string | null
  rows_in_step: number | null
  is_open_ended: boolean
  target_measurement_cm: number | null
  // For repeats:
  is_repeat: boolean
  repeat_count: number | null
  rows_per_repeat: number | null
}

export type StepPosition = {
  step_number: number
  tap_in_step: number
  total_taps_in_step: number | null // null = open-ended
  step_label: string // e.g. "Tap 8 of 24" or "Row 38"
}

/**
 * Gets the total number of steps in a section.
 */
export function getTotalSteps(steps: PatternStep[]): number {
  return steps.length
}

/**
 * Calculates the total estimated taps across all steps.
 * Open-ended steps (rows_in_step = null) contribute 0 to the count.
 */
export function getTotalExpandedRows(steps: PatternStep[]): number {
  let total = 0
  for (const step of steps) {
    if (step.rows_in_step) {
      total += step.rows_in_step
    }
    // open-ended steps don't contribute to known total
  }
  return total
}

/**
 * Given a step number (1-based), returns the resolved instruction for that step.
 */
export function resolveStep(steps: PatternStep[], stepNumber: number): ResolvedStep | null {
  const step = steps.find((s) => s.row_number === stepNumber)
  if (!step) return null

  return {
    step_number: step.row_number,
    instruction: step.instruction,
    stitch_count: step.stitch_count,
    row_type: step.row_type,
    notes: step.notes,
    rows_in_step: step.rows_in_step,
    is_open_ended: step.rows_in_step === null,
    target_measurement_cm: step.target_measurement_cm,
    is_repeat: step.is_repeat,
    repeat_count: step.repeat_count,
    rows_per_repeat: step.rows_per_repeat,
  }
}

/**
 * Given a step and the current tap count within that step,
 * returns a human-readable position label.
 */
export function getStepPosition(step: ResolvedStep, tapInStep: number): StepPosition {
  let stepLabel: string

  if (step.is_repeat && step.repeat_count && step.rows_per_repeat) {
    // For a repeat with rows_per_repeat=2, repeat_count=12:
    // taps 1-2 = repeat 1, taps 3-4 = repeat 2, etc.
    const currentRepeat = Math.ceil(tapInStep / step.rows_per_repeat)
    const rowInRepeat = ((tapInStep - 1) % step.rows_per_repeat) + 1
    if (step.rows_per_repeat === 1) {
      stepLabel = `Repeat ${currentRepeat} of ${step.repeat_count}`
    } else {
      stepLabel = `Repeat ${currentRepeat} of ${step.repeat_count}, row ${rowInRepeat} of ${step.rows_per_repeat}`
    }
  } else if (step.is_open_ended) {
    stepLabel = `Row ${tapInStep}`
  } else if (step.rows_in_step === 1) {
    stepLabel = 'Tap to complete'
  } else {
    stepLabel = `Row ${tapInStep} of ${step.rows_in_step}`
  }

  return {
    step_number: step.step_number,
    tap_in_step: tapInStep,
    total_taps_in_step: step.rows_in_step,
    step_label: stepLabel,
  }
}

/**
 * Determines whether the current tap should auto-advance to the next step.
 * Returns true if the step has a defined row count and we've reached it.
 * Open-ended steps never auto-advance.
 */
export function shouldAutoAdvance(step: ResolvedStep, tapInStep: number): boolean {
  if (step.is_open_ended) return false
  if (!step.rows_in_step) return false
  return tapInStep >= step.rows_in_step
}

/**
 * Returns overall section progress — how many steps completed + current step progress.
 */
export function getSectionProgress(
  steps: PatternStep[],
  currentStep: number,
  tapInCurrentStep: number
): {
  current_step: number
  total_steps: number
  steps_completed: number
  step_pct: number // progress within current step (0-100)
  overall_pct: number // weighted progress across all steps
} {
  const totalSteps = steps.length
  const stepsCompleted = Math.max(0, currentStep - 1)

  // Current step progress
  const step = steps.find((s) => s.row_number === currentStep)
  let stepPct = 0
  if (step && step.rows_in_step && step.rows_in_step > 0) {
    stepPct = Math.min(100, Math.round((tapInCurrentStep / step.rows_in_step) * 100))
  } else if (step && tapInCurrentStep > 0) {
    // Open-ended — we can't calculate %, just show that work is happening
    stepPct = 0
  }

  // Overall progress: weight by rows_in_step if known
  // Steps with known row counts get proportional weight; open-ended get average weight
  let totalWeight = 0
  let completedWeight = 0
  const avgKnownRows = steps.reduce((sum, s) => sum + (s.rows_in_step ?? 0), 0) / Math.max(1, steps.filter((s) => s.rows_in_step).length) || 10

  for (const s of steps) {
    const weight = s.rows_in_step ?? avgKnownRows
    totalWeight += weight
    if (s.row_number < currentStep) {
      completedWeight += weight
    } else if (s.row_number === currentStep && s.rows_in_step) {
      completedWeight += weight * (tapInCurrentStep / s.rows_in_step)
    }
  }

  const overallPct = totalWeight > 0 ? Math.min(100, Math.round((completedWeight / totalWeight) * 100)) : 0

  return {
    current_step: currentStep,
    total_steps: totalSteps,
    steps_completed: stepsCompleted,
    step_pct: stepPct,
    overall_pct: overallPct,
  }
}
