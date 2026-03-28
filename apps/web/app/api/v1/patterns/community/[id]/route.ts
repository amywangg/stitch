import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
type Params = { params: Promise<{ id: string }> }

export const GET = withAuth(async (req: NextRequest, _user, params) => {
  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const pattern = await prisma.patterns.findFirst({
    where: {
      id,
      is_public: true,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      designer_name: true,
      craft_type: true,
      garment_type: true,
      difficulty: true,
      yarn_weight: true,
      cover_image_url: true,
      sizes_available: true,
      needle_sizes: true,
      gauge_stitches_per_10cm: true,
      gauge_rows_per_10cm: true,
      gauge_stitch_pattern: true,
      needle_size_mm: true,
      yardage_min: true,
      yardage_max: true,
      rating: true,
      rating_count: true,
      source_url: true,
      created_at: true,
      user: {
        select: {
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  const { user, ...rest } = pattern
  return NextResponse.json({
    success: true,
    data: { ...rest, author: user },
  })
})
