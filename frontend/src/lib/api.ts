import { useAuthStore, User } from '@/stores/authStore';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Dev mode - automatically use mock when backend returns errors in development
const IS_DEV = import.meta.env.DEV;
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// Mock delay to simulate network latency
const mockDelay = () => new Promise(resolve => setTimeout(resolve, 500));

// Helper to check if we should use mock response
function shouldUseMock(error: unknown): boolean {
  // Always use mock if explicitly enabled
  if (USE_MOCK_API) return true;
  
  // In dev mode, use mock for network errors
  if (IS_DEV && error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  // In dev mode, use mock for backend errors (server not configured or returning errors)
  // This includes 400 (validation), 401 (auth), and 500+ (server errors)
  if (IS_DEV && error instanceof ApiError && (error.status === 400 || error.status === 401 || error.status >= 500)) {
    console.log('🔧 Dev mode: Using mock for API error', error.status);
    return true;
  }
  
  return false;
}

// Types
interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

// Custom error class
export class ApiError extends Error {
  status: number;
  data?: unknown;
  
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Token refresh lock to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Refresh access token - returns null if refresh fails (caller decides what to do)
async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  
  if (!refreshToken) {
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      console.log('Token refresh failed:', response.status);
      return null;
    }
    
    const data: ApiResponse<{ accessToken: string; refreshToken: string }> = await response.json();
    
    if (data.success && data.data) {
      setTokens(data.data.accessToken, data.data.refreshToken);
      return data.data.accessToken;
    }
    
    return null;
  } catch (error) {
    console.log('Token refresh error:', error);
    return null;
  }
}

// Main fetch wrapper with auth handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const { accessToken, logout } = useAuthStore.getState();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && retry) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      
      if (newToken) {
        onTokenRefreshed(newToken);
        // Retry the original request with new token
        return apiFetch<T>(endpoint, options, false);
      }
    } else {
      // Wait for the ongoing refresh
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (token) => {
          try {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
              ...options,
              headers,
            });
            const data = await retryResponse.json();
            resolve(data);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  }
  
  // Parse response
  const data = await response.json();
  
  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || 'An error occurred',
      response.status,
      data
    );
  }
  
  return data;
}

// ============================================================================
// MOCK AUTH (for development without backend)
// ============================================================================

function generateMockUser(email: string, username?: string): User {
  return {
    id: crypto.randomUUID(),
    email,
    username: username || email.split('@')[0],
    displayName: username || email.split('@')[0],
    avatarUrl: undefined,
    role: 'user',
  };
}

function generateMockTokens() {
  return {
    accessToken: `mock_access_${Date.now()}_${Math.random().toString(36)}`,
    refreshToken: `mock_refresh_${Date.now()}_${Math.random().toString(36)}`,
  };
}

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Try real API first, fall back to mock if it fails and we're in dev mode
    try {
      const response = await apiFetch<ApiResponse<AuthResponse>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      if (response.success && response.data) {
        const { setAuth } = useAuthStore.getState();
        setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
        return response.data;
      }
      
      throw new ApiError('Login failed', 400);
    } catch (error) {
      // If backend is unavailable in dev mode, use mock login
      if (shouldUseMock(error)) {
        console.log('🔧 Dev mode: Using mock login');
        await mockDelay();
        
        const user = generateMockUser(credentials.email);
        const tokens = generateMockTokens();
        const mockResponse: AuthResponse = {
          user,
          ...tokens,
        };
        
        const { setAuth } = useAuthStore.getState();
        setAuth(mockResponse.user, mockResponse.accessToken, mockResponse.refreshToken);
        return mockResponse;
      }
      throw error;
    }
  },
  
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await apiFetch<ApiResponse<AuthResponse>>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    
      if (response.success && response.data) {
        const { setAuth } = useAuthStore.getState();
        setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
        return response.data;
      }
    
      throw new ApiError('Registration failed', 400);
    } catch (error) {
      // If backend is unavailable in dev mode, use mock register
      if (shouldUseMock(error)) {
        console.log('🔧 Dev mode: Using mock registration');
        await mockDelay();
        
        const user = generateMockUser(credentials.email, credentials.username);
        const tokens = generateMockTokens();
        const mockResponse: AuthResponse = {
          user,
          ...tokens,
        };
        
        const { setAuth } = useAuthStore.getState();
        setAuth(mockResponse.user, mockResponse.accessToken, mockResponse.refreshToken);
        return mockResponse;
      }
      throw error;
    }
  },
  
  async googleAuth(credential: string): Promise<AuthResponse> {
    try {
      const response = await apiFetch<ApiResponse<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });
      
      if (response.success && response.data) {
        const { setAuth } = useAuthStore.getState();
        setAuth(
          response.data.user,
          response.data.accessToken,
          response.data.refreshToken
        );
        return {
          user: response.data.user,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        };
      }
      
      throw new ApiError('Google authentication failed', 400);
    } catch (error) {
      // Mock Google auth for dev
      if (shouldUseMock(error)) {
        console.log('🔧 Dev mode: Using mock Google auth');
        await mockDelay();
        
        // In real scenario, we'd decode the credential JWT - for mock, use placeholder
        const user = generateMockUser('google-user@gmail.com', 'google_user');
        const tokens = generateMockTokens();
        const mockResponse: AuthResponse = {
          user,
          ...tokens,
        };
        
        const { setAuth } = useAuthStore.getState();
        setAuth(mockResponse.user, mockResponse.accessToken, mockResponse.refreshToken);
        return mockResponse;
      }
      throw error;
    }
  },
  
  async appleAuth(identityToken: string, user?: unknown): Promise<AuthResponse> {
    try {
      const response = await apiFetch<ApiResponse<AuthResponse>>('/auth/apple', {
        method: 'POST',
        body: JSON.stringify({ identityToken, user }),
      });
      
      if (response.success && response.data) {
        const { setAuth } = useAuthStore.getState();
        setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
        return response.data;
      }
      
      throw new ApiError('Apple authentication failed', 400);
    } catch (error) {
      // Mock Apple auth for dev
      if (shouldUseMock(error)) {
        console.log('🔧 Dev mode: Using mock Apple auth');
        await mockDelay();
        
        const mockUser = generateMockUser('apple-user@privaterelay.appleid.com', 'apple_user');
        const tokens = generateMockTokens();
        const mockResponse: AuthResponse = {
          user: mockUser,
          ...tokens,
        };
        
        const { setAuth } = useAuthStore.getState();
        setAuth(mockResponse.user, mockResponse.accessToken, mockResponse.refreshToken);
        return mockResponse;
      }
      throw error;
    }
  },
  
  async logout(): Promise<void> {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors, just clear local state
    }
    const { logout } = useAuthStore.getState();
    logout();
  },
  
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiFetch<ApiResponse<User>>('/auth/me');
      
      if (response.success && response.data) {
        const { setUser } = useAuthStore.getState();
        setUser(response.data);
        return response.data;
      }
      
      throw new ApiError('Failed to get user', 400);
    } catch (error) {
      // In dev mode without backend, return the stored user if exists
      if (shouldUseMock(error)) {
        const { user } = useAuthStore.getState();
        if (user) {
          console.log('🔧 Dev mode: Returning stored user');
          return user;
        }
      }
      throw error;
    }
  },
  
  async checkUsername(username: string): Promise<boolean> {
    try {
      const response = await apiFetch<ApiResponse<{ available: boolean }>>(
        `/users/check-username/${encodeURIComponent(username)}`
      );
      return response.data?.available ?? false;
    } catch (error) {
      // In dev mode, always return available (mock)
      if (shouldUseMock(error)) {
        console.log('🔧 Dev mode: Mock username check - available');
        return true;
      }
      return false;
    }
  },
  
  async updateProfile(data: {
    username?: string;
    displayName?: string;
    bio?: string;
    location?: string;
    websiteUrl?: string;
    avatarUrl?: string;
    coverImageUrl?: string;
  }): Promise<User> {
    try {
      const response = await apiFetch<ApiResponse<User>>('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      
      if (response.success && response.data) {
        const { setUser } = useAuthStore.getState();
        setUser(response.data);
        return response.data;
      }
      
      throw new ApiError('Failed to update profile', 400);
    } catch (error) {
      // In dev mode, update local state
      if (IS_DEV && (error instanceof ApiError && error.status === 400 || error instanceof Error && error.message.includes('Network'))) {
        console.warn('🔧 Dev mode: Mocking profile update');
        await mockDelay();
        const { user } = useAuthStore.getState();
        if (user) {
          const updatedUser: User = {
            ...user,
            ...data,
          };
          const { setUser } = useAuthStore.getState();
          setUser(updatedUser);
          return updatedUser;
        }
      }
      throw error;
    }
  },
};

// ============================================================================
// GENERIC API HELPERS
// ============================================================================

export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint),
  
  post: <T>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  put: <T>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  patch: <T>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  delete: <T>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE' }),
};

// ============================================================================
// PATTERN API
// ============================================================================

export interface ParsedPatternData {
  title: string;
  description?: string;
  designer?: string; // Original pattern designer/creator
  craft_type: string;
  garment_type?: string;
  difficulty?: string;
  gauge?: {
    stitches_per_10cm?: number;
    rows_per_10cm?: number;
    needle_size_mm?: number;
    yarn_weight?: string;
  };
  sizes: Array<{ name: string; display_order: number; measurements: Record<string, string> }>;
  sizingChart?: {
    measurements: Array<{ label: string; key: string }>;
    sizes: Record<string, Record<string, string>>;
  };
  sections: Array<{
    name: string;
    section_type: string;
    display_order: number;
    rows: Array<{
      row_number: number;
      row_label?: string;
      instruction: string;
      stitch_counts?: string;
      notes?: string;
      is_repeat_start?: boolean;
      is_repeat_end?: boolean;
      repeat_count?: number;
      repeat_group_id?: string;
    }>;
  }>;
  // Source and purchase information
  purchase_url?: string;
  shop_name?: string;
  store_name?: string;
  source_platform?: string;
  ravelry_pattern_id?: number;
  etsy_listing_id?: string;
  // Copyright and redistribution rights
  has_copyright_protection?: boolean;
  copyright_text?: string;
}

export const patternApi = {
  async getMyPatterns(options?: {
    page?: number;
    limit?: number;
    search?: string;
    craft?: string;
    difficulty?: string;
    garmentType?: string;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    try {
      const params = new URLSearchParams({
        myLibrary: 'true',
        ...(options?.page && { page: String(options.page) }),
        ...(options?.limit && { limit: String(options.limit) }),
        ...(options?.search && { search: options.search }),
        ...(options?.craft && { craft: options.craft }),
        ...(options?.difficulty && { difficulty: options.difficulty }),
        ...(options?.garmentType && { garmentType: options.garmentType }),
      });

      const response = await apiFetch<ApiResponse<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>>(`/patterns?${params.toString()}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new ApiError('Failed to fetch patterns', 400);
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
      throw error;
    }
  },

  async getFavorites(options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    try {
      const params = new URLSearchParams({
        favorites: 'true',
        ...(options?.page && { page: String(options.page) }),
        ...(options?.limit && { limit: String(options.limit) }),
        ...(options?.search && { search: options.search }),
      });

      const response = await apiFetch<ApiResponse<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>>(`/patterns?${params.toString()}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new ApiError('Failed to fetch favorites', 400);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      throw error;
    }
  },

  async saveParsedPattern(patternData: ParsedPatternData): Promise<{ id: string }> {
    try {
      console.log('[PatternAPI] Starting save process...');
      
      // Step 1: Create the pattern
      console.log('[PatternAPI] Step 1: Creating pattern...');
      const patternResponse = await apiFetch<ApiResponse<{ id: string }>>('/patterns', {
        method: 'POST',
        body: JSON.stringify({
          title: patternData.title,
          description: patternData.description,
          designerName: patternData.designer,
          craftType: patternData.craft_type || 'knitting',
          garmentType: patternData.garment_type,
          difficulty: patternData.difficulty,
          isFree: true,
          // Source information - uploaded patterns are private by default
          purchaseUrl: patternData.purchase_url,
          shopName: patternData.shop_name,
          storeName: patternData.store_name,
          sourcePlatform: patternData.source_platform,
          ravelryPatternId: patternData.ravelry_pattern_id,
          etsyListingId: patternData.etsy_listing_id,
          patternSource: 'uploaded', // Mark as uploaded (not created in-app)
          // Set isPublic based on copyright protection detection
          // If no copyright protection found, pattern can be public
          // If copyright protection found, pattern must be private
          isPublic: patternData.has_copyright_protection === false, // Public only if explicitly no copyright protection
          hasCopyrightProtection: patternData.has_copyright_protection,
          copyrightText: patternData.copyright_text,
          // Mark as original if this is the first parse (will be checked against cache)
          // If user made edits in review page, mark as edited
          isOriginal: !(patternData as any)._isEdited, // False if user edited
          isEdited: !!(patternData as any)._isEdited, // True if user made edits
          // Store full pattern data for caching (will be stored in ai_parsed_data)
          parsedPatternData: !(patternData as any)._isEdited ? patternData : null,
        }),
      });

      if (!patternResponse.success || !patternResponse.data) {
        console.error('[PatternAPI] Pattern creation failed:', patternResponse);
        throw new ApiError('Failed to create pattern', 400);
      }

      // Handle both response.data.id and response.data being the pattern object
      const patternId = patternResponse.data.id || (patternResponse.data as any).id;
      if (!patternId) {
        console.error('[PatternAPI] No pattern ID in response:', patternResponse);
        throw new ApiError('Pattern created but no ID returned', 500);
      }
      console.log('[PatternAPI] Pattern created with ID:', patternId);

      // Step 2: Update pattern with gauge info if available
      console.log('[PatternAPI] Step 2: Updating gauge info...');
      if (patternData.gauge) {
        try {
          const gaugeUpdate: any = {};
          if (patternData.gauge.stitches_per_10cm !== undefined) {
            gaugeUpdate.gaugeStitches = patternData.gauge.stitches_per_10cm;
          }
          if (patternData.gauge.rows_per_10cm !== undefined) {
            gaugeUpdate.gaugeRows = patternData.gauge.rows_per_10cm;
          }
          if (patternData.gauge.needle_size_mm !== undefined) {
            gaugeUpdate.gaugeNeedleMm = patternData.gauge.needle_size_mm;
          }
          
          if (Object.keys(gaugeUpdate).length > 0) {
            await apiFetch(`/patterns/${patternId}`, {
              method: 'PATCH',
              body: JSON.stringify(gaugeUpdate),
            });
          }
        } catch (error) {
          console.error('Failed to update gauge info:', error);
          // Continue even if gauge update fails
        }
      }

      // Step 3: Create sizes
      console.log('[PatternAPI] Step 3: Creating sizes...', patternData.sizes.length);
      const sizeMap: Record<string, string> = {}; // Map size name to size ID
      for (const size of patternData.sizes) {
        try {
          // Extract measurements from the size object
          const measurements = size.measurements || {};
          const sizeResponse = await apiFetch<ApiResponse<{ id: string }>>(`/patterns/${patternId}/sizes`, {
            method: 'POST',
            body: JSON.stringify({
              name: size.name,
              displayOrder: size.display_order,
              // Map common measurement keys to database fields
              bustCm: measurements.bust ? parseFloat(measurements.bust) : undefined,
              lengthCm: measurements.length ? parseFloat(measurements.length) : undefined,
              // Add other measurements as needed
            }),
          });
          if (sizeResponse.success && sizeResponse.data) {
            // Handle both response.data.id and response.data being the size object
            const sizeId = sizeResponse.data.id || (sizeResponse.data as any).id;
            if (sizeId) {
              sizeMap[size.name] = sizeId;
            }
          }
        } catch (error) {
          console.error('Failed to create size:', size.name, error);
          // Continue with other sizes even if one fails
        }
      }

      // Check if pattern was edited - if any sections/rows were modified, mark as edited
      // For now, we'll mark as edited if user made any changes in the review page
      // This will be set by the review page when saving
      
      // Step 4: Create sections with rows
      console.log('[PatternAPI] Step 4: Creating sections...', patternData.sections.length);
      for (const section of patternData.sections) {
        // Create section
        const sectionResponse = await apiFetch<ApiResponse<{ id: string }>>(`/patterns/${patternId}/sections`, {
          method: 'POST',
          body: JSON.stringify({
            name: section.name,
            sectionType: section.section_type,
            displayOrder: section.display_order,
          }),
        });

        if (!sectionResponse.success || !sectionResponse.data) {
          console.error('Failed to create section:', section.name, sectionResponse);
          continue;
        }

        // Handle both response.data.id and response.data being the section object
        const sectionId = sectionResponse.data.id || (sectionResponse.data as any).id;
        if (!sectionId) {
          console.error('No section ID in response:', sectionResponse);
          continue;
        }

        // Create rows for this section
        if (section.rows.length > 0) {
          const rowsToCreate = section.rows.map((row) => {
            // Try to extract stitch count from stitch_counts string
            let stitchCount: number | null = null;
            if (row.stitch_counts) {
              const match = row.stitch_counts.match(/\d+/);
              if (match) {
                stitchCount = parseInt(match[0]);
              }
            }

            return {
              rowNumber: row.row_number,
              rowLabel: row.row_label || null,
              instruction: row.instruction,
              stitchCount: stitchCount,
              notes: row.notes || null,
              instructionType: 'counted' as const,
              repeatCount: row.repeat_count || null,
              // Note: repeat_group_id and is_repeat_start/end would need backend support
            };
          });

          try {
            await apiFetch(`/patterns/${patternId}/sections/${sectionId}/rows`, {
              method: 'POST',
              body: JSON.stringify({ rows: rowsToCreate }),
            });
          } catch (error) {
            console.error('Failed to create rows for section:', section.name, error);
            // Continue with other sections even if one fails
          }
        }
      }

      console.log('[PatternAPI] Pattern save completed successfully!');
      return { id: patternId };
    } catch (error) {
      console.error('Pattern save error:', error);
      if (error instanceof ApiError) {
        throw new ApiError(
          error.message || 'Failed to save pattern',
          error.status,
          error.data
        );
      }
      if (shouldUseMock(error)) {
        console.log('🔧 Dev mode: Using mock pattern save');
        await mockDelay();
        return { id: crypto.randomUUID() };
      }
      throw error;
    }
  },
};

export default api;
