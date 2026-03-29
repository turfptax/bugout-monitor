import { useChatStore } from '../../store/useChatStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function ChatFAB() {
  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const isOpen = useChatStore((s) => s.isOpen);
  const isLoading = useChatStore((s) => s.isLoading);
  const aiProvider = useSettingsStore((s) => s.aiProvider);

  if (isOpen) return null;

  return (
    <button
      onClick={toggleOpen}
      className={`fixed bottom-20 md:bottom-6 right-6 z-40 w-14 h-14 min-h-[44px] min-w-[44px] rounded-full bg-accent text-bg
        flex items-center justify-center shadow-lg shadow-accent/20
        hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer
        ${isLoading ? 'animate-fab-pulse' : ''}`}
      aria-label="Open AI Assistant"
    >
      {/* Chat bubble icon */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>

      {/* Status dot */}
      {aiProvider !== 'none' && (
        <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-bg
          ${isLoading ? 'bg-accent-2 animate-pulse' : 'bg-threat-green'}`}
        />
      )}
      {aiProvider === 'none' && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-bg bg-text-dim" />
      )}
    </button>
  );
}
