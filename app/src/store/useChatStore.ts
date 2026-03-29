import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sendChatMessage, type AiClientConfig, type ChatMessage } from '../lib/aiClient';
import { buildChatSystemPrompt } from '../lib/buildChatContext';
import { useSettingsStore } from './useSettingsStore';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatState {
  messages: Message[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
  appendToLastMessage: (chunk: string) => void;
}

function getAiConfig(): AiClientConfig {
  const s = useSettingsStore.getState();
  return {
    provider: s.aiProvider,
    openrouterKey: s.openrouterKey,
    openrouterModel: s.openrouterModel,
    lmstudioUrl: s.lmstudioUrl,
    lmstudioModel: s.lmstudioModel,
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isOpen: false,
      isLoading: false,
      error: null,

      toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
      setOpen: (open) => set({ isOpen: open }),

      clearHistory: () => set({ messages: [], error: null }),

      appendToLastMessage: (chunk) =>
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
          }
          return { messages: msgs };
        }),

      sendMessage: async (content) => {
        const config = getAiConfig();

        // Add user message
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        };

        set((s) => ({
          messages: [...s.messages, userMsg],
          isLoading: true,
          error: null,
        }));

        // Build conversation for the API
        const systemPrompt = buildChatSystemPrompt();
        const history: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
        ];

        // Include recent conversation (last 20 messages to stay within context)
        const recentMessages = get().messages.slice(-20);
        for (const msg of recentMessages) {
          history.push({ role: msg.role, content: msg.content });
        }

        // Create placeholder assistant message
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        };

        set((s) => ({
          messages: [...s.messages, assistantMsg],
        }));

        try {
          await sendChatMessage(config, history, (chunk) => {
            get().appendToLastMessage(chunk);
          });
          set({ isLoading: false });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to get response';
          // Remove the empty assistant message on error
          set((s) => ({
            messages: s.messages.filter((m) => m.id !== assistantMsg.id),
            isLoading: false,
            error: errorMsg,
          }));
        }
      },
    }),
    {
      name: 'bugout-chat',
      partialize: (state) => ({
        messages: state.messages,
      }),
    }
  )
);
