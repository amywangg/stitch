import crypto from 'crypto'

const BASE_URL = 'https://api.ravelry.com'

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
  small_photo_url: string | null
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

  private async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v))
      }
    }
    const fullUrl = url.toString()
    const res = await fetch(fullUrl, {
      headers: {
        Authorization: this.buildAuthHeader('GET', fullUrl),
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Ravelry API ${res.status}: ${path}`)
    }
    const text = await res.text()
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`Ravelry API invalid JSON from ${path}: ${text.slice(0, 100)}`)
    }
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const fullUrl = `${BASE_URL}${path}`
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: { Authorization: this.buildAuthHeader('POST', fullUrl), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`Ravelry API ${res.status}: POST ${path}`)
    }
    return res.json() as Promise<T>
  }

  private async patch<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const fullUrl = `${BASE_URL}${path}`
    const res = await fetch(fullUrl, {
      method: 'PATCH',
      headers: { Authorization: this.buildAuthHeader('PATCH', fullUrl), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`Ravelry API ${res.status}: PATCH ${path}`)
    }
    return res.json() as Promise<T>
  }

  private async del(path: string): Promise<void> {
    const fullUrl = `${BASE_URL}${path}`
    const res = await fetch(fullUrl, {
      method: 'DELETE',
      headers: { Authorization: this.buildAuthHeader('DELETE', fullUrl), Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`Ravelry API ${res.status}: DELETE ${path}`)
    }
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
    return this.get(`/people/${this.username}/library/list.json`, { page, page_size: 100 })
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

  // ─── Project write ──────────────────────────────────────────────────────────

  async createProject(data: {
    name: string
    status_name: string
    craft_name: string
    started?: string
  }): Promise<{ project: { id: number; permalink: string } }> {
    return this.post(`/projects/${this.username}.json`, data)
  }

  async updateProject(
    permalink: string,
    data: Partial<{ name: string; status_name: string; notes: string; size: string; started: string; completed: string }>,
  ): Promise<void> {
    await this.patch(`/projects/${this.username}/${permalink}.json`, data)
  }

  async deleteProject(permalink: string): Promise<void> {
    await this.del(`/projects/${this.username}/${permalink}.json`)
  }

  // ─── Queue write ────────────────────────────────────────────────────────────

  async addToQueue(data: {
    pattern_id: number
    notes?: string
  }): Promise<{ queued_project: { id: number } }> {
    return this.post(`/people/${this.username}/queue.json`, data)
  }

  async removeFromQueue(queueId: string): Promise<void> {
    await this.del(`/people/${this.username}/queue/${queueId}.json`)
  }

  // ─── Stash write ────────────────────────────────────────────────────────────

  async createStashItem(data: {
    name: string
    colorway?: string
    skeins?: number
    grams?: number
    notes?: string
  }): Promise<{ stash: { id: number } }> {
    return this.post(`/people/${this.username}/stash.json`, data)
  }

  async updateStashItem(
    stashId: string,
    data: Partial<{ colorway: string; skeins: number; grams: number; notes: string }>,
  ): Promise<void> {
    await this.patch(`/people/${this.username}/stash/${stashId}.json`, data)
  }

  async deleteStashItem(stashId: string): Promise<void> {
    await this.del(`/people/${this.username}/stash/${stashId}.json`)
  }
}
