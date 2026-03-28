import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'


export const dynamic = 'force-dynamic'
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for marketplace purchases.
 *
 * Events handled:
 * - checkout.session.completed → fulfill purchase
 * - charge.refunded → revoke access
 * - account.updated → update Connect onboarding status
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge)
      break

    case 'account.updated':
      await handleAccountUpdated(event.data.object as Stripe.Account)
      break

    default:
      // Unhandled event type — ignore
      break
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const patternId = session.metadata?.pattern_id
  const buyerId = session.metadata?.buyer_id
  const sellerId = session.metadata?.seller_id

  if (!patternId || !buyerId || !sellerId) {
    console.error('Stripe checkout missing metadata:', session.id)
    return
  }

  // Update purchase to completed
  await prisma.pattern_purchases.update({
    where: { stripe_session_id: session.id },
    data: {
      status: 'completed',
      stripe_payment_intent: session.payment_intent as string,
    },
  })

  // Increment sales count
  await prisma.patterns.update({
    where: { id: patternId },
    data: { sales_count: { increment: 1 } },
  })

  // Get buyer info for notification
  const buyer = await prisma.users.findUnique({
    where: { id: buyerId },
    select: { username: true, display_name: true },
  })

  const pattern = await prisma.patterns.findUnique({
    where: { id: patternId },
    select: { title: true },
  })

  // Notify seller
  if (buyer && pattern) {
    await prisma.notifications.create({
      data: {
        user_id: sellerId,
        sender_id: buyerId,
        type: 'pattern_sold',
        message: `${buyer.display_name || buyer.username} purchased "${pattern.title}"`,
        resource_type: 'pattern',
        resource_id: patternId,
      },
    })
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntent = charge.payment_intent as string
  if (!paymentIntent) return

  const purchase = await prisma.pattern_purchases.findFirst({
    where: { stripe_payment_intent: paymentIntent },
  })

  if (!purchase) return

  await prisma.$transaction([
    prisma.pattern_purchases.update({
      where: { id: purchase.id },
      data: { status: 'refunded' },
    }),
    prisma.patterns.update({
      where: { id: purchase.pattern_id },
      data: { sales_count: { decrement: 1 } },
    }),
  ])
}

async function handleAccountUpdated(account: Stripe.Account) {
  if (!account.id) return

  const user = await prisma.users.findUnique({
    where: { stripe_connect_id: account.id },
  })

  if (!user) return

  const chargesEnabled = account.charges_enabled ?? false

  if (chargesEnabled !== user.stripe_onboarded) {
    await prisma.users.update({
      where: { id: user.id },
      data: { stripe_onboarded: chargesEnabled },
    })
  }
}
