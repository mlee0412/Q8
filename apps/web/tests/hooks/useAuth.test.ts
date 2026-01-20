/**
 * useAuth Hook Tests
 *
 * Tests for the useAuth hook which wraps useSession
 * with additional derived values for easier consumption
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Use vi.hoisted to properly hoist the mock function
const { mockUseSession } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
}));

// Mock the SessionManager module
vi.mock('@/components/auth/SessionManager', () => ({
  useSession: mockUseSession,
}));

// Import hook after mocking
import { useAuth } from '@/hooks/useAuth';

// Mock user data factory
function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      role: 'admin',
      full_name: 'John Doe',
      avatar_url: 'https://example.com/avatar.png',
      is_pro: true,
    },
    ...overrides,
  };
}

// Default mock session return value
function createMockSessionReturn(overrides: Record<string, unknown> = {}) {
  return {
    user: createMockUser(),
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    ...overrides,
  };
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock implementation
    mockUseSession.mockReturnValue(createMockSessionReturn());
  });

  describe('passthrough properties from useSession', () => {
    it('returns user from useSession', () => {
      const mockUser = createMockUser();
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBe(mockUser);
    });

    it('returns isLoading from useSession', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ isLoading: true }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading as false when not loading', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ isLoading: false }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
    });

    it('returns isAuthenticated from useSession', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ isAuthenticated: true }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('returns isAuthenticated as false when not authenticated', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ isAuthenticated: false }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('returns signOut function from useSession', () => {
      const mockSignOut = vi.fn();
      mockUseSession.mockReturnValue(createMockSessionReturn({ signOut: mockSignOut }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.signOut).toBe(mockSignOut);
    });

    it('returns refreshSession function from useSession', () => {
      const mockRefreshSession = vi.fn();
      mockUseSession.mockReturnValue(createMockSessionReturn({ refreshSession: mockRefreshSession }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.refreshSession).toBe(mockRefreshSession);
    });
  });

  describe('derived userId property', () => {
    it('derives userId from user.id', () => {
      const mockUser = createMockUser({ id: 'custom-user-id-456' });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.userId).toBe('custom-user-id-456');
    });

    it('returns undefined userId when user is null', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: null }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.userId).toBeUndefined();
    });
  });

  describe('derived userEmail property', () => {
    it('derives userEmail from user.email', () => {
      const mockUser = createMockUser({ email: 'custom@email.com' });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.userEmail).toBe('custom@email.com');
    });

    it('returns undefined userEmail when user is null', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: null }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.userEmail).toBeUndefined();
    });
  });

  describe('derived userRole property', () => {
    it('derives userRole from user_metadata.role', () => {
      const mockUser = createMockUser({
        user_metadata: {
          role: 'superadmin',
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.png',
          is_pro: true,
        },
      });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.userRole).toBe('superadmin');
    });

    it('returns undefined userRole when user is null', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: null }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.userRole).toBeUndefined();
    });

    it('returns undefined userRole when user_metadata is missing', () => {
      const mockUser = createMockUser({ user_metadata: undefined });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.userRole).toBeUndefined();
    });

    it('returns undefined userRole when role is not in user_metadata', () => {
      const mockUser = createMockUser({
        user_metadata: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.png',
          is_pro: true,
        },
      });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.userRole).toBeUndefined();
    });
  });

  describe('derived fullName property', () => {
    it('derives fullName from user_metadata.full_name', () => {
      const mockUser = createMockUser({
        user_metadata: {
          role: 'user',
          full_name: 'Jane Smith',
          avatar_url: 'https://example.com/avatar.png',
          is_pro: false,
        },
      });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.fullName).toBe('Jane Smith');
    });

    it('returns undefined fullName when user is null', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: null }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.fullName).toBeUndefined();
    });

    it('returns undefined fullName when user_metadata is missing', () => {
      const mockUser = createMockUser({ user_metadata: undefined });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.fullName).toBeUndefined();
    });

    it('returns undefined fullName when full_name is not in user_metadata', () => {
      const mockUser = createMockUser({
        user_metadata: {
          role: 'user',
          avatar_url: 'https://example.com/avatar.png',
          is_pro: false,
        },
      });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.fullName).toBeUndefined();
    });
  });

  describe('derived avatarUrl property', () => {
    it('derives avatarUrl from user_metadata.avatar_url', () => {
      const mockUser = createMockUser({
        user_metadata: {
          role: 'user',
          full_name: 'Test User',
          avatar_url: 'https://cdn.example.com/profile.jpg',
          is_pro: false,
        },
      });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.avatarUrl).toBe('https://cdn.example.com/profile.jpg');
    });

    it('returns undefined avatarUrl when user is null', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: null }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.avatarUrl).toBeUndefined();
    });

    it('returns undefined avatarUrl when user_metadata is missing', () => {
      const mockUser = createMockUser({ user_metadata: undefined });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.avatarUrl).toBeUndefined();
    });

    it('returns undefined avatarUrl when avatar_url is not in user_metadata', () => {
      const mockUser = createMockUser({
        user_metadata: {
          role: 'user',
          full_name: 'Test User',
          is_pro: false,
        },
      });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.avatarUrl).toBeUndefined();
    });
  });

  describe('derived isPro property', () => {
    it('derives isPro from user_metadata.is_pro when true', () => {
      const mockUser = createMockUser({
        user_metadata: {
          role: 'user',
          full_name: 'Pro User',
          avatar_url: 'https://example.com/avatar.png',
          is_pro: true,
        },
      });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isPro).toBe(true);
    });

    it('derives isPro from user_metadata.is_pro when false', () => {
      const mockUser = createMockUser({
        user_metadata: {
          role: 'user',
          full_name: 'Free User',
          avatar_url: 'https://example.com/avatar.png',
          is_pro: false,
        },
      });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isPro).toBe(false);
    });

    it('returns undefined isPro when user is null', () => {
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: null }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isPro).toBeUndefined();
    });

    it('returns undefined isPro when user_metadata is missing', () => {
      const mockUser = createMockUser({ user_metadata: undefined });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isPro).toBeUndefined();
    });

    it('returns undefined isPro when is_pro is not in user_metadata', () => {
      const mockUser = createMockUser({
        user_metadata: {
          role: 'user',
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.png',
        },
      });
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isPro).toBeUndefined();
    });
  });

  describe('null user handling', () => {
    it('handles null user gracefully with all derived properties undefined', () => {
      mockUseSession.mockReturnValue(
        createMockSessionReturn({
          user: null,
          isAuthenticated: false,
        })
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.userId).toBeUndefined();
      expect(result.current.userEmail).toBeUndefined();
      expect(result.current.userRole).toBeUndefined();
      expect(result.current.fullName).toBeUndefined();
      expect(result.current.avatarUrl).toBeUndefined();
      expect(result.current.isPro).toBeUndefined();
    });
  });

  describe('missing user_metadata handling', () => {
    it('handles missing user_metadata gracefully', () => {
      const mockUser = {
        id: 'user-no-metadata',
        email: 'no-metadata@example.com',
        user_metadata: undefined,
      };
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      // Direct properties should still work
      expect(result.current.userId).toBe('user-no-metadata');
      expect(result.current.userEmail).toBe('no-metadata@example.com');

      // Metadata-derived properties should be undefined
      expect(result.current.userRole).toBeUndefined();
      expect(result.current.fullName).toBeUndefined();
      expect(result.current.avatarUrl).toBeUndefined();
      expect(result.current.isPro).toBeUndefined();
    });

    it('handles empty user_metadata object gracefully', () => {
      const mockUser = {
        id: 'user-empty-metadata',
        email: 'empty-metadata@example.com',
        user_metadata: {},
      };
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      // Direct properties should still work
      expect(result.current.userId).toBe('user-empty-metadata');
      expect(result.current.userEmail).toBe('empty-metadata@example.com');

      // Metadata-derived properties should be undefined
      expect(result.current.userRole).toBeUndefined();
      expect(result.current.fullName).toBeUndefined();
      expect(result.current.avatarUrl).toBeUndefined();
      expect(result.current.isPro).toBeUndefined();
    });

    it('handles partial user_metadata gracefully', () => {
      const mockUser = {
        id: 'user-partial-metadata',
        email: 'partial@example.com',
        user_metadata: {
          role: 'editor',
          // Missing: full_name, avatar_url, is_pro
        },
      };
      mockUseSession.mockReturnValue(createMockSessionReturn({ user: mockUser }));

      const { result } = renderHook(() => useAuth());

      expect(result.current.userId).toBe('user-partial-metadata');
      expect(result.current.userEmail).toBe('partial@example.com');
      expect(result.current.userRole).toBe('editor');
      expect(result.current.fullName).toBeUndefined();
      expect(result.current.avatarUrl).toBeUndefined();
      expect(result.current.isPro).toBeUndefined();
    });
  });

  describe('function invocation', () => {
    it('signOut function can be called', async () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      mockUseSession.mockReturnValue(createMockSessionReturn({ signOut: mockSignOut }));

      const { result } = renderHook(() => useAuth());

      await result.current.signOut();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('refreshSession function can be called', async () => {
      const mockRefreshSession = vi.fn().mockResolvedValue(undefined);
      mockUseSession.mockReturnValue(createMockSessionReturn({ refreshSession: mockRefreshSession }));

      const { result } = renderHook(() => useAuth());

      await result.current.refreshSession();

      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('complete return value structure', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useAuth());

      // Check all properties exist
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('signOut');
      expect(result.current).toHaveProperty('refreshSession');
      expect(result.current).toHaveProperty('userId');
      expect(result.current).toHaveProperty('userEmail');
      expect(result.current).toHaveProperty('userRole');
      expect(result.current).toHaveProperty('fullName');
      expect(result.current).toHaveProperty('avatarUrl');
      expect(result.current).toHaveProperty('isPro');
    });

    it('returns correct types for all properties with authenticated user', () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.user).toBe('object');
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.isAuthenticated).toBe('boolean');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.refreshSession).toBe('function');
      expect(typeof result.current.userId).toBe('string');
      expect(typeof result.current.userEmail).toBe('string');
      expect(typeof result.current.userRole).toBe('string');
      expect(typeof result.current.fullName).toBe('string');
      expect(typeof result.current.avatarUrl).toBe('string');
      expect(typeof result.current.isPro).toBe('boolean');
    });
  });
});
