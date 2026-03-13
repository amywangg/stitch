import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { searchRavelryPatterns } from '@/lib/ravelry-search'

/**
 * GET /api/v1/ravelry/search
 * Proxy Ravelry pattern search. Never stores results — always fresh.
 *
 * Query params: query, craft, weight, yardage_max, pc, fit, availability, sort, page, page_size
 */
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const { searchParams } = new URL(req.url)

  try {
    const results = await searchRavelryPatterns({
      query: searchParams.get('query') ?? undefined,
      craft: (searchParams.get('craft') as 'knitting' | 'crochet') ?? undefined,
      weight: searchParams.get('weight') ?? undefined,
      yardage_min: searchParams.get('yardage_min') ? parseInt(searchParams.get('yardage_min')!) : undefined,
      yardage_max: searchParams.get('yardage_max') ? parseInt(searchParams.get('yardage_max')!) : undefined,
      pc: searchParams.get('pc') ?? undefined,
      pa: searchParams.get('pa') ?? undefined,
      fit: searchParams.get('fit') ?? undefined,
      diff: searchParams.get('diff') ?? undefined,
      needles: searchParams.get('needles') ?? undefined,
      colors: searchParams.get('colors') ?? undefined,
      language: searchParams.get('language') ?? undefined,
      photo: searchParams.get('photo') === 'yes' ? 'yes' : undefined,
      availability: (searchParams.get('availability') as 'free' | 'ravelry' | 'online') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : undefined,
    }, user.id)

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ravelry search failed' },
      { status: 502 },
    )
  }
}
