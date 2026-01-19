/**
 * Dashboard Widgets Export Index
 *
 * Phase 1 - RxDB Integration
 * Phase 3 - Dashboard Widgets
 * Phase 4 - Enhanced Widgets
 * Phase 7 - FinanceHub
 */

// Phase 1 Widget
export { StatusWidget } from './StatusWidget';

// Phase 3 Widgets
export { GitHubPRWidget } from './GitHubPRWidget';
export { CalendarWidget } from './CalendarWidget';
export { WeatherWidget } from './WeatherWidget/index';
export { TaskWidget } from './TaskWidget/index';
export { SuggestionsWidget } from './SuggestionsWidget';

// Phase 6 - ContentHub (replaces SpotifyWidget)
export { ContentHubWidget } from './ContentHubWidget';

// Phase 4 Widgets
export { ClockWidget } from './ClockWidget';
export { QuickNotesWidget } from './QuickNotesWidget/index';
export { FocusWidget } from './FocusWidget/index';

// Phase 5 Widgets - Smart Home Integration
export { SmartHomeWidget } from './SmartHomeWidget/index';

// Phase 7 - FinanceHub
export { FinanceHubWidget } from './FinanceHubWidget';

// UI/UX Components
export { WidgetSkeleton } from './WidgetSkeleton';
export { WidgetWrapper } from './WidgetWrapper';
