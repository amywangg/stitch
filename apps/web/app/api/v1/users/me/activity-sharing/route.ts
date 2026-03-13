import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { ACTIVITY_TYPES } from '@/lib/activity'

/** GET — returns current activity sharing preferences */
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  // null = all on — expand to explicit object for the client
  const stored = user.activity_sharing as Record<string, boolean> | null
  const preferences: Record<string, boolean> = {}
  for (const { key } of ACTIVITY_TYPES) {
    preferences[key] = stored ? stored[key] !== false : true
  }

  return NextResponse.json({
    success: true,
    data: { preferences },
  })
}

/** PATCH — update activity sharing preferences */
export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const body = await req.json()
  const { preferences } = body as { preferences?: Record<string, boolean> }

  if (!preferences || typeof preferences !== 'object') {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'preferences object required' }, { status: 400 })
  }

  // Only allow known activity type keys
  const validKeys = new Set(ACTIVITY_TYPES.map((t) => t.key))
  const cleaned: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(preferences)) {
    if (validKeys.has(key as typeof ACTIVITY_TYPES[number]['key']) && typeof value === 'boolean') {
      cleaned[key] = value
    }
  }

  const updated = await prisma.users.update({
    where: { id: user.id },
    data: { activity_sharing: cleaned },
    select: { activity_sharing: true },
  })

  // Expand for client
  const stored = updated.activity_sharing as Record<string, boolean> | null
  const result: Record<string, boolean> = {}
  for (const { key } of ACTIVITY_TYPES) {
    result[key] = stored ? stored[key] !== false : true
  }

  return NextResponse.json({
    success: true,
    data: { preferences: result },
  })
}
