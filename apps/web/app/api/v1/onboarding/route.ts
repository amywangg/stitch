import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

const ONBOARDING_STEPS = [
  'welcome_seen',
  'craft_preference_set',
  'experience_level_set',
  'first_project_created',
  'first_pattern_saved',
  'counter_tutorial_done',
  'ravelry_prompted',
] as const

type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

// GET /api/v1/onboarding — fetch current onboarding state
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const onboarding = await prisma.user_onboarding.findUnique({
    where: { user_id: user.id },
  })

  return NextResponse.json({ success: true, data: onboarding })
}

// PATCH /api/v1/onboarding — mark one or more steps complete
export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const body = await req.json()

  // Only allow known step keys
  const updates: Partial<Record<OnboardingStep, boolean>> = {}
  for (const step of ONBOARDING_STEPS) {
    if (typeof body[step] === 'boolean') {
      updates[step] = body[step]
    }
  }

  // Check if all steps are now complete
  const current = await prisma.user_onboarding.findUnique({
    where: { user_id: user.id },
  })

  const merged = { ...current, ...updates }
  const allDone = ONBOARDING_STEPS.every((s) => merged[s])

  const onboarding = await prisma.user_onboarding.upsert({
    where: { user_id: user.id },
    create: { user_id: user.id, ...updates },
    update: {
      ...updates,
      ...(allDone && !current?.onboarding_complete
        ? { onboarding_complete: true, completed_at: new Date() }
        : {}),
    },
  })

  return NextResponse.json({ success: true, data: onboarding })
}
