import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { decrypt } from '@/lib/encrypt'
import { slugify } from '@/lib/utils'
import { RavelryClient } from '@/lib/ravelry-client'

async function uniquePatternSlug(userId: string, base: string): Promise<string> {
  let slug = slugify(base)
  let attempt = 0
  while (await prisma.patterns.findUnique({ where: { user_id_slug: { user_id: userId, slug } } })) {
    attempt++
    slug = `${slugify(base)}-${attempt}`
  }
  return slug
}

async function upsertPattern(
  userId: string,
  ravelryPatternId: number,
  title: string,
  designerName: string | null,
  permalink: string | null,
  coverImageUrl: string | null,
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

export async function POST(_req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getDbUser(clerkId)

  const connection = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
  if (!connection) return NextResponse.json({ error: 'Ravelry not connected' }, { status: 400 })

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(connection.access_token),
    decrypt(connection.token_secret),
    connection.ravelry_username,
  )

  const stats = { imported: 0, updated: 0, skipped: 0, ravelryTotal: 0 }
  const errors: string[] = []

  try {
    // First, do a raw fetch to see what Ravelry actually returns
    const rawRes = await client.listQueue(1)
    const items = rawRes.queued_projects
    if (!items) {
      // Response key might be different — log the actual keys
      const keys = Object.keys(rawRes).filter(k => k !== 'paginator')
      errors.push(`Ravelry returned keys: ${keys.join(', ')}. Expected 'queued_projects'.`)
      return NextResponse.json({ success: true, data: { ...stats, errors, rawKeys: keys } })
    }

    const queueItems = await fetchAllPages(async page => {
      const res = await client.listQueue(page)
      return { items: res.queued_projects ?? [], pageCount: res.paginator?.page_count ?? 1 }
    })
    stats.ravelryTotal = queueItems.length

    for (const item of queueItems) {
      // Always try to fetch full pattern details (includes photos)
      const patternId = item.pattern?.id ?? item.pattern_id
      let patternInfo = item.pattern
      if (patternId) {
        try {
          const fetched = await client.getPattern(patternId)
          if (fetched.pattern) {
            patternInfo = fetched.pattern
          }
        } catch {
          // Pattern lookup failed — fall back to nested object
        }
      }

      if (!patternInfo) {
        // Last resort: create from short_pattern_name if available
        if (item.pattern_id && item.short_pattern_name) {
          patternInfo = {
            id: item.pattern_id,
            name: item.short_pattern_name,
            permalink: '',
            designer: null,
          }
        } else {
          stats.skipped++
          continue
        }
      }

      try {
        // Extract cover image from pattern photos
        const firstPhoto = patternInfo.photos?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]
        const coverImageUrl = firstPhoto?.medium_url ?? firstPhoto?.small_url ?? null

        const existingQueueEntry = await prisma.pattern_queue.findFirst({
          where: { user_id: user.id, ravelry_queue_id: String(item.id) },
        })

        if (existingQueueEntry) {
          // Update the pattern's cover image too
          await upsertPattern(
            user.id,
            patternInfo.id,
            patternInfo.name,
            patternInfo.designer?.name ?? null,
            patternInfo.permalink,
            coverImageUrl,
          )
          await prisma.pattern_queue.update({
            where: { id: existingQueueEntry.id },
            data: { notes: item.notes ?? null, sort_order: item.sort_order ?? item.position ?? 0 },
          })
          stats.updated++
        } else {
          const patternId = await upsertPattern(
            user.id,
            patternInfo.id,
            patternInfo.name,
            patternInfo.designer?.name ?? null,
            patternInfo.permalink,
            coverImageUrl,
          )
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
          stats.imported++
        }
      } catch (err) {
        errors.push(`queue ${item.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`queue fetch: ${err instanceof Error ? err.message : String(err)}`)
  }

  return NextResponse.json({ success: true, data: { ...stats, errors } })
}
