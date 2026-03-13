import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPushClient, pushToRavelry } from '@/lib/ravelry-push'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
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
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const item = await prisma.user_stash.findFirst({ where: { id, user_id: user.id } })
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

  // Ravelry write-back
  if (updated.ravelry_id) {
    const push = await getRavelryPushClient(user.id)
    if (push) {
      const ravelryUpdates: Partial<{ colorway: string; skeins: number; grams: number; notes: string }> = {}
      if ('colorway' in updates) ravelryUpdates.colorway = updates.colorway as string
      if ('skeins' in updates) ravelryUpdates.skeins = updates.skeins as number
      if ('grams' in updates) ravelryUpdates.grams = updates.grams as number
      if ('notes' in updates) ravelryUpdates.notes = updates.notes as string
      if (Object.keys(ravelryUpdates).length > 0) {
        pushToRavelry(() => push.client.updateStashItem(updated.ravelry_id!, ravelryUpdates))
      }
    }
  }

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const item = await prisma.user_stash.findFirst({ where: { id, user_id: user.id } })
  if (!item) return NextResponse.json({ error: 'Stash item not found' }, { status: 404 })

  await prisma.user_stash.delete({ where: { id } })

  // Ravelry write-back
  if (item.ravelry_id) {
    const push = await getRavelryPushClient(user.id)
    if (push) {
      pushToRavelry(() => push.client.deleteStashItem(item.ravelry_id!))
    }
  }

  return NextResponse.json({ success: true, data: {} })
}
