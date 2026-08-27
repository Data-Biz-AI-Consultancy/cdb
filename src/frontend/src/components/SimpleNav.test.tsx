import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SimpleNav from './SimpleNav';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/persons',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('SimpleNav Component', () => {
  it('renders top navigation brand and group triggers', () => {
    render(<SimpleNav />);

    expect(screen.getByText('CDB')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Directory')).toBeInTheDocument();
    expect(screen.getByText('Pipeline & Engagements')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights the active group when on a child route', () => {
    render(<SimpleNav />);
    const directoryBtn = screen.getByText('Directory').closest('button');
    expect(directoryBtn?.className).toContain('bg-slate-800');
  });

  it('opens group dropdown menu on click and reveals grouped items', () => {
    render(<SimpleNav />);
    
    // Open Directory dropdown
    const directoryBtn = screen.getByText('Directory');
    fireEvent.click(directoryBtn);

    expect(screen.getByText('Persons')).toBeInTheDocument();
    expect(screen.getByText('Entity Resolution')).toBeInTheDocument();
    expect(screen.getByText('Companies')).toBeInTheDocument();

    // Open Pipeline & Engagements dropdown
    const pipelineBtn = screen.getByText('Pipeline & Engagements');
    fireEvent.click(pipelineBtn);

    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Opportunities')).toBeInTheDocument();
    expect(screen.getByText('Engagements')).toBeInTheDocument();

    // Open Settings dropdown
    const settingsBtn = screen.getByText('Settings');
    fireEvent.click(settingsBtn);

    expect(screen.getByText('Ingestion')).toBeInTheDocument();
  });

  it('renders the release version badge', () => {
    render(<SimpleNav />);
    expect(screen.getAllByText(/^v\d+\.\d+\.\d+/).length).toBeGreaterThan(0);
  });
});
