import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'
import { createClient } from '@supabase/supabase-js'
import { validateSwatchPhoto } from '@/lib/moderation'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'swatch-photos'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

// POST /api/v1/swatches/photo — upload a swatch photo with validation
export const POST = withAuth(async (req, user) => {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use JPEG, PNG, or WebP.' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Validate: safe + contains yarn/fabric
  const validation = await validateSwatchPhoto(buffer, file.type)
  if (!validation.safe) {
    return NextResponse.json(
      { error: 'CONTENT_REJECTED', message: validation.reason ?? 'Image not appropriate for this community.' },
      { status: 422 }
    )
  }

  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const uniqueId = crypto.randomUUID()
  const path = `${user.id}/${uniqueId}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[swatch-photo] upload failed:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({
    success: true,
    data: {
      url: urlData.publicUrl,
      path,
      containsYarnOrFabric: validation.containsYarnOrFabric,
      warning: !validation.containsYarnOrFabric
        ? "This doesn't look like it contains yarn or knitted fabric. You can still use it."
        : undefined,
    },
  })
})
