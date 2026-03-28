import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import { encrypt, decrypt } from '@/lib/encrypt'
import crypto from 'crypto'


export const dynamic = 'force-dynamic'
/**
 * Step 2 of Ravelry OAuth 1.0a (HMAC-SHA1).
 *
 * Web flow: Reads encrypted state from cookie, exchanges tokens, redirects to /settings.
 * iOS flow: Redirects to stitch:// with oauth params so the app can call /exchange.
 */
export async function GET(req: NextRequest) {
  const oauthToken = req.nextUrl.searchParams.get('oauth_token')
  const oauthVerifier = req.nextUrl.searchParams.get('oauth_verifier')

  if (!oauthToken || !oauthVerifier) {
    // Check if this is iOS (no cookie = iOS ASWebAuthenticationSession)
    const hasStateCookie = req.cookies.has('ravelry_state')
    if (!hasStateCookie) {
      return NextResponse.redirect(new URL('stitch://ravelry-callback?error=ravelry_cancelled'))
    }
    return NextResponse.redirect(new URL('/settings?error=ravelry_cancelled', req.url))
  }

  // Check if we have a state cookie (web flow)
  const encryptedState = req.cookies.get('ravelry_state')?.value

  if (!encryptedState) {
    // iOS flow: redirect to stitch:// with the oauth params so the app can call /exchange
    const params = new URLSearchParams({
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
    })
    // Pass username from Ravelry's callback if present
    const username = req.nextUrl.searchParams.get('username')
    if (username) params.set('username', username)
    return NextResponse.redirect(new URL(`stitch://ravelry-callback?${params.toString()}`))
  }

  // Web flow: exchange tokens server-side
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.redirect(new URL('/sign-in', req.url))

  let requestTokenSecret: string
  let source = 'web'
  try {
    const payload = JSON.parse(decrypt(encryptedState))
    requestTokenSecret = payload.secret
    source = payload.source || 'web'
    if (Date.now() - payload.ts > 600_000) {
      return NextResponse.redirect(new URL('/settings?error=ravelry_session_expired', req.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/settings?error=ravelry_session_expired', req.url))
  }

  const clientKey = process.env.RAVELRY_CLIENT_KEY!
  const clientSecret = process.env.RAVELRY_CLIENT_SECRET!

  const nonce = crypto.randomBytes(16).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: clientKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: oauthToken,
    oauth_verifier: oauthVerifier,
    oauth_version: '1.0',
  }

  const paramString = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join('&')

  const baseString = [
    'POST',
    percentEncode('https://www.ravelry.com/oauth/access_token'),
    percentEncode(paramString),
  ].join('&')

  const signingKey = `${percentEncode(clientSecret)}&${percentEncode(requestTokenSecret)}`
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64')

  const authHeader = 'OAuth ' + Object.entries({
    ...oauthParams,
    oauth_signature: signature,
  })
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ')

  const accessRes = await fetch('https://www.ravelry.com/oauth/access_token', {
    method: 'POST',
    headers: { Authorization: authHeader },
  })

  if (!accessRes.ok) {
    const body = await accessRes.text()
    console.error('Ravelry access token exchange failed:', accessRes.status, body.slice(0, 200))
    const response = NextResponse.redirect(new URL('/settings?error=ravelry_token_exchange', req.url))
    response.cookies.delete('ravelry_state')
    return response
  }

  const accessBody = await accessRes.text()
  const accessParams = new URLSearchParams(accessBody)
  const accessToken = accessParams.get('oauth_token')
  const tokenSecret = accessParams.get('oauth_token_secret')
  const ravelryUsername = accessParams.get('username')

  if (!accessToken || !tokenSecret || !ravelryUsername) {
    const response = NextResponse.redirect(new URL('/settings?error=ravelry_missing_tokens', req.url))
    response.cookies.delete('ravelry_state')
    return response
  }

  const user = await getDbUser(clerkId)

  await prisma.ravelry_connections.upsert({
    where: { user_id: user.id },
    create: {
      user_id: user.id,
      ravelry_username: ravelryUsername,
      access_token: encrypt(accessToken),
      token_secret: encrypt(tokenSecret),
      sync_to_ravelry: true,
    },
    update: {
      ravelry_username: ravelryUsername,
      access_token: encrypt(accessToken),
      token_secret: encrypt(tokenSecret),
      sync_to_ravelry: true,
    },
  })

  const response = NextResponse.redirect(new URL('/settings?success=ravelry_connected', req.url))
  response.cookies.delete('ravelry_state')
  return response
}

/** RFC 3986 percent-encoding */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}
