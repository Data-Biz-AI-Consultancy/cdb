import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TablePagination } from './TablePagination';

describe('TablePagination Component', () => {
  it('renders count summary and pagination controls properly', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <TablePagination
        page={2}
        totalPages={5}
        total={45}
        pageSize={10}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        entityLabel="contact"
      />
    );

    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Showing 11 to 20 of 45 contacts');
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();

    // Click Previous
    fireEvent.click(screen.getByTestId('pagination-prev'));
    expect(onPageChange).toHaveBeenCalledWith(1);

    // Click Next
    fireEvent.click(screen.getByTestId('pagination-next'));
    expect(onPageChange).toHaveBeenCalledWith(3);

    // Click First
    fireEvent.click(screen.getByLabelText('First page'));
    expect(onPageChange).toHaveBeenCalledWith(1);

    // Click Last
    fireEvent.click(screen.getByLabelText('Last page'));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it('handles page size selector changes', () => {
    const onPageSizeChange = vi.fn();

    render(
      <TablePagination
        page={1}
        totalPages={1}
        total={10}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const select = screen.getByLabelText('Items per page');
    fireEvent.change(select, { target: { value: '25' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('renders empty state when total is 0', () => {
    render(
      <TablePagination
        page={1}
        totalPages={0}
        total={0}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        entityLabel="company"
      />
    );

    expect(screen.getByTestId('pagination-info')).toHaveTextContent('No companies found');
    expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    expect(screen.getByTestId('pagination-next')).toBeDisabled();
  });
});
