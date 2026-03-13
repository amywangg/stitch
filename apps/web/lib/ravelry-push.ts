import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { RavelryClient } from '@/lib/ravelry-client'

/**
 * Returns a ready RavelryClient + username if the user has sync_to_ravelry=true
 * and a valid connection. Otherwise returns null.
 */
export async function getRavelryPushClient(
  userId: string,
): Promise<{ client: RavelryClient; username: string } | null> {
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: userId },
  })
  if (!connection || !connection.sync_to_ravelry) return null

  const clientKey = process.env.RAVELRY_CLIENT_KEY
  const clientSecret = process.env.RAVELRY_CLIENT_SECRET
  if (!clientKey || !clientSecret) return null

  const client = new RavelryClient(
    clientKey,
    clientSecret,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  return { client, username: connection.ravelry_username }
}

/**
 * Returns a ready RavelryClient if the user has a Ravelry connection (any).
 * Does NOT require sync_to_ravelry — use for read-only operations.
 */
export async function getRavelryClient(
  userId: string,
): Promise<RavelryClient | null> {
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: userId },
  })
  if (!connection) return null

  const clientKey = process.env.RAVELRY_CLIENT_KEY
  const clientSecret = process.env.RAVELRY_CLIENT_SECRET
  if (!clientKey || !clientSecret) return null

  return new RavelryClient(
    clientKey,
    clientSecret,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )
}

/**
 * Runs fn in the background; swallows all errors (fire-and-forget).
 */
export function pushToRavelry(fn: () => Promise<void>): void {
  fn().catch(err => console.error('[ravelry-push]', err))
}
