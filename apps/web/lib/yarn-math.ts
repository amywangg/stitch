/**
 * Deterministic yarn substitution calculations.
 * Pure functions, zero external dependencies.
 * Encodes knitting domain knowledge as lookup tables.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const YARN_WEIGHTS = [
  'lace', 'fingering', 'sport', 'dk', 'worsted', 'aran', 'bulky', 'super_bulky',
] as const

export type YarnWeight = (typeof YARN_WEIGHTS)[number]

export const YARN_WEIGHT_ORDER: Record<YarnWeight, number> = {
  lace: 0,
  fingering: 1,
  sport: 2,
  dk: 3,
  worsted: 4,
  aran: 5,
  bulky: 6,
  super_bulky: 7,
}

/** Needle range in mm per yarn weight (stockinette, typical) */
export const NEEDLE_RANGES: Record<YarnWeight, { min_mm: number; max_mm: number; typical_mm: number }> = {
  lace:         { min_mm: 1.5,  max_mm: 2.75, typical_mm: 2.25 },
  fingering:    { min_mm: 2.25, max_mm: 3.5,  typical_mm: 2.75 },
  sport:        { min_mm: 3.0,  max_mm: 4.0,  typical_mm: 3.5  },
  dk:           { min_mm: 3.5,  max_mm: 4.5,  typical_mm: 4.0  },
  worsted:      { min_mm: 4.0,  max_mm: 5.5,  typical_mm: 4.5  },
  aran:         { min_mm: 5.0,  max_mm: 6.5,  typical_mm: 5.5  },
  bulky:        { min_mm: 6.0,  max_mm: 9.0,  typical_mm: 6.5  },
  super_bulky:  { min_mm: 9.0,  max_mm: 15.0, typical_mm: 10.0 },
}

/** Gauge range per 10cm in stockinette per yarn weight */
export const GAUGE_RANGES: Record<YarnWeight, {
  stitches_min: number; stitches_max: number; stitches_typical: number
  rows_min: number; rows_max: number; rows_typical: number
}> = {
  lace:         { stitches_min: 32, stitches_max: 40, stitches_typical: 36, rows_min: 40, rows_max: 52, rows_typical: 46 },
  fingering:    { stitches_min: 26, stitches_max: 34, stitches_typical: 30, rows_min: 36, rows_max: 46, rows_typical: 40 },
  sport:        { stitches_min: 22, stitches_max: 28, stitches_typical: 25, rows_min: 30, rows_max: 40, rows_typical: 34 },
  dk:           { stitches_min: 20, stitches_max: 24, stitches_typical: 22, rows_min: 28, rows_max: 36, rows_typical: 30 },
  worsted:      { stitches_min: 16, stitches_max: 20, stitches_typical: 18, rows_min: 22, rows_max: 30, rows_typical: 26 },
  aran:         { stitches_min: 14, stitches_max: 18, stitches_typical: 16, rows_min: 20, rows_max: 26, rows_typical: 23 },
  bulky:        { stitches_min: 10, stitches_max: 14, stitches_typical: 12, rows_min: 16, rows_max: 22, rows_typical: 18 },
  super_bulky:  { stitches_min: 6,  stitches_max: 10, stitches_typical: 8,  rows_min: 10, rows_max: 16, rows_typical: 12 },
}

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isValidYarnWeight(w: string): w is YarnWeight {
  return YARN_WEIGHTS.includes(w as YarnWeight)
}

// ─── Multi-strand weight estimation ──────────────────────────────────────────

export interface YarnStrand {
  weight: YarnWeight
  fiber_content?: string | null
  strands: number
}

/**
 * Detects whether a yarn is mohair from its fiber content string.
 * Mohair contributes halo/warmth but less stitch structure,
 * so it counts at half weight when held with other yarns.
 */
export function isMohairYarn(fiberContent: string | null | undefined): boolean {
  if (!fiberContent) return false
  return /mohair|kid\s*silk/i.test(fiberContent)
}

/**
 * Estimates the effective combined yarn weight for a multi-strand combo.
 * Mohair strands contribute 0.5x their weight level.
 * Result is clamped to valid weight range.
 */
export function estimateEffectiveWeight(combo: YarnStrand[]): YarnWeight {
  let totalLevel = 0

  for (const strand of combo) {
    const baseLevel = YARN_WEIGHT_ORDER[strand.weight]
    const isMohair = isMohairYarn(strand.fiber_content)
    const contribution = isMohair ? baseLevel * 0.5 : baseLevel
    totalLevel += contribution * strand.strands
  }

  // Round to nearest integer, clamp to valid range
  const rounded = Math.round(totalLevel)
  const clamped = Math.max(1, Math.min(rounded, YARN_WEIGHT_ORDER.super_bulky))

  // Map back to weight name
  const entry = Object.entries(YARN_WEIGHT_ORDER).find(([, v]) => v === clamped)
  return (entry?.[0] as YarnWeight) ?? 'worsted'
}

// ─── Needle recommendation ───────────────────────────────────────────────────

export function recommendNeedleRange(weight: YarnWeight): {
  suggested_mm: number
  range_min_mm: number
  range_max_mm: number
} {
  const range = NEEDLE_RANGES[weight]
  return {
    suggested_mm: range.typical_mm,
    range_min_mm: range.min_mm,
    range_max_mm: range.max_mm,
  }
}

// ─── Gauge estimation ────────────────────────────────────────────────────────

/**
 * Estimates gauge for a given weight. If a needle size is provided and falls
 * outside the typical range, shifts the estimate accordingly (bigger needle = looser gauge).
 */
export function estimateGaugeRange(
  weight: YarnWeight,
  needleMm?: number,
): {
  stitches_per_10cm: number
  rows_per_10cm: number
} {
  const range = GAUGE_RANGES[weight]
  const needleRange = NEEDLE_RANGES[weight]

  let stitches = range.stitches_typical
  let rows = range.rows_typical

  if (needleMm != null) {
    // How far off the typical needle is this, as a fraction of the range
    const needleRangeSpan = needleRange.max_mm - needleRange.min_mm
    if (needleRangeSpan > 0) {
      const deviation = (needleMm - needleRange.typical_mm) / needleRangeSpan
      // Bigger needle → fewer stitches/rows (negative correlation)
      const stitchSpan = range.stitches_max - range.stitches_min
      const rowSpan = range.rows_max - range.rows_min
      stitches = Math.round(range.stitches_typical - deviation * stitchSpan * 0.5)
      rows = Math.round(range.rows_typical - deviation * rowSpan * 0.5)
    }
  }

  // Clamp to valid range
  stitches = Math.max(range.stitches_min, Math.min(stitches, range.stitches_max))
  rows = Math.max(range.rows_min, Math.min(rows, range.rows_max))

  return { stitches_per_10cm: stitches, rows_per_10cm: rows }
}

// ─── Yardage recalculation ───────────────────────────────────────────────────

/**
 * Scales original yardage by gauge change ratios.
 * More stitches/rows per 10cm = more yarn needed for the same dimensions.
 */
export function recalculateYardage(
  originalYards: number,
  stitchRatio: number,
  rowRatio: number,
): number {
  // Yardage scales roughly with the product of stitch and row ratios
  // (more stitches × more rows = proportionally more yarn)
  return Math.ceil(originalYards * stitchRatio * rowRatio)
}

// ─── Per-yarn yardage breakdown ──────────────────────────────────────────────

export interface YarnInCombo {
  name: string
  strands: number
  yardage_per_skein?: number | null
  skeins_available?: number | null
}

export interface YarnYardageBreakdown {
  name: string
  yards_needed: number
  skeins_needed: number | null
  yards_available: number | null
  sufficient: boolean | null
}

/**
 * Splits total yardage across yarns in a combo proportional to strand count.
 * Each strand consumes the same length of yarn (they're knit together).
 */
export function calculateYardagePerYarn(
  totalYards: number,
  combo: YarnInCombo[],
): YarnYardageBreakdown[] {
  // When yarns are held together, each strand needs the full yardage
  return combo.map((yarn) => {
    const yardsNeeded = totalYards * yarn.strands

    const skeinYardage = yarn.yardage_per_skein
    const skeinsNeeded = skeinYardage ? Math.ceil(yardsNeeded / skeinYardage) : null

    const yardsAvailable =
      skeinYardage && yarn.skeins_available != null
        ? Math.round(yarn.skeins_available * skeinYardage)
        : null

    return {
      name: yarn.name,
      yards_needed: yardsNeeded,
      skeins_needed: skeinsNeeded,
      yards_available: yardsAvailable,
      sufficient: yardsAvailable != null ? yardsAvailable >= yardsNeeded : null,
    }
  })
}

// ─── Needle inventory matching ───────────────────────────────────────────────

export interface UserNeedle {
  id: string
  type: string
  size_mm: number
  size_label: string | null
  material: string | null
}

/**
 * Filters a user's needle inventory to find ones within the recommended range.
 */
export function findMatchingNeedles(
  userNeedles: UserNeedle[],
  range: { range_min_mm: number; range_max_mm: number },
): UserNeedle[] {
  return userNeedles.filter(
    (n) => n.size_mm >= range.range_min_mm && n.size_mm <= range.range_max_mm,
  )
}
