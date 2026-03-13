'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  Search, ChevronLeft, ChevronRight, Heart, Bookmark, ExternalLink,
  SlidersHorizontal, X, Loader2, Sparkles,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface StashItem {
  id: string
  yarn_name: string
  company: string | null
  weight: string | null
  colorway: string | null
  skeins: number
  yardage_per_skein: number | null
  total_yardage: number | null
}

interface PatternResult {
  ravelry_id: number
  name: string
  permalink: string
  craft: string
  weight: string | null
  yardage_min: number | null
  yardage_max: number | null
  gauge: string | null
  difficulty: number | null
  rating: number | null
  photo_url: string | null
  designer: string | null
  free: boolean
}

interface SearchState {
  craft: 'knitting' | 'crochet' | null
  stashItem: StashItem | null
  weight: string | null
  yardageMax: number | null
  category: string | null
  designer: string | null
  availability: 'free' | null
  difficulty: string | null
}

type Stage = 'craft' | 'yarn' | 'category' | 'results'

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'sweater', label: 'Sweater', emoji: '🧶' },
  { value: 'hat', label: 'Hat / Beanie', emoji: '🧢' },
  { value: 'socks', label: 'Socks', emoji: '🧦' },
  { value: 'scarf', label: 'Scarf', emoji: '🧣' },
  { value: 'shawl-wrap', label: 'Shawl / Wrap', emoji: '🪶' },
  { value: 'mittens', label: 'Mittens / Gloves', emoji: '🧤' },
  { value: 'cardigan', label: 'Cardigan', emoji: '👚' },
  { value: 'blanket', label: 'Blanket', emoji: '🛏️' },
  { value: 'cowl', label: 'Cowl', emoji: '⭕' },
  { value: 'vest', label: 'Vest / Tank', emoji: '🦺' },
  { value: 'bag', label: 'Bag / Tote', emoji: '👜' },
  { value: 'toy', label: 'Toy / Amigurumi', emoji: '🧸' },
]

const POPULAR_DESIGNERS = [
  'PetiteKnit',
  'Andrea Mowry',
  'Jessie Maed Designs',
  'TinCanKnits',
  'Stephen West',
  'Drops Design',
  'Purl Soho',
  'Joji Locatelli',
  'Caitlin Hunter',
  'Marie Wallin',
]

const WEIGHTS = [
  { value: 'lace', label: 'Lace' },
  { value: 'fingering', label: 'Fingering' },
  { value: 'sport', label: 'Sport' },
  { value: 'dk', label: 'DK' },
  { value: 'worsted', label: 'Worsted' },
  { value: 'aran', label: 'Aran' },
  { value: 'bulky', label: 'Bulky' },
  { value: 'super-bulky', label: 'Super Bulky' },
]

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
      // The API returns Prisma includes: { yarn: { company, name, weight, ... } }
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

  // Auto-search when entering results
  useEffect(() => {
    if (stage === 'results') {
      doSearch(1)
    }
  }, [stage, doSearch])

  // ─── Stage: Craft ───────────────────────────────────────────────────────

  if (stage === 'craft') {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-content-default">Find your next project</h1>
          <p className="text-content-secondary">What are you in the mood for?</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <button
            onClick={() => selectCraft('knitting')}
            className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-surface border border-border-default hover:border-coral-500 hover:bg-coral-500/5 transition-all"
          >
            <span className="text-4xl">🧶</span>
            <span className="font-semibold text-content-default">Knitting</span>
          </button>
          <button
            onClick={() => selectCraft('crochet')}
            className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-surface border border-border-default hover:border-teal-500 hover:bg-teal-500/5 transition-all"
          >
            <span className="text-4xl">🪝</span>
            <span className="font-semibold text-content-default">Crochet</span>
          </button>
        </div>
      </div>
    )
  }

  // ─── Stage: Yarn ────────────────────────────────────────────────────────

  if (stage === 'yarn') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => goTo('craft')} className="p-2 rounded-lg hover:bg-surface">
            <ChevronLeft className="w-5 h-5 text-content-secondary" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-content-default">Choose your yarn</h2>
            <p className="text-sm text-content-secondary">
              Pick from your stash or select a weight
            </p>
          </div>
        </div>

        {/* Stash section */}
        {stashLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-content-secondary" />
          </div>
        ) : stash.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-content-secondary uppercase tracking-wider">From your stash</h3>
            <div className="space-y-2">
              {stash.map(item => (
                <button
                  key={item.id}
                  onClick={() => selectStashItem(item)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface border border-border-default hover:border-coral-500 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-coral-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🧶</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-content-default truncate">{item.yarn_name}</p>
                    <p className="text-sm text-content-secondary">
                      {[
                        item.company,
                        item.weight,
                        item.colorway,
                        item.total_yardage ? `${item.total_yardage}yds` : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-content-tertiary flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Weight picker */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-content-secondary uppercase tracking-wider">
            {stash.length > 0 ? 'Or pick a weight' : 'Select a yarn weight'}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {WEIGHTS.map(w => (
              <button
                key={w.value}
                onClick={() => selectWeight(w.value)}
                className="p-3 rounded-xl bg-surface border border-border-default hover:border-coral-500 text-content-default font-medium text-sm transition-all"
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Stage: Category ────────────────────────────────────────────────────

  if (stage === 'category') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => goTo('yarn')} className="p-2 rounded-lg hover:bg-surface">
            <ChevronLeft className="w-5 h-5 text-content-secondary" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-content-default">What do you want to make?</h2>
            <p className="text-sm text-content-secondary">
              {search.stashItem
                ? `With ${search.stashItem.yarn_name}${search.stashItem.total_yardage ? ` (${search.stashItem.total_yardage}yds)` : ''}`
                : `${search.weight ?? 'Any'} weight`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => selectCategory(cat.value)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border-default hover:border-coral-500 hover:bg-coral-500/5 transition-all"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-sm font-medium text-content-default text-center">{cat.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => selectCategory(null)}
          className="w-full p-4 rounded-xl bg-surface border border-border-default hover:border-teal-500 transition-all text-center"
        >
          <span className="font-medium text-content-default">Show me everything</span>
        </button>
      </div>
    )
  }

  // ─── Stage: Results ─────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header with back + summary */}
      <div className="flex items-center gap-3">
        <button onClick={() => goTo('category')} className="p-2 rounded-lg hover:bg-surface">
          <ChevronLeft className="w-5 h-5 text-content-secondary" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-content-default">
            {totalResults > 0 ? `${totalResults.toLocaleString()} patterns` : 'Searching...'}
          </h2>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm',
            showFilters
              ? 'bg-coral-500 text-white border-coral-500'
              : 'bg-surface border-border-default text-content-secondary hover:border-coral-500',
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Active filter chips */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label={search.craft === 'crochet' ? 'Crochet' : 'Knitting'}
          onRemove={() => { setSearch(prev => ({ ...prev, craft: null })); goTo('craft') }}
        />
        {search.weight && (
          <FilterChip
            label={search.weight}
            onRemove={() => { setSearch(prev => ({ ...prev, weight: null, stashItem: null, yardageMax: null })); goTo('yarn') }}
          />
        )}
        {search.stashItem && (
          <FilterChip
            label={search.stashItem.yarn_name}
            accent
          />
        )}
        {search.category && (
          <FilterChip
            label={CATEGORIES.find(c => c.value === search.category)?.label ?? search.category}
            onRemove={() => { setSearch(prev => ({ ...prev, category: null })); goTo('category') }}
          />
        )}
        {search.designer && (
          <FilterChip
            label={search.designer}
            onRemove={() => setSearch(prev => ({ ...prev, designer: null }))}
          />
        )}
        {search.availability === 'free' && (
          <FilterChip
            label="Free only"
            onRemove={() => setSearch(prev => ({ ...prev, availability: null }))}
          />
        )}
        {search.difficulty && (
          <FilterChip
            label={`Difficulty: ${search.difficulty}`
            }
            onRemove={() => setSearch(prev => ({ ...prev, difficulty: null }))}
          />
        )}
      </div>

      {/* Expandable filters panel */}
      {showFilters && (
        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-4">
          {/* Designer filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-content-secondary">Designer</label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_DESIGNERS.map(d => (
                <button
                  key={d}
                  onClick={() => setSearch(prev => ({ ...prev, designer: prev.designer === d ? null : d }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-all',
                    search.designer === d
                      ? 'bg-coral-500 text-white border-coral-500'
                      : 'bg-background border-border-default text-content-default hover:border-coral-500',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Free / Paid */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-content-secondary">Price</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSearch(prev => ({ ...prev, availability: prev.availability === 'free' ? null : 'free' }))}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm border transition-all',
                  search.availability === 'free'
                    ? 'bg-coral-500 text-white border-coral-500'
                    : 'bg-background border-border-default text-content-default hover:border-coral-500',
                )}
              >
                Free only
              </button>
              <button
                onClick={() => setSearch(prev => ({ ...prev, availability: null }))}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm border transition-all',
                  search.availability === null
                    ? 'bg-coral-500 text-white border-coral-500'
                    : 'bg-background border-border-default text-content-default hover:border-coral-500',
                )}
              >
                All
              </button>
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-content-secondary">Difficulty</label>
            <div className="flex gap-2">
              {[
                { value: '1-3', label: 'Beginner' },
                { value: '3-5', label: 'Easy' },
                { value: '5-7', label: 'Intermediate' },
                { value: '7-10', label: 'Advanced' },
              ].map(d => (
                <button
                  key={d.value}
                  onClick={() => setSearch(prev => ({ ...prev, difficulty: prev.difficulty === d.value ? null : d.value }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-all',
                    search.difficulty === d.value
                      ? 'bg-coral-500 text-white border-coral-500'
                      : 'bg-background border-border-default text-content-default hover:border-coral-500',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setShowFilters(false); doSearch(1) }}
            className="w-full py-2.5 rounded-xl bg-coral-500 text-white font-medium hover:bg-coral-600 transition-colors"
          >
            Apply filters
          </button>
        </div>
      )}

      {/* Results grid */}
      {resultsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Search className="w-12 h-12 text-content-tertiary mx-auto" />
          <p className="text-content-secondary">No patterns found. Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map(pattern => (
              <PatternCard
                key={pattern.ravelry_id}
                pattern={pattern}
                saved={savedIds.has(pattern.ravelry_id)}
                onSave={() => savePattern(pattern)}
                onUnsave={() => unsavePattern(pattern.ravelry_id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalResults > 20 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => doSearch(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 rounded-lg bg-surface border border-border-default text-content-default disabled:opacity-30 hover:border-coral-500 transition-all"
              >
                Previous
              </button>
              <span className="text-sm text-content-secondary">
                Page {page} of {Math.ceil(totalResults / 20)}
              </span>
              <button
                onClick={() => doSearch(page + 1)}
                disabled={page * 20 >= totalResults}
                className="px-4 py-2 rounded-lg bg-surface border border-border-default text-content-default disabled:opacity-30 hover:border-coral-500 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function FilterChip({ label, onRemove, accent }: { label: string; onRemove?: () => void; accent?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm',
        accent
          ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
          : 'bg-surface border border-border-default text-content-default',
      )}
    >
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-coral-500 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  )
}

function PatternCard({
  pattern,
  saved,
  onSave,
  onUnsave,
}: {
  pattern: PatternResult
  saved: boolean
  onSave: () => void
  onUnsave: () => void
}) {
  return (
    <div className="group rounded-xl bg-surface border border-border-default overflow-hidden hover:border-coral-500/50 transition-all">
      {/* Photo */}
      {pattern.photo_url ? (
        <div className="relative aspect-[4/3] bg-background-muted overflow-hidden">
          <img
            src={pattern.photo_url}
            alt={pattern.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {pattern.free && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-teal-500 text-white text-xs font-medium">
              Free
            </span>
          )}
          <button
            onClick={saved ? onUnsave : onSave}
            className={cn(
              'absolute top-2 right-2 p-2 rounded-full transition-all',
              saved
                ? 'bg-coral-500 text-white'
                : 'bg-black/40 text-white hover:bg-coral-500',
            )}
          >
            <Bookmark className={cn('w-4 h-4', saved && 'fill-current')} />
          </button>
        </div>
      ) : (
        <div className="aspect-[4/3] bg-background-muted flex items-center justify-center">
          <span className="text-4xl">🧶</span>
        </div>
      )}

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-content-default text-sm leading-tight line-clamp-2">
          {pattern.name}
        </h3>
        {pattern.designer && (
          <p className="text-xs text-content-secondary">by {pattern.designer}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-content-tertiary">
          {pattern.weight && <span className="capitalize">{pattern.weight}</span>}
          {pattern.yardage_max && <span>· {pattern.yardage_max}yds</span>}
          {pattern.difficulty && <span>· {pattern.difficulty}/10</span>}
          {pattern.rating && <span>· ★ {pattern.rating}</span>}
        </div>
        <a
          href={`https://www.ravelry.com/patterns/library/${pattern.permalink}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-coral-500 hover:underline mt-1"
        >
          View on Ravelry <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
