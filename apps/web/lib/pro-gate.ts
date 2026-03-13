import { NextResponse } from 'next/server'
import type { users } from '@stitch/db'

/**
 * Returns a 403 NextResponse if the user does not have a pro subscription.
 * Returns null if the user is pro (request may proceed).
 *
 * Usage in API routes:
 *   const proError = await requirePro(user, 'unlimited projects')
 *   if (proError) return proError
 */
export function requirePro(
  user: users,
  featureName: string
): NextResponse | null {
  if (!user.is_pro) {
    return NextResponse.json(
      {
        error: 'Pro required',
        message: `Upgrade to Stitch Pro to unlock ${featureName}.`,
        upgrade_url: '/settings/billing',
      },
      { status: 403 }
    )
  }
  return null
}

// ─── Soft limits for free tier ────────────────────────────────────────────────

export const FREE_LIMITS = {
  activeProjects: 3,
  savedPatterns: 10,
  pdfUploadsPerMonth: 2,
  storedPdfs: 10,
  stashPhotos: 5,
} as const
