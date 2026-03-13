'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type UserResponse = { success: boolean; data: { is_pro: boolean } }

/**
 * Returns whether the current user has an active Pro subscription.
 * Fetches from /api/v1/users/me and caches in component state.
 */
export function useProGate() {
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<UserResponse>('/users/me')
      .then((res) => {
        if (res.success) setIsPro(res.data.is_pro)
      })
      .catch(() => setIsPro(false))
      .finally(() => setLoading(false))
  }, [])

  return { isPro, loading }
}
