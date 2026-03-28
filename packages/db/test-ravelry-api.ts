/**
 * Ravelry API endpoint test suite.
 * Run: cd packages/db && npx tsx test-ravelry-api.ts
 */
import { PrismaClient } from './src/generated/client'
import crypto from 'crypto'

const prisma = new PrismaClient()
const CLIENT_KEY = '3dc102bd4c16b589e6776f35bcd7f063'
const CLIENT_SECRET = '/sxYsRrWjc4Qw1UeAa7c6G9aAuegrNlRGRwrtOfr'
const ENC_KEY = '0000000000000000000000000000000000000000000000000000000000000000'
const BASE = 'https://api.ravelry.com'

function decrypt(ct: string): string {
  const k = Buffer.from(ENC_KEY, 'hex')
  const [iv, tag, data] = ct.split(':').map(h => Buffer.from(h, 'hex'))
  const d = crypto.createDecipheriv('aes-256-gcm', k, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(data), d.final()]).toString('utf8')
}

function pctEnc(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function oauthHeader(method: string, url: string, token: string, secret: string): string {
  const u = new URL(url)
  const p: Record<string, string> = {
    oauth_consumer_key: CLIENT_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
  }
  const all = { ...p } as Record<string, string>
  u.searchParams.forEach((v, k) => { all[k] = v })
  const ps = Object.keys(all).sort().map(k => `${pctEnc(k)}=${pctEnc(all[k])}`).join('&')
  const base = [method.toUpperCase(), pctEnc(`${u.protocol}//${u.host}${u.pathname}`), pctEnc(ps)].join('&')
  const sig = crypto.createHmac('sha1', `${pctEnc(CLIENT_SECRET)}&${pctEnc(secret)}`).update(base).digest('base64')
  return 'OAuth ' + Object.entries({ ...p, oauth_signature: sig }).map(([k, v]) => `${pctEnc(k)}="${pctEnc(v)}"`).join(', ')
}

async function get(path: string, tk: string, ts: string) {
  const url = `${BASE}${path}`
  const r = await fetch(url, { headers: { Authorization: oauthHeader('GET', url, tk, ts), Accept: 'application/json' }, redirect: 'manual' })
  const txt = await r.text()
  const html = txt.trimStart().startsWith('<')
  let data: any = null
  if (!html) try { data = JSON.parse(txt) } catch { data = txt.slice(0, 200) }
  return { s: r.status, data, html }
}

async function post(path: string, body: string, tk: string, ts: string) {
  const url = `${BASE}${path}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: oauthHeader('POST', url, tk, ts), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  const txt = await r.text()
  let data: any = null
  try { data = JSON.parse(txt) } catch { data = txt.slice(0, 300) }
  return { s: r.status, data }
}

async function del(path: string, tk: string, ts: string) {
  const url = `${BASE}${path}`
  const r = await fetch(url, { method: 'DELETE', headers: { Authorization: oauthHeader('DELETE', url, tk, ts), Accept: 'application/json' } })
  const txt = await r.text()
  let data: any = null
  try { data = JSON.parse(txt) } catch { data = txt.slice(0, 100) }
  return { s: r.status, data }
}

const ok = (l: string, d?: string) => console.log(`  ✅ ${l}${d ? ` — ${d}` : ''}`)
const no = (l: string, d: string) => console.log(`  ❌ ${l} — ${d}`)

async function main() {
  const conn = await prisma.ravelry_connections.findFirst({ where: { ravelry_username: 'stitchapp' } })
  if (!conn) { console.log('No stitchapp connection'); return }
  const tk = decrypt(conn.access_token)
  const ts = decrypt(conn.token_secret)
  const u = conn.ravelry_username

  console.log(`\n🧶 Testing Ravelry API for @${u}\n`)

  // ── READS ──
  console.log('── READ ──')

  const r1 = await get(`/people/${u}.json`, tk, ts)
  r1.s === 200 && r1.data?.user ? ok('profile', r1.data.user.username) : no('profile', `${r1.s} html=${r1.html}`)

  const r2 = await get(`/projects/${u}/list.json?page=1&page_size=5`, tk, ts)
  r2.s === 200 ? ok('projects', `${r2.data?.projects?.length ?? 0} items`) : no('projects', `${r2.s} html=${r2.html}`)

  const r3 = await get(`/people/${u}/library/list.json?page=1&page_size=5`, tk, ts)
  r3.s === 200 ? ok('library', `${r3.data?.volumes?.length ?? 0} items`) : no('library', `${r3.s} html=${r3.html}`)

  const r4 = await get(`/people/${u}/queue/list.json?page=1&page_size=5`, tk, ts)
  r4.s === 200 ? ok('queue', `${r4.data?.queued_projects?.length ?? 0} items`) : no('queue', `${r4.s} html=${r4.html}`)

  const r5 = await get(`/people/${u}/stash/list.json?page=1&page_size=5`, tk, ts)
  r5.s === 200 ? ok('stash', `${r5.data?.stash?.length ?? 0} items`) : no('stash', `${r5.s} html=${r5.html}`)

  const r6 = await get(`/people/${u}/friends/list.json?page=1&page_size=5`, tk, ts)
  r6.s === 200 ? ok('friends', `${r6.data?.friendships?.length ?? 0}`) : no('friends', `${r6.s} html=${r6.html}`)

  const r7 = await get('/patterns/search.json?query=hat&page_size=1', tk, ts)
  r7.s === 200 ? ok('pattern search', `${r7.data?.paginator?.results} results`) : no('pattern search', `${r7.s}`)

  const r8 = await get('/patterns/267.json', tk, ts)
  r8.s === 200 ? ok('pattern detail', r8.data?.pattern?.name) : no('pattern detail', `${r8.s}`)

  const r9 = await get('/needles/sizes.json?craft=knitting', tk, ts)
  r9.s === 200 ? ok('needle sizes', `${r9.data?.needle_sizes?.length} sizes`) : no('needle sizes', `${r9.s}`)

  // ── WRITES: Projects ──
  console.log('\n── WRITE: Projects ──')

  // Format A: Rails nested params
  const pA = await post(`/projects/${u}.json`, 'project[name]=StitchTest&project[status_name]=In+Progress&project[craft_name]=Knitting', tk, ts)
  console.log(`  Format A (rails params): ${pA.s}`, pA.s === 200 ? `permalink=${pA.data?.project?.permalink}` : JSON.stringify(pA.data).slice(0, 100))

  // Format B: JSON via data param
  const jsonB = JSON.stringify({ project: { name: 'StitchTestB', status_name: 'In Progress', craft_name: 'Knitting' } })
  const pB = await post(`/projects/${u}.json`, `data=${encodeURIComponent(jsonB)}`, tk, ts)
  console.log(`  Format B (data=json):   ${pB.s}`, pB.s === 200 ? `permalink=${pB.data?.project?.permalink}` : JSON.stringify(pB.data).slice(0, 100))

  // Format C: raw JSON content-type
  {
    const url = `${BASE}/projects/${u}.json`
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: oauthHeader('POST', url, tk, ts), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ project: { name: 'StitchTestC', status_name: 'In Progress', craft_name: 'Knitting' } }),
    })
    const txt = await r.text()
    let d: any; try { d = JSON.parse(txt) } catch { d = txt.slice(0, 100) }
    console.log(`  Format C (raw json):    ${r.status}`, r.status === 200 ? `permalink=${d?.project?.permalink}` : JSON.stringify(d).slice(0, 100))
  }

  // Clean up any created projects
  const cleanup = await get(`/projects/${u}/list.json?page=1&page_size=50`, tk, ts)
  if (cleanup.s === 200) {
    for (const proj of (cleanup.data?.projects ?? [])) {
      if (proj.name.startsWith('StitchTest')) {
        const dr = await del(`/projects/${u}/${proj.permalink}.json`, tk, ts)
        console.log(`  Cleanup: DELETE ${proj.permalink} → ${dr.s}`)
      }
    }
  }

  // ── WRITES: Queue ──
  console.log('\n── WRITE: Queue ──')

  const qA = await post(`/people/${u}/queue.json`, 'queued_project[pattern_id]=267', tk, ts)
  console.log(`  Add to queue (form):  ${qA.s}`, qA.s === 200 ? `id=${qA.data?.queued_project?.id}` : JSON.stringify(qA.data).slice(0, 100))

  if (qA.s === 200 && qA.data?.queued_project?.id) {
    const qd = await del(`/people/${u}/queue/${qA.data.queued_project.id}.json`, tk, ts)
    console.log(`  Remove from queue:    ${qd.s}`)
  }

  // ── WRITES: Stash ──
  console.log('\n── WRITE: Stash ──')

  const sA = await post(`/people/${u}/stash.json`, 'stash[name]=StitchTestYarn&stash[colorway_name]=Red&stash[skeins]=2', tk, ts)
  console.log(`  Create stash (form): ${sA.s}`, sA.s === 200 ? `id=${sA.data?.stash?.id}` : JSON.stringify(sA.data).slice(0, 100))

  if (sA.s === 200 && sA.data?.stash?.id) {
    // Update
    const su = await post(`/people/${u}/stash/${sA.data.stash.id}.json`, '_method=put&stash[colorway_name]=Blue&stash[skeins]=3', tk, ts)
    console.log(`  Update stash:        ${su.s}`)

    // Delete
    const sd = await del(`/people/${u}/stash/${sA.data.stash.id}.json`, tk, ts)
    console.log(`  Delete stash:        ${sd.s}`)
  }

  console.log('\n── DONE ──\n')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
