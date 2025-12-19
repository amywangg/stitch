import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface OAuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
      role: string;
      isNewUser: boolean;
    };
    accessToken: string;
    refreshToken: string;
  };
}

export function useOAuth() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Sign-In handler
  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data: OAuthResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error('Google authentication failed');
      }

      // Set auth state
      setAuth(
        {
          id: data.data.user.id,
          email: data.data.user.email,
          username: data.data.user.username,
          displayName: data.data.user.displayName,
          avatarUrl: data.data.user.avatarUrl,
        },
        data.data.accessToken
      );

      // Store refresh token
      localStorage.setItem('refreshToken', data.data.refreshToken);

      // Navigate to home or onboarding
      if (data.data.user.isNewUser) {
        navigate('/home'); // Could go to onboarding flow
      } else {
        navigate('/home');
      }
    } catch (err) {
      console.error('Google auth error:', err);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed.');
  };

  // Apple Sign-In handler
  const handleAppleSuccess = async (response: {
    authorization: {
      id_token: string;
      code: string;
    };
    user?: {
      email?: string;
      name?: {
        firstName?: string;
        lastName?: string;
      };
    };
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiResponse = await fetch(`${API_URL}/auth/apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identityToken: response.authorization.id_token,
          authorizationCode: response.authorization.code,
          user: response.user,
        }),
      });

      const data: OAuthResponse = await apiResponse.json();

      if (!apiResponse.ok || !data.success) {
        throw new Error('Apple authentication failed');
      }

      // Set auth state
      setAuth(
        {
          id: data.data.user.id,
          email: data.data.user.email,
          username: data.data.user.username,
          displayName: data.data.user.displayName,
          avatarUrl: data.data.user.avatarUrl,
        },
        data.data.accessToken
      );

      // Store refresh token
      localStorage.setItem('refreshToken', data.data.refreshToken);

      // Navigate to home or onboarding
      if (data.data.user.isNewUser) {
        navigate('/home');
      } else {
        navigate('/home');
      }
    } catch (err) {
      console.error('Apple auth error:', err);
      setError('Failed to sign in with Apple. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleError = () => {
    setError('Apple sign-in was cancelled or failed.');
  };

  // Initialize Apple Sign-In
  const initAppleSignIn = () => {
    // Apple Sign-In is handled via their JS SDK
    // The button will trigger the native Apple flow
    if (typeof window !== 'undefined' && (window as any).AppleID) {
      (window as any).AppleID.auth.init({
        clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: `${window.location.origin}/auth/apple/callback`,
        usePopup: true,
      });
    }
  };

  const triggerAppleSignIn = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).AppleID) {
        const response = await (window as any).AppleID.auth.signIn();
        await handleAppleSuccess(response);
      } else {
        setError('Apple Sign-In is not available');
      }
    } catch (err: any) {
      if (err?.error === 'popup_closed_by_user') {
        // User closed the popup, not an error
        return;
      }
      handleAppleError();
    }
  };

  return {
    isLoading,
    error,
    setError,
    handleGoogleSuccess,
    handleGoogleError,
    handleAppleSuccess,
    handleAppleError,
    initAppleSignIn,
    triggerAppleSignIn,
  };
}


