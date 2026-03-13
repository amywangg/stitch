import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser } from '@/lib/auth'
import { searchRavelryYarns } from '@/lib/ravelry-yarn-search'

// GET /api/v1/yarns/search?q=cascade+220&weight=worsted&page=1
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const query = req.nextUrl.searchParams.get('q') ?? ''
  const weight = req.nextUrl.searchParams.get('weight') ?? undefined
  const fiber = req.nextUrl.searchParams.get('fiber') ?? undefined
  const sort = req.nextUrl.searchParams.get('sort') ?? 'best'
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const pageSize = parseInt(req.nextUrl.searchParams.get('page_size') ?? '20')

  if (!query.trim()) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 })
  }

  try {
    const result = await searchRavelryYarns({
      query: query.trim(),
      weight,
      fiber,
      sort,
      page,
      page_size: pageSize,
    }, user.id)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Yarn search failed'
    const status = message.includes('Connect your Ravelry') ? 400 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
