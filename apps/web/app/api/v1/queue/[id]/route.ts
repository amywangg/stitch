import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { getRavelryClient } from '@/lib/ravelry-client'
import { ravelryRemoveFromQueue } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
export const DELETE = withAuth(async (_req, user, params) => {
  const id = params!.id

  const item = await findOwned<any>(prisma.pattern_queue, id, user.id, { softDelete: false })
  if (!item) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })

  await prisma.pattern_queue.delete({ where: { id } })

  // Remove from Ravelry queue (non-blocking)
  if (item.ravelry_queue_id) {
    getRavelryClient(user.id).then(async (client) => {
      if (!client) return
      const conn = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
      if (!conn) return
      await ravelryRemoveFromQueue(client, conn.ravelry_username, item.ravelry_queue_id)
    }).catch(err => console.error('[ravelry-push] queue delete:', err))
  }

  return NextResponse.json({ success: true, data: {} })
})
