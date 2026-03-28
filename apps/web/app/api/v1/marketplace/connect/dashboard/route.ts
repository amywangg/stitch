import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'
import { stripe } from '@/lib/stripe'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/marketplace/connect/dashboard
 * Returns a Stripe Express login link for managing payouts.
 */
export const GET = withAuth(async (_req, user) => {
  const connectId = user.stripe_connect_id as string | null

  if (!connectId) {
    return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 })
  }

  const loginLink = await stripe!.accounts.createLoginLink(connectId)

  return NextResponse.json({
    success: true,
    data: { url: loginLink.url },
  })
})
