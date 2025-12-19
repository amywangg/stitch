import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  ChevronRight,
  User,
  Users,
  Package,
  Heart,
  Clock,
  Award,
  LogOut,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { Button, Card, Text, Heading, Avatar, Badge } from '@/components/ui';

// Mock stats
const stats = {
  projectsCompleted: 12,
  totalRowsKnit: 15420,
  hoursSpent: 156,
  patternsOwned: 34,
  friends: 8,
  followers: 24,
  following: 15,
};

const menuItems = [
  { icon: User, label: 'Edit Profile', href: '/settings' },
  { icon: Users, label: 'Friends', href: '/friends', badge: 2 },
  { icon: Package, label: 'My Stash', href: '/stash' },
  { icon: Heart, label: 'Favorites', href: '/favorites' },
  { icon: Clock, label: 'Knitting History', href: '/history' },
  { icon: Award, label: 'Achievements', href: '/achievements' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
      navigate('/');
    } catch {
      // Even if API call fails, local state is cleared
      navigate('/');
    }
  };

  return (
    <div className="px-4 py-6">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Avatar
          size="2xl"
          name={user?.displayName || user?.username || 'Knitter'}
          color="primary"
        />
        <div className="flex-1">
          <Heading level={1} variant="heading-xl">
            {user?.displayName || user?.username || 'Knitter'}
          </Heading>
          <Text color="muted">@{user?.username || 'knitter'}</Text>
          <div className="flex items-center gap-4 mt-2">
            <Link to="/friends" className="hover:text-content-primary transition-colors">
              <Text variant="body-sm">
                <span className="font-bold text-content-default">{stats.friends}</span>{' '}
                <span className="text-content-muted">friends</span>
              </Text>
            </Link>
            <Text variant="body-sm">
              <span className="font-bold text-content-default">{stats.followers}</span>{' '}
              <span className="text-content-muted">followers</span>
            </Text>
            <Text variant="body-sm">
              <span className="font-bold text-content-default">{stats.following}</span>{' '}
              <span className="text-content-muted">following</span>
            </Text>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 mb-8"
      >
        <Card variant="elevated" padding="md">
          <Text variant="display-xs" color="primary">{stats.projectsCompleted}</Text>
          <Text variant="label-xs" color="muted">Projects completed</Text>
        </Card>
        <Card variant="elevated" padding="md">
          <Text variant="display-xs" color="secondary">{stats.hoursSpent}h</Text>
          <Text variant="label-xs" color="muted">Hours knitting</Text>
        </Card>
        <Card variant="elevated" padding="md">
          <Text variant="display-xs" color="primary">{(stats.totalRowsKnit / 1000).toFixed(1)}k</Text>
          <Text variant="label-xs" color="muted">Rows knit</Text>
        </Card>
        <Card variant="elevated" padding="md">
          <Text variant="display-xs" color="secondary">{stats.patternsOwned}</Text>
          <Text variant="label-xs" color="muted">Patterns owned</Text>
        </Card>
      </motion.div>

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="elevated" padding="none" className="mb-6 overflow-hidden">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="flex items-center justify-between p-4 hover:bg-background-muted transition-colors border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background-muted flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-content-subtle" />
                </div>
                <Text variant="body-md">{item.label}</Text>
                {item.badge && item.badge > 0 && (
                  <Badge variant="primary" size="sm">{item.badge}</Badge>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-content-muted" />
            </Link>
          ))}
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          variant="outline-primary"
          fullWidth
          leftIcon={<LogOut className="w-5 h-5" />}
          onClick={handleLogout}
          loading={isLoggingOut}
        >
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
