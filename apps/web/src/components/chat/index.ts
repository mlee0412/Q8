/**
 * Chat Interface Components Export Index
 *
 * Phase 4 - Multi-Agent Chat Interface
 * Phase 5 - Streaming & Tool Visibility
 * Phase 6 - Thread Management & Persistence
 */

// Core chat components
export { ChatMessage } from './ChatMessage';
export { ChatInput } from './ChatInput';
export { ChatHistory } from './ChatHistory';

// Streaming components (Phase 5)
export { StreamingMessage } from './StreamingMessage';
export { StreamingChatPanel } from './StreamingChatPanel';
export { ToolExecutionChip, ToolExecutionList } from './ToolExecutionChip';
export { AgentHandoff, AgentBadge } from './AgentHandoff';

// Thread management components (Phase 6)
export { ThreadSidebar } from './ThreadSidebar';
export { ThreadHeader } from './ThreadHeader';
export { ChatWithThreads } from './ChatWithThreads';

// Unified conversation (Phase 7 - Voice/Text Consolidation)
export { UnifiedConversation } from './UnifiedConversation';
export type { UnifiedConversationRef } from './UnifiedConversation';
export { UnifiedChatWithThreads } from './UnifiedChatWithThreads';
export type { UnifiedChatWithThreadsRef } from './UnifiedChatWithThreads';

// Supporting components
export { AgentIndicator } from './AgentIndicator';
export { MessageActions } from './MessageActions';

// Agent markers and visibility (AI Enhancement)
export { AgentMarker, AgentSegmentDivider, CompactAgentBadge } from './AgentMarker';

// Citations for research responses (AI Enhancement)
export { InlineCitation, CitationList, parseCitations, type CitationSource } from './Citation';

// Preset suggestions and agent cards (Smart Presets)
export { PresetSuggestions, PresetSuggestionsCompact } from './PresetSuggestions';
export { AgentCard, AgentCardMini, AGENT_INFO, type AgentInfo } from './AgentCard';
export { AgentCarousel, AgentList } from './AgentCarousel';
export { ChatEmptyState } from './ChatEmptyState';
export type { ChatInputRef } from './ChatInput';
