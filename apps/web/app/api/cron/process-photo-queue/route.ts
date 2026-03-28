import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRavelryClient } from '@/lib/ravelry-client'
import { ravelryUploadPhoto } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/cron/process-photo-queue
 *
 * Called by Vercel Cron every 2 minutes to process the global photo upload queue.
 * Processes up to 20 photos across all users, round-robin.
 *
 * Protected by CRON_SECRET header to prevent unauthorized access.
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const cronSecret = req.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get distinct users with pending photos
  const pendingUsers = await prisma.ravelry_photo_queue.findMany({
    where: { status: 'pending' },
    select: { user_id: true },
    distinct: ['user_id'],
    take: 10, // Max 10 users per cron run
  })

  let totalProcessed = 0
  let totalFailed = 0

  for (const { user_id } of pendingUsers) {
    const client = await getRavelryClient(user_id)
    if (!client) continue

    const connection = await prisma.ravelry_connections.findUnique({
      where: { user_id },
    })
    if (!connection) continue

    // Process up to 3 photos per user per cron run (spread the load)
    const jobs = await prisma.ravelry_photo_queue.findMany({
      where: { user_id, status: 'pending' },
      orderBy: { created_at: 'asc' },
      take: 3,
    })

    for (const job of jobs) {
      await prisma.ravelry_photo_queue.update({
        where: { id: job.id },
        data: { status: 'processing', attempts: job.attempts + 1 },
      })

      try {
        const photoRes = await fetch(job.photo_url)
        if (!photoRes.ok) throw new Error(`Download failed: ${photoRes.status}`)

        const photoBuffer = Buffer.from(await photoRes.arrayBuffer())
        if (photoBuffer.length < 1000) throw new Error('Image too small')

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
          totalProcessed++
        } else {
          throw new Error('Upload returned no photo ID')
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        await prisma.ravelry_photo_queue.update({
          where: { id: job.id },
          data: {
            status: job.attempts >= 3 ? 'failed' : 'pending',
            error: errorMsg,
          },
        })
        totalFailed++
      }

      // Rate limit between photos
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  // Cleanup old completed/failed jobs (older than 7 days)
  await prisma.ravelry_photo_queue.deleteMany({
    where: {
      status: { in: ['completed', 'failed'] },
      updated_at: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  })

  return NextResponse.json({
    success: true,
    data: { processed: totalProcessed, failed: totalFailed, users: pendingUsers.length },
  })
}
