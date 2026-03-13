import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const connection = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })

  return NextResponse.json({
    success: true,
    data: {
      connected: !!connection,
      ravelry_username: connection?.ravelry_username ?? null,
      synced_at: connection?.synced_at ?? null,
      import_status: connection?.import_status ?? null,
      import_stats: connection?.import_stats ?? null,
      import_error: connection?.import_error ?? null,
      sync_to_ravelry: connection?.sync_to_ravelry ?? false,
    },
  })
}
