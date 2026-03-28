import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
/**
 * POST /api/v1/integrations/ravelry/disconnect
 * Disconnects the user's Ravelry account.
 * Removes OAuth tokens but preserves all imported data (projects, stash, etc.).
 * The user can re-connect later and their data will re-sync.
 */
export const POST = withAuth(async (_req, user) => {
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: user.id },
  })

  if (!connection) {
    return NextResponse.json({ error: 'No Ravelry account connected' }, { status: 404 })
  }

  // Delete the connection — tokens are destroyed, imported data stays
  await prisma.ravelry_connections.delete({
    where: { user_id: user.id },
  })

  return NextResponse.json({
    success: true,
    data: { disconnected: true },
  })
})
