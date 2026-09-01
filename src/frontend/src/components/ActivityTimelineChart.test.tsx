import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ActivityTimelineChart, { ActivityTimelineBucket } from './ActivityTimelineChart';

const mockTimelineData: ActivityTimelineBucket[] = [
  {
    date: '2026-08-30',
    total: 8,
    by_type: {
      meeting: 2,
      linkedin_message: 4,
      call: 2,
    },
  },
  {
    date: '2026-08-31',
    total: 12,
    by_type: {
      meeting: 5,
      linkedin_message: 5,
      note: 2,
    },
  },
  {
    date: '2026-09-01',
    total: 6,
    by_type: {
      meeting: 3,
      email: 1,
      whatsapp: 2,
    },
  },
];

describe('ActivityTimelineChart', () => {
  it('renders collapsed state by default with active date count', () => {
    render(<ActivityTimelineChart timeline={mockTimelineData} totalActivities={26} />);

    expect(screen.getByText('Activity Velocity & Time Evolution')).toBeInTheDocument();
    expect(screen.getByText('3 active dates')).toBeInTheDocument();
    expect(screen.getByText('Show Chart ▼')).toBeInTheDocument();

    // Chart controls should not be visible when collapsed
    expect(screen.queryByTestId('chart-type-bar')).not.toBeInTheDocument();
  });

  it('expands when clicking the header and renders SVG chart with legend', () => {
    render(<ActivityTimelineChart timeline={mockTimelineData} totalActivities={26} />);

    fireEvent.click(screen.getByTestId('timeline-chart-toggle'));

    expect(screen.getByText('Hide Chart ▲')).toBeInTheDocument();
    expect(screen.getByTestId('chart-type-bar')).toBeInTheDocument();
    expect(screen.getByTestId('chart-type-area')).toBeInTheDocument();

    // Legend should be rendered
    expect(screen.getByText(/Meeting/)).toBeInTheDocument();
    expect(screen.getByText(/LinkedIn/)).toBeInTheDocument();
    expect(screen.getByText(/Email/)).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp/)).toBeInTheDocument();
  });

  it('toggles between stacked bar and area chart modes', () => {
    render(<ActivityTimelineChart timeline={mockTimelineData} defaultExpanded={true} />);

    expect(screen.getByTestId('chart-type-bar')).toBeInTheDocument();

    // Switch to Area Chart
    fireEvent.click(screen.getByTestId('chart-type-area'));
    expect(screen.getByTestId('chart-type-area')).toHaveClass('text-indigo-700');

    // Switch to Stacked Bar Chart
    fireEvent.click(screen.getByTestId('chart-type-bar'));
    expect(screen.getByTestId('chart-type-bar')).toHaveClass('text-indigo-700');
  });

  it('handles empty timeline gracefully', () => {
    render(<ActivityTimelineChart timeline={[]} defaultExpanded={true} />);

    expect(screen.getByText('0 active dates')).toBeInTheDocument();
    expect(screen.getByText('No activity timestamp data available in this range')).toBeInTheDocument();
  });
});
