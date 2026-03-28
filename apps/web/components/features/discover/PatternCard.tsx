'use client'

import { cn } from '@/lib/utils'
import { Bookmark, ExternalLink } from 'lucide-react'
import type { PatternResult } from '@/components/features/discover/types'

interface PatternCardProps {
  pattern: PatternResult
  saved: boolean
  onSave: () => void
  onUnsave: () => void
}

export default function PatternCard({ pattern, saved, onSave, onUnsave }: PatternCardProps) {
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
