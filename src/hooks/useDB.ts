import { getDB } from '@/db/client';
import { SQLiteDatabase } from 'expo-sqlite';

export function useDB(): SQLiteDatabase {
  return getDB();
}
