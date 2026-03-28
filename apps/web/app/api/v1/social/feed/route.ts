import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req)
  const feedType = req.nextUrl.searchParams.get('type') // 'social' | 'activity' | null (both)

  // Get IDs of people the user follows
  const following = await prisma.follows.findMany({
    where: { follower_id: user.id },
    select: { following_id: true },
  })
  const followingIds = following.map((f) => f.following_id)
  const allFeedUserIds = [user.id, ...followingIds]

  // Activity feed: show from everyone the user follows (+ self)
  const activityFeedIds = allFeedUserIds

  const userSelect = { id: true, username: true, display_name: true, avatar_url: true }

  // Build queries based on feed type
  const includePosts = feedType !== 'activity'
  const includeActivity = feedType !== 'social'

  const [posts, postTotal, activities, activityTotal] = await Promise.all([
    includePosts
      ? prisma.posts.findMany({
          where: { user_id: { in: allFeedUserIds }, deleted_at: null },
          orderBy: { created_at: 'desc' },
          take: limit + skip,
          include: {
            user: { select: userSelect },
            photos: { orderBy: { sort_order: 'asc' } },
            project: { select: { id: true, title: true, slug: true } },
            pattern: { select: { id: true, title: true, slug: true, cover_image_url: true } },
            yarns: true,
            _count: { select: { likes: true, comments: { where: { deleted_at: null } } } },
            likes: { where: { user_id: user.id }, take: 1 },
          },
        })
      : [],
    includePosts
      ? prisma.posts.count({ where: { user_id: { in: allFeedUserIds }, deleted_at: null } })
      : 0,
    includeActivity
      ? prisma.activity_events.findMany({
          where: { user_id: { in: activityFeedIds } },
          orderBy: { created_at: 'desc' },
          take: limit + skip,
          include: {
            user: { select: userSelect },
            project: {
              select: {
                id: true, title: true, slug: true, status: true, craft_type: true,
                photos: { orderBy: { sort_order: 'asc' }, take: 1 },
              },
            },
            pattern: {
              select: { id: true, title: true, slug: true, cover_image_url: true, designer_name: true },
            },
            _count: { select: { likes: true, comments: { where: { deleted_at: null } } } },
            likes: { where: { user_id: user.id }, take: 1 },
          },
        })
      : [],
    includeActivity
      ? prisma.activity_events.count({ where: { user_id: { in: activityFeedIds } } })
      : 0,
  ])

  // Merge by created_at desc
  type FeedItem = {
    kind: 'post' | 'activity'
    id: string
    createdAt: Date
    post?: (typeof posts)[number] & { isLiked: boolean }
    activity?: (typeof activities)[number] & { isLiked: boolean }
  }

  const merged: FeedItem[] = [
    ...posts.map((p) => ({
      kind: 'post' as const,
      id: p.id,
      createdAt: p.created_at,
      post: { ...p, isLiked: p.likes.length > 0 },
    })),
    ...activities.map((a) => ({
      kind: 'activity' as const,
      id: a.id,
      createdAt: a.created_at,
      activity: { ...a, isLiked: a.likes.length > 0 },
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(skip, skip + limit)

  const total = postTotal + activityTotal

  return paginatedResponse(merged, total, page, limit)
})
