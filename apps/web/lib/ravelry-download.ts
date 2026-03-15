/**
 * Authenticated download of files from Ravelry.
 * Ravelry download URLs require Basic Auth or OAuth — unauthenticated fetches return 401/403.
 * Tries Basic Auth first (app-level credentials), falls back to user's OAuth tokens.
 */

import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { RavelryClient } from '@/lib/ravelry-client'

/**
 * Fetch a file from a Ravelry download URL with proper authentication.
 * Returns a Buffer if the download is a valid PDF, or null if the file isn't a PDF.
 * Throws on network/auth errors.
 */
export async function fetchRavelryDownload(url: string, userId: string): Promise<Buffer | null> {
  // Try Basic Auth first (faster, no DB lookup)
  const basicUsername = process.env.RAVELRY_BASIC_USERNAME
  const basicPassword = process.env.RAVELRY_BASIC_PASSWORD

  if (basicUsername && basicPassword) {
    const buf = await fetchWithBasicAuth(url, basicUsername, basicPassword)
    if (buf) return validatePdf(buf)
  }

  // Fall back to user's OAuth credentials
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: userId },
  })

  if (!connection) {
    throw new Error('Ravelry account not connected — cannot download file')
  }

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  const buf = await fetchWithOAuth(url, client)
  if (buf) return validatePdf(buf)

  return null
}

async function fetchWithBasicAuth(url: string, username: string, password: string): Promise<Buffer | null> {
  const auth = Buffer.from(`${username}:${password}`).toString('base64')

  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      Authorization: `Basic ${auth}`,
      'User-Agent': 'Stitch/1.0',
    },
  })

  if (!res.ok) return null

  const arrayBuf = await res.arrayBuffer()
  return Buffer.from(arrayBuf)
}

async function fetchWithOAuth(url: string, client: RavelryClient): Promise<Buffer | null> {
  // Use the client's OAuth signing for the download URL
  // We need to access the private buildAuthHeader — use fetchAuthenticated instead
  const buf = await client.fetchBinary(url)
  return buf
}

function validatePdf(buf: Buffer): Buffer | null {
  if (buf.length < 100) return null
  if (buf.slice(0, 4).toString() !== '%PDF') return null
  return buf
}
