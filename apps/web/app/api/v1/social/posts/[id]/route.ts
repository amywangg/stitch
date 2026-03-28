import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.posts.findFirst({
    where: { id, deleted_at: null },
    include: {
      user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
      comments: {
        where: { deleted_at: null },
        include: { user: { select: { id: true, username: true, avatar_url: true } } },
        orderBy: { created_at: 'asc' },
      },
      _count: { select: { likes: true } },
    },
  })

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: post })
}

export const DELETE = withAuth(async (_req, user, params) => {
  const { id } = params!
  const post = await prisma.posts.findFirst({ where: { id, deleted_at: null } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  await prisma.posts.update({ where: { id }, data: { deleted_at: new Date() } })
  return NextResponse.json({ success: true, data: {} })
})
