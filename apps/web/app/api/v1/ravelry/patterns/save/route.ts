import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'
import { fetchRavelryDownload } from '@/lib/ravelry-download'
import { slugify } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'

/**
 * POST /api/v1/ravelry/patterns/save
 * Save a Ravelry pattern to the user's pattern library.
 * Creates a full patterns record with all available Ravelry data.
 * Also creates a saved_patterns bookmark for deduplication.
 *
 * Body: { ravelry_id: number }
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const body = await req.json()
  const { ravelry_id } = body as { ravelry_id: number }

  if (!ravelry_id || typeof ravelry_id !== 'number') {
    return NextResponse.json({ error: 'ravelry_id (number) is required' }, { status: 400 })
  }

  // Check if already saved as a pattern
  const existingPattern = await prisma.patterns.findFirst({
    where: { user_id: user.id, ravelry_id: String(ravelry_id), deleted_at: null },
  })
  if (existingPattern) {
    return NextResponse.json({ success: true, data: existingPattern, message: 'Already saved' })
  }

  // Fetch fresh data from Ravelry
  let detail
  try {
    detail = await getRavelryPatternDetail(ravelry_id, user.id)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch pattern from Ravelry' },
      { status: 502 },
    )
  }

  // Generate unique slug
  let slug = slugify(detail.name)
  let attempt = 0
  while (await prisma.patterns.findUnique({ where: { user_id_slug: { user_id: user.id, slug } } })) {
    attempt++
    slug = `${slugify(detail.name)}-${attempt}`
  }

  // Create full pattern record with all Ravelry data
  const pattern = await prisma.patterns.create({
    data: {
      user_id: user.id,
      slug,
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
      ravelry_id: String(ravelry_id),
      source_free: detail.free,
    },
  })

  // Store all photos
  if (detail.photos && detail.photos.length > 0) {
    await prisma.pattern_photos.createMany({
      data: detail.photos.map((url: string, i: number) => ({
        pattern_id: pattern.id,
        url,
        sort_order: i,
      })),
    })
  }

  // Auto-download free PDF if available (best-effort, don't block save)
  if (detail.free && detail.download_location?.url) {
    try {
      const pdfBuffer = await fetchRavelryDownload(detail.download_location.url, user.id)

      if (pdfBuffer) {

        if (pdfBuffer.length <= 20 * 1024 * 1024) {
          const timestamp = Date.now()
          const safeFileName = slugify(detail.name).slice(0, 80)
          const storagePath = `${user.id}/${timestamp}-ravelry-${ravelry_id}-${safeFileName}.pdf`

          const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

          if (!uploadError) {
            const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)

            await prisma.pdf_uploads.create({
              data: {
                user_id: user.id,
                pattern_id: pattern.id,
                file_name: `${safeFileName}.pdf`,
                file_size: pdfBuffer.length,
                status: 'stored',
                storage_path: storagePath,
              },
            })

            await prisma.patterns.update({
              where: { id: pattern.id },
              data: { pdf_url: urlData.publicUrl },
            })
          }
        }
      }
    } catch {
      // PDF download failed — non-critical, pattern is still saved
    }
  }

  // Also create saved_patterns bookmark for dedup tracking
  await prisma.saved_patterns.upsert({
    where: { user_id_ravelry_id: { user_id: user.id, ravelry_id } },
    create: {
      user_id: user.id,
      ravelry_id: detail.ravelry_id,
      name: detail.name,
      permalink: detail.permalink,
      craft: detail.craft,
      weight: detail.weight,
      yardage_min: detail.yardage_min,
      yardage_max: detail.yardage_max,
      gauge: detail.gauge,
      needle_sizes: detail.needle_sizes,
      difficulty: detail.difficulty,
      photo_url: detail.photo_url,
      designer: detail.designer,
      free: detail.free,
    },
    update: {},
  })

  return NextResponse.json({ success: true, data: pattern }, { status: 201 })
}

/**
 * DELETE /api/v1/ravelry/patterns/save
 * Unsave a Ravelry pattern.
 *
 * Body: { ravelry_id: number }
 */
export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const body = await req.json()
  const { ravelry_id } = body as { ravelry_id: number }

  const existing = await prisma.saved_patterns.findUnique({
    where: { user_id_ravelry_id: { user_id: user.id, ravelry_id } },
  })

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.saved_patterns.delete({
    where: { user_id_ravelry_id: { user_id: user.id, ravelry_id } },
  })

  return NextResponse.json({ success: true })
}
