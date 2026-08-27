import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EngagementsPage from './page';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'opp-1',
        title: 'Cloud Migration & Data Architecture',
        stage: 'closed_won',
        value: 50000,
        currency: 'USD',
        companies: [{ name: 'Alpha Enterprises' }],
      },
    ],
  }),
}));

describe('EngagementsPage', () => {
  it('renders client engagements title, metrics and default state', () => {
    render(<EngagementsPage />);

    expect(screen.getByText('Client Engagements')).toBeInTheDocument();
    expect(screen.getByText('Pipeline & Engagements')).toBeInTheDocument();
    expect(screen.getByText(/New Engagement/i)).toBeInTheDocument();
    expect(screen.getByText('Active Engagements')).toBeInTheDocument();
    expect(screen.getByText('Active Value')).toBeInTheDocument();
  });
});
