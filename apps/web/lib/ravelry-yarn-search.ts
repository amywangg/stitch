/**
 * Ravelry yarn search — server-side only.
 * Uses Basic Auth (read-only personal key) for public yarn data.
 * Falls back to user's OAuth token if Basic Auth not configured.
 * Never store search results — just proxy them.
 */

import { RavelryClient } from '@/lib/ravelry-client'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'

const BASE_URL = 'https://api.ravelry.com'

export interface RavelryYarnResult {
  id: number
  name: string
  permalink: string
  yarn_company_name: string
  yarn_company_id: number
  discontinued: boolean
  machine_washable: boolean
  grams: number | null
  yardage: number | null
  wpi: number | null
  min_gauge: number | null
  max_gauge: number | null
  gauge_divisor: number | null
  texture: string | null
  rating_average: number | null
  rating_count: number | null
  yarn_weight: {
    id: number
    name: string
    ply: string | null
    knit_gauge: string | null
    crochet_gauge: string | null
    wpi: string | null
  } | null
  first_photo: {
    medium_url: string
    small_url: string
    square_url: string
  } | null
  yarn_fibers: Array<{
    percentage: number
    fiber_type: {
      name: string
      animal_fiber: boolean
      synthetic: boolean
      vegetable_fiber: boolean
    }
  }> | null
}

export interface YarnSearchParams {
  query?: string
  weight?: string // yarn weight name e.g. "worsted", "dk"
  fiber?: string  // fiber type e.g. "merino", "cotton"
  sort?: string   // "best", "rating", "projects"
  page?: number
  page_size?: number
}

function mapYarnResults(yarns: RavelryYarnResult[]) {
  return yarns.map(y => ({
    ravelry_id: y.id,
    name: y.name,
    permalink: y.permalink,
    company_name: y.yarn_company_name,
    company_id: y.yarn_company_id ?? null,
    discontinued: y.discontinued ?? false,
    machine_washable: y.machine_washable ?? false,
    grams: y.grams,
    yardage: y.yardage,
    weight: y.yarn_weight?.name?.toLowerCase() ?? null,
    weight_ply: y.yarn_weight?.ply ?? null,
    texture: y.texture,
    wpi: y.wpi ?? null,
    min_gauge: y.min_gauge ?? null,
    max_gauge: y.max_gauge ?? null,
    gauge_divisor: y.gauge_divisor ?? null,
    knit_gauge: y.yarn_weight?.knit_gauge ?? null,
    rating: y.rating_average ? Math.round(y.rating_average * 10) / 10 : null,
    rating_count: y.rating_count ?? 0,
    photo_url: y.first_photo?.medium_url ?? null,
    fibers: y.yarn_fibers?.map(f => ({
      name: f.fiber_type.name,
      percentage: f.percentage,
    })) ?? null,
  }))
}

/** Try Basic Auth first, fall back to user's OAuth token */
export async function searchRavelryYarns(params: YarnSearchParams, userId: string) {
  const basicUsername = process.env.RAVELRY_BASIC_USERNAME
  const basicPassword = process.env.RAVELRY_BASIC_PASSWORD

  if (basicUsername && basicPassword) {
    return searchViaBasicAuth(params, basicUsername, basicPassword)
  }

  // Fallback: use user's OAuth token
  return searchViaOAuth(params, userId)
}

async function searchViaBasicAuth(params: YarnSearchParams, username: string, password: string) {
  const auth = Buffer.from(`${username}:${password}`).toString('base64')
  const url = new URL(`${BASE_URL}/yarns/search.json`)

  if (params.query) url.searchParams.set('query', params.query)
  if (params.weight) url.searchParams.set('weight', params.weight)
  if (params.fiber) url.searchParams.set('fiber', params.fiber)
  url.searchParams.set('sort', params.sort ?? 'best')
  url.searchParams.set('page', String(params.page ?? 1))
  url.searchParams.set('page_size', String(Math.min(params.page_size ?? 20, 100)))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[ravelry-yarn-search] Basic Auth failed:', res.status, body)
    throw new Error(`Ravelry yarn search failed: ${res.status}`)
  }

  const data = await res.json() as {
    yarns: RavelryYarnResult[]
    paginator: { results: number; page: number; page_count: number; page_size: number }
  }

  return { yarns: mapYarnResults(data.yarns), paginator: data.paginator }
}

async function searchViaOAuth(params: YarnSearchParams, userId: string) {
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: userId },
  })
  if (!connection) {
    throw new Error('Connect your Ravelry account to search yarns')
  }

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  const searchParams: Record<string, string | number> = {
    sort: params.sort ?? 'best',
    page: params.page ?? 1,
    page_size: Math.min(params.page_size ?? 20, 100),
  }
  if (params.query) searchParams.query = params.query
  if (params.weight) searchParams.weight = params.weight
  if (params.fiber) searchParams.fiber = params.fiber

  const data = await client.searchYarns(searchParams)

  return {
    yarns: mapYarnResults(data.yarns as unknown as RavelryYarnResult[]),
    paginator: data.paginator,
  }
}
