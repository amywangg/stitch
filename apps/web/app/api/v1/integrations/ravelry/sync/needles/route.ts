import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { decrypt } from '@/lib/encrypt'
import { RavelryClient } from '@/lib/ravelry-client'

function mapNeedleType(ravelryType: string | null): string {
  if (!ravelryType) return 'straight'
  const t = ravelryType.toLowerCase()
  if (t.includes('circular') || t.includes('interchangeable')) return 'circular'
  if (t.includes('dpn')) return 'dpn'
  if (t.includes('crochet') || t.includes('hook')) return 'crochet_hook'
  return 'straight'
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

  const stats = { imported: 0, updated: 0, skipped: 0 }
  const errors: string[] = []

  try {
    const { needles } = await client.listNeedles()

    for (const needle of needles) {
      if (!needle.metric) {
        stats.skipped++
        continue
      }
      const sizeMm = parseFloat(needle.metric)
      if (isNaN(sizeMm)) {
        stats.skipped++
        continue
      }

      try {
        const ravelryId = String(needle.id)
        const existing = await prisma.user_needles.findFirst({
          where: { user_id: user.id, ravelry_id: ravelryId },
        })

        const needleData = {
          type: mapNeedleType(needle.type_id),
          size_mm: sizeMm,
          size_label: needle.us ? `US ${needle.us} / ${needle.metric}mm` : `${needle.metric}mm`,
          length_cm: needle.length ? Math.round(needle.length * 2.54) : null,
          brand: needle.manufacturer ?? null,
        }

        if (existing) {
          await prisma.user_needles.update({ where: { id: existing.id }, data: needleData })
          stats.updated++
        } else {
          await prisma.user_needles.create({
            data: { user_id: user.id, ravelry_id: ravelryId, ...needleData },
          })
          stats.imported++
        }
      } catch (err) {
        errors.push(`needle ${needle.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`needles fetch: ${err instanceof Error ? err.message : String(err)}`)
  }

  return NextResponse.json({ success: true, data: { ...stats, errors } })
}
