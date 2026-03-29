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
      // Try static file first (from monitor script)
      const res = await fetch('./threat-data.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ThreatData = await res.json();
      set({ data, loading: false, lastFetched: Date.now() });
    } catch {
      // Fall back to localStorage (from live scan)
      try {
        const cached = localStorage.getItem('bugout-threat-data');
        if (cached) {
          const data: ThreatData = JSON.parse(cached);
          set({ data, loading: false, lastFetched: Date.now() });
          return;
        }
      } catch { /* ignore parse errors */ }

      set({
        error: 'No threat data available. Click "Scan Now" to fetch live data, or run the monitor script (node monitor/index.js).',
        loading: false,
      });
    }
  },
}));
