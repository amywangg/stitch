import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { decrypt } from '@/lib/encrypt'
import { slugify } from '@/lib/utils'
import { RavelryClient } from '@/lib/ravelry-client'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'

export const maxDuration = 300

async function uniquePatternSlug(userId: string, base: string): Promise<string> {
  let slug = slugify(base)
  let attempt = 0
  while (await prisma.patterns.findUnique({ where: { user_id_slug: { user_id: userId, slug } } })) {
    attempt++
    slug = `${slugify(base)}-${attempt}`
  }
  return slug
}

/**
 * Upsert a pattern with full Ravelry detail data, photos, and free PDF download.
 */
async function upsertPatternRich(
  userId: string,
  ravelryPatternId: number,
): Promise<string> {
  const existing = await prisma.patterns.findFirst({
    where: { user_id: userId, ravelry_id: String(ravelryPatternId) },
  })

  // If we already have a rich record (has description or gauge), skip re-fetch
  if (existing && (existing.description || existing.gauge_stitches_per_10cm)) {
    return existing.id
  }

  const detail = await getRavelryPatternDetail(ravelryPatternId, userId)

  const richData = {
    title: detail.name,
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
      data: richData,
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
    // Delete existing photos and replace
    await prisma.pattern_photos.deleteMany({ where: { pattern_id: patternId } })
    await prisma.pattern_photos.createMany({
      data: detail.photos.map((url: string, i: number) => ({
        pattern_id: patternId,
        url,
        sort_order: i,
      })),
    })
  }

  // Auto-download free PDF if available and no PDF exists yet
  if (detail.free && detail.download_location?.url) {
    const hasPdf = await prisma.pdf_uploads.findFirst({
      where: { pattern_id: patternId, user_id: userId },
    })
    if (!hasPdf) {
      try {
        const dlRes = await fetch(detail.download_location.url, {
          redirect: 'follow',
          headers: { 'User-Agent': 'Stitch/1.0' },
        })
        if (dlRes.ok) {
          const arrayBuf = await dlRes.arrayBuffer()
          const pdfBuffer = Buffer.from(arrayBuf)
          const isPdf = pdfBuffer.length >= 100 && pdfBuffer.slice(0, 4).toString() === '%PDF'
          if (isPdf && pdfBuffer.length <= 20 * 1024 * 1024) {
            const timestamp = Date.now()
            const safeFileName = slugify(detail.name).slice(0, 80)
            const storagePath = `${userId}/${timestamp}-ravelry-${ravelryPatternId}-${safeFileName}.pdf`

            const { error: uploadError } = await supabaseAdmin.storage
              .from(BUCKET)
              .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

            if (!uploadError) {
              const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
              await prisma.pdf_uploads.create({
                data: {
                  user_id: userId,
                  pattern_id: patternId,
                  file_name: `${safeFileName}.pdf`,
                  file_size: pdfBuffer.length,
                  status: 'stored',
                  storage_path: storagePath,
                },
              })
              await prisma.patterns.update({
                where: { id: patternId },
                data: { pdf_url: urlData.publicUrl },
              })
            }
          }
        }
      } catch {
        // PDF download failed — non-critical
      }
    }
  }

  return patternId
}

/**
 * Basic upsert fallback when getRavelryPatternDetail is unavailable.
 */
async function upsertPatternBasic(
  userId: string,
  ravelryPatternId: number,
  title: string,
  designerName: string | null,
  permalink: string | null,
  coverImageUrl: string | null,
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

export async function POST(_req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const connection = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
  if (!connection) return NextResponse.json({ error: 'Ravelry not connected' }, { status: 400 })

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  const stats = { imported: 0, updated: 0, skipped: 0, ravelryTotal: 0 }
  const errors: string[] = []

  try {
    // First, do a raw fetch to see what Ravelry actually returns
    const rawRes = await client.listQueue(1)
    const items = rawRes.queued_projects
    if (!items) {
      const keys = Object.keys(rawRes).filter(k => k !== 'paginator')
      errors.push(`Ravelry returned keys: ${keys.join(', ')}. Expected 'queued_projects'.`)
      return NextResponse.json({ success: true, data: { ...stats, errors, rawKeys: keys } })
    }

    const queueItems = await fetchAllPages(async page => {
      const res = await client.listQueue(page)
      return { items: res.queued_projects ?? [], pageCount: res.paginator?.page_count ?? 1 }
    })
    stats.ravelryTotal = queueItems.length

    for (const item of queueItems) {
      const ravelryPatternId = item.pattern?.id ?? item.pattern_id
      if (!ravelryPatternId) {
        stats.skipped++
        continue
      }

      try {
        // Try rich upsert first (fetches full details, photos, free PDF)
        let patternId: string
        try {
          patternId = await upsertPatternRich(user.id, ravelryPatternId)
        } catch {
          // Fallback: try to get basic info from the queue item's nested pattern
          let patternInfo = item.pattern
          if (!patternInfo) {
            try {
              const fetched = await client.getPattern(ravelryPatternId)
              if (fetched.pattern) patternInfo = fetched.pattern
            } catch {
              // Pattern lookup failed entirely
            }
          }
          if (!patternInfo) {
            if (item.short_pattern_name) {
              patternInfo = { id: ravelryPatternId, name: item.short_pattern_name, permalink: '', designer: null }
            } else {
              stats.skipped++
              continue
            }
          }
          const firstPhoto = patternInfo.photos?.sort((a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]
          const coverImageUrl = firstPhoto?.medium_url ?? firstPhoto?.small_url ?? null
          patternId = await upsertPatternBasic(
            user.id,
            patternInfo.id,
            patternInfo.name,
            patternInfo.designer?.name ?? null,
            patternInfo.permalink,
            coverImageUrl,
          )
        }

        const existingQueueEntry = await prisma.pattern_queue.findFirst({
          where: { user_id: user.id, ravelry_queue_id: String(item.id) },
        })

        if (existingQueueEntry) {
          await prisma.pattern_queue.update({
            where: { id: existingQueueEntry.id },
            data: { notes: item.notes ?? null, sort_order: item.sort_order ?? item.position ?? 0 },
          })
          stats.updated++
        } else {
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
          stats.imported++
        }
      } catch (err) {
        errors.push(`queue ${item.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`queue fetch: ${err instanceof Error ? err.message : String(err)}`)
  }

  return NextResponse.json({ success: true, data: { ...stats, errors } })
}
