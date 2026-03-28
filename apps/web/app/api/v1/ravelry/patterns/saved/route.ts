import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/ravelry/patterns/saved
 * List user's saved Ravelry pattern snapshots.
 *
 * Query params: weight, craft, page, page_size
 */
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req)
  const { searchParams } = new URL(req.url)

  const where: Record<string, unknown> = { user_id: user.id }
  if (searchParams.get('weight')) where.weight = searchParams.get('weight')
  if (searchParams.get('craft')) where.craft = searchParams.get('craft')

  const [items, total] = await Promise.all([
    prisma.saved_patterns.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.saved_patterns.count({ where }),
  ])

  return paginatedResponse(items, total, page, limit)
})
