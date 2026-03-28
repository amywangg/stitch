import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { getRavelryClient } from '@/lib/ravelry-client'
import { ravelryUploadPhoto } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/v1/integrations/ravelry/sync/photos
 *
 * Processes the photo upload queue for the current user.
 * Called automatically after sync completes, or manually.
 *
 * Processes up to 10 photos per call to stay within serverless limits.
 * Returns how many were processed so the client can call again if needed.
 *
 * Concurrency safe: uses optimistic locking via status field.
 */
export const POST = withAuth(async (_req, user) => {
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: user.id },
  })
  if (!connection) {
    return NextResponse.json({ success: true, data: { processed: 0, remaining: 0 } })
  }

  const client = await getRavelryClient(user.id)
  if (!client) {
    return NextResponse.json({ success: true, data: { processed: 0, remaining: 0 } })
  }

  // Grab up to 10 pending photos for this user
  const pendingPhotos = await prisma.ravelry_photo_queue.findMany({
    where: { user_id: user.id, status: 'pending' },
    orderBy: { created_at: 'asc' },
    take: 10,
  })

  let processed = 0
  let failed = 0

  for (const job of pendingPhotos) {
    // Mark as processing (optimistic lock)
    await prisma.ravelry_photo_queue.update({
      where: { id: job.id },
      data: { status: 'processing', attempts: job.attempts + 1 },
    })

    try {
      // Download photo from Supabase
      const photoRes = await fetch(job.photo_url)
      if (!photoRes.ok) throw new Error(`Download failed: ${photoRes.status}`)

      const photoBuffer = Buffer.from(await photoRes.arrayBuffer())
      if (photoBuffer.length < 1000) throw new Error('Image too small')

      // Upload to Ravelry
      const photoId = await ravelryUploadPhoto(
        client,
        job.entity_type as 'project' | 'stash',
        connection.ravelry_username,
        parseInt(job.ravelry_id),
        photoBuffer,
        'image/jpeg',
        `${job.entity_type}_photo.jpg`
      )

      if (photoId) {
        await prisma.ravelry_photo_queue.update({
          where: { id: job.id },
          data: { status: 'completed' },
        })
        processed++
      } else {
        throw new Error('Upload returned no photo ID')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      const shouldRetry = job.attempts < 3

      await prisma.ravelry_photo_queue.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? 'pending' : 'failed',
          error: errorMsg,
        },
      })
      failed++
    }

    // Rate limit: 1 photo every 3 seconds (Ravelry needs processing time)
    await new Promise(r => setTimeout(r, 3000))
  }

  // Count remaining
  const remaining = await prisma.ravelry_photo_queue.count({
    where: { user_id: user.id, status: 'pending' },
  })

  // Clean up old completed jobs (older than 24h)
  await prisma.ravelry_photo_queue.deleteMany({
    where: {
      user_id: user.id,
      status: 'completed',
      updated_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })

  return NextResponse.json({
    success: true,
    data: { processed, failed, remaining },
  })
})
