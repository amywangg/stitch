import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

/**
 * GET /api/v1/measurements
 * Returns the current user's measurements (or null if not set).
 */
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const measurements = await prisma.user_measurements.findUnique({
    where: { user_id: user.id },
  })

  return NextResponse.json({ success: true, data: measurements })
}

/**
 * PUT /api/v1/measurements
 * Upsert measurements. All fields optional — only provided fields are updated.
 */
export async function PUT(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const body = await req.json()

  const allowed = [
    'unit_preference',
    'bust_cm', 'waist_cm', 'hip_cm', 'shoulder_width_cm',
    'back_length_cm', 'arm_length_cm', 'upper_arm_cm', 'wrist_cm',
    'head_circumference_cm',
    'inseam_cm',
    'foot_length_cm', 'foot_circumference_cm',
    'height_cm',
    'notes',
  ] as const

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const measurements = await prisma.user_measurements.upsert({
    where: { user_id: user.id },
    update: data,
    create: { user_id: user.id, ...data },
  })

  return NextResponse.json({ success: true, data: measurements })
}
