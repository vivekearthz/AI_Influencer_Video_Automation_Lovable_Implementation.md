-- Reference schema (Postgres dialect). Applied automatically at runtime by
-- PostgresSongsRepository (the JsonFileSongsRepository default backend uses
-- a plain JSON file instead -- see db/json-file-repository.ts). Kept here
-- for readability and for anyone wiring the tables into a Supabase project
-- directly.

CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_theme TEXT NOT NULL,          -- e.g. 'Dare to Law', 'Innovexsis Consulting'
  status TEXT NOT NULL DEFAULT 'pending_lyrics',
  -- pending_lyrics -> lyrics_ready -> music_ready -> pending_review
  -- -> approved -> published
  -- (or -> failed at any step; see review_notes for why)
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
