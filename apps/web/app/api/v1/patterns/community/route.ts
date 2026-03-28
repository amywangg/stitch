import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'
import { parsePagination, paginatedResponse } from '@/lib/route-helpers'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req: NextRequest) => {
  const { page, limit, skip } = parsePagination(req)

  const query = req.nextUrl.searchParams.get('query')?.trim()
  const craft = req.nextUrl.searchParams.get('craft')
  const category = req.nextUrl.searchParams.get('category')
  const weight = req.nextUrl.searchParams.get('weight')
  const sort = req.nextUrl.searchParams.get('sort') ?? 'newest'

  const where: Record<string, unknown> = {
    is_public: true,
    deleted_at: null,
    source_free: true,
    ravelry_id: null, // Only Stitch-native patterns (built here or custom PDF uploads)
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { designer_name: { contains: query, mode: 'insensitive' } },
    ]
  }
  if (craft) {
    where.craft_type = craft
  }
  if (category) {
    where.garment_type = { contains: category, mode: 'insensitive' }
  }
  if (weight) {
    where.yarn_weight = { contains: weight, mode: 'insensitive' }
  }

  const orderBy = sort === 'popular'
    ? { rating_count: 'desc' as const }
    : { created_at: 'desc' as const }

  const [items, total] = await Promise.all([
    prisma.patterns.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        designer_name: true,
        craft_type: true,
        garment_type: true,
        difficulty: true,
        yarn_weight: true,
        cover_image_url: true,
        rating: true,
        rating_count: true,
        created_at: true,
        user: {
          select: {
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    }),
    prisma.patterns.count({ where }),
  ])

  // Reshape to include author field
  const shaped = items.map(({ user, ...rest }) => ({
    ...rest,
    author: user,
  }))

  return paginatedResponse(shaped, total, page, limit)
})
