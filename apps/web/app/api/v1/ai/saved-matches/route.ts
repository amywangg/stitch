import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { matchSavedPatternsToStash } from '@/lib/agent'

/**
 * GET /api/v1/ai/saved-matches
 * "Which of my saved patterns should I cast on?" — cross-refs saved patterns with stash.
 * No Pro gate — this is pure DB logic, no AI call.
 */
export async function GET(_req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const matches = await matchSavedPatternsToStash(user.id)

  return NextResponse.json({ success: true, data: matches })
}
