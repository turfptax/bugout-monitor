import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UIState {
  toasts: Toast[];
  helpMode: boolean;
  showToast: (type: Toast['type'], message: string) => void;
  dismissToast: (id: string) => void;
  toggleHelp: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  helpMode: false,

  showToast: (type, message) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  toggleHelp: () => set((s) => ({ helpMode: !s.helpMode })),
}));
