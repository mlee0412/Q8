'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
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

/**
 * Protected route wrapper component
 *
 * Features:
 * - Enforces authentication for protected pages
 * - Redirects unauthenticated users to login
 * - Supports role-based access control
 * - Custom loading and unauthorized states
 *
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 *
 * // With role requirement
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 */
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
            <Loader2 className="h-8 w-8 animate-spin text-neon-primary mx-auto mb-4" aria-hidden="true" />
            <p className="text-text-muted" role="status" aria-live="polite">
              Verifying authentication...
            </p>
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
            className="surface-matte rounded-2xl p-8 max-w-md text-center"
          >
            <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-text-muted mb-6">
              You don&apos;t have permission to access this page.
            </p>
            <button
              onClick={() => router.back()}
              className="surface-matte px-4 py-2 rounded-lg hover:bg-surface-3"
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
