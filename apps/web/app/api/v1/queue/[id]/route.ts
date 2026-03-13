import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPushClient, pushToRavelry } from '@/lib/ravelry-push'

type Params = { params: { id: string } }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const item = await prisma.pattern_queue.findFirst({ where: { id: params.id, user_id: user.id } })
  if (!item) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })

  await prisma.pattern_queue.delete({ where: { id: params.id } })

  // Ravelry write-back
  if (item.ravelry_queue_id) {
    const push = await getRavelryPushClient(user.id)
    if (push) {
      pushToRavelry(() => push.client.removeFromQueue(item.ravelry_queue_id!))
    }
  }

  return NextResponse.json({ success: true, message: 'Queue item removed' })
}
