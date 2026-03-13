import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RevenueCatEvent = {
  event: {
    type: string // 'INITIAL_PURCHASE' | 'RENEWAL' | 'CANCELLATION' | 'EXPIRATION' | 'UNCANCELLATION' | ...
    app_user_id: string // Clerk user ID (set as RevenueCat app user ID on sign-in)
    product_id?: string
    expiration_at_ms?: number
  }
}

const PRO_EVENT_TYPES = new Set([
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

export async function POST(req: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  const authHeader = req.headers.get('authorization')

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as RevenueCatEvent
  const { type, app_user_id: clerkId, expiration_at_ms } = body.event

  const user = await prisma.users.findUnique({ where: { clerk_id: clerkId } })
  if (!user) {
    // User not yet synced — skip silently
    return NextResponse.json({ received: true })
  }

  if (PRO_EVENT_TYPES.has(type)) {
    await prisma.users.update({
      where: { id: user.id },
      data: {
        is_pro: true,
        subscription: {
          upsert: {
            create: {
              plan: 'pro',
              status: 'active',
              expires_at: expiration_at_ms ? new Date(expiration_at_ms) : null,
            },
            update: {
              plan: 'pro',
              status: 'active',
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
