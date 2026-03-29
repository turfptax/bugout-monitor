import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AiProvider = 'openrouter' | 'lmstudio' | 'none';

interface SettingsState {
  theme: 'dark' | 'light';
  hasCompletedOnboarding: boolean;
  apiKeys: {
    nws?: string;
    noaa?: string;
    gdelt?: string;
  };
  location: {
    city: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
    nearbyTargets: string[];
  };
  aiProvider: AiProvider;
  openrouterKey: string;
  openrouterModel: string;
  lmstudioUrl: string;
  lmstudioModel: string;
  setTheme: (theme: 'dark' | 'light') => void;
  completeOnboarding: () => void;
  setApiKey: (key: string, value: string) => void;
  setLocation: (location: Partial<SettingsState['location']>) => void;
  addNearbyTarget: (target: string) => void;
  removeNearbyTarget: (index: number) => void;
  setAiProvider: (provider: AiProvider) => void;
  setOpenrouterKey: (key: string) => void;
  setOpenrouterModel: (model: string) => void;
  setLmstudioUrl: (url: string) => void;
  setLmstudioModel: (model: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      hasCompletedOnboarding: false,
      apiKeys: {},
      location: {
        city: '',
        state: '',
        latitude: null,
        longitude: null,
        nearbyTargets: [],
      },
      aiProvider: 'none',
      openrouterKey: '',
      openrouterModel: 'google/gemini-2.0-flash-001',
      lmstudioUrl: 'http://localhost:1234',
      lmstudioModel: '',

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      setApiKey: (key, value) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [key]: value } })),

      setLocation: (location) =>
        set((s) => ({ location: { ...s.location, ...location } })),

      addNearbyTarget: (target) =>
        set((s) => ({
          location: {
            ...s.location,
            nearbyTargets: [...s.location.nearbyTargets, target],
          },
        })),

      removeNearbyTarget: (index) =>
        set((s) => ({
          location: {
            ...s.location,
            nearbyTargets: s.location.nearbyTargets.filter((_, i) => i !== index),
          },
        })),

      setAiProvider: (provider) => set({ aiProvider: provider }),
      setOpenrouterKey: (key) => set({ openrouterKey: key }),
      setOpenrouterModel: (model) => set({ openrouterModel: model }),
      setLmstudioUrl: (url) => set({ lmstudioUrl: url }),
      setLmstudioModel: (model) => set({ lmstudioModel: model }),
    }),
    { name: 'bugout-settings' }
  )
);
