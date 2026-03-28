import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/marketplace/purchases
 * Lists all patterns the user has purchased.
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const { page, limit, skip } = parsePagination(req)

  const where = {
    buyer_id: user.id,
    status: 'completed',
  }

  const [items, total] = await Promise.all([
    prisma.pattern_purchases.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        pattern: {
          select: {
            id: true,
            slug: true,
            title: true,
            cover_image_url: true,
            craft_type: true,
            garment_type: true,
            difficulty: true,
            designer_name: true,
            price_cents: true,
            user: {
              select: { username: true, display_name: true, avatar_url: true },
            },
          },
        },
      },
    }),
    prisma.pattern_purchases.count({ where }),
  ])

  return paginatedResponse(items, total, page, limit)
})
