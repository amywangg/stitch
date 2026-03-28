import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, generateUniqueSlug } from '@/lib/route-helpers'
import { FREE_LIMITS } from '@/lib/pro-gate'
import { getTotalExpandedRows } from '@/lib/instruction-resolver'
import { emitActivity } from '@/lib/activity'
import { getRavelryClient } from '@/lib/ravelry-client'
import { ravelryCreateProject } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
/**
 * POST /api/v1/projects/create-from-pattern
 * Creates a project from a parsed pattern with sections linked to pattern sections.
 * Each project section tracks current_step and current_row (tap within step).
 * Respects free tier project limits.
 */
export const POST = withAuth(async (req, user) => {
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

  // Find attached PDF upload for this pattern
  const pdfUpload = await prisma.pdf_uploads.findFirst({
    where: { pattern_id: patternId, user_id: user.id },
    orderBy: { created_at: 'desc' },
  })

  const sizeName = body.size_name as string | undefined
  const manualSections = body.manual_sections as Array<{ name: string; target_rows?: number }> | undefined

  // Generate unique slug
  const slug = await generateUniqueSlug(prisma.projects, user.id, pattern.title)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sectionData: any[]

  if (manualSections && manualSections.length > 0) {
    // Manual setup — no pattern_section_id link
    sectionData = manualSections.map((s, idx) => ({
      name: s.name,
      sort_order: idx,
      target_rows: s.target_rows ?? null,
      current_step: 1,
      current_row: 0,
      completed: false,
    }))
  } else if (sizeName) {
    // Find size-specific pattern_sections
    const patternSize = await prisma.pattern_sizes.findFirst({
      where: { pattern_id: patternId, name: sizeName },
    })
    const sizeSections = patternSize
      ? await prisma.pattern_sections.findMany({
          where: { pattern_id: patternId, size_id: patternSize.id },
          include: { rows: { orderBy: { row_number: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        })
      : []

    if (sizeSections.length > 0) {
      sectionData = sizeSections.map((section, idx) => ({
        pattern_section_id: section.id,
        name: section.name,
        sort_order: idx,
        target_rows: section.rows.length > 0 ? getTotalExpandedRows(section.rows) : null,
        current_step: 1,
        current_row: 0,
        completed: false,
      }))
    } else {
      // Fall back to size-agnostic sections
      sectionData = pattern.sections.length > 0
        ? pattern.sections.map((section, idx) => ({
            pattern_section_id: section.id,
            name: section.name,
            sort_order: idx,
            target_rows: section.rows.length > 0 ? getTotalExpandedRows(section.rows) : null,
            current_step: 1,
            current_row: 0,
            completed: false,
          }))
        : [{ name: 'Main', sort_order: 0 }]
    }
  } else {
    sectionData = pattern.sections.length > 0
      ? pattern.sections.map((section, idx) => ({
          pattern_section_id: section.id,
          name: section.name,
          sort_order: idx,
          target_rows: section.rows.length > 0 ? getTotalExpandedRows(section.rows) : null,
          current_step: 1,
          current_row: 0,
          completed: false,
        }))
      : [{ name: 'Main', sort_order: 0 }]
  }

  const project = await prisma.projects.create({
    data: {
      user_id: user.id,
      pattern_id: patternId,
      pdf_upload_id: pdfUpload?.id ?? null,
      slug,
      title: pattern.title,
      craft_type: pattern.craft_type,
      size_made: sizeName ?? pattern.selected_size,
      started_at: new Date(),
      sections: { create: sectionData },
    },
    include: {
      sections: { orderBy: { sort_order: 'asc' } },
      pdf_upload: true,
    },
  })

  emitActivity({
    userId: user.id,
    type: 'project_started',
    projectId: project.id,
    patternId,
  })

  // Push to Ravelry (non-blocking)
  getRavelryClient(user.id).then(async (client) => {
    if (!client) return
    const conn = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
    if (!conn) return
    const ravelryId = await ravelryCreateProject(client, conn.ravelry_username, {
      name: project.title,
      craft_type: project.craft_type,
      started_at: project.started_at,
    })
    if (ravelryId) {
      await prisma.projects.update({
        where: { id: project.id },
        data: { ravelry_id: String(ravelryId) },
      })
    }
  }).catch(err => console.error('[ravelry-push] create-from-pattern:', err))

  return NextResponse.json({ success: true, data: project })
})
