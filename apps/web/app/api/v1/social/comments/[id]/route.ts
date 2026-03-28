import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const DELETE = withAuth(async (_req, user, params) => {
  const id = params!.id

  const comment = await findOwned(prisma.comments, id, user.id)
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  await prisma.comments.update({
    where: { id },
    data: { deleted_at: new Date() },
  })

  return NextResponse.json({ success: true, data: {} })
})
