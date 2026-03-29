import { uuid } from '../../lib/uuid';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useChatStore, type Message } from '../../store/useChatStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import ChatMessage from './ChatMessage';
import SuggestedPrompts from './SuggestedPrompts';

interface SavedConversation {
  id: string;
  title: string;
  messages: Message[];
  savedAt: string;
}

function loadSavedConversations(): SavedConversation[] {
  try {
    return JSON.parse(localStorage.getItem('bugout-conversations') || '[]');
  } catch {
    return [];
  }
}

function saveConversations(convos: SavedConversation[]) {
  localStorage.setItem('bugout-conversations', JSON.stringify(convos));
}

export default function ChatTab() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const error = useChatStore((s) => s.error);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const aiProvider = useSettingsStore((s) => s.aiProvider);

  const [input, setInput] = useState('');
  const [savedConvos, setSavedConvos] = useState<SavedConversation[]>(loadSavedConversations);
  const [showSaved, setShowSaved] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
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

  // Save current conversation
  const handleSave = () => {
    if (messages.length === 0) return;
    const firstUserMsg = messages.find(m => m.role === 'user');
    const defaultTitle = firstUserMsg
      ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
      : 'Untitled conversation';
    setSaveTitle(saveTitle || defaultTitle);
    setShowSaveDialog(true);
  };

  const confirmSave = () => {
    const convo: SavedConversation = {
      id: uuid(),
      title: saveTitle || 'Untitled',
      messages: [...messages],
      savedAt: new Date().toISOString(),
    };
    const updated = [convo, ...savedConvos];
    saveConversations(updated);
    setSavedConvos(updated);
    setShowSaveDialog(false);
    setSaveTitle('');
  };

  // Load a saved conversation
  const handleLoad = (convo: SavedConversation) => {
    if (messages.length > 0 && !confirm('Replace current conversation with saved one?')) return;
    clearHistory();
    // We need to set messages directly — use the store's internal set
    useChatStore.setState({ messages: convo.messages });
    setShowSaved(false);
  };

  // Delete a saved conversation
  const handleDeleteSaved = (id: string) => {
    const updated = savedConvos.filter(c => c.id !== id);
    saveConversations(updated);
    setSavedConvos(updated);
  };

  // New conversation
  const handleNew = () => {
    if (messages.length > 0) {
      if (confirm('Start a new conversation? (Save current one first if needed)')) {
        clearHistory();
      }
    }
  };

  const providerLabel = aiProvider === 'openrouter' ? 'OpenRouter' : aiProvider === 'lmstudio' ? 'LM Studio' : null;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Sidebar — Saved Conversations */}
      <div className={`${showSaved ? 'w-72' : 'w-0'} transition-all duration-200 overflow-hidden border-r border-border bg-surface flex flex-col shrink-0`}>
        <div className="px-3 py-3 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider">Saved Conversations</h3>
          <button
            onClick={() => setShowSaved(false)}
            className="text-text-dim hover:text-text-primary text-xs cursor-pointer"
          >✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {savedConvos.length === 0 ? (
            <div className="px-3 py-6 text-text-dim text-xs text-center">
              No saved conversations yet.<br />Use the save button to keep important chats.
            </div>
          ) : (
            savedConvos.map(convo => (
              <div
                key={convo.id}
                className="px-3 py-2.5 border-b border-border/50 hover:bg-surface-2 transition-colors group cursor-pointer"
                onClick={() => handleLoad(convo)}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="text-xs text-text-primary font-medium truncate flex-1">
                    {convo.title}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSaved(convo.id); }}
                    className="text-text-dim hover:text-threat-red text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                    title="Delete"
                  >✕</button>
                </div>
                <div className="text-[10px] text-text-dim mt-0.5">
                  {convo.messages.length} messages · {new Date(convo.savedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="p-1.5 rounded hover:bg-surface-2 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
              title="Saved conversations"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                <line x1="10" y1="22" x2="14" y2="22" />
              </svg>
              <h2 className="text-sm font-semibold text-text-primary">AI Assistant</h2>
              {providerLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-dim">
                  {providerLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleNew}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-text-dim hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer flex items-center gap-1"
              title="New conversation"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleSave}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-text-dim hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer flex items-center gap-1"
                title="Save conversation"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={() => { if (confirm('Clear chat history?')) clearHistory(); }}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-text-dim hover:text-threat-red hover:bg-threat-red/10 transition-colors cursor-pointer flex items-center gap-1"
                title="Clear history"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="px-4 py-3 border-b border-border bg-surface-2 flex items-center gap-2 shrink-0 animate-fade-in">
            <input
              autoFocus
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmSave(); if (e.key === 'Escape') setShowSaveDialog(false); }}
              placeholder="Conversation name..."
              className="flex-1 bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
            />
            <button onClick={confirmSave} className="px-3 py-1.5 bg-accent text-bg rounded text-xs font-semibold cursor-pointer hover:opacity-90">Save</button>
            <button onClick={() => setShowSaveDialog(false)} className="px-3 py-1.5 bg-surface border border-border text-text-dim rounded text-xs cursor-pointer hover:text-text-primary">Cancel</button>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && !isLoading ? (
              <div className="mt-12">
                <div className="text-center mb-8">
                  <div className="text-4xl mb-3">🛡️</div>
                  <h2 className="text-lg font-semibold text-text-primary mb-1">Bugout AI Assistant</h2>
                  <p className="text-sm text-text-dim">Ask me anything about disaster preparedness, your plan, equipment, routes, or threats.</p>
                </div>
                <SuggestedPrompts onSelect={handleSuggestedPrompt} />
              </div>
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
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded bg-threat-red/10 border border-threat-red/30 text-threat-red text-xs max-w-3xl mx-auto">
            {error}
          </div>
        )}

        {/* Provider warning */}
        {aiProvider === 'none' && (
          <div className="mx-4 mb-2 px-3 py-2 rounded bg-surface-2 border border-border text-text-dim text-xs text-center max-w-3xl mx-auto">
            No AI provider configured.{' '}
            <a href="#/settings" className="text-accent hover:underline">Set up in Settings</a>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border bg-surface px-4 py-4 shrink-0">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={aiProvider === 'none' ? 'Configure AI provider in settings...' : 'Ask about threats, gear, routes, scenarios...'}
              disabled={aiProvider === 'none'}
              rows={1}
              className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary
                placeholder:text-text-dim/50 resize-none outline-none
                focus:border-accent/50 transition-colors disabled:opacity-50"
              style={{ maxHeight: '150px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || aiProvider === 'none'}
              className="shrink-0 w-10 h-10 rounded-xl bg-accent text-bg flex items-center justify-center
                hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-150 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
