import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  
  // Actions
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
  logout: () => void;
  
  // Computed
  getAuthHeader: () => { Authorization: string } | {};
}

type AuthPersist = (
  config: StateCreator<AuthState>,
  options: PersistOptions<AuthState, Partial<AuthState>>
) => StateCreator<AuthState>;

export const useAuthStore = create<AuthState>()(
  (persist as AuthPersist)(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      _hasHydrated: false,
      
      setAuth: (user, accessToken, refreshToken) =>
        set({ 
          user, 
          accessToken, 
          refreshToken: refreshToken || get().refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),
      
      setTokens: (accessToken, refreshToken) =>
        set({ 
          accessToken, 
          refreshToken: refreshToken || get().refreshToken,
        }),
      
      setUser: (user) =>
        set({ user }),
      
      setLoading: (isLoading) =>
        set({ isLoading }),
      
      setHasHydrated: (_hasHydrated) =>
        set({ _hasHydrated, isLoading: !_hasHydrated }),
      
      logout: () => {
        set({ 
          user: null, 
          accessToken: null, 
          refreshToken: null, 
          isAuthenticated: false,
          isLoading: false,
        });
      },
      
      getAuthHeader: () => {
        const token = get().accessToken;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    {
      name: 'stitch-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('🔐 Auth hydration error:', error);
        } else {
          console.log('🔐 Auth hydrated:', { 
            hasUser: !!state?.user, 
            isAuth: state?.isAuthenticated 
          });
        }
      },
    }
  )
);

// Set hydrated flag after store is created
// Using setTimeout to ensure this runs after the store is fully initialized
setTimeout(() => {
  useAuthStore.getState().setHasHydrated(true);
}, 0);

// Selector hooks for common use cases
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useHasHydrated = () => useAuthStore((state) => state._hasHydrated);
