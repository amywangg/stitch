import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20')

  const [items, total] = await Promise.all([
    prisma.follows.findMany({
      where: { following_id: user.id },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        follower: {
          select: { id: true, username: true, display_name: true, avatar_url: true, bio: true },
        },
      },
    }),
    prisma.follows.count({ where: { following_id: user.id } }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      items: items.map((f) => f.follower),
      total,
      page,
      pageSize: limit,
      hasMore: total > page * limit,
    },
  })
}
