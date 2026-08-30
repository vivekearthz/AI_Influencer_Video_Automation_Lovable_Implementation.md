export type SongStatus =
  | 'pending_lyrics'
  | 'lyrics_ready'
  | 'pending_music'
  | 'music_ready'
  | 'pending_video'
  | 'video_ready'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'failed';

/** Terminal statuses the orchestrator never picks back up. */
export const TERMINAL_STATUSES: SongStatus[] = ['published', 'failed'];

export interface LyricsSection {
  section: 'verse' | 'chorus' | 'bridge';
  lines: string[];
}

export interface Lyrics {
  title: string;
  genre: string;
  mood: string;
  structure: LyricsSection[];
  tags: string[];
}

export interface Song {
  id: string;
  sourceTheme: string;
  status: SongStatus;
  lyrics: Lyrics | null;
  musicAssetPath: string | null;
  videoAssetPath: string | null;
  youtubeVideoId: string | null;
  soundcloudTrackId: string | null;
  socialPostIds: string[];
  reviewNotes: string | null;
  costCentsSpent: number;
  createdAt: string;
  updatedAt: string;
}

export type SongPatch = Partial<
  Pick<
    Song,
    | 'status'
    | 'lyrics'
    | 'musicAssetPath'
    | 'videoAssetPath'
    | 'youtubeVideoId'
    | 'soundcloudTrackId'
    | 'socialPostIds'
    | 'reviewNotes'
  >
>;

export interface SongsRepository {
  create(sourceTheme: string): Promise<Song>;
  findById(id: string): Promise<Song | null>;
  findByStatuses(statuses: SongStatus[]): Promise<Song[]>;
  update(id: string, patch: SongPatch): Promise<Song>;
  addCostCents(id: string, cents: number): Promise<Song>;
  monthlyCostCents(): Promise<number>;
  all(): Promise<Song[]>;
  close(): Promise<void>;
}
