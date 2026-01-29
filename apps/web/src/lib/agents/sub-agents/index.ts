/**
 * Sub-Agents Barrel Export
 *
 * Re-exports all sub-agent configurations, tools, and initialization functions.
 */

// Coder Agent (Claude Opus 4.5)
export {
  githubTools,
  supabaseTools,
  coderAgentConfig,
  initializeCoderAgent,
  executeCoderTool,
} from './coder';

// Researcher Agent (Perplexity Sonar Reasoning Pro)
export {
  researchTools,
  researcherAgentConfig,
  initializeResearcherAgent,
} from './researcher';

// Secretary Agent (Gemini 3 Flash)
export {
  googleWorkspaceTools,
  secretaryAgentConfig,
  initializeSecretaryAgent,
  executeGoogleTool,
} from './secretary';

// Personality Agent (Grok 4.1 via xAI)
export {
  personalityTools,
  personalityAgentConfig,
  initializePersonalityAgent,
} from './personality';

// Home Agent (GPT-5-mini)
export {
  homeAgentConfig,
  initializeHomeAgent,
} from './home';

// Finance Advisor Agent (Gemini 3 Flash)
export {
  financeAdvisorConfig,
  initializeFinanceAdvisorAgent,
  executeFinanceAdvisorTool,
  getFinancialContext,
  generateProactiveInsights,
} from './finance-advisor';
export type { FinancialInsight } from './finance-advisor';
