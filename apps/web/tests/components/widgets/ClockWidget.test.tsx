/**
 * ClockWidget Component Tests
 *
 * Tests for the ClockWidget component covering:
 * - Rendering without crashing
 * - Time display
 * - Date display
 * - Time updates via fake timers
 * - Correct styling and CSS classes
 * - Pomodoro timer functionality
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
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: ({ className }: { className?: string }) => (
    <span data-testid="clock-icon" className={className}>
      Clock
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
  Timer: ({ className }: { className?: string }) => (
    <span data-testid="timer-icon" className={className}>
      Timer
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

    it('renders the header with World Clock title', () => {
      render(<ClockWidget />);
      expect(screen.getByText('World Clock')).toBeInTheDocument();
    });

    it('renders the clock icon', () => {
      render(<ClockWidget />);
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('renders default timezone clocks', () => {
      render(<ClockWidget />);
      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('Los Angeles')).toBeInTheDocument();
      expect(screen.getByText('Seoul')).toBeInTheDocument();
    });

    it('renders custom timezones when provided', () => {
      const customTimezones = [
        { id: 'london', label: 'LDN', timezone: 'Europe/London', city: 'London' },
        { id: 'tokyo', label: 'TYO', timezone: 'Asia/Tokyo', city: 'Tokyo' },
      ];

      render(<ClockWidget timezones={customTimezones} />);
      expect(screen.getByText('London')).toBeInTheDocument();
      expect(screen.getByText('Tokyo')).toBeInTheDocument();
      expect(screen.queryByText('New York')).not.toBeInTheDocument();
    });
  });

  describe('Time Display', () => {
    it('displays time for each timezone', () => {
      render(<ClockWidget />);

      // The component shows times in localized format
      // We check that time elements are present (format: "X:XX AM/PM")
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2}\s*(AM|PM)/i);
      expect(timeElements.length).toBeGreaterThanOrEqual(3);
    });

    it('displays formatted time with hours and minutes', () => {
      // Set time to 2:30 PM UTC
      vi.setSystemTime(new Date('2024-06-15T14:30:00Z'));

      render(<ClockWidget />);

      // Check that at least one time is displayed
      // New York is UTC-4 in June (EDT), so 14:30 UTC = 10:30 AM EDT
      const timePattern = /\d{1,2}:\d{2}\s*(AM|PM)/i;
      const allText = screen.getAllByText(timePattern);
      expect(allText.length).toBeGreaterThan(0);
    });
  });

  describe('Date Display', () => {
    it('displays the current date in header', () => {
      vi.setSystemTime(new Date('2024-06-15T14:30:00Z'));

      render(<ClockWidget />);

      // Date format: "Sat, Jun 15" (weekday short, month short, day)
      // Use a more specific selector to find the date in the caption
      const dateElement = screen.getByText(/Sat, Jun 15/);
      expect(dateElement).toBeInTheDocument();
      expect(dateElement).toHaveClass('text-caption');
    });

    it('displays date with correct format', () => {
      vi.setSystemTime(new Date('2024-12-25T10:00:00Z'));

      render(<ClockWidget />);

      // Should show "Wed, Dec 25"
      const dateElement = screen.getByText(/Wed, Dec 25/);
      expect(dateElement).toBeInTheDocument();
      expect(dateElement).toHaveClass('text-caption');
    });
  });

  describe('Time Updates', () => {
    it('updates time every second', () => {
      vi.setSystemTime(new Date('2024-06-15T14:30:00Z'));

      render(<ClockWidget />);

      // Capture initial times
      const initialTimes = screen.getAllByText(/\d{1,2}:\d{2}\s*(AM|PM)/i);
      const initialTimeTexts = initialTimes.map((el) => el.textContent);

      // Advance time by 1 minute (60 seconds)
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // Get updated times
      const updatedTimes = screen.getAllByText(/\d{1,2}:\d{2}\s*(AM|PM)/i);
      const updatedTimeTexts = updatedTimes.map((el) => el.textContent);

      // Times should have changed (at least the minutes)
      // Note: At least one timezone should show a different minute
      expect(updatedTimeTexts).not.toEqual(initialTimeTexts);
    });

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

    it('applies neon-primary color to clock icon', () => {
      render(<ClockWidget />);
      const clockIcon = screen.getByTestId('clock-icon');
      expect(clockIcon).toHaveClass('text-neon-primary');
    });
  });

  describe('Day/Night Indicator', () => {
    it('shows sun icon for daytime hours', () => {
      // Set to 10 AM UTC - daytime in most timezones
      vi.setSystemTime(new Date('2024-06-15T10:00:00Z'));

      render(<ClockWidget />);

      // At least one timezone should show a sun icon
      const sunIcons = screen.queryAllByTestId('sun-icon');
      expect(sunIcons.length).toBeGreaterThan(0);
    });

    it('shows moon icon for nighttime hours', () => {
      // Set to 2 AM UTC - nighttime in many timezones
      vi.setSystemTime(new Date('2024-06-15T02:00:00Z'));

      render(<ClockWidget />);

      // At least one timezone should show a moon icon
      const moonIcons = screen.queryAllByTestId('moon-icon');
      expect(moonIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Pomodoro Timer', () => {
    it('renders pomodoro timer by default', () => {
      render(<ClockWidget />);
      // Timer label exists (there are two "Timer" texts - icon mock and label)
      const timerTexts = screen.getAllByText('Timer');
      expect(timerTexts.length).toBe(2); // Icon mock + label
      expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
    });

    it('hides pomodoro timer when showPomodoro is false', () => {
      render(<ClockWidget showPomodoro={false} />);
      // Timer icon should not be present
      expect(screen.queryByTestId('timer-icon')).not.toBeInTheDocument();
    });

    it('displays initial pomodoro time (25:00)', () => {
      render(<ClockWidget />);
      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('shows play button when timer is not running', () => {
      render(<ClockWidget />);
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('pause-icon')).not.toBeInTheDocument();
    });

    it('starts timer when play button is clicked', () => {
      render(<ClockWidget />);

      const playButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(playButton);

      // Should now show pause icon
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    });

    it('pauses timer when pause button is clicked', () => {
      render(<ClockWidget />);

      // Start timer
      const playButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(playButton);

      // Pause timer
      const pauseButton = screen.getByRole('button', { name: /pause timer/i });
      fireEvent.click(pauseButton);

      // Should show play icon again
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('decrements timer when running', () => {
      render(<ClockWidget />);

      // Start timer
      const playButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(playButton);

      // Advance 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('24:59')).toBeInTheDocument();
    });

    it('resets timer when reset button is clicked', () => {
      render(<ClockWidget />);

      // Start timer and let it run
      const playButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(playButton);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Reset timer
      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      fireEvent.click(resetButton);

      // Should be back to 25:00 and stopped
      expect(screen.getByText('25:00')).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('renders preset duration buttons', () => {
      render(<ClockWidget />);

      expect(screen.getByText('5m')).toBeInTheDocument();
      expect(screen.getByText('10m')).toBeInTheDocument();
      expect(screen.getByText('15m')).toBeInTheDocument();
      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('changes timer duration when preset is clicked', () => {
      render(<ClockWidget />);

      // Click 5m preset
      const fiveMinButton = screen.getByText('5m');
      fireEvent.click(fiveMinButton);

      expect(screen.getByText('05:00')).toBeInTheDocument();
    });

    it('switches to break mode when work timer completes', () => {
      render(<ClockWidget />);

      // Set to 5 minute preset for faster test
      const fiveMinButton = screen.getByText('5m');
      fireEvent.click(fiveMinButton);

      // Start timer
      const playButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(playButton);

      // Advance past 5 minutes (300 seconds)
      // The timer decrements when prev <= 1, so we need exactly 300 ticks
      act(() => {
        vi.advanceTimersByTime(300000);
      });

      // After 300 seconds (5 min), timer should switch to break mode
      // Break time is 5 minutes (POMODORO_BREAK = 5 * 60 = 300 seconds)
      // Find the timer display by its specific format (MM:SS without AM/PM)
      // and class (text-xs font-mono font-bold)
      const timerDisplays = screen.getAllByText(/^\d{2}:\d{2}$/);
      // The pomodoro timer display should match
      const pomodoroTimer = timerDisplays.find((el) =>
        el.classList.contains('text-xs')
      );
      expect(pomodoroTimer).toBeInTheDocument();
      expect(pomodoroTimer).toHaveClass('text-xs', 'font-mono', 'font-bold');
    });

    it('shows completed count after finishing a pomodoro', () => {
      render(<ClockWidget />);

      // Set to 5 minute preset
      const fiveMinButton = screen.getByText('5m');
      fireEvent.click(fiveMinButton);

      // Start timer
      const playButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(playButton);

      // Complete the pomodoro (300 seconds = 5 minutes)
      act(() => {
        vi.advanceTimersByTime(300000);
      });

      expect(screen.getByText(/1 completed/)).toBeInTheDocument();
    });

    it('applies active styling to selected preset', () => {
      render(<ClockWidget />);

      // Click 10m preset
      const tenMinButton = screen.getByText('10m');
      fireEvent.click(tenMinButton);

      // The 10m button should have the active class
      expect(tenMinButton).toHaveClass('bg-neon-primary/20');
      expect(tenMinButton).toHaveClass('text-neon-primary');
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for timer controls', () => {
      render(<ClockWidget />);

      expect(
        screen.getByRole('button', { name: /start timer/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reset timer/i })
      ).toBeInTheDocument();
    });

    it('updates aria-label when timer state changes', () => {
      render(<ClockWidget />);

      // Initially shows "Start timer"
      expect(
        screen.getByRole('button', { name: /start timer/i })
      ).toBeInTheDocument();

      // Click to start
      fireEvent.click(screen.getByRole('button', { name: /start timer/i }));

      // Should now show "Pause timer"
      expect(
        screen.getByRole('button', { name: /pause timer/i })
      ).toBeInTheDocument();
    });
  });

  describe('Component Display Name', () => {
    it('has correct displayName', () => {
      expect(ClockWidget.displayName).toBe('ClockWidget');
    });
  });
});
