import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const POST = withAuth(async (_req, user, params) => {
  const id = params!.id

  const post = await prisma.posts.findFirst({ where: { id, deleted_at: null } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  // Toggle like
  const existing = await prisma.likes.findUnique({
    where: { user_id_post_id: { post_id: id, user_id: user.id } },
  })

  if (existing) {
    await prisma.likes.delete({ where: { user_id_post_id: { post_id: id, user_id: user.id } } })
    return NextResponse.json({ success: true, data: { liked: false } })
  }

  await prisma.likes.create({ data: { post_id: id, user_id: user.id } })

  // Notify post owner (don't notify yourself)
  if (post.user_id !== user.id) {
    prisma.notifications.create({
      data: {
        user_id: post.user_id,
        sender_id: user.id,
        type: 'like',
        resource_type: 'post',
        resource_id: id,
      },
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, data: { liked: true } })
})
