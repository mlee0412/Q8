/**
 * Evaluation Harness
 * Framework for testing routing accuracy, memory precision, and tool appropriateness
 * Provides regression testing for AI improvements
 */

import { route, heuristicRoute } from '../orchestration/router';
import { searchMemoriesHybrid } from '@/lib/memory/memory-v2';
import type { ExtendedAgentType } from '../orchestration/types';

/**
 * Eval prompt with expected outcome
 */
export interface EvalPrompt {
  id: string;
  category: EvalCategory;
  subcategory?: string;
  prompt: string;
  expectedAgent: ExtendedAgentType;
  expectedTools?: string[];
  shouldNotUseTools?: boolean;
  notes?: string;
}

/**
 * Eval categories as defined in the plan
 */
export type EvalCategory =
  | 'routing_accuracy'
  | 'memory_precision'
  | 'tool_appropriateness';

/**
 * Single eval result
 */
export interface EvalResult {
  promptId: string;
  category: EvalCategory;
  passed: boolean;
  expectedAgent: ExtendedAgentType;
  actualAgent: ExtendedAgentType;
  confidence: number;
  routingSource: 'llm' | 'heuristic' | 'fallback' | 'vector';
  latencyMs: number;
  toolsPlanned?: string[];
  errors?: string[];
  notes?: string;
}

/**
 * Eval suite summary
 */
export interface EvalSummary {
  totalPrompts: number;
  passed: number;
  failed: number;
  passRate: number;
  avgConfidence: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  byCategory: Record<EvalCategory, {
    total: number;
    passed: number;
    passRate: number;
  }>;
  byAgent: Record<ExtendedAgentType, {
    expected: number;
    actuallyRouted: number;
    precision: number;
    recall: number;
  }>;
  timestamp: Date;
}

/**
 * Eval harness configuration
 */
export interface EvalConfig {
  /** Use LLM router (true) or heuristic only (false) */
  useLLMRouter: boolean;
  /** Timeout per prompt in ms */
  promptTimeout: number;
  /** Run prompts in parallel */
  parallel: boolean;
  /** Max concurrent prompts if parallel */
  concurrency: number;
  /** User ID to use for memory tests */
  testUserId: string;
}

const DEFAULT_CONFIG: EvalConfig = {
  useLLMRouter: true,
  promptTimeout: 5000,
  parallel: true,
  concurrency: 5,
  testUserId: 'eval-test-user',
};

/**
 * Run a single eval prompt
 */
async function runSingleEval(
  prompt: EvalPrompt,
  config: EvalConfig
): Promise<EvalResult> {
  const startTime = Date.now();

  try {
    const decision = config.useLLMRouter
      ? await route(prompt.prompt, { timeout: config.promptTimeout })
      : heuristicRoute(prompt.prompt);

    const latencyMs = Date.now() - startTime;

    const passed = decision.agent === prompt.expectedAgent;

    // Check tool plan if specified
    let toolMatch = true;
    if (prompt.expectedTools) {
      const plannedTools = decision.toolPlan || [];
      const hasExpectedTools = prompt.expectedTools.every((t) =>
        plannedTools.includes(t)
      );
      toolMatch = hasExpectedTools;
    }

    if (prompt.shouldNotUseTools && decision.toolPlan && decision.toolPlan.length > 0) {
      toolMatch = false;
    }

    return {
      promptId: prompt.id,
      category: prompt.category,
      passed: passed && toolMatch,
      expectedAgent: prompt.expectedAgent,
      actualAgent: decision.agent,
      confidence: decision.confidence,
      routingSource: decision.source,
      latencyMs,
      toolsPlanned: decision.toolPlan,
      notes: passed
        ? undefined
        : `Expected ${prompt.expectedAgent}, got ${decision.agent}`,
    };
  } catch (error) {
    return {
      promptId: prompt.id,
      category: prompt.category,
      passed: false,
      expectedAgent: prompt.expectedAgent,
      actualAgent: 'personality',
      confidence: 0,
      routingSource: 'fallback',
      latencyMs: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Run the full eval suite
 */
export async function runEvalSuite(
  prompts: EvalPrompt[],
  config: Partial<EvalConfig> = {}
): Promise<{ results: EvalResult[]; summary: EvalSummary }> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const results: EvalResult[] = [];

  if (fullConfig.parallel) {
    // Run in batches
    for (let i = 0; i < prompts.length; i += fullConfig.concurrency) {
      const batch = prompts.slice(i, i + fullConfig.concurrency);
      const batchResults = await Promise.all(
        batch.map((p) => runSingleEval(p, fullConfig))
      );
      results.push(...batchResults);
    }
  } else {
    // Run sequentially
    for (const prompt of prompts) {
      results.push(await runSingleEval(prompt, fullConfig));
    }
  }

  // Calculate summary
  const summary = calculateSummary(results, prompts);

  return { results, summary };
}

/**
 * Calculate eval summary statistics
 */
function calculateSummary(results: EvalResult[], prompts: EvalPrompt[]): EvalSummary {
  const passed = results.filter((r) => r.passed).length;
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);

  // By category
  const categories: EvalCategory[] = ['routing_accuracy', 'memory_precision', 'tool_appropriateness'];
  const byCategory: EvalSummary['byCategory'] = {} as EvalSummary['byCategory'];

  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    byCategory[cat] = {
      total: catResults.length,
      passed: catResults.filter((r) => r.passed).length,
      passRate: catResults.length > 0
        ? catResults.filter((r) => r.passed).length / catResults.length
        : 0,
    };
  }

  // By agent (precision/recall)
  const agents: ExtendedAgentType[] = ['coder', 'researcher', 'secretary', 'home', 'finance', 'personality'];
  const byAgent: EvalSummary['byAgent'] = {} as EvalSummary['byAgent'];

  for (const agent of agents) {
    const expectedForAgent = prompts.filter((p) => p.expectedAgent === agent).length;
    const routedToAgent = results.filter((r) => r.actualAgent === agent).length;
    const correctlyRouted = results.filter(
      (r) => r.expectedAgent === agent && r.actualAgent === agent
    ).length;

    byAgent[agent] = {
      expected: expectedForAgent,
      actuallyRouted: routedToAgent,
      precision: routedToAgent > 0 ? correctlyRouted / routedToAgent : 0,
      recall: expectedForAgent > 0 ? correctlyRouted / expectedForAgent : 0,
    };
  }

  return {
    totalPrompts: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length > 0 ? passed / results.length : 0,
    avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
    avgLatencyMs: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
    p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] || 0,
    byCategory,
    byAgent,
    timestamp: new Date(),
  };
}

/**
 * Memory precision eval - tests memory retrieval accuracy
 */
export async function runMemoryPrecisionEval(
  userId: string,
  queries: Array<{ query: string; expectedKeywords: string[] }>
): Promise<{ precision: number; results: Array<{ query: string; hit: boolean }> }> {
  const results: Array<{ query: string; hit: boolean }> = [];

  for (const { query, expectedKeywords } of queries) {
    const memories = await searchMemoriesHybrid(userId, query, { limit: 5 });

    const hit = memories.some((m) =>
      expectedKeywords.some((kw) =>
        m.memory.content.toLowerCase().includes(kw.toLowerCase())
      )
    );

    results.push({ query, hit });
  }

  const precision = results.filter((r) => r.hit).length / results.length;

  return { precision, results };
}

/**
 * Format eval summary for display
 */
export function formatEvalSummary(summary: EvalSummary): string {
  const lines: string[] = [
    '# Eval Results',
    '',
    `Total: ${summary.totalPrompts} | Passed: ${summary.passed} | Failed: ${summary.failed}`,
    `Pass Rate: ${(summary.passRate * 100).toFixed(1)}%`,
    `Avg Confidence: ${(summary.avgConfidence * 100).toFixed(1)}%`,
    `Latency: avg ${summary.avgLatencyMs.toFixed(0)}ms, p95 ${summary.p95LatencyMs.toFixed(0)}ms`,
    '',
    '## By Category',
  ];

  for (const [cat, stats] of Object.entries(summary.byCategory)) {
    lines.push(`- ${cat}: ${stats.passed}/${stats.total} (${(stats.passRate * 100).toFixed(1)}%)`);
  }

  lines.push('', '## By Agent');

  for (const [agent, stats] of Object.entries(summary.byAgent)) {
    if (stats.expected > 0 || stats.actuallyRouted > 0) {
      lines.push(
        `- ${agent}: precision ${(stats.precision * 100).toFixed(0)}%, recall ${(stats.recall * 100).toFixed(0)}%`
      );
    }
  }

  return lines.join('\n');
}
