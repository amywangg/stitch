import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/pdf
 * Paginated list of user's uploaded PDFs.
 */
export const GET = withAuth(async (req, user) => {
  const { page, limit: pageSize, skip } = parsePagination(req)

  const [items, total] = await Promise.all([
    prisma.pdf_uploads.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.pdf_uploads.count({ where: { user_id: user.id } }),
  ])

  return paginatedResponse(items, total, page, pageSize)
})
