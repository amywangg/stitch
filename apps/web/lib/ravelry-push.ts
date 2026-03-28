/**
 * Ravelry write-back helpers.
 *
 * Pattern: DB write first, then push to Ravelry non-blocking.
 * If Ravelry push fails, log but don't fail the request.
 *
 * ═══════════════════════════════════════════════════════════════
 * VERIFIED RAVELRY WRITE ENDPOINTS (tested 2026-03-19)
 * ═══════════════════════════════════════════════════════════════
 *
 * PROJECTS — Full CRUD
 *   Create:  POST   /projects/{username}/create.json                → 200, returns {project}
 *   Update:  POST   /projects/{username}/{id}.json    + JSON body   → 200, returns {project}
 *   Delete:  DELETE  /projects/{username}/{id}.json                  → 200
 *   Fields:  name, notes, craft_id, status_id, started, completed,
 *            rating, progress, made_for, tag_names[]
 *
 * FAVORITES — Create + Delete
 *   Create:  POST   /people/{username}/favorites/create.json        → 200
 *            Body (flat, NOT nested): { type: "pattern", favorited_id: <ravelry_id> }
 *   Delete:  DELETE  /people/{username}/favorites/{id}.json         → 200
 *   Types:   pattern, yarn, project, stash, designer, yarnbrand
 *
 * STASH — Create + Delete (fields mostly ignored on update)
 *   Create:  POST   /people/{username}/stash/create.json            → 200, empty shell
 *   Update:  POST   /people/{username}/stash/{id}.json              → 200, only `notes` works
 *   Delete:  DELETE  /people/{username}/stash/{id}.json             → 200
 *
 * QUEUE — Create + Delete (fields ignored)
 *   Create:  POST   /people/{username}/queue/create.json            → 200, empty shell
 *   Delete:  DELETE  /people/{username}/queue/{id}.json             → 200
 *
 * NOT WRITABLE:
 *   Needles — 302 on all write attempts
 *   Library — no write endpoint found
 *   Profile — no write endpoint found
 * ═══════════════════════════════════════════════════════════════
 */

import type { RavelryClient } from '@/lib/ravelry-client'

// ─── Status mapping ─────────────────────────────────────────────────────────

const STATUS_TO_RAVELRY: Record<string, number> = {
  active: 1,        // "In progress"
  completed: 2,     // "Finished"
  hibernating: 3,   // "Hibernating"
  frogged: 4,       // "Frogged"
}

const CRAFT_TO_RAVELRY: Record<string, number> = {
  knitting: 1,
  crochet: 2,
}

// ─── Projects ───────────────────────────────────────────────────────────────

interface ProjectPushData {
  name: string
  notes?: string | null
  status?: string
  craft_type?: string
  started_at?: Date | string | null
  completed_at?: Date | string | null
  rating?: number | null
  progress?: number | null
  made_for?: string | null
  tags?: string[]
}

/**
 * Create a project on Ravelry. Returns the Ravelry project ID.
 * Call after creating the project in our DB.
 */
export async function ravelryCreateProject(
  client: RavelryClient,
  username: string,
  data: ProjectPushData,
): Promise<number | null> {
  try {
    // Step 1: Create empty shell
    const createRes = await client.post<{ project: { id: number; permalink: string } }>(
      `/projects/${username}/create.json`
    )
    const ravelryId = createRes.project?.id
    if (!ravelryId) return null

    // Step 2: Update with actual data
    await ravelryUpdateProject(client, username, ravelryId, data)

    return ravelryId
  } catch (err) {
    console.error('[ravelry-push] createProject failed:', err)
    return null
  }
}

/**
 * Update a project on Ravelry.
 * Call after updating the project in our DB.
 */
export async function ravelryUpdateProject(
  client: RavelryClient,
  username: string,
  ravelryId: number | string,
  data: Partial<ProjectPushData>,
): Promise<void> {
  try {
    const body: Record<string, unknown> = {}

    if (data.name !== undefined) body.name = data.name
    if (data.notes !== undefined) body.notes = data.notes ?? ''
    if (data.status && STATUS_TO_RAVELRY[data.status]) {
      body.status_id = STATUS_TO_RAVELRY[data.status]
    }
    if (data.craft_type && CRAFT_TO_RAVELRY[data.craft_type]) {
      body.craft_id = CRAFT_TO_RAVELRY[data.craft_type]
    }
    if (data.started_at !== undefined) {
      body.started = data.started_at ? formatDate(data.started_at) : null
    }
    if (data.completed_at !== undefined) {
      body.completed = data.completed_at ? formatDate(data.completed_at) : null
    }
    if (data.rating !== undefined) body.rating = data.rating
    if (data.progress !== undefined) body.progress = data.progress
    if (data.made_for !== undefined) body.made_for = data.made_for ?? ''
    if (data.tags) body.tag_names = data.tags

    if (Object.keys(body).length === 0) return

    await client.post(`/projects/${username}/${ravelryId}.json`, body)
  } catch (err) {
    console.error('[ravelry-push] updateProject failed:', err)
  }
}

/**
 * Delete a project on Ravelry.
 */
export async function ravelryDeleteProject(
  client: RavelryClient,
  username: string,
  ravelryId: number | string,
): Promise<void> {
  try {
    await client.delete(`/projects/${username}/${ravelryId}.json`)
  } catch (err) {
    console.error('[ravelry-push] deleteProject failed:', err)
  }
}

// ─── Favorites ──────────────────────────────────────────────────────────────

/**
 * Add a pattern to Ravelry favorites. Returns the bookmark ID.
 */
export async function ravelryFavoritePattern(
  client: RavelryClient,
  username: string,
  ravelryPatternId: number,
): Promise<number | null> {
  try {
    const res = await client.post<{ bookmark: { id: number } }>(
      `/people/${username}/favorites/create.json`,
      { type: 'pattern', favorited_id: ravelryPatternId }
    )
    return res.bookmark?.id ?? null
  } catch (err) {
    console.error('[ravelry-push] favoritePattern failed:', err)
    return null
  }
}

/**
 * Remove a favorite from Ravelry.
 */
export async function ravelryUnfavorite(
  client: RavelryClient,
  username: string,
  bookmarkId: number | string,
): Promise<void> {
  try {
    await client.delete(`/people/${username}/favorites/${bookmarkId}.json`)
  } catch (err) {
    console.error('[ravelry-push] unfavorite failed:', err)
  }
}

// ─── Queue ──────────────────────────────────────────────────────────────────

/**
 * Add to Ravelry queue. Returns the queued_project ID.
 * Note: Fields are ignored by Ravelry — only creates an empty shell.
 */
export async function ravelryAddToQueue(
  client: RavelryClient,
  username: string,
): Promise<number | null> {
  try {
    const res = await client.post<{ queued_project: { id: number } }>(
      `/people/${username}/queue/create.json`
    )
    return res.queued_project?.id ?? null
  } catch (err) {
    console.error('[ravelry-push] addToQueue failed:', err)
    return null
  }
}

/**
 * Remove from Ravelry queue.
 */
export async function ravelryRemoveFromQueue(
  client: RavelryClient,
  username: string,
  queueId: number | string,
): Promise<void> {
  try {
    await client.delete(`/people/${username}/queue/${queueId}.json`)
  } catch (err) {
    console.error('[ravelry-push] removeFromQueue failed:', err)
  }
}

// ─── Stash ──────────────────────────────────────────────────────────────────

/**
 * Delete a stash item from Ravelry.
 * Note: Create/update fields are mostly ignored by Ravelry, so we only support delete.
 */
export async function ravelryDeleteStash(
  client: RavelryClient,
  username: string,
  stashId: number | string,
): Promise<void> {
  try {
    await client.delete(`/people/${username}/stash/${stashId}.json`)
  } catch (err) {
    console.error('[ravelry-push] deleteStash failed:', err)
  }
}

// ─── Photos ─────────────────────────────────────────────────────────────────

/**
 * Upload a photo to a Ravelry project or stash item.
 *
 * CRITICAL: The create_photo step MUST use FormData, NOT JSON.
 * Sending image_id as JSON creates a job that silently fails.
 *
 * Flow:
 * 1. POST /upload/request_token.json → upload_token
 * 2. POST /upload/image.json (multipart: upload_token + file0) → image_id
 * 3. POST /{entity_path}/create_photo.json (FormData: image_id) → status_token
 * 4. Poll GET /photos/status.json?status_token=... until complete
 */
export async function ravelryUploadPhoto(
  client: RavelryClient,
  entityType: 'project' | 'stash',
  username: string,
  entityId: number | string,
  imageBuffer: Buffer,
  mimeType = 'image/jpeg',
  fileName = 'photo.jpg',
): Promise<number | null> {
  try {
    const id = typeof entityId === 'string' ? parseInt(entityId) : entityId

    // Step 1: Get upload token
    const tokenRes = await client.post<{ upload_token: string }>('/upload/request_token.json', {
      type: entityType,
      id,
    })
    const token = tokenRes?.upload_token
    if (!token) return null

    // Step 2: Upload image via multipart FormData
    const formData = new FormData()
    formData.append('upload_token', token)
    formData.append('file0', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), fileName)

    const uploadRes = await fetch('https://api.ravelry.com/upload/image.json', {
      method: 'POST',
      body: formData,
    })
    if (!uploadRes.ok) return null

    const uploadData = await uploadRes.json() as { uploads: { file0: { image_id: number } } }
    const imageId = uploadData?.uploads?.file0?.image_id
    if (!imageId) return null

    // Step 3: Attach photo — MUST use FormData, NOT JSON!
    const attachPath = entityType === 'project'
      ? `/projects/${username}/${id}/create_photo.json`
      : `/people/${username}/stash/${id}/create_photo.json`

    const attachForm = new FormData()
    attachForm.append('image_id', String(imageId))

    const attachUrl = `https://api.ravelry.com${attachPath}`
    const attachRes = await fetch(attachUrl, {
      method: 'POST',
      body: attachForm,
    })
    if (!attachRes.ok) return null

    const attachData = await attachRes.json() as { status_token: string }

    // Step 4: Poll for completion (max 30s)
    if (attachData?.status_token) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const statusUrl = `https://api.ravelry.com/photos/status.json?status_token=${encodeURIComponent(attachData.status_token)}`
        const statusRes = await fetch(statusUrl, {
          headers: { Accept: 'application/json' },
        })
        const status = await statusRes.json().catch(() => null) as { complete: boolean; failed: boolean; photo: { id: number } | null } | null
        if (status?.complete && !status?.failed && status?.photo?.id) {
          return status.photo.id
        }
        if (status?.failed) {
          console.error('[ravelry-push] Photo processing failed')
          return null
        }
      }
    }

    return imageId // Return image_id even if polling times out
  } catch (err) {
    console.error('[ravelry-push] uploadPhoto failed:', err)
    return null
  }
}

// Convenience alias for project photos
export async function ravelryUploadProjectPhoto(
  client: RavelryClient,
  ravelryProjectId: number | string,
  imageBuffer: Buffer,
  mimeType = 'image/jpeg',
  fileName = 'photo.jpg',
): Promise<number | null> {
  // Need username — get from connection
  // Caller should pass username, but for backwards compat we return image_id
  try {
    const tokenRes = await client.post<{ upload_token: string }>('/upload/request_token.json', {
      type: 'project',
      id: typeof ravelryProjectId === 'string' ? parseInt(ravelryProjectId) : ravelryProjectId,
    })
    const token = tokenRes?.upload_token
    if (!token) return null

    const formData = new FormData()
    formData.append('upload_token', token)
    formData.append('file0', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), fileName)

    const uploadRes = await fetch('https://api.ravelry.com/upload/image.json', {
      method: 'POST',
      body: formData,
    })
    if (!uploadRes.ok) return null

    const data = await uploadRes.json() as { uploads: { file0: { image_id: number } } }
    return data?.uploads?.file0?.image_id ?? null
  } catch (err) {
    console.error('[ravelry-push] uploadProjectPhoto failed:', err)
    return null
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
