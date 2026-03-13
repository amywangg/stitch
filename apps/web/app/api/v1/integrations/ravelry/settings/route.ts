import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const connection = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
  if (!connection) return NextResponse.json({ error: 'Ravelry not connected' }, { status: 404 })

  return NextResponse.json({ success: true, data: { sync_to_ravelry: connection.sync_to_ravelry } })
}

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const connection = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
  if (!connection) return NextResponse.json({ error: 'Ravelry not connected' }, { status: 404 })

  const body = await req.json()
  if (typeof body.sync_to_ravelry !== 'boolean') {
    return NextResponse.json({ error: 'sync_to_ravelry must be a boolean' }, { status: 400 })
  }

  const updated = await prisma.ravelry_connections.update({
    where: { user_id: user.id },
    data: { sync_to_ravelry: body.sync_to_ravelry },
  })

  return NextResponse.json({ success: true, data: { sync_to_ravelry: updated.sync_to_ravelry } })
}
