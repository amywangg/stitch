/**
 * Test script to verify Ravelry API write access works.
 *
 * What it does:
 * 1. Loads your Ravelry connection from the DB
 * 2. Reads your profile (GET — sanity check)
 * 3. Creates a test project on Ravelry (POST)
 * 4. Reads it back to verify (GET)
 * 5. Deletes it (DELETE)
 *
 * Usage:
 *   cd packages/db
 *   npx tsx test-ravelry-write.ts
 *
 * Requires: .env with DATABASE_URL, ENCRYPTION_KEY, RAVELRY_CLIENT_KEY, RAVELRY_CLIENT_SECRET
 */

import { PrismaClient } from './src/generated/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// ─── Encryption (copied from lib/encrypt.ts to avoid import issues) ─────────

const ALGO = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex')

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, cipherHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const cipher = Buffer.from(cipherHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(cipher)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString('utf8')
}

// ─── OAuth 1.0a signing ─────────────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

function buildAuthHeader(
  method: string, url: string,
  clientKey: string, clientSecret: string,
  accessToken: string, tokenSecret: string,
): string {
  const nonce = crypto.randomBytes(16).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: clientKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  const parsedUrl = new URL(url)
  const allParams: Record<string, string> = { ...oauthParams }
  parsedUrl.searchParams.forEach((v, k) => { allParams[k] = v })
  const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`

  const paramString = Object.keys(allParams).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&')

  const baseString = [method.toUpperCase(), percentEncode(baseUrl), percentEncode(paramString)].join('&')
  const signingKey = `${percentEncode(clientSecret)}&${percentEncode(tokenSecret)}`
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')

  return 'OAuth ' + Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ')
}

async function ravelryRequest(
  method: string, path: string,
  clientKey: string, clientSecret: string,
  accessToken: string, tokenSecret: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: any }> {
  const url = `https://api.ravelry.com${path}`
  const headers: Record<string, string> = {
    Authorization: buildAuthHeader(method, url, clientKey, clientSecret, accessToken, tokenSecret),
    Accept: 'application/json',
  }
  const opts: RequestInit = { method, headers }
  if (body) {
    headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(url, opts)
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🧶 Ravelry Write Test\n')

  // 1. Find a Ravelry connection
  const connection = await prisma.ravelry_connections.findFirst()
  if (!connection) {
    console.error('❌ No Ravelry connection found in DB. Connect Ravelry first.')
    process.exit(1)
  }
  console.log(`✓ Found connection for: ${connection.ravelry_username}`)

  const clientKey = process.env.RAVELRY_CLIENT_KEY!
  const clientSecret = process.env.RAVELRY_CLIENT_SECRET!
  const accessToken = decrypt(connection.access_token)
  const tokenSecret = decrypt(connection.token_secret)
  const username = connection.ravelry_username

  const req = (method: string, path: string, body?: Record<string, unknown>) =>
    ravelryRequest(method, path, clientKey, clientSecret, accessToken, tokenSecret, body)

  // 2. GET profile (sanity check)
  console.log('\n📖 Step 1: GET profile...')
  const profile = await req('GET', `/people/${username}.json`)
  if (profile.status === 200) {
    console.log(`✓ Profile OK: ${profile.data.user?.username} (id: ${profile.data.user?.id})`)
  } else {
    console.error(`❌ GET profile failed: ${profile.status}`, profile.data)
    process.exit(1)
  }

  // 3. POST — create a test project
  console.log('\n✏️  Step 2: POST create test project...')
  const createResult = await req('POST', `/projects/${username}/create.json`, {
    project: {
      name: '__stitch_write_test__',
      craft_id: 1, // knitting
      status_id: 1, // in progress
    },
  })
  console.log(`   Status: ${createResult.status}`)
  if (createResult.status >= 200 && createResult.status < 300) {
    console.log('✓ POST succeeded! Write access confirmed.')
    console.log(`   Project: ${JSON.stringify(createResult.data.project?.name ?? createResult.data).slice(0, 100)}`)
  } else {
    console.error('❌ POST failed:', createResult.status, JSON.stringify(createResult.data).slice(0, 300))
    console.log('\n⚠️  Write access may not be working. Check:')
    console.log('   - Ravelry API app type at ravelry.com/pro/developer')
    console.log('   - OAuth scope includes app-write')
    console.log('   - User re-authorized after scope change')
    process.exit(1)
  }

  // 4. GET — verify project exists
  const projectId = createResult.data.project?.id ?? createResult.data.id
  const permalink = createResult.data.project?.permalink ?? '__stitch_write_test__'
  console.log(`\n📖 Step 3: GET verify project (permalink: ${permalink})...`)
  const getResult = await req('GET', `/projects/${username}/${permalink}.json`)
  if (getResult.status === 200) {
    console.log(`✓ Project verified: "${getResult.data.project?.name}"`)
  } else {
    console.log(`⚠️  Could not verify project (${getResult.status}) — trying delete anyway`)
  }

  // 5. DELETE — clean up
  console.log(`\n🗑️  Step 4: DELETE test project (id: ${projectId})...`)
  const deleteResult = await req('DELETE', `/projects/${username}/${projectId}.json`)
  console.log(`   Status: ${deleteResult.status}`)
  if (deleteResult.status >= 200 && deleteResult.status < 300) {
    console.log('✓ DELETE succeeded! Full write access confirmed.')
  } else if (deleteResult.status === 404) {
    console.log('⚠️  Project not found for delete — may have a different URL format. Check Ravelry manually.')
  } else {
    console.log(`⚠️  DELETE returned ${deleteResult.status}:`, JSON.stringify(deleteResult.data).slice(0, 200))
  }

  console.log('\n' + '═'.repeat(50))
  console.log('🎉 Ravelry write test complete!')
  console.log('   GET  ✓')
  console.log('   POST ✓ (create project)')
  console.log(`   DEL  ${deleteResult.status < 300 ? '✓' : '⚠️'} (cleanup)`)
  console.log('═'.repeat(50))
}

main()
  .catch(err => { console.error('Fatal:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
