import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'
import { fetchRavelryDownload } from '@/lib/ravelry-download'
import { FREE_LIMITS } from '@/lib/pro-gate'
import { slugify } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'
const MAX_PDF_SIZE = 20 * 1024 * 1024 // 20 MB

/**
 * POST /api/v1/ravelry/patterns/:id/download
 * Download a free Ravelry pattern PDF → store in Supabase → create pattern record.
 * Returns the created pattern so the iOS app can navigate to it.
 */
export const POST = withAuth(async (_req, user, params) => {
  const ravelryId = parseInt(params!.id, 10)
  if (isNaN(ravelryId)) {
    return NextResponse.json({ error: 'Invalid pattern ID' }, { status: 400 })
  }

  // PDF storage is unlimited for all tiers

  // Check if we already have this pattern saved with a PDF
  const existing = await prisma.patterns.findFirst({
    where: { user_id: user.id, ravelry_id: String(ravelryId), deleted_at: null, pdf_url: { not: null } },
  })
  if (existing) {
    return NextResponse.json({ success: true, data: existing, message: 'Already downloaded' })
  }

  // Fetch pattern detail from Ravelry
  let detail
  try {
    detail = await getRavelryPatternDetail(ravelryId, user.id)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch pattern from Ravelry' },
      { status: 502 },
    )
  }

  if (!detail.download_location) {
    return NextResponse.json({ error: 'Pattern has no download link. It may require purchase on Ravelry first.' }, { status: 400 })
  }

  // Download the PDF from Ravelry's download URL (requires authentication)
  let pdfBuffer: Buffer
  try {
    const buf = await fetchRavelryDownload(detail.download_location.url, user.id)
    if (!buf) {
      return NextResponse.json(
        { error: 'Downloaded file is not a valid PDF' },
        { status: 502 },
      )
    }
    pdfBuffer = buf

    if (pdfBuffer.length > MAX_PDF_SIZE) {
      return NextResponse.json({ error: 'PDF is too large (max 20MB)' }, { status: 400 })
    }
  } catch (err) {
    console.error('[ravelry-download] fetch failed:', err)
    return NextResponse.json(
      { error: 'Failed to download pattern file from Ravelry' },
      { status: 502 },
    )
  }

  // Upload to Supabase Storage
  const timestamp = Date.now()
  const safeFileName = slugify(detail.name).slice(0, 80)
  const storagePath = `${user.id}/${timestamp}-ravelry-${ravelryId}-${safeFileName}.pdf`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    console.error('[ravelry-download] storage upload failed:', uploadError)
    return NextResponse.json({ error: 'Failed to store PDF' }, { status: 500 })
  }

  // Create signed URL for the PDF
  const { data: signedData } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 365 * 24 * 3600) // 1 year

  const pdfUrl = signedData?.signedUrl ?? null

  // Create pdf_uploads record
  const pdfUpload = await prisma.pdf_uploads.create({
    data: {
      user_id: user.id,
      file_name: `${safeFileName}.pdf`,
      file_size: pdfBuffer.length,
      status: 'stored',
      storage_path: storagePath,
    },
  })

  // Create or update pattern record
  const existingPattern = await prisma.patterns.findFirst({
    where: { user_id: user.id, ravelry_id: String(ravelryId) },
  })

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
    pdf_url: pdfUrl,
    cover_image_url: detail.photo_url ?? null,
    ravelry_id: String(ravelryId),
    source_free: detail.free,
  }

  let pattern
  if (existingPattern) {
    pattern = await prisma.patterns.update({
      where: { id: existingPattern.id },
      data: { ...richData, deleted_at: null },
    })
  } else {
    let slug = slugify(detail.name)
    let attempt = 0
    while (await prisma.patterns.findUnique({ where: { user_id_slug: { user_id: user.id, slug } } })) {
      attempt++
      slug = `${slugify(detail.name).slice(0, 80)}-${attempt}`
    }

    pattern = await prisma.patterns.create({
      data: {
        user_id: user.id,
        slug,
        ...richData,
      },
    })
  }

  // Link pdf_upload to pattern
  await prisma.pdf_uploads.update({
    where: { id: pdfUpload.id },
    data: { pattern_id: pattern.id },
  })

  // Store all photos
  if (detail.photos && detail.photos.length > 0) {
    await prisma.pattern_photos.deleteMany({ where: { pattern_id: pattern.id } })
    await prisma.pattern_photos.createMany({
      data: detail.photos.map((url: string, i: number) => ({
        pattern_id: pattern.id,
        url,
        sort_order: i,
      })),
    })
  }

  return NextResponse.json({ success: true, data: pattern }, { status: 201 })
})
