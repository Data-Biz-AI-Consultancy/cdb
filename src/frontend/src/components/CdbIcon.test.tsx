import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CdbIcon from './CdbIcon';

describe('CdbIcon Component', () => {
  it('renders SVG icon element', () => {
    const { container } = render(<CdbIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
  });

  it('applies custom className and size', () => {
    const { container } = render(<CdbIcon className="custom-test-class" size={48} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-test-class');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });
});
