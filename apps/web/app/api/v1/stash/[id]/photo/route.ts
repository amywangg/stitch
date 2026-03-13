import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { moderateImage } from '@/lib/moderation'
import { FREE_LIMITS } from '@/lib/pro-gate'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'stash-photos'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

type Params = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const item = await prisma.user_stash.findFirst({ where: { id: params.id, user_id: user.id } })
  if (!item) return NextResponse.json({ error: 'Stash item not found' }, { status: 404 })

  // Free-tier photo limit (replacing an existing photo doesn't count as new)
  if (!user.is_pro && !item.photo_url) {
    const photoCount = await prisma.user_stash.count({
      where: { user_id: user.id, photo_url: { not: null } },
    })
    if (photoCount >= FREE_LIMITS.stashPhotos) {
      return NextResponse.json(
        {
          error: 'FREE_LIMIT_REACHED',
          message: `Free accounts can upload up to ${FREE_LIMITS.stashPhotos} stash photos. Upgrade to Pro for unlimited.`,
          upgrade_url: '/settings/billing',
        },
        { status: 403 }
      )
    }
  }

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

  // Content moderation
  const moderation = await moderateImage(buffer, file.type)
  if (!moderation.safe) {
    return NextResponse.json(
      { error: 'CONTENT_REJECTED', message: moderation.reason ?? 'Image not appropriate' },
      { status: 422 }
    )
  }

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
    console.error('[stash-photo] upload failed:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`

  const updated = await prisma.user_stash.update({
    where: { id: item.id },
    data: { photo_url: photoUrl, photo_path: path },
    include: { yarn: { include: { company: true } } },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const item = await prisma.user_stash.findFirst({ where: { id: params.id, user_id: user.id } })
  if (!item) return NextResponse.json({ error: 'Stash item not found' }, { status: 404 })

  if (item.photo_path) {
    await supabaseAdmin.storage.from(BUCKET).remove([item.photo_path])
  }

  await prisma.user_stash.update({
    where: { id: item.id },
    data: { photo_url: null, photo_path: null },
  })

  return NextResponse.json({ success: true, message: 'Photo deleted' })
}
