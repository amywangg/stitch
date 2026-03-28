import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { stripe } from '@/lib/stripe'


export const dynamic = 'force-dynamic'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stitch.app'

/**
 * POST /api/v1/marketplace/connect
 * Creates a Stripe Connect Express account and returns an onboarding link.
 * If the user already has a Connect account, returns a new onboarding link
 * (useful if they didn't finish onboarding previously).
 */
export const POST = withAuth(async (_req, user) => {
  let connectId = user.stripe_connect_id as string | null

  if (!connectId) {
    // Create new Connect Express account
    const account = await stripe!.accounts.create({
      type: 'express',
      email: user.email,
      metadata: {
        stitch_user_id: user.id,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    connectId = account.id

    await prisma.users.update({
      where: { id: user.id },
      data: { stripe_connect_id: connectId },
    })
  }

  // Create onboarding link
  const accountLink = await stripe!.accountLinks.create({
    account: connectId,
    refresh_url: `${BASE_URL}/marketplace/sell?refresh=true`,
    return_url: `${BASE_URL}/marketplace/sell?connected=true`,
    type: 'account_onboarding',
  })

  return NextResponse.json({
    success: true,
    data: { url: accountLink.url },
  })
})
