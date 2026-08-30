import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { Song, SongPatch, SongStatus, SongsRepository } from './types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY,
  source_theme TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_lyrics',
  lyrics JSONB,
  music_asset_path TEXT,
  video_asset_path TEXT,
  youtube_video_id TEXT,
  soundcloud_track_id TEXT,
  social_post_ids JSONB NOT NULL DEFAULT '[]',
  review_notes TEXT,
  cost_cents_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

interface Row {
  id: string;
  source_theme: string;
  status: SongStatus;
  lyrics: unknown;
  music_asset_path: string | null;
  video_asset_path: string | null;
  youtube_video_id: string | null;
  soundcloud_track_id: string | null;
  social_post_ids: string[] | null;
  review_notes: string | null;
  cost_cents_spent: number;
  created_at: Date | string;
  updated_at: Date | string;
}

function rowToSong(row: Row): Song {
  return {
    id: row.id,
    sourceTheme: row.source_theme,
    status: row.status,
    lyrics: (row.lyrics as Song['lyrics']) ?? null,
    musicAssetPath: row.music_asset_path,
    videoAssetPath: row.video_asset_path,
    youtubeVideoId: row.youtube_video_id,
    soundcloudTrackId: row.soundcloud_track_id,
    socialPostIds: row.social_post_ids ?? [],
    reviewNotes: row.review_notes,
    costCentsSpent: row.cost_cents_spent,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Production-grade persistence backend for a hosted Postgres instance.
 * Works unmodified against any free-tier Postgres (Neon, Supabase, Railway,
 * a self-hosted Postgres on the same VM as Postiz, etc.) -- just point
 * DATABASE_URL at it.
 */
export class PostgresSongsRepository implements SongsRepository {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    this.ready = this.pool.query(SCHEMA).then(() => undefined);
  }

  private async init() {
    await this.ready;
  }

  async create(sourceTheme: string): Promise<Song> {
    await this.init();
    const id = randomUUID();
    const { rows } = await this.pool.query<Row>(
      `INSERT INTO songs (id, source_theme) VALUES ($1, $2) RETURNING *`,
      [id, sourceTheme]
    );
    return rowToSong(rows[0]);
  }

  async findById(id: string): Promise<Song | null> {
    await this.init();
    const { rows } = await this.pool.query<Row>('SELECT * FROM songs WHERE id = $1', [id]);
    return rows[0] ? rowToSong(rows[0]) : null;
  }

  async findByStatuses(statuses: SongStatus[]): Promise<Song[]> {
    await this.init();
    if (statuses.length === 0) return [];
    const { rows } = await this.pool.query<Row>(
      'SELECT * FROM songs WHERE status = ANY($1) ORDER BY created_at ASC',
      [statuses]
    );
    return rows.map(rowToSong);
  }

  async update(id: string, patch: SongPatch): Promise<Song> {
    await this.init();
    const existing = await this.findById(id);
    if (!existing) throw new Error(`song ${id} not found`);
    const merged = { ...existing, ...patch };
    const { rows } = await this.pool.query<Row>(
      `UPDATE songs SET status = $1, lyrics = $2, music_asset_path = $3, video_asset_path = $4,
         youtube_video_id = $5, soundcloud_track_id = $6, social_post_ids = $7, review_notes = $8,
         updated_at = now()
       WHERE id = $9 RETURNING *`,
      [
        merged.status,
        merged.lyrics ? JSON.stringify(merged.lyrics) : null,
        merged.musicAssetPath,
        merged.videoAssetPath,
        merged.youtubeVideoId,
        merged.soundcloudTrackId,
        JSON.stringify(merged.socialPostIds ?? []),
        merged.reviewNotes,
        id,
      ]
    );
    return rowToSong(rows[0]);
  }

  async addCostCents(id: string, cents: number): Promise<Song> {
    await this.init();
    const { rows } = await this.pool.query<Row>(
      `UPDATE songs SET cost_cents_spent = cost_cents_spent + $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [cents, id]
    );
    return rowToSong(rows[0]);
  }

  async monthlyCostCents(): Promise<number> {
    await this.init();
    const { rows } = await this.pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(cost_cents_spent), 0) as total FROM songs
       WHERE created_at >= date_trunc('month', now())`
    );
    return Number(rows[0]?.total ?? 0);
  }

  async all(): Promise<Song[]> {
    await this.init();
    const { rows } = await this.pool.query<Row>('SELECT * FROM songs ORDER BY created_at ASC');
    return rows.map(rowToSong);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
