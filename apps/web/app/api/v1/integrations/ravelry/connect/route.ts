import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/route-helpers'
import { encrypt } from '@/lib/encrypt'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Step 1 of Ravelry OAuth 1.0a (HMAC-SHA1).
 * Obtains a request token from Ravelry. The request token secret is encrypted
 * and embedded in the callback URL so it survives across browser contexts.
 */
export const GET = withAuth(async (req, _user) => {
  try {
    const clientKey = process.env.RAVELRY_CLIENT_KEY
    const clientSecret = process.env.RAVELRY_CLIENT_SECRET
    const callbackBase = process.env.RAVELRY_CALLBACK_URL

    if (!clientKey || !clientSecret || !callbackBase) {
      return NextResponse.json({ error: 'Ravelry integration not configured' }, { status: 500 })
    }

    const source = req.nextUrl.searchParams.get('source') // 'ios' or null (web)

    // We need a two-step process: first get request token, then embed the secret in the callback.
    // But Ravelry's oauth_callback is sent during request_token and can't be changed after.
    // So we do: get request token with the base callback → then embed state in authorize URL.
    // Ravelry will redirect to the registered callback, but we pass state via the authorize URL.

    // Actually, Ravelry's OAuth 1.0a allows extra query params on the callback URL.
    // We'll first get the request token, then construct the callback with encrypted state.

    // Step 1: Get request token (callback URL doesn't matter for HMAC-SHA1 signature
    // as long as we send it consistently)
    const nonce = crypto.randomBytes(16).toString('hex')
    const timestamp = Math.floor(Date.now() / 1000).toString()

    // First, do a request token call with a placeholder callback.
    // We need the token secret to build the state, but we need the state in the callback URL,
    // and the callback URL must be in the request token call. Circular dependency.
    //
    // Solution: Use the base callback URL for the request token call.
    // Then encrypt the state and pass it as a query param on the callback.
    // Ravelry preserves query params on the callback URL.

    const oauthParams: Record<string, string> = {
      oauth_callback: callbackBase,
      oauth_consumer_key: clientKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_version: '1.0',
    }

    const paramString = Object.keys(oauthParams)
      .sort()
      .map(k => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
      .join('&')

    const baseString = [
      'POST',
      percentEncode('https://www.ravelry.com/oauth/request_token'),
      percentEncode(paramString),
    ].join('&')

    const signingKey = `${percentEncode(clientSecret)}&`
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

    const tokenRes = await fetch('https://www.ravelry.com/oauth/request_token?scope=app-write+library-pdf', {
      method: 'POST',
      headers: { Authorization: authHeader },
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      console.error('Ravelry request token failed:', tokenRes.status, body.slice(0, 200))
      return NextResponse.json({ error: 'Failed to get Ravelry request token' }, { status: 502 })
    }

    const tokenBody = await tokenRes.text()
    const tokenParams = new URLSearchParams(tokenBody)
    const requestToken = tokenParams.get('oauth_token')
    const requestTokenSecret = tokenParams.get('oauth_token_secret')

    if (!requestToken || !requestTokenSecret) {
      return NextResponse.json({ error: 'Missing oauth_token from Ravelry' }, { status: 502 })
    }

    // Encrypt the request token secret + source into a state param
    const statePayload = JSON.stringify({
      secret: requestTokenSecret,
      source: source || 'web',
      ts: Date.now(),
    })
    const encryptedState = encrypt(statePayload)

    const authUrl = `https://www.ravelry.com/oauth/authorize?oauth_token=${requestToken}&scope=app-write+library-pdf`

    // For iOS: return JSON so the app can open ASWebAuthenticationSession
    if (source === 'ios') {
      return NextResponse.json({ success: true, data: { url: authUrl, state: encryptedState } })
    }

    // For web: store state in a cookie and redirect
    const response = NextResponse.redirect(authUrl)
    response.cookies.set('ravelry_state', encryptedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/api/v1/integrations/ravelry',
    })
    return response
  } catch (err) {
    console.error('Ravelry connect error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
})

/** RFC 3986 percent-encoding */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}
