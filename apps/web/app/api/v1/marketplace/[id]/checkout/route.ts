import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { stripe, calculateFees } from '@/lib/stripe'


export const dynamic = 'force-dynamic'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stitch.app'

/**
 * POST /api/v1/marketplace/[id]/checkout
 * Creates a Stripe Checkout Session for purchasing a pattern.
 * Returns the checkout URL for redirect.
 */
export const POST = withAuth(async (_req, user, params) => {
  const patternId = params!.id

  // Find the pattern
  const pattern = await prisma.patterns.findFirst({
    where: { id: patternId, is_marketplace: true, deleted_at: null },
    include: {
      user: { select: { id: true, stripe_connect_id: true, stripe_onboarded: true } },
    },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  // Can't buy your own pattern
  if (pattern.user_id === user.id) {
    return NextResponse.json({ error: 'You cannot purchase your own pattern' }, { status: 400 })
  }

  // Must be a paid pattern
  if (!pattern.price_cents || pattern.price_cents <= 0) {
    return NextResponse.json({ error: 'This pattern is free' }, { status: 400 })
  }

  // Seller must have Stripe Connect set up
  if (!pattern.user.stripe_connect_id || !pattern.user.stripe_onboarded) {
    return NextResponse.json({ error: 'Seller payment setup incomplete' }, { status: 400 })
  }

  // Check if already purchased
  const existing = await prisma.pattern_purchases.findUnique({
    where: {
      buyer_id_pattern_id: { buyer_id: user.id, pattern_id: patternId },
    },
  })

  if (existing?.status === 'completed') {
    return NextResponse.json(
      { error: 'You already own this pattern', code: 'ALREADY_PURCHASED' },
      { status: 400 }
    )
  }

  const { platformFeeCents, sellerAmountCents } = calculateFees(pattern.price_cents)

  // Create Stripe Checkout Session
  const session = await stripe!.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: pattern.currency || 'usd',
          unit_amount: pattern.price_cents,
          product_data: {
            name: pattern.title,
            description: pattern.description?.slice(0, 200) || undefined,
            images: pattern.cover_image_url ? [pattern.cover_image_url] : undefined,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: pattern.user.stripe_connect_id,
      },
    },
    metadata: {
      pattern_id: patternId,
      buyer_id: user.id,
      seller_id: pattern.user_id,
    },
    success_url: `${BASE_URL}/marketplace/${patternId}?purchased=true`,
    cancel_url: `${BASE_URL}/marketplace/${patternId}`,
  })

  // Upsert purchase record (pending)
  await prisma.pattern_purchases.upsert({
    where: {
      buyer_id_pattern_id: { buyer_id: user.id, pattern_id: patternId },
    },
    create: {
      buyer_id: user.id,
      pattern_id: patternId,
      seller_id: pattern.user_id,
      price_cents: pattern.price_cents,
      platform_fee_cents: platformFeeCents,
      seller_amount_cents: sellerAmountCents,
      currency: pattern.currency || 'usd',
      stripe_session_id: session.id,
      status: 'pending',
    },
    update: {
      stripe_session_id: session.id,
      price_cents: pattern.price_cents,
      platform_fee_cents: platformFeeCents,
      seller_amount_cents: sellerAmountCents,
      status: 'pending',
    },
  })

  return NextResponse.json({
    success: true,
    data: { checkout_url: session.url },
  })
})
