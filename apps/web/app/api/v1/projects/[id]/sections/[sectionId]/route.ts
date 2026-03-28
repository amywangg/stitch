import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
async function getSectionForUser(sectionId: string, projectId: string, userId: string) {
  const project = await prisma.projects.findFirst({
    where: { id: projectId, user_id: userId, deleted_at: null },
  })
  if (!project) return null
  return prisma.project_sections.findFirst({ where: { id: sectionId, project_id: projectId } })
}

export const PATCH = withAuth(async (req, user, params) => {
  const { id, sectionId } = params!

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
})

export const DELETE = withAuth(async (_req, user, params) => {
  const { id, sectionId } = params!

  const section = await getSectionForUser(sectionId, id, user.id)
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  await prisma.project_sections.delete({ where: { id: sectionId } })
  return NextResponse.json({ success: true, data: {} })
})
