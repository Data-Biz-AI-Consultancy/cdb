import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SimpleNav from './SimpleNav';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/persons',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('SimpleNav Component', () => {
  it('renders all core navigation links', () => {
    render(<SimpleNav />);

    expect(screen.getByText('CDB')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Persons')).toBeInTheDocument();
    expect(screen.getByText('Companies')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Opportunities')).toBeInTheDocument();
    expect(screen.getByText('ER Review Queue')).toBeInTheDocument();
    expect(screen.getByText('Ingestion')).toBeInTheDocument();
  });

  it('highlights the active navigation link', () => {
    render(<SimpleNav />);
    const personsLink = screen.getByText('Persons');
    expect(personsLink.className).toContain('bg-slate-800');
  });
});
