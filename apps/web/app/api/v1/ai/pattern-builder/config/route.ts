import { NextResponse } from 'next/server'
import { PROJECT_TYPE_CONFIGS } from '@/lib/pattern-builder/config'
import { HAT_SIZES, SWEATER_SIZES, SOCK_SIZES, MITTEN_SIZES, BLANKET_PRESETS } from '@/lib/pattern-builder/size-charts'


export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/ai/pattern-builder/config
 * Returns the decision tree and size charts for the pattern builder questionnaire.
 * No auth required — free tier can browse.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      project_types: PROJECT_TYPE_CONFIGS,
      size_charts: {
        hat: HAT_SIZES,
        sweater: SWEATER_SIZES,
        socks: SOCK_SIZES,
        mittens: MITTEN_SIZES,
        blanket: BLANKET_PRESETS,
      },
    },
  })
}
