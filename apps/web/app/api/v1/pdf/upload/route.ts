import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { FREE_LIMITS } from '@/lib/pro-gate'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

/**
 * POST /api/v1/pdf/upload
 * Upload and store a PDF privately. Available to all users.
 * Creates a pdf_uploads record. Does NOT create a pattern.
 * The PDF can later be attached to projects or queue items,
 * and optionally AI-parsed into a structured pattern.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  // Enforce stored PDFs limit for free users
  if (!user.is_pro) {
    const storedCount = await prisma.pdf_uploads.count({
      where: { user_id: user.id },
    })
    if (storedCount >= FREE_LIMITS.storedPdfs) {
      return NextResponse.json(
        {
          error: 'Stored PDF limit reached',
          code: 'FREE_LIMIT_REACHED',
          message: `Free accounts can store up to ${FREE_LIMITS.storedPdfs} PDFs. Upgrade to Pro for unlimited storage.`,
          upgrade_url: '/settings/billing',
        },
        { status: 403 }
      )
    }
  }

  const formData = await req.formData()
  const patternId = formData.get('pattern_id') as string | null
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'PDF must be under 20MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const timestamp = Date.now()
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${user.id}/${timestamp}-${safeFileName}`

  // Upload to Supabase Storage (private bucket — no public URL)
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    console.error('PDF storage upload failed:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // If pattern_id provided, verify ownership
  if (patternId) {
    const pattern = await prisma.patterns.findFirst({
      where: { id: patternId, user_id: user.id, deleted_at: null },
    })
    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
    }
  }

  const pdfUpload = await prisma.pdf_uploads.create({
    data: {
      user_id: user.id,
      pattern_id: patternId ?? undefined,
      file_name: file.name,
      file_size: file.size,
      status: 'stored',
      storage_path: storagePath,
    },
  })

  return NextResponse.json({ success: true, data: pdfUpload })
}
