/**
 * API Authentication Utilities
 *
 * Provides secure authentication for API routes.
 * Replaces insecure userId from query params with verified session user.
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Authenticated user information extracted from session
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  fullName?: string;
  avatarUrl?: string;
}

/**
 * Result of authentication check
 */
export type AuthResult =
  | { authenticated: true; user: AuthenticatedUser }
  | { authenticated: false; error: string };

/**
 * Get the authenticated user from the request cookies
 *
 * @param request - The incoming Next.js request (optional, cookies used directly)
 * @returns The authenticated user or null if not authenticated
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const user = await getAuthenticatedUser(request);
 *   if (!user) {
 *     return unauthorizedResponse();
 *   }
 *   // Use user.id for database queries
 *   const data = await supabase.from('notes').select('*').eq('user_id', user.id);
 * }
 * ```
 */
export async function getAuthenticatedUser(
  _request?: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          // These are required by the type but won't be called in read-only context
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      role: user.user_metadata?.role as string | undefined,
      fullName: user.user_metadata?.full_name as string | undefined,
      avatarUrl: user.user_metadata?.avatar_url as string | undefined,
    };
  } catch (error) {
    console.error('[API Auth] Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Check authentication and return detailed result
 *
 * @param request - The incoming Next.js request
 * @returns AuthResult with user data or error
 */
export async function checkAuthentication(
  request?: NextRequest
): Promise<AuthResult> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      authenticated: false,
      error: 'Authentication required. Please sign in.',
    };
  }

  return {
    authenticated: true,
    user,
  };
}

/**
 * Require authentication or return 401 response
 *
 * @param request - The incoming Next.js request
 * @returns Tuple of [user, null] if authenticated, or [null, Response] if not
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const [user, errorResponse] = await requireAuth(request);
 *   if (errorResponse) return errorResponse;
 *
 *   // user is guaranteed to be defined here
 *   const data = await getDataForUser(user.id);
 * }
 * ```
 */
export async function requireAuth(
  request: NextRequest
): Promise<[AuthenticatedUser, null] | [null, NextResponse]> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return [null, unauthorizedResponse()];
  }

  return [user, null];
}

/**
 * Create a standard 401 Unauthorized response
 *
 * @param message - Custom error message (defaults to 'Unauthorized')
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  );
}

/**
 * Create a standard 403 Forbidden response
 *
 * @param message - Custom error message (defaults to 'Forbidden')
 * @returns NextResponse with 403 status
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: 'FORBIDDEN',
    },
    { status: 403 }
  );
}

/**
 * Verify that the authenticated user has a specific role
 *
 * @param user - The authenticated user
 * @param requiredRole - The role required for access
 * @returns true if user has the required role
 */
export function hasRole(
  user: AuthenticatedUser,
  requiredRole: string
): boolean {
  return user.role === requiredRole;
}

/**
 * Verify that the authenticated user has one of the specified roles
 *
 * @param user - The authenticated user
 * @param allowedRoles - Array of roles that are allowed
 * @returns true if user has any of the allowed roles
 */
export function hasAnyRole(
  user: AuthenticatedUser,
  allowedRoles: string[]
): boolean {
  return user.role !== undefined && allowedRoles.includes(user.role);
}
