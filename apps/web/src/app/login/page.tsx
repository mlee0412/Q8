'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { AnimatedBackground } from '@/components/shared/AnimatedBackground';

function LoginContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get error from URL (e.g., from OAuth callback)
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Error from URL (OAuth callback errors) */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/50">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <AuthForm
          mode="login"
          redirectTo="/"
          logo={
            <div className="text-center mb-2">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-neon-primary to-neon-accent bg-clip-text text-transparent">
                Q8
              </h1>
              <p className="text-text-muted mt-2">Your AI Personal Assistant</p>
            </div>
          }
          onSuccess={() => setError(null)}
          onError={(err) => setError(err.message)}
        />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen relative flex items-center justify-center p-4">
          <AnimatedBackground />
          <div className="relative z-10 surface-matte rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-neon-primary to-neon-accent bg-clip-text text-transparent">
                Q8
              </h1>
              <p className="text-text-muted mt-4">Loading...</p>
            </div>
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
