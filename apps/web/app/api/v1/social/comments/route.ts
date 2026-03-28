import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePro } from '@/lib/pro-gate'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, _user) => {
  const postId = req.nextUrl.searchParams.get('postId')
  const activityEventId = req.nextUrl.searchParams.get('activityEventId')
  const { page, limit, skip } = parsePagination(req, 50, 50)

  if (!postId && !activityEventId) {
    return NextResponse.json({ error: 'postId or activityEventId is required' }, { status: 400 })
  }

  const where = {
    deleted_at: null,
    ...(postId ? { post_id: postId } : { activity_event_id: activityEventId }),
  }

  const [comments, total] = await Promise.all([
    prisma.comments.findMany({
      where,
      orderBy: { created_at: 'asc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
      },
    }),
    prisma.comments.count({ where }),
  ])

  return paginatedResponse(comments, total, page, limit)
})

export const POST = withAuth(async (req, user) => {
  const proErr = requirePro(user, 'commenting')
  if (proErr) return proErr

  const body = await req.json()
  const { content, postId, activityEventId } = body

  if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  if (!postId && !activityEventId) {
    return NextResponse.json({ error: 'postId or activityEventId is required' }, { status: 400 })
  }
  if (postId && activityEventId) {
    return NextResponse.json({ error: 'Provide only one of postId or activityEventId' }, { status: 400 })
  }

  // Validate parent exists
  if (postId) {
    const post = await prisma.posts.findFirst({ where: { id: postId, deleted_at: null } })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
  if (activityEventId) {
    const activity = await prisma.activity_events.findUnique({ where: { id: activityEventId } })
    if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  const comment = await prisma.comments.create({
    data: {
      user_id: user.id,
      content: content.trim(),
      post_id: postId ?? null,
      activity_event_id: activityEventId ?? null,
    },
    include: {
      user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
    },
  })

  // Notify parent owner
  const parentOwnerId = postId
    ? (await prisma.posts.findUnique({ where: { id: postId }, select: { user_id: true } }))?.user_id
    : (await prisma.activity_events.findUnique({ where: { id: activityEventId }, select: { user_id: true } }))?.user_id

  if (parentOwnerId && parentOwnerId !== user.id) {
    await prisma.notifications.create({
      data: {
        user_id: parentOwnerId,
        sender_id: user.id,
        type: 'comment',
        resource_type: postId ? 'post' : 'activity_event',
        resource_id: postId ?? activityEventId!,
      },
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, data: comment }, { status: 201 })
})
