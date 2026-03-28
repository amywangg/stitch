import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'
import { getUserTier, TIER_LIMITS } from '@/lib/pro-gate'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/me
 * Returns the current user's profile, tier, and feature limits.
 * Used by iOS app to gate features client-side and show correct upgrade prompts.
 */
export const GET = withAuth(async (_req, user) => {
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
})
