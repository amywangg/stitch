import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  `inline-flex items-center justify-center gap-2 font-bold 
   transition-all duration-normal active:scale-[0.98]
   disabled:pointer-events-none disabled:opacity-50
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`,
  {
    variants: {
      variant: {
        // Primary - Sunset Orange (#F75F5E)
        primary: `
          bg-coral-500 text-white shadow-primary
          hover:bg-coral-600
          active:bg-coral-700
          focus-visible:ring-coral-500
        `,
        // Secondary - Vista Blue (#7B9FF2)
        secondary: `
          bg-teal-500 text-white shadow-secondary
          hover:bg-teal-600
          active:bg-teal-700
          focus-visible:ring-teal-500
        `,
        // Outline - Primary
        outline: `
          border-2 border-border-default bg-transparent
          text-content-default
          hover:bg-background-muted hover:border-border-emphasis
          focus-visible:ring-coral-500
        `,
        // Outline Primary - Coral border
        'outline-primary': `
          border-2 border-coral-500 bg-transparent
          text-coral-600 dark:text-coral-400
          hover:bg-coral-50 dark:hover:bg-coral-950
          focus-visible:ring-coral-500
        `,
        // Outline Secondary - Blue border
        'outline-secondary': `
          border-2 border-teal-500 bg-transparent
          text-teal-600 dark:text-teal-400
          hover:bg-teal-50 dark:hover:bg-teal-950
          focus-visible:ring-teal-500
        `,
        // Ghost - No background
        ghost: `
          bg-transparent text-content-default
          hover:bg-background-muted
          focus-visible:ring-coral-500
        `,
        // Ghost Primary - Coral text
        'ghost-primary': `
          bg-transparent text-coral-600 dark:text-coral-400
          hover:bg-coral-50 dark:hover:bg-coral-950
          focus-visible:ring-coral-500
        `,
        // Ghost Secondary - Blue text  
        'ghost-secondary': `
          bg-transparent text-teal-600 dark:text-teal-400
          hover:bg-teal-50 dark:hover:bg-teal-950
          focus-visible:ring-teal-500
        `,
        // Soft - Subtle background
        soft: `
          bg-background-muted text-content-default
          hover:bg-background-emphasis
          focus-visible:ring-coral-500
        `,
        // Soft Primary - Coral tint
        'soft-primary': `
          bg-coral-100 text-coral-700
          hover:bg-coral-200
          dark:bg-coral-950 dark:text-coral-300
          dark:hover:bg-coral-900
          focus-visible:ring-coral-500
        `,
        // Soft Secondary - Blue tint
        'soft-secondary': `
          bg-teal-100 text-teal-700
          hover:bg-teal-200
          dark:bg-teal-950 dark:text-teal-300
          dark:hover:bg-teal-900
          focus-visible:ring-teal-500
        `,
        // Danger
        danger: `
          bg-red-500 text-white shadow-md
          hover:bg-red-600
          focus-visible:ring-red-500
        `,
        // Link style
        link: `
          bg-transparent text-coral-600 dark:text-coral-400
          underline-offset-4 hover:underline
          focus-visible:ring-coral-500
        `,
      },
      size: {
        xs: 'h-7 px-2.5 text-body-xs rounded-lg',
        sm: 'h-9 px-3 text-body-sm rounded-xl',
        md: 'h-11 px-4 text-body-md rounded-xl',
        lg: 'h-13 px-6 text-body-lg rounded-2xl',
        xl: 'h-14 px-8 text-body-lg rounded-2xl',
        icon: 'h-10 w-10 rounded-xl',
        'icon-sm': 'h-8 w-8 rounded-lg',
        'icon-lg': 'h-12 w-12 rounded-xl',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !loading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };

