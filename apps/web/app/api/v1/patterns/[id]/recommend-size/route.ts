import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { recommendSizes } from '@/lib/size-recommendation'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/v1/patterns/[id]/recommend-size
 * Returns ranked size recommendations based on user measurements.
 * Pure math — not Pro-gated.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

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
}
