import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// GET /api/v1/swatches/browse — browse public swatches from all users
export const GET = withAuth(async (req, _user) => {
  const { page, limit, skip } = parsePagination(req)
  const searchParams = req.nextUrl.searchParams
  const craft = searchParams.get('craft')
  const yarnWeight = searchParams.get('yarn_weight')
  const stitchPattern = searchParams.get('stitch_pattern')
  const query = searchParams.get('query')

  const where: Record<string, unknown> = {
    is_public: true,
    deleted_at: null,
    photo_url: { not: null }, // only show swatches that have photos
  }

  if (craft) where.craft_type = craft
  if (stitchPattern) {
    where.stitch_pattern = { contains: stitchPattern, mode: 'insensitive' }
  }
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { stitch_pattern: { contains: query, mode: 'insensitive' } },
    ]
  }

  // Filter by yarn weight via nested yarn relation
  if (yarnWeight) {
    where.yarns = {
      some: {
        yarn: { weight: yarnWeight },
      },
    }
  }

  const [items, total] = await Promise.all([
    prisma.swatches.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        yarns: {
          orderBy: { sort_order: 'asc' },
          include: { yarn: { include: { company: true } } },
        },
        user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
      },
    }),
    prisma.swatches.count({ where }),
  ])

  return paginatedResponse(items, total, page, limit)
})
