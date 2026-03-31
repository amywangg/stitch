import crypto from 'crypto'

const BASE_URL = 'https://api.ravelry.com'

/** Thrown when Ravelry OAuth tokens are expired, revoked, or invalid. */
export class RavelryAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RavelryAuthError'
  }
}

/** RFC 3986 percent-encoding */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

// ─── Response types ────────────────────────────────────────────────────────────

export interface RavelryUser {
  id: number
  username: string
  small_photo_url: string | null
  location: string | null
  about_me: string | null
}

export interface RavelryProjectSummary {
  id: number
  name: string
  status_name: string
  craft_name: string
  started: string | null
  completed: string | null
  permalink: string
}

export interface RavelryProjectDetail {
  id: number
  name: string
  status_name: string
  craft_name: string
  started: string | null
  completed: string | null
  permalink: string
  notes: string | null
  size: string | null
  pattern_id: number | null
  pattern: { name: string; permalink: string } | null
  // Gauge: stitches and rows over gauge_divisor inches
  gauge: number | null
  gauge_divisor: number | null
  row_gauge: number | null
  tag_names: string[]
  pattern_categories: Array<{ name: string; permalink: string; parent?: { name: string; parent?: { name: string } } }> | null
  photos: Array<{
    medium_url: string
    sort_order: number
    caption: string | null
  }>
  yarns: Array<{
    yarn: { id: number; name: string; company_name: string } | null
    colorway: string | null
    skeins: number | null
    name_override: string | null
  }>
  needle_sizes: Array<{
    us: string | null
    metric: string | null
    hook: string | null
    name: string | null
  }>
}

export interface RavelryLibraryItem {
  id: number
  title: string
  url: string | null
  pattern_id: number | null
  author_name: string | null
  has_downloads: boolean
  // The search endpoint returns pattern_id (number), NOT a nested pattern object.
  // The list endpoint returns a nested pattern object, but it returns {} for most accounts.
  // We use pattern_id + getRavelryPatternDetail() to get full pattern data.
  pattern: {
    id: number
    name: string
    permalink: string
    designer: { name: string } | null
  } | null
}

export interface RavelryQueueItem {
  id: number
  sort_order?: number
  position?: number
  notes: string | null
  pattern_id?: number | null
  short_pattern_name?: string | null
  pattern: {
    id: number
    name: string
    permalink: string
    designer: { name: string } | null
    photos?: Array<{ medium_url?: string; small_url?: string; sort_order?: number }>
  } | null
}

export interface RavelryStashItem {
  id: number
  name: string
  colorway: string | null
  skeins: number | null
  grams: number | null
  notes: string | null
  yarn: {
    id: number
    name: string
    company_name: string
    weight: string | null
    yardage: number | null
    grams: number | null
  } | null
}

export interface RavelryFriend {
  friend_id: number
  friend_username: string
  friend_avatar: {
    tiny_photo_url: string | null
    photo_url: string | null
    large_photo_url: string | null
  } | null
  created_at: string
}

export interface RavelryNeedle {
  id: number
  us: string | null
  metric: string | null
  hook: string | null
  // "circular" | "straight" | "dpn" | "fixed_circular" | "interchangeable" | "crochet_hook"
  type_id: string | null
  length: number | null
  manufacturer: string | null
}

// ─── Paginator ────────────────────────────────────────────────────────────────

interface Paginator {
  results: number
  page: number
  page_count: number
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class RavelryClient {
  constructor(
    private clientKey: string,
    private clientSecret: string,
    private accessToken: string,
    private tokenSecret: string,
    private username: string,
  ) {}

  private buildAuthHeader(method: string, url: string): string {
    const nonce = crypto.randomBytes(16).toString('hex')
    const timestamp = Math.floor(Date.now() / 1000).toString()

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.clientKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: this.accessToken,
      oauth_version: '1.0',
    }

    // Parse URL to include query params in signature base string
    const parsedUrl = new URL(url)
    const allParams: Record<string, string> = { ...oauthParams }
    parsedUrl.searchParams.forEach((v, k) => { allParams[k] = v })

    // Base URL without query string
    const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`

    const paramString = Object.keys(allParams)
      .sort()
      .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
      .join('&')

    const baseString = [
      method.toUpperCase(),
      percentEncode(baseUrl),
      percentEncode(paramString),
    ].join('&')

    const signingKey = `${percentEncode(this.clientSecret)}&${percentEncode(this.tokenSecret)}`
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64')

    return 'OAuth ' +
      Object.entries({ ...oauthParams, oauth_signature: signature })
        .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
        .join(', ')
  }

  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, string | number>,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`)
    if (params && method === 'GET') {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v))
      }
    }
    const fullUrl = url.toString()

    const headers: Record<string, string> = {
      Authorization: this.buildAuthHeader(method, fullUrl),
      Accept: 'application/json',
    }

    const fetchOpts: RequestInit = {
      method,
      headers,
      redirect: method === 'GET' ? 'follow' : 'manual',
    }

    if (body && method !== 'GET') {
      headers['Content-Type'] = 'application/json'
      fetchOpts.body = JSON.stringify(body)
    }

    const res = await fetch(fullUrl, fetchOpts)

    // Ravelry returns 302 to login page when endpoint requires different permissions
    // Only check for non-GET (GET follows redirects automatically)
    if (method !== 'GET' && res.status >= 300 && res.status < 400) {
      throw new Error(`Ravelry redirected for ${path} — this endpoint may require additional app permissions.`)
    }

    if (res.status === 401) {
      throw new RavelryAuthError('Ravelry rejected the OAuth token. Please disconnect and reconnect.')
    }

    if (res.status === 403) {
      throw new Error(`Ravelry denied access to ${path}. Your Ravelry API app may need additional permissions.`)
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`Ravelry API ${res.status} ${method} ${path}: ${errBody.slice(0, 200)}`)
    }

    // Some write endpoints return 200 with no body
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('json')) {
      return {} as T
    }

    const text = await res.text()
    try {
      return JSON.parse(text) as T
    } catch {
      if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
        throw new Error(`Ravelry returned a login page for ${path}. This endpoint may require re-authorization.`)
      }
      throw new Error(`Ravelry API invalid JSON from ${path}: ${text.slice(0, 100)}`)
    }
  }

  async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    return this.request('GET', path, params)
  }

  async post<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this.request('POST', path, undefined, body)
  }

  async put<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this.request('PUT', path, undefined, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.request('DELETE', path)
  }

  // ─── Binary fetch (for file downloads) ──────────────────────────────────────

  async fetchBinary(url: string): Promise<Buffer | null> {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        Authorization: this.buildAuthHeader('GET', url),
        'User-Agent': 'Stitch/1.0',
      },
    })

    if (!res.ok) return null

    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
  }

  // ─── Search (public endpoints, but needs auth) ─────────────────────────────

  async searchPatterns(params: Record<string, string | number>): Promise<{
    patterns: Array<Record<string, unknown>>
    paginator: { results: number; page: number; page_count: number; page_size: number }
  }> {
    return this.get('/patterns/search.json', params)
  }

  async fetchPatternDetail(patternId: number): Promise<Record<string, unknown>> {
    return this.get(`/patterns/${patternId}.json`)
  }

  async searchYarns(params: Record<string, string | number>): Promise<{
    yarns: Array<Record<string, unknown>>
    paginator: { results: number; page: number; page_count: number; page_size: number }
  }> {
    return this.get('/yarns/search.json', params)
  }

  async getProfile(): Promise<{ user: RavelryUser }> {
    return this.get(`/people/${this.username}.json`)
  }

  async listProjects(page = 1): Promise<{ projects: RavelryProjectSummary[]; paginator: Paginator }> {
    return this.get(`/projects/${this.username}/list.json`, { page, page_size: 100 })
  }

  async getProject(permalink: string): Promise<{ project: RavelryProjectDetail }> {
    return this.get(`/projects/${this.username}/${permalink}.json`)
  }

  async listLibrary(page = 1): Promise<{ volumes: RavelryLibraryItem[]; paginator: Paginator }> {
    try {
      // Note: /library/list.json returns {} for most accounts.
      // /library/search.json is the correct endpoint that returns volumes + paginator.
      return await this.get(`/people/${this.username}/library/search.json`, { page, page_size: 100 })
    } catch (err) {
      // Library endpoint returns 302 or HTML for accounts with empty/inaccessible library
      // Treat as empty — not an error
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('login page') || msg.includes('redirected') || msg.includes('invalid JSON')) {
        console.log(`[ravelry] Library endpoint returned non-data response (page ${page}), treating as empty`)
        return { volumes: [], paginator: { results: 0, page: 1, page_count: 0 } }
      }
      throw err
    }
  }

  async getPattern(id: number): Promise<{
    pattern: {
      id: number
      name: string
      permalink: string
      designer: { name: string } | null
      photos?: Array<{ medium_url?: string; small_url?: string; sort_order?: number }>
    } | null
  }> {
    return this.get(`/patterns/${id}.json`)
  }

  async listQueue(page = 1): Promise<{ queued_projects: RavelryQueueItem[]; paginator: Paginator }> {
    return this.get(`/people/${this.username}/queue/list.json`, { page, page_size: 100 })
  }

  async listStash(page = 1): Promise<{ stash: RavelryStashItem[]; paginator: Paginator }> {
    return this.get(`/people/${this.username}/stash/list.json`, { page, page_size: 100 })
  }

  async listNeedles(): Promise<{ needles: RavelryNeedle[] }> {
    return this.get(`/people/${this.username}/needles.json`)
  }

  async searchStash(query: string, page = 1, pageSize = 100): Promise<{
    stashes: Array<{ colorway_name?: string; id: number; name: string }>
    paginator: Paginator & { page_size: number }
  }> {
    return this.get('/stash/search.json', { query, page, page_size: pageSize })
  }

  async listFriends(page = 1): Promise<{ friendships: RavelryFriend[]; paginator: Paginator }> {
    return this.get(`/people/${this.username}/friends/list.json`, { page, page_size: 100 })
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Returns a ready RavelryClient for read-only operations if the user
 * has a Ravelry connection. Returns null if not connected or missing env vars.
 */
export async function getRavelryClient(
  userId: string,
): Promise<RavelryClient | null> {
  // Lazy-import prisma + decrypt to avoid circular deps at module level
  const { prisma } = await import('@/lib/prisma')
  const { decrypt } = await import('@/lib/encrypt')

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
