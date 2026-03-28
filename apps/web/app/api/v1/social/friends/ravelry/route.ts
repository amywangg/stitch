import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { decrypt } from '@/lib/encrypt'
import { RavelryClient } from '@/lib/ravelry-client'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (_req, user) => {
  const connection = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
  if (!connection) {
    return NextResponse.json({ error: 'Ravelry not connected' }, { status: 400 })
  }

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  // Fetch all friends from Ravelry (paginated)
  const allFriends: Array<{ friend_username: string; friend_avatar: { tiny_photo_url: string | null; photo_url: string | null } | null }> = []
  try {
    let page = 1
    let pageCount = 1
    while (page <= pageCount) {
      const res = await client.listFriends(page)
      if (!res?.friendships) break
      allFriends.push(...res.friendships)
      pageCount = res.paginator?.page_count ?? 0
      page++
    }
  } catch (err) {
    // Friends endpoint may 302 for empty accounts — return empty list
    console.warn('[ravelry-friends] Failed to fetch friends list:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: true, data: { onStitch: [], notOnStitch: [] } })
  }

  // Cross-reference against ravelry_connections
  const ravelryUsernames = allFriends.map((f) => f.friend_username)
  const matchedConnections =
    ravelryUsernames.length > 0
      ? await prisma.ravelry_connections.findMany({
          where: { ravelry_username: { in: ravelryUsernames } },
          select: {
            user_id: true,
            ravelry_username: true,
            user: {
              select: { id: true, username: true, display_name: true, avatar_url: true },
            },
          },
        })
      : []

  const matchedUsernames = new Set(matchedConnections.map((c) => c.ravelry_username))

  // Check which matched users the current user already follows
  const matchedUserIds = matchedConnections.map((c) => c.user_id).filter((id) => id !== user.id)
  const existingFollows =
    matchedUserIds.length > 0
      ? await prisma.follows.findMany({
          where: { follower_id: user.id, following_id: { in: matchedUserIds } },
          select: { following_id: true },
        })
      : []
  const followingSet = new Set(existingFollows.map((f) => f.following_id))

  const onStitch = matchedConnections
    .filter((c) => c.user_id !== user.id)
    .map((c) => ({
      user: c.user,
      isFollowing: followingSet.has(c.user_id),
      ravelryUsername: c.ravelry_username,
    }))

  const notOnStitch = allFriends
    .filter((f) => !matchedUsernames.has(f.friend_username))
    .map((f) => ({
      ravelryUsername: f.friend_username,
      photoUrl: f.friend_avatar?.photo_url ?? f.friend_avatar?.tiny_photo_url ?? null,
    }))

  return NextResponse.json({
    success: true,
    data: { onStitch, notOnStitch },
  })
})
