import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-surface border border-border-default',
        hover && 'hover:border-coral-500 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
