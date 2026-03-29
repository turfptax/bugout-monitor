import { useState } from 'react';
import type { Message } from '../../store/useChatStore';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Minimal markdown rendering — handles bold, italic, code, code blocks, bullets */
function renderMarkdown(text: string): JSX.Element[] {
  const blocks = text.split(/```(\w*)\n?([\s\S]*?)```/g);
  const elements: JSX.Element[] = [];

  for (let i = 0; i < blocks.length; i++) {
    if (i % 3 === 1) {
      // language tag — skip
      continue;
    }
    if (i % 3 === 2) {
      // code block content
      elements.push(
        <pre key={i} className="bg-bg rounded px-3 py-2 my-2 text-xs overflow-x-auto font-mono text-text-primary">
          <code>{blocks[i]}</code>
        </pre>
      );
      continue;
    }

    // Regular text block
    const lines = blocks[i].split('\n');
    const lineElements: JSX.Element[] = [];

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];

      // Bullet list item
      if (/^\s*[-*]\s/.test(line)) {
        lineElements.push(
          <li key={`${i}-${j}`} className="ml-4 list-disc">
            <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.replace(/^\s*[-*]\s/, '')) }} />
          </li>
        );
        continue;
      }

      // Numbered list item
      if (/^\s*\d+\.\s/.test(line)) {
        lineElements.push(
          <li key={`${i}-${j}`} className="ml-4 list-decimal">
            <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.replace(/^\s*\d+\.\s/, '')) }} />
          </li>
        );
        continue;
      }

      // Heading (## or ###)
      const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const cls = level === 1 ? 'text-sm font-bold mt-3 mb-1' : level === 2 ? 'text-sm font-semibold mt-2 mb-1' : 'text-xs font-semibold mt-2 mb-0.5';
        lineElements.push(
          <div key={`${i}-${j}`} className={cls}>
            <span dangerouslySetInnerHTML={{ __html: inlineFormat(headingMatch[2]) }} />
          </div>
        );
        continue;
      }

      // Empty line
      if (!line.trim()) {
        lineElements.push(<div key={`${i}-${j}`} className="h-2" />);
        continue;
      }

      // Normal paragraph
      lineElements.push(
        <span key={`${i}-${j}`}>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
          {j < lines.length - 1 && <br />}
        </span>
      );
    }

    elements.push(<span key={i}>{lineElements}</span>);
  }

  return elements;
}

function inlineFormat(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="bg-bg px-1 py-0.5 rounded text-xs font-mono text-accent-2">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export default function ChatMessage({ message }: { message: Message }) {
  const [showTime, setShowTime] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      <div className={`relative max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
        <div
          className={`rounded-lg px-3 py-2 text-sm leading-relaxed
            ${isUser
              ? 'bg-accent text-bg rounded-br-sm'
              : 'bg-surface-2 text-text-primary border-l-2 border-accent/40 rounded-bl-sm'
            }`}
        >
          {isUser ? message.content : renderMarkdown(message.content)}
        </div>

        {/* Timestamp */}
        <div className={`text-[10px] text-text-dim mt-0.5 transition-opacity duration-150
          ${showTime ? 'opacity-100' : 'opacity-0'}
          ${isUser ? 'text-right' : 'text-left'}`}
        >
          {formatTime(message.timestamp)}
        </div>

        {/* Copy button for assistant messages */}
        {!isUser && message.content && (
          <button
            onClick={handleCopy}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity
              bg-surface border border-border rounded p-1 cursor-pointer hover:bg-surface-2"
            title="Copy message"
          >
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-threat-green">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
