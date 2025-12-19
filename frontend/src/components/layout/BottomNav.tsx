import { NavLink } from 'react-router-dom';
import { Home, Newspaper, FolderKanban, BookOpen, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/feed', icon: Newspaper, label: 'Feed' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/patterns', icon: BookOpen, label: 'Patterns' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-4 transition-colors relative',
                isActive ? 'text-coral-500' : 'text-content-muted'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-coral-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <div
                  className={cn(
                    'p-2 rounded-xl transition-colors',
                    isActive && 'bg-coral-50 dark:bg-coral-950'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-label-xs">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
