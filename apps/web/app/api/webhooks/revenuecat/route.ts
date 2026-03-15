import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Tier } from '@/lib/pro-gate'

type RevenueCatEvent = {
  event: {
    type: string // 'INITIAL_PURCHASE' | 'RENEWAL' | 'CANCELLATION' | 'EXPIRATION' | 'UNCANCELLATION' | ...
    app_user_id: string // Clerk user ID (set as RevenueCat app user ID on sign-in)
    product_id?: string
    expiration_at_ms?: number
    store?: string // 'APP_STORE' | 'PLAY_STORE' | 'STRIPE'
    period_type?: string // 'NORMAL' | 'TRIAL' | 'INTRO'
  }
}

const ACTIVE_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
])

const INACTIVE_EVENT_TYPES = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
])

/**
 * Maps RevenueCat product IDs to tiers.
 * Configure these in RevenueCat dashboard to match.
 */
const PRODUCT_TIER_MAP: Record<string, Tier> = {
  // Plus ($1.99/mo)
  'com.stitchmarker.plus.monthly': 'plus',
  'com.stitchmarker.plus.yearly': 'plus',
  // Pro ($4.99/mo)
  'com.stitchmarker.pro.monthly': 'pro',
  'com.stitchmarker.pro.yearly': 'pro',
  'com.stitchmarker.pro.lifetime': 'pro',
}

function tierFromProductId(productId: string | undefined): Tier {
  if (!productId) return 'pro' // fallback for legacy events without product_id
  return PRODUCT_TIER_MAP[productId] ?? 'pro'
}

export async function POST(req: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  const authHeader = req.headers.get('authorization')

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as RevenueCatEvent
  const { type, app_user_id: clerkId, expiration_at_ms, product_id, store, period_type } = body.event

  const user = await prisma.users.findUnique({ where: { clerk_id: clerkId } })
  if (!user) {
    // User not yet synced — skip silently
    return NextResponse.json({ received: true })
  }

  if (ACTIVE_EVENT_TYPES.has(type)) {
    const tier = tierFromProductId(product_id)
    const isPro = tier === 'pro'

    await prisma.users.update({
      where: { id: user.id },
      data: {
        is_pro: isPro,
        subscription: {
          upsert: {
            create: {
              plan: tier,
              status: 'active',
              product_id: product_id ?? null,
              store: store?.toLowerCase() ?? null,
              expires_at: expiration_at_ms ? new Date(expiration_at_ms) : null,
            },
            update: {
              plan: tier,
              status: 'active',
              product_id: product_id ?? null,
              store: store?.toLowerCase() ?? null,
              expires_at: expiration_at_ms ? new Date(expiration_at_ms) : null,
            },
          },
        },
      },
    })
  }

  if (INACTIVE_EVENT_TYPES.has(type)) {
    const isPastExpiry =
      !expiration_at_ms || expiration_at_ms < Date.now()

    if (isPastExpiry) {
      await prisma.users.update({
        where: { id: user.id },
        data: {
          is_pro: false,
          subscription: {
            update: {
              plan: 'free',
              status: type === 'CANCELLATION' ? 'cancelled' : 'expired',
            },
          },
        },
      })
    }
  }

  return NextResponse.json({ received: true })
}
