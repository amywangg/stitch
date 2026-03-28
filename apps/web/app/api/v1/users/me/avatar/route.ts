import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { createClient } from '@supabase/supabase-js'
import { moderateImage } from '@/lib/moderation'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'avatars'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export const POST = withAuth(async (req, user) => {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
  }

  const contentType = file.type
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  const ext = contentType.split('/')[1] ?? 'jpg'
  const path = `${user.id}/avatar.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  // Content moderation
  const moderation = await moderateImage(buffer, contentType)
  if (!moderation.safe) {
    return NextResponse.json(
      { error: 'CONTENT_REJECTED', message: moderation.reason ?? 'Image not appropriate' },
      { status: 422 }
    )
  }

  // Upload to Supabase Storage (overwrites existing)
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  // Append cache-buster so CDN serves the new image
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

  // Update user record
  await prisma.users.update({
    where: { id: user.id },
    data: { avatar_url: avatarUrl, avatar_source: 'manual' },
  })

  return NextResponse.json({ success: true, data: { avatarUrl } })
})
