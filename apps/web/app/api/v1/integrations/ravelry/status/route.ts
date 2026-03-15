import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { decrypt } from '@/lib/encrypt'
import { RavelryClient, RavelryAuthError } from '@/lib/ravelry-client'

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const connection = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })

  // Optional: validate token health when ?validate=true is passed
  let tokenValid: boolean | null = null
  if (connection && req.nextUrl.searchParams.get('validate') === 'true') {
    try {
      const client = new RavelryClient(
        process.env.RAVELRY_CLIENT_KEY!,
        process.env.RAVELRY_CLIENT_SECRET!,
        decrypt(connection.access_token),
        decrypt(connection.token_secret),
        connection.ravelry_username,
      )
      await client.getProfile()
      tokenValid = true
    } catch (err) {
      tokenValid = false
      // Mark connection as having auth issues
      if (err instanceof RavelryAuthError) {
        await prisma.ravelry_connections.update({
          where: { user_id: user.id },
          data: { import_error: 'Ravelry session expired. Please reconnect.' },
        })
      }
    }
  }

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
      ...(tokenValid !== null ? { token_valid: tokenValid } : {}),
    },
  })
}
