import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { requirePro } from '@/lib/pro-gate'
import { decrypt } from '@/lib/encrypt'
import { slugify } from '@/lib/utils'
import { RavelryClient, RavelryProjectSummary, RavelryProjectDetail } from '@/lib/ravelry-client'

export const maxDuration = 300

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStatus(ravelryStatus: string): string {
  const map: Record<string, string> = {
    'In Progress': 'active',
    Finished: 'completed',
    Frogged: 'frogged',
    Hibernating: 'hibernating',
  }
  return map[ravelryStatus] ?? 'active'
}

// Convert Ravelry gauge (stitches over N inches) to per-10cm
function toPerTenCm(value: number, divisorInches: number): number {
  return (value / divisorInches) * (10 / 2.54)
}

function mapNeedleType(ravelryType: string | null): string {
  if (!ravelryType) return 'straight'
  const t = ravelryType.toLowerCase()
  if (t.includes('circular') || t.includes('interchangeable')) return 'circular'
  if (t.includes('dpn')) return 'dpn'
  if (t.includes('crochet') || t.includes('hook')) return 'crochet_hook'
  return 'straight'
}

async function uniqueProjectSlug(userId: string, base: string): Promise<string> {
  let slug = slugify(base)
  let attempt = 0
  while (await prisma.projects.findUnique({ where: { user_id_slug: { user_id: userId, slug } } })) {
    attempt++
    slug = `${slugify(base)}-${attempt}`
  }
  return slug
}

async function uniquePatternSlug(userId: string, base: string): Promise<string> {
  let slug = slugify(base)
  let attempt = 0
  while (await prisma.patterns.findUnique({ where: { user_id_slug: { user_id: userId, slug } } })) {
    attempt++
    slug = `${slugify(base)}-${attempt}`
  }
  return slug
}

async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; pageCount: number }>,
): Promise<T[]> {
  const first = await fetchPage(1)
  const all = [...first.items]
  for (let page = 2; page <= first.pageCount; page++) {
    const { items } = await fetchPage(page)
    all.push(...items)
  }
  return all
}

// Run fn over items in batches of batchSize concurrently
async function batchMap<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = await Promise.all(items.slice(i, i + batchSize).map(fn))
    results.push(...batch)
  }
  return results
}

// ─── Phase helpers ─────────────────────────────────────────────────────────────

async function importProjectDetail(
  userId: string,
  summary: RavelryProjectSummary,
  detail: RavelryProjectDetail,
): Promise<'imported' | 'updated'> {
  const ravelryId = String(summary.id)
  const existing = await prisma.projects.findFirst({ where: { user_id: userId, ravelry_id: ravelryId } })

  let projectId: string

  if (existing) {
    await prisma.projects.update({
      where: { id: existing.id },
      data: {
        title: detail.name,
        status: mapStatus(detail.status_name),
        craft_type: detail.craft_name?.toLowerCase() === 'crochet' ? 'crochet' : 'knitting',
        description: detail.notes ?? undefined,
        size_made: detail.size ?? undefined,
        started_at: detail.started ? new Date(detail.started) : null,
        finished_at: detail.completed ? new Date(detail.completed) : null,
        ravelry_permalink: detail.permalink,
      },
    })
    projectId = existing.id
  } else {
    const slug = await uniqueProjectSlug(userId, detail.name)
    const created = await prisma.projects.create({
      data: {
        user_id: userId,
        ravelry_id: ravelryId,
        ravelry_permalink: detail.permalink,
        slug,
        title: detail.name,
        craft_type: detail.craft_name?.toLowerCase() === 'crochet' ? 'crochet' : 'knitting',
        status: mapStatus(detail.status_name),
        description: detail.notes ?? null,
        size_made: detail.size ?? null,
        started_at: detail.started ? new Date(detail.started) : null,
        finished_at: detail.completed ? new Date(detail.completed) : null,
        sections: { create: [{ name: 'Main', sort_order: 0 }] },
      },
    })
    projectId = created.id
  }

  // Photos: delete + recreate
  await prisma.project_photos.deleteMany({ where: { project_id: projectId } })
  const photos = detail.photos ?? []
  if (photos.length > 0) {
    await prisma.project_photos.createMany({
      data: photos.map((photo, i) => ({
        project_id: projectId,
        url: photo.medium_url,
        caption: photo.caption ?? null,
        sort_order: photo.sort_order ?? i,
      })),
    })
  }

  // Yarns: delete Ravelry-sourced entries (name_override set, no catalog link), recreate
  await prisma.project_yarns.deleteMany({
    where: { project_id: projectId, yarn_id: null, stash_item_id: null, name_override: { not: null } },
  })
  const yarns = detail.yarns ?? []
  if (yarns.length > 0) {
    await prisma.project_yarns.createMany({
      data: yarns.map(y => ({
        project_id: projectId,
        name_override: y.yarn?.name ?? y.name_override ?? 'Unknown',
        colorway: y.colorway ?? null,
        skeins_used: y.skeins ?? null,
      })),
    })
  }

  // Gauge: upsert
  const divisor = detail.gauge_divisor ?? 4
  if (detail.gauge != null || detail.row_gauge != null) {
    await prisma.project_gauge.upsert({
      where: { project_id: projectId },
      update: {
        stitches_per_10cm: detail.gauge != null ? toPerTenCm(detail.gauge, divisor) : null,
        rows_per_10cm: detail.row_gauge != null ? toPerTenCm(detail.row_gauge, divisor) : null,
      },
      create: {
        project_id: projectId,
        stitches_per_10cm: detail.gauge != null ? toPerTenCm(detail.gauge, divisor) : null,
        rows_per_10cm: detail.row_gauge != null ? toPerTenCm(detail.row_gauge, divisor) : null,
      },
    })
  }

  return existing ? 'updated' : 'imported'
}

async function upsertPattern(
  userId: string,
  ravelryPatternId: number,
  title: string,
  designerName: string | null,
  permalink: string | null,
  coverImageUrl: string | null = null,
): Promise<string> {
  const existing = await prisma.patterns.findFirst({
    where: { user_id: userId, ravelry_id: String(ravelryPatternId) },
  })
  if (existing) {
    await prisma.patterns.update({
      where: { id: existing.id },
      data: {
        title,
        designer_name: designerName ?? undefined,
        source_url: permalink ? `https://www.ravelry.com/patterns/library/${permalink}` : undefined,
        cover_image_url: coverImageUrl ?? undefined,
      },
    })
    return existing.id
  }
  const slug = await uniquePatternSlug(userId, title)
  const created = await prisma.patterns.create({
    data: {
      user_id: userId,
      ravelry_id: String(ravelryPatternId),
      slug,
      title,
      designer_name: designerName ?? null,
      source_url: permalink ? `https://www.ravelry.com/patterns/library/${permalink}` : null,
      cover_image_url: coverImageUrl,
    },
  })
  return created.id
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const connection = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
  if (!connection) return NextResponse.json({ error: 'Ravelry not connected' }, { status: 400 })

  // Concurrent import guard
  if (connection.import_status === 'importing') {
    return NextResponse.json({ error: 'Import already in progress' }, { status: 409 })
  }

  // TODO: Pro gate: free tier only gets first-time import
  // if (!user.is_pro && connection.synced_at) {
  //   const proError = requirePro(user, 'Ravelry re-sync')
  //   return proError!
  // }

  await prisma.ravelry_connections.update({
    where: { user_id: user.id },
    data: { import_status: 'importing', import_error: null },
  })

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  const stats = {
    profile: { updated: false },
    projects: { imported: 0, updated: 0, total: 0 },
    patterns: { imported: 0, updated: 0 },
    queue: { imported: 0, updated: 0 },
    stash: { imported: 0, updated: 0 },
    needles: { imported: 0, updated: 0 },
    friends: { matched: 0, followed: 0, notOnStitch: 0 },
  }
  const errors: string[] = []

  // Helper to persist progress after each phase so iOS can poll
  async function updateProgress(phase: string) {
    await prisma.ravelry_connections.update({
      where: { user_id: user.id },
      data: { import_stats: { ...stats, current_phase: phase } },
    })
  }

  // ── Phase 1: Profile ─────────────────────────────────────────────────────
  try {
    const { user: profile } = await client.getProfile()
    await prisma.users.update({
      where: { id: user.id },
      data: {
        ...(user.bio == null && profile.about_me ? { bio: profile.about_me } : {}),
        ...(user.location == null && profile.location ? { location: profile.location } : {}),
        ...(user.avatar_url == null && profile.small_photo_url ? { avatar_url: profile.small_photo_url } : {}),
      },
    })
    stats.profile.updated = true
  } catch (err) {
    errors.push(`profile: ${err instanceof Error ? err.message : String(err)}`)
  }
  await updateProgress('projects')

  // ── Phase 2: Projects ────────────────────────────────────────────────────
  try {
    const summaries = await fetchAllPages<RavelryProjectSummary>(async page => {
      const res = await client.listProjects(page)
      return { items: res.projects, pageCount: res.paginator.page_count }
    })

    stats.projects.total = summaries.length

    await batchMap(summaries, 5, async summary => {
      try {
        const { project: detail } = await client.getProject(summary.permalink)
        const result = await importProjectDetail(user.id, summary, detail)
        if (result === 'imported') stats.projects.imported++
        else stats.projects.updated++
      } catch (err) {
        errors.push(`project ${summary.permalink}: ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  } catch (err) {
    errors.push(`projects: ${err instanceof Error ? err.message : String(err)}`)
  }
  await updateProgress('patterns')

  // ── Phase 3: Library (owned patterns) ────────────────────────────────────
  try {
    const volumes = await fetchAllPages(async page => {
      const res = await client.listLibrary(page)
      return { items: res.volumes, pageCount: res.paginator.page_count }
    })

    for (const vol of volumes) {
      if (!vol.pattern) continue
      try {
        const existing = await prisma.patterns.findFirst({
          where: { user_id: user.id, ravelry_id: String(vol.pattern.id) },
        })
        await upsertPattern(
          user.id,
          vol.pattern.id,
          vol.pattern.name,
          vol.pattern.designer?.name ?? null,
          vol.pattern.permalink,
        )
        if (existing) stats.patterns.updated++
        else stats.patterns.imported++
      } catch (err) {
        errors.push(`library ${vol.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`library: ${err instanceof Error ? err.message : String(err)}`)
  }
  await updateProgress('queue')

  // ── Phase 4: Queue ────────────────────────────────────────────────────────
  try {
    const queueItems = await fetchAllPages(async page => {
      const res = await client.listQueue(page)
      return { items: res.queued_projects, pageCount: res.paginator.page_count }
    })

    for (const item of queueItems) {
      // Always try to fetch full pattern details (includes photos)
      const qPatternId = item.pattern?.id ?? item.pattern_id
      let patternInfo = item.pattern
      if (qPatternId) {
        try {
          const fetched = await client.getPattern(qPatternId)
          if (fetched.pattern) {
            patternInfo = fetched.pattern
          }
        } catch {
          // Pattern lookup failed — fall back to nested object
        }
      }
      if (!patternInfo) {
        if (item.pattern_id && item.short_pattern_name) {
          patternInfo = {
            id: item.pattern_id,
            name: item.short_pattern_name,
            permalink: '',
            designer: null,
          }
        } else {
          continue
        }
      }
      try {
        const existingQueueEntry = await prisma.pattern_queue.findFirst({
          where: { user_id: user.id, ravelry_queue_id: String(item.id) },
        })

        if (existingQueueEntry) {
          await prisma.pattern_queue.update({
            where: { id: existingQueueEntry.id },
            data: { notes: item.notes ?? null, sort_order: item.sort_order ?? item.position ?? 0 },
          })
          stats.queue.updated++
        } else {
          // Extract cover image from pattern photos
          const firstPhoto = patternInfo.photos?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]
          const coverImageUrl = firstPhoto?.medium_url ?? firstPhoto?.small_url ?? null

          const patternId = await upsertPattern(
            user.id,
            patternInfo.id,
            patternInfo.name,
            patternInfo.designer?.name ?? null,
            patternInfo.permalink,
            coverImageUrl,
          )
          // Upsert queue entry by [user_id, pattern_id], stamp ravelry_queue_id
          await prisma.pattern_queue.upsert({
            where: { user_id_pattern_id: { user_id: user.id, pattern_id: patternId } },
            update: { ravelry_queue_id: String(item.id), notes: item.notes ?? null, sort_order: item.sort_order ?? item.position ?? 0 },
            create: {
              user_id: user.id,
              pattern_id: patternId,
              ravelry_queue_id: String(item.id),
              notes: item.notes ?? null,
              sort_order: item.sort_order ?? item.position ?? 0,
            },
          })
          stats.queue.imported++
        }
      } catch (err) {
        errors.push(`queue ${item.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`queue: ${err instanceof Error ? err.message : String(err)}`)
  }
  await updateProgress('stash')

  // ── Phase 5: Stash ────────────────────────────────────────────────────────
  try {
    const stashItems = await fetchAllPages(async page => {
      const res = await client.listStash(page)
      return { items: res.stash, pageCount: res.paginator.page_count }
    })

    for (const item of stashItems) {
      try {
        // Resolve yarn catalog entry
        let yarnId: string

        if (item.yarn) {
          const company = await prisma.yarn_companies.upsert({
            where: { name: item.yarn.company_name },
            update: {},
            create: { name: item.yarn.company_name },
          })
          let yarn = await prisma.yarns.findFirst({ where: { ravelry_id: String(item.yarn.id) } })
          if (!yarn) {
            yarn = await prisma.yarns.create({
              data: {
                company_id: company.id,
                name: item.yarn.name,
                weight: item.yarn.weight ?? null,
                yardage_per_skein: item.yarn.yardage ?? null,
                grams_per_skein: item.yarn.grams ?? null,
                ravelry_id: String(item.yarn.id),
              },
            })
          }
          yarnId = yarn.id
        } else {
          // No linked yarn: create a placeholder
          const unknownCompany = await prisma.yarn_companies.upsert({
            where: { name: 'Unknown' },
            update: {},
            create: { name: 'Unknown' },
          })
          const placeholder = await prisma.yarns.findFirst({
            where: { name: item.name, company_id: unknownCompany.id },
          })
          yarnId = placeholder
            ? placeholder.id
            : (
                await prisma.yarns.create({
                  data: { company_id: unknownCompany.id, name: item.name },
                })
              ).id
        }

        // Upsert stash item by ravelry_id
        const existingStash = await prisma.user_stash.findFirst({
          where: { user_id: user.id, ravelry_id: String(item.id) },
        })
        if (existingStash) {
          await prisma.user_stash.update({
            where: { id: existingStash.id },
            data: {
              yarn_id: yarnId,
              colorway: item.colorway ?? null,
              skeins: item.skeins ?? 1,
              grams: item.grams ?? null,
              notes: item.notes ?? null,
            },
          })
          stats.stash.updated++
        } else {
          await prisma.user_stash.create({
            data: {
              user_id: user.id,
              yarn_id: yarnId,
              ravelry_id: String(item.id),
              colorway: item.colorway ?? null,
              skeins: item.skeins ?? 1,
              grams: item.grams ?? null,
              notes: item.notes ?? null,
            },
          })
          stats.stash.imported++
        }
      } catch (err) {
        errors.push(`stash ${item.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`stash: ${err instanceof Error ? err.message : String(err)}`)
  }
  await updateProgress('needles')

  // ── Phase 6: Needles ─────────────────────────────────────────────────────
  try {
    const { needles } = await client.listNeedles()

    for (const needle of needles) {
      if (!needle.metric) continue
      const sizeMm = parseFloat(needle.metric)
      if (isNaN(sizeMm)) continue

      try {
        const ravelryId = String(needle.id)
        const existing = await prisma.user_needles.findFirst({
          where: { user_id: user.id, ravelry_id: ravelryId },
        })

        const needleData = {
          type: mapNeedleType(needle.type_id),
          size_mm: sizeMm,
          size_label: needle.us ? `US ${needle.us} / ${needle.metric}mm` : `${needle.metric}mm`,
          length_cm: needle.length ? Math.round(needle.length * 2.54) : null, // Ravelry length in inches
          brand: needle.manufacturer ?? null,
        }

        if (existing) {
          await prisma.user_needles.update({ where: { id: existing.id }, data: needleData })
          stats.needles.updated++
        } else {
          await prisma.user_needles.create({
            data: { user_id: user.id, ravelry_id: ravelryId, ...needleData },
          })
          stats.needles.imported++
        }
      } catch (err) {
        errors.push(`needle ${needle.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`needles: ${err instanceof Error ? err.message : String(err)}`)
  }

  await updateProgress('friends')

  // ── Phase 7: Friends ──────────────────────────────────────────────────
  try {
    const allFriends = await fetchAllPages(async page => {
      const res = await client.listFriends(page)
      return { items: res.friendships, pageCount: res.paginator.page_count }
    })

    // Cross-reference ravelry usernames against ravelry_connections
    const ravelryUsernames = allFriends.map(f => f.friend_username)
    const matchedConnections = ravelryUsernames.length > 0
      ? await prisma.ravelry_connections.findMany({
          where: { ravelry_username: { in: ravelryUsernames } },
          select: { user_id: true, ravelry_username: true },
        })
      : []

    const matchedUserIds = new Set(matchedConnections.map(c => c.user_id))
    stats.friends.matched = matchedConnections.length
    stats.friends.notOnStitch = allFriends.length - matchedConnections.length

    // Auto-follow matched Stitch users (one-directional: syncing user follows the friend)
    for (const connection of matchedConnections) {
      if (connection.user_id === user.id) continue // don't follow self
      try {
        await prisma.follows.upsert({
          where: {
            follower_id_following_id: { follower_id: user.id, following_id: connection.user_id },
          },
          update: {},
          create: { follower_id: user.id, following_id: connection.user_id },
        })
        stats.friends.followed++
      } catch (err) {
        errors.push(`friend follow ${connection.ravelry_username}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`friends: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── Finalize ─────────────────────────────────────────────────────────────
  const hasData = stats.projects.total > 0 || stats.patterns.imported > 0
  const importStatus = errors.length > 0 && !hasData ? 'error' : 'done'

  await prisma.ravelry_connections.update({
    where: { user_id: user.id },
    data: {
      synced_at: new Date(),
      import_status: importStatus,
      import_error: errors.length > 0 ? errors.slice(0, 10).join('; ') : null,
      import_stats: stats,
    },
  })

  return NextResponse.json({ success: true, data: { ...stats, errors } })
}
