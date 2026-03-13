import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string; sectionId: string }> }

async function getSectionForUser(sectionId: string, projectId: string, userId: string) {
  const project = await prisma.projects.findFirst({
    where: { id: projectId, user_id: userId, deleted_at: null },
  })
  if (!project) return null
  return prisma.project_sections.findFirst({ where: { id: sectionId, project_id: projectId } })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, sectionId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const section = await getSectionForUser(sectionId, id, user.id)
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['name', 'description', 'target_rows', 'sort_order'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await prisma.project_sections.update({ where: { id: sectionId }, data: updates })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, sectionId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const section = await getSectionForUser(sectionId, id, user.id)
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  await prisma.project_sections.delete({ where: { id: sectionId } })
  return NextResponse.json({ success: true, data: {} })
}
