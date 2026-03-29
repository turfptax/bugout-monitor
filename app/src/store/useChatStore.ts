import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sendChatMessage, type AiClientConfig, type ChatMessage, type ToolUseEvent } from '../lib/aiClient';
import { buildChatSystemPrompt } from '../lib/buildChatContext';
import { useSettingsStore } from './useSettingsStore';

export interface ToolAction {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool-use';
  content: string;
  timestamp: string;
  toolActions?: ToolAction[];
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
          const toolActions: ToolAction[] = [];

          await sendChatMessage(
            config,
            history,
            (chunk) => {
              get().appendToLastMessage(chunk);
            },
            (toolEvent: ToolUseEvent) => {
              toolActions.push({
                name: toolEvent.name,
                args: toolEvent.args,
                result: toolEvent.result,
              });
              // Add a tool-use message to show what happened
              const toolMsg: Message = {
                id: crypto.randomUUID(),
                role: 'tool-use',
                content: `**🔧 ${formatToolName(toolEvent.name)}**${Object.keys(toolEvent.args).length > 0 ? '\n' + formatToolArgs(toolEvent.args) : ''}`,
                timestamp: new Date().toISOString(),
                toolActions: [{ name: toolEvent.name, args: toolEvent.args, result: toolEvent.result }],
              };
              // Insert tool-use message before the assistant's placeholder
              set((s) => {
                const msgs = [...s.messages];
                // Insert before the last message (which is the assistant placeholder)
                msgs.splice(msgs.length - 1, 0, toolMsg);
                return { messages: msgs };
              });
            }
          );

          // Update the assistant message with tool actions if any occurred
          if (toolActions.length > 0) {
            set((s) => {
              const msgs = [...s.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, toolActions };
              }
              return { messages: msgs };
            });
          }

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

// ── Helpers ──

function formatToolName(name: string): string {
  const names: Record<string, string> = {
    get_threat_levels: 'Checking threat levels',
    get_osint_summary: 'Reading OSINT intelligence',
    get_equipment: 'Reading equipment inventory',
    add_equipment: 'Adding equipment item',
    bulk_add_equipment: 'Adding multiple items',
    remove_equipment: 'Removing equipment item',
    suggest_equipment_gaps: 'Analyzing equipment gaps',
    get_rally_points: 'Checking rally points',
    set_rally_point: 'Setting rally point',
    get_location: 'Reading location config',
  };
  return names[name] || name;
}

function formatToolArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return '';
  return entries
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) return `  ${k}: ${v.length} items`;
      if (typeof v === 'string' && v.length > 50) return `  ${k}: "${v.slice(0, 50)}..."`;
      return `  ${k}: ${JSON.stringify(v)}`;
    })
    .join('\n');
}
