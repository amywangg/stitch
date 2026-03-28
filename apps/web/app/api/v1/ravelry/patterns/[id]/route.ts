import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/ravelry/patterns/:id
 * Fetch full pattern detail from Ravelry by ravelry_id.
 */
export const GET = withAuth(async (_req, user, params) => {
  const ravelryId = parseInt(params!.id, 10)
  if (isNaN(ravelryId)) {
    return NextResponse.json({ error: 'Invalid pattern ID' }, { status: 400 })
  }

  try {
    const detail = await getRavelryPatternDetail(ravelryId, user.id)
    return NextResponse.json({ success: true, data: detail })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch pattern from Ravelry' },
      { status: 502 },
    )
  }
})
