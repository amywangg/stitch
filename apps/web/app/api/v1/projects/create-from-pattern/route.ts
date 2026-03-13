import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { FREE_LIMITS } from '@/lib/pro-gate'
import { slugify } from '@/lib/utils'
import { getTotalExpandedRows } from '@/lib/instruction-resolver'
import { emitActivity } from '@/lib/activity'

/**
 * POST /api/v1/projects/create-from-pattern
 * Creates a project from a parsed pattern with sections linked to pattern sections.
 * Each project section tracks current_step and current_row (tap within step).
 * Respects free tier project limits.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  const body = await req.json()
  const patternId = body.pattern_id as string | undefined
  if (!patternId) {
    return NextResponse.json({ error: 'pattern_id is required' }, { status: 400 })
  }

  // Check free tier limit
  if (!user.is_pro) {
    const activeCount = await prisma.projects.count({
      where: { user_id: user.id, deleted_at: null, status: 'active' },
    })
    if (activeCount >= FREE_LIMITS.activeProjects) {
      return NextResponse.json(
        {
          error: 'Free limit reached',
          message: `Free accounts can have ${FREE_LIMITS.activeProjects} active projects. Upgrade to Pro for unlimited.`,
          upgrade_url: '/settings/billing',
        },
        { status: 403 }
      )
    }
  }

  const pattern = await prisma.patterns.findFirst({
    where: { id: patternId, user_id: user.id, deleted_at: null },
    include: {
      sections: {
        include: { rows: { orderBy: { row_number: 'asc' } } },
        orderBy: { sort_order: 'asc' },
      },
    },
  })
  if (!pattern) return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })

  if (pattern.sections.length === 0) {
    return NextResponse.json(
      { error: 'Pattern has no sections. Apply a size first.' },
      { status: 422 }
    )
  }

  // Generate unique slug
  let slug = slugify(pattern.title)
  let attempt = 0
  while (await prisma.projects.findUnique({ where: { user_id_slug: { user_id: user.id, slug } } })) {
    attempt++
    slug = `${slugify(pattern.title)}-${attempt}`
  }

  const project = await prisma.projects.create({
    data: {
      user_id: user.id,
      pattern_id: patternId,
      slug,
      title: pattern.title,
      craft_type: pattern.craft_type,
      size_made: pattern.selected_size,
      started_at: new Date(),
      sections: {
        create: pattern.sections.map((section, idx) => ({
          pattern_section_id: section.id,
          name: section.name,
          sort_order: idx,
          target_rows: section.rows.length > 0 ? getTotalExpandedRows(section.rows) : null,
          current_step: 1,
          current_row: 0,
          completed: false,
        })),
      },
    },
    include: {
      sections: { orderBy: { sort_order: 'asc' } },
    },
  })

  emitActivity({
    userId: user.id,
    type: 'project_started',
    projectId: project.id,
    patternId,
  })

  return NextResponse.json({ success: true, data: project })
}
