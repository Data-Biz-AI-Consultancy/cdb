import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuccessToast } from './SuccessToast';

describe('SuccessToast Component', () => {
  it('renders message and triggers onDismiss callback', () => {
    const onDismiss = vi.fn();
    render(<SuccessToast message="Person saved successfully!" onDismiss={onDismiss} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Person saved successfully!')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when message is null or undefined', () => {
    const { container } = render(<SuccessToast message={null} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
