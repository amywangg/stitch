import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import type { users, subscriptions } from '@stitch/db'

export type UserWithSubscription = users & { subscription: subscriptions | null }

/**
 * Fetches (or lazily creates) the DB user row for a given Clerk user ID.
 * Always includes the subscription relation so tier gating works correctly.
 * Falls back to upsert via the Clerk backend API so webhooks aren't required
 * in local dev.
 */
export async function getDbUser(clerkId: string): Promise<UserWithSubscription> {
  const existing = await prisma.users.findUnique({
    where: { clerk_id: clerkId },
    include: { subscription: true },
  })
  if (existing) return existing

  // User not in DB yet (webhook hasn't fired or is misconfigured).
  // Fetch from Clerk and create the row now.
  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(clerkId)

  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress

  if (!primaryEmail) throw new Error(`Clerk user ${clerkId} has no email address`)

  const baseUsername =
    clerkUser.username ??
    slugify(
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim() ||
        primaryEmail.split('@')[0]
    )

  let username = baseUsername
  let attempt = 0
  while (await prisma.users.findUnique({ where: { username } })) {
    attempt++
    username = `${baseUsername}${attempt}`
  }

  return prisma.users.create({
    data: {
      clerk_id: clerkId,
      email: primaryEmail,
      username,
      display_name:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
      avatar_url: clerkUser.imageUrl || null,
      subscription: { create: { plan: 'free', status: 'active' } },
      onboarding: { create: {} },
    },
    include: { subscription: true },
  })
}
