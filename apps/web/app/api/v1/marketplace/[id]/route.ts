import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/marketplace/[id]
 * Returns marketplace pattern detail.
 * - Always includes metadata (title, description, photos, gauge, sizes)
 * - Only includes row-by-row instructions if user owns or has purchased the pattern
 * - Includes purchase status for the requesting user
 */
export const GET = withAuth(async (_req, user, params) => {
  const id = params!.id

  const pattern = await prisma.patterns.findFirst({
    where: { id, is_marketplace: true, deleted_at: null },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          seller_bio: true,
        },
      },
      sizes: true,
      photos: { orderBy: { sort_order: 'asc' } },
      pattern_yarns: { orderBy: { sort_order: 'asc' } },
      reviews: {
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { username: true, display_name: true, avatar_url: true } },
        },
      },
      _count: { select: { reviews: true } },
    },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  const isOwner = pattern.user_id === user.id

  // Check purchase status
  let isPurchased = false
  if (!isOwner) {
    const purchase = await prisma.pattern_purchases.findUnique({
      where: {
        buyer_id_pattern_id: { buyer_id: user.id, pattern_id: id },
      },
    })
    isPurchased = purchase?.status === 'completed'
  }

  const hasAccess = isOwner || isPurchased || pattern.price_cents === null

  // Only include sections/rows if user has access
  let sections = null
  if (hasAccess) {
    sections = await prisma.pattern_sections.findMany({
      where: { pattern_id: id },
      orderBy: { sort_order: 'asc' },
      include: {
        rows: { orderBy: { row_number: 'asc' } },
      },
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      ...pattern,
      sections,
      is_owner: isOwner,
      is_purchased: isPurchased,
      has_access: hasAccess,
    },
  })
})
