import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, RefreshCw, Check, X } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { authApi, ApiError } from '@/lib/api';
import { Button, Card, Text, Heading, Input, Divider } from '@/components/ui';
import { generateUsername, generateUsernameSuggestions, validateUsername } from '@/lib/usernameGenerator';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameError, setUsernameError] = useState('');

  // Generate initial username on mount
  useEffect(() => {
    const initialUsername = generateUsername();
    setFormData(prev => ({ ...prev, username: initialUsername }));
    setUsernameSuggestions(generateUsernameSuggestions(4));
  }, []);

  // Check username availability (debounced)
  useEffect(() => {
    if (!formData.username) {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }

    const validation = validateUsername(formData.username);
    if (!validation.valid) {
      setUsernameStatus('idle');
      setUsernameError(validation.error || '');
      return;
    }

    setUsernameError('');
    setUsernameStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const isAvailable = await authApi.checkUsername(formData.username);
        setUsernameStatus(isAvailable ? 'available' : 'taken');
      } catch {
        // If API fails, assume available (will be validated on submit)
        setUsernameStatus('available');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user types
  };

  const handleRefreshUsername = () => {
    const newUsername = generateUsername();
    setFormData(prev => ({ ...prev, username: newUsername }));
    setUsernameSuggestions(generateUsernameSuggestions(4));
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setFormData(prev => ({ ...prev, username: suggestion }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate username
    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.valid) {
      setError(usernameValidation.error || 'Invalid username');
      setIsLoading(false);
      return;
    }

    if (usernameStatus === 'taken') {
      setError('Username is already taken');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      await authApi.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });
      navigate('/home');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
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
  };

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <RefreshCw className="w-4 h-4 animate-spin text-content-muted" />;
      case 'available':
        return <Check className="w-4 h-4 text-status-success" />;
      case 'taken':
        return <X className="w-4 h-4 text-status-error" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-sm mx-auto w-full">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="w-20 h-20 rounded-2xl bg-teal-500 flex items-center justify-center mb-4 shadow-secondary">
          <span className="text-4xl">✨</span>
        </div>
        <Heading level={1} variant="display-xs">Join Stitch!</Heading>
        <Text color="muted" className="mt-1">Start your knitting journey</Text>
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
            text="signup_with"
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

      <Divider label="or sign up with email" />

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

        {/* Username field with generator */}
        <div className="space-y-2">
          <Input
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="your_username"
            leftIcon={<User className="w-5 h-5" />}
            rightIcon={
              <div className="flex items-center gap-2">
                {getUsernameStatusIcon()}
                <button
                  type="button"
                  onClick={handleRefreshUsername}
                  className="p-1 hover:bg-background-muted rounded transition-colors"
                  title="Generate new username"
                >
                  <RefreshCw className="w-4 h-4 text-content-muted hover:text-content-default" />
                </button>
              </div>
            }
            error={usernameError || (usernameStatus === 'taken' ? 'Username is taken' : undefined)}
            hint={usernameStatus === 'available' ? 'Username is available!' : undefined}
            required
            disabled={isLoading}
          />

          {/* Username suggestions */}
          {usernameSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {usernameSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  disabled={isLoading}
                  className={`
                    px-2 py-1 text-xs rounded-full border transition-all
                    ${formData.username === suggestion 
                      ? 'bg-coral-100 border-coral-300 text-coral-700 dark:bg-coral-900 dark:border-coral-700 dark:text-coral-300'
                      : 'bg-background-subtle border-border-default text-content-muted hover:border-coral-300 hover:text-coral-600'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          leftIcon={<Mail className="w-5 h-5" />}
          required
          disabled={isLoading}
        />

        <Input
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          placeholder="Min. 8 characters"
          leftIcon={<Lock className="w-5 h-5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 hover:bg-background-muted rounded"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
          required
          disabled={isLoading}
        />

        <Input
          label="Confirm Password"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          leftIcon={<Lock className="w-5 h-5" />}
          required
          disabled={isLoading}
        />

        <Text variant="body-xs" color="muted">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-content-primary hover:underline">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-content-primary hover:underline">Privacy Policy</Link>
        </Text>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={usernameStatus === 'taken' || usernameStatus === 'checking'}
        >
          Create Account
        </Button>
      </motion.form>

      {/* Login link */}
      <Text color="muted" className="text-center mt-8">
        Already have an account?{' '}
        <Link to="/login">
          <Button variant="link">Sign in</Button>
        </Link>
      </Text>
    </div>
  );
}
