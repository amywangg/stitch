import { NextRequest, NextResponse } from 'next/server'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { prisma } from '@/lib/prisma'


export const dynamic = 'force-dynamic'
// PATCH — Update a section
export const PATCH = withAuth(async (req, user, params) => {
  const { id, sectionId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const section = await prisma.pattern_sections.findFirst({
    where: { id: sectionId, pattern_id: id },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if ('name' in body) {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Section name cannot be empty' }, { status: 400 })
    }
    updates.name = body.name.trim()
  }
  if ('content' in body) updates.content = body.content?.trim() ?? null

  const updated = await prisma.pattern_sections.update({
    where: { id: sectionId },
    data: updates,
    include: { rows: { orderBy: { row_number: 'asc' } } },
  })

  return NextResponse.json({ success: true, data: updated })
})

// DELETE — Delete a section and its rows
export const DELETE = withAuth(async (_req, user, params) => {
  const { id, sectionId } = params!
  const pattern = await findOwned(prisma.patterns, id, user.id)
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  const section = await prisma.pattern_sections.findFirst({
    where: { id: sectionId, pattern_id: id },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  // Cascade: rows are deleted via onDelete: Cascade in schema
  await prisma.pattern_sections.delete({ where: { id: sectionId } })

  return NextResponse.json({ success: true, data: {} })
})
