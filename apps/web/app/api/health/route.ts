import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, string> = {}

  // 1. DB connection
  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`
    checks.database = 'ok'
  } catch (err) {
    checks.database = `error: ${err instanceof Error ? err.message : String(err)}`
  }

  // 2. Clerk config
  try {
    const { userId } = await auth()
    checks.clerk_auth = userId ? `authenticated: ${userId}` : 'no session'
  } catch (err) {
    checks.clerk_auth = `error: ${err instanceof Error ? err.message : String(err)}`
  }

  // 3. Env vars present
  checks.clerk_secret = process.env.CLERK_SECRET_KEY ? `set (${process.env.CLERK_SECRET_KEY.substring(0, 10)}...)` : 'MISSING'
  checks.clerk_pub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? `set (${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.substring(0, 15)}...)` : 'MISSING'
  checks.database_url = process.env.DATABASE_URL ? `set (${process.env.DATABASE_URL.substring(0, 30)}...)` : 'MISSING'

  return NextResponse.json({ status: 'ok', checks })
}
