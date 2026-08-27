import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    data: [],
    pagination: { total: 10 },
  }),
}));

describe('HomePage Dashboard Overview', () => {
  it('renders hero title, description, and primary CTA buttons', () => {
    render(<HomePage />);

    expect(screen.getByText('CDB')).toBeInTheDocument();
    expect(screen.getByText(/Client DataBase/i)).toBeInTheDocument();
    expect(screen.getByText('View Engagements')).toBeInTheDocument();
    expect(screen.getByText('View Persons')).toBeInTheDocument();
  });

  it('renders all three categorized visual sections with cards', () => {
    render(<HomePage />);

    // Section 1: Directory
    expect(screen.getByText('Directory')).toBeInTheDocument();
    expect(screen.getByText('Core Entities & Identity Graph')).toBeInTheDocument();
    expect(screen.getByText('Persons')).toBeInTheDocument();
    expect(screen.getByText('The very first class citizen in CDB')).toBeInTheDocument();
    expect(screen.getByText('Entity Resolution')).toBeInTheDocument();
    expect(screen.getByText('Companies')).toBeInTheDocument();

    // Section 2: Pipeline & Engagements
    expect(screen.getByText('Pipeline & Engagements')).toBeInTheDocument();
    expect(screen.getByText('CRM & Relationship Lifecycle')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Opportunities')).toBeInTheDocument();
    expect(screen.getByText('Engagements')).toBeInTheDocument();

    // Section 3: Settings
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Data Pipelines & Platform Health')).toBeInTheDocument();
    expect(screen.getByText('Ingestion')).toBeInTheDocument();
  });
});
