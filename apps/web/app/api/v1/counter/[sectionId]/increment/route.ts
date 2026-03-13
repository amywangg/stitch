import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { getRavelryPushClient, pushToRavelry } from '@/lib/ravelry-push'
import { emitActivity } from '@/lib/activity'

type Params = { params: { sectionId: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  // Cross-device realtime sync is a Pro feature; still allow counting on free tier
  // (the sync just won't broadcast to other devices)

  const section = await prisma.project_sections.findFirst({
    where: { id: params.sectionId, project: { user_id: user.id, deleted_at: null } },
    include: { project: true },
  })
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const previous = section.current_row
  const newRow = previous + 1

  await prisma.$transaction([
    prisma.project_sections.update({
      where: { id: params.sectionId },
      data: { current_row: newRow },
    }),
    prisma.row_counter_history.create({
      data: { section_id: params.sectionId, action: 'increment', value: newRow, previous },
    }),
  ])

  // Row milestone events
  const milestones = [50, 100, 250, 500, 1000, 2000, 5000]
  if (milestones.includes(newRow)) {
    emitActivity({
      userId: user.id,
      type: 'row_milestone',
      projectId: section.project_id,
      metadata: { milestone: newRow, currentRow: newRow, projectTitle: section.project.title },
    })
  }

  // Auto-finish: when target_rows is set and counter reaches it
  if (section.target_rows && newRow >= section.target_rows) {
    const today = new Date()
    await prisma.projects.update({
      where: { id: section.project_id },
      data: { status: 'completed', finished_at: today },
    })

    emitActivity({ userId: user.id, type: 'project_completed', projectId: section.project_id })

    if (section.project.ravelry_permalink) {
      const push = await getRavelryPushClient(user.id)
      if (push) {
        pushToRavelry(() =>
          push.client.updateProject(section.project.ravelry_permalink!, {
            status_name: 'Finished',
            completed: today.toISOString().slice(0, 10),
          }),
        )
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { sectionId: params.sectionId, currentRow: newRow, previousRow: previous },
  })
}
