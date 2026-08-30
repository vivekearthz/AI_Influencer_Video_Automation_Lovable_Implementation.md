import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Song, SongPatch, SongStatus, SongsRepository } from './types.js';

/**
 * Zero-dependency, zero-cost, maximally-portable persistence backend: a
 * single JSON file. No native module, no bundler-specific builtin (an
 * earlier version of this used Node's built-in `node:sqlite`, but that
 * broke under Vite/Vitest -- and several of this account's other repos
 * *are* Vite apps -- because `node:sqlite` isn't in Node's own
 * `builtinModules` list yet, so bundlers don't recognize it). A JSON file
 * has none of that risk and is trivially readable in a `git diff`, which
 * is exactly what the GitHub Actions workflow commits back between runs.
 *
 * Pass ':memory:' to keep everything in-process only (used by tests).
 */
export class JsonFileSongsRepository implements SongsRepository {
  private songs: Song[] = [];
  private readonly persistent: boolean;

  constructor(private filePath: string) {
    this.persistent = filePath !== ':memory:';
    if (this.persistent && existsSync(filePath)) {
      this.songs = JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  }

  private save(): void {
    if (!this.persistent) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.songs, null, 2));
  }

  async create(sourceTheme: string): Promise<Song> {
    const now = new Date().toISOString();
    const song: Song = {
      id: randomUUID(),
      sourceTheme,
      status: 'pending_lyrics',
      lyrics: null,
      musicAssetPath: null,
      videoAssetPath: null,
      youtubeVideoId: null,
      soundcloudTrackId: null,
      socialPostIds: [],
      reviewNotes: null,
      costCentsSpent: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.songs.push(song);
    this.save();
    return song;
  }

  async findById(id: string): Promise<Song | null> {
    return this.songs.find((s) => s.id === id) ?? null;
  }

  async findByStatuses(statuses: SongStatus[]): Promise<Song[]> {
    return this.songs
      .filter((s) => statuses.includes(s.status))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async update(id: string, patch: SongPatch): Promise<Song> {
    const index = this.songs.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`song ${id} not found`);
    const merged: Song = { ...this.songs[index], ...patch, updatedAt: new Date().toISOString() };
    this.songs[index] = merged;
    this.save();
    return merged;
  }

  async addCostCents(id: string, cents: number): Promise<Song> {
    const index = this.songs.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`song ${id} not found`);
    this.songs[index] = {
      ...this.songs[index],
      costCentsSpent: this.songs[index].costCentsSpent + cents,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.songs[index];
  }

  async monthlyCostCents(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    return this.songs
      .filter((s) => new Date(s.createdAt).getTime() >= startOfMonth.getTime())
      .reduce((sum, s) => sum + s.costCentsSpent, 0);
  }

  async all(): Promise<Song[]> {
    return [...this.songs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async close(): Promise<void> {
    this.save();
  }
}
