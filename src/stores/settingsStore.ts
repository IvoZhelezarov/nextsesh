import { create } from 'zustand';
import { Settings } from '@/types';
import { getDB } from '@/db/client';
import { getSettings, updateSettings } from '@/services/settingsService';

interface SettingsState {
  settings: Settings;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>;
}

const DEFAULTS: Settings = {
  id: 1,
  defaultRestSec: 90,
  defaultWeightIncrement: 2.5,
  defaultRepMin: 8,
  defaultRepMax: 12,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULTS,

  loadSettings: async () => {
    const row = await getSettings(getDB());
    if (row) set({ settings: row });
  },

  updateSettings: async (patch) => {
    const next: Settings = { ...get().settings, ...patch };
    await updateSettings(getDB(), next);
    set({ settings: next });
  },
}));
