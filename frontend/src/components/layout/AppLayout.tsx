import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import BottomNav from './BottomNav';
import Header from './Header';

export default function AppLayout() {
  const location = useLocation();
  const isCounterPage = location.pathname.includes('/counter');
  const isDesignSystem = location.pathname === '/design-system';

  return (
    <div className="min-h-screen-safe flex flex-col bg-background">
      {/* Header - hide on counter page for full immersion */}
      {!isCounterPage && !isDesignSystem && <Header />}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Bottom navigation - hide on counter page and design system */}
      {!isCounterPage && !isDesignSystem && <BottomNav />}
    </div>
  );
}
