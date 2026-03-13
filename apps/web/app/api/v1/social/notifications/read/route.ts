import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
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
}
