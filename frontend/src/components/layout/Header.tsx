import { Link } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { IconButton, Avatar, Button } from '@/components/ui';

export default function Header() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-lg border-b border-border pt-safe">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-coral-500 flex items-center justify-center shadow-primary">
            <span className="text-xl">🧶</span>
          </div>
          <span className="font-display font-bold text-xl text-content">
            Stitch
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <IconButton
            icon={<Search className="w-5 h-5" />}
            aria-label="Search"
            variant="ghost"
          />
          
          {isAuthenticated && (
            <div className="relative">
              <IconButton
                icon={<Bell className="w-5 h-5" />}
                aria-label="Notifications"
                variant="ghost"
              />
              <span className="absolute top-1 right-1 w-2 h-2 bg-coral-500 rounded-full ring-2 ring-surface" />
            </div>
          )}

          {isAuthenticated ? (
            <Link to="/profile" className="ml-1">
              <Avatar
                size="sm"
                name={user?.displayName || user?.username || '?'}
                color="secondary"
              />
            </Link>
          ) : (
            <Button variant="primary" size="sm" className="ml-2">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
