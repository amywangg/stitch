import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'
import { matchSavedPatternsToStash } from '@/lib/agent'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/ai/saved-matches
 * "Which of my saved patterns should I cast on?" — cross-refs saved patterns with stash.
 * No Pro gate — this is pure DB logic, no AI call.
 */
export const GET = withAuth(async (_req, user) => {
  const matches = await matchSavedPatternsToStash(user.id)

  return NextResponse.json({ success: true, data: matches })
})
