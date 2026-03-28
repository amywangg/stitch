/**
 * Deterministic size recommendation calculations.
 * Maps body measurements to pattern finished measurements,
 * accounting for ease preferences by garment type.
 */

import { round } from '@/lib/utils'

// ─── Ease constants ──────────────────────────────────────────────────────────

/**
 * Ease = finished garment measurement minus body measurement.
 * Varies by garment type. Values are in cm.
 */
export interface EaseRange {
  negative: number   // body-hugging (e.g. fitted tee, sports bra)
  close: number      // minimal ease (e.g. fitted pullover)
  standard: number   // standard fit (e.g. regular pullover)
  relaxed: number    // loose fit (e.g. oversized sweater)
  oversized: number  // very oversized (e.g. blanket cardigan)
}

export type EasePreference = keyof EaseRange

export const EASE_PREFERENCES: EasePreference[] = [
  'negative', 'close', 'standard', 'relaxed', 'oversized',
]

/** Bust/chest ease ranges in cm by garment type */
export const BUST_EASE: Record<string, EaseRange> = {
  pullover:   { negative: -2, close: 2, standard: 7, relaxed: 12, oversized: 20 },
  cardigan:   { negative: 0,  close: 5, standard: 10, relaxed: 15, oversized: 25 },
  vest:       { negative: -2, close: 2, standard: 5, relaxed: 10, oversized: 18 },
  tank:       { negative: -3, close: 0, standard: 5, relaxed: 10, oversized: 15 },
  coat:       { negative: 5,  close: 10, standard: 15, relaxed: 20, oversized: 30 },
  dress:      { negative: -2, close: 2, standard: 7, relaxed: 12, oversized: 20 },
  // Default for unrecognized garment types
  default:    { negative: -2, close: 2, standard: 7, relaxed: 12, oversized: 20 },
}

/** Non-bust measurement tolerance — how far off is acceptable before flagging */
export const SECONDARY_TOLERANCE_CM = 3

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BodyMeasurements {
  bust_cm?: number | null
  waist_cm?: number | null
  hip_cm?: number | null
  shoulder_width_cm?: number | null
  back_length_cm?: number | null
  arm_length_cm?: number | null
  upper_arm_cm?: number | null
  head_circumference_cm?: number | null
  foot_length_cm?: number | null
}

export interface PatternSize {
  name: string
  finished_bust_cm?: number | null
  finished_length_cm?: number | null
  hip_cm?: number | null
  shoulder_width_cm?: number | null
  arm_length_cm?: number | null
  upper_arm_cm?: number | null
  back_length_cm?: number | null
  head_circumference_cm?: number | null
  foot_length_cm?: number | null
  yardage?: number | null
}

export interface SizeScore {
  size_name: string
  bust_ease_cm: number | null
  fit_quality: 'ideal' | 'acceptable' | 'compromise'
  warnings: string[]
  measurement_deltas: Array<{
    measurement: string
    body_cm: number
    finished_cm: number
    difference_cm: number
  }>
}

// ─── Core logic ──────────────────────────────────────────────────────────────

/**
 * Gets the ideal bust ease in cm for a garment type and ease preference.
 */
export function getTargetEase(
  garmentType: string | null | undefined,
  preference: EasePreference,
): number {
  const normalized = (garmentType ?? 'default').toLowerCase().trim()
  const easeMap = BUST_EASE[normalized] ?? BUST_EASE.default
  return easeMap[preference]
}

/**
 * Scores each pattern size against the user's body measurements.
 * Returns all sizes ranked from best to worst fit.
 */
export function scoreSizes(
  body: BodyMeasurements,
  sizes: PatternSize[],
  garmentType: string | null | undefined,
  easePreference: EasePreference,
): SizeScore[] {
  const targetEase = getTargetEase(garmentType, easePreference)

  const scored: (SizeScore & { _sortScore: number })[] = []

  for (const size of sizes) {
    const warnings: string[] = []
    const deltas: SizeScore['measurement_deltas'] = []
    let bustEase: number | null = null
    let sortScore = 0

    // Primary: bust ease
    if (body.bust_cm && size.finished_bust_cm) {
      bustEase = size.finished_bust_cm - body.bust_cm
      const easeDeviation = Math.abs(bustEase - targetEase)
      sortScore = easeDeviation

      deltas.push({
        measurement: 'bust',
        body_cm: body.bust_cm,
        finished_cm: size.finished_bust_cm,
        difference_cm: round(bustEase, 1),
      })

      if (bustEase < -5) {
        warnings.push(`Very tight in the bust (${round(bustEase, 1)}cm ease)`)
      }
    } else {
      // No bust data — can't score this axis, give neutral score
      sortScore = 50
    }

    // Secondary measurements — check for fit issues
    const secondaryChecks: Array<{
      label: string
      bodyVal: number | null | undefined
      finishedVal: number | null | undefined
    }> = [
      { label: 'hip', bodyVal: body.hip_cm, finishedVal: size.hip_cm },
      { label: 'shoulder width', bodyVal: body.shoulder_width_cm, finishedVal: size.shoulder_width_cm },
      { label: 'arm length', bodyVal: body.arm_length_cm, finishedVal: size.arm_length_cm },
      { label: 'upper arm', bodyVal: body.upper_arm_cm, finishedVal: size.upper_arm_cm },
      { label: 'body length', bodyVal: body.back_length_cm, finishedVal: size.back_length_cm ?? size.finished_length_cm },
      { label: 'head circumference', bodyVal: body.head_circumference_cm, finishedVal: size.head_circumference_cm },
      { label: 'foot length', bodyVal: body.foot_length_cm, finishedVal: size.foot_length_cm },
    ]

    for (const check of secondaryChecks) {
      if (check.bodyVal && check.finishedVal) {
        const diff = check.finishedVal - check.bodyVal
        deltas.push({
          measurement: check.label,
          body_cm: check.bodyVal,
          finished_cm: check.finishedVal,
          difference_cm: round(diff, 1),
        })

        if (diff < -SECONDARY_TOLERANCE_CM) {
          warnings.push(`Tight in ${check.label} (${round(diff, 1)}cm)`)
          sortScore += 5
        } else if (diff < 0) {
          sortScore += 2
        }
      }
    }

    // Classify fit quality
    let fitQuality: SizeScore['fit_quality'] = 'ideal'
    if (bustEase != null) {
      const easeDeviation = Math.abs(bustEase - targetEase)
      if (easeDeviation > 8) fitQuality = 'compromise'
      else if (easeDeviation > 4 || warnings.length > 0) fitQuality = 'acceptable'
    } else if (warnings.length > 0) {
      fitQuality = 'acceptable'
    }

    scored.push({
      size_name: size.name,
      bust_ease_cm: bustEase != null ? round(bustEase, 1) : null,
      fit_quality: fitQuality,
      warnings,
      measurement_deltas: deltas,
      _sortScore: sortScore,
    })
  }

  // Sort by score (lower = better fit)
  scored.sort((a, b) => a._sortScore - b._sortScore)

  // Strip internal sort score
  return scored.map(({ _sortScore: _, ...rest }) => rest)
}

/**
 * Checks whether body measurements are sufficient to make a recommendation.
 * Returns the list of missing measurements that would improve accuracy.
 */
export function checkMeasurementCoverage(
  body: BodyMeasurements,
  sizes: PatternSize[],
): { sufficient: boolean; available: string[]; missing_but_helpful: string[] } {
  // What measurements does the pattern actually have?
  const patternHas = new Set<string>()
  for (const size of sizes) {
    if (size.finished_bust_cm) patternHas.add('bust')
    if (size.hip_cm) patternHas.add('hip')
    if (size.shoulder_width_cm) patternHas.add('shoulder_width')
    if (size.arm_length_cm) patternHas.add('arm_length')
    if (size.upper_arm_cm) patternHas.add('upper_arm')
    if (size.back_length_cm || size.finished_length_cm) patternHas.add('back_length')
    if (size.head_circumference_cm) patternHas.add('head_circumference')
    if (size.foot_length_cm) patternHas.add('foot_length')
  }

  const bodyFieldMap: Record<string, number | null | undefined> = {
    bust: body.bust_cm,
    hip: body.hip_cm,
    shoulder_width: body.shoulder_width_cm,
    arm_length: body.arm_length_cm,
    upper_arm: body.upper_arm_cm,
    back_length: body.back_length_cm,
    head_circumference: body.head_circumference_cm,
    foot_length: body.foot_length_cm,
  }

  const available: string[] = []
  const missingButHelpful: string[] = []

  for (const key of patternHas) {
    if (bodyFieldMap[key] != null) {
      available.push(key)
    } else {
      missingButHelpful.push(key)
    }
  }

  return {
    sufficient: available.length > 0,
    available,
    missing_but_helpful: missingButHelpful,
  }
}

