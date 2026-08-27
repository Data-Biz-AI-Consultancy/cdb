import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from './page';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    data: [],
  }),
}));

describe('SettingsPage', () => {
  it('renders settings sections and controls', () => {
    render(<SettingsPage />);

    expect(screen.getByText('System & Platform Settings')).toBeInTheDocument();
    expect(screen.getByText('System Health & Services')).toBeInTheDocument();
    expect(screen.getByText('Entity Resolution & AI Deduplication')).toBeInTheDocument();
    expect(screen.getByText('Data Pipelines & Ingestion')).toBeInTheDocument();
    expect(screen.getByText('Save Preferences')).toBeInTheDocument();
  });
});
