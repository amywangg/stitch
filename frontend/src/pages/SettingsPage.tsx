import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Mail, Lock, Bell, Globe, Palette, 
  ChevronRight, LogOut, RefreshCw, Check, X,
  Moon, Sun, Smartphone
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Button, Card, Text, Heading, Input, Divider } from '@/components/ui';
import { generateUsername, generateUsernameSuggestions, validateUsername } from '@/lib/usernameGenerator';

type SettingsSection = 'profile' | 'account' | 'notifications' | 'appearance' | 'privacy';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, setAuth } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  
  // Profile form
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    displayName: user?.displayName || '',
    bio: '',
    website: '',
    location: '',
  });
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'current'>('current');
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    if (profileData.username === user?.username) {
      setUsernameStatus('current');
      setUsernameError('');
      return;
    }

    const validation = validateUsername(profileData.username);
    if (!validation.valid) {
      setUsernameStatus('idle');
      setUsernameError(validation.error || '');
      return;
    }

    setUsernameError('');
    setUsernameStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const { authApi } = await import('@/lib/api');
        const isAvailable = await authApi.checkUsername(profileData.username);
        setUsernameStatus(isAvailable ? 'available' : 'taken');
      } catch (error) {
        console.error('Username check failed:', error);
        setUsernameStatus('available'); // Default to available on error
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [profileData.username, user?.username]);

  const handleRefreshUsername = () => {
    const newUsername = generateUsername();
    setProfileData(prev => ({ ...prev, username: newUsername }));
    setUsernameSuggestions(generateUsernameSuggestions(4));
  };

  const handleSaveProfile = async () => {
    if (usernameStatus === 'taken' || usernameStatus === 'checking') return;
    
    setIsLoading(true);
    setSuccess('');
    try {
      const { authApi } = await import('@/lib/api');
      
      await authApi.updateProfile({
        username: profileData.username,
        displayName: profileData.displayName,
        bio: profileData.bio,
        location: profileData.location,
        websiteUrl: profileData.website || undefined,
      });
      
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSuccess('');
      // Error will be shown via the form validation
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <RefreshCw className="w-4 h-4 animate-spin text-content-muted" />;
      case 'available':
        return <Check className="w-4 h-4 text-status-success" />;
      case 'taken':
        return <X className="w-4 h-4 text-status-error" />;
      case 'current':
        return <Check className="w-4 h-4 text-content-muted" />;
      default:
        return null;
    }
  };

  const menuItems = [
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'account' as const, icon: Lock, label: 'Account' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'appearance' as const, icon: Palette, label: 'Appearance' },
    { id: 'privacy' as const, icon: Globe, label: 'Privacy' },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Heading level={1} variant="display-xs">Settings</Heading>
      </motion.div>

      {/* Success message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Card variant="primary" padding="sm" className="bg-status-success-subtle border-status-success">
            <Text variant="body-sm" className="text-status-success">{success}</Text>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card variant="elevated" padding="sm" className="sticky top-20">
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${activeSection === item.id 
                      ? 'bg-coral-50 text-coral-600 dark:bg-coral-950 dark:text-coral-400' 
                      : 'text-content-muted hover:bg-background-subtle'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <Text variant="label-sm">{item.label}</Text>
                </button>
              ))}
              
              <Divider className="my-2" />
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-status-error hover:bg-status-error-subtle transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <Text variant="label-sm">Log Out</Text>
              </button>
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {activeSection === 'profile' && (
              <Card variant="elevated" padding="lg">
                <Heading level={2} variant="heading-lg" className="mb-6">Profile Settings</Heading>
                
                <div className="space-y-4">
                  {/* Username */}
                  <div className="space-y-2">
                    <Input
                      label="Username"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
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
                      hint={
                        usernameStatus === 'available' 
                          ? 'Username is available!' 
                          : usernameStatus === 'current' 
                            ? 'Your current username' 
                            : undefined
                      }
                    />
                    
                    {usernameSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {usernameSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setProfileData(prev => ({ ...prev, username: suggestion }))}
                            className={`
                              px-2 py-1 text-xs rounded-full border transition-all
                              ${profileData.username === suggestion 
                                ? 'bg-coral-100 border-coral-300 text-coral-700 dark:bg-coral-900 dark:border-coral-700 dark:text-coral-300'
                                : 'bg-background-subtle border-border-default text-content-muted hover:border-coral-300 hover:text-coral-600'
                              }
                            `}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Display Name */}
                  <Input
                    label="Display Name"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your display name"
                  />

                  {/* Bio */}
                  <div>
                    <label className="block text-label-sm text-content mb-1.5">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself and your knitting journey..."
                      className="w-full px-4 py-3 rounded-xl border border-border-default bg-surface
                        focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent
                        placeholder:text-content-muted resize-none transition-all"
                      rows={3}
                    />
                  </div>

                  {/* Location */}
                  <Input
                    label="Location"
                    value={profileData.location}
                    onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, Country"
                    leftIcon={<Globe className="w-5 h-5" />}
                  />

                  {/* Website */}
                  <Input
                    label="Website"
                    value={profileData.website}
                    onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://your-website.com"
                  />

                  <div className="pt-4">
                    <Button 
                      variant="primary" 
                      onClick={handleSaveProfile}
                      loading={isLoading}
                      disabled={usernameStatus === 'taken' || usernameStatus === 'checking'}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeSection === 'account' && (
              <Card variant="elevated" padding="lg">
                <Heading level={2} variant="heading-lg" className="mb-6">Account Settings</Heading>
                
                <div className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    leftIcon={<Mail className="w-5 h-5" />}
                    hint="Contact support to change your email"
                  />

                  <Divider />

                  <div>
                    <Text variant="label-md" className="mb-2">Change Password</Text>
                    <div className="space-y-3">
                      <Input
                        label="Current Password"
                        type="password"
                        placeholder="Enter current password"
                        leftIcon={<Lock className="w-5 h-5" />}
                      />
                      <Input
                        label="New Password"
                        type="password"
                        placeholder="Enter new password"
                        leftIcon={<Lock className="w-5 h-5" />}
                      />
                      <Input
                        label="Confirm New Password"
                        type="password"
                        placeholder="Confirm new password"
                        leftIcon={<Lock className="w-5 h-5" />}
                      />
                    </div>
                    <Button variant="outline" className="mt-4">
                      Update Password
                    </Button>
                  </div>

                  <Divider />

                  <div>
                    <Text variant="label-md" color="error" className="mb-2">Danger Zone</Text>
                    <Text variant="body-sm" color="muted" className="mb-3">
                      Once you delete your account, there is no going back.
                    </Text>
                    <Button variant="ghost" className="text-status-error hover:bg-status-error-subtle">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeSection === 'appearance' && (
              <Card variant="elevated" padding="lg">
                <Heading level={2} variant="heading-lg" className="mb-6">Appearance</Heading>
                
                <div className="space-y-6">
                  <div>
                    <Text variant="label-md" className="mb-3">Theme</Text>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', icon: Sun, label: 'Light' },
                        { id: 'dark', icon: Moon, label: 'Dark' },
                        { id: 'system', icon: Smartphone, label: 'System' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setTheme(option.id as 'light' | 'dark' | 'system')}
                          className={`
                            flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                            ${theme === option.id 
                              ? 'border-coral-500 bg-coral-50 dark:bg-coral-950' 
                              : 'border-border-default hover:border-border-emphasis'
                            }
                          `}
                        >
                          <option.icon className={`w-6 h-6 ${theme === option.id ? 'text-coral-500' : 'text-content-muted'}`} />
                          <Text variant="label-sm">{option.label}</Text>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Divider />

                  <div>
                    <Text variant="label-md" className="mb-3">Knitting Style</Text>
                    <Text variant="body-sm" color="muted" className="mb-4">
                      Select your preferred knitting style. This will customize instructions in the glossary.
                    </Text>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'continental', label: 'Continental', description: 'Yarn held in left hand' },
                        { id: 'english', label: 'English', description: 'Yarn held in right hand' },
                        { id: 'russian', label: 'Russian', description: 'Eastern European style' },
                        { id: 'portuguese', label: 'Portuguese', description: 'Yarn around neck/pin' },
                        { id: 'combination', label: 'Combination', description: 'Mixed techniques' },
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={async () => {
                            try {
                              const { authApi } = await import('@/lib/api');
                              await authApi.updateSettings({ knittingStyle: style.id });
                              setAuth({ user: { ...user, knittingStyle: style.id } });
                              setSuccess('Knitting style updated!');
                              setTimeout(() => setSuccess(''), 3000);
                            } catch (error) {
                              console.error('Failed to update knitting style:', error);
                            }
                          }}
                          className={`
                            flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left
                            ${(user?.knittingStyle || 'continental') === style.id 
                              ? 'border-coral-500 bg-coral-50 dark:bg-coral-950' 
                              : 'border-border-default hover:border-border-emphasis'
                            }
                          `}
                        >
                          <Text variant="label-sm" className={((user?.knittingStyle || 'continental') === style.id ? 'text-coral-600 dark:text-coral-400' : '') + ' font-semibold'}>
                            {style.label}
                          </Text>
                          <Text variant="body-xs" color="muted">
                            {style.description}
                          </Text>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeSection === 'notifications' && (
              <Card variant="elevated" padding="lg">
                <Heading level={2} variant="heading-lg" className="mb-6">Notifications</Heading>
                
                <div className="space-y-4">
                  {[
                    { label: 'Friend requests', description: 'When someone sends you a friend request' },
                    { label: 'Comments', description: 'When someone comments on your posts or projects' },
                    { label: 'Likes', description: 'When someone likes your posts or projects' },
                    { label: 'New followers', description: 'When someone starts following you' },
                    { label: 'Pattern updates', description: 'When a pattern you own gets updated' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2">
                      <div>
                        <Text variant="label-md">{item.label}</Text>
                        <Text variant="body-xs" color="muted">{item.description}</Text>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-background-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-coral-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeSection === 'privacy' && (
              <Card variant="elevated" padding="lg">
                <Heading level={2} variant="heading-lg" className="mb-6">Privacy</Heading>
                
                <div className="space-y-4">
                  {[
                    { label: 'Private profile', description: 'Only approved followers can see your posts and projects' },
                    { label: 'Show online status', description: 'Let friends see when you\'re active' },
                    { label: 'Show in search', description: 'Allow others to find you by username' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2">
                      <div>
                        <Text variant="label-md">{item.label}</Text>
                        <Text variant="body-xs" color="muted">{item.description}</Text>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-background-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-coral-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

