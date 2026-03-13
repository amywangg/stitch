/**
 * Shared gauge calculation functions.
 * Used by both gauge API routes and the AI agent tools.
 */

export function measurementToRows(targetCm: number, rowsPer10cm: number, checkIntervalCm = 2) {
  const rowsPerCm = rowsPer10cm / 10
  const estimatedRows = Math.round(targetCm * rowsPerCm)

  const checkpoints: { cm: number; rows: number }[] = []
  for (let cm = checkIntervalCm; cm < targetCm; cm += checkIntervalCm) {
    checkpoints.push({ cm: Math.round(cm * 10) / 10, rows: Math.round(cm * rowsPerCm) })
  }

  return { target_cm: targetCm, estimated_rows: estimatedRows, rows_per_cm: Math.round(rowsPerCm * 100) / 100, checkpoints }
}

export function rowsToMeasurement(rowCount: number, rowsPer10cm: number) {
  const rowsPerCm = rowsPer10cm / 10
  const estimatedCm = rowCount / rowsPerCm

  return {
    row_count: rowCount,
    estimated_cm: Math.round(estimatedCm * 10) / 10,
    estimated_inches: Math.round((estimatedCm / 2.54) * 10) / 10,
    rows_per_cm: Math.round(rowsPerCm * 100) / 100,
  }
}

export function compareGauges(
  patternStitches: number,
  patternRows: number,
  userStitches: number,
  userRows: number,
) {
  const stitchRatio = userStitches / patternStitches
  const rowRatio = userRows / patternRows
  const stitchDiffPct = Math.round((stitchRatio - 1) * 100)
  const rowDiffPct = Math.round((rowRatio - 1) * 100)

  let advice = ''
  if (Math.abs(stitchDiffPct) > 5 || Math.abs(rowDiffPct) > 5) {
    advice = stitchRatio > 1
      ? 'Try a larger needle size to loosen your tension.'
      : 'Try a smaller needle size to tighten your tension.'
  } else {
    advice = 'Your gauge is close enough to the pattern gauge.'
  }

  return {
    stitch_ratio: Math.round(stitchRatio * 100) / 100,
    row_ratio: Math.round(rowRatio * 100) / 100,
    stitch_difference_pct: stitchDiffPct,
    row_difference_pct: rowDiffPct,
    advice,
    matches: Math.abs(stitchDiffPct) <= 5 && Math.abs(rowDiffPct) <= 5,
  }
}
