import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { decrypt } from '@/lib/encrypt'
import { RavelryClient, RavelryAuthError } from '@/lib/ravelry-client'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
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
      // Only mark as invalid for actual auth errors
      if (err instanceof RavelryAuthError) {
        tokenValid = false
        console.error('[ravelry-status] Auth error:', (err as Error).message)
      } else {
        // Network error, timeout, etc. — don't mark tokens as invalid
        // Return null so the UI doesn't show "expired"
        tokenValid = null
        console.warn('[ravelry-status] Non-auth validation error:', (err as Error).message)
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
})
