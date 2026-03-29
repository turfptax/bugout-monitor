import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    nearbyTargets: string[];
  };
  setTheme: (theme: 'dark' | 'light') => void;
  completeOnboarding: () => void;
  setApiKey: (key: string, value: string) => void;
  setLocation: (location: Partial<SettingsState['location']>) => void;
  addNearbyTarget: (target: string) => void;
  removeNearbyTarget: (index: number) => void;
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
        nearbyTargets: [],
      },

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
    }),
    { name: 'bugout-settings' }
  )
);
