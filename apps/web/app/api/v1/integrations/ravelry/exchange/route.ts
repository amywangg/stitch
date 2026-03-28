import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/route-helpers'
import { encrypt, decrypt } from '@/lib/encrypt'
import crypto from 'crypto'


export const dynamic = 'force-dynamic'
/** RFC 3986 percent-encoding */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

/**
 * iOS-only: Exchange OAuth request token for access token.
 * The iOS app calls this after ASWebAuthenticationSession returns the callback.
 * It passes the oauth_token, oauth_verifier, and encrypted state from the connect step.
 */
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json()
    const oauthToken = body.oauth_token as string | undefined
    const oauthVerifier = body.oauth_verifier as string | undefined
    const state = body.state as string | undefined
    const usernameFromCallback = body.username as string | undefined

    if (!oauthToken || !oauthVerifier || !state) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Decrypt the state to get the request token secret
    let requestTokenSecret: string
    try {
      const payload = JSON.parse(decrypt(state))
      requestTokenSecret = payload.secret
      if (Date.now() - payload.ts > 600_000) {
        return NextResponse.json({ error: 'OAuth session expired' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
    }

    const clientKey = process.env.RAVELRY_CLIENT_KEY!
    const clientSecret = process.env.RAVELRY_CLIENT_SECRET!

    // Build HMAC-SHA1 signature for access token exchange
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

    const authHeader =
      'OAuth ' +
      Object.entries({ ...oauthParams, oauth_signature: signature })
        .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
        .join(', ')

    console.log('[exchange] about to fetch access_token...')

    let accessBody: string
    try {
      const accessRes = await fetch('https://www.ravelry.com/oauth/access_token', {
        method: 'POST',
        headers: { Authorization: authHeader },
      })
      console.log('[exchange] fetch status:', accessRes.status)
      accessBody = await accessRes.text()
      console.log('[exchange] fetch body:', accessBody.slice(0, 200))

      if (!accessRes.ok) {
        return NextResponse.json(
          { error: `Token exchange failed (${accessRes.status}): ${accessBody.slice(0, 200)}` },
          { status: 502 }
        )
      }
    } catch (fetchErr) {
      console.log('[exchange] FETCH ERROR:', fetchErr instanceof Error ? fetchErr.message : String(fetchErr))
      return NextResponse.json(
        { error: `Fetch error: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}` },
        { status: 502 }
      )
    }
    const accessParams = new URLSearchParams(accessBody)
    const accessToken = accessParams.get('oauth_token')
    const tokenSecret = accessParams.get('oauth_token_secret')
    // Username comes from callback URL params, not from the access token response
    const ravelryUsername = accessParams.get('username') || usernameFromCallback || 'unknown'

    if (!accessToken || !tokenSecret) {
      return NextResponse.json({ error: 'Missing tokens from Ravelry' }, { status: 502 })
    }

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

    return NextResponse.json({ success: true, data: { username: ravelryUsername } })
  } catch (err) {
    console.log('[exchange] CAUGHT ERROR:', err instanceof Error ? err.message : String(err))
    console.log('[exchange] STACK:', err instanceof Error ? err.stack : 'no stack')
    return NextResponse.json(
      { error: `Exchange error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
})
