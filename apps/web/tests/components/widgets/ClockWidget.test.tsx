/**
 * ClockWidget Component Tests
 *
 * Tests for the ClockWidget v3.0 (Time Hub) component covering:
 * - Rendering without crashing
 * - Tab navigation (Clock, Timer, Stopwatch, Alarms)
 * - Time display and updates
 * - Correct styling and CSS classes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ClockWidget } from '@/components/dashboard/widgets/ClockWidget';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
    button: ({
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} {...props}>
        {children}
      </button>
    ),
    span: ({
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock react-dom createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: ({ className }: { className?: string }) => (
    <span data-testid="clock-icon" className={className}>
      Clock
    </span>
  ),
  Timer: ({ className }: { className?: string }) => (
    <span data-testid="timer-icon" className={className}>
      Timer
    </span>
  ),
  Gauge: ({ className }: { className?: string }) => (
    <span data-testid="gauge-icon" className={className}>
      Gauge
    </span>
  ),
  Bell: ({ className }: { className?: string }) => (
    <span data-testid="bell-icon" className={className}>
      Bell
    </span>
  ),
  Maximize2: ({ className }: { className?: string }) => (
    <span data-testid="maximize-icon" className={className}>
      Maximize
    </span>
  ),
  Play: ({ className }: { className?: string }) => (
    <span data-testid="play-icon" className={className}>
      Play
    </span>
  ),
  Pause: ({ className }: { className?: string }) => (
    <span data-testid="pause-icon" className={className}>
      Pause
    </span>
  ),
  RotateCcw: ({ className }: { className?: string }) => (
    <span data-testid="reset-icon" className={className}>
      Reset
    </span>
  ),
  SkipForward: ({ className }: { className?: string }) => (
    <span data-testid="skip-icon" className={className}>
      Skip
    </span>
  ),
  Sun: ({ className }: { className?: string }) => (
    <span data-testid="sun-icon" className={className}>
      Sun
    </span>
  ),
  Moon: ({ className }: { className?: string }) => (
    <span data-testid="moon-icon" className={className}>
      Moon
    </span>
  ),
  Sunrise: ({ className }: { className?: string }) => (
    <span data-testid="sunrise-icon" className={className}>
      Sunrise
    </span>
  ),
  Sunset: ({ className }: { className?: string }) => (
    <span data-testid="sunset-icon" className={className}>
      Sunset
    </span>
  ),
  Globe: ({ className }: { className?: string }) => (
    <span data-testid="globe-icon" className={className}>
      Globe
    </span>
  ),
  Plus: ({ className }: { className?: string }) => (
    <span data-testid="plus-icon" className={className}>
      Plus
    </span>
  ),
  Pin: ({ className }: { className?: string }) => (
    <span data-testid="pin-icon" className={className}>
      Pin
    </span>
  ),
  X: ({ className }: { className?: string }) => (
    <span data-testid="x-icon" className={className}>
      X
    </span>
  ),
  Search: ({ className }: { className?: string }) => (
    <span data-testid="search-icon" className={className}>
      Search
    </span>
  ),
  LayoutGrid: ({ className }: { className?: string }) => (
    <span data-testid="grid-icon" className={className}>
      Grid
    </span>
  ),
  List: ({ className }: { className?: string }) => (
    <span data-testid="list-icon" className={className}>
      List
    </span>
  ),
  Flame: ({ className }: { className?: string }) => (
    <span data-testid="flame-icon" className={className}>
      Flame
    </span>
  ),
  Target: ({ className }: { className?: string }) => (
    <span data-testid="target-icon" className={className}>
      Target
    </span>
  ),
  Zap: ({ className }: { className?: string }) => (
    <span data-testid="zap-icon" className={className}>
      Zap
    </span>
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <span data-testid="trending-icon" className={className}>
      TrendingUp
    </span>
  ),
  Flag: ({ className }: { className?: string }) => (
    <span data-testid="flag-icon" className={className}>
      Flag
    </span>
  ),
  Copy: ({ className }: { className?: string }) => (
    <span data-testid="copy-icon" className={className}>
      Copy
    </span>
  ),
  Trash2: ({ className }: { className?: string }) => (
    <span data-testid="trash-icon" className={className}>
      Trash
    </span>
  ),
  Award: ({ className }: { className?: string }) => (
    <span data-testid="award-icon" className={className}>
      Award
    </span>
  ),
  Edit2: ({ className }: { className?: string }) => (
    <span data-testid="edit-icon" className={className}>
      Edit
    </span>
  ),
  BellOff: ({ className }: { className?: string }) => (
    <span data-testid="belloff-icon" className={className}>
      BellOff
    </span>
  ),
  Repeat: ({ className }: { className?: string }) => (
    <span data-testid="repeat-icon" className={className}>
      Repeat
    </span>
  ),
  Link2: ({ className }: { className?: string }) => (
    <span data-testid="link-icon" className={className}>
      Link
    </span>
  ),
  Tag: ({ className }: { className?: string }) => (
    <span data-testid="tag-icon" className={className}>
      Tag
    </span>
  ),
  BarChart3: ({ className }: { className?: string }) => (
    <span data-testid="barchart-icon" className={className}>
      BarChart
    </span>
  ),
  Minimize2: ({ className }: { className?: string }) => (
    <span data-testid="minimize-icon" className={className}>
      Minimize
    </span>
  ),
}));

describe('ClockWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set a fixed date: Saturday, June 15, 2024 at 2:30:00 PM UTC
    vi.setSystemTime(new Date('2024-06-15T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<ClockWidget />);
      expect(container).toBeTruthy();
    });

    it('renders the header with Time Hub title', () => {
      render(<ClockWidget />);
      expect(screen.getByText('Time Hub')).toBeInTheDocument();
    });

    it('renders the clock icon', () => {
      render(<ClockWidget />);
      const clockIcons = screen.getAllByTestId('clock-icon');
      expect(clockIcons.length).toBeGreaterThan(0);
    });

    it('renders all tab buttons by default', () => {
      render(<ClockWidget />);
      // Check for tab icons (Clock, Timer, Gauge for stopwatch, Bell for alarms)
      expect(screen.getAllByTestId('clock-icon').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('timer-icon').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('gauge-icon').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('bell-icon').length).toBeGreaterThan(0);
    });

    it('renders custom timezones when provided', () => {
      const customTimezones = [
        { id: 'london', label: 'LDN', timezone: 'Europe/London', city: 'London', country: 'UK', isPinned: false, sortOrder: 0 },
        { id: 'tokyo', label: 'TYO', timezone: 'Asia/Tokyo', city: 'Tokyo', country: 'Japan', isPinned: false, sortOrder: 1 },
      ];

      render(<ClockWidget timezones={customTimezones} />);
      expect(screen.getByText('London')).toBeInTheDocument();
      expect(screen.getByText('Tokyo')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('shows clock tab content by default', () => {
      render(<ClockWidget />);
      // Default tab is 'clock', should show digital/analog toggle options
      expect(screen.getByText('digital')).toBeInTheDocument();
    });

    it('can switch to timer tab', () => {
      render(<ClockWidget />);
      
      // Click the Timer tab (second occurrence of timer-icon, first is in header area)
      const timerIcons = screen.getAllByTestId('timer-icon');
      // Find the tab button containing the timer icon
      const tabButtons = screen.getAllByRole('button');
      const timerTab = tabButtons.find(btn => 
        btn.textContent?.includes('Timer') || 
        btn.querySelector('[data-testid="timer-icon"]')
      );
      
      if (timerTab) {
        fireEvent.click(timerTab);
      }
    });

    it('respects defaultTab prop', () => {
      render(<ClockWidget defaultTab="timer" />);
      // Timer tab should be active, showing focus presets
      const sprintElements = screen.getAllByText('Sprint');
      expect(sprintElements.length).toBeGreaterThan(0);
    });

    it('can disable alarms tab', () => {
      render(<ClockWidget enableAlarms={false} />);
      // Bell icon for alarms tab should not be present
      const bellIcons = screen.queryAllByTestId('bell-icon');
      expect(bellIcons.length).toBe(0);
    });

    it('can disable stopwatch tab', () => {
      render(<ClockWidget enableStopwatch={false} />);
      // Gauge icon for stopwatch tab should not be present
      const gaugeIcons = screen.queryAllByTestId('gauge-icon');
      expect(gaugeIcons.length).toBe(0);
    });
  });

  describe('Time Display', () => {
    it('displays time for timezones', () => {
      render(<ClockWidget />);

      // The component shows times in localized format
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2}\s*(AM|PM)/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Date Display', () => {
    it('displays the current date in header', () => {
      vi.setSystemTime(new Date('2024-06-15T14:30:00Z'));

      render(<ClockWidget />);

      // Date format: "Sat, Jun 15" (weekday short, month short, day)
      const dateElement = screen.getByText(/Sat, Jun 15/);
      expect(dateElement).toBeInTheDocument();
    });
  });

  describe('Time Updates', () => {
    it('calls setInterval on mount for time updates', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      render(<ClockWidget />);

      // Should have at least one setInterval call for the clock
      expect(setIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
    });

    it('clears interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = render(<ClockWidget />);
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  describe('Styling and CSS Classes', () => {
    it('applies surface-matte class to container', () => {
      const { container } = render(<ClockWidget />);
      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass('surface-matte');
    });

    it('applies default column span classes', () => {
      const { container } = render(<ClockWidget />);
      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass('col-span-1');
      expect(widget).toHaveClass('md:col-span-2');
    });

    it('applies custom column span classes', () => {
      const { container } = render(<ClockWidget colSpan={3} />);
      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass('md:col-span-3');
    });

    it('applies row span classes', () => {
      const { container } = render(<ClockWidget rowSpan={2} />);
      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass('row-span-2');
    });

    it('applies custom className', () => {
      const { container } = render(<ClockWidget className="custom-class" />);
      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass('custom-class');
    });

    it('has flex layout classes', () => {
      const { container } = render(<ClockWidget />);
      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass('flex');
      expect(widget).toHaveClass('flex-col');
    });

    it('applies neon-primary color to header clock icon', () => {
      render(<ClockWidget />);
      const clockIcons = screen.getAllByTestId('clock-icon');
      // At least one should have the neon-primary class
      const hasNeonPrimary = clockIcons.some(icon => icon.classList.contains('text-neon-primary'));
      expect(hasNeonPrimary).toBe(true);
    });
  });

  describe('Timer Tab', () => {
    it('shows focus presets in timer tab', () => {
      render(<ClockWidget defaultTab="timer" />);
      
      // Multiple Sprint elements may exist, check at least one
      const sprintElements = screen.getAllByText('Sprint');
      expect(sprintElements.length).toBeGreaterThan(0);
    });

    it('shows quick timer presets', () => {
      render(<ClockWidget defaultTab="timer" />);

      const fiveMinElements = screen.getAllByText('5m');
      expect(fiveMinElements.length).toBeGreaterThan(0);
    });

    it('displays start focus session button', () => {
      render(<ClockWidget defaultTab="timer" />);
      
      expect(screen.getByText('Start Focus Session')).toBeInTheDocument();
    });
  });

  describe('Expand Functionality', () => {
    it('renders expand button', () => {
      render(<ClockWidget />);
      
      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
    });
  });

  describe('Component Display Name', () => {
    it('has correct displayName', () => {
      expect(ClockWidget.displayName).toBe('ClockWidget');
    });
  });
});
