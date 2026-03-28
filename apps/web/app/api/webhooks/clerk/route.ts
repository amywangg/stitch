import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'


export const dynamic = 'force-dynamic'
type ClerkUserEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted'
  data: {
    id: string
    email_addresses: { email_address: string; id: string }[]
    primary_email_address_id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    image_url: string
  }
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'No webhook secret configured' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(secret)
  let event: ClerkUserEvent

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const { type, data } = event

  if (type === 'user.created') {
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id
    )?.email_address

    if (!primaryEmail) {
      return NextResponse.json({ error: 'No primary email' }, { status: 400 })
    }

    // Derive a unique username
    const baseUsername = data.username ?? slugify(`${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || primaryEmail.split('@')[0])
    let username = baseUsername
    let attempt = 0

    while (await prisma.users.findUnique({ where: { username } })) {
      attempt++
      username = `${baseUsername}${attempt}`
    }

    await prisma.users.create({
      data: {
        clerk_id: data.id,
        email: primaryEmail,
        username,
        display_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
        avatar_url: data.image_url || null,
        subscription: {
          create: { plan: 'free', status: 'active' },
        },
        onboarding: {
          create: {},
        },
      },
    })
  }

  if (type === 'user.updated') {
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id
    )?.email_address

    await prisma.users.update({
      where: { clerk_id: data.id },
      data: {
        email: primaryEmail,
        display_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
        avatar_url: data.image_url || null,
      },
    })
  }

  if (type === 'user.deleted') {
    await prisma.users.delete({ where: { clerk_id: data.id } }).catch(() => null)
  }

  return NextResponse.json({ received: true })
}
