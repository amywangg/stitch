import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// Standard gauge ranges per weight category (stockinette, per 10cm)
// Source: Craft Yarn Council standards
const WEIGHT_DATA: Record<string, {
  stitches: [number, number] // [min, max] sts per 10cm
  rows: [number, number]     // [min, max] rows per 10cm
  needle: [number, number]   // [min, max] needle size in mm
  thickness: number           // relative thickness score for stranding calculation
}> = {
  lace:        { stitches: [32, 40], rows: [36, 48], needle: [1.5, 2.25], thickness: 1 },
  fingering:   { stitches: [28, 32], rows: [32, 40], needle: [2.25, 3.25], thickness: 2 },
  sport:       { stitches: [24, 28], rows: [28, 36], needle: [3.25, 3.75], thickness: 3 },
  dk:          { stitches: [21, 24], rows: [26, 32], needle: [3.75, 4.5], thickness: 4 },
  worsted:     { stitches: [16, 20], rows: [22, 28], needle: [4.5, 5.5], thickness: 5 },
  aran:        { stitches: [16, 18], rows: [20, 26], needle: [5.0, 5.5], thickness: 6 },
  bulky:       { stitches: [12, 15], rows: [16, 22], needle: [5.5, 8.0], thickness: 7 },
  super_bulky: { stitches: [6, 11],  rows: [10, 16], needle: [8.0, 12.75], thickness: 8 },
}

// Sorted weights from thinnest to thickest
const SORTED_WEIGHTS = ['lace', 'fingering', 'sport', 'dk', 'worsted', 'aran', 'bulky', 'super_bulky']

interface YarnInput {
  weight: string
  strands: number
}

/**
 * Estimate gauge from a combination of yarns held together.
 *
 * Algorithm:
 * 1. Convert each yarn weight to a thickness score
 * 2. For each yarn entry: total_thickness += thickness_score × strands
 * 3. Map total thickness back to a weight category
 * 4. Return the gauge range for that effective weight
 *
 * Examples:
 * - 1 strand worsted (5) = worsted gauge
 * - 2 strands fingering (2×2=4) = DK gauge
 * - 1 strand fingering (2) + 1 strand lace mohair (1) = sport gauge (3)
 * - 2 strands DK (2×4=8) = super bulky gauge
 */
function estimateGauge(yarns: YarnInput[]) {
  if (yarns.length === 0) return null

  let totalThickness = 0
  for (const yarn of yarns) {
    const data = WEIGHT_DATA[yarn.weight]
    if (!data) continue
    totalThickness += data.thickness * yarn.strands
  }

  if (totalThickness === 0) return null

  // Find the closest weight category
  let effectiveWeight = 'super_bulky'
  for (const weight of SORTED_WEIGHTS) {
    const data = WEIGHT_DATA[weight]
    if (totalThickness <= data.thickness) {
      effectiveWeight = weight
      break
    }
  }

  // If thickness exceeds all categories, use super_bulky
  // For in-between values, interpolate between two nearest categories
  let lowerWeight = SORTED_WEIGHTS[0]
  let upperWeight = SORTED_WEIGHTS[0]
  for (let i = 0; i < SORTED_WEIGHTS.length; i++) {
    const w = SORTED_WEIGHTS[i]
    if (WEIGHT_DATA[w].thickness <= totalThickness) {
      lowerWeight = w
    }
    if (WEIGHT_DATA[w].thickness >= totalThickness && upperWeight === SORTED_WEIGHTS[0]) {
      upperWeight = w
      break
    }
  }
  // If we never found an upper bound, use the thickest
  if (WEIGHT_DATA[upperWeight].thickness < totalThickness) {
    upperWeight = 'super_bulky'
    lowerWeight = 'super_bulky'
  }

  const lower = WEIGHT_DATA[lowerWeight]
  const upper = WEIGHT_DATA[upperWeight]

  let stitchesMin: number, stitchesMax: number
  let rowsMin: number, rowsMax: number
  let needleMin: number, needleMax: number

  if (lowerWeight === upperWeight) {
    // Exact match
    stitchesMin = lower.stitches[0]
    stitchesMax = lower.stitches[1]
    rowsMin = lower.rows[0]
    rowsMax = lower.rows[1]
    needleMin = lower.needle[0]
    needleMax = lower.needle[1]
  } else {
    // Interpolate between the two bracketing weights
    const range = upper.thickness - lower.thickness
    const t = range > 0 ? (totalThickness - lower.thickness) / range : 0.5

    stitchesMin = Math.round(lower.stitches[0] + (upper.stitches[0] - lower.stitches[0]) * t)
    stitchesMax = Math.round(lower.stitches[1] + (upper.stitches[1] - lower.stitches[1]) * t)
    rowsMin = Math.round(lower.rows[0] + (upper.rows[0] - lower.rows[0]) * t)
    rowsMax = Math.round(lower.rows[1] + (upper.rows[1] - lower.rows[1]) * t)
    needleMin = Math.round((lower.needle[0] + (upper.needle[0] - lower.needle[0]) * t) * 4) / 4
    needleMax = Math.round((lower.needle[1] + (upper.needle[1] - lower.needle[1]) * t) * 4) / 4
  }

  // Format effective weight label
  const effectiveLabel = effectiveWeight.replace('_', ' ')

  return {
    effective_weight: effectiveWeight,
    effective_weight_label: effectiveLabel,
    total_thickness_score: totalThickness,
    stitches_per_10cm: { min: stitchesMin, max: stitchesMax, midpoint: Math.round((stitchesMin + stitchesMax) / 2) },
    rows_per_10cm: { min: rowsMin, max: rowsMax, midpoint: Math.round((rowsMin + rowsMax) / 2) },
    needle_size_mm: { min: needleMin, max: needleMax, midpoint: Math.round((needleMin + needleMax) * 2) / 4 },
  }
}

// POST /api/v1/gauge/estimate — estimate gauge from yarn combination
export const POST = withAuth(async (req, _user) => {
  const body = await req.json()
  const yarns: YarnInput[] = body.yarns

  if (!Array.isArray(yarns) || yarns.length === 0) {
    return NextResponse.json({ error: 'yarns array is required' }, { status: 400 })
  }

  // Validate all yarns have known weights
  const invalid = yarns.filter(y => !WEIGHT_DATA[y.weight])
  if (invalid.length > 0) {
    return NextResponse.json({
      error: `Unknown yarn weight(s): ${invalid.map(y => y.weight).join(', ')}. Valid weights: ${SORTED_WEIGHTS.join(', ')}`,
    }, { status: 400 })
  }

  const estimate = estimateGauge(yarns)

  return NextResponse.json({ success: true, data: estimate })
})
