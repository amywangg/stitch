import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { getRavelryClient } from '@/lib/ravelry-client'
import { ravelryDeleteStash } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (_req, user, params) => {
  const { id } = params!
  const item = await prisma.user_stash.findFirst({
    where: { id, user_id: user.id },
    include: {
      yarn: { include: { company: true } },
      project_yarn: {
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true,
              slug: true,
              deleted_at: true,
              photos: { orderBy: { sort_order: 'asc' } },
            },
          },
        },
      },
    },
  })
  if (!item) return NextResponse.json({ error: 'Stash item not found' }, { status: 404 })

  // Flatten project_yarn → projects array for the client, excluding soft-deleted
  const projects = item.project_yarn
    .map((py) => py.project)
    .filter((p) => p.deleted_at === null)
    .map(({ deleted_at, ...p }) => p)

  const { project_yarn, ...rest } = item
  return NextResponse.json({ success: true, data: { ...rest, projects } })
})

export const PATCH = withAuth(async (req, user, params) => {
  const { id } = params!
  const item = await findOwned(prisma.user_stash, id, user.id, { softDelete: false })
  if (!item) return NextResponse.json({ error: 'Stash item not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['colorway', 'skeins', 'grams', 'notes', 'status'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await prisma.user_stash.update({
    where: { id },
    data: updates,
    include: { yarn: { include: { company: true } } },
  })

  return NextResponse.json({ success: true, data: updated })
})

export const DELETE = withAuth(async (_req, user, params) => {
  const { id } = params!
  const item = await findOwned<any>(prisma.user_stash, id, user.id, { softDelete: false })
  if (!item) return NextResponse.json({ error: 'Stash item not found' }, { status: 404 })

  await prisma.user_stash.delete({ where: { id } })

  // Delete from Ravelry stash (non-blocking)
  if (item.ravelry_id) {
    getRavelryClient(user.id).then(async (client) => {
      if (!client) return
      const conn = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
      if (!conn) return
      await ravelryDeleteStash(client, conn.ravelry_username, item.ravelry_id)
    }).catch(err => console.error('[ravelry-push] stash delete:', err))
  }

  return NextResponse.json({ success: true, data: {} })
})
