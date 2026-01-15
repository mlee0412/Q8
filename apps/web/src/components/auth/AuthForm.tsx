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
      className={cn('surface-matte rounded-2xl p-8 max-w-md w-full', className)}
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
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" aria-hidden="true" />
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
              <Github className="h-5 w-5 mr-2" aria-hidden="true" />
              Continue with GitHub
            </Button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-text-muted">Or</span>
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
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2 surface-matte rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
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
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2 surface-matte rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
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
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 surface-matte rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
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
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 surface-matte rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
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
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
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
            <p className="text-text-muted">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-neon-primary hover:text-neon-accent font-medium"
              >
                Sign up
              </button>
            </p>
            {allowMagicLink && (
              <p className="text-text-muted">
                <button
                  type="button"
                  onClick={() => setMode('magic-link')}
                  className="text-neon-primary hover:text-neon-accent font-medium"
                >
                  Sign in with magic link
                </button>
              </p>
            )}
            <p className="text-text-muted">
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
          <p className="text-text-muted">
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
          <p className="text-text-muted">
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
