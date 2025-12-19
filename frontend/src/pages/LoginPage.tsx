import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { authApi, ApiError } from '@/lib/api';
import { Button, Card, Text, Heading, Input, Divider } from '@/components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authApi.login({ email, password });
      navigate('/home');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authApi.googleAuth(credentialResponse.credential);
      navigate('/home');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Google authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled.');
  };

  const handleAppleSignIn = async () => {
    setError('Apple Sign-In requires additional setup. Please use email or Google.');
    // TODO: Implement Apple Sign-In when configured
  };

  return (
    <div className="max-w-sm mx-auto w-full">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="w-20 h-20 rounded-2xl bg-coral-500 flex items-center justify-center mb-4 shadow-primary">
          <span className="text-4xl">🧶</span>
        </div>
        <Heading level={1} variant="display-xs">Welcome back!</Heading>
        <Text color="muted" className="mt-1">Sign in to continue knitting</Text>
      </motion.div>

      {/* OAuth Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="space-y-3 mb-6"
      >
        {/* Google Sign In */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            width="100%"
            text="signin_with"
            shape="pill"
          />
        </div>

        {/* Apple Sign In */}
        <Button 
          variant="outline" 
          fullWidth 
          onClick={handleAppleSignIn}
          disabled={isLoading}
          className="h-11"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </Button>
      </motion.div>

      <Divider label="or continue with email" />

      {/* Form */}
      <motion.form
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-4 mt-6"
      >
        {error && (
          <Card variant="primary" padding="sm" className="bg-status-error-subtle border-status-error">
            <Text variant="body-sm" color="error">{error}</Text>
          </Card>
        )}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          leftIcon={<Mail className="w-5 h-5" />}
          required
          disabled={isLoading}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          leftIcon={<Lock className="w-5 h-5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 hover:bg-background-muted rounded"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          }
          required
          disabled={isLoading}
        />

        <div className="text-right">
          <Link to="/forgot-password">
            <Button variant="link" size="sm">Forgot password?</Button>
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
        >
          Sign In
        </Button>
      </motion.form>

      {/* Sign up link */}
      <Text color="muted" className="text-center mt-8">
        Don't have an account?{' '}
        <Link to="/register">
          <Button variant="link">Sign up</Button>
        </Link>
      </Text>
    </div>
  );
}
