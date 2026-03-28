import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { recommendSizes } from '@/lib/size-recommendation'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/patterns/[id]/recommend-size
 * Returns ranked size recommendations based on user measurements.
 * Pure math — not Pro-gated.
 */
export const GET = withAuth(async (_req, user, params) => {
  const id = params!.id

  const pattern = await prisma.patterns.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
    include: { sizes: { orderBy: { sort_order: 'asc' } } },
  })
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  if (pattern.sizes.length === 0) {
    return NextResponse.json(
      { error: 'Pattern has no sizes. Parse the PDF first.' },
      { status: 422 }
    )
  }

  const measurements = await prisma.user_measurements.findUnique({
    where: { user_id: user.id },
  })

  if (!measurements) {
    return NextResponse.json({
      success: true,
      data: {
        recommendations: pattern.sizes.map((s) => ({
          name: s.name,
          sort_order: s.sort_order,
          ease_cm: null,
          fit: 'standard' as const,
          recommendation: 'Add your measurements in settings for personalized size recommendations',
          score: 999,
        })),
        has_measurements: false,
      },
    })
  }

  const recommendations = recommendSizes(pattern.sizes, measurements)

  return NextResponse.json({
    success: true,
    data: {
      recommendations,
      has_measurements: true,
    },
  })
})
