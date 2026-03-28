import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { createClient } from '@supabase/supabase-js'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'

/**
 * GET /api/v1/pdf/[id]
 * Returns a short-lived signed URL for viewing the PDF.
 * Only the owning user can access their PDFs.
 */
export const GET = withAuth(async (_req, user, params) => {
  const id = params!.id

  const upload = await findOwned<{
    id: string; file_name: string; file_size: number; status: string; storage_path: string
  }>(prisma.pdf_uploads, id, user.id, { softDelete: false })

  if (!upload) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Generate signed URL (1 hour expiry)
  const { data, error: signError } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(upload.storage_path, 3600)

  if (signError || !data?.signedUrl) {
    console.error('Failed to create signed URL:', signError)
    return NextResponse.json({ error: 'Failed to generate PDF URL' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: {
      id: upload.id,
      fileName: upload.file_name,
      fileSize: upload.file_size,
      status: upload.status,
      url: data.signedUrl,
      expiresIn: 3600,
    },
  })
})

/**
 * DELETE /api/v1/pdf/[id]
 * Delete a stored PDF — removes from Supabase Storage and DB.
 * Also clears references from any projects or queue items.
 */
export const DELETE = withAuth(async (_req, user, params) => {
  const id = params!.id

  const upload = await findOwned<{
    id: string; storage_path: string
  }>(prisma.pdf_uploads, id, user.id, { softDelete: false })

  if (!upload) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete from Supabase Storage
  const { error: storageError } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([upload.storage_path])

  if (storageError) {
    console.error('Failed to delete from storage:', storageError)
  }

  // Clear references from projects and queue items, then delete
  await prisma.$transaction([
    prisma.projects.updateMany({
      where: { pdf_upload_id: id, user_id: user.id },
      data: { pdf_upload_id: null },
    }),
    prisma.pattern_queue.updateMany({
      where: { pdf_upload_id: id, user_id: user.id },
      data: { pdf_upload_id: null },
    }),
    prisma.pdf_uploads.delete({ where: { id } }),
  ])

  return NextResponse.json({ success: true })
})
