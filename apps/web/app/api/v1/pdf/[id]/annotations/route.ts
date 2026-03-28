import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { annotationDataSchema } from '@/lib/schemas/annotations'


export const dynamic = 'force-dynamic'
// GET /api/v1/pdf/:id/annotations — load annotations for current user + PDF
export const GET = withAuth(async (req, user, params) => {
  const { id } = params!

  // Verify user owns or has access to this PDF
  const pdf = await prisma.pdf_uploads.findFirst({
    where: { id, user_id: user.id },
  })
  if (!pdf) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const record = await prisma.pdf_annotations.findUnique({
    where: { user_id_pdf_upload_id: { user_id: user.id, pdf_upload_id: id } },
  })

  return NextResponse.json({
    success: true,
    data: record ? { annotations: record.annotation_data } : { annotations: [] },
  })
})

// PUT /api/v1/pdf/:id/annotations — upsert annotations for current user + PDF
export const PUT = withAuth(async (req, user, params) => {
  const { id } = params!

  // Verify user owns or has access to this PDF
  const pdf = await prisma.pdf_uploads.findFirst({
    where: { id, user_id: user.id },
  })
  if (!pdf) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = annotationDataSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const record = await prisma.pdf_annotations.upsert({
    where: { user_id_pdf_upload_id: { user_id: user.id, pdf_upload_id: id } },
    create: {
      user_id: user.id,
      pdf_upload_id: id,
      annotation_data: parsed.data.annotations as any,
    },
    update: {
      annotation_data: parsed.data.annotations as any,
    },
  })

  return NextResponse.json({ success: true, data: { id: record.id } })
})
