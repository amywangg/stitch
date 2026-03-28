'use client'

import { cn } from '@/lib/utils'
import {
  ChevronLeft, Search, SlidersHorizontal, Loader2,
} from 'lucide-react'
import { CATEGORIES, POPULAR_DESIGNERS } from '@/components/features/discover/constants'
import FilterChip from '@/components/features/discover/FilterChip'
import PatternCard from '@/components/features/discover/PatternCard'
import type { PatternResult, SearchState } from '@/components/features/discover/types'

interface ResultsStageProps {
  search: SearchState
  results: PatternResult[]
  totalResults: number
  resultsLoading: boolean
  page: number
  showFilters: boolean
  savedIds: Set<number>
  onSetShowFilters: (show: boolean) => void
  onUpdateSearch: (update: Partial<SearchState>) => void
  onGoTo: (stage: 'craft' | 'yarn' | 'category') => void
  onDoSearch: (page: number) => void
  onSavePattern: (pattern: PatternResult) => void
  onUnsavePattern: (ravelryId: number) => void
}

export default function ResultsStage({
  search,
  results,
  totalResults,
  resultsLoading,
  page,
  showFilters,
  savedIds,
  onSetShowFilters,
  onUpdateSearch,
  onGoTo,
  onDoSearch,
  onSavePattern,
  onUnsavePattern,
}: ResultsStageProps) {
  return (
    <div className="space-y-4">
      {/* Header with back + summary */}
      <div className="flex items-center gap-3">
        <button onClick={() => onGoTo('category')} className="p-2 rounded-lg hover:bg-surface">
          <ChevronLeft className="w-5 h-5 text-content-secondary" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-content-default">
            {totalResults > 0 ? `${totalResults.toLocaleString()} patterns` : 'Searching...'}
          </h2>
        </div>
        <button
          onClick={() => onSetShowFilters(!showFilters)}
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
          onRemove={() => { onUpdateSearch({ craft: null }); onGoTo('craft') }}
        />
        {search.weight && (
          <FilterChip
            label={search.weight}
            onRemove={() => { onUpdateSearch({ weight: null, stashItem: null, yardageMax: null }); onGoTo('yarn') }}
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
            onRemove={() => { onUpdateSearch({ category: null }); onGoTo('category') }}
          />
        )}
        {search.designer && (
          <FilterChip
            label={search.designer}
            onRemove={() => onUpdateSearch({ designer: null })}
          />
        )}
        {search.availability === 'free' && (
          <FilterChip
            label="Free only"
            onRemove={() => onUpdateSearch({ availability: null })}
          />
        )}
        {search.difficulty && (
          <FilterChip
            label={`Difficulty: ${search.difficulty}`}
            onRemove={() => onUpdateSearch({ difficulty: null })}
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
                  onClick={() => onUpdateSearch({ designer: search.designer === d ? null : d })}
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
                onClick={() => onUpdateSearch({ availability: search.availability === 'free' ? null : 'free' })}
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
                onClick={() => onUpdateSearch({ availability: null })}
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
                  onClick={() => onUpdateSearch({ difficulty: search.difficulty === d.value ? null : d.value })}
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
            onClick={() => { onSetShowFilters(false); onDoSearch(1) }}
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
                onSave={() => onSavePattern(pattern)}
                onUnsave={() => onUnsavePattern(pattern.ravelry_id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalResults > 20 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => onDoSearch(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 rounded-lg bg-surface border border-border-default text-content-default disabled:opacity-30 hover:border-coral-500 transition-all"
              >
                Previous
              </button>
              <span className="text-sm text-content-secondary">
                Page {page} of {Math.ceil(totalResults / 20)}
              </span>
              <button
                onClick={() => onDoSearch(page + 1)}
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
