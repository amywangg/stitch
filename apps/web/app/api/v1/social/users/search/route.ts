import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20')

  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const users = await prisma.users.findMany({
    where: {
      id: { not: user.id },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { display_name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
      bio: true,
      followers: { where: { follower_id: user.id }, take: 1 },
    },
    take: limit,
  })

  return NextResponse.json({
    success: true,
    data: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      isFollowing: u.followers.length > 0,
    })),
  })
})
