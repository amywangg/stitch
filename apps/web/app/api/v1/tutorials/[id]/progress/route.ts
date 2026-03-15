import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { z } from 'zod'

const progressSchema = z.object({
  last_step: z.number().int().min(0),
  completed: z.boolean().optional(),
})

// POST /api/v1/tutorials/[id]/progress — update tutorial progress (auth required)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const { id: tutorialId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = progressSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { last_step, completed } = parsed.data

  // Verify tutorial exists
  const tutorial = await prisma.tutorials.findUnique({
    where: { id: tutorialId },
    include: { _count: { select: { steps: true } } },
  })
  if (!tutorial) {
    return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 })
  }

  const isCompleted = completed ?? (last_step >= tutorial._count.steps)

  const progress = await prisma.user_tutorial_progress.upsert({
    where: {
      user_id_tutorial_id: {
        user_id: user.id,
        tutorial_id: tutorialId,
      },
    },
    update: {
      last_step,
      completed: isCompleted,
      completed_at: isCompleted ? new Date() : null,
    },
    create: {
      user_id: user.id,
      tutorial_id: tutorialId,
      last_step,
      completed: isCompleted,
      completed_at: isCompleted ? new Date() : null,
    },
  })

  return NextResponse.json({ success: true, data: progress })
}
