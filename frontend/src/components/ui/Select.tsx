import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from './Text';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

// Context for Select component
const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

export function Select({
  value,
  onValueChange,
  children,
  placeholder,
  disabled,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (newValue: string) => {
    onValueChange?.(newValue);
    setOpen(false);
  };

  // Extract SelectContent and SelectTrigger from children
  let selectContent: React.ReactNode = null;
  let selectTrigger: React.ReactNode = null;
  let selectValue: React.ReactNode = null;

  React.Children.forEach(children, (child: any) => {
    if (child?.type === SelectContent || child?.type?.displayName === 'SelectContent') {
      selectContent = child;
    } else if (child?.type === SelectTrigger || child?.type?.displayName === 'SelectTrigger') {
      selectTrigger = child;
      // Extract SelectValue from trigger if present
      React.Children.forEach(child.props.children, (grandChild: any) => {
        if (grandChild?.type === SelectValue || grandChild?.type?.displayName === 'SelectValue') {
          selectValue = grandChild;
        }
      });
    }
  });

  // Find selected item's label from SelectContent
  const findSelectedLabel = (): string | undefined => {
    if (!selectContent) return undefined;
    
    const findInChildren = (children: React.ReactNode): string | undefined => {
      let found: string | undefined;
      React.Children.forEach(children, (child: any) => {
        if (found) return;
        if (child?.type === SelectItem || child?.type?.displayName === 'SelectItem') {
          if (child.props.value === value) {
            found = typeof child.props.children === 'string' 
              ? child.props.children 
              : String(child.props.children || '');
          }
        }
      });
      return found;
    };
    
    return findInChildren((selectContent as any).props.children);
  };

  const selectedLabel = findSelectedLabel();

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleSelect, open, setOpen }}>
      <div className={cn('relative', className)}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-2',
            'bg-surface border border-border-default rounded-lg',
            'text-left text-content-default',
            'focus:outline-none focus:ring-2 focus:ring-coral-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:border-coral-300 transition-colors'
          )}
        >
          <Text variant="body-sm" className="truncate">
            {selectedLabel || (selectValue && typeof selectValue === 'object' && 'props' in selectValue 
              ? (selectValue as any).props.placeholder || (selectValue as any).props.children
              : null) || placeholder || 'Select...'}
          </Text>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-content-muted flex-shrink-0 transition-transform',
              open && 'transform rotate-180'
            )}
          />
        </button>

        {open && selectContent && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div
              ref={contentRef}
              className={cn(
                'absolute z-50 w-full mt-1',
                'bg-surface border border-border-default rounded-lg shadow-lg',
                'max-h-60 overflow-auto',
                'animate-in fade-in-0 zoom-in-95'
              )}
            >
              {selectContent}
            </div>
          </>
        )}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className }: SelectTriggerProps) {
  // SelectTrigger is just a wrapper - the actual trigger is rendered by Select
  return <>{children}</>;
}
SelectTrigger.displayName = 'SelectTrigger';

export function SelectContent({ children, className }: SelectContentProps) {
  return (
    <div className={cn('p-1', className)}>
      {children}
    </div>
  );
}
SelectContent.displayName = 'SelectContent';

export function SelectItem({
  value,
  children,
  className,
  disabled,
}: SelectItemProps) {
  const context = React.useContext(SelectContext);
  const isSelected = context.value === value;

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled && context.onValueChange) {
          context.onValueChange(value);
        }
      }}
      disabled={disabled}
      className={cn(
        'w-full text-left px-3 py-2 rounded-md',
        'text-content-default text-sm',
        'hover:bg-background-subtle',
        'focus:bg-background-subtle focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        isSelected && 'bg-background-subtle',
        className
      )}
    >
      {children}
    </button>
  );
}
SelectItem.displayName = 'SelectItem';

export function SelectValue({ placeholder, children }: SelectValueProps) {
  // SelectValue is just a placeholder - actual value is shown by Select component
  return <>{children || placeholder}</>;
}
SelectValue.displayName = 'SelectValue';

