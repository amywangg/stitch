import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase().trim()

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 })
  }

  if (!USERNAME_REGEX.test(q)) {
    return NextResponse.json({
      success: true,
      data: {
        username: q,
        available: false,
        reason: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only',
      },
    })
  }

  // If it's the user's current username, it's "available" (no change needed)
  if (q === user.username) {
    return NextResponse.json({
      success: true,
      data: { username: q, available: true, reason: 'This is your current username' },
    })
  }

  const existing = await prisma.users.findUnique({ where: { username: q } })

  return NextResponse.json({
    success: true,
    data: {
      username: q,
      available: !existing,
      reason: existing ? 'Username is already taken' : null,
    },
  })
}
