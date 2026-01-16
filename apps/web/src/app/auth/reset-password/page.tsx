'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/shared/AnimatedBackground';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <main className="min-h-screen relative flex items-center justify-center p-4">
        <AnimatedBackground />

        <div className="relative z-10 surface-matte rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-neon-accent mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Password Reset!</h2>
          <p className="text-text-muted">
            Your password has been updated successfully.
          </p>
          <p className="text-text-muted mt-2">Redirecting to dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="surface-matte rounded-2xl p-8"
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-primary to-neon-accent bg-clip-text text-transparent">
              Q8
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-center mb-6">
            Set New Password
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-center gap-2">
              <AlertCircle
                className="h-4 w-4 text-red-500 flex-shrink-0"
                aria-hidden="true"
              />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 surface-matte rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-text-muted mt-1">
                Must be at least 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
                  aria-hidden="true"
                />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 surface-matte rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="neon"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2
                  className="h-4 w-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
              )}
              Reset Password
            </Button>
          </div>

          {/* Back to login link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-neon-primary hover:text-neon-accent font-medium"
            >
              Back to sign in
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
