import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const { id } = await params

  const needle = await prisma.user_needles.findFirst({
    where: { id, user_id: user.id },
  })
  if (!needle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.user_needles.delete({ where: { id } })

  return NextResponse.json({ success: true, data: { deleted: true } })
}
