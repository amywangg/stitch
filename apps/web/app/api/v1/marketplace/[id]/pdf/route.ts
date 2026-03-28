import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { watermarkPdf } from '@/lib/pdf-watermark'
import { createClient } from '@supabase/supabase-js'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'
const MAX_VIEWS_PER_HOUR = 20

/**
 * GET /api/v1/marketplace/[id]/pdf
 * Returns a watermarked PDF for a purchased pattern.
 *
 * Security layers:
 * 1. Auth + ownership/purchase check
 * 2. Rate limiting (max 20 views/hour)
 * 3. Access logging (IP, user agent, timestamp)
 * 4. Per-buyer watermarking (username + transaction ID on every page)
 * 5. No raw URL — PDF bytes streamed through our API
 */
export const GET = withAuth(async (req: NextRequest, user, params) => {
  const patternId = params!.id

  // Find pattern with its PDF
  const pattern = await prisma.patterns.findFirst({
    where: { id: patternId, deleted_at: null },
    include: {
      pdf_uploads: {
        where: { status: 'stored' },
        orderBy: { created_at: 'desc' },
        take: 1,
      },
    },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  if (!pattern.pdf_uploads.length) {
    return NextResponse.json({ error: 'No PDF available' }, { status: 404 })
  }

  const pdfUpload = pattern.pdf_uploads[0]
  const isOwner = pattern.user_id === user.id
  const isFree = pattern.price_cents === null || pattern.price_cents === 0

  // Check access
  let purchaseId: string | null = null
  if (!isOwner && !isFree) {
    const purchase = await prisma.pattern_purchases.findUnique({
      where: {
        buyer_id_pattern_id: { buyer_id: user.id, pattern_id: patternId },
      },
    })
    if (purchase?.status !== 'completed') {
      return NextResponse.json(
        { error: 'Purchase required', code: 'PURCHASE_REQUIRED' },
        { status: 403 }
      )
    }
    purchaseId = purchase.id
  }

  // Rate limiting — max views per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentViews = await prisma.pdf_access_logs.count({
    where: {
      user_id: user.id,
      pdf_upload_id: pdfUpload.id,
      created_at: { gte: oneHourAgo },
    },
  })

  if (recentViews >= MAX_VIEWS_PER_HOUR) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  // Log access
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) || null

  await prisma.pdf_access_logs.create({
    data: {
      user_id: user.id,
      pdf_upload_id: pdfUpload.id,
      pattern_id: patternId,
      ip_address: ip,
      user_agent: userAgent,
      access_type: isOwner ? 'view' : 'watermarked_view',
    },
  })

  // Download raw PDF from storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(pdfUpload.storage_path)

  if (downloadError || !fileData) {
    console.error('PDF download failed:', downloadError)
    return NextResponse.json({ error: 'Failed to retrieve PDF' }, { status: 500 })
  }

  const pdfBytes = Buffer.from(await fileData.arrayBuffer())

  // If owner, return raw PDF. If buyer, watermark it.
  let outputBytes: Uint8Array | Buffer
  if (isOwner) {
    outputBytes = pdfBytes
  } else {
    try {
      outputBytes = await watermarkPdf(pdfBytes, {
        buyerUsername: user.username,
        transactionId: purchaseId || user.id,
        purchaseDate: new Date(),
      })
    } catch (err) {
      console.error('Watermarking failed:', err)
      // Fail closed — don't serve unwatermarked PDF to non-owners
      return NextResponse.json({ error: 'PDF processing failed' }, { status: 500 })
    }
  }

  // Return PDF as binary response
  const responseBuffer = Buffer.from(outputBytes)
  return new NextResponse(responseBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(pattern.title)}.pdf"`,
      'Content-Length': outputBytes.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  })
})
