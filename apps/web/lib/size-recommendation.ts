import type { pattern_sizes, user_measurements } from '@stitch/db'
import { round } from '@/lib/utils'

type PatternSize = Pick<
  pattern_sizes,
  | 'name'
  | 'finished_bust_cm'
  | 'finished_length_cm'
  | 'hip_cm'
  | 'shoulder_width_cm'
  | 'arm_length_cm'
  | 'upper_arm_cm'
  | 'back_length_cm'
  | 'head_circumference_cm'
  | 'foot_length_cm'
  | 'sort_order'
>

type UserMeasurements = Pick<
  user_measurements,
  | 'bust_cm'
  | 'hip_cm'
  | 'shoulder_width_cm'
  | 'arm_length_cm'
  | 'upper_arm_cm'
  | 'back_length_cm'
  | 'head_circumference_cm'
  | 'foot_length_cm'
>

export type SizeRecommendation = {
  name: string
  sort_order: number
  ease_cm: number | null
  fit: 'tight' | 'close' | 'standard' | 'relaxed' | 'oversized'
  recommendation: string
  score: number // lower = better fit
}

// Standard positive ease ranges (cm) for knitted garments
const EASE_RANGES = {
  tight: { min: -3, max: 2 },
  close: { min: 2, max: 5 },
  standard: { min: 5, max: 10 },
  relaxed: { min: 10, max: 18 },
  oversized: { min: 18, max: 50 },
} as const

function classifyEase(easeCm: number): SizeRecommendation['fit'] {
  if (easeCm < EASE_RANGES.tight.max) return 'tight'
  if (easeCm < EASE_RANGES.close.max) return 'close'
  if (easeCm < EASE_RANGES.standard.max) return 'standard'
  if (easeCm < EASE_RANGES.relaxed.max) return 'relaxed'
  return 'oversized'
}

function fitDescription(fit: SizeRecommendation['fit'], easeCm: number): string {
  const easeInches = round(easeCm / 2.54, 1)
  switch (fit) {
    case 'tight':
      return `Negative/minimal ease (${easeInches}" ease) — body-hugging fit`
    case 'close':
      return `Close fit (${easeInches}" ease) — follows body lines`
    case 'standard':
      return `Standard fit (${easeInches}" ease) — true to size`
    case 'relaxed':
      return `Relaxed fit (${easeInches}" ease) — comfortable room`
    case 'oversized':
      return `Oversized fit (${easeInches}" ease) — intentionally roomy`
  }
}

type MeasurementPair = { user: number; pattern: number; weight: number }

/**
 * Compares user measurements against pattern sizes and ranks by fit.
 * Pure math — no AI involved.
 */
export function recommendSizes(
  sizes: PatternSize[],
  measurements: UserMeasurements
): SizeRecommendation[] {
  const results: SizeRecommendation[] = []

  for (const size of sizes) {
    const pairs: MeasurementPair[] = []

    // Bust is the primary measurement for most garments (highest weight)
    if (measurements.bust_cm && size.finished_bust_cm) {
      pairs.push({ user: measurements.bust_cm, pattern: size.finished_bust_cm, weight: 3 })
    }
    if (measurements.hip_cm && size.hip_cm) {
      pairs.push({ user: measurements.hip_cm, pattern: size.hip_cm, weight: 2 })
    }
    if (measurements.shoulder_width_cm && size.shoulder_width_cm) {
      pairs.push({ user: measurements.shoulder_width_cm, pattern: size.shoulder_width_cm, weight: 1.5 })
    }
    if (measurements.arm_length_cm && size.arm_length_cm) {
      pairs.push({ user: measurements.arm_length_cm, pattern: size.arm_length_cm, weight: 1 })
    }
    if (measurements.upper_arm_cm && size.upper_arm_cm) {
      pairs.push({ user: measurements.upper_arm_cm, pattern: size.upper_arm_cm, weight: 1 })
    }
    if (measurements.back_length_cm && size.back_length_cm) {
      pairs.push({ user: measurements.back_length_cm, pattern: size.back_length_cm, weight: 1 })
    }
    if (measurements.head_circumference_cm && size.head_circumference_cm) {
      pairs.push({ user: measurements.head_circumference_cm, pattern: size.head_circumference_cm, weight: 3 })
    }
    if (measurements.foot_length_cm && size.foot_length_cm) {
      pairs.push({ user: measurements.foot_length_cm, pattern: size.foot_length_cm, weight: 3 })
    }

    if (pairs.length === 0) {
      // No comparable measurements — can't recommend
      results.push({
        name: size.name,
        sort_order: size.sort_order,
        ease_cm: null,
        fit: 'standard',
        recommendation: 'No measurements available to compare',
        score: 999,
      })
      continue
    }

    // Weighted average ease using bust/primary measurement
    const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0)
    const weightedEase = pairs.reduce((sum, p) => sum + (p.pattern - p.user) * p.weight, 0) / totalWeight

    // Score: distance from ideal standard ease (7.5cm) — lower is better
    const idealEase = 7.5
    const score = Math.abs(weightedEase - idealEase)

    const fit = classifyEase(weightedEase)

    results.push({
      name: size.name,
      sort_order: size.sort_order,
      ease_cm: round(weightedEase, 1),
      fit,
      recommendation: fitDescription(fit, weightedEase),
      score: round(score, 1),
    })
  }

  // Sort by score (best fit first), preserve sort_order as tiebreaker
  return results.sort((a, b) => a.score - b.score || a.sort_order - b.sort_order)
}
