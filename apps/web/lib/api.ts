'use client'

/**
 * Client-side API wrapper. Automatically attaches the Clerk session token.
 */

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

async function getToken(): Promise<string | null> {
  // Dynamic import to avoid server-side issues
  const { useAuth } = await import('@clerk/nextjs')
  // This is called from non-hook context; Clerk provides window.__clerk for client calls
  if (typeof window !== 'undefined' && (window as unknown as { Clerk?: { session?: { getToken(): Promise<string | null> } } }).Clerk?.session) {
    return (window as unknown as { Clerk: { session: { getToken(): Promise<string | null> } } }).Clerk.session.getToken()
  }
  return null
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(error.error ?? 'Request failed'), { status: res.status, data: error })
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
}
