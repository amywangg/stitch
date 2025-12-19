import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const progressVariants = cva(
  'overflow-hidden rounded-full bg-background-muted',
  {
    variants: {
      size: {
        xs: 'h-1',
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3',
        xl: 'h-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const progressBarVariants = cva(
  'h-full rounded-full transition-all duration-300 ease-out',
  {
    variants: {
      color: {
        primary: 'bg-coral-500',
        secondary: 'bg-gradient-to-r from-teal-500 to-teal-400',
        success: 'bg-gradient-to-r from-green-500 to-green-400',
        warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
        error: 'bg-gradient-to-r from-red-500 to-red-400',
        neutral: 'bg-content-muted',
      },
    },
    defaultVariants: {
      color: 'primary',
    },
  }
);

export interface ProgressProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressBarVariants> {
  value: number;
  max?: number;
  showValue?: boolean;
  label?: string;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      size,
      color,
      value,
      max = 100,
      showValue,
      label,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div className="w-full" ref={ref} {...props}>
        {(label || showValue) && (
          <div className="flex justify-between mb-1.5">
            {label && (
              <span className="text-label-sm text-content-subtle">{label}</span>
            )}
            {showValue && (
              <span className="text-label-sm text-content-primary font-bold">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <div className={cn(progressVariants({ size }), className)}>
          <div
            className={cn(progressBarVariants({ color }))}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

// Circular progress
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const colorMap = {
  primary: 'text-coral-500',
  secondary: 'text-teal-500',
  success: 'text-green-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
};

const CircularProgress = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = 'primary',
  showValue,
  className,
  children,
}: CircularProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="text-background-muted"
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={cn(colorMap[color], 'transition-all duration-300 ease-out')}
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showValue && (
          <span className="text-heading-lg text-content font-bold">
            {Math.round(percentage)}%
          </span>
        ))}
      </div>
    </div>
  );
};

export { Progress, CircularProgress, progressVariants };

