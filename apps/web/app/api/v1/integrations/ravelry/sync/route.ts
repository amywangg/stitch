import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { requirePro } from '@/lib/pro-gate'
import { decrypt } from '@/lib/encrypt'
import { slugify } from '@/lib/utils'
import { RavelryClient, RavelryAuthError, RavelryProjectSummary, RavelryProjectDetail } from '@/lib/ravelry-client'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'
import { fetchRavelryDownload } from '@/lib/ravelry-download'
import { emitActivity } from '@/lib/activity'
import { ravelryCreateProject, ravelryUpdateProject, ravelryUploadPhoto } from '@/lib/ravelry-push'
import { createClient } from '@supabase/supabase-js'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const PDF_BUCKET = 'patterns'
const MAX_PDF_SIZE = 20 * 1024 * 1024 // 20 MB

export const maxDuration = 300

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStatus(ravelryStatus: string): string {
  const map: Record<string, string> = {
    'In Progress': 'active',
    Finished: 'completed',
    Frogged: 'frogged',
    Hibernating: 'hibernating',
  }
  return map[ravelryStatus] ?? 'active'
}

// Convert Ravelry gauge (stitches over N inches) to per-10cm
function toPerTenCm(value: number, divisorInches: number): number {
  return (value / divisorInches) * (10 / 2.54)
}

function mapNeedleType(ravelryType: string | null): string {
  if (!ravelryType) return 'straight'
  const t = ravelryType.toLowerCase()
  if (t.includes('circular') || t.includes('interchangeable')) return 'circular'
  if (t.includes('dpn')) return 'dpn'
  if (t.includes('crochet') || t.includes('hook')) return 'crochet_hook'
  return 'straight'
}

async function uniqueProjectSlug(userId: string, base: string): Promise<string> {
  let slug = slugify(base)
  let attempt = 0
  while (await prisma.projects.findUnique({ where: { user_id_slug: { user_id: userId, slug } } })) {
    attempt++
    slug = `${slugify(base)}-${attempt}`
  }
  return slug
}

async function uniquePatternSlug(userId: string, base: string): Promise<string> {
  let slug = slugify(base)
  let attempt = 0
  while (await prisma.patterns.findUnique({ where: { user_id_slug: { user_id: userId, slug } } })) {
    attempt++
    slug = `${slugify(base)}-${attempt}`
  }
  return slug
}

async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; pageCount: number }>,
): Promise<T[]> {
  const first = await fetchPage(1)
  const all = [...first.items]
  for (let page = 2; page <= first.pageCount; page++) {
    const { items } = await fetchPage(page)
    all.push(...items)
  }
  return all
}

// Run fn over items in batches of batchSize concurrently
async function batchMap<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = await Promise.all(items.slice(i, i + batchSize).map(fn))
    results.push(...batch)
  }
  return results
}

// ─── Phase helpers ─────────────────────────────────────────────────────────────

async function importProjectDetail(
  userId: string,
  summary: RavelryProjectSummary,
  detail: RavelryProjectDetail,
): Promise<'imported' | 'updated'> {
  const ravelryId = String(summary.id)
  const existing = await prisma.projects.findFirst({ where: { user_id: userId, ravelry_id: ravelryId } })

  // Link pattern if the project references one
  let linkedPatternId: string | null = null
  if (detail.pattern_id) {
    try {
      linkedPatternId = (await upsertPatternRich(userId, detail.pattern_id)).patternId
    } catch {
      // Fall back to basic upsert if full fetch fails
      if (detail.pattern) {
        try {
          linkedPatternId = await upsertPattern(
            userId, detail.pattern_id, detail.pattern.name, null, detail.pattern.permalink,
          )
        } catch { /* non-critical */ }
      }
    }
  }

  let projectId: string

  // Build category string from Ravelry's nested pattern_categories
  let category: string | null = null
  if (detail.pattern_categories && detail.pattern_categories.length > 0) {
    const cat = detail.pattern_categories[0]
    const parts: string[] = []
    if (cat.parent?.parent?.name) parts.push(cat.parent.parent.name)
    if (cat.parent?.name) parts.push(cat.parent.name)
    parts.push(cat.name)
    category = parts.join(' → ')
  }

  const status = mapStatus(detail.status_name)
  const isCompleted = status === 'completed'

  if (existing) {
    await prisma.projects.update({
      where: { id: existing.id },
      data: {
        title: detail.name || 'Untitled project',
        status,
        craft_type: detail.craft_name?.toLowerCase() === 'crochet' ? 'crochet' : 'knitting',
        description: detail.notes ?? undefined,
        size_made: detail.size ?? undefined,
        category: category ?? undefined,
        started_at: detail.started ? new Date(detail.started) : null,
        finished_at: detail.completed ? new Date(detail.completed) : null,
        ravelry_permalink: detail.permalink,
        // Link pattern if not already linked
        ...(linkedPatternId && !existing.pattern_id ? { pattern_id: linkedPatternId } : {}),
      },
    })
    projectId = existing.id
  } else {
    const slug = await uniqueProjectSlug(userId, detail.name)
    const created = await prisma.projects.create({
      data: {
        user_id: userId,
        ravelry_id: ravelryId,
        ravelry_permalink: detail.permalink,
        slug,
        title: detail.name || 'Untitled project',
        craft_type: detail.craft_name?.toLowerCase() === 'crochet' ? 'crochet' : 'knitting',
        status,
        description: detail.notes ?? null,
        size_made: detail.size ?? null,
        category,
        started_at: detail.started ? new Date(detail.started) : null,
        finished_at: detail.completed ? new Date(detail.completed) : null,
        pattern_id: linkedPatternId,
        sections: { create: [{ name: 'Main', sort_order: 0, completed: isCompleted }] },
      },
    })
    projectId = created.id
  }

  // Mark all sections completed if project is completed
  if (isCompleted) {
    await prisma.project_sections.updateMany({
      where: { project_id: projectId, completed: false },
      data: { completed: true },
    })
  }

  // Photos: delete + recreate
  await prisma.project_photos.deleteMany({ where: { project_id: projectId } })
  const photos = detail.photos ?? []
  if (photos.length > 0) {
    await prisma.project_photos.createMany({
      data: photos.map((photo, i) => ({
        project_id: projectId,
        url: photo.medium_url,
        caption: photo.caption ?? null,
        sort_order: photo.sort_order ?? i,
      })),
    })
  }

  // Yarns: delete Ravelry-sourced entries (name_override set, no catalog link), recreate
  await prisma.project_yarns.deleteMany({
    where: { project_id: projectId, yarn_id: null, stash_item_id: null, name_override: { not: null } },
  })
  const yarns = detail.yarns ?? []
  if (yarns.length > 0) {
    await prisma.project_yarns.createMany({
      data: yarns.map(y => ({
        project_id: projectId,
        name_override: y.yarn?.name ?? y.name_override ?? 'Unknown',
        colorway: y.colorway ?? null,
        skeins_used: y.skeins ?? null,
      })),
    })
  }

  // Gauge: upsert
  const divisor = detail.gauge_divisor ?? 4
  if (detail.gauge != null || detail.row_gauge != null) {
    await prisma.project_gauge.upsert({
      where: { project_id: projectId },
      update: {
        stitches_per_10cm: detail.gauge != null ? toPerTenCm(detail.gauge, divisor) : null,
        rows_per_10cm: detail.row_gauge != null ? toPerTenCm(detail.row_gauge, divisor) : null,
      },
      create: {
        project_id: projectId,
        stitches_per_10cm: detail.gauge != null ? toPerTenCm(detail.gauge, divisor) : null,
        rows_per_10cm: detail.row_gauge != null ? toPerTenCm(detail.row_gauge, divisor) : null,
      },
    })
  }

  // Tags: sync from Ravelry
  const tagNames = detail.tag_names ?? []
  if (tagNames.length > 0) {
    // Remove existing tags and re-create
    await prisma.project_tags.deleteMany({ where: { project_id: projectId } })
    for (const name of tagNames) {
      const tag = await prisma.tags.upsert({
        where: { name },
        create: { name },
        update: {},
      })
      await prisma.project_tags.create({
        data: { project_id: projectId, tag_id: tag.id },
      }).catch(() => {}) // ignore duplicate
    }
  }

  // Backfill activity events for newly imported projects (skip re-syncs)
  if (!existing) {
    if (detail.started) {
      await emitActivity({
        userId, type: 'project_started', projectId,
        createdAt: new Date(detail.started),
        metadata: { source: 'ravelry_import' },
      })
    }
    if (status === 'completed' && detail.completed) {
      await emitActivity({
        userId, type: 'project_completed', projectId,
        createdAt: new Date(detail.completed),
        metadata: { source: 'ravelry_import' },
      })
    }
    if (status === 'frogged') {
      await emitActivity({
        userId, type: 'project_frogged', projectId,
        createdAt: detail.completed ? new Date(detail.completed) : new Date(),
        metadata: { source: 'ravelry_import' },
      })
    }
  }

  return existing ? 'updated' : 'imported'
}

async function upsertPattern(
  userId: string,
  ravelryPatternId: number,
  title: string,
  designerName: string | null,
  permalink: string | null,
  coverImageUrl: string | null = null,
): Promise<string> {
  const existing = await prisma.patterns.findFirst({
    where: { user_id: userId, ravelry_id: String(ravelryPatternId) },
  })
  if (existing) {
    await prisma.patterns.update({
      where: { id: existing.id },
      data: {
        title,
        designer_name: designerName ?? undefined,
        source_url: permalink ? `https://www.ravelry.com/patterns/library/${permalink}` : undefined,
        cover_image_url: coverImageUrl ?? undefined,
      },
    })
    return existing.id
  }
  const slug = await uniquePatternSlug(userId, title)
  const created = await prisma.patterns.create({
    data: {
      user_id: userId,
      ravelry_id: String(ravelryPatternId),
      slug,
      title,
      designer_name: designerName ?? null,
      source_url: permalink ? `https://www.ravelry.com/patterns/library/${permalink}` : null,
      cover_image_url: coverImageUrl,
    },
  })
  return created.id
}

interface PatternUpsertResult {
  patternId: string
  downloadUrl: string | null
  hasPdfAlready: boolean
}

/**
 * Fetch full Ravelry pattern data and create/update a rich pattern record.
 * Returns the pattern ID, download URL (if available), and whether a PDF is already attached.
 * Falls back to basic upsert if full detail fetch fails.
 */
async function upsertPatternRich(userId: string, ravelryPatternId: number, force = false): Promise<PatternUpsertResult> {
  const existing = await prisma.patterns.findFirst({
    where: { user_id: userId, ravelry_id: String(ravelryPatternId) },
  })

  // If we already have a rich, non-deleted record with a PDF, skip re-fetch unless forced
  if (!force && existing && !existing.deleted_at && (existing.description || existing.gauge_stitches_per_10cm) && existing.pdf_url) {
    return { patternId: existing.id, downloadUrl: null, hasPdfAlready: true }
  }

  const detail = await getRavelryPatternDetail(ravelryPatternId, userId)

  const richData = {
    title: detail.name || 'Untitled project',
    description: detail.notes ?? null,
    notes_html: detail.notes_html ?? null,
    craft_type: detail.craft ?? 'knitting',
    difficulty: detail.difficulty ? String(detail.difficulty) : null,
    garment_type: detail.pattern_categories?.[0] ?? null,
    designer_name: detail.designer ?? null,
    yarn_weight: detail.weight ?? null,
    needle_size_mm: detail.gauge_needle_mm ?? null,
    needle_sizes: detail.needle_sizes ?? [],
    sizes_available: detail.sizes_available ?? null,
    gauge_stitches_per_10cm: detail.gauge_stitches ?? null,
    gauge_rows_per_10cm: detail.gauge_rows ?? null,
    gauge_stitch_pattern: detail.gauge_stitch_pattern ?? null,
    rating: detail.rating ?? null,
    rating_count: detail.rating_count ?? null,
    yardage_min: detail.yardage_min,
    yardage_max: detail.yardage_max,
    source_url: detail.url,
    cover_image_url: detail.photo_url ?? null,
    ravelry_id: String(ravelryPatternId),
    source_free: detail.free,
  }

  let patternId: string

  if (existing) {
    await prisma.patterns.update({
      where: { id: existing.id },
      data: { ...richData, deleted_at: null }, // Undelete if soft-deleted (re-synced from library)
    })
    patternId = existing.id
  } else {
    const slug = await uniquePatternSlug(userId, detail.name)
    const created = await prisma.patterns.create({
      data: { user_id: userId, slug, ...richData },
    })
    patternId = created.id
  }

  // Store all photos
  if (detail.photos && detail.photos.length > 0) {
    await prisma.pattern_photos.deleteMany({ where: { pattern_id: patternId } })
    await prisma.pattern_photos.createMany({
      data: detail.photos.map((url: string, i: number) => ({
        pattern_id: patternId,
        url,
        sort_order: i,
      })),
    })
  }

  return {
    patternId,
    downloadUrl: detail.download_location?.url ?? null,
    hasPdfAlready: !!(existing?.pdf_url),
  }
}

/**
 * Download a PDF from Ravelry, store in Supabase, create pdf_uploads record, and link to pattern.
 * Used during library sync for patterns with download_location.
 * Returns true on success, false on failure (non-fatal).
 */
async function downloadAndAttachPdf(
  userId: string,
  patternId: string,
  ravelryId: number,
  downloadUrl: string,
  patternTitle: string,
): Promise<boolean> {
  try {
    const pdfBuffer = await fetchRavelryDownload(downloadUrl, userId)
    if (!pdfBuffer) return false
    if (pdfBuffer.length > MAX_PDF_SIZE) return false

    // Upload to Supabase Storage
    const timestamp = Date.now()
    const safeFileName = slugify(patternTitle).slice(0, 80)
    const storagePath = `${userId}/${timestamp}-ravelry-${ravelryId}-${safeFileName}.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PDF_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[ravelry-sync] PDF storage upload failed:', uploadError)
      return false
    }

    // Create signed URL (1 year)
    const { data: signedData } = await supabaseAdmin.storage
      .from(PDF_BUCKET)
      .createSignedUrl(storagePath, 365 * 24 * 3600)

    const pdfUrl = signedData?.signedUrl ?? null

    // Create pdf_uploads record
    const pdfUpload = await prisma.pdf_uploads.create({
      data: {
        user_id: userId,
        file_name: `${safeFileName}.pdf`,
        file_size: pdfBuffer.length,
        status: 'stored',
        storage_path: storagePath,
        pattern_id: patternId,
      },
    })

    // Update pattern with pdf_url
    await prisma.patterns.update({
      where: { id: patternId },
      data: { pdf_url: pdfUrl },
    })

    return true
  } catch (err) {
    console.error(`[ravelry-sync] PDF download failed for pattern ${ravelryId}:`, err)
    return false
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (_req, user) => {
  const connection = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
  if (!connection) return NextResponse.json({ error: 'Ravelry not connected' }, { status: 400 })

  // Concurrent import guard — but allow restart if stuck for more than 5 minutes
  if (connection.import_status === 'importing') {
    const updatedAt = connection.updated_at?.getTime() ?? 0
    const stuckThreshold = 5 * 60 * 1000 // 5 minutes
    if (Date.now() - updatedAt < stuckThreshold) {
      return NextResponse.json({ error: 'Import already in progress' }, { status: 409 })
    }
    // Stuck for over 5 minutes — allow restart
  }

  // TODO: Pro gate: free tier only gets first-time import
  // if (!user.is_pro && connection.synced_at) {
  //   const proError = requirePro(user, 'Ravelry re-sync')
  //   return proError!
  // }

  // Clear any stale errors from previous syncs before starting
  await prisma.ravelry_connections.update({
    where: { user_id: user.id },
    data: { import_status: 'importing', import_error: null, import_stats: undefined },
  })

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  // Verify OAuth tokens are still valid before starting the full sync
  try {
    const profile = await client.getProfile()
    console.log('[ravelry-sync] Profile check OK:', profile?.user?.username ?? 'no username')
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[ravelry-sync] Profile check FAILED:', errMsg)

    // Only return 401 if it's truly an auth error
    if (err instanceof RavelryAuthError) {
      await prisma.ravelry_connections.update({
        where: { user_id: user.id },
        data: {
          import_status: 'error',
          import_error: `Auth failed: ${errMsg}`,
        },
      })
      return NextResponse.json(
        { error: 'Ravelry session expired', code: 'RAVELRY_AUTH_EXPIRED', message: errMsg },
        { status: 401 }
      )
    }

    // Non-auth error (network, parsing, etc.) — log but continue with sync
    console.warn('[ravelry-sync] Profile check failed with non-auth error, continuing sync anyway:', errMsg)
  }

  const stats = {
    profile: { updated: false },
    projects: { imported: 0, updated: 0, total: 0 },
    patterns: { imported: 0, updated: 0, pdfs_downloaded: 0 },
    queue: { imported: 0, updated: 0 },
    stash: { imported: 0, updated: 0 },
    friends: { matched: 0, followed: 0, notOnStitch: 0 },
    push_back: { projects_created: 0, projects_updated: 0, photos_uploaded: 0, errors: 0 },
  }
  const errors: string[] = []

  // Helper to persist progress after each phase so iOS can poll
  async function updateProgress(phase: string) {
    await prisma.ravelry_connections.update({
      where: { user_id: user.id },
      data: { import_stats: { ...stats, current_phase: phase } },
    })
  }

  await updateProgress('profile')

  // ── Phase 1: Profile ─────────────────────────────────────────────────────
  try {
    const { user: profile } = await client.getProfile()
    await prisma.users.update({
      where: { id: user.id },
      data: {
        ...(user.bio == null && profile.about_me ? { bio: profile.about_me } : {}),
        ...(user.location == null && profile.location ? { location: profile.location } : {}),
        ...((user.avatar_source !== 'manual' && profile.small_photo_url) ? { avatar_url: profile.small_photo_url, avatar_source: 'ravelry' } : {}),
      },
    })
    stats.profile.updated = true
  } catch (err) {
    errors.push(`profile: ${err instanceof Error ? err.message : String(err)}`)
  }
  await updateProgress('projects')

  // ── Phase 2: Projects ────────────────────────────────────────────────────
  try {
    const summaries = await fetchAllPages<RavelryProjectSummary>(async page => {
      try {
        const res = await client.listProjects(page)
        return { items: res?.projects ?? [], pageCount: res?.paginator?.page_count ?? 0 }
      } catch {
        return { items: [] as RavelryProjectSummary[], pageCount: 0 }
      }
    })

    stats.projects.total = summaries.length

    await batchMap(summaries, 5, async summary => {
      try {
        const { project: detail } = await client.getProject(summary.permalink)
        const result = await importProjectDetail(user.id, summary, detail)
        if (result === 'imported') stats.projects.imported++
        else stats.projects.updated++
      } catch (err) {
        errors.push(`project ${summary.permalink}: ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  } catch (err) {
    errors.push(`projects: ${err instanceof Error ? err.message : String(err)}`)
  }
  await updateProgress('patterns')

  // ── Phase 3: Library (owned patterns) ────────────────────────────────────
  // Collect patterns that need PDF downloads for Phase 3b
  const pdfDownloadQueue: Array<{ patternId: string; ravelryId: number; downloadUrl: string; title: string }> = []

  try {
    const volumes = await fetchAllPages(async page => {
      try {
        const res = await client.listLibrary(page)
        console.log(`[ravelry-sync] Library page ${page}: ${res?.volumes?.length ?? 0} volumes, pageCount=${res?.paginator?.page_count ?? 0}`)
        return { items: res?.volumes ?? [], pageCount: res?.paginator?.page_count ?? 0 }
      } catch (err) {
        console.error('[ravelry-sync] Library fetch error:', err instanceof Error ? err.message : String(err))
        return { items: [] as any[], pageCount: 0 }
      }
    })
    console.log(`[ravelry-sync] Total library volumes: ${volumes.length}`)

    for (const vol of volumes) {
      // The search endpoint returns pattern_id as a top-level field.
      // The list endpoint returns a nested pattern object. Handle both.
      const ravelryPatternId = vol.pattern?.id ?? vol.pattern_id
      if (!ravelryPatternId) continue

      try {
        const existingBefore = await prisma.patterns.findFirst({
          where: { user_id: user.id, ravelry_id: String(ravelryPatternId) },
        })
        // Try rich upsert first, fall back to basic
        let result: PatternUpsertResult | null = null
        try {
          result = await upsertPatternRich(user.id, ravelryPatternId)
          console.log(`[ravelry-sync] Pattern ${ravelryPatternId}: downloadUrl=${result.downloadUrl?.slice(0, 60) ?? 'null'}, hasPdf=${result.hasPdfAlready}`)
        } catch (richErr) {
          console.error(`[ravelry-sync] upsertPatternRich failed for ${ravelryPatternId}:`, richErr instanceof Error ? richErr.message : String(richErr))
          // Fall back to basic upsert with data from the volume itself
          const patternName = vol.pattern?.name ?? vol.title ?? 'Untitled'
          const designerName = vol.pattern?.designer?.name ?? vol.author_name ?? null
          const permalink = vol.pattern?.permalink ?? null
          await upsertPattern(
            user.id,
            ravelryPatternId,
            patternName,
            designerName,
            permalink,
          )
        }

        // Queue PDF download if pattern has a Ravelry-hosted download URL.
        // Paid patterns use /purchase/ URLs which require browser session — OAuth can't access those.
        // Free Ravelry-hosted patterns use /dls/ or /dl/ URLs which work with OAuth.
        const dlUrl = result?.downloadUrl
        const isRavelryDownload = dlUrl && (dlUrl.includes('/dls/') || dlUrl.includes('/dl/')) && !dlUrl.includes('/purchase/')
        if (result && isRavelryDownload && !result.hasPdfAlready) {
          pdfDownloadQueue.push({
            patternId: result.patternId,
            ravelryId: ravelryPatternId,
            downloadUrl: dlUrl,
            title: vol.pattern?.name ?? vol.title ?? 'Untitled',
          })
        }

        // Also check existing patterns that may have been synced before but lack PDFs
        // (backwards compatibility: re-fetch download URL for patterns missing PDFs)
        if (!result && existingBefore && !existingBefore.pdf_url) {
          try {
            const detail = await getRavelryPatternDetail(ravelryPatternId, user.id)
            const backfillUrl = detail.download_location?.url
            if (backfillUrl && (backfillUrl.includes('/dls/') || backfillUrl.includes('/dl/')) && !backfillUrl.includes('/purchase/')) {
              pdfDownloadQueue.push({
                patternId: existingBefore.id,
                ravelryId: ravelryPatternId,
                downloadUrl: backfillUrl,
                title: vol.pattern?.name ?? vol.title ?? 'Untitled',
              })
            }
          } catch {
            // Non-fatal: pattern detail fetch failed, skip PDF
          }
        }

        if (existingBefore) stats.patterns.updated++
        else stats.patterns.imported++
      } catch (err) {
        errors.push(`library ${vol.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`library: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── Phase 3b: Download PDFs from library ─────────────────────────────────
  // Limit: max 5 PDFs per sync to avoid timeout. Prioritize patterns with active projects.
  // Remaining PDFs download on subsequent syncs.
  const MAX_PDFS_PER_SYNC = 5
  let pdfsDownloaded = 0
  await updateProgress('pdfs')

  // Prioritize: patterns the user has projects for come first
  const projectPatternIds = new Set(
    (await prisma.projects.findMany({
      where: { user_id: user.id, deleted_at: null, pattern_id: { not: null } },
      select: { pattern_id: true },
    })).map(p => p.pattern_id!)
  )

  // Sort free PDF queue: patterns with projects first
  pdfDownloadQueue.sort((a, b) => {
    const aHasProject = projectPatternIds.has(a.patternId) ? 0 : 1
    const bHasProject = projectPatternIds.has(b.patternId) ? 0 : 1
    return aHasProject - bHasProject
  })

  console.log(`[ravelry-sync] PDF queue: ${pdfDownloadQueue.length} free, limit: ${MAX_PDFS_PER_SYNC}`)

  // Strategy 1: Free pattern PDFs via direct download
  for (const job of pdfDownloadQueue) {
    if (pdfsDownloaded >= MAX_PDFS_PER_SYNC) break
    try {
      const success = await downloadAndAttachPdf(user.id, job.patternId, job.ravelryId, job.downloadUrl, job.title)
      if (success) { stats.patterns.pdfs_downloaded++; pdfsDownloaded++ }
    } catch (err) {
      errors.push(`pdf ${job.ravelryId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Strategy 2: Paid pattern PDFs via volume_attachments + generate_download_link
  if (pdfsDownloaded < MAX_PDFS_PER_SYNC) {
    try {
      const patternsNeedingPdf = await prisma.patterns.findMany({
        where: { user_id: user.id, ravelry_id: { not: null }, pdf_url: null, deleted_at: null },
        select: { id: true, ravelry_id: true, title: true },
      })

      // Prioritize patterns with projects
      patternsNeedingPdf.sort((a, b) => {
        const aP = projectPatternIds.has(a.id) ? 0 : 1
        const bP = projectPatternIds.has(b.id) ? 0 : 1
        return aP - bP
      })

      console.log(`[ravelry-sync] Patterns needing paid PDF: ${patternsNeedingPdf.length}`)

      const libraryVolumes = await fetchAllPages(async page => {
        try {
          const res = await client.listLibrary(page)
          return { items: res?.volumes ?? [], pageCount: res?.paginator?.page_count ?? 0 }
        } catch { return { items: [] as any[], pageCount: 0 } }
      })
      const volumeByPatternId = new Map<string, any>()
      for (const vol of libraryVolumes) {
        const pid = vol.pattern?.id ?? vol.pattern_id
        if (pid) volumeByPatternId.set(String(pid), vol)
      }

      for (const pattern of patternsNeedingPdf) {
        if (pdfsDownloaded >= MAX_PDFS_PER_SYNC) break
        if (!pattern.ravelry_id) continue
        const vol = volumeByPatternId.get(pattern.ravelry_id)
        if (!vol || !vol.has_downloads) continue

        try {
          const volDetail = await client.get<{ volume: any }>(`/volumes/${vol.id}.json`)
          const attachments = volDetail?.volume?.volume_attachments ?? []
          if (attachments.length === 0) continue

          const englishAtt = attachments.find((a: any) => a.language_code === 'en') ?? attachments[0]
          const attId = englishAtt.product_attachment_id
          if (!attId) continue

          console.log(`[ravelry-sync] Trying generate_download_link for ${pattern.title} (att ${attId})`)
          try {
            const dlRes = await client.post<{ download_link: { url: string } }>(
              `/product_attachments/${attId}/generate_download_link.json`
            )
            const pdfUrl = dlRes?.download_link?.url
            if (pdfUrl) {
              const success = await downloadAndAttachPdf(user.id, pattern.id, parseInt(pattern.ravelry_id), pdfUrl, pattern.title)
              if (success) {
                stats.patterns.pdfs_downloaded++; pdfsDownloaded++
                console.log(`[ravelry-sync] Paid PDF downloaded: ${pattern.title}`)
              }
            }
          } catch {
            console.log(`[ravelry-sync] generate_download_link failed for ${pattern.title} (scope issue)`)
          }
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      console.error('[ravelry-sync] Paid PDF phase error:', err)
    }
  }

  if (pdfsDownloaded >= MAX_PDFS_PER_SYNC) {
    console.log(`[ravelry-sync] Hit PDF limit (${MAX_PDFS_PER_SYNC}), remaining will download on next sync`)
  }

  await updateProgress('queue')

  // ── Phase 4: Queue ────────────────────────────────────────────────────────
  try {
    const queueItems = await fetchAllPages(async page => {
      try {
        const res = await client.listQueue(page)
        return { items: res?.queued_projects ?? [], pageCount: res?.paginator?.page_count ?? 0 }
      } catch {
        return { items: [] as any[], pageCount: 0 }
      }
    })

    for (const item of queueItems) {
      // Always try to fetch full pattern details (includes photos)
      const qPatternId = item.pattern?.id ?? item.pattern_id
      let patternInfo = item.pattern
      if (qPatternId) {
        try {
          const fetched = await client.getPattern(qPatternId)
          if (fetched.pattern) {
            patternInfo = fetched.pattern
          }
        } catch {
          // Pattern lookup failed — fall back to nested object
        }
      }
      if (!patternInfo) {
        if (item.pattern_id && item.short_pattern_name) {
          patternInfo = {
            id: item.pattern_id,
            name: item.short_pattern_name,
            permalink: '',
            designer: null,
          }
        } else {
          continue
        }
      }
      try {
        const existingQueueEntry = await prisma.pattern_queue.findFirst({
          where: { user_id: user.id, ravelry_queue_id: String(item.id) },
        })

        if (existingQueueEntry) {
          await prisma.pattern_queue.update({
            where: { id: existingQueueEntry.id },
            data: { notes: item.notes ?? null, sort_order: item.sort_order ?? item.position ?? 0 },
          })
          stats.queue.updated++
        } else {
          // Extract cover image from pattern photos
          const firstPhoto = patternInfo.photos?.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]
          const coverImageUrl = firstPhoto?.medium_url ?? firstPhoto?.small_url ?? null

          const patternId = await upsertPattern(
            user.id,
            patternInfo.id,
            patternInfo.name,
            patternInfo.designer?.name ?? null,
            patternInfo.permalink,
            coverImageUrl,
          )
          // Upsert queue entry by [user_id, pattern_id], stamp ravelry_queue_id
          await prisma.pattern_queue.upsert({
            where: { user_id_pattern_id: { user_id: user.id, pattern_id: patternId } },
            update: { ravelry_queue_id: String(item.id), notes: item.notes ?? null, sort_order: item.sort_order ?? item.position ?? 0 },
            create: {
              user_id: user.id,
              pattern_id: patternId,
              ravelry_queue_id: String(item.id),
              notes: item.notes ?? null,
              sort_order: item.sort_order ?? item.position ?? 0,
            },
          })
          stats.queue.imported++
        }
      } catch (err) {
        errors.push(`queue ${item.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`queue: ${err instanceof Error ? err.message : String(err)}`)
  }
  await updateProgress('stash')

  // ── Phase 5: Stash ────────────────────────────────────────────────────────
  try {
    const stashItems = await fetchAllPages(async page => {
      try {
        const res = await client.listStash(page)
        return { items: res?.stash ?? [], pageCount: res?.paginator?.page_count ?? 0 }
      } catch {
        return { items: [] as any[], pageCount: 0 }
      }
    })

    for (const item of stashItems) {
      try {
        // Resolve yarn catalog entry
        let yarnId: string

        if (item.yarn) {
          const companyName = item.yarn.company_name || 'Unknown'
          const company = await prisma.yarn_companies.upsert({
            where: { name: companyName },
            update: {},
            create: { name: companyName },
          })
          let yarn = await prisma.yarns.findFirst({ where: { ravelry_id: String(item.yarn.id) } })
          if (!yarn) {
            yarn = await prisma.yarns.create({
              data: {
                company_id: company.id,
                name: item.yarn.name,
                weight: item.yarn.weight ?? null,
                yardage_per_skein: item.yarn.yardage ?? null,
                grams_per_skein: item.yarn.grams ?? null,
                ravelry_id: String(item.yarn.id),
              },
            })
          }
          yarnId = yarn.id
        } else {
          // No linked yarn: create a placeholder
          const unknownCompany = await prisma.yarn_companies.upsert({
            where: { name: 'Unknown' },
            update: {},
            create: { name: 'Unknown' },
          })
          const placeholder = await prisma.yarns.findFirst({
            where: { name: item.name, company_id: unknownCompany.id },
          })
          yarnId = placeholder
            ? placeholder.id
            : (
                await prisma.yarns.create({
                  data: { company_id: unknownCompany.id, name: item.name },
                })
              ).id
        }

        // Map Ravelry stash_status to our status field
        // Ravelry uses: "stash" (default), "used" (used up), "trade" (for sale/trade)
        const ravelryStatus = item.stash_status?.id ?? item.stash_status_id
        let status = 'in_stash'
        if (ravelryStatus === 'used' || ravelryStatus === 2) status = 'used_up'
        else if (ravelryStatus === 'trade' || ravelryStatus === 3) status = 'for_sale'

        // Upsert stash item by ravelry_id
        const existingStash = await prisma.user_stash.findFirst({
          where: { user_id: user.id, ravelry_id: String(item.id) },
        })
        if (existingStash) {
          await prisma.user_stash.update({
            where: { id: existingStash.id },
            data: {
              yarn_id: yarnId,
              colorway: item.colorway ?? null,
              skeins: item.skeins ?? 1,
              grams: item.grams ?? null,
              notes: item.notes ?? null,
              status,
            },
          })
          stats.stash.updated++
        } else {
          await prisma.user_stash.create({
            data: {
              user_id: user.id,
              yarn_id: yarnId,
              ravelry_id: String(item.id),
              colorway: item.colorway ?? null,
              skeins: item.skeins ?? 1,
              grams: item.grams ?? null,
              notes: item.notes ?? null,
              status,
            },
          })
          stats.stash.imported++
        }
      } catch (err) {
        errors.push(`stash ${item.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`stash: ${err instanceof Error ? err.message : String(err)}`)
  }
  // Needles are Stitch-only — not synced from Ravelry

  await updateProgress('friends')

  // ── Phase 7: Friends ──────────────────────────────────────────────────
  try {
    const allFriends = await fetchAllPages(async page => {
      const res = await client.listFriends(page)
      return { items: res?.friendships ?? [], pageCount: res?.paginator?.page_count ?? 0 }
    })

    // Cross-reference ravelry usernames against ravelry_connections
    const ravelryUsernames = allFriends.map(f => f.friend_username)
    const matchedConnections = ravelryUsernames.length > 0
      ? await prisma.ravelry_connections.findMany({
          where: { ravelry_username: { in: ravelryUsernames } },
          select: { user_id: true, ravelry_username: true },
        })
      : []

    const matchedUserIds = new Set(matchedConnections.map(c => c.user_id))
    stats.friends.matched = matchedConnections.length
    stats.friends.notOnStitch = allFriends.length - matchedConnections.length

    // Auto-follow matched Stitch users (one-directional: syncing user follows the friend)
    for (const connection of matchedConnections) {
      if (connection.user_id === user.id) continue // don't follow self
      try {
        await prisma.follows.upsert({
          where: {
            follower_id_following_id: { follower_id: user.id, following_id: connection.user_id },
          },
          update: {},
          create: { follower_id: user.id, following_id: connection.user_id },
        })
        stats.friends.followed++
      } catch (err) {
        errors.push(`friend follow ${connection.ravelry_username}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`friends: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── Phase 7: Push Back to Ravelry ───────────────────────────────────────
  await updateProgress('push_back')
  try {
    // Find Stitch-only projects (no ravelry_id) to create on Ravelry
    const stitchOnlyProjects = await prisma.projects.findMany({
      where: { user_id: user.id, deleted_at: null, ravelry_id: null },
      select: { id: true, title: true, description: true, status: true, craft_type: true, started_at: true, finished_at: true, progress_pct: true },
    })

    for (const project of stitchOnlyProjects) {
      try {
        const ravelryId = await ravelryCreateProject(client, connection.ravelry_username, {
          name: project.title,
          notes: project.description ?? undefined,
          status: project.status,
          craft_type: project.craft_type,
          started_at: project.started_at,
          completed_at: project.finished_at,
          progress: project.progress_pct ?? undefined,
        })
        if (ravelryId) {
          await prisma.projects.update({ where: { id: project.id }, data: { ravelry_id: String(ravelryId) } })
          stats.push_back.projects_created++
        }
      } catch {
        stats.push_back.errors++
      }
    }

    // Find projects with ravelry_id that may have local changes → push updates
    const linkedProjects = await prisma.projects.findMany({
      where: { user_id: user.id, deleted_at: null, ravelry_id: { not: null } },
      select: { id: true, title: true, description: true, status: true, craft_type: true, started_at: true, finished_at: true, progress_pct: true, ravelry_id: true, updated_at: true },
    })

    for (const project of linkedProjects) {
      try {
        await ravelryUpdateProject(client, connection.ravelry_username, project.ravelry_id!, {
          name: project.title,
          notes: project.description,
          status: project.status,
          craft_type: project.craft_type,
          started_at: project.started_at,
          completed_at: project.finished_at,
          progress: project.progress_pct ?? undefined,
        })
        stats.push_back.projects_updated++
      } catch {
        stats.push_back.errors++
      }
    }

    // Queue project photos for background upload
    // Strategy: user photos first, then pattern cover as fallback
    await updateProgress('photos')
    let photosQueued = 0
    for (const project of linkedProjects) {
      try {
        // Check if Ravelry already has photos
        const ravelryProject = await client.post<{ project: { photos: Array<{ id: number }> } }>(
          `/projects/${connection.ravelry_username}/${project.ravelry_id}.json`,
          {}
        )
        if ((ravelryProject?.project?.photos?.length ?? 0) > 0) continue // Already has photos

        // Get user-uploaded project photos
        const localPhotos = await prisma.project_photos.findMany({
          where: { project_id: project.id },
          orderBy: { sort_order: 'asc' },
        })

        if (localPhotos.length > 0) {
          // Queue user photos
          for (const photo of localPhotos) {
            await prisma.ravelry_photo_queue.create({
              data: { user_id: user.id, entity_type: 'project', ravelry_id: project.ravelry_id!, photo_url: photo.url },
            })
            photosQueued++
          }
        } else {
          // No user photos — fall back to pattern cover image
          const fullProject = await prisma.projects.findUnique({
            where: { id: project.id },
            select: { pattern: { select: { cover_image_url: true } } },
          })
          const coverUrl = fullProject?.pattern?.cover_image_url
          if (coverUrl) {
            await prisma.ravelry_photo_queue.create({
              data: { user_id: user.id, entity_type: 'project', ravelry_id: project.ravelry_id!, photo_url: coverUrl },
            })
            photosQueued++
          }
        }
      } catch {
        // Non-critical
      }
    }

    // Push stash items without ravelry_id to Ravelry
    const stitchOnlyStash = await prisma.user_stash.findMany({
      where: { user_id: user.id, ravelry_id: null },
      include: { yarn: { include: { company: true } } },
    })

    for (const item of stitchOnlyStash) {
      try {
        const createRes = await client.post<{ stash: { id: number } }>(
          `/people/${connection.ravelry_username}/stash/create.json`
        )
        const ravelryStashId = createRes?.stash?.id
        if (ravelryStashId) {
          // Call 1: Set yarn_id
          const yarnUpdate: Record<string, unknown> = {}
          if (item.yarn?.ravelry_id) yarnUpdate.yarn_id = parseInt(item.yarn.ravelry_id)
          const initRes = await client.post<{ stash: { packs: Array<{ id: number }> } }>(
            `/people/${connection.ravelry_username}/stash/${ravelryStashId}.json`, yarnUpdate
          )
          const packId = initRes?.stash?.packs?.[0]?.id

          // Call 2: Flat fields
          await client.post(`/people/${connection.ravelry_username}/stash/${ravelryStashId}.json`, {
            notes: 'Synced from Stitch',
            location: 'Stitch app',
          })

          // Call 3: Pack data
          if (packId) {
            await client.post(`/people/${connection.ravelry_username}/stash/${ravelryStashId}.json`, {
              pack: { id: packId, skeins: item.skeins, ...(item.colorway ? { colorway: item.colorway } : {}) },
            })
          }

          // Call 4: Stash-level colorway
          if (item.colorway) {
            await client.post(`/people/${connection.ravelry_username}/stash/${ravelryStashId}.json`, {
              stash: { colorway_name: item.colorway },
            })
          }
          await prisma.user_stash.update({ where: { id: item.id }, data: { ravelry_id: String(ravelryStashId) } })
          stats.push_back.projects_created++
        }
      } catch {
        stats.push_back.errors++
      }
    }
    // Queue stash photos — user photo first, yarn product photo as fallback
    const allStashWithRavelry = await prisma.user_stash.findMany({
      where: { user_id: user.id, ravelry_id: { not: null } },
      select: { id: true, ravelry_id: true, photo_url: true, yarn: { select: { image_url: true } } },
    })
    for (const item of allStashWithRavelry) {
      try {
        // Check if Ravelry already has a photo
        const ravelryStash = await client.post<{ stash: { has_photo: boolean } }>(
          `/people/${connection.ravelry_username}/stash/${item.ravelry_id}.json`, {}
        )
        if (ravelryStash?.stash?.has_photo) continue

        // Pick best available photo: user custom → yarn product photo
        const photoUrl = item.photo_url || item.yarn?.image_url
        if (!photoUrl) continue

        await prisma.ravelry_photo_queue.create({
          data: { user_id: user.id, entity_type: 'stash', ravelry_id: item.ravelry_id!, photo_url: photoUrl },
        })
        photosQueued++
      } catch {
        // Skip
      }
    }
    stats.push_back.photos_uploaded = photosQueued
  } catch (err) {
    errors.push(`push_back: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── Finalize ─────────────────────────────────────────────────────────────
  // Always "done" — sync completed. Errors are informational, not fatal.
  await prisma.ravelry_connections.update({
    where: { user_id: user.id },
    data: {
      synced_at: new Date(),
      import_status: 'done',
      import_error: errors.length > 0 ? errors.slice(0, 10).join('; ') : null,
      import_stats: stats,
    },
  })

  return NextResponse.json({ success: true, data: { ...stats, errors } })
})
