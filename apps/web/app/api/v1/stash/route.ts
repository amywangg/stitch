import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emitActivity } from '@/lib/activity'
import { withAuth, parsePagination, paginatedResponse } from '@/lib/route-helpers'
import { getRavelryClient } from '@/lib/ravelry-client'


export const dynamic = 'force-dynamic'
export const GET = withAuth(async (req, user) => {
  const { page, limit, skip } = parsePagination(req, 50)
  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') // "in_stash" | "used_up" | "gifted" | "for_sale" | null (all)

  const where = {
    user_id: user.id,
    ...(statusFilter ? { status: statusFilter } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.user_stash.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: { yarn: { include: { company: true } } },
    }),
    prisma.user_stash.count({ where }),
  ])

  return paginatedResponse(items, total, page, limit)
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { yarn_id, colorway, skeins, grams, notes } = body

  // Accept either an existing yarn_id OR ravelry yarn data to auto-create
  const { ravelry_yarn } = body as {
    ravelry_yarn?: {
      ravelry_id: number
      name: string
      company_name: string
      weight?: string | null
      yardage?: number | null
      grams?: number | null
      photo_url?: string | null
      fiber_content?: string | null
    }
  }

  let resolvedYarnId = yarn_id

  // If ravelry_yarn is provided, find or create the yarn + company
  if (!resolvedYarnId && ravelry_yarn) {
    // Check if we already have this yarn by ravelry_id
    const existing = await prisma.yarns.findUnique({
      where: { ravelry_id: String(ravelry_yarn.ravelry_id) },
    })
    if (existing) {
      resolvedYarnId = existing.id
    } else {
      // Find or create company
      let companyId: string | null = null
      if (ravelry_yarn.company_name) {
        const company = await prisma.yarn_companies.upsert({
          where: { name: ravelry_yarn.company_name },
          update: {},
          create: { name: ravelry_yarn.company_name },
        })
        companyId = company.id
      }

      // Create yarn
      const newYarn = await prisma.yarns.create({
        data: {
          name: ravelry_yarn.name,
          company_id: companyId,
          ravelry_id: String(ravelry_yarn.ravelry_id),
          weight: ravelry_yarn.weight ?? null,
          yardage_per_skein: ravelry_yarn.yardage ?? null,
          grams_per_skein: ravelry_yarn.grams ?? null,
          image_url: ravelry_yarn.photo_url ?? null,
          fiber_content: ravelry_yarn.fiber_content ?? null,
        },
      })
      resolvedYarnId = newYarn.id
    }
  }

  if (!resolvedYarnId) return NextResponse.json({ error: 'yarn_id or ravelry_yarn is required' }, { status: 400 })

  const yarn = await prisma.yarns.findUnique({ where: { id: resolvedYarnId } })
  if (!yarn) return NextResponse.json({ error: 'Yarn not found' }, { status: 404 })

  const item = await prisma.user_stash.create({
    data: {
      user_id: user.id,
      yarn_id: resolvedYarnId,
      colorway: colorway ?? null,
      skeins: skeins ?? 1,
      grams: grams ?? null,
      notes: notes ?? null,
    },
    include: { yarn: { include: { company: true } } },
  })

  emitActivity({
    userId: user.id,
    type: 'stash_added',
    metadata: { yarnName: yarn.name },
  })

  // Push to Ravelry stash (non-blocking)
  // Create shell, then link yarn_id (which sets name + photo) and set notes/colorway
  getRavelryClient(user.id).then(async (client) => {
    if (!client) return
    const conn = await prisma.ravelry_connections.findUnique({ where: { user_id: user.id } })
    if (!conn) return
    try {
      const createRes = await client.post<{ stash: { id: number } }>(
        `/people/${conn.ravelry_username}/stash/create.json`
      )
      const ravelryStashId = createRes?.stash?.id
      if (ravelryStashId) {
        const updateBody: Record<string, unknown> = {}

        // Link to Ravelry yarn (this sets name + photo automatically)
        if (yarn.ravelry_id) {
          updateBody.yarn_id = parseInt(yarn.ravelry_id)
        }

        // Call 1: Set yarn_id (creates pack, sets name + product photo)
        const linkRes = await client.post<{ stash: { packs: Array<{ id: number }> } }>(
          `/people/${conn.ravelry_username}/stash/${ravelryStashId}.json`,
          updateBody
        )
        const packId = linkRes?.stash?.packs?.[0]?.id

        // Call 2: Flat fields — notes, location
        await client.post(`/people/${conn.ravelry_username}/stash/${ravelryStashId}.json`, {
          notes: 'Synced from Stitch',
          location: 'Stitch app',
        })

        // Call 3: Pack data — colorway + skeins via pack singular wrapper
        if (packId) {
          await client.post(`/people/${conn.ravelry_username}/stash/${ravelryStashId}.json`, {
            pack: {
              id: packId,
              ...(item.colorway ? { colorway: item.colorway } : {}),
              skeins: item.skeins,
            },
          })
        }

        // Call 4: Stash-level colorway via stash wrapper
        if (item.colorway) {
          await client.post(`/people/${conn.ravelry_username}/stash/${ravelryStashId}.json`, {
            stash: { colorway_name: item.colorway },
          })
        }

        // Save ravelry_id for future sync
        await prisma.user_stash.update({
          where: { id: item.id },
          data: { ravelry_id: String(ravelryStashId) },
        })

        // Queue photo upload — user photo or yarn product photo as fallback
        const photoUrl = item.photo_url || yarn.image_url
        if (photoUrl) {
          await prisma.ravelry_photo_queue.create({
            data: {
              user_id: user.id,
              entity_type: 'stash',
              ravelry_id: String(ravelryStashId),
              photo_url: photoUrl,
            },
          }).catch(() => {}) // Non-critical
        }
      }
    } catch (err) {
      console.error('[ravelry-push] stash create:', err)
    }
  }).catch(err => console.error('[ravelry-push] stash create:', err))

  return NextResponse.json({ success: true, data: item }, { status: 201 })
})
