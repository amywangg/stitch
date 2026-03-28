import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req)

  const [items, total] = await Promise.all([
    prisma.follows.findMany({
      where: { follower_id: user.id },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        following: {
          select: { id: true, username: true, display_name: true, avatar_url: true, bio: true },
        },
      },
    }),
    prisma.follows.count({ where: { follower_id: user.id } }),
  ])

  return paginatedResponse(items.map((f) => f.following), total, page, limit)
})
