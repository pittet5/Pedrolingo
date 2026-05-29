import React from 'react';

type MarkdownRendererProps = {
  text: string;
};

export default function MarkdownRenderer({ text }: MarkdownRendererProps) {
  if (!text) return null;

  // Simple, robust line-by-line Markdown parsing
  const lines = text.split('\n');

  return (
    <div className="space-y-3 text-sm leading-relaxed text-on-surface">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Header Check
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={idx} className="text-base font-bold text-primary mt-4 mb-2">
              {trimmed.replace(/^###\s*/, '')}
            </h4>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={idx} className="text-lg font-bold text-primary border-b border-outline-variant/30 pb-1 mt-5 mb-3">
              {trimmed.replace(/^##\s*/, '')}
            </h3>
          );
        }
        if (trimmed.startsWith('#')) {
          return (
            <h2 key={idx} className="text-xl font-extrabold text-primary border-b-2 border-primary/20 pb-2 mt-6 mb-4">
              {trimmed.replace(/^#\s*/, '')}
            </h2>
          );
        }

        // Ordered & Unordered Bullet Points
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const content = trimmed.replace(/^[\*\-]\s*/, '');
          // Bold inline highlights in item
          return (
            <ul key={idx} className="list-disc pl-5 my-1">
              <li className="text-on-surface">
                {renderBoldInline(content)}
              </li>
            </ul>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const content = trimmed.replace(/^\d+\.\s*/, '');
          const match = trimmed.match(/^(\d+)\./);
          const num = match ? match[1] : '1';
          return (
            <ol key={idx} className="list-decimal pl-5 my-1" start={parseInt(num)}>
              <li className="text-on-surface">
                {renderBoldInline(content)}
              </li>
            </ol>
          );
        }

        // Code block placeholders
        if (trimmed.startsWith('```')) {
          return null; // For simplicity we let code formatters ignore the tag lines, or we can handle it
        }

        // Dividers
        if (trimmed === '---') {
          return <hr key={idx} className="border-t border-outline-variant my-4" />;
        }

        // Empty line
        if (trimmed === '') {
          return <div key={idx} className="h-2" />;
        }

        // Normal paragraph with bold highlights
        return (
          <p key={idx} className="text-on-surface-variant font-body-md text-sm">
            {renderBoldInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Simple bold parsing: **text**
function renderBoldInline(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-extrabold text-primary">{part}</strong>;
    }
    // Also parse simple inline backticks `code`
    const codeParts = part.split(/`([^`]+)`/g);
    return codeParts.map((subpart, j) => {
      if (j % 2 === 1) {
        return (
          <code key={j} className="bg-surface-container-high text-primary font-mono text-[13px] px-1.5 py-0.5 rounded border border-outline-variant">
            {subpart}
          </code>
        );
      }
      return subpart;
    });
  });
}
