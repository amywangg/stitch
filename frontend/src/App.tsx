import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore, useIsAuthenticated, useAuthLoading } from '@/stores/authStore';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Spinner } from '@/components/ui';

// Layout
import AppLayout from '@/components/layout/AppLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Pages
import LandingPage from '@/pages/LandingPage';
import HomePage from '@/pages/HomePage';
import FeedPage from '@/pages/FeedPage';
import FriendsPage from '@/pages/FriendsPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import CounterPage from '@/pages/CounterPage';
import PatternsPage from '@/pages/PatternsPage';
import PatternDetailPage from '@/pages/PatternDetailPage';
import PatternUploadPage from '@/pages/PatternUploadPage';
import PatternReviewPage from '@/pages/PatternReviewPage';
import PatternKnitPage from '@/pages/PatternKnitPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DesignSystemPage from '@/pages/DesignSystemPage';

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-20 h-20 rounded-2xl bg-coral-500 flex items-center justify-center shadow-primary animate-pulse">
        <span className="text-4xl">🧶</span>
      </div>
      <Spinner size="lg" color="primary" />
    </div>
  );
}

// Hook to check if store has hydrated
function useHasHydrated() {
  return useAuthStore((state) => state._hasHydrated);
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const hasHydrated = useHasHydrated();
  
  // Wait for hydration AND auth check
  if (!hasHydrated || isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Auth Route wrapper (redirects to home if already logged in)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const hasHydrated = useHasHydrated();
  
  // Wait for hydration AND auth check
  if (!hasHydrated || isLoading) {
    return <LoadingScreen />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }
  
  return <>{children}</>;
}

// Main App Router
function AppRouter() {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public landing page */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />} 
        />

        {/* Auth routes - redirect to home if already logged in */}
        <Route element={<AuthLayout />}>
          <Route 
            path="/login" 
            element={
              <AuthRoute>
                <LoginPage />
              </AuthRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <AuthRoute>
                <RegisterPage />
              </AuthRoute>
            } 
          />
        </Route>

        {/* Protected App routes - require authentication */}
        <Route 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/counter" element={<CounterPage />} />
          <Route path="/projects/:id/counter/:sectionId" element={<CounterPage />} />
          <Route path="/patterns" element={<PatternsPage />} />
          <Route path="/patterns/upload" element={<PatternUploadPage />} />
          <Route path="/patterns/review" element={<PatternReviewPage />} />
          <Route path="/patterns/:id/knit" element={<PatternKnitPage />} />
          <Route path="/patterns/:id" element={<PatternDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
        </Route>

        {/* Catch all - redirect to landing or home based on auth */}
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/home" : "/"} replace />} 
        />
      </Routes>
    </AnimatePresence>
  );
}

// Main App with Auth Provider
function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
