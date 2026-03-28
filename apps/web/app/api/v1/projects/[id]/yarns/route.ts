import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, findOwned } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// GET /api/v1/projects/:id/yarns — list project yarns
export const GET = withAuth(async (_req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const yarns = await prisma.project_yarns.findMany({
    where: { project_id: id },
    include: { yarn: { include: { company: true } }, stash_item: true },
  })

  return NextResponse.json({ success: true, data: yarns })
})

// POST /api/v1/projects/:id/yarns — add yarn to project
export const POST = withAuth(async (req, user, params) => {
  const { id } = params!
  const project = await findOwned(prisma.projects, id, user.id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  const { stash_item_id, yarn_id, name_override, colorway, skeins_used } = body

  // Validate stash item belongs to user if provided
  if (stash_item_id) {
    const stashItem = await prisma.user_stash.findFirst({
      where: { id: stash_item_id, user_id: user.id },
      include: { yarn: { include: { company: true } } },
    })
    if (!stashItem) return NextResponse.json({ error: 'Stash item not found' }, { status: 404 })
  }

  // Require either stash_item_id, yarn_id, or name_override
  if (!stash_item_id && !yarn_id && !name_override) {
    return NextResponse.json({ error: 'Provide stash_item_id, yarn_id, or name_override' }, { status: 400 })
  }

  // Auto-populate yarn_id from stash item if linking from stash
  let resolvedYarnId = yarn_id ?? null
  if (stash_item_id && !yarn_id) {
    const stashItem = await prisma.user_stash.findUnique({ where: { id: stash_item_id } })
    if (stashItem) resolvedYarnId = stashItem.yarn_id
  }

  const created = await prisma.project_yarns.create({
    data: {
      project_id: id,
      stash_item_id: stash_item_id ?? null,
      yarn_id: resolvedYarnId,
      name_override: name_override ?? null,
      colorway: colorway ?? null,
      skeins_used: skeins_used ?? null,
    },
    include: { yarn: { include: { company: true } }, stash_item: true },
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
})
