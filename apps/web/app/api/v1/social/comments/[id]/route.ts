import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const comment = await prisma.comments.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
  })
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  await prisma.comments.update({
    where: { id },
    data: { deleted_at: new Date() },
  })

  return NextResponse.json({ success: true, data: {} })
}
