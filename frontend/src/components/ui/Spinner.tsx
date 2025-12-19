import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  'animate-spin',
  {
    variants: {
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
      color: {
        primary: 'text-coral-500',
        secondary: 'text-teal-500',
        current: 'text-current',
        white: 'text-white',
        muted: 'text-content-muted',
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'primary',
    },
  }
);

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
  label?: string;
}

const Spinner = ({ size, color, className, label = 'Loading...' }: SpinnerProps) => {
  return (
    <svg
      className={cn(spinnerVariants({ size, color }), className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label={label}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Full page loading spinner
interface LoadingOverlayProps extends SpinnerProps {
  text?: string;
}

const LoadingOverlay = ({ text, ...spinnerProps }: LoadingOverlayProps) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <Spinner size="xl" {...spinnerProps} />
      {text && (
        <p className="mt-4 text-body-md text-content-subtle">{text}</p>
      )}
    </div>
  );
};

export { Spinner, LoadingOverlay, spinnerVariants };

