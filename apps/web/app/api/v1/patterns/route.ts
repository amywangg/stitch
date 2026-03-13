import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro, FREE_LIMITS } from '@/lib/pro-gate'
import { slugify } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await getDbUser(clerkId)
    const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20')
    const folderId = req.nextUrl.searchParams.get('folder_id')

    // folder_id=null means root (unfiled), folder_id=<id> means specific folder, no param means all
    const where: Record<string, unknown> = { user_id: user.id, deleted_at: null }
    if (folderId === 'null' || folderId === 'root') {
      where.folder_id = null
    } else if (folderId) {
      where.folder_id = folderId
    }

    const [items, total] = await Promise.all([
      prisma.patterns.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { folder: { select: { id: true, name: true, color: true } } },
      }),
      prisma.patterns.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { items, total, page, pageSize: limit, hasMore: total > page * limit },
    })
  } catch (err) {
    console.error('[GET /patterns]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  if (!user.is_pro) {
    const count = await prisma.patterns.count({ where: { user_id: user.id, deleted_at: null } })
    if (count >= FREE_LIMITS.savedPatterns) {
      const err = requirePro(user, `more than ${FREE_LIMITS.savedPatterns} saved patterns`)
      return err!
    }
  }

  const body = await req.json()
  const { title, description, craft_type, difficulty, garment_type, source_url, folder_id } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Validate folder belongs to user if provided
  if (folder_id) {
    const folder = await prisma.pattern_folders.findFirst({
      where: { id: folder_id, user_id: user.id },
    })
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }
  }

  let slug = slugify(title)
  let attempt = 0
  while (await prisma.patterns.findUnique({ where: { user_id_slug: { user_id: user.id, slug } } })) {
    attempt++
    slug = `${slugify(title)}-${attempt}`
  }

  const pattern = await prisma.patterns.create({
    data: {
      user_id: user.id,
      slug,
      title: title.trim(),
      description: description?.trim() ?? null,
      craft_type: craft_type ?? 'knitting',
      difficulty: difficulty ?? null,
      garment_type: garment_type ?? null,
      source_url: source_url ?? null,
      folder_id: folder_id ?? null,
    },
  })

  return NextResponse.json({ success: true, data: pattern }, { status: 201 })
}
