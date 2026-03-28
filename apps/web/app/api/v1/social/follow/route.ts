import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { userId: targetId } = body

  if (!targetId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  if (targetId === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  const target = await prisma.users.findUnique({ where: { id: targetId } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const follow = await prisma.follows.upsert({
    where: { follower_id_following_id: { follower_id: user.id, following_id: targetId } },
    update: {},
    create: { follower_id: user.id, following_id: targetId },
  })

  // Create notification for the followed user
  await prisma.notifications.create({
    data: {
      user_id: targetId,
      sender_id: user.id,
      type: 'follow',
      resource_type: 'user',
      resource_id: user.id,
      message: `${user.username} started following you`,
    },
  }).catch(() => {})

  return NextResponse.json({ success: true, data: follow }, { status: 201 })
})

export const DELETE = withAuth(async (req, user) => {
  const body = await req.json()
  const { userId: targetId } = body

  if (!targetId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  await prisma.follows.deleteMany({
    where: { follower_id: user.id, following_id: targetId },
  })

  return NextResponse.json({ success: true, data: {} })
})
