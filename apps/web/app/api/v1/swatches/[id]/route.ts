import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
const SWATCH_INCLUDE = {
  yarns: {
    orderBy: { sort_order: 'asc' as const },
    include: {
      yarn: { include: { company: true } },
      stash_item: true,
    },
  },
  user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
  projects: { include: { project: { select: { id: true, title: true, slug: true } } } },
  patterns: { include: { pattern: { select: { id: true, title: true, slug: true } } } },
}

// GET /api/v1/swatches/:id — get swatch detail (own or public)
export const GET = withAuth(async (_req, user, params) => {
  const { id } = params!

  const swatch = await prisma.swatches.findFirst({
    where: {
      id,
      deleted_at: null,
      OR: [
        { user_id: user.id },
        { is_public: true },
      ],
    },
    include: SWATCH_INCLUDE,
  })

  if (!swatch) return NextResponse.json({ error: 'Swatch not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: swatch })
})

// PATCH /api/v1/swatches/:id — update swatch (owner only)
export const PATCH = withAuth(async (req, user, params) => {
  const { id } = params!

  const swatch = await prisma.swatches.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
  })
  if (!swatch) return NextResponse.json({ error: 'Swatch not found' }, { status: 404 })

  const body = await req.json()
  const allowed = [
    'title', 'notes', 'is_public', 'craft_type', 'stitch_pattern',
    'stitches_per_10cm', 'rows_per_10cm', 'needle_size_mm', 'needle_size_label',
    'needle_type', 'washed', 'blocked', 'width_cm', 'height_cm',
    'photo_url', 'photo_path',
  ] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await prisma.swatches.update({
    where: { id },
    data: updates,
    include: SWATCH_INCLUDE,
  })

  return NextResponse.json({ success: true, data: updated })
})

// DELETE /api/v1/swatches/:id — soft-delete swatch (owner only)
export const DELETE = withAuth(async (_req, user, params) => {
  const { id } = params!

  const swatch = await prisma.swatches.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
  })
  if (!swatch) return NextResponse.json({ error: 'Swatch not found' }, { status: 404 })

  await prisma.swatches.update({ where: { id }, data: { deleted_at: new Date() } })

  return NextResponse.json({ success: true, data: {} })
})
