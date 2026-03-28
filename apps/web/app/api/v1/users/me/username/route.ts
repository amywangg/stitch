import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { z } from 'zod'


export const dynamic = 'force-dynamic'
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/
const COOLDOWN_DAYS = 30

const schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(USERNAME_REGEX, 'Lowercase letters, numbers, and underscores only'),
})

export const PATCH = withAuth(async (req, user) => {
  const body = await req.json()

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { username } = parsed.data

  // No-op if same as current
  if (username === user.username) {
    return NextResponse.json({ success: true, data: user })
  }

  // Check cooldown
  if (user.username_changed_at) {
    const cooldownEnd = new Date(user.username_changed_at)
    cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS)

    if (new Date() < cooldownEnd) {
      const daysLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return NextResponse.json(
        {
          error: `You can change your username again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          code: 'COOLDOWN',
        },
        { status: 429 }
      )
    }
  }

  // Check availability
  const existing = await prisma.users.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json(
      { error: 'Username is already taken', code: 'USERNAME_TAKEN' },
      { status: 409 }
    )
  }

  const updated = await prisma.users.update({
    where: { id: user.id },
    data: {
      username,
      username_changed_at: new Date(),
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
