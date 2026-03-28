import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDbUser, type UserWithSubscription } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

// ─── Auth wrapper ───────────────────────────────────────────────────────────

type AuthenticatedHandler = (
  req: NextRequest,
  user: UserWithSubscription,
  params?: Record<string, string>
) => Promise<NextResponse>

/**
 * Wraps a Next.js App Router handler with Clerk auth + DB user resolution.
 *
 * Eliminates the boilerplate:
 *   const { userId: clerkId } = await auth()
 *   if (!clerkId) return NextResponse.json(...)
 *   const user = await getDbUser(clerkId)
 *
 * Also catches unhandled errors and returns a consistent 500 response.
 *
 * Usage:
 *   export const GET = withAuth(async (req, user, params) => { ... })
 *   export const POST = withAuth(async (req, user, params) => { ... })
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const user = await getDbUser(clerkId)

    try {
      const params = context?.params ? await context.params : undefined
      return await handler(req, user, params)
    } catch (error) {
      console.error(`[${req.method} ${req.nextUrl.pathname}]`, error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
}

// ─── Pagination ─────────────────────────────────────────────────────────────

/**
 * Parses `page` and `limit` query params with sane defaults and bounds.
 * Returns `skip` pre-calculated for Prisma.
 */
export function parsePagination(req: NextRequest, defaultLimit = 20, maxLimit = 50) {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'))
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? String(defaultLimit)))
  )
  return { page, limit, skip: (page - 1) * limit }
}

/**
 * Builds a standard paginated JSON response.
 */
export function paginatedResponse<T>(items: T[], total: number, page: number, pageSize: number) {
  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize, hasMore: total > page * pageSize },
  })
}

// ─── Ownership lookup ───────────────────────────────────────────────────────

/**
 * Finds a record owned by the given user. Applies soft-delete filter by default.
 *
 * Usage:
 *   const pattern = await findOwned<patterns>(prisma.patterns, id, user.id)
 *   if (!pattern) return NextResponse.json({ error: 'Not found' }, { status: 404 })
 */
export async function findOwned<T>(
  model: { findFirst: Function },
  id: string,
  userId: string,
  options?: { include?: Record<string, any>; softDelete?: boolean }
): Promise<T | null> {
  const where: Record<string, unknown> = { id, user_id: userId }
  if (options?.softDelete !== false) {
    where.deleted_at = null
  }
  return model.findFirst({
    where,
    ...(options?.include ? { include: options.include } : {}),
  })
}

// ─── Slug generation ────────────────────────────────────────────────────────

/**
 * Generates a unique slug for a user-scoped record.
 *
 * Mirrors the pattern used across routes: slugify the title, then append
 * incrementing suffixes until the compound unique constraint passes.
 *
 * @param model       Prisma model delegate (e.g. `prisma.patterns`)
 * @param userId      Owner's user ID
 * @param title       Human-readable title to slugify
 * @param uniqueField Name of the compound unique constraint (default: 'user_id_slug')
 */
export async function generateUniqueSlug(
  model: { findUnique: Function },
  userId: string,
  title: string,
  uniqueField = 'user_id_slug'
): Promise<string> {
  const base = slugify(title)
  let slug = base
  let attempt = 0

  while (
    await model.findUnique({
      where: { [uniqueField]: { user_id: userId, slug } },
    })
  ) {
    attempt++
    slug = `${base}-${attempt}`
  }

  return slug
}
