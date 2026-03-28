import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// POST /api/v1/swatches/:id/attach — attach swatch to a project or pattern
export const POST = withAuth(async (req, user, params) => {
  const { id } = params!
  const body = await req.json()
  const { project_id, pattern_id } = body

  if (!project_id && !pattern_id) {
    return NextResponse.json({ error: 'project_id or pattern_id is required' }, { status: 400 })
  }

  // Verify swatch belongs to user
  const swatch = await prisma.swatches.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
  })
  if (!swatch) return NextResponse.json({ error: 'Swatch not found' }, { status: 404 })

  if (project_id) {
    const project = await prisma.projects.findFirst({
      where: { id: project_id, user_id: user.id, deleted_at: null },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    await prisma.project_swatches.upsert({
      where: { project_id_swatch_id: { project_id, swatch_id: id } },
      create: { project_id, swatch_id: id },
      update: {},
    })
  }

  if (pattern_id) {
    const pattern = await prisma.patterns.findFirst({
      where: { id: pattern_id, user_id: user.id, deleted_at: null },
    })
    if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

    await prisma.pattern_swatches.upsert({
      where: { pattern_id_swatch_id: { pattern_id, swatch_id: id } },
      create: { pattern_id, swatch_id: id },
      update: {},
    })
  }

  return NextResponse.json({ success: true, data: {} })
})

// DELETE /api/v1/swatches/:id/attach — detach swatch from a project or pattern
export const DELETE = withAuth(async (req, user, params) => {
  const { id } = params!
  const { searchParams } = req.nextUrl
  const projectId = searchParams.get('project_id')
  const patternId = searchParams.get('pattern_id')

  // Verify swatch belongs to user
  const swatch = await prisma.swatches.findFirst({
    where: { id, user_id: user.id, deleted_at: null },
  })
  if (!swatch) return NextResponse.json({ error: 'Swatch not found' }, { status: 404 })

  if (projectId) {
    await prisma.project_swatches.deleteMany({
      where: { project_id: projectId, swatch_id: id },
    })
  }

  if (patternId) {
    await prisma.pattern_swatches.deleteMany({
      where: { pattern_id: patternId, swatch_id: id },
    })
  }

  return NextResponse.json({ success: true, data: {} })
})
