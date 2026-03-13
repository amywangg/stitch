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

type Params = { params: Promise<{ id: string }> }

/**
 * PUT /api/v1/patterns/[id]/cover
 * Update the cover image for a pattern.
 *
 * Accepts either:
 * - multipart/form-data with a "file" field (image upload)
 * - application/json with { "url": "https://..." } (external URL)
 *
 * The user can replace the auto-fetched cover with their own image.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const pattern = await prisma.patterns.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
  })
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const contentType = req.headers.get('content-type') ?? ''
  let coverImageUrl: string

  if (contentType.includes('application/json')) {
    // Set cover from an external URL
    const body = await req.json()
    const url = body.url as string | undefined
    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }
    coverImageUrl = url
  } else {
    // Upload image file
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are accepted' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
    const storagePath = `${user.id}/covers/${pattern.id}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Cover upload failed:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    coverImageUrl = urlData.publicUrl
  }

  const updated = await prisma.patterns.update({
    where: { id },
    data: { cover_image_url: coverImageUrl },
  })

  return NextResponse.json({
    success: true,
    data: { id: updated.id, cover_image_url: updated.cover_image_url },
  })
}

/**
 * DELETE /api/v1/patterns/[id]/cover
 * Remove the cover image.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const pattern = await prisma.patterns.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
  })
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  await prisma.patterns.update({
    where: { id },
    data: { cover_image_url: null },
  })

  return NextResponse.json({ success: true })
}
