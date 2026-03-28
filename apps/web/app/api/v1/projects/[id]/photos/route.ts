import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { createClient } from '@supabase/supabase-js'
import { moderateImage } from '@/lib/moderation'
import { getRavelryClient } from '@/lib/ravelry-client'
import { ravelryUploadPhoto } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'project-photos'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_PHOTOS = 10

// GET /api/v1/projects/:id/photos — list project photos
export const GET = withAuth(async (_req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const photos = await prisma.project_photos.findMany({
    where: { project_id: id },
    orderBy: { sort_order: 'asc' },
  })

  return NextResponse.json({ success: true, data: photos })
})

// POST /api/v1/projects/:id/photos — upload a project photo
export const POST = withAuth(async (req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Check photo limit
  const count = await prisma.project_photos.count({ where: { project_id: id } })
  if (count >= MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PHOTOS} photos per project`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const contentType = file.type
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Content moderation
  const moderation = await moderateImage(buffer, contentType)
  if (!moderation.safe) {
    return NextResponse.json(
      { error: 'CONTENT_REJECTED', message: moderation.reason ?? 'Image not appropriate' },
      { status: 422 }
    )
  }

  const ext = contentType.split('/')[1] ?? 'jpg'
  const fileName = `${Date.now()}.${ext}`
  const path = `${user.id}/${id}/${fileName}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  const photo = await prisma.project_photos.create({
    data: {
      project_id: id,
      url: urlData.publicUrl,
      sort_order: count,
    },
  })

  // Push photo to Ravelry project (non-blocking)
  const projectRecord = await prisma.projects.findUnique({ where: { id }, select: { ravelry_id: true } })
  if (projectRecord?.ravelry_id) {
    getRavelryClient(user.id).then(async (client) => {
      if (!client) return
      const conn = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
      if (!conn) return
      await ravelryUploadPhoto(client, 'project', conn.ravelry_username, projectRecord.ravelry_id!, buffer, contentType, fileName)
    }).catch(err => console.error('[ravelry-push] project photo:', err))
  }

  return NextResponse.json({ success: true, data: photo }, { status: 201 })
})

// DELETE /api/v1/projects/:id/photos — delete a photo (by photo_id in body)
export const DELETE = withAuth(async (req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  const { photo_id } = body
  if (!photo_id) return NextResponse.json({ error: 'photo_id is required' }, { status: 400 })

  const photo = await prisma.project_photos.findFirst({
    where: { id: photo_id, project_id: id },
  })
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

  await prisma.project_photos.delete({ where: { id: photo_id } })

  return NextResponse.json({ success: true })
})
