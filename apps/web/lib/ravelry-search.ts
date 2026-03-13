/**
 * Ravelry pattern search — server-side only.
 * Uses Basic Auth (personal key) if configured, falls back to user's OAuth token.
 * Never store search results — just proxy them.
 */

import { RavelryClient } from '@/lib/ravelry-client'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'

const BASE_URL = 'https://api.ravelry.com'

export interface RavelrySearchResult {
  id: number
  name: string
  permalink: string
  designer: { name: string } | null
  craft: { name: string } | null
  pattern_type: { name: string } | null
  difficulty_average: number | null
  rating_average: number | null
  yardage_max: number | null
  yardage: number | null
  gauge: string | null
  gauge_divisor: number | null
  gauge_description: string | null
  yarn_weight: { name: string } | null
  yarn_weight_description: string | null
  free: boolean
  photos: Array<{
    medium_url: string
    small_url: string
    square_url: string
  }>
  first_photo: {
    medium_url: string
    small_url: string
    square_url: string
  } | null
}

export interface SearchParams {
  query?: string
  craft?: 'knitting' | 'crochet'
  weight?: string
  yardage_min?: number
  yardage_max?: number
  fit?: string // e.g. "adult", "baby", "child"
  pc?: string  // pattern category: "sweater", "socks", "hat", etc.
  pa?: string  // pattern author/designer name
  availability?: 'free' | 'ravelry' | 'online'
  diff?: string // difficulty range e.g. "1-3" for beginner
  needles?: string // needle size e.g. "US7", "4.5mm"
  colors?: string  // number of colors e.g. "1", "2", "3+"
  language?: string // pattern language e.g. "en", "fr"
  photo?: 'yes'    // only patterns with photos
  sort?: string
  page?: number
  page_size?: number
}

function buildSearchQueryParams(params: SearchParams): Record<string, string | number> {
  const qs: Record<string, string | number> = {}

  if (params.query) qs.query = params.query
  if (params.craft) qs.craft = params.craft
  if (params.weight) qs.weight = params.weight
  if (params.yardage_min && params.yardage_max) {
    qs.yardage = `${params.yardage_min}-${params.yardage_max}`
  } else if (params.yardage_max) {
    qs.yardage = `-${params.yardage_max}`
  } else if (params.yardage_min) {
    qs.yardage = `${params.yardage_min}-`
  }
  if (params.fit) qs.fit = params.fit
  if (params.pc) qs.pc = params.pc
  if (params.pa) qs.pa = params.pa
  if (params.availability) qs.availability = params.availability
  if (params.diff) qs.diff = params.diff
  if (params.needles) qs.needles = params.needles
  if (params.colors) qs.colors = params.colors
  if (params.language) qs.language = params.language
  if (params.photo) qs.photo = params.photo
  qs.sort = params.sort ?? 'best'
  qs.page = params.page ?? 1
  qs.page_size = Math.min(params.page_size ?? 20, 100)

  return qs
}

function mapPatternResults(patterns: RavelrySearchResult[]) {
  return patterns.map(p => ({
    ravelry_id: p.id,
    name: p.name,
    permalink: p.permalink,
    craft: p.craft?.name?.toLowerCase() ?? 'knitting',
    weight: p.yarn_weight?.name?.toLowerCase() ?? null,
    yardage_min: p.yardage ?? null,
    yardage_max: p.yardage_max ?? null,
    gauge: p.gauge_description ?? null,
    difficulty: p.difficulty_average ? Math.round(p.difficulty_average * 10) / 10 : null,
    rating: p.rating_average ? Math.round(p.rating_average * 10) / 10 : null,
    photo_url: p.first_photo?.medium_url ?? null,
    designer: p.designer?.name ?? null,
    free: p.free ?? false,
  }))
}

/** Try Basic Auth first, fall back to user's OAuth token */
export async function searchRavelryPatterns(params: SearchParams, userId: string) {
  const basicUsername = process.env.RAVELRY_BASIC_USERNAME
  const basicPassword = process.env.RAVELRY_BASIC_PASSWORD

  if (basicUsername && basicPassword) {
    return searchViaBasicAuth(params, basicUsername, basicPassword)
  }

  // Fallback: use user's OAuth token
  return searchViaOAuth(params, userId)
}

async function searchViaBasicAuth(params: SearchParams, username: string, password: string) {
  const auth = Buffer.from(`${username}:${password}`).toString('base64')
  const url = new URL(`${BASE_URL}/patterns/search.json`)

  const qs = buildSearchQueryParams(params)
  for (const [key, val] of Object.entries(qs)) {
    url.searchParams.set(key, String(val))
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[ravelry-search] Basic Auth failed:', res.status, body)
    throw new Error(`Ravelry search failed: ${res.status}`)
  }

  const data = await res.json() as {
    patterns: RavelrySearchResult[]
    paginator: { results: number; page: number; page_count: number; page_size: number }
  }

  return { patterns: mapPatternResults(data.patterns), paginator: data.paginator }
}

async function searchViaOAuth(params: SearchParams, userId: string) {
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: userId },
  })
  if (!connection) {
    throw new Error('Connect your Ravelry account to search patterns')
  }

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  const qs = buildSearchQueryParams(params)
  const data = await client.searchPatterns(qs)

  return {
    patterns: mapPatternResults(data.patterns as unknown as RavelrySearchResult[]),
    paginator: data.paginator,
  }
}

export async function getRavelryPatternDetail(patternId: number, userId: string) {
  const basicUsername = process.env.RAVELRY_BASIC_USERNAME
  const basicPassword = process.env.RAVELRY_BASIC_PASSWORD

  if (basicUsername && basicPassword) {
    return getDetailViaBasicAuth(patternId, basicUsername, basicPassword)
  }

  return getDetailViaOAuth(patternId, userId)
}

async function getDetailViaBasicAuth(patternId: number, username: string, password: string) {
  const auth = Buffer.from(`${username}:${password}`).toString('base64')

  const res = await fetch(`${BASE_URL}/patterns/${patternId}.json`, {
    headers: { Authorization: `Basic ${auth}` },
  })

  if (!res.ok) {
    throw new Error(`Ravelry pattern fetch failed: ${res.status}`)
  }

  return mapPatternDetail(await res.json())
}

async function getDetailViaOAuth(patternId: number, userId: string) {
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: userId },
  })
  if (!connection) {
    throw new Error('Connect your Ravelry account to view pattern details')
  }

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  const data = await client.fetchPatternDetail(patternId)
  return mapPatternDetail(data)
}

function mapPatternDetail(data: Record<string, unknown>) {
  const p = (data as { pattern: Record<string, unknown> }).pattern

  const photos = (p.photos as Array<{ medium_url?: string; medium2_url?: string; small_url?: string }> | null) ?? []

  return {
    ravelry_id: p.id as number,
    name: p.name as string,
    permalink: p.permalink as string,
    url: `https://www.ravelry.com/patterns/library/${p.permalink as string}`,
    craft: ((p.craft as { name: string } | null)?.name?.toLowerCase() ?? 'knitting'),
    weight: ((p.yarn_weight as { name: string } | null)?.name?.toLowerCase() ?? null),
    yardage_min: (p.yardage as number | null) ?? null,
    yardage_max: (p.yardage_max as number | null) ?? null,
    gauge: (p.gauge_description as string | null) ?? null,
    needle_sizes: ((p.pattern_needle_sizes ?? []) as Array<{ us: string | null; metric: string | null; name: string | null }>).map(
      n => n.name ?? (n.us ? `US ${n.us}` : `${n.metric}mm`)
    ),
    difficulty: (p.difficulty_average as number | null) ? Math.round((p.difficulty_average as number) * 10) / 10 : null,
    rating: (p.rating_average as number | null) ? Math.round((p.rating_average as number) * 10) / 10 : null,
    rating_count: (p.rating_count as number | null) ?? 0,
    photo_url: photos[0]?.medium2_url ?? photos[0]?.medium_url ?? null,
    photos: photos.map(ph => ph.medium2_url ?? ph.medium_url ?? ph.small_url ?? '').filter(Boolean),
    designer: ((p.pattern_author as { name: string } | null)?.name ?? null),
    free: (p.free as boolean) ?? false,
    notes_html: (p.notes_html as string | null) ?? null,
    notes: (p.notes as string | null) ?? null,
    download_location: p.download_location as { url: string; type: string; free: boolean } | null,
    sizes_available: (p.sizes_available as string | null) ?? null,
    pattern_categories: ((p.pattern_categories as Array<{ name: string }> | null) ?? []).map(c => c.name),
    packs: ((p.packs as Array<{
      yarn?: { name: string; permalink: string; yarn_company?: { name: string } }
      skeins?: number | null
      total_grams?: number | null
      total_yards?: number | null
    }> | null) ?? []).map(pack => ({
      yarn_name: pack.yarn?.name ?? null,
      yarn_company: pack.yarn?.yarn_company?.name ?? null,
      skeins: pack.skeins ?? null,
      total_yards: pack.total_yards ?? null,
    })),
  }
}
