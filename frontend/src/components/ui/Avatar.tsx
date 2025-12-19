import { forwardRef, type ImgHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  'relative inline-flex items-center justify-center overflow-hidden font-bold',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-label-xs',
        sm: 'h-8 w-8 text-label-sm',
        md: 'h-10 w-10 text-label-md',
        lg: 'h-12 w-12 text-body-md',
        xl: 'h-16 w-16 text-body-lg',
        '2xl': 'h-20 w-20 text-heading-lg',
      },
      variant: {
        circle: 'rounded-full',
        rounded: 'rounded-xl',
        square: 'rounded-lg',
      },
      color: {
        primary: 'bg-coral-500 text-white',
        secondary: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white',
        neutral: 'bg-background-emphasis text-content-subtle',
        random: '', // Will be set by getRandomColor
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'circle',
      color: 'primary',
    },
  }
);

// Generate consistent color from string
const getColorFromString = (str: string): string => {
  const colors = [
    'bg-coral-500 text-white',
    'bg-teal-500 text-white',
    'bg-amber-500 text-white',
    'bg-purple-500 text-white',
    'bg-emerald-500 text-white',
    'bg-rose-500 text-white',
    'bg-cyan-500 text-white',
    'bg-indigo-500 text-white',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export interface AvatarProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  name?: string;
  fallback?: string;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    { className, size, variant, color, src, name, fallback, alt, ...props },
    ref
  ) => {
    const initials = fallback || (name ? getInitials(name) : '?');
    const randomColor = name ? getColorFromString(name) : '';

    return (
      <div
        ref={ref}
        className={cn(
          avatarVariants({ size, variant, color: color === 'random' ? undefined : color }),
          color === 'random' && randomColor,
          className
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="h-full w-full object-cover"
            {...props}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar group for stacked avatars
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
  className?: string;
}

const AvatarGroup = ({ children, max, size = 'md', className }: AvatarGroupProps) => {
  const childArray = Array.isArray(children) ? children : [children];
  const displayCount = max ? Math.min(childArray.length, max) : childArray.length;
  const remaining = childArray.length - displayCount;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {childArray.slice(0, displayCount).map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-background rounded-full"
        >
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <Avatar
          size={size}
          color="neutral"
          fallback={`+${remaining}`}
          className="ring-2 ring-background"
        />
      )}
    </div>
  );
};

export { Avatar, AvatarGroup, avatarVariants };

