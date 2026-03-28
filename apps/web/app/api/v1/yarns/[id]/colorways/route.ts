import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { getRavelryClient } from '@/lib/ravelry-client'


export const dynamic = 'force-dynamic'
// GET /api/v1/yarns/[id]/colorways — returns colorway names for a yarn
// Fetches from Ravelry stash search (community data) + our own DB
export const GET = withAuth(async (req, user, params) => {
  const id = params!.id

  // Accept ?name=... as fallback for yarns not yet in our DB
  const nameParam = req.nextUrl.searchParams.get('name')

  // Resolve yarn info — id can be a UUID or Ravelry numeric ID
  let yarnId = id
  let yarnName: string | null = nameParam

  if (/^\d+$/.test(id)) {
    // Numeric = Ravelry ID
    const yarn = await prisma.yarns.findUnique({
      where: { ravelry_id: id },
      select: { id: true, name: true },
    })
    if (yarn) {
      yarnId = yarn.id
      if (!yarnName) yarnName = yarn.name
    }
  } else {
    const yarn = await prisma.yarns.findUnique({
      where: { id },
      select: { id: true, name: true, ravelry_id: true },
    })
    if (yarn) {
      if (!yarnName) yarnName = yarn.name
    }
  }

  // Collect colorways from two sources in parallel
  const [ravelryColorways, localColorways] = await Promise.all([
    fetchRavelryColorways(user.id, yarnName),
    fetchLocalColorways(yarnId),
  ])

  // Merge and deduplicate, preferring the cleaned Ravelry colorway names
  const merged = deduplicateColorways([...ravelryColorways, ...localColorways])

  return NextResponse.json({ success: true, data: { colorways: merged } })
})

/** Fetch colorways from Ravelry stash search */
async function fetchRavelryColorways(userId: string, yarnName: string | null): Promise<string[]> {
  if (!yarnName) return []

  try {
    const client = await getRavelryClient(userId)
    if (!client) return []

    // Use the stash search endpoint which returns colorway_name per entry
    const searchQuery = yarnName
      .replace(/^(Garnstudio|DROPS)\s+/i, '') // Remove company prefix for better search
      .trim()

    // Fetch 2 pages to get a good sample of colorways
    const colorways = new Set<string>()
    for (let page = 1; page <= 2; page++) {
      const data = await client.searchStash(searchQuery, page, 100)
      for (const s of data.stashes) {
        if (s.colorway_name && s.colorway_name.trim()) {
          colorways.add(s.colorway_name.trim())
        }
      }
      if (page >= data.paginator.page_count) break
    }

    return [...colorways]
  } catch (error) {
    console.error('[colorways] Ravelry fetch failed:', error)
    return []
  }
}

/** Fetch colorways from our own user_stash table */
async function fetchLocalColorways(yarnId: string): Promise<string[]> {
  const results = await prisma.user_stash.groupBy({
    by: ['colorway'],
    where: {
      yarn_id: yarnId,
      colorway: { not: null },
    },
    _count: { colorway: true },
    orderBy: { _count: { colorway: 'desc' } },
    take: 50,
  })

  return results
    .filter(r => r.colorway && r.colorway.trim() !== '')
    .map(r => r.colorway as string)
}

/** Normalize and deduplicate colorway names */
function deduplicateColorways(raw: string[]): string[] {
  // Build a map: normalized name -> best display name
  const map = new Map<string, { name: string; count: number }>()

  for (const cw of raw) {
    // Normalize: lowercase, trim, strip trailing notes/annotations
    const cleaned = cw
      .replace(/\s*~\s*#.*$/, '') // Remove "~ #4wt Aran 153yd" annotations
      .replace(/\s*x\d+\s*$/, '') // Remove "x2", "x3" multipliers
      .trim()

    if (!cleaned) continue

    const key = cleaned.toLowerCase().replace(/\s+/g, ' ')
    const existing = map.get(key)
    if (existing) {
      existing.count++
      // Prefer the version that starts with a number (official colorway number)
      if (/^\d/.test(cleaned) && !/^\d/.test(existing.name)) {
        existing.name = cleaned
      }
    } else {
      map.set(key, { name: cleaned, count: 1 })
    }
  }

  // Sort: colorways with numbers first (official), then alphabetically
  return [...map.values()]
    .sort((a, b) => {
      const aNum = a.name.match(/^(\d+)/)
      const bNum = b.name.match(/^(\d+)/)
      if (aNum && bNum) return parseInt(aNum[1]) - parseInt(bNum[1])
      if (aNum) return -1
      if (bNum) return 1
      return a.name.localeCompare(b.name)
    })
    .map(v => v.name)
}
