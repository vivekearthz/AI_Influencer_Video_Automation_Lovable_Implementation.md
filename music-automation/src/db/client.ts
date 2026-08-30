import { env } from '../config/env.js';
import { JsonFileSongsRepository } from './json-file-repository.js';
import { PostgresSongsRepository } from './postgres-repository.js';
import type { SongsRepository } from './types.js';

let singleton: SongsRepository | null = null;

/**
 * Picks the persistence backend from DATABASE_URL:
 *  - unset            -> local JSON file (free, zero setup, default)
 *  - postgres(ql)://  -> Postgres (Neon/Supabase free tier, self-hosted, etc.)
 */
export function createSongsRepository(): SongsRepository {
  if (env.DATABASE_URL) {
    return new PostgresSongsRepository(env.DATABASE_URL);
  }
  return new JsonFileSongsRepository(env.DB_FILE_PATH);
}

export function db(): SongsRepository {
  if (!singleton) singleton = createSongsRepository();
  return singleton;
}

export async function resetDbSingletonForTests(): Promise<void> {
  if (singleton) await singleton.close();
  singleton = null;
}

export * from './types.js';
