import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, LoadingRows } from './Spinner';

describe('Spinner Component', () => {
  it('renders spinner with accessible role and label', () => {
    render(<Spinner size="lg" label="Processing request..." />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Processing request...');
  });

  it('renders LoadingRows table row with custom message', () => {
    render(
      <table>
        <tbody>
          <LoadingRows colSpan={5} message="Loading records..." />
        </tbody>
      </table>
    );
    expect(screen.getByText('Loading records...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
