import { type HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textVariants = cva('', {
  variants: {
    variant: {
      // Display - Large headlines
      'display-2xl': 'text-display-2xl font-display',
      'display-xl': 'text-display-xl font-display',
      'display-lg': 'text-display-lg font-display',
      'display-md': 'text-display-md font-display',
      'display-sm': 'text-display-sm font-display',
      'display-xs': 'text-display-xs font-display',
      
      // Headings
      'heading-xl': 'text-heading-xl',
      'heading-lg': 'text-heading-lg',
      'heading-md': 'text-heading-md',
      'heading-sm': 'text-heading-sm',
      'heading-xs': 'text-heading-xs',
      
      // Body text
      'body-lg': 'text-body-lg',
      'body-md': 'text-body-md',
      'body-sm': 'text-body-sm',
      'body-xs': 'text-body-xs',
      
      // Labels
      'label-lg': 'text-label-lg',
      'label-md': 'text-label-md',
      'label-sm': 'text-label-sm',
      'label-xs': 'text-label-xs uppercase tracking-wider',
    },
    color: {
      default: 'text-content',
      subtle: 'text-content-subtle',
      muted: 'text-content-muted',
      inverse: 'text-content-inverse',
      primary: 'text-content-primary',
      secondary: 'text-content-secondary',
      success: 'text-content-success',
      warning: 'text-content-warning',
      error: 'text-content-error',
      inherit: 'text-inherit',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
    truncate: {
      true: 'truncate',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'body-md',
    color: 'default',
  },
});

export interface TextProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label';
}

const Text = forwardRef<HTMLElement, TextProps>(
  (
    { className, variant, color, weight, align, truncate, as: Component = 'p', ...props },
    ref
  ) => {
    return (
      <Component
        ref={ref as React.Ref<HTMLParagraphElement>}
        className={cn(textVariants({ variant, color, weight, align, truncate, className }))}
        {...props}
      />
    );
  }
);

Text.displayName = 'Text';

// Convenience components for common text elements
const Heading = forwardRef<HTMLHeadingElement, Omit<TextProps, 'as'> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }>(
  ({ level = 2, variant, ...props }, ref) => {
    const tag = `h${level}` as const;
    const defaultVariant = {
      1: 'display-lg',
      2: 'display-sm',
      3: 'heading-xl',
      4: 'heading-lg',
      5: 'heading-md',
      6: 'heading-sm',
    }[level] as TextProps['variant'];
    
    return <Text ref={ref} as={tag} variant={variant || defaultVariant} {...props} />;
  }
);

Heading.displayName = 'Heading';

const Label = forwardRef<HTMLLabelElement, Omit<TextProps, 'as'>>(
  ({ variant = 'label-md', ...props }, ref) => {
    return <Text ref={ref} as="label" variant={variant} {...props} />;
  }
);

Label.displayName = 'Label';

export { Text, Heading, Label, textVariants };


