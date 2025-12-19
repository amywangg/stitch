import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconButtonVariants = cva(
  `inline-flex items-center justify-center
   transition-all duration-normal active:scale-95
   disabled:pointer-events-none disabled:opacity-50
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`,
  {
    variants: {
      variant: {
        // Primary filled
        primary: `
          bg-coral-500 text-white
          hover:bg-coral-600
          focus-visible:ring-coral-500
        `,
        // Secondary filled
        secondary: `
          bg-teal-500 text-white
          hover:bg-teal-600
          focus-visible:ring-teal-500
        `,
        // Outline
        outline: `
          border-2 border-border-default bg-transparent text-content
          hover:bg-background-muted hover:border-border-emphasis
          focus-visible:ring-coral-500
        `,
        // Ghost
        ghost: `
          bg-transparent text-content-subtle
          hover:bg-background-muted hover:text-content
          focus-visible:ring-coral-500
        `,
        // Ghost Primary
        'ghost-primary': `
          bg-transparent text-coral-600 dark:text-coral-400
          hover:bg-coral-50 dark:hover:bg-coral-950
          focus-visible:ring-coral-500
        `,
        // Ghost Secondary
        'ghost-secondary': `
          bg-transparent text-teal-600 dark:text-teal-400
          hover:bg-teal-50 dark:hover:bg-teal-950
          focus-visible:ring-teal-500
        `,
        // Soft
        soft: `
          bg-background-muted text-content-subtle
          hover:bg-background-emphasis hover:text-content
          focus-visible:ring-coral-500
        `,
        // Glass
        glass: `
          bg-white/20 backdrop-blur-sm text-white
          hover:bg-white/30
          focus-visible:ring-white
        `,
      },
      size: {
        xs: 'h-7 w-7 rounded-md [&_svg]:w-3.5 [&_svg]:h-3.5',
        sm: 'h-8 w-8 rounded-lg [&_svg]:w-4 [&_svg]:h-4',
        md: 'h-10 w-10 rounded-xl [&_svg]:w-5 [&_svg]:h-5',
        lg: 'h-12 w-12 rounded-xl [&_svg]:w-6 [&_svg]:h-6',
        xl: 'h-14 w-14 rounded-2xl [&_svg]:w-7 [&_svg]:h-7',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
    },
  }
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: ReactNode;
  loading?: boolean;
  'aria-label': string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon, loading, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(iconButtonVariants({ variant, size, className }))}
        disabled={isDisabled}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { IconButton, iconButtonVariants };

