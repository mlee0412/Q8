import { NextRequest, NextResponse } from 'next/server';

/**
 * GitHub API Integration
 * Uses GitHub REST API for PRs, issues, and notifications
 */

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

interface GitHubPR {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
  };
  base: {
    ref: string;
    repo: {
      full_name: string;
    };
  };
  draft: boolean;
  mergeable_state?: string;
}

interface GitHubCheckRun {
  id: number;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
}

/**
 * GET /api/github - Get user's PRs and notifications
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'prs';
  const repo = searchParams.get('repo');
  const state = searchParams.get('state') || 'open';

  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json(getMockData(type), { status: 200 });
    }

    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (type === 'prs') {
      // Get PRs for specific repo or user's PRs
      let prs: GitHubPR[];

      if (repo) {
        const response = await fetch(
          `${GITHUB_API_BASE}/repos/${repo}/pulls?state=${state}&per_page=10`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        prs = await response.json();
      } else {
        // Get user's PRs across all repos
        const response = await fetch(
          `${GITHUB_API_BASE}/search/issues?q=is:pr+author:@me+is:${state}&per_page=10&sort=updated`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        prs = data.items || [];
      }

      // Get check statuses for each PR
      const prsWithChecks = await Promise.all(
        prs.map(async (pr) => {
          let checksStatus: 'pending' | 'success' | 'failure' = 'pending';

          try {
            const checksResponse = await fetch(
              `${GITHUB_API_BASE}/repos/${pr.base.repo.full_name}/commits/${pr.head.ref}/check-runs`,
              { headers }
            );

            if (checksResponse.ok) {
              const checksData = await checksResponse.json();
              const checkRuns: GitHubCheckRun[] = checksData.check_runs || [];

              if (checkRuns.length > 0) {
                const hasFailure = checkRuns.some((c) => c.conclusion === 'failure');
                const allSuccess = checkRuns.every(
                  (c) => c.status === 'completed' && c.conclusion === 'success'
                );

                if (hasFailure) checksStatus = 'failure';
                else if (allSuccess) checksStatus = 'success';
              }
            }
          } catch (e) {
            // Ignore check status errors
          }

          return {
            id: pr.id.toString(),
            number: pr.number,
            title: pr.title,
            author: pr.user.login,
            avatarUrl: pr.user.avatar_url,
            status: pr.merged_at ? 'merged' : pr.state,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            repository: pr.base.repo.full_name,
            url: pr.html_url,
            checksStatus,
            isDraft: pr.draft,
            baseBranch: pr.base.ref,
            headBranch: pr.head.ref,
          };
        })
      );

      return NextResponse.json({
        prs: prsWithChecks,
        total: prsWithChecks.length,
      });
    }

    if (type === 'notifications') {
      const response = await fetch(
        `${GITHUB_API_BASE}/notifications?per_page=10`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const notifications = await response.json();

      return NextResponse.json({
        notifications: notifications.map((n: any) => ({
          id: n.id,
          title: n.subject.title,
          type: n.subject.type,
          reason: n.reason,
          repository: n.repository.full_name,
          url: n.subject.url,
          updatedAt: n.updated_at,
          unread: n.unread,
        })),
        total: notifications.length,
      });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(getMockData(type), { status: 200 });
  }
}

/**
 * POST /api/github - Perform actions (merge, approve, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GitHub not configured', mock: true },
        { status: 200 }
      );
    }

    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    switch (action) {
      case 'approve': {
        const { repo, prNumber } = params;
        const response = await fetch(
          `${GITHUB_API_BASE}/repos/${repo}/pulls/${prNumber}/reviews`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'APPROVE' }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to approve PR: ${response.status}`);
        }

        return NextResponse.json({ success: true, action: 'approved' });
      }

      case 'merge': {
        const { repo, prNumber, mergeMethod = 'squash' } = params;
        const response = await fetch(
          `${GITHUB_API_BASE}/repos/${repo}/pulls/${prNumber}/merge`,
          {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ merge_method: mergeMethod }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to merge PR: ${response.status}`);
        }

        return NextResponse.json({ success: true, action: 'merged' });
      }

      case 'mark_read': {
        const { threadId } = params;
        await fetch(`${GITHUB_API_BASE}/notifications/threads/${threadId}`, {
          method: 'PATCH',
          headers,
        });

        return NextResponse.json({ success: true, action: 'marked_read' });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('GitHub action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}

/**
 * Mock data for development without GitHub token
 */
function getMockData(type: string) {
  if (type === 'prs') {
    return {
      prs: [
        {
          id: 'mock-1',
          number: 42,
          title: 'feat: Add dashboard widgets',
          author: 'developer',
          avatarUrl: 'https://github.com/identicons/developer.png',
          status: 'open',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          repository: 'user/q8',
          url: 'https://github.com/user/q8/pull/42',
          checksStatus: 'success',
          isDraft: false,
          baseBranch: 'main',
          headBranch: 'feature/widgets',
        },
        {
          id: 'mock-2',
          number: 41,
          title: 'fix: Weather API caching',
          author: 'developer',
          avatarUrl: 'https://github.com/identicons/developer.png',
          status: 'open',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          repository: 'user/q8',
          url: 'https://github.com/user/q8/pull/41',
          checksStatus: 'pending',
          isDraft: false,
          baseBranch: 'main',
          headBranch: 'fix/weather-cache',
        },
      ],
      total: 2,
      isMock: true,
    };
  }

  return {
    notifications: [],
    total: 0,
    isMock: true,
  };
}
