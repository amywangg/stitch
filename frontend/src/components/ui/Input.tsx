import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  `w-full transition-all duration-normal
   placeholder:text-content-muted
   disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background-muted
   focus-visible:outline-none`,
  {
    variants: {
      variant: {
        // Default input
        default: `
          bg-surface border-2 border-border-default text-content
          hover:border-border-emphasis
          focus:border-interactive-primary focus:ring-4 focus:ring-coral-100
          dark:focus:ring-coral-900/30
        `,
        // Filled - Subtle background
        filled: `
          bg-background-muted border-2 border-transparent text-content
          hover:bg-background-emphasis
          focus:bg-surface focus:border-interactive-primary focus:ring-4 focus:ring-coral-100
          dark:focus:ring-coral-900/30
        `,
        // Outline only
        outline: `
          bg-transparent border-2 border-border-default text-content
          hover:border-border-emphasis
          focus:border-interactive-primary focus:ring-4 focus:ring-coral-100
          dark:focus:ring-coral-900/30
        `,
        // Ghost - Minimal
        ghost: `
          bg-transparent border-0 text-content
          hover:bg-background-muted
          focus:bg-background-muted focus:ring-0
        `,
        // Error state
        error: `
          bg-surface border-2 border-status-error text-content
          focus:border-status-error focus:ring-4 focus:ring-red-100
          dark:focus:ring-red-900/30
        `,
        // Success state
        success: `
          bg-surface border-2 border-status-success text-content
          focus:border-status-success focus:ring-4 focus:ring-green-100
          dark:focus:ring-green-900/30
        `,
      },
      inputSize: {
        sm: 'h-9 px-3 text-body-sm rounded-lg',
        md: 'h-11 px-4 text-body-md rounded-xl',
        lg: 'h-13 px-4 text-body-lg rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  error?: string;
  label?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      leftIcon,
      rightIcon,
      error,
      label,
      hint,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    const hasError = !!error;
    const finalVariant = hasError ? 'error' : variant;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-label-md text-content-subtle mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ variant: finalVariant, inputSize }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p
            className={cn(
              'mt-1.5 text-body-sm',
              hasError ? 'text-content-error' : 'text-content-muted'
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };


