import { type HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-2xl transition-all duration-normal',
  {
    variants: {
      variant: {
        // Default - Surface with border
        default: `
          bg-surface border border-border-default
        `,
        // Elevated - With shadow
        elevated: `
          bg-surface shadow-md border border-border-subtle
          hover:shadow-lg
        `,
        // Filled - Subtle background
        filled: `
          bg-background-subtle border border-transparent
        `,
        // Outline - Just border
        outline: `
          bg-transparent border-2 border-border-default
        `,
        // Ghost - No border or shadow
        ghost: `
          bg-transparent
        `,
        // Interactive - Clickable card
        interactive: `
          bg-surface border border-border-default shadow-sm
          hover:shadow-md hover:border-border-emphasis
          active:scale-[0.99]
          cursor-pointer
        `,
        // Primary tint
        primary: `
          bg-coral-50 border border-coral-200
          dark:bg-coral-950 dark:border-coral-900
        `,
        // Secondary tint
        secondary: `
          bg-teal-50 border border-teal-200
          dark:bg-teal-950 dark:border-teal-900
        `,
        // Glass effect
        glass: `
          bg-surface-overlay backdrop-blur-xl
          border border-border-subtle
        `,
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5',
        xl: 'p-6',
      },
      radius: {
        sm: 'rounded-lg',
        md: 'rounded-xl',
        lg: 'rounded-2xl',
        xl: 'rounded-3xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      radius: 'lg',
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, radius, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, radius, className }))}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card subcomponents
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-heading-lg text-content', className)}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-body-sm text-content-muted', className)}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-3 pt-4', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };

