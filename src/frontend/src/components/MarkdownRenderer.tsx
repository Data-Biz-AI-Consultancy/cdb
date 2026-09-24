import React from 'react';

interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
}

// Function to render inline formatting
export function renderInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Regex matching inline elements:
  // 1. Links: [text](url)
  // 2. Bold: **text** or __text__
  // 3. Inline code: `text`
  // 4. Italic: *text* or _text_
  const tokens: React.ReactNode[] = [];
  const regex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*|__([^_]+)__)|(`([^`]+)`)|(\*([^*]+)\*|_([^_]+)_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      tokens.push(text.slice(lastIndex, matchIndex));
    }

    if (match[1]) {
      // Link [text](url)
      const linkText = match[2];
      const linkUrl = match[3];
      tokens.push(
        <a
          key={`link-${matchIndex}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline decoration-blue-400 font-medium"
        >
          {linkText}
        </a>
      );
    } else if (match[4]) {
      // Bold **text** or __text__
      const boldText = match[5] || match[6];
      tokens.push(
        <strong key={`bold-${matchIndex}`} className="font-bold text-slate-900">
          {boldText}
        </strong>
      );
    } else if (match[7]) {
      // Inline code `text`
      const codeText = match[8];
      tokens.push(
        <code
          key={`code-${matchIndex}`}
          className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200"
        >
          {codeText}
        </code>
      );
    } else if (match[9]) {
      // Italic *text* or _text_
      const italicText = match[10] || match[11];
      tokens.push(
        <em key={`italic-${matchIndex}`} className="italic text-slate-700">
          {italicText}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content by lines and group into blocks
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];

  let currentListItems: string[] = [];
  let isNumberedList = false;

  const flushList = (keyPrefix: number) => {
    if (currentListItems.length === 0) return;
    if (isNumberedList) {
      blocks.push(
        <ol key={`ol-${keyPrefix}`} className="list-decimal list-inside space-y-1 my-2 text-slate-700 text-sm">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
    } else {
      blocks.push(
        <ul key={`ul-${keyPrefix}`} className="list-disc list-inside space-y-1 my-2 text-slate-700 text-sm">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
    }
    currentListItems = [];
    isNumberedList = false;
  };

  let blockKey = 0;
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList(blockKey++);
      continue;
    }

    // Unordered list item (- item, * item, • item)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (isNumberedList) {
        flushList(blockKey++);
      }
      currentListItems.push(bulletMatch[1]);
      continue;
    }

    // Numbered list item (1. item, 2. item)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      if (!isNumberedList && currentListItems.length > 0) {
        flushList(blockKey++);
      }
      isNumberedList = true;
      currentListItems.push(numberedMatch[2]);
      continue;
    }

    // If we were accumulating a list and hit a non-list line, flush it
    flushList(blockKey++);

    // Headings (#, ##, ###)
    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h4 key={`h3-${blockKey++}`} className="text-sm font-bold text-slate-900 mt-3 mb-1">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h3 key={`h2-${blockKey++}`} className="text-base font-bold text-slate-900 mt-4 mb-1.5">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push(
        <h2 key={`h1-${blockKey++}`} className="text-lg font-bold text-slate-900 mt-4 mb-2">
          {renderInlineMarkdown(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquote (> quote)
    if (trimmed.startsWith('> ')) {
      blocks.push(
        <blockquote
          key={`quote-${blockKey++}`}
          className="border-l-4 border-indigo-400 pl-3 py-1 my-2 bg-indigo-50/40 text-slate-700 italic text-sm rounded-r"
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Standard paragraph
    blocks.push(
      <p key={`p-${blockKey++}`} className="leading-relaxed text-slate-700 text-sm my-1.5">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  }

  flushList(blockKey++);

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
}

export default MarkdownRenderer;
