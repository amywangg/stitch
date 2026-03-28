import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req)

  const [items, total] = await Promise.all([
    prisma.follows.findMany({
      where: { following_id: user.id },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        follower: {
          select: { id: true, username: true, display_name: true, avatar_url: true, bio: true },
        },
      },
    }),
    prisma.follows.count({ where: { following_id: user.id } }),
  ])

  // Check which followers the user follows back
  const followerIds = items.map((f) => f.follower_id)
  const followBacks = followerIds.length > 0
    ? await prisma.follows.findMany({
        where: { follower_id: user.id, following_id: { in: followerIds } },
        select: { following_id: true },
      })
    : []
  const followBackSet = new Set(followBacks.map((f) => f.following_id))

  return paginatedResponse(
    items.map((f) => ({
      ...f.follower,
      isFollowing: followBackSet.has(f.follower_id),
    })),
    total,
    page,
    limit
  )
})
