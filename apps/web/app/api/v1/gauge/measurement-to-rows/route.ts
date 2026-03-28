import { NextRequest, NextResponse } from 'next/server'


export const dynamic = 'force-dynamic'
/**
 * POST /api/v1/gauge/measurement-to-rows
 * Convert a target measurement (cm) to estimated row count + check-in points.
 *
 * Body: { target_cm: number, rows_per_10cm: number, check_interval_cm?: number }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { target_cm, rows_per_10cm, check_interval_cm = 2 } = body

  if (!target_cm || !rows_per_10cm) {
    return NextResponse.json({ error: 'target_cm and rows_per_10cm are required' }, { status: 400 })
  }

  const rowsPerCm = rows_per_10cm / 10
  const estimatedRows = Math.round(target_cm * rowsPerCm)

  // Build measurement checkpoints (e.g. every 2 cm)
  const checkpoints: { cm: number; rows: number }[] = []
  for (let cm = check_interval_cm; cm < target_cm; cm += check_interval_cm) {
    checkpoints.push({ cm: Math.round(cm * 10) / 10, rows: Math.round(cm * rowsPerCm) })
  }

  return NextResponse.json({
    success: true,
    data: {
      target_cm,
      estimated_rows: estimatedRows,
      rows_per_cm: Math.round(rowsPerCm * 100) / 100,
      checkpoints,
    },
  })
}
