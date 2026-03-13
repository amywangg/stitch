import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/v1/gauge/rows-to-measurement
 * Convert a row count to estimated measurement.
 *
 * Body: { row_count: number, rows_per_10cm: number }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { row_count, rows_per_10cm } = body

  if (!row_count || !rows_per_10cm) {
    return NextResponse.json({ error: 'row_count and rows_per_10cm are required' }, { status: 400 })
  }

  const rowsPerCm = rows_per_10cm / 10
  const estimatedCm = row_count / rowsPerCm

  return NextResponse.json({
    success: true,
    data: {
      row_count,
      estimated_cm: Math.round(estimatedCm * 10) / 10,
      estimated_inches: Math.round((estimatedCm / 2.54) * 10) / 10,
      rows_per_cm: Math.round(rowsPerCm * 100) / 100,
    },
  })
}
