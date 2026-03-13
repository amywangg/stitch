import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const activity = await prisma.activity_events.findUnique({ where: { id: params.id } })
  if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })

  // Toggle like (using composite unique: user_id + activity_event_id + reaction)
  const existing = await prisma.likes.findFirst({
    where: { user_id: user.id, activity_event_id: params.id, reaction: null },
  })

  if (existing) {
    await prisma.likes.delete({ where: { id: existing.id } })
    return NextResponse.json({ success: true, data: { liked: false } })
  }

  await prisma.likes.create({
    data: { user_id: user.id, activity_event_id: params.id },
  })

  // Notify the activity owner (if not self)
  if (activity.user_id !== user.id) {
    await prisma.notifications.create({
      data: {
        user_id: activity.user_id,
        sender_id: user.id,
        type: 'like',
        resource_type: 'activity_event',
        resource_id: params.id,
      },
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, data: { liked: true } })
}
