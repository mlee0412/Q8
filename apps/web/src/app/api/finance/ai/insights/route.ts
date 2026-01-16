import { NextRequest, NextResponse } from 'next/server';
import {
  generateProactiveInsights,
  getFinancialContext,
  type FinancialInsight,
} from '@/lib/agents/sub-agents/finance-advisor';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';

/**
 * GET /api/finance/ai/insights
 * Generate proactive financial insights for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    // Generate proactive insights
    const insights = await generateProactiveInsights(userId);

    // Sort by severity (urgent first, then warning, then info)
    const severityOrder: Record<FinancialInsight['severity'], number> = {
      urgent: 0,
      warning: 1,
      info: 2,
    };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      insights,
      count: insights.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Finance insights error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/ai/insights
 * Generate insights with additional context or refresh for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const body = await request.json();
    const { includeContext = false } = body;

    // Generate proactive insights
    const insights = await generateProactiveInsights(userId);

    // Optionally include full financial context
    let context: string | undefined;
    if (includeContext) {
      context = await getFinancialContext(userId);
    }

    // Sort by severity
    const severityOrder: Record<FinancialInsight['severity'], number> = {
      urgent: 0,
      warning: 1,
      info: 2,
    };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      insights,
      count: insights.length,
      context,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Finance insights POST error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
