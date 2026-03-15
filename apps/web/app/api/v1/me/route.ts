import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { getUserTier, TIER_LIMITS } from '@/lib/pro-gate'

/**
 * GET /api/v1/me
 * Returns the current user's profile, tier, and feature limits.
 * Used by iOS app to gate features client-side and show correct upgrade prompts.
 */
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const tier = getUserTier(user)
  const limits = TIER_LIMITS[tier]

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      avatarUrl: user.avatar_url,
      tier,
      isPro: user.is_pro,
      limits,
    },
  })
}
