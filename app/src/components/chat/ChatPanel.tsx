import { useRef, useEffect, useState, useCallback } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import ChatMessage from './ChatMessage';
import SuggestedPrompts from './SuggestedPrompts';

export default function ChatPanel() {
  const isOpen = useChatStore((s) => s.isOpen);
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const error = useChatStore((s) => s.error);
  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const aiProvider = useSettingsStore((s) => s.aiProvider);

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 96) + 'px';
    }
  }, [input]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    sendMessage(trimmed);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const providerLabel = aiProvider === 'openrouter' ? 'OpenRouter' : aiProvider === 'lmstudio' ? 'LM Studio' : null;

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:bg-transparent md:pointer-events-none"
          onClick={toggleOpen}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] z-50 bg-bg border-l border-border
          flex flex-col transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              <line x1="10" y1="22" x2="14" y2="22" />
            </svg>
            <h3 className="text-sm font-semibold text-text-primary">AI Assistant</h3>
            {providerLabel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-dim">
                {providerLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear chat history?')) clearHistory();
                }}
                className="p-1.5 rounded hover:bg-surface-2 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
                title="Clear history"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
            <button
              onClick={toggleOpen}
              className="p-1.5 rounded hover:bg-surface-2 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
          {messages.length === 0 && !isLoading ? (
            <SuggestedPrompts onSelect={handleSuggestedPrompt} />
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
                <div className="flex justify-start mb-3">
                  <div className="bg-surface-2 rounded-lg px-4 py-3 border-l-2 border-accent/40">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-3 mb-2 px-3 py-2 rounded bg-threat-red/10 border border-threat-red/30 text-threat-red text-xs">
            {error}
          </div>
        )}

        {/* Provider not configured warning */}
        {aiProvider === 'none' && (
          <div className="mx-3 mb-2 px-3 py-2 rounded bg-surface-2 border border-border text-text-dim text-xs text-center">
            No AI provider configured.{' '}
            <a href="#/settings" onClick={toggleOpen} className="text-accent hover:underline">
              Set up in Settings
            </a>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border bg-surface px-3 py-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={aiProvider === 'none' ? 'Configure AI provider in settings...' : 'Ask about threats, gear, routes...'}
              disabled={aiProvider === 'none'}
              rows={1}
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary
                placeholder:text-text-dim/50 resize-none outline-none
                focus:border-accent/50 transition-colors disabled:opacity-50"
              style={{ maxHeight: '96px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || aiProvider === 'none'}
              className="shrink-0 w-9 h-9 rounded-lg bg-accent text-bg flex items-center justify-center
                hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-150 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
