import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const post = await prisma.posts.findFirst({
    where: { id: params.id, deleted_at: null },
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

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const post = await prisma.posts.findFirst({ where: { id: params.id, deleted_at: null } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  await prisma.posts.update({ where: { id: params.id }, data: { deleted_at: new Date() } })
  return NextResponse.json({ success: true, message: 'Post deleted' })
}
