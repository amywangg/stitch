import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { convertPatternGauge } from '@/lib/agent'

export const maxDuration = 60

/**
 * POST /api/v1/ai/convert-gauge
 * "Convert this pattern for my yarn" — recalculates stitch/row counts using GPT-4o.
 *
 * Body: {
 *   pattern_id: string,
 *   original_stitches_per_10cm: number,
 *   original_rows_per_10cm: number,
 *   new_stitches_per_10cm: number,
 *   new_rows_per_10cm: number,
 * }
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const proError = requirePro(user, 'AI gauge conversion')
  if (proError) return proError

  const body = await req.json()
  const {
    pattern_id,
    original_stitches_per_10cm,
    original_rows_per_10cm,
    new_stitches_per_10cm,
    new_rows_per_10cm,
  } = body as {
    pattern_id: string
    original_stitches_per_10cm: number
    original_rows_per_10cm: number
    new_stitches_per_10cm: number
    new_rows_per_10cm: number
  }

  if (!pattern_id || !original_stitches_per_10cm || !original_rows_per_10cm || !new_stitches_per_10cm || !new_rows_per_10cm) {
    return NextResponse.json({ error: 'All gauge values and pattern_id are required' }, { status: 400 })
  }

  try {
    const result = await convertPatternGauge(
      user.id,
      pattern_id,
      new_stitches_per_10cm,
      new_rows_per_10cm,
      original_stitches_per_10cm,
      original_rows_per_10cm,
    )
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Conversion failed' },
      { status: 500 },
    )
  }
}
