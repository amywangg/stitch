import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req)

  const [items, total, unreadCount] = await Promise.all([
    prisma.notifications.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        sender: {
          select: { id: true, username: true, display_name: true, avatar_url: true },
        },
      },
    }),
    prisma.notifications.count({ where: { user_id: user.id } }),
    prisma.notifications.count({ where: { user_id: user.id, read: false } }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      items,
      total,
      unreadCount,
      page,
      pageSize: limit,
      hasMore: total > page * limit,
    },
  })
})
