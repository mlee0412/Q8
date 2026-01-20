'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
import { logger } from '@/lib/logger';
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

/**
 * User profile component with avatar and dropdown menu
 *
 * Features:
 * - Three display variants (avatar, compact, full)
 * - Dropdown menu with settings and logout
 * - Theme toggle integration
 * - Pro badge for premium users
 *
 * @example
 * ```tsx
 * // Avatar only (mobile navbar)
 * <UserProfile variant="avatar" />
 *
 * // Compact with name (desktop navbar)
 * <UserProfile variant="compact" />
 *
 * // Full with email (sidebar)
 * <UserProfile variant="full" />
 * ```
 */
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
      router.push('/login');
    } catch (error) {
      logger.error('Logout failed', { error });
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
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return (
      <div className="h-10 w-10 rounded-full surface-matte animate-pulse" />
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
          'flex items-center gap-3 rounded-full surface-matte hover:bg-surface-3 transition-colors',
          variant === 'avatar' && 'p-1',
          variant === 'compact' && 'py-2 px-3',
          variant === 'full' && 'py-2 px-4',
          className
        )}
        aria-label={`User profile menu for ${displayName}`}
        aria-expanded={showMenu && isOpen}
      >
        {/* Avatar */}
        <div className="relative h-8 w-8 rounded-full overflow-hidden bg-neon-primary/20 flex items-center justify-center">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-neon-primary">
              {initials}
            </span>
          )}

          {/* Pro badge (if applicable) */}
          {user.user_metadata?.is_pro && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-neon-accent rounded-full flex items-center justify-center">
              <Crown className="h-3 w-3 text-white" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Name & Email */}
        {variant !== 'avatar' && (
          <div className="text-left">
            <p className="text-sm font-medium">{displayName}</p>
            {variant === 'full' && (
              <p className="text-xs text-text-muted">{user.email}</p>
            )}
          </div>
        )}

        {/* Dropdown Indicator */}
        {showMenu && variant !== 'avatar' && (
          <ChevronDown
            className={cn(
              'h-4 w-4 text-text-muted transition-transform',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
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
            className="absolute right-0 mt-2 w-64 surface-matte rounded-xl shadow-lg overflow-hidden z-50"
            role="menu"
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-border-subtle">
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-text-muted">{user.email}</p>
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
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface-3 transition-colors"
                  role="menuitem"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">Settings</span>
                </button>
              )}

              {/* Theme Toggle */}
              {showThemeToggle && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface-3 transition-colors"
                  role="menuitem"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="text-sm">
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </span>
                </button>
              )}

              {/* Divider */}
              <div className="my-2 border-t border-border-subtle" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-red-500 transition-colors"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
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
          aria-label="Close menu"
        />
      )}
    </div>
  );
}

UserProfile.displayName = 'UserProfile';
