import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (_req, user, params) => {
  const { id } = params!

  // Look up user's own pattern (include soft-deleted so project links still work)
  const pattern = await prisma.patterns.findFirst({
    where: { id, user_id: user.id },
    include: {
      sections: {
        orderBy: { sort_order: 'asc' },
        include: { rows: { orderBy: { row_number: 'asc' } } },
      },
      sizes: { orderBy: { sort_order: 'asc' } },
      photos: { orderBy: { sort_order: 'asc' } },
      pattern_yarns: {
        orderBy: { sort_order: 'asc' },
        include: { yarn: { include: { company: true } } },
      },
      pdf_uploads: { orderBy: { created_at: 'desc' }, take: 1 },
    },
  })

  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const queueEntry = await prisma.pattern_queue.findUnique({
    where: { user_id_pattern_id: { user_id: user.id, pattern_id: id } },
  })

  return NextResponse.json({ success: true, data: { ...pattern, is_queued: !!queueEntry } })
})

export const PATCH = withAuth(async (req, user, params) => {
  const { id } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const body = await req.json()

  // Prevent sharing Ravelry-sourced or paid patterns to community
  // Only user-created patterns (built in Stitch or custom PDF uploads with no Ravelry match) can be public
  if (body.is_public === true) {
    if ((pattern as any).source_free !== true) {
      return NextResponse.json(
        { error: 'Patterns from paid sources cannot be made public' },
        { status: 403 }
      )
    }
    if ((pattern as any).ravelry_id) {
      return NextResponse.json(
        { error: 'Patterns linked to Ravelry cannot be shared to community' },
        { status: 403 }
      )
    }
  }

  // Marketplace listing validation
  if (body.is_marketplace === true) {
    if (!(pattern as any).stripe_onboarded) {
      // Check if user has completed Stripe Connect
      const seller = await prisma.users.findUnique({ where: { id: user.id }, select: { stripe_onboarded: true } })
      if (!seller?.stripe_onboarded) {
        return NextResponse.json(
          { error: 'Complete Stripe Connect setup before listing patterns for sale', code: 'CONNECT_REQUIRED' },
          { status: 400 }
        )
      }
    }
    if ((pattern as any).ravelry_id) {
      return NextResponse.json(
        { error: 'Ravelry-linked patterns cannot be sold on marketplace' },
        { status: 403 }
      )
    }
    if ((pattern as any).source_free === false) {
      return NextResponse.json(
        { error: 'Patterns from paid sources cannot be resold' },
        { status: 403 }
      )
    }
  }

  if (body.price_cents !== undefined && body.price_cents !== null) {
    if (typeof body.price_cents !== 'number' || body.price_cents < 100 || body.price_cents > 10000) {
      return NextResponse.json(
        { error: 'Price must be between $1.00 and $100.00' },
        { status: 400 }
      )
    }
  }

  const allowed = [
    'title', 'description', 'difficulty', 'garment_type', 'is_public', 'source_url', 'folder_id',
    'craft_type', 'designer_name', 'yarn_weight', 'needle_size_mm', 'needle_sizes', 'sizes_available',
    'gauge_stitches_per_10cm', 'gauge_rows_per_10cm', 'gauge_stitch_pattern',
    'yardage_min', 'yardage_max', 'cover_image_url',
    'price_cents', 'is_marketplace',
  ] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await prisma.patterns.update({ where: { id }, data: updates })
  return NextResponse.json({ success: true, data: updated })
})

export const DELETE = withAuth(async (_req, user, params) => {
  const { id } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  await prisma.patterns.update({ where: { id }, data: { deleted_at: new Date() } })

  // Clean up saved_patterns bookmark if this was a Ravelry pattern
  if ((pattern as any).ravelry_id) {
    const ravId = parseInt((pattern as any).ravelry_id, 10)
    if (!isNaN(ravId)) {
      await prisma.saved_patterns.deleteMany({
        where: { user_id: user.id, ravelry_id: ravId },
      })
    }
  }

  return NextResponse.json({ success: true, data: {} })
})
