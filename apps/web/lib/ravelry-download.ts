/**
 * Authenticated download of files from Ravelry.
 * Ravelry download URLs require Basic Auth or OAuth — unauthenticated fetches return 401/403.
 * Tries Basic Auth first (app-level credentials), falls back to user's OAuth tokens.
 *
 * Ravelry has two download URL patterns:
 * - /dls/{source_id}/{set_id} — may return 302→PDF (simple) or 200+HTML (multi-file interstitial)
 * - /dl/{designer}/{file_id}?filename=X.pdf — always redirects to the actual PDF on S3/CDN
 *
 * This module handles both: if the /dls/ URL returns HTML, it parses out /dl/ links and follows those.
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
  const client = await getClient(userId)

  // Try the primary URL first
  const buf = await fetchAndValidate(url, client)
  if (buf) return buf

  // If the /dls/ URL returned HTML (multi-file interstitial), parse out /dl/ links
  if (url.includes('/dls/')) {
    const directUrls = await extractDirectDownloadUrls(url, client)
    for (const dlUrl of directUrls) {
      const pdfBuf = await fetchAndValidate(dlUrl, client)
      if (pdfBuf) return pdfBuf
    }
  }

  return null
}

async function getClient(userId: string): Promise<RavelryClient> {
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: userId },
  })
  if (!connection) {
    throw new Error('Ravelry account not connected — cannot download file')
  }
  return new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )
}

async function fetchAndValidate(url: string, client: RavelryClient): Promise<Buffer | null> {
  // Try Basic Auth first (faster, no per-user signing)
  const basicUsername = process.env.RAVELRY_BASIC_USERNAME
  const basicPassword = process.env.RAVELRY_BASIC_PASSWORD
  if (basicUsername && basicPassword) {
    const buf = await fetchWithBasicAuth(url, basicUsername, basicPassword)
    const pdf = validatePdf(buf)
    if (pdf) return pdf
  }

  // Fall back to OAuth
  const buf = await client.fetchBinary(url)
  return validatePdf(buf)
}

/**
 * When a /dls/ URL returns an HTML page (multi-file download set),
 * parse out the direct /dl/ links that point to individual PDF files.
 */
async function extractDirectDownloadUrls(dlsUrl: string, client: RavelryClient): Promise<string[]> {
  try {
    const buf = await client.fetchBinary(dlsUrl)
    if (!buf) return []

    const html = buf.toString('utf-8')
    // Skip if it's already a PDF (shouldn't happen here, but safety check)
    if (html.startsWith('%PDF')) return []

    // Extract /dl/ URLs that point to PDF files
    const matches = html.match(/href="(https?:\/\/www\.ravelry\.com\/dl\/[^"]*\.pdf[^"]*)"/gi) ?? []
    return matches.map(m => {
      const match = m.match(/href="([^"]*)"/)
      return match?.[1] ?? ''
    }).filter(Boolean)
  } catch {
    return []
  }
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

function validatePdf(buf: Buffer | null): Buffer | null {
  if (!buf) return null
  if (buf.length < 100) return null
  if (buf.slice(0, 4).toString() !== '%PDF') return null
  return buf
}
