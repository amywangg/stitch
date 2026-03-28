import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { decrypt } from '@/lib/encrypt'
import { slugify } from '@/lib/utils'
import { RavelryClient, RavelryAuthError } from '@/lib/ravelry-client'
import { ravelryUpdateProject } from '@/lib/ravelry-push'


export const dynamic = 'force-dynamic'
/**
 * POST /api/v1/integrations/ravelry/sync/quick
 *
 * Lightweight sync that runs on app open. Only syncs the first page of
 * projects (most recently updated) and pushes local changes back.
 * Takes 2-5 seconds instead of 30-60 for a full sync.
 *
 * Throttled: skips if last sync was less than 15 minutes ago.
 */
export const POST = withAuth(async (_req, user) => {
  const connection = await prisma.ravelry_connections.findUnique({
    where: { user_id: user.id },
  })
  if (!connection) {
    return NextResponse.json({ success: true, data: { skipped: true, reason: 'not_connected' } })
  }

  // Throttle: skip if synced recently (15 minutes)
  if (connection.synced_at) {
    const minutesSinceSync = (Date.now() - connection.synced_at.getTime()) / 60000
    if (minutesSinceSync < 15) {
      return NextResponse.json({
        success: true,
        data: { skipped: true, reason: 'recent_sync', minutes_ago: Math.round(minutesSinceSync) },
      })
    }
  }

  // Don't run if a full sync is in progress
  if (connection.import_status === 'importing') {
    return NextResponse.json({ success: true, data: { skipped: true, reason: 'sync_in_progress' } })
  }

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  const stats = { projects_pulled: 0, projects_pushed: 0, errors: 0 }

  try {
    // ── Pull: first page of projects (most recently updated) ──────────
    const { projects: ravelryProjects } = await client.listProjects(1)

    for (const rp of ravelryProjects.slice(0, 20)) {
      try {
        const existing = await prisma.projects.findFirst({
          where: { user_id: user.id, ravelry_id: String(rp.id), deleted_at: null },
        })

        if (existing) {
          // Update status if changed
          const ravelryStatus = mapStatus(rp.status_name)
          if (existing.status !== ravelryStatus) {
            await prisma.projects.update({
              where: { id: existing.id },
              data: { status: ravelryStatus },
            })
            stats.projects_pulled++
          }
        }
        // Don't create new projects on quick sync — that's for full sync
      } catch {
        stats.errors++
      }
    }

    // ── Push: local projects with ravelry_id ─────────────────────────
    const localProjects = await prisma.projects.findMany({
      where: { user_id: user.id, deleted_at: null, ravelry_id: { not: null } },
      select: {
        id: true, title: true, description: true, status: true,
        craft_type: true, started_at: true, finished_at: true,
        progress_pct: true, ravelry_id: true, updated_at: true,
      },
      orderBy: { updated_at: 'desc' },
      take: 20, // Only push the 20 most recently updated
    })

    for (const project of localProjects) {
      // Only push if updated since last sync
      if (connection.synced_at && project.updated_at <= connection.synced_at) continue

      try {
        await ravelryUpdateProject(client, connection.ravelry_username, project.ravelry_id!, {
          name: project.title,
          notes: project.description,
          status: project.status,
          craft_type: project.craft_type,
          started_at: project.started_at,
          completed_at: project.finished_at,
          progress: project.progress_pct ?? undefined,
        })
        stats.projects_pushed++
      } catch {
        stats.errors++
      }
    }

    // Update synced_at timestamp
    await prisma.ravelry_connections.update({
      where: { user_id: user.id },
      data: { synced_at: new Date() },
    })
  } catch (err) {
    if (err instanceof RavelryAuthError) {
      return NextResponse.json(
        { error: 'Ravelry session expired', code: 'RAVELRY_AUTH_EXPIRED' },
        { status: 401 }
      )
    }
    console.error('[ravelry-quick-sync]', err)
  }

  return NextResponse.json({ success: true, data: { skipped: false, stats } })
})

function mapStatus(ravelryStatus: string): string {
  const map: Record<string, string> = {
    'In Progress': 'active',
    Finished: 'completed',
    Frogged: 'frogged',
    Hibernating: 'hibernating',
  }
  return map[ravelryStatus] ?? 'active'
}
