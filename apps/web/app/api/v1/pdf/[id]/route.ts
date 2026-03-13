import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

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
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const { id } = await params

  const upload = await prisma.pdf_uploads.findFirst({
    where: { id, user_id: user.id },
  })

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
}

/**
 * DELETE /api/v1/pdf/[id]
 * Delete a stored PDF — removes from Supabase Storage and DB.
 * Also clears references from any projects or queue items.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const { id } = await params

  const upload = await prisma.pdf_uploads.findFirst({
    where: { id, user_id: user.id },
  })

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
}
