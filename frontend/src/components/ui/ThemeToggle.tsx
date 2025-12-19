import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { IconButton } from './IconButton';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore();

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const label = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';

  if (showLabel) {
    return (
      <button
        onClick={cycleTheme}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl',
          'bg-background-muted hover:bg-background-emphasis',
          'transition-colors duration-normal',
          className
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="text-label-sm">{label}</span>
      </button>
    );
  }

  return (
    <IconButton
      icon={<Icon />}
      aria-label={`Current theme: ${label}. Click to change.`}
      variant="ghost"
      onClick={cycleTheme}
      className={className}
    />
  );
}

// Theme selector with all options visible
interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { theme, setTheme } = useThemeStore();

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const;

  return (
    <div className={cn('flex gap-1 p-1 bg-background-muted rounded-xl', className)}>
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-normal',
            theme === value
              ? 'bg-surface shadow-sm text-content'
              : 'text-content-muted hover:text-content'
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="text-label-sm">{label}</span>
        </button>
      ))}
    </div>
  );
}


