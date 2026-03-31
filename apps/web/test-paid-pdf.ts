import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { RavelryClient } from '@/lib/ravelry-client'

async function test() {
  // Use local DB connection (has the OAuth tokens)
  const conn = await prisma.ravelry_connections.findFirst({ where: { ravelry_username: 'amywangg' } })
  if (!conn) { console.log('No connection found'); return }

  const client = new RavelryClient(
    process.env.RAVELRY_CLIENT_KEY!,
    process.env.RAVELRY_CLIENT_SECRET!,
    decrypt(conn.access_token),
    decrypt(conn.token_secret),
    conn.ravelry_username,
  )

  // Get Beate Balaclava volume attachments
  console.log('Getting volume details for Beate Balaclava (vol 562406335)...')
  const volDetail = await (client as any).get('/volumes/562406335.json')
  const attachments = volDetail?.volume?.volume_attachments ?? []

  console.log(`Found ${attachments.length} attachments\n`)

  for (const att of attachments) {
    const attId = att.product_attachment_id
    console.log(`${att.filename} (${att.language_code}, ${Math.round(att.bytes/1024)}KB, id: ${attId})`)

    // Try generate_download_link with the correct ID
    try {
      const res = await (client as any).post(`/product_attachments/${attId}/generate_download_link.json`)
      console.log('  SUCCESS:', JSON.stringify(res).slice(0, 300))

      // If we got a URL, try to download it
      if (res?.download_link?.url) {
        const buf = await client.fetchBinary(res.download_link.url)
        if (buf && buf.slice(0, 4).toString() === '%PDF') {
          console.log(`  PDF downloaded! ${buf.length} bytes`)
        } else {
          console.log(`  Download returned ${buf?.length ?? 0} bytes, not a PDF`)
        }
      }
    } catch (err: any) {
      console.log(`  FAILED: ${err.message.slice(0, 200)}`)
    }
  }

  await prisma.$disconnect()
}
test()
