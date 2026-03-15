import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { decrypt } from '@/lib/encrypt'
import { RavelryClient } from '@/lib/ravelry-client'

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

  const stats = { imported: 0, updated: 0 }
  const errors: string[] = []

  try {
    const stashItems = await fetchAllPages(async page => {
      const res = await client.listStash(page)
      return { items: res.stash, pageCount: res.paginator.page_count }
    })

    for (const item of stashItems) {
      try {
        let yarnId: string

        if (item.yarn) {
          const companyName = item.yarn.company_name || 'Unknown'
          const company = await prisma.yarn_companies.upsert({
            where: { name: companyName },
            update: {},
            create: { name: companyName },
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
          stats.updated++
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
          stats.imported++
        }
      } catch (err) {
        errors.push(`stash ${item.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`stash fetch: ${err instanceof Error ? err.message : String(err)}`)
  }

  return NextResponse.json({ success: true, data: { ...stats, errors } })
}
