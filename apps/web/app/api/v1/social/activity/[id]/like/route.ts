import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const POST = withAuth(async (_req, user, params) => {
  const id = params!.id

  const activity = await prisma.activity_events.findUnique({ where: { id } })
  if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })

  // Toggle like (using composite unique: user_id + activity_event_id + reaction)
  const existing = await prisma.likes.findFirst({
    where: { user_id: user.id, activity_event_id: id, reaction: null },
  })

  if (existing) {
    await prisma.likes.delete({ where: { id: existing.id } })
    return NextResponse.json({ success: true, data: { liked: false } })
  }

  await prisma.likes.create({
    data: { user_id: user.id, activity_event_id: id },
  })

  // Notify the activity owner (if not self)
  if (activity.user_id !== user.id) {
    await prisma.notifications.create({
      data: {
        user_id: activity.user_id,
        sender_id: user.id,
        type: 'like',
        resource_type: 'activity_event',
        resource_id: id,
      },
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, data: { liked: true } })
})
