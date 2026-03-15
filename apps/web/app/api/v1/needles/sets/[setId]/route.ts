import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ setId: string }> }

/**
 * DELETE /api/v1/needles/sets/[setId]
 * Deletes all needles belonging to a tool set for the current user.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const { setId } = await params

  const count = await prisma.user_needles.count({
    where: { tool_set_id: setId, user_id: user.id },
  })

  if (count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.user_needles.deleteMany({
    where: { tool_set_id: setId, user_id: user.id },
  })

  return NextResponse.json({ success: true, data: { deleted: count } })
}
