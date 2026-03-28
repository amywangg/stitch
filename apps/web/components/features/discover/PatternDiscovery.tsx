'use client'

import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import type { StashItem, PatternResult, SearchState, Stage } from '@/components/features/discover/types'
import CraftStage from '@/components/features/discover/CraftStage'
import YarnStage from '@/components/features/discover/YarnStage'
import CategoryStage from '@/components/features/discover/CategoryStage'
import ResultsStage from '@/components/features/discover/ResultsStage'

// ─── Component ──────────────────────────────────────────────────────────────

export default function PatternDiscovery() {
  const [stage, setStage] = useState<Stage>('craft')
  const [search, setSearch] = useState<SearchState>({
    craft: null,
    stashItem: null,
    weight: null,
    yardageMax: null,
    category: null,
    designer: null,
    availability: null,
    difficulty: null,
  })
  const [stash, setStash] = useState<StashItem[]>([])
  const [stashLoading, setStashLoading] = useState(false)
  const [results, setResults] = useState<PatternResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  // Load stash when entering yarn stage
  const loadStash = useCallback(async () => {
    setStashLoading(true)
    try {
      interface StashApiItem {
        id: string
        colorway: string | null
        skeins: number
        yarn: {
          name: string
          weight: string | null
          yardage_per_skein: number | null
          company: { name: string } | null
        }
      }
      const res = await api.get<{ success: boolean; data: { items: StashApiItem[] } }>('/stash?limit=50')
      setStash(res.data.items.map(item => {
        const yps = item.yarn.yardage_per_skein
        return {
          id: item.id,
          yarn_name: item.yarn.name,
          company: item.yarn.company?.name ?? null,
          weight: item.yarn.weight,
          colorway: item.colorway,
          skeins: item.skeins,
          yardage_per_skein: yps,
          total_yardage: yps ? Math.round(item.skeins * yps) : null,
        }
      }))
    } catch {
      // Stash may be empty — that's fine
    } finally {
      setStashLoading(false)
    }
  }, [])

  // Search Ravelry
  const doSearch = useCallback(async (pageNum = 1) => {
    setResultsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.craft) params.set('craft', search.craft)
      if (search.weight) params.set('weight', search.weight)
      if (search.yardageMax) params.set('yardage_max', String(search.yardageMax))
      if (search.category) params.set('pc', search.category)
      if (search.designer) params.set('pa', search.designer)
      if (search.availability) params.set('availability', search.availability)
      if (search.difficulty) params.set('diff', search.difficulty)
      params.set('page', String(pageNum))
      params.set('page_size', '20')

      const res = await api.get<{
        success: boolean
        data: { patterns: PatternResult[]; paginator: { results: number } }
      }>(`/ravelry/search?${params.toString()}`)

      setResults(res.data.patterns)
      setTotalResults(res.data.paginator.results)
      setPage(pageNum)
    } catch {
      setResults([])
      setTotalResults(0)
    } finally {
      setResultsLoading(false)
    }
  }, [search])

  const savePattern = async (pattern: PatternResult) => {
    try {
      await api.post('/ravelry/patterns/save', { ravelry_id: pattern.ravelry_id })
      setSavedIds(prev => new Set([...prev, pattern.ravelry_id]))
    } catch {
      // Already saved or error
    }
  }

  const unsavePattern = async (ravelryId: number) => {
    try {
      await api.delete('/ravelry/patterns/save', { body: { ravelry_id: ravelryId } })
      setSavedIds(prev => {
        const next = new Set(prev)
        next.delete(ravelryId)
        return next
      })
    } catch {}
  }

  // Navigate stages
  const goTo = (s: Stage) => setStage(s)

  const selectCraft = (craft: 'knitting' | 'crochet') => {
    setSearch(prev => ({ ...prev, craft }))
    loadStash()
    goTo('yarn')
  }

  const selectStashItem = (item: StashItem) => {
    setSearch(prev => ({
      ...prev,
      stashItem: item,
      weight: item.weight,
      yardageMax: item.total_yardage,
    }))
    goTo('category')
  }

  const selectWeight = (weight: string) => {
    setSearch(prev => ({ ...prev, weight, stashItem: null, yardageMax: null }))
    goTo('category')
  }

  const selectCategory = (category: string | null) => {
    setSearch(prev => ({ ...prev, category }))
    goTo('results')
  }

  const updateSearch = (update: Partial<SearchState>) => {
    setSearch(prev => ({ ...prev, ...update }))
  }

  // Auto-search when entering results
  useEffect(() => {
    if (stage === 'results') {
      doSearch(1)
    }
  }, [stage, doSearch])

  // ─── Render stage ─────────────────────────────────────────────────────────

  if (stage === 'craft') {
    return <CraftStage onSelectCraft={selectCraft} />
  }

  if (stage === 'yarn') {
    return (
      <YarnStage
        stash={stash}
        stashLoading={stashLoading}
        onBack={() => goTo('craft')}
        onSelectStashItem={selectStashItem}
        onSelectWeight={selectWeight}
      />
    )
  }

  if (stage === 'category') {
    return (
      <CategoryStage
        search={search}
        onBack={() => goTo('yarn')}
        onSelectCategory={selectCategory}
      />
    )
  }

  return (
    <ResultsStage
      search={search}
      results={results}
      totalResults={totalResults}
      resultsLoading={resultsLoading}
      page={page}
      showFilters={showFilters}
      savedIds={savedIds}
      onSetShowFilters={setShowFilters}
      onUpdateSearch={updateSearch}
      onGoTo={goTo}
      onDoSearch={doSearch}
      onSavePattern={savePattern}
      onUnsavePattern={unsavePattern}
    />
  )
}
