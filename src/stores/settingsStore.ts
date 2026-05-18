import { create } from 'zustand';
import { Settings } from '@/types';
import { getDB } from '@/db/client';

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
    const db = getDB();
    const row = await db.getFirstAsync<{
      default_rest_sec: number;
      default_weight_increment: number;
      default_rep_min: number;
      default_rep_max: number;
    }>('SELECT * FROM settings WHERE id = 1');

    if (row) {
      set({
        settings: {
          id: 1,
          defaultRestSec: row.default_rest_sec,
          defaultWeightIncrement: row.default_weight_increment,
          defaultRepMin: row.default_rep_min,
          defaultRepMax: row.default_rep_max,
        },
      });
    }
  },

  updateSettings: async (patch) => {
    const db = getDB();
    const current = get().settings;
    const next: Settings = { ...current, ...patch };

    await db.runAsync(
      `UPDATE settings SET
         default_rest_sec         = ?,
         default_weight_increment = ?,
         default_rep_min          = ?,
         default_rep_max          = ?,
         updated_at               = strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE id = 1`,
      [next.defaultRestSec, next.defaultWeightIncrement, next.defaultRepMin, next.defaultRepMax]
    );

    set({ settings: next });
  },
}));
