import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePro, FREE_LIMITS } from '@/lib/pro-gate'
import { withAuth, parsePagination, paginatedResponse, generateUniqueSlug } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req)
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
      skip,
      take: limit,
      include: {
        folder: { select: { id: true, name: true, color: true } },
        pdf_uploads: { orderBy: { created_at: 'desc' }, take: 1, select: { id: true } },
      },
    }),
    prisma.patterns.count({ where }),
  ])

  return paginatedResponse(items, total, page, limit)
})

export const POST = withAuth(async (req, user) => {
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

  const slug = await generateUniqueSlug(prisma.patterns, user.id, title)

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
      source_free: true, // user-created patterns can be shared publicly
    },
  })

  return NextResponse.json({ success: true, data: pattern }, { status: 201 })
})
