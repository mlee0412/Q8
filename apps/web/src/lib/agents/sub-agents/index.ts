/**
 * Sub-Agents Barrel Export
 *
 * Re-exports all sub-agent configurations, tools, and initialization functions.
 */

// Coder Agent (Claude Sonnet 4.5)
export {
  githubTools,
  supabaseTools,
  coderAgentConfig,
  initializeCoderAgent,
  executeCoderTool,
} from './coder';

// Researcher Agent (Perplexity Sonar Pro)
export {
  researchTools,
  researcherAgentConfig,
  initializeResearcherAgent,
} from './researcher';

// Secretary Agent (Gemini 3.0 Pro)
export {
  googleWorkspaceTools,
  secretaryAgentConfig,
  initializeSecretaryAgent,
  executeGoogleTool,
} from './secretary';

// Personality Agent (Grok 4.1)
export {
  personalityTools,
  personalityAgentConfig,
  initializePersonalityAgent,
} from './personality';

// Home Agent (GPT-5.1)
export {
  homeAgentConfig,
  initializeHomeAgent,
} from './home';

// Finance Advisor Agent (Gemini 3.0 Pro)
export {
  financeAdvisorConfig,
  initializeFinanceAdvisorAgent,
  executeFinanceAdvisorTool,
  getFinancialContext,
  generateProactiveInsights,
} from './finance-advisor';
export type { FinancialInsight } from './finance-advisor';
