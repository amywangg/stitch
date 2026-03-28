import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (_req, user, params) => {
  const id = params!.id

  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const projectTags = await prisma.project_tags.findMany({
    where: { project_id: id },
    include: { tag: true },
  })

  const tags = projectTags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name }))
  return NextResponse.json({ success: true, data: tags })
})

export const POST = withAuth(async (req, user, params) => {
  const id = params!.id

  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  if (!Array.isArray(body.tags) || body.tags.length === 0) {
    return NextResponse.json({ error: 'tags must be a non-empty array of strings' }, { status: 400 })
  }

  const tagNames: string[] = body.tags.map((t: string) => t.trim()).filter(Boolean)
  if (tagNames.length === 0) {
    return NextResponse.json({ error: 'tags must contain at least one non-empty string' }, { status: 400 })
  }

  // Upsert each tag (find or create by name)
  const tagRecords = await Promise.all(
    tagNames.map((name) =>
      prisma.tags.upsert({
        where: { name },
        create: { name },
        update: {},
      })
    )
  )

  // Create project_tags join records, skipping duplicates
  await prisma.project_tags.createMany({
    data: tagRecords.map((tag) => ({
      project_id: id,
      tag_id: tag.id,
    })),
    skipDuplicates: true,
  })

  // Return updated tags list
  const projectTags = await prisma.project_tags.findMany({
    where: { project_id: id },
    include: { tag: true },
  })

  const tags = projectTags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name }))
  return NextResponse.json({ success: true, data: tags }, { status: 201 })
})

export const DELETE = withAuth(async (req, user, params) => {
  const id = params!.id

  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  if (!body.tag_id) {
    return NextResponse.json({ error: 'tag_id is required' }, { status: 400 })
  }

  await prisma.project_tags.deleteMany({
    where: { project_id: id, tag_id: body.tag_id },
  })

  return NextResponse.json({ success: true })
})
