/**
 * Auto-fetch a cover image for a pattern by searching Ravelry.
 * Best-effort — never throws, never blocks the main flow.
 */

import { prisma } from '@/lib/prisma'

const RAVELRY_BASE = 'https://api.ravelry.com'

interface RavelryPhoto {
  medium_url?: string
  medium2_url?: string
  small_url?: string
  square_url?: string
}

/**
 * Search Ravelry for a pattern by title + designer and return the best photo URL.
 * Uses Basic Auth credentials if available. Returns null if nothing found.
 */
export async function findCoverImageUrl(
  title: string,
  designer?: string | null,
): Promise<string | null> {
  const username = process.env.RAVELRY_BASIC_USERNAME
  const password = process.env.RAVELRY_BASIC_PASSWORD

  if (!username || !password) return null

  const auth = Buffer.from(`${username}:${password}`).toString('base64')

  // Search by title + designer for a precise match
  const query = designer ? `${title} ${designer}` : title
  const url = new URL(`${RAVELRY_BASE}/patterns/search.json`)
  url.searchParams.set('query', query)
  url.searchParams.set('photo', 'yes')
  url.searchParams.set('page_size', '5')
  url.searchParams.set('sort', 'best')

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    })

    if (!res.ok) return null

    const data = (await res.json()) as {
      patterns: Array<{
        name: string
        designer?: { name: string } | null
        first_photo?: RavelryPhoto | null
        photos?: RavelryPhoto[]
      }>
    }

    if (!data.patterns?.length) return null

    // Try to find an exact title match first
    const titleLower = title.toLowerCase().trim()
    const exactMatch = data.patterns.find(
      (p) => p.name.toLowerCase().trim() === titleLower,
    )
    const best = exactMatch ?? data.patterns[0]

    const photo = best.first_photo
    return photo?.medium2_url ?? photo?.medium_url ?? photo?.small_url ?? null
  } catch {
    return null
  }
}

/**
 * Auto-fetch and set cover image for a pattern.
 * Runs in the background — does not block the caller.
 * Updates the pattern record directly if a cover is found.
 */
export async function autoFetchCoverImage(
  patternId: string,
  title: string,
  designer?: string | null,
): Promise<void> {
  try {
    const coverUrl = await findCoverImageUrl(title, designer)
    if (!coverUrl) return

    await prisma.patterns.update({
      where: { id: patternId },
      data: { cover_image_url: coverUrl },
    })
  } catch {
    // Best-effort — swallow errors
  }
}
