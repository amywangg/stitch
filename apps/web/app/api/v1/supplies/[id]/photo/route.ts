import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { createClient } from '@supabase/supabase-js'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'supply-photos'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export const POST = withAuth(async (req, user, params) => {
  const id = params!.id

  const item = await findOwned<{ id: string; photo_path: string | null }>(
    prisma.user_supplies, id, user.id, { softDelete: false }
  )
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use JPEG, PNG, or WebP.' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const path = `${user.id}/${item.id}.${ext}`

  // Delete old photo if exists
  if (item.photo_path) {
    await supabaseAdmin.storage.from(BUCKET).remove([item.photo_path])
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[supply-photo] upload failed:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`

  const updated = await prisma.user_supplies.update({
    where: { id: item.id },
    data: { photo_url: photoUrl, photo_path: path },
  })

  return NextResponse.json({ success: true, data: updated })
})

export const DELETE = withAuth(async (_req, user, params) => {
  const id = params!.id

  const item = await findOwned<{ id: string; photo_path: string | null }>(
    prisma.user_supplies, id, user.id, { softDelete: false }
  )
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (item.photo_path) {
    await supabaseAdmin.storage.from(BUCKET).remove([item.photo_path])
  }

  await prisma.user_supplies.update({
    where: { id: item.id },
    data: { photo_url: null, photo_path: null },
  })

  return NextResponse.json({ success: true, data: {} })
})
