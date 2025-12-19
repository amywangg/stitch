import { type HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center font-bold transition-colors',
  {
    variants: {
      variant: {
        // Default - Neutral
        default: `
          bg-background-muted text-content-subtle
        `,
        // Primary - Coral
        primary: `
          bg-coral-100 text-coral-700
          dark:bg-coral-950 dark:text-coral-300
        `,
        // Secondary - Blue
        secondary: `
          bg-teal-100 text-teal-700
          dark:bg-teal-950 dark:text-teal-300
        `,
        // Success
        success: `
          bg-status-success-subtle text-content-success
        `,
        // Warning
        warning: `
          bg-status-warning-subtle text-content-warning
        `,
        // Error/Danger
        error: `
          bg-status-error-subtle text-content-error
        `,
        // Info
        info: `
          bg-status-info-subtle text-teal-700
          dark:text-teal-300
        `,
        // Outline
        outline: `
          bg-transparent border-2 border-border-default text-content-subtle
        `,
        // Outline Primary
        'outline-primary': `
          bg-transparent border-2 border-coral-500 text-coral-600
          dark:text-coral-400
        `,
        // Outline Secondary
        'outline-secondary': `
          bg-transparent border-2 border-teal-500 text-teal-600
          dark:text-teal-400
        `,
        // Solid Primary
        'solid-primary': `
          bg-coral-500 text-white
        `,
        // Solid Secondary
        'solid-secondary': `
          bg-teal-500 text-white
        `,
      },
      size: {
        sm: 'h-5 px-2 text-label-xs rounded-md',
        md: 'h-6 px-2.5 text-label-sm rounded-lg',
        lg: 'h-7 px-3 text-label-md rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status badge with preset colors
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'active' | 'inactive' | 'pending' | 'success' | 'error' | 'warning';
}

const statusVariants: Record<StatusBadgeProps['status'], BadgeProps['variant']> = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
  success: 'success',
  error: 'error',
  warning: 'warning',
};

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    return (
      <Badge ref={ref} variant={statusVariants[status]} dot {...props}>
        {children || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export { Badge, StatusBadge, badgeVariants };

