import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { stripe } from '@/lib/stripe'


export const dynamic = 'force-dynamic'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stitch.app'

/**
 * GET /api/v1/marketplace/connect/status
 * Check Stripe Connect onboarding status.
 */
export const GET = withAuth(async (_req, user) => {
  const connectId = user.stripe_connect_id as string | null

  if (!connectId) {
    return NextResponse.json({
      success: true,
      data: { connected: false, charges_enabled: false },
    })
  }

  const account = await stripe!.accounts.retrieve(connectId)
  const chargesEnabled = account.charges_enabled ?? false
  const detailsSubmitted = account.details_submitted ?? false

  // Update onboarded flag if needed
  if (chargesEnabled && !user.stripe_onboarded) {
    await prisma.users.update({
      where: { id: user.id },
      data: { stripe_onboarded: true },
    })
  }

  // If not fully onboarded, provide a link to continue
  let onboardingUrl: string | undefined
  if (!detailsSubmitted) {
    const accountLink = await stripe!.accountLinks.create({
      account: connectId,
      refresh_url: `${BASE_URL}/marketplace/sell?refresh=true`,
      return_url: `${BASE_URL}/marketplace/sell?connected=true`,
      type: 'account_onboarding',
    })
    onboardingUrl = accountLink.url
  }

  return NextResponse.json({
    success: true,
    data: {
      connected: true,
      charges_enabled: chargesEnabled,
      details_submitted: detailsSubmitted,
      onboarding_url: onboardingUrl,
    },
  })
})
