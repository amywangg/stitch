import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'
import { marketplaceSearchSchema } from '@/lib/schemas/marketplace'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/marketplace
 * Browse marketplace patterns. Requires auth but shows all listed patterns.
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const url = new URL(req.url)
  const { page, limit, skip } = parsePagination(req)

  const params = marketplaceSearchSchema.safeParse({
    query: url.searchParams.get('query') ?? undefined,
    craft: url.searchParams.get('craft') ?? undefined,
    category: url.searchParams.get('category') ?? undefined,
    weight: url.searchParams.get('weight') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
    price_filter: url.searchParams.get('price_filter') ?? undefined,
  })

  if (!params.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', fields: params.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { query, craft, category, weight, sort, price_filter } = params.data

  // Build where clause
  const where: Record<string, unknown> = {
    is_marketplace: true,
    deleted_at: null,
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { designer_name: { contains: query, mode: 'insensitive' } },
    ]
  }
  if (craft) where.craft_type = craft
  if (category) where.garment_type = category
  if (weight) where.yarn_weight = weight
  if (price_filter === 'free') where.price_cents = null
  if (price_filter === 'paid') where.price_cents = { not: null }

  // Sort
  let orderBy: Record<string, string>
  switch (sort) {
    case 'popular':
      orderBy = { sales_count: 'desc' }
      break
    case 'price_low':
      orderBy = { price_cents: 'asc' }
      break
    case 'price_high':
      orderBy = { price_cents: 'desc' }
      break
    default:
      orderBy = { created_at: 'desc' }
  }

  const [items, total] = await Promise.all([
    prisma.patterns.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        craft_type: true,
        difficulty: true,
        garment_type: true,
        yarn_weight: true,
        cover_image_url: true,
        designer_name: true,
        price_cents: true,
        currency: true,
        sales_count: true,
        rating: true,
        rating_count: true,
        created_at: true,
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    }),
    prisma.patterns.count({ where }),
  ])

  return paginatedResponse(items, total, page, limit)
})
