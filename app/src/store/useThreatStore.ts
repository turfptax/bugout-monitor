import { create } from 'zustand';
import type { ThreatData } from '../types/threat';

interface ThreatState {
  data: ThreatData | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchData: () => Promise<void>;
}

export const useThreatStore = create<ThreatState>((set) => ({
  data: null,
  loading: false,
  error: null,
  lastFetched: null,

  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('./threat-data.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ThreatData = await res.json();
      set({ data, loading: false, lastFetched: Date.now() });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch threat data',
        loading: false,
      });
    }
  },
}));
