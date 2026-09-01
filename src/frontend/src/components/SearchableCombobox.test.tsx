import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchableCombobox from './SearchableCombobox';

describe('SearchableCombobox Component', () => {
  const sampleOptions = [
    { id: '1', label: 'Acme Corp', subtext: 'acme.com' },
    { id: '2', label: 'Taxfix', subtext: 'taxfix.com' },
    { id: '3', label: 'Google', subtext: 'google.com' },
  ];

  it('renders with placeholder and opens dropdown on click', () => {
    const handleChange = vi.fn();
    render(
      <SearchableCombobox
        value=""
        onChange={handleChange}
        options={sampleOptions}
        placeholder="Select Company..."
      />
    );

    expect(screen.getByText('Select Company...')).toBeInTheDocument();

    // Click trigger to open
    fireEvent.click(screen.getByText('Select Company...'));
    expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument();
    expect(screen.getByText('Taxfix')).toBeInTheDocument();
  });

  it('selects option on click and calls onChange', () => {
    const handleChange = vi.fn();
    render(
      <SearchableCombobox
        value=""
        onChange={handleChange}
        options={sampleOptions}
        placeholder="Select Company..."
      />
    );

    fireEvent.click(screen.getByText('Select Company...'));
    fireEvent.click(screen.getByText('Taxfix'));

    expect(handleChange).toHaveBeenCalledWith('2', expect.objectContaining({ id: '2', label: 'Taxfix' }));
  });

  it('filters options locally when typing query', () => {
    render(
      <SearchableCombobox
        value=""
        onChange={vi.fn()}
        options={sampleOptions}
        placeholder="Select Company..."
      />
    );

    fireEvent.click(screen.getByText('Select Company...'));
    const input = screen.getByPlaceholderText('Type to search...');
    fireEvent.change(input, { target: { value: 'Taxfix' } });

    expect(screen.getByText('Taxfix')).toBeInTheDocument();
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
    expect(screen.queryByText('Google')).not.toBeInTheDocument();
  });

  it('calls remote onSearch for async query matching', async () => {
    const handleRemoteSearch = vi.fn().mockResolvedValue([
      { id: '2', label: 'Taxfix', subtext: 'taxfix.com' },
    ]);

    render(
      <SearchableCombobox
        value=""
        onChange={vi.fn()}
        options={[]}
        onSearch={handleRemoteSearch}
        placeholder="Search..."
      />
    );

    fireEvent.click(screen.getByText('Search...'));
    const input = screen.getByPlaceholderText('Type to search...');
    fireEvent.change(input, { target: { value: 'taxfix' } });

    await waitFor(() => {
      expect(handleRemoteSearch).toHaveBeenCalledWith('taxfix');
    });

    await waitFor(() => {
      expect(screen.getByText('Taxfix')).toBeInTheDocument();
    });
  });

  it('clears selection when clear button is clicked', () => {
    const handleChange = vi.fn();
    render(
      <SearchableCombobox
        value="2"
        onChange={handleChange}
        options={sampleOptions}
      />
    );

    expect(screen.getByText('Taxfix')).toBeInTheDocument();
    const clearBtn = screen.getByRole('button', { name: /clear selection/i });
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith('', null);
  });
});
