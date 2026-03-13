'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

type CounterState = {
  currentRow: number
  targetRows: number | null
}

/**
 * Subscribes to real-time Postgres changes on `project_sections` for the given section.
 * Returns the latest counter state, updating automatically as other devices write.
 *
 * Requires the user to have a Pro subscription (cross-device sync).
 */
export function useCounterRealtime(sectionId: string, initial: CounterState) {
  const [state, setState] = useState<CounterState>(initial)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`counter:${sectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_sections',
          filter: `id=eq.${sectionId}`,
        },
        (payload) => {
          const row = payload.new as { current_row: number; target_rows: number | null }
          setState({ currentRow: row.current_row, targetRows: row.target_rows })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sectionId])

  return state
}
