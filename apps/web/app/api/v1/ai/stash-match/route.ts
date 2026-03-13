import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { matchStashToPatterns } from '@/lib/agent'

/**
 * POST /api/v1/ai/stash-match
 * "What can I make with this yarn?" — matches a stash item to Ravelry patterns.
 *
 * Body: { stash_item_id: string, craft?: string, category?: string, page?: number }
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const proError = requirePro(user, 'AI pattern matching')
  if (proError) return proError

  const body = await req.json()
  const { stash_item_id, craft, category, page } = body as {
    stash_item_id: string
    craft?: 'knitting' | 'crochet'
    category?: string
    page?: number
  }

  if (!stash_item_id) {
    return NextResponse.json({ error: 'stash_item_id is required' }, { status: 400 })
  }

  try {
    const result = await matchStashToPatterns(user.id, stash_item_id, { craft, category, page })
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Matching failed' },
      { status: err instanceof Error && err.message === 'Stash item not found' ? 404 : 500 },
    )
  }
}
