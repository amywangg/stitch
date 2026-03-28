import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, generateUniqueSlug } from '@/lib/route-helpers'
import { requirePro } from '@/lib/pro-gate'
import { extractPdfText } from '@/lib/pdf'
import { parsePatternMetadata } from '@/lib/openai'
import { autoFetchCoverImage } from '@/lib/pattern-cover'
import { searchRavelryPatterns } from '@/lib/ravelry-search'
import { createClient } from '@supabase/supabase-js'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'

export const maxDuration = 60 // seconds — allow time for AI parsing

/**
 * POST /api/v1/pdf/parse
 * Stage 1: Upload PDF -> extract text -> AI extracts metadata (title, sizes, gauge, sections).
 * Does NOT parse row-by-row instructions -- use POST /api/v1/patterns/[id]/apply-size for that.
 * Stores raw_text on the pattern for later re-parsing.
 *
 * Pro required.
 */
export const POST = withAuth(async (req, user) => {
  // AI parsing requires Pro
  const proError = requirePro(user, 'AI pattern parsing')
  if (proError) return proError

  let buffer: Buffer
  let fileName: string
  let fileSize: number
  let storagePath: string
  let existingUploadId: string | null = null

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    // Parse from an existing uploaded PDF
    const body = await req.json()
    const pdfUploadId = body.pdf_upload_id as string | undefined
    if (!pdfUploadId) {
      return NextResponse.json({ error: 'pdf_upload_id is required' }, { status: 400 })
    }

    const upload = await prisma.pdf_uploads.findFirst({
      where: { id: pdfUploadId, user_id: user.id },
    })
    if (!upload) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    // Download from storage
    const { data: fileData, error: dlError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(upload.storage_path)

    if (dlError || !fileData) {
      return NextResponse.json({ error: 'Failed to read stored PDF' }, { status: 500 })
    }

    buffer = Buffer.from(await fileData.arrayBuffer())
    fileName = upload.file_name
    fileSize = upload.file_size
    storagePath = upload.storage_path
    existingUploadId = upload.id
  } else {
    // Upload new PDF via multipart
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF must be under 20MB' }, { status: 400 })
    }

    buffer = Buffer.from(await file.arrayBuffer())
    fileName = file.name
    fileSize = file.size

    // Store the PDF
    const timestamp = Date.now()
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    storagePath = `${user.id}/${timestamp}-${safeFileName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('PDF storage failed:', uploadError)
      return NextResponse.json({ error: 'Failed to store PDF' }, { status: 500 })
    }
  }

  // Extract text
  let extractedText: string
  let pageCount: number

  try {
    const result = await extractPdfText(buffer)
    extractedText = result.text
    pageCount = result.pageCount
  } catch {
    return NextResponse.json({ error: 'Failed to extract text from PDF' }, { status: 422 })
  }

  if (extractedText.trim().length < 50) {
    return NextResponse.json(
      { error: 'PDF appears to be image-based or has no extractable text' },
      { status: 422 }
    )
  }

  // Stage 1: Parse metadata only (fast)
  let parsed
  try {
    parsed = await parsePatternMetadata(extractedText)
  } catch {
    return NextResponse.json({ error: 'AI parsing failed' }, { status: 500 })
  }

  // Save pattern shell + sizes to DB
  const title = parsed.title ?? fileName.replace(/\.pdf$/i, '')
  const slug = await generateUniqueSlug(prisma.patterns, user.id, title)

  const pattern = await prisma.patterns.create({
    data: {
      user_id: user.id,
      slug,
      title,
      description: parsed.notes ?? null,
      craft_type: parsed.craft_type ?? 'knitting',
      difficulty: parsed.difficulty ?? null,
      garment_type: parsed.garment_type ?? null,
      designer_name: parsed.designer ?? null,
      yarn_weight: parsed.yarn_weight ?? null,
      needle_size_mm: parsed.gauge?.needle_size_mm ?? null,
      gauge_stitches_per_10cm: parsed.gauge?.stitches_per_10cm ?? null,
      gauge_rows_per_10cm: parsed.gauge?.rows_per_10cm ?? null,
      ai_parsed: true,
      raw_text: extractedText,
      source_free: false,
      pdf_url: (() => {
        const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
        return data.publicUrl
      })(),
      // Create section shells (no rows yet — those come in Stage 2)
      sections: {
        create: parsed.sections.map((section, idx) => ({
          name: section.name,
          sort_order: idx,
        })),
      },
      // Create sizes with measurements
      sizes: {
        create: parsed.sizes.map((size, idx) => ({
          name: size.name,
          sort_order: idx,
          finished_bust_cm: size.finished_bust_cm,
          finished_length_cm: size.finished_length_cm,
          hip_cm: size.hip_cm,
          shoulder_width_cm: size.shoulder_width_cm,
          arm_length_cm: size.arm_length_cm,
          upper_arm_cm: size.upper_arm_cm,
          back_length_cm: size.back_length_cm,
          head_circumference_cm: size.head_circumference_cm,
          foot_length_cm: size.foot_length_cm,
          yardage: size.yardage,
        })),
      },
    },
    include: {
      sections: { orderBy: { sort_order: 'asc' } },
      sizes: { orderBy: { sort_order: 'asc' } },
    },
  })

  // Create or update pdf_uploads record
  if (existingUploadId) {
    await prisma.pdf_uploads.update({
      where: { id: existingUploadId },
      data: { pattern_id: pattern.id, status: 'parsed' },
    })
  } else {
    await prisma.pdf_uploads.create({
      data: {
        user_id: user.id,
        pattern_id: pattern.id,
        file_name: fileName,
        file_size: fileSize,
        status: 'parsed',
        storage_path: storagePath,
      },
    })
  }

  // Search Ravelry for matching patterns (best-effort, never blocks)
  let ravelryMatches: Array<{
    ravelry_id: number
    name: string
    permalink: string
    craft: string
    weight: string | null
    designer: string | null
    photo_url: string | null
    free: boolean
    difficulty: number | null
    rating: number | null
  }> = []

  try {
    const searchQuery = parsed.designer ? `${title} ${parsed.designer}` : title
    const result = await searchRavelryPatterns(
      { query: searchQuery, photo: 'yes', page_size: 5, sort: 'best' },
      user.id,
    )
    ravelryMatches = result.patterns

    // Auto-set cover image from the best match
    if (ravelryMatches.length > 0) {
      const titleLower = title.toLowerCase().trim()
      const exactMatch = ravelryMatches.find(
        m => m.name.toLowerCase().trim() === titleLower,
      )
      const best = exactMatch ?? ravelryMatches[0]
      if (best.photo_url) {
        await prisma.patterns.update({
          where: { id: pattern.id },
          data: { cover_image_url: best.photo_url },
        })
      }
    }
  } catch {
    // Ravelry search failed — not critical, continue without matches
    // Fall back to existing auto-fetch as backup
    autoFetchCoverImage(pattern.id, title, parsed.designer).catch(() => {})
  }

  // Get the PDF storage URL for the response
  const { data: pdfUrlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath)

  return NextResponse.json({
    success: true,
    data: {
      pattern: { ...pattern, pdf_url: pdfUrlData.publicUrl },
      meta: {
        page_count: pageCount,
        parsed_title: parsed.title,
        parsed_designer: parsed.designer,
        gauge: parsed.gauge,
      },
      ravelry_matches: ravelryMatches,
      next_step: ravelryMatches.length > 0 ? 'link_ravelry' : 'select_size',
    },
  })
})
