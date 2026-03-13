import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'
import { FREE_LIMITS } from '@/lib/pro-gate'
import { slugify } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'
const MAX_PDF_SIZE = 20 * 1024 * 1024 // 20 MB

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/ravelry/patterns/:id/download
 * Download a free Ravelry pattern PDF → store in Supabase → create pattern record.
 * Returns the created pattern so the iOS app can navigate to it.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const ravelryId = parseInt(id, 10)
  if (isNaN(ravelryId)) {
    return NextResponse.json({ error: 'Invalid pattern ID' }, { status: 400 })
  }

  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  // Check PDF storage limit for free users
  if (!user.is_pro) {
    const storedCount = await prisma.pdf_uploads.count({ where: { user_id: user.id } })
    if (storedCount >= FREE_LIMITS.storedPdfs) {
      return NextResponse.json(
        {
          error: 'FREE_LIMIT_REACHED',
          message: `Free accounts can store up to ${FREE_LIMITS.storedPdfs} PDFs. Upgrade to Pro for unlimited storage.`,
        },
        { status: 403 },
      )
    }
  }

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

  if (!detail.free || !detail.download_location) {
    return NextResponse.json({ error: 'Pattern is not free or has no download link' }, { status: 400 })
  }

  // Download the PDF from Ravelry's download URL
  let pdfBuffer: Buffer
  let contentType = 'application/pdf'
  try {
    const dlRes = await fetch(detail.download_location.url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Stitch/1.0' },
    })

    if (!dlRes.ok) {
      return NextResponse.json(
        { error: `Download failed: ${dlRes.status}` },
        { status: 502 },
      )
    }

    contentType = dlRes.headers.get('content-type') ?? 'application/pdf'

    // Verify it's actually a PDF
    const arrayBuf = await dlRes.arrayBuffer()
    pdfBuffer = Buffer.from(arrayBuf)

    if (pdfBuffer.length > MAX_PDF_SIZE) {
      return NextResponse.json({ error: 'PDF is too large (max 20MB)' }, { status: 400 })
    }

    if (pdfBuffer.length < 100) {
      return NextResponse.json(
        { error: 'Downloaded file is too small — may not be a valid PDF' },
        { status: 502 },
      )
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
  const ext = contentType.includes('pdf') ? 'pdf' : 'pdf'
  const storagePath = `${user.id}/${timestamp}-ravelry-${ravelryId}-${safeFileName}.${ext}`

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

  let pattern
  if (existingPattern) {
    pattern = await prisma.patterns.update({
      where: { id: existingPattern.id },
      data: { pdf_url: pdfUrl, deleted_at: null },
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
        title: detail.name,
        craft_type: detail.craft,
        difficulty: detail.difficulty ? String(detail.difficulty) : null,
        designer_name: detail.designer,
        yarn_weight: detail.weight,
        yardage_min: detail.yardage_min,
        yardage_max: detail.yardage_max,
        source_url: detail.url,
        pdf_url: pdfUrl,
        cover_image_url: detail.photo_url,
        ravelry_id: String(ravelryId),
      },
    })
  }

  // Link pdf_upload to pattern
  await prisma.pdf_uploads.update({
    where: { id: pdfUpload.id },
    data: { pattern_id: pattern.id },
  })

  return NextResponse.json({ success: true, data: pattern }, { status: 201 })
}
