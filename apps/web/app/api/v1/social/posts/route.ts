import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePro } from '@/lib/pro-gate'
import { withAuth } from '@/lib/route-helpers'
import { moderatePostContent } from '@/lib/moderation'


export const dynamic = 'force-dynamic'
export const POST = withAuth(async (req, user) => {
  // Social posting requires Pro
  const proError = requirePro(user, 'social posting')
  if (proError) return proError

  const body = await req.json()
  const content = body.content?.trim()
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: 'Post content is too long (max 2000 characters)' }, { status: 400 })
  }

  // Content moderation — checks NSFW, political, off-topic
  const moderation = await moderatePostContent(content)
  if (!moderation.safe) {
    return NextResponse.json(
      {
        error: 'CONTENT_REJECTED',
        message: moderation.reason ?? 'This post doesn\'t appear to be related to fibre arts or crafting.',
      },
      { status: 422 }
    )
  }

  // Support multiple photo URLs
  const photoUrls: string[] = body.photo_urls ?? (body.image_url ? [body.image_url] : [])

  // Optional tagged yarns
  const taggedYarns: Array<{ yarn_name: string; colorway?: string; weight?: string; stash_id?: string }> =
    body.yarns ?? []

  const post = await prisma.posts.create({
    data: {
      user_id: user.id,
      content,
      project_id: body.project_id ?? null,
      pattern_id: body.pattern_id ?? null,
      session_minutes: body.session_minutes ? parseInt(body.session_minutes) : null,
      session_rows: body.session_rows ? parseInt(body.session_rows) : null,
      ...(photoUrls.length > 0 ? {
        photos: {
          create: photoUrls.map((url: string, i: number) => ({
            url,
            sort_order: i,
          })),
        },
      } : {}),
      ...(taggedYarns.length > 0 ? {
        yarns: {
          create: taggedYarns.map((y: any) => ({
            yarn_name: y.yarn_name,
            colorway: y.colorway ?? null,
            weight: y.weight ?? null,
            stash_id: y.stash_id ?? null,
          })),
        },
      } : {}),
    },
    include: {
      user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
      photos: { orderBy: { sort_order: 'asc' } },
      project: { select: { id: true, title: true, slug: true } },
      pattern: { select: { id: true, title: true, slug: true, cover_image_url: true } },
      yarns: true,
      _count: { select: { likes: true, comments: true } },
    },
  })

  // Notify followers about the new post (non-blocking)
  prisma.follows.findMany({
    where: { following_id: user.id },
    select: { follower_id: true },
  }).then(async (followers) => {
    if (followers.length === 0) return
    const notifications = followers.map((f) => ({
      user_id: f.follower_id,
      sender_id: user.id,
      type: 'new_post',
      resource_type: 'post',
      resource_id: post.id,
      message: `${user.username} shared a new post`,
    }))
    await prisma.notifications.createMany({ data: notifications }).catch(() => {})
  }).catch(() => {})

  return NextResponse.json({ success: true, data: post }, { status: 201 })
})
