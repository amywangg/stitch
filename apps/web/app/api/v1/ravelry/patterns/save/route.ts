import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'

/**
 * POST /api/v1/ravelry/patterns/save
 * Save a Ravelry pattern as a lightweight snapshot.
 * Fetches current data from Ravelry and stores the snapshot.
 *
 * Body: { ravelry_id: number }
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const body = await req.json()
  const { ravelry_id } = body as { ravelry_id: number }

  if (!ravelry_id || typeof ravelry_id !== 'number') {
    return NextResponse.json({ error: 'ravelry_id (number) is required' }, { status: 400 })
  }

  // Check if already saved
  const existing = await prisma.saved_patterns.findUnique({
    where: { user_id_ravelry_id: { user_id: user.id, ravelry_id } },
  })
  if (existing) {
    return NextResponse.json({ success: true, data: existing, message: 'Already saved' })
  }

  // Fetch fresh data from Ravelry
  let detail
  try {
    detail = await getRavelryPatternDetail(ravelry_id, user.id)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch pattern from Ravelry' },
      { status: 502 },
    )
  }

  const saved = await prisma.saved_patterns.create({
    data: {
      user_id: user.id,
      ravelry_id: detail.ravelry_id,
      name: detail.name,
      permalink: detail.permalink,
      craft: detail.craft,
      weight: detail.weight,
      yardage_min: detail.yardage_min,
      yardage_max: detail.yardage_max,
      gauge: detail.gauge,
      needle_sizes: detail.needle_sizes,
      difficulty: detail.difficulty,
      photo_url: detail.photo_url,
      designer: detail.designer,
      free: detail.free,
    },
  })

  return NextResponse.json({ success: true, data: saved }, { status: 201 })
}

/**
 * DELETE /api/v1/ravelry/patterns/save
 * Unsave a Ravelry pattern.
 *
 * Body: { ravelry_id: number }
 */
export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const body = await req.json()
  const { ravelry_id } = body as { ravelry_id: number }

  const existing = await prisma.saved_patterns.findUnique({
    where: { user_id_ravelry_id: { user_id: user.id, ravelry_id } },
  })

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.saved_patterns.delete({
    where: { user_id_ravelry_id: { user_id: user.id, ravelry_id } },
  })

  return NextResponse.json({ success: true })
}
