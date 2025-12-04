'use client';

import { useSession } from '@/components/auth/SessionManager';

/**
 * Convenient auth hook with derived values
 *
 * Wraps useSession with additional computed properties for easier consumption
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signOut, userId, userEmail } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <p>Please sign in</p>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {userEmail}</p>
 *       <button onClick={signOut}>Sign out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth() {
  const { user, isLoading, isAuthenticated, signOut, refreshSession } = useSession();

  return {
    user,
    isLoading,
    isAuthenticated,
    signOut,
    refreshSession,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.user_metadata?.role,
    fullName: user?.user_metadata?.full_name,
    avatarUrl: user?.user_metadata?.avatar_url,
    isPro: user?.user_metadata?.is_pro,
  };
}
