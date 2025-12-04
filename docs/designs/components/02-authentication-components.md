# Authentication Components Design Specification

**Category**: Authentication (Phase 1 - Foundation)
**Priority**: Critical - User identity and session management
**Design Date**: 2025-01-20

---

## Overview

Components that handle user authentication, session management, and protected routes using Supabase Auth. These components provide secure, accessible authentication flows with support for multiple auth providers.

---

## 1. AuthForm Component

### Purpose
Unified authentication form supporting email/password login, magic links, OAuth providers (Google, GitHub), and user registration with email verification.

### File Location
`apps/web/src/components/auth/AuthForm.tsx`

### Component Code

```typescript
'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Github, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase/client';

type AuthMode = 'login' | 'signup' | 'magic-link' | 'reset-password';
type OAuthProvider = 'google' | 'github';

interface AuthFormProps {
  /**
   * Initial authentication mode
   * @default 'login'
   */
  mode?: AuthMode;

  /**
   * Redirect URL after successful auth
   * @default '/dashboard'
   */
  redirectTo?: string;

  /**
   * Enable OAuth providers
   * @default ['google', 'github']
   */
  oauthProviders?: OAuthProvider[];

  /**
   * Show magic link option
   * @default true
   */
  allowMagicLink?: boolean;

  /**
   * Custom logo or branding
   */
  logo?: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Success callback
   */
  onSuccess?: () => void;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;
}

export function AuthForm({
  mode: initialMode = 'login',
  redirectTo = '/dashboard',
  oauthProviders = ['google', 'github'],
  allowMagicLink = true,
  logo,
  className,
  onSuccess,
  onError,
}: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle email/password authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8 && mode !== 'magic-link') {
      setError('Password must be at least 8 characters');
      return;
    }

    startTransition(async () => {
      try {
        if (mode === 'login') {
          // Email/password login
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          onSuccess?.();
          router.push(redirectTo);
        } else if (mode === 'signup') {
          // Email/password signup
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) throw error;

          setSuccessMessage(
            'Account created! Please check your email to verify your account.'
          );
        } else if (mode === 'magic-link') {
          // Magic link login
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) throw error;

          setSuccessMessage('Magic link sent! Check your email to sign in.');
        } else if (mode === 'reset-password') {
          // Password reset
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          });

          if (error) throw error;

          setSuccessMessage('Password reset link sent! Check your email.');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        onError?.(err as Error);
      }
    });
  };

  // Handle OAuth authentication
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OAuth login failed';
      setError(errorMessage);
      onError?.(err as Error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass-panel rounded-2xl p-8 max-w-md w-full', className)}
    >
      {/* Logo/Branding */}
      {logo && <div className="mb-6 text-center">{logo}</div>}

      {/* Title */}
      <h2 className="text-2xl font-bold text-center mb-6">
        {mode === 'login' && 'Welcome back'}
        {mode === 'signup' && 'Create account'}
        {mode === 'magic-link' && 'Sign in with email'}
        {mode === 'reset-password' && 'Reset password'}
      </h2>

      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg bg-neon-accent/10 border border-neon-accent/50"
          >
            <p className="text-sm text-neon-accent">{successMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OAuth Providers */}
      {mode !== 'reset-password' && oauthProviders.length > 0 && (
        <div className="space-y-3 mb-6">
          {oauthProviders.includes('google') && (
            <Button
              variant="glass"
              className="w-full"
              onClick={() => handleOAuthLogin('google')}
              disabled={isPending}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          )}

          {oauthProviders.includes('github') && (
            <Button
              variant="glass"
              className="w-full"
              onClick={() => handleOAuthLogin('github')}
              disabled={isPending}
            >
              <Github className="h-5 w-5 mr-2" />
              Continue with GitHub
            </Button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-glass-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
        </div>
      )}

      {/* Email/Password Form */}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        {/* Full Name (signup only) */}
        {mode === 'signup' && (
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
                required
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
              required
            />
          </div>
        </div>

        {/* Password (login & signup) */}
        {mode !== 'magic-link' && mode !== 'reset-password' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
                required
                minLength={8}
              />
            </div>
          </div>
        )}

        {/* Confirm Password (signup only) */}
        {mode === 'signup' && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
                required
                minLength={8}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="neon"
          className="w-full"
          disabled={isPending}
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'login' && 'Sign in'}
          {mode === 'signup' && 'Create account'}
          {mode === 'magic-link' && 'Send magic link'}
          {mode === 'reset-password' && 'Send reset link'}
        </Button>
      </form>

      {/* Mode Switchers */}
      <div className="mt-6 space-y-2 text-center text-sm">
        {mode === 'login' && (
          <>
            <p className="text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-neon-primary hover:text-neon-accent font-medium"
              >
                Sign up
              </button>
            </p>
            {allowMagicLink && (
              <p className="text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setMode('magic-link')}
                  className="text-neon-primary hover:text-neon-accent font-medium"
                >
                  Sign in with magic link
                </button>
              </p>
            )}
            <p className="text-muted-foreground">
              <button
                type="button"
                onClick={() => setMode('reset-password')}
                className="text-neon-primary hover:text-neon-accent font-medium"
              >
                Forgot password?
              </button>
            </p>
          </>
        )}

        {mode === 'signup' && (
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-neon-primary hover:text-neon-accent font-medium"
            >
              Sign in
            </button>
          </p>
        )}

        {(mode === 'magic-link' || mode === 'reset-password') && (
          <p className="text-muted-foreground">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-neon-primary hover:text-neon-accent font-medium"
            >
              Back to sign in
            </button>
          </p>
        )}
      </div>
    </motion.div>
  );
}

AuthForm.displayName = 'AuthForm';
```

### Supabase Client Setup

```typescript
// apps/web/src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

### Usage Examples

```typescript
// Login page
<AuthForm mode="login" redirectTo="/dashboard" />

// Signup page with custom logo
<AuthForm
  mode="signup"
  logo={<img src="/logo.svg" alt="Q8" className="h-12" />}
  oauthProviders={['google', 'github']}
/>

// Magic link only
<AuthForm
  mode="magic-link"
  allowMagicLink
  oauthProviders={[]}
/>

// Password reset
<AuthForm mode="reset-password" />
```

### Styling & Design Tokens

```css
/* Glass form with neon accents */
- Form container: glass-panel with rounded-2xl
- Input fields: glass-panel with focus:ring-neon-primary
- Submit button: variant="neon" for primary action
- OAuth buttons: variant="glass" for secondary actions
- Error/Success: Colored borders with semi-transparent backgrounds
```

### Accessibility

- [ ] All form inputs have proper labels
- [ ] Error messages are associated with inputs via `aria-describedby`
- [ ] Submit button shows loading state with `aria-busy`
- [ ] Mode switchers are keyboard accessible buttons
- [ ] Success/error announcements via `aria-live`
- [ ] Password requirements are clearly stated

---

## 2. UserProfile Component

### Purpose
Displays user avatar, name, and provides dropdown menu for account settings, theme toggle, and logout.

### File Location
`apps/web/src/components/auth/UserProfile.tsx`

### Component Code

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Crown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfileProps {
  /**
   * Display variant
   * - avatar: Avatar only
   * - compact: Avatar + name
   * - full: Avatar + name + email
   */
  variant?: 'avatar' | 'compact' | 'full';

  /**
   * Show dropdown menu
   * @default true
   */
  showMenu?: boolean;

  /**
   * Show theme toggle in menu
   * @default true
   */
  showThemeToggle?: boolean;

  /**
   * Show settings link in menu
   * @default true
   */
  showSettings?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Logout callback
   */
  onLogout?: () => void;
}

export function UserProfile({
  variant = 'compact',
  showMenu = true,
  showThemeToggle = true,
  showSettings = true,
  className,
  onLogout,
}: UserProfileProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };

    fetchUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout?.();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Get user display name
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  // Get user avatar
  const avatarUrl = user?.user_metadata?.avatar_url;

  // Generate avatar fallback (initials)
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return (
      <div className="h-10 w-10 rounded-full glass-panel animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        onClick={() => showMenu && setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 rounded-full glass-panel hover:bg-glass-bg transition-colors',
          variant === 'avatar' && 'p-1',
          variant === 'compact' && 'py-2 px-3',
          variant === 'full' && 'py-2 px-4',
          className
        )}
      >
        {/* Avatar */}
        <div className="relative h-8 w-8 rounded-full overflow-hidden bg-neon-primary/20 flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-neon-primary">
              {initials}
            </span>
          )}

          {/* Pro badge (if applicable) */}
          {user.user_metadata?.is_pro && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-neon-accent rounded-full flex items-center justify-center">
              <Crown className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Name & Email */}
        {variant !== 'avatar' && (
          <div className="text-left">
            <p className="text-sm font-medium">{displayName}</p>
            {variant === 'full' && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        )}

        {/* Dropdown Indicator */}
        {showMenu && variant !== 'avatar' && (
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showMenu && isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 glass-panel rounded-xl shadow-lg overflow-hidden z-50"
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-glass-border">
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* Settings */}
              {showSettings && (
                <button
                  onClick={() => {
                    router.push('/settings');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-glass-bg transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Settings</span>
                </button>
              )}

              {/* Theme Toggle */}
              {showThemeToggle && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-glass-bg transition-colors"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </span>
                </button>
              )}

              {/* Divider */}
              <div className="my-2 border-t border-glass-border" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-red-500 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

UserProfile.displayName = 'UserProfile';
```

### Usage Examples

```typescript
// Avatar only (mobile navbar)
<UserProfile variant="avatar" />

// Compact with name (desktop navbar)
<UserProfile variant="compact" />

// Full with email (sidebar)
<UserProfile variant="full" />

// No dropdown menu (display only)
<UserProfile variant="compact" showMenu={false} />

// Custom settings only
<UserProfile
  showThemeToggle={false}
  showSettings
  onLogout={() => console.log('User logged out')}
/>
```

### Styling & Design Tokens

```css
/* Glass profile button with dropdown */
- Button: glass-panel with hover:bg-glass-bg
- Avatar: rounded-full with bg-neon-primary/20
- Dropdown: glass-panel with shadow-lg
- Pro badge: bg-neon-accent with Crown icon
- Logout: hover:bg-red-500/10 text-red-500
```

### Accessibility

- [ ] Profile button has `aria-label` describing user
- [ ] Dropdown menu has `role="menu"`
- [ ] Menu items have `role="menuitem"`
- [ ] Keyboard navigation (Arrow keys, Escape to close)
- [ ] Focus trap when menu is open
- [ ] Avatar has alt text

---

## 3. ProtectedRoute Component

### Purpose
Wrapper component that enforces authentication for protected pages, redirecting unauthenticated users to login.

### File Location
`apps/web/src/components/auth/ProtectedRoute.tsx`

### Component Code

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  /**
   * Child components to render when authenticated
   */
  children: React.ReactNode;

  /**
   * Redirect path for unauthenticated users
   * @default '/login'
   */
  redirectTo?: string;

  /**
   * Required user role (if applicable)
   */
  requiredRole?: string;

  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;

  /**
   * Custom unauthorized component
   */
  unauthorizedComponent?: React.ReactNode;

  /**
   * Callback when user is unauthorized
   */
  onUnauthorized?: (user: User | null) => void;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requiredRole,
  loadingComponent,
  unauthorizedComponent,
  onUnauthorized,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          // No user, redirect to login
          onUnauthorized?.(null);
          router.push(`${redirectTo}?redirect=${pathname}`);
          return;
        }

        // Check role if required
        if (requiredRole) {
          const userRole = session.user.user_metadata?.role;

          if (userRole !== requiredRole) {
            // User doesn't have required role
            onUnauthorized?.(session.user);
            setIsAuthorized(false);
            setIsLoading(false);
            return;
          }
        }

        // User is authenticated and authorized
        setUser(session.user);
        setIsAuthorized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push(redirectTo);
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push(redirectTo);
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setIsAuthorized(true);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [redirectTo, requiredRole, router, pathname, onUnauthorized]);

  // Loading state
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <Loader2 className="h-8 w-8 animate-spin text-neon-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying authentication...</p>
          </motion.div>
        </div>
      )
    );
  }

  // Unauthorized state (role mismatch)
  if (!isAuthorized) {
    return (
      unauthorizedComponent || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-2xl p-8 max-w-md text-center"
          >
            <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => router.back()}
              className="glass-panel px-4 py-2 rounded-lg hover:bg-glass-bg"
            >
              Go back
            </button>
          </motion.div>
        </div>
      )
    );
  }

  // Authorized - render children
  return <>{children}</>;
}

ProtectedRoute.displayName = 'ProtectedRoute';
```

### Usage Examples

```typescript
// Basic protected route
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>

// Custom redirect
<ProtectedRoute redirectTo="/auth/login">
  <SettingsPage />
</ProtectedRoute>

// Role-based protection
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

// Custom loading & unauthorized components
<ProtectedRoute
  loadingComponent={<CustomLoader />}
  unauthorizedComponent={<Custom403Page />}
  onUnauthorized={(user) => console.log('Unauthorized access attempt:', user)}
>
  <ProtectedContent />
</ProtectedRoute>

// In Next.js App Router layout
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {children}
      </div>
    </ProtectedRoute>
  );
}
```

### Styling & Design Tokens

```css
/* Loading and unauthorized states */
- Loading: Centered with spinning Loader2 icon
- Unauthorized: Glass panel card with Lock icon
- Text: text-muted-foreground for descriptions
- Icon colors: text-neon-primary (loading), text-red-500 (unauthorized)
```

### Accessibility

- [ ] Loading state announces via `aria-live="polite"`
- [ ] Focus management when redirecting
- [ ] Unauthorized message is clear and actionable
- [ ] Keyboard navigation for "Go back" button
- [ ] Motion respects `prefers-reduced-motion`

---

## 4. SessionManager Component

### Purpose
Global session state manager that syncs Supabase auth state with RxDB, handles session refresh, and provides auth context to the app.

### File Location
`apps/web/src/components/auth/SessionManager.tsx`

### Component Code

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import type { User, Session } from '@supabase/supabase-js';

interface SessionContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined
);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionManager');
  }
  return context;
}

interface SessionManagerProps {
  children: React.ReactNode;
}

export function SessionManager({ children }: SessionManagerProps) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setSession(session);
          setUser(session.user);

          // Sync user to RxDB for offline access
          await syncUserToRxDB(session.user);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Session initialization failed:', error);
        setIsLoading(false);
      }
    };

    initSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          // Sync user to RxDB
          await syncUserToRxDB(session.user);

          // Start RxDB replication
          await startReplication(session);
        }

        if (event === 'SIGNED_OUT') {
          // Clear RxDB data
          await clearRxDBData();

          // Stop replication
          await stopReplication();
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await clearRxDBData();
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // Refresh session manually
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      setSession(data.session);
      setUser(data.session?.user ?? null);
    } catch (error) {
      console.error('Session refresh failed:', error);
    }
  };

  const value: SessionContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

SessionManager.displayName = 'SessionManager';

// Helper: Sync user to RxDB
async function syncUserToRxDB(user: User) {
  try {
    const userCollection = db.collections.users;

    await userCollection.upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url,
      role: user.user_metadata?.role || 'user',
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    });

    console.log('User synced to RxDB');
  } catch (error) {
    console.error('Failed to sync user to RxDB:', error);
  }
}

// Helper: Start RxDB replication
async function startReplication(session: Session) {
  try {
    // TODO: Implement RxDB replication to Supabase
    // This will depend on your replication strategy
    console.log('Starting RxDB replication...');

    // Example:
    // await db.startReplication(session.access_token);
  } catch (error) {
    console.error('Failed to start replication:', error);
  }
}

// Helper: Stop RxDB replication
async function stopReplication() {
  try {
    console.log('Stopping RxDB replication...');

    // Example:
    // await db.stopReplication();
  } catch (error) {
    console.error('Failed to stop replication:', error);
  }
}

// Helper: Clear RxDB data on logout
async function clearRxDBData() {
  try {
    console.log('Clearing RxDB data...');

    // Clear all collections
    await db.remove();

    console.log('RxDB data cleared');
  } catch (error) {
    console.error('Failed to clear RxDB data:', error);
  }
}
```

### Custom Hook Usage

```typescript
// apps/web/src/hooks/useAuth.ts
'use client';

import { useSession } from '@/components/auth/SessionManager';

export function useAuth() {
  const { user, isLoading, isAuthenticated, signOut } = useSession();

  return {
    user,
    isLoading,
    isAuthenticated,
    signOut,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.user_metadata?.role,
  };
}
```

### Root Layout Integration

```typescript
// apps/web/src/app/layout.tsx
import { SessionManager } from '@/components/auth/SessionManager';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionManager>
          {children}
        </SessionManager>
      </body>
    </html>
  );
}
```

### Usage Examples

```typescript
// In any component
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, signOut } = useAuth();

  if (!isAuthenticated) {
    return <p>Please sign in</p>;
  }

  return (
    <div>
      <p>Welcome, {user?.email}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
```

### Accessibility

- [ ] Session changes don't disrupt user flow
- [ ] Loading states are announced
- [ ] Error states are accessible
- [ ] Sign out is keyboard accessible

---

## Implementation Checklist

### Phase 1: Core Authentication
- [ ] Create `AuthForm.tsx` with all auth modes
- [ ] Set up Supabase client configuration
- [ ] Create auth callback handler (`/auth/callback`)
- [ ] Implement email verification flow
- [ ] Test OAuth providers (Google, GitHub)

### Phase 2: Session Management
- [ ] Create `SessionManager.tsx` with context
- [ ] Create `useAuth` hook
- [ ] Integrate with root layout
- [ ] Implement RxDB user sync
- [ ] Set up session refresh logic

### Phase 3: Protected Routes
- [ ] Create `ProtectedRoute.tsx` wrapper
- [ ] Implement role-based access control
- [ ] Add loading and unauthorized states
- [ ] Test redirect flows

### Phase 4: User Profile
- [ ] Create `UserProfile.tsx` component
- [ ] Implement dropdown menu
- [ ] Add theme toggle integration
- [ ] Create settings page navigation

### Phase 5: Testing & Polish
- [ ] Write unit tests for all components
- [ ] Test auth flows end-to-end
- [ ] Verify accessibility compliance
- [ ] Add error boundary for auth failures

---

## Security Considerations

### Authentication Best Practices
- **Password Requirements**: Minimum 8 characters enforced
- **OAuth Security**: Use PKCE flow for OAuth providers
- **Session Storage**: Supabase handles secure session storage
- **CSRF Protection**: Supabase provides built-in CSRF protection
- **Rate Limiting**: Implement on backend for auth endpoints

### Data Privacy
- **Email Verification**: Required before account activation
- **Password Reset**: Secure token-based reset flow
- **User Data**: Store minimal PII, follow GDPR guidelines
- **Session Timeout**: Auto-refresh with 1-hour expiry

### RxDB Sync Security
- **Access Tokens**: Never store in RxDB, only in secure storage
- **User-Specific Data**: Filter replication by user ID
- **Encryption**: Consider encrypting sensitive RxDB data

---

## Next Steps

After implementing Authentication Components, proceed to:
1. **Dashboard Widgets** (Category 2) - Domain-specific data displays
2. **Chat Interface** (Category 1) - Agent conversation UI
3. **Voice Enhancements** (Category 4) - Advanced voice features

---

**End of Authentication Components Design Specification**
