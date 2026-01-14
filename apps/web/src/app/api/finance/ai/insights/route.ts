import { NextRequest, NextResponse } from 'next/server';
import {
  generateProactiveInsights,
  getFinancialContext,
  type FinancialInsight,
} from '@/lib/agents/sub-agents/finance-advisor';

/**
 * GET /api/finance/ai/insights
 * Generate proactive financial insights for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

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
 * Generate insights with additional context or refresh
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, includeContext = false } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

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
