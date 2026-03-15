import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/patterns/:id/link-ravelry
 * Link an AI-parsed pattern to a Ravelry pattern.
 * Enriches with cover image, source URL, and community metadata.
 * Does NOT overwrite AI-parsed structure (sections, sizes, instructions).
 *
 * Body: { ravelry_id: number }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const pattern = await prisma.patterns.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
  })
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const body = await req.json()
  const ravelryId = body.ravelry_id as number | undefined
  if (!ravelryId || typeof ravelryId !== 'number') {
    return NextResponse.json({ error: 'ravelry_id (number) is required' }, { status: 400 })
  }

  // Fetch full detail from Ravelry
  let detail
  try {
    detail = await getRavelryPatternDetail(ravelryId, user.id)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch from Ravelry' },
      { status: 502 },
    )
  }

  // Enrich pattern with Ravelry data (never overwrite AI-parsed structure)
  const updates: Record<string, unknown> = {
    ravelry_id: String(ravelryId),
    source_url: detail.url,
    source_free: detail.free,
  }

  // Fill in fields from Ravelry only if we don't have them
  if (!pattern.cover_image_url && detail.photo_url) {
    updates.cover_image_url = detail.photo_url
  }
  if (!pattern.designer_name && detail.designer) {
    updates.designer_name = detail.designer
  }
  if (!pattern.description && detail.notes) {
    updates.description = detail.notes
  }
  if (!pattern.notes_html && detail.notes_html) {
    updates.notes_html = detail.notes_html
  }
  if (!pattern.difficulty && detail.difficulty) {
    updates.difficulty = String(detail.difficulty)
  }
  if (!pattern.yarn_weight && detail.weight) {
    updates.yarn_weight = detail.weight
  }
  if (!pattern.garment_type && detail.pattern_categories?.length) {
    updates.garment_type = detail.pattern_categories[0]
  }
  if (detail.yardage_min) {
    updates.yardage_min = detail.yardage_min
  }
  if (detail.yardage_max) {
    updates.yardage_max = detail.yardage_max
  }
  if (!pattern.gauge_stitches_per_10cm && detail.gauge_stitches) {
    updates.gauge_stitches_per_10cm = detail.gauge_stitches
  }
  if (!pattern.gauge_rows_per_10cm && detail.gauge_rows) {
    updates.gauge_rows_per_10cm = detail.gauge_rows
  }
  if (!pattern.gauge_stitch_pattern && detail.gauge_stitch_pattern) {
    updates.gauge_stitch_pattern = detail.gauge_stitch_pattern
  }
  if (!pattern.needle_size_mm && detail.gauge_needle_mm) {
    updates.needle_size_mm = detail.gauge_needle_mm
  }
  if (!pattern.needle_sizes?.length && detail.needle_sizes?.length) {
    updates.needle_sizes = detail.needle_sizes
  }
  if (!pattern.sizes_available && detail.sizes_available) {
    updates.sizes_available = detail.sizes_available
  }
  if (!pattern.rating && detail.rating) {
    updates.rating = detail.rating
  }
  if (!pattern.rating_count && detail.rating_count) {
    updates.rating_count = detail.rating_count
  }

  const updated = await prisma.patterns.update({
    where: { id },
    data: updates,
    include: {
      sections: { orderBy: { sort_order: 'asc' }, include: { rows: { orderBy: { row_number: 'asc' } } } },
      sizes: { orderBy: { sort_order: 'asc' } },
    },
  })

  return NextResponse.json({ success: true, data: updated })
}
