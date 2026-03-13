import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { requirePro, FREE_LIMITS } from '@/lib/pro-gate'
import { extractPdfText } from '@/lib/pdf'
import { parsePatternWithAI } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'

export const maxDuration = 60 // seconds — allow time for AI parsing

/**
 * POST /api/v1/pdf/parse
 * Accepts a PDF file (or an existing pdf_upload_id) as input.
 * Extracts text, parses with GPT-4o, and saves the result as a pattern.
 * Links the pdf_upload to the new pattern.
 *
 * Pro required.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

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

  // Parse with AI
  let parsed
  try {
    parsed = await parsePatternWithAI(extractedText)
  } catch {
    return NextResponse.json({ error: 'AI parsing failed' }, { status: 500 })
  }

  // Save pattern to DB
  const title = parsed.title ?? fileName.replace(/\.pdf$/i, '')
  let slug = slugify(title)
  let attempt = 0
  while (await prisma.patterns.findUnique({ where: { user_id_slug: { user_id: user.id, slug } } })) {
    attempt++
    slug = `${slugify(title)}-${attempt}`
  }

  const pattern = await prisma.patterns.create({
    data: {
      user_id: user.id,
      slug,
      title,
      description: parsed.notes ?? null,
      craft_type: parsed.craft_type ?? 'knitting',
      difficulty: parsed.difficulty ?? null,
      garment_type: parsed.garment_type ?? null,
      ai_parsed: true,
      sections: {
        create: parsed.sections.map((section, sectionIdx) => ({
          name: section.name,
          sort_order: sectionIdx,
          rows: {
            create: section.rows.map((row) => ({
              row_number: row.row_number,
              instruction: row.instruction,
            })),
          },
        })),
      },
    },
    include: { sections: { include: { rows: true } } },
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

  return NextResponse.json({
    success: true,
    data: {
      pattern,
      meta: {
        page_count: pageCount,
        parsed_title: parsed.title,
        parsed_designer: parsed.designer,
        gauge: parsed.gauge,
        sizes: parsed.sizes,
      },
    },
  })
}
