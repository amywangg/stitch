import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = 'horizontal', label, ...props }, ref) => {
    if (orientation === 'vertical') {
      return (
        <div
          ref={ref}
          className={cn('w-px bg-border-default self-stretch', className)}
          role="separator"
          aria-orientation="vertical"
          {...props}
        />
      );
    }

    if (label) {
      return (
        <div
          ref={ref}
          className={cn('flex items-center gap-4', className)}
          role="separator"
          {...props}
        >
          <div className="flex-1 h-px bg-border-default" />
          <span className="text-body-sm text-content-muted">{label}</span>
          <div className="flex-1 h-px bg-border-default" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('h-px w-full bg-border-default', className)}
        role="separator"
        aria-orientation="horizontal"
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';

export { Divider };


