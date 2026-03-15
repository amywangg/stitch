import { NextResponse } from 'next/server'
import type { users } from '@stitch/db'

// ─── Tier definitions ────────────────────────────────────────────────────────

export type Tier = 'free' | 'plus' | 'pro'

/**
 * Centralized tier limits. Adjust values here and all gates update automatically.
 * `null` means unlimited. Missing key means feature is not available on that tier.
 *
 * Tier table:
 * | Feature                  | Free        | Plus ($1.99/mo) | Pro ($4.99/mo) |
 * |--------------------------|-------------|-----------------|----------------|
 * | Row counter              | ✓           | ✓               | ✓              |
 * | Stash / needles          | Unlimited   | Unlimited       | Unlimited      |
 * | Social posting           | ✓           | ✓               | ✓              |
 * | Active projects          | 3           | Unlimited       | Unlimited      |
 * | Saved patterns           | 15          | Unlimited       | Unlimited      |
 * | PDF parsing (AI)         | 2/month     | 5/month         | Unlimited      |
 * | Cross-device realtime    | —           | ✓               | ✓              |
 * | AI tools (8 routes)      | —           | —               | ✓              |
 * | Row instruction explainer| ✓ (mini)    | ✓               | ✓              |
 * | Ravelry auto re-sync     | —           | —               | ✓              |
 */
export const TIER_LIMITS = {
  free: {
    activeProjects: 3,
    savedPatterns: 15,
    pdfUploadsPerMonth: 2,
    storedPdfs: 10,
    stashPhotos: 5,
    crossDeviceRealtime: false,
    aiTools: false,
    ravelryAutoSync: false,
  },
  plus: {
    activeProjects: null,   // unlimited
    savedPatterns: null,    // unlimited
    pdfUploadsPerMonth: 5,
    storedPdfs: null,       // unlimited
    stashPhotos: null,      // unlimited
    crossDeviceRealtime: true,
    aiTools: false,
    ravelryAutoSync: false,
  },
  pro: {
    activeProjects: null,   // unlimited
    savedPatterns: null,    // unlimited
    pdfUploadsPerMonth: null, // unlimited
    storedPdfs: null,       // unlimited
    stashPhotos: null,      // unlimited
    crossDeviceRealtime: true,
    aiTools: true,
    ravelryAutoSync: true,
  },
} as const satisfies Record<Tier, Record<string, number | boolean | null>>

// ─── Backward-compatible aliases ─────────────────────────────────────────────

export const FREE_LIMITS = TIER_LIMITS.free
export const PLUS_LIMITS = TIER_LIMITS.plus

// ─── Tier helpers ────────────────────────────────────────────────────────────

/**
 * Derives the user's current tier from their subscription record.
 * Reads `subscription.plan` if present, otherwise falls back to `is_pro`.
 */
export function getUserTier(user: users & { subscription?: { plan: string } | null }): Tier {
  if (user.subscription?.plan === 'pro') return 'pro'
  if (user.subscription?.plan === 'plus') return 'plus'
  if (user.is_pro) return 'pro' // fallback for legacy data
  return 'free'
}

/**
 * Returns the numeric limit for a feature on the user's tier, or null if unlimited.
 */
export function getTierLimit(
  user: users & { subscription?: { plan: string } | null },
  feature: keyof typeof TIER_LIMITS.free
): number | boolean | null {
  const tier = getUserTier(user)
  return TIER_LIMITS[tier][feature]
}

// ─── Gate helpers ────────────────────────────────────────────────────────────

/**
 * Returns a 403 NextResponse if the user is not at least Plus tier.
 * Use for features available to Plus and Pro subscribers.
 */
export function requirePlus(
  user: users & { subscription?: { plan: string } | null },
  featureName: string
): NextResponse | null {
  const tier = getUserTier(user)
  if (tier === 'free') {
    return NextResponse.json(
      {
        error: 'Plus required',
        code: 'PLUS_REQUIRED',
        message: `Upgrade to Stitch Plus to unlock ${featureName}.`,
        upgrade_url: '/settings/billing',
      },
      { status: 403 }
    )
  }
  return null
}

/**
 * Returns a 403 NextResponse if the user does not have a Pro subscription.
 * Use for Pro-only features (AI tools, Ravelry auto-sync, unlimited PDFs).
 */
export function requirePro(
  user: users & { subscription?: { plan: string } | null },
  featureName: string
): NextResponse | null {
  const tier = getUserTier(user)
  if (tier !== 'pro') {
    return NextResponse.json(
      {
        error: 'Pro required',
        code: 'PRO_REQUIRED',
        message: `Upgrade to Stitch Pro to unlock ${featureName}.`,
        upgrade_url: '/settings/billing',
      },
      { status: 403 }
    )
  }
  return null
}

/**
 * Returns a 403 NextResponse if the user has reached the free-tier limit
 * for a countable feature. Pass the current count (e.g., active project count).
 * Returns null if the user has capacity remaining or is on a tier with no limit.
 */
export function requireCapacity(
  user: users & { subscription?: { plan: string } | null },
  feature: 'activeProjects' | 'savedPatterns' | 'pdfUploadsPerMonth' | 'storedPdfs' | 'stashPhotos',
  currentCount: number,
  featureLabel: string
): NextResponse | null {
  const limit = getTierLimit(user, feature)
  if (limit === null || limit === true) return null // unlimited
  if (typeof limit === 'number' && currentCount < limit) return null // under limit

  const tier = getUserTier(user)
  const nextTier = tier === 'free' ? 'Plus' : 'Pro'
  return NextResponse.json(
    {
      error: `${featureLabel} limit reached`,
      code: 'FREE_LIMIT_REACHED',
      message: `You've reached the ${tier} tier limit of ${limit} ${featureLabel.toLowerCase()}. Upgrade to Stitch ${nextTier} for more.`,
      upgrade_url: '/settings/billing',
      limit,
      current: currentCount,
    },
    { status: 403 }
  )
}
