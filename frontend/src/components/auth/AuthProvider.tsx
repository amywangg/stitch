import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider handles:
 * 1. Checking stored auth on app load
 * 2. Validating token with backend (or using stored user in dev mode)
 * 3. Setting loading state while checking
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const setLoading = useAuthStore((state) => state.setLoading);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    async function validateAuth() {
      // Get current state (after hydration)
      const { accessToken, isAuthenticated, user } = useAuthStore.getState();
      
      console.log('🔐 AuthProvider: Checking auth state', { 
        hasToken: !!accessToken, 
        isAuthenticated, 
        hasUser: !!user 
      });

      // If we have a stored token and user, validate it
      if (accessToken && isAuthenticated && user) {
        try {
          // Try to get current user - this validates the token
          // In dev mode without backend, this returns the stored user
          await authApi.getCurrentUser();
          console.log('🔐 AuthProvider: User validated successfully');
        } catch (error) {
          console.log('🔐 AuthProvider: Validation error', error);
          
          // Only logout if this is a real auth error (401/403)
          // Other errors (network, 400, 500) keep the user logged in
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status === 401 || status === 403) {
              console.log('🔐 AuthProvider: Token expired or invalid, logging out');
              logout();
            } else {
              // For other HTTP errors, keep the user logged in (server might be down)
              console.log('🔐 AuthProvider: Server error but keeping user logged in');
            }
          }
          // For network errors or other issues, keep the stored auth
          // This allows the app to work offline or without backend
          else {
            console.log('🔐 AuthProvider: Network error, keeping stored auth');
          }
        }
      }
      
      // Done checking, set loading to false
      setLoading(false);
    }

    // Small delay to ensure zustand has rehydrated from localStorage
    const timer = setTimeout(validateAuth, 100);
    return () => clearTimeout(timer);
  }, []); // Only run on mount

  return <>{children}</>;
}

export default AuthProvider;

