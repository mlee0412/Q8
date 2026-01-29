/**
 * Calendar List API
 *
 * GET /api/calendar/list - Fetch user's Google Calendar list from all linked accounts
 * POST /api/calendar/list - Subscribe to a calendar by ID (adds to user's calendar list)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { getAllGoogleTokens, getGoogleAccounts } from '@/lib/auth/google-accounts';
import { logger } from '@/lib/logger';
import type { GoogleCalendar, CalendarListResponse } from '@/components/dashboard/widgets/CalendarWidget/types';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

interface GoogleCalendarListItem {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  accessRole: string;
  timeZone?: string;
  selected?: boolean;
}

interface LinkedGoogleAccount {
  id: string;
  email: string;
  label: string | null;
}

/**
 * GET /api/calendar/list
 *
 * Fetches calendar list from ALL linked Google accounts.
 * Returns calendars with account attribution.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    // Get all linked Google accounts
    const accounts = await getGoogleAccounts(user.id);

    if (accounts.length === 0) {
      return NextResponse.json(
        {
          error: 'No Google accounts linked. Please add a Google account to use Calendar.',
          authenticated: false,
          noAccounts: true,
        },
        { status: 401 }
      );
    }

    // Get tokens for all accounts
    const tokens = await getAllGoogleTokens(user.id);

    if (tokens.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to get tokens for linked accounts.',
          authenticated: false,
        },
        { status: 401 }
      );
    }

    // Create account lookup map
    const accountMap = new Map<string, LinkedGoogleAccount>();
    for (const account of accounts) {
      accountMap.set(account.id, {
        id: account.id,
        email: account.email,
        label: account.label,
      });
    }

    // Fetch calendars from each account
    const allCalendars: GoogleCalendar[] = [];
    const accountStatuses: { email: string; success: boolean; error?: string }[] = [];

    for (const token of tokens) {
      const account = accountMap.get(token.accountId);
      if (!account || !token.accessToken) {
        continue;
      }

      try {
        // Fetch ALL calendars including "Other Calendars" (subscribed calendars)
        // showHidden=true ensures subscribed calendars appear
        // No minAccessRole filter to get everything
        const response = await fetch(
          `${CALENDAR_API_BASE}/users/me/calendarList?` +
            new URLSearchParams({
              showHidden: 'true',
              showDeleted: 'false',
              maxResults: '250',  // Get all calendars
            }),
          {
            headers: { Authorization: `Bearer ${token.accessToken}` },
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          logger.warn('[Calendar] Failed to fetch calendars for account', {
            email: account.email,
            status: response.status,
            error: errorText,
          });

          accountStatuses.push({
            email: account.email,
            success: false,
            error:
              response.status === 403
                ? 'Insufficient permissions - please re-link this account'
                : `API error: ${response.status}`,
          });
          continue;
        }

        const data = await response.json();

        // Transform and add account info to each calendar
        const calendars: GoogleCalendar[] = (data.items || []).map(
          (item: GoogleCalendarListItem) => ({
            id: item.id,
            summary: item.summary,
            description: item.description,
            backgroundColor: item.backgroundColor || '#039be5',
            foregroundColor: item.foregroundColor || '#ffffff',
            primary: item.primary || false,
            accessRole: item.accessRole as GoogleCalendar['accessRole'],
            timeZone: item.timeZone,
            selected: item.selected,
            // Multi-account attribution
            googleAccountId: token.accountId,
            googleAccountEmail: account.email,
            googleAccountLabel: account.label,
          })
        );

        allCalendars.push(...calendars);
        accountStatuses.push({ email: account.email, success: true });

        logger.info('[Calendar] Fetched calendars for account', {
          email: account.email,
          count: calendars.length,
          calendarNames: calendars.map(c => c.summary),
        });
      } catch (err) {
        logger.error('[Calendar] Error fetching calendars for account', {
          email: account.email,
          error: err,
        });
        accountStatuses.push({
          email: account.email,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Deduplicate calendars across accounts.
    // Same calendar ID can appear from multiple linked accounts.
    // Keep the one with higher access (owner > writer > reader) or the first found.
    const accessRank: Record<string, number> = {
      owner: 4,
      writer: 3,
      reader: 2,
      freeBusyReader: 1,
    };
    const calendarMap = new Map<string, GoogleCalendar>();
    for (const cal of allCalendars) {
      const existing = calendarMap.get(cal.id);
      if (!existing) {
        calendarMap.set(cal.id, cal);
      } else {
        // Keep the one with higher access role, or primary
        const existingRank = accessRank[existing.accessRole] ?? 0;
        const newRank = accessRank[cal.accessRole] ?? 0;
        if (newRank > existingRank || (cal.primary && !existing.primary)) {
          calendarMap.set(cal.id, cal);
        }
      }
    }
    const dedupedCalendars = Array.from(calendarMap.values());

    // Sort calendars: primary first, then by account, then alphabetically
    dedupedCalendars.sort((a, b) => {
      // Primary calendars first
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;

      // Then group by account
      if (a.googleAccountEmail !== b.googleAccountEmail) {
        return (a.googleAccountEmail || '').localeCompare(b.googleAccountEmail || '');
      }

      // Then alphabetically by name
      return a.summary.localeCompare(b.summary);
    });

    // Check if we got any calendars
    if (dedupedCalendars.length === 0 && accountStatuses.every((s) => !s.success)) {
      return NextResponse.json(
        {
          error: 'Failed to fetch calendars from all linked accounts. Please check account permissions.',
          authenticated: false,
          accountStatuses,
        },
        { status: 403 }
      );
    }

    const result: CalendarListResponse & { accountStatuses?: typeof accountStatuses } = {
      calendars: dedupedCalendars,
    };

    // Include account statuses if any had errors
    if (accountStatuses.some((s) => !s.success)) {
      result.accountStatuses = accountStatuses;
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[Calendar] Error fetching calendar list', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/list
 *
 * Subscribe to a calendar by ID (adds it to the user's calendar list).
 * This is needed for calendars that aren't automatically shown (like shared group calendars).
 *
 * Body:
 * - calendarId: string - The Google Calendar ID to subscribe to
 * - accountId: string - The linked Google account ID to use
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { calendarId, accountId } = body;

    if (!calendarId) {
      return NextResponse.json({ error: 'calendarId is required' }, { status: 400 });
    }

    // Get all tokens and find the right one
    const tokens = await getAllGoogleTokens(user.id);
    const accounts = await getGoogleAccounts(user.id);

    // If accountId specified, use that; otherwise try all accounts
    const tokensToTry = accountId
      ? tokens.filter((t) => t.accountId === accountId)
      : tokens;

    if (tokensToTry.length === 0) {
      return NextResponse.json(
        { error: 'No valid account found' },
        { status: 400 }
      );
    }

    // Create account lookup
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Try to subscribe with each account until one succeeds
    for (const token of tokensToTry) {
      if (!token.accessToken) continue;

      const account = accountMap.get(token.accountId);

      try {
        // Use calendarList.insert to subscribe to the calendar
        const response = await fetch(
          `${CALENDAR_API_BASE}/users/me/calendarList`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: calendarId }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          logger.info('[Calendar] Successfully subscribed to calendar', {
            calendarId,
            calendarName: data.summary,
            account: account?.email,
          });

          return NextResponse.json({
            success: true,
            calendar: {
              id: data.id,
              summary: data.summary,
              description: data.description,
              backgroundColor: data.backgroundColor || '#039be5',
              foregroundColor: data.foregroundColor || '#ffffff',
              accessRole: data.accessRole,
              googleAccountId: token.accountId,
              googleAccountEmail: account?.email,
            },
          });
        }

        // Log the error but continue trying other accounts
        const errorText = await response.text();
        logger.warn('[Calendar] Failed to subscribe with account', {
          account: account?.email,
          status: response.status,
          error: errorText,
        });

        // If it's a 404, the calendar doesn't exist or user doesn't have access
        if (response.status === 404) {
          continue; // Try next account
        }

        // If it's a 409, calendar is already subscribed
        if (response.status === 409) {
          return NextResponse.json({
            success: true,
            message: 'Calendar is already in your list',
            alreadySubscribed: true,
          });
        }
      } catch (err) {
        logger.error('[Calendar] Error subscribing to calendar', {
          account: account?.email,
          error: err,
        });
      }
    }

    // None of the accounts could subscribe
    return NextResponse.json(
      {
        error: 'Could not subscribe to calendar. Make sure you have access to it.',
        hint: 'The calendar owner may need to share it with one of your linked Google accounts.',
      },
      { status: 404 }
    );
  } catch (error) {
    logger.error('[Calendar] Error in calendar subscribe', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
