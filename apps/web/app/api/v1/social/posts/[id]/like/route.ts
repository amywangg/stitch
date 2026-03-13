import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const post = await prisma.posts.findFirst({ where: { id: params.id, deleted_at: null } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  // Toggle like
  const existing = await prisma.likes.findUnique({
    where: { post_id_user_id: { post_id: params.id, user_id: user.id } },
  })

  if (existing) {
    await prisma.likes.delete({ where: { post_id_user_id: { post_id: params.id, user_id: user.id } } })
    return NextResponse.json({ success: true, data: { liked: false } })
  }

  await prisma.likes.create({ data: { post_id: params.id, user_id: user.id } })
  return NextResponse.json({ success: true, data: { liked: true } })
}
