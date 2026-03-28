import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/marketplace/[id]/ownership
 * Checks if the current user owns or has purchased a pattern.
 * Used by iOS to determine "View pattern" vs "Purchase on web".
 */
export const GET = withAuth(async (_req, user, params) => {
  const patternId = params!.id

  const pattern = await prisma.patterns.findFirst({
    where: { id: patternId, deleted_at: null },
    select: { id: true, user_id: true, price_cents: true },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  const isOwner = pattern.user_id === user.id
  const isFree = pattern.price_cents === null || pattern.price_cents === 0

  let isPurchased = false
  let purchaseDate: Date | null = null

  if (!isOwner && !isFree) {
    const purchase = await prisma.pattern_purchases.findUnique({
      where: {
        buyer_id_pattern_id: { buyer_id: user.id, pattern_id: patternId },
      },
    })
    if (purchase?.status === 'completed') {
      isPurchased = true
      purchaseDate = purchase.created_at
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      owned: isOwner,
      purchased: isPurchased,
      free: isFree,
      has_access: isOwner || isPurchased || isFree,
      purchase_date: purchaseDate,
    },
  })
})
