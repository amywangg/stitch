'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface FilterChipProps {
  label: string
  onRemove?: () => void
  accent?: boolean
}

export default function FilterChip({ label, onRemove, accent }: FilterChipProps) {
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
