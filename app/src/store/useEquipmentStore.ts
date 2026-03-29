import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EquipmentItem } from '../types/equipment';

interface EquipmentState {
  items: EquipmentItem[];
  addItem: (item: Omit<EquipmentItem, 'id' | 'added'>) => void;
  editItem: (id: string, updates: Partial<EquipmentItem>) => void;
  deleteItem: (id: string) => void;
  importItems: (items: EquipmentItem[]) => void;
  mergeItems: (items: EquipmentItem[]) => void;
  exportItems: () => EquipmentItem[];
}

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const newItem: EquipmentItem = {
          ...item,
          id: crypto.randomUUID(),
          added: new Date().toISOString(),
        };
        set((s) => ({ items: [...s.items, newItem] }));
      },

      editItem: (id, updates) => {
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      deleteItem: (id) => {
        set((s) => ({ items: s.items.filter((item) => item.id !== id) }));
      },

      importItems: (items) => {
        set({ items });
      },

      mergeItems: (newItems) => {
        set((s) => {
          const existing = new Set(s.items.map(i => `${i.name}|${i.category}`.toLowerCase()));
          const toAdd = newItems
            .filter(i => !existing.has(`${i.name}|${i.category}`.toLowerCase()))
            .map(i => ({
              ...i,
              id: i.id || crypto.randomUUID(),
              added: i.added || new Date().toISOString(),
            }));
          return { items: [...s.items, ...toAdd] };
        });
      },

      exportItems: () => {
        return get().items;
      },
    }),
    { name: 'bugout-inventory' }
  )
);
