import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/v1/ravelry/patterns/:id
 * Fetch full pattern detail from Ravelry by ravelry_id.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const ravelryId = parseInt(id, 10)
  if (isNaN(ravelryId)) {
    return NextResponse.json({ error: 'Invalid pattern ID' }, { status: 400 })
  }

  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  try {
    const detail = await getRavelryPatternDetail(ravelryId, user.id)
    return NextResponse.json({ success: true, data: detail })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch pattern from Ravelry' },
      { status: 502 },
    )
  }
}
