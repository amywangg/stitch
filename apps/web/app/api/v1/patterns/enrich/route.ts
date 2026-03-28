import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { getRavelryPatternDetail } from '@/lib/ravelry-search'
import { slugify } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'


export const dynamic = 'force-dynamic'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'patterns'

export const maxDuration = 300

/**
 * POST /api/v1/patterns/enrich
 *
 * Batch-enriches the user's Ravelry-sourced patterns that are missing detailed data.
 * Also stores all photos and auto-downloads free PDFs.
 */
export const POST = withAuth(async (_req, user) => {
  // Find all Ravelry-sourced patterns missing rich data
  const sparsePatterns = await prisma.patterns.findMany({
    where: {
      user_id: user.id,
      ravelry_id: { not: null },
      deleted_at: null,
      // Missing both description AND gauge = sparse record
      description: null,
      gauge_stitches_per_10cm: null,
    },
    select: { id: true, ravelry_id: true },
  })

  if (sparsePatterns.length === 0) {
    return NextResponse.json({ success: true, data: { enriched: 0, failed: 0, total: 0 } })
  }

  let enriched = 0
  let failed = 0

  for (const pattern of sparsePatterns) {
    try {
      const ravelryId = parseInt(pattern.ravelry_id!, 10)
      if (isNaN(ravelryId)) { failed++; continue }

      const detail = await getRavelryPatternDetail(ravelryId, user.id)

      await prisma.patterns.update({
        where: { id: pattern.id },
        data: {
          title: detail.name,
          description: detail.notes ?? null,
          notes_html: detail.notes_html ?? null,
          craft_type: detail.craft ?? 'knitting',
          difficulty: detail.difficulty ? String(detail.difficulty) : null,
          garment_type: detail.pattern_categories?.[0] ?? null,
          designer_name: detail.designer ?? null,
          yarn_weight: detail.weight ?? null,
          needle_size_mm: detail.gauge_needle_mm ?? null,
          needle_sizes: detail.needle_sizes ?? [],
          sizes_available: detail.sizes_available ?? null,
          gauge_stitches_per_10cm: detail.gauge_stitches ?? null,
          gauge_rows_per_10cm: detail.gauge_rows ?? null,
          gauge_stitch_pattern: detail.gauge_stitch_pattern ?? null,
          rating: detail.rating ?? null,
          rating_count: detail.rating_count ?? null,
          yardage_min: detail.yardage_min,
          yardage_max: detail.yardage_max,
          source_url: detail.url,
          cover_image_url: detail.photo_url ?? null,
          source_free: detail.free,
        },
      })

      // Store all photos
      if (detail.photos && detail.photos.length > 0) {
        await prisma.pattern_photos.deleteMany({ where: { pattern_id: pattern.id } })
        await prisma.pattern_photos.createMany({
          data: detail.photos.map((url: string, i: number) => ({
            pattern_id: pattern.id,
            url,
            sort_order: i,
          })),
        })
      }

      // Auto-download free PDF if available and no PDF exists yet
      if (detail.free && detail.download_location?.url) {
        const hasPdf = await prisma.pdf_uploads.findFirst({
          where: { pattern_id: pattern.id, user_id: user.id },
        })
        if (!hasPdf) {
          try {
            const dlRes = await fetch(detail.download_location.url, {
              redirect: 'follow',
              headers: { 'User-Agent': 'Stitch/1.0' },
            })
            if (dlRes.ok) {
              const arrayBuf = await dlRes.arrayBuffer()
              const pdfBuffer = Buffer.from(arrayBuf)
              const isPdf = pdfBuffer.length >= 100 && pdfBuffer.slice(0, 4).toString() === '%PDF'
              if (isPdf && pdfBuffer.length <= 20 * 1024 * 1024) {
                const timestamp = Date.now()
                const safeFileName = slugify(detail.name).slice(0, 80)
                const storagePath = `${user.id}/${timestamp}-ravelry-${ravelryId}-${safeFileName}.pdf`

                const { error: uploadError } = await supabaseAdmin.storage
                  .from(BUCKET)
                  .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

                if (!uploadError) {
                  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
                  await prisma.pdf_uploads.create({
                    data: {
                      user_id: user.id,
                      pattern_id: pattern.id,
                      file_name: `${safeFileName}.pdf`,
                      file_size: pdfBuffer.length,
                      status: 'stored',
                      storage_path: storagePath,
                    },
                  })
                  await prisma.patterns.update({
                    where: { id: pattern.id },
                    data: { pdf_url: urlData.publicUrl },
                  })
                }
              }
            }
          } catch {
            // PDF download failed — non-critical
          }
        }
      }

      enriched++
    } catch {
      failed++
    }
  }

  return NextResponse.json({
    success: true,
    data: { enriched, failed, total: sparsePatterns.length },
  })
})
