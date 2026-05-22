import { SQLiteDatabase } from 'expo-sqlite';
import { Settings } from '@/types';

interface SettingsRow {
  default_rest_sec: number;
  default_weight_increment: number;
  default_rep_min: number;
  default_rep_max: number;
}

function rowToSettings(row: SettingsRow): Settings {
  return {
    id: 1,
    defaultRestSec: row.default_rest_sec,
    defaultWeightIncrement: row.default_weight_increment,
    defaultRepMin: row.default_rep_min,
    defaultRepMax: row.default_rep_max,
  };
}

export async function getSettings(db: SQLiteDatabase): Promise<Settings | null> {
  const row = await db.getFirstAsync<SettingsRow>('SELECT * FROM settings WHERE id = 1');
  return row ? rowToSettings(row) : null;
}

export async function updateSettings(db: SQLiteDatabase, next: Settings): Promise<void> {
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
}
