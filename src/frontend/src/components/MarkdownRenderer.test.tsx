import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer, renderInlineMarkdown } from './MarkdownRenderer';

describe('MarkdownRenderer Component', () => {
  it('renders bold and italic text properly', () => {
    const text = '99x is currently assessed under a **DORMANT** commercial posture with an overall relationship health score of **80/100**.';
    render(<MarkdownRenderer content={text} />);

    const dormantElement = screen.getByText('DORMANT');
    expect(dormantElement.tagName).toBe('STRONG');

    const scoreElement = screen.getByText('80/100');
    expect(scoreElement.tagName).toBe('STRONG');
  });

  it('renders inline code and markdown links properly', () => {
    const text = 'Use `apiFetch` or visit [Acme Docs](https://docs.acme.com) for details.';
    render(<MarkdownRenderer content={text} />);

    const codeEl = screen.getByText('apiFetch');
    expect(codeEl.tagName).toBe('CODE');

    const linkEl = screen.getByRole('link', { name: 'Acme Docs' });
    expect(linkEl).toHaveAttribute('href', 'https://docs.acme.com');
  });

  it('renders bullet lists and numbered lists', () => {
    const markdown = `- First item with **bold**\n- Second item\n\n1. Numbered one\n2. Numbered two`;
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText('First item with')).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
    expect(screen.getByText('Numbered one')).toBeInTheDocument();
    expect(screen.getByText('Numbered two')).toBeInTheDocument();
  });

  it('renders blockquotes and headers', () => {
    const markdown = `# Title\n## Subtitle\n### Section\n> Important quote note`;
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText('Title').tagName).toBe('H2');
    expect(screen.getByText('Subtitle').tagName).toBe('H3');
    expect(screen.getByText('Section').tagName).toBe('H4');
    expect(screen.getByText('Important quote note')).toBeInTheDocument();
  });

  it('renders empty content gracefully', () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container.firstChild).toBeNull();
  });
});
