import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const PATCH = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}))
  const { ids } = body as { ids?: string[] }

  if (ids && Array.isArray(ids)) {
    // Mark specific notifications as read
    await prisma.notifications.updateMany({
      where: { id: { in: ids }, user_id: user.id },
      data: { read: true },
    })
  } else {
    // Mark all as read
    await prisma.notifications.updateMany({
      where: { user_id: user.id, read: false },
      data: { read: true },
    })
  }

  return NextResponse.json({ success: true, data: {} })
})
