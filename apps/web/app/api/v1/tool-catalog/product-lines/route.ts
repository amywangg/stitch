import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'


export const dynamic = 'force-dynamic'
// GET /api/v1/tool-catalog/product-lines — list individual needle/hook product lines
// Query params: brand_id, type (circular|straight|dpn|crochet_hook), search
export const GET = withAuth(async (req, _user) => {
  const brandId = req.nextUrl.searchParams.get('brand_id')
  const type = req.nextUrl.searchParams.get('type')
  const search = req.nextUrl.searchParams.get('search')?.trim()

  const where: Record<string, unknown> = {}
  if (brandId) where.brand_id = brandId
  if (type) where.type = type
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { brand: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const items = await prisma.tool_product_lines.findMany({
    where,
    orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
    include: {
      brand: { select: { id: true, name: true, logo_url: true } },
    },
  })

  return NextResponse.json({ success: true, data: { items } })
})
