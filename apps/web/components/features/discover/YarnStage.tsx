'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { WEIGHTS } from '@/components/features/discover/constants'
import type { StashItem } from '@/components/features/discover/types'

interface YarnStageProps {
  stash: StashItem[]
  stashLoading: boolean
  onBack: () => void
  onSelectStashItem: (item: StashItem) => void
  onSelectWeight: (weight: string) => void
}

export default function YarnStage({ stash, stashLoading, onBack, onSelectStashItem, onSelectWeight }: YarnStageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-surface">
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
                onClick={() => onSelectStashItem(item)}
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
              onClick={() => onSelectWeight(w.value)}
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
