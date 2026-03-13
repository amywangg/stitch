import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/v1/gauge/compare
 * Compare pattern gauge to user's gauge and calculate adjustments needed.
 *
 * Body: {
 *   pattern_stitches: number,  // stitches per 10cm in pattern
 *   pattern_rows: number,      // rows per 10cm in pattern
 *   user_stitches: number,     // user's stitches per 10cm
 *   user_rows: number          // user's rows per 10cm
 * }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { pattern_stitches, pattern_rows, user_stitches, user_rows } = body

  if (!pattern_stitches || !pattern_rows || !user_stitches || !user_rows) {
    return NextResponse.json({ error: 'All four gauge values are required' }, { status: 400 })
  }

  const stitchRatio = user_stitches / pattern_stitches
  const rowRatio = user_rows / pattern_rows

  const stitchDiffPct = Math.round((stitchRatio - 1) * 100)
  const rowDiffPct = Math.round((rowRatio - 1) * 100)

  let advice = ''
  if (Math.abs(stitchDiffPct) > 5 || Math.abs(rowDiffPct) > 5) {
    const needleAdvice =
      stitchRatio > 1
        ? 'Try a larger needle size to loosen your tension.'
        : 'Try a smaller needle size to tighten your tension.'
    advice = needleAdvice
  } else {
    advice = 'Your gauge is close enough to the pattern gauge.'
  }

  return NextResponse.json({
    success: true,
    data: {
      stitch_ratio: Math.round(stitchRatio * 100) / 100,
      row_ratio: Math.round(rowRatio * 100) / 100,
      stitch_difference_pct: stitchDiffPct,
      row_difference_pct: rowDiffPct,
      advice,
      matches: Math.abs(stitchDiffPct) <= 5 && Math.abs(rowDiffPct) <= 5,
    },
  })
}
