import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/marketplace/earnings
 * Creator earnings dashboard — aggregates from pattern_purchases.
 */
export const GET = withAuth(async (_req, user) => {
  if (!user.stripe_onboarded) {
    return NextResponse.json({
      success: true,
      data: {
        total_sales: 0,
        total_earnings_cents: 0,
        this_month_cents: 0,
        patterns_listed: 0,
        recent_sales: [],
      },
    })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalAgg, monthAgg, patternsListed, recentSales] = await Promise.all([
    // All-time totals
    prisma.pattern_purchases.aggregate({
      where: { seller_id: user.id, status: 'completed' },
      _count: true,
      _sum: { seller_amount_cents: true },
    }),
    // This month
    prisma.pattern_purchases.aggregate({
      where: {
        seller_id: user.id,
        status: 'completed',
        created_at: { gte: monthStart },
      },
      _sum: { seller_amount_cents: true },
    }),
    // Listed patterns count
    prisma.patterns.count({
      where: { user_id: user.id, is_marketplace: true, deleted_at: null },
    }),
    // Recent sales
    prisma.pattern_purchases.findMany({
      where: { seller_id: user.id, status: 'completed' },
      take: 20,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        price_cents: true,
        platform_fee_cents: true,
        seller_amount_cents: true,
        created_at: true,
        pattern: { select: { title: true, slug: true } },
        buyer: { select: { username: true, display_name: true } },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      total_sales: totalAgg._count,
      total_earnings_cents: totalAgg._sum.seller_amount_cents ?? 0,
      this_month_cents: monthAgg._sum.seller_amount_cents ?? 0,
      patterns_listed: patternsListed,
      recent_sales: recentSales,
    },
  })
})
