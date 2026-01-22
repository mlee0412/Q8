'use client';

/**
 * @deprecated FocusWidget has been consolidated into ClockWidget.
 * Use ClockWidget with defaultTab="timer" instead.
 *
 * This file re-exports ClockWidget for backwards compatibility.
 */

import { ClockWidget } from '../ClockWidget';
import type { ClockWidgetProps } from '../ClockWidget/types';

export interface FocusWidgetProps {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * @deprecated Use ClockWidget with defaultTab="timer" instead.
 * FocusWidget functionality has been consolidated into ClockWidget's Timer tab.
 */
export function FocusWidget({
  colSpan = 2,
  rowSpan = 1,
  className,
}: FocusWidgetProps) {
  console.warn(
    '[FocusWidget] Deprecated: Use ClockWidget with defaultTab="timer" instead. ' +
    'FocusWidget will be removed in a future version.'
  );

  return (
    <ClockWidget
      defaultTab="timer"
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={className}
      enableAlarms={false}
      enableStopwatch={false}
    />
  );
}

FocusWidget.displayName = 'FocusWidget';

export default FocusWidget;
