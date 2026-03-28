import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// ─── Validation ─────────────────────────────────────────────────────────────

const ReviewSchema = z.object({
  rating: z.number().min(1).max(5).multipleOf(0.5),
  difficulty_rating: z.number().min(1).max(5).optional(),
  content: z.string().trim().max(2000).optional(),
  would_make_again: z.boolean().optional(),
  project_id: z.string().uuid().optional(),
})

const UpdateReviewSchema = ReviewSchema.partial()

// ─── Helpers ────────────────────────────────────────────────────────────────

async function updatePatternAggregateRating(patternId: string) {
  const agg = await prisma.pattern_reviews.aggregate({
    where: { pattern_id: patternId },
    _avg: { rating: true },
    _count: true,
  })
  await prisma.patterns.update({
    where: { id: patternId },
    data: {
      rating: agg._avg.rating,
      rating_count: agg._count,
    },
  })
}

// ─── GET: List reviews for a pattern ────────────────────────────────────────

export const GET = withAuth(async (req, user, params) => {
  const { id } = params!
  const { page, limit, skip } = parsePagination(req)

  const where = { pattern_id: id }

  const [items, total, userReview] = await Promise.all([
    prisma.pattern_reviews.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { username: true, display_name: true, avatar_url: true },
        },
        project: {
          select: { id: true, title: true },
        },
      },
    }),
    prisma.pattern_reviews.count({ where }),
    prisma.pattern_reviews.findUnique({
      where: { user_id_pattern_id: { user_id: user.id, pattern_id: id } },
      include: {
        user: {
          select: { username: true, display_name: true, avatar_url: true },
        },
        project: {
          select: { id: true, title: true },
        },
      },
    }),
  ])

  const response = paginatedResponse(items, total, page, limit)
  const body = await response.json()
  body.data.user_review = userReview ?? null

  return NextResponse.json(body)
})

// ─── POST: Create a review ──────────────────────────────────────────────────

export const POST = withAuth(async (req, user, params) => {
  const { id } = params!

  const body = await req.json()
  const parsed = ReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // Check pattern exists
  const pattern = await prisma.patterns.findFirst({ where: { id, deleted_at: null } })
  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  // Check for duplicate review
  const existing = await prisma.pattern_reviews.findUnique({
    where: { user_id_pattern_id: { user_id: user.id, pattern_id: id } },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'You have already reviewed this pattern', code: 'DUPLICATE_REVIEW' },
      { status: 400 }
    )
  }

  const review = await prisma.pattern_reviews.create({
    data: {
      ...parsed.data,
      user_id: user.id,
      pattern_id: id,
    },
    include: {
      user: {
        select: { username: true, display_name: true, avatar_url: true },
      },
      project: {
        select: { id: true, title: true },
      },
    },
  })

  await updatePatternAggregateRating(id)

  return NextResponse.json({ success: true, data: review }, { status: 201 })
})

// ─── PATCH: Update own review ───────────────────────────────────────────────

export const PATCH = withAuth(async (req, user, params) => {
  const { id } = params!

  const body = await req.json()
  const parsed = UpdateReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existing = await prisma.pattern_reviews.findUnique({
    where: { user_id_pattern_id: { user_id: user.id, pattern_id: id } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Review not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const review = await prisma.pattern_reviews.update({
    where: { id: existing.id },
    data: parsed.data,
    include: {
      user: {
        select: { username: true, display_name: true, avatar_url: true },
      },
      project: {
        select: { id: true, title: true },
      },
    },
  })

  await updatePatternAggregateRating(id)

  return NextResponse.json({ success: true, data: review })
})

// ─── DELETE: Delete own review ──────────────────────────────────────────────

export const DELETE = withAuth(async (req, user, params) => {
  const { id } = params!

  const existing = await prisma.pattern_reviews.findUnique({
    where: { user_id_pattern_id: { user_id: user.id, pattern_id: id } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Review not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  await prisma.pattern_reviews.delete({ where: { id: existing.id } })

  await updatePatternAggregateRating(id)

  return NextResponse.json({ success: true })
})
