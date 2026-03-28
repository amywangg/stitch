import { NextRequest, NextResponse } from 'next/server'
import { BUYER_AGREEMENT, CREATOR_AGREEMENT, DMCA_POLICY } from '@/lib/agreements'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/marketplace/agreements
 * Returns the current marketplace agreement texts.
 * Query param: type=buyer|creator|dmca|all (default: all)
 *
 * No auth required — agreements are public.
 */
export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') || 'all'

  switch (type) {
    case 'buyer':
      return NextResponse.json({ success: true, data: BUYER_AGREEMENT })
    case 'creator':
      return NextResponse.json({ success: true, data: CREATOR_AGREEMENT })
    case 'dmca':
      return NextResponse.json({ success: true, data: DMCA_POLICY })
    default:
      return NextResponse.json({
        success: true,
        data: {
          buyer: BUYER_AGREEMENT,
          creator: CREATOR_AGREEMENT,
          dmca: DMCA_POLICY,
        },
      })
  }
}
