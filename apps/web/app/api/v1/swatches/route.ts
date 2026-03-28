import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse, generateUniqueSlug } from '@/lib/route-helpers'


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
}

// GET /api/v1/swatches — list current user's swatches
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req)

  const where = { user_id: user.id, deleted_at: null }

  const [items, total] = await Promise.all([
    prisma.swatches.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: SWATCH_INCLUDE,
    }),
    prisma.swatches.count({ where }),
  ])

  return paginatedResponse(items, total, page, limit)
})

// POST /api/v1/swatches — create a swatch
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { title, notes, is_public, craft_type, stitch_pattern, stitches_per_10cm, rows_per_10cm,
    needle_size_mm, needle_size_label, needle_type, washed, blocked, width_cm, height_cm,
    photo_url, photo_path, yarns } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const slug = await generateUniqueSlug(prisma.swatches, user.id, title)

  const swatch = await prisma.swatches.create({
    data: {
      user_id: user.id,
      slug,
      title: title.trim(),
      notes: notes ?? null,
      is_public: is_public ?? false,
      craft_type: craft_type ?? 'knitting',
      stitch_pattern: stitch_pattern ?? null,
      stitches_per_10cm: stitches_per_10cm ?? null,
      rows_per_10cm: rows_per_10cm ?? null,
      needle_size_mm: needle_size_mm ?? null,
      needle_size_label: needle_size_label ?? null,
      needle_type: needle_type ?? null,
      washed: washed ?? false,
      blocked: blocked ?? false,
      width_cm: width_cm ?? null,
      height_cm: height_cm ?? null,
      photo_url: photo_url ?? null,
      photo_path: photo_path ?? null,
      yarns: Array.isArray(yarns) && yarns.length > 0 ? {
        create: yarns.map((y: { stash_item_id?: string; yarn_id?: string; name_override?: string; colorway?: string; strands?: number }, i: number) => ({
          stash_item_id: y.stash_item_id ?? null,
          yarn_id: y.yarn_id ?? null,
          name_override: y.name_override ?? null,
          colorway: y.colorway ?? null,
          strands: y.strands ?? 1,
          sort_order: i,
        })),
      } : undefined,
    },
    include: SWATCH_INCLUDE,
  })

  return NextResponse.json({ success: true, data: swatch }, { status: 201 })
})
