'use client'

import { ChevronLeft } from 'lucide-react'
import { CATEGORIES } from '@/components/features/discover/constants'
import type { SearchState } from '@/components/features/discover/types'

interface CategoryStageProps {
  search: SearchState
  onBack: () => void
  onSelectCategory: (category: string | null) => void
}

export default function CategoryStage({ search, onBack, onSelectCategory }: CategoryStageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-surface">
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
            onClick={() => onSelectCategory(cat.value)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border-default hover:border-coral-500 hover:bg-coral-500/5 transition-all"
          >
            <span className="text-2xl">{cat.emoji}</span>
            <span className="text-sm font-medium text-content-default text-center">{cat.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => onSelectCategory(null)}
        className="w-full p-4 rounded-xl bg-surface border border-border-default hover:border-teal-500 transition-all text-center"
      >
        <span className="font-medium text-content-default">Show me everything</span>
      </button>
    </div>
  )
}
