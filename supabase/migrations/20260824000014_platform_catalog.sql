-- -----------------------------------------------------------------------------
-- Global catalog of the 24 supported social channels + their capability
-- matrix (spec §54-55). This is reference data, not workspace-scoped — a
-- workspace's actual connection lives in social_accounts.
-- -----------------------------------------------------------------------------

create table if not exists public.platform_catalog (
  platform_key text primary key,
  display_name text not null,
  publisher_tier text not null default 'manual'
    check (publisher_tier in ('native_api', 'third_party', 'manual')),
  capabilities jsonb not null default '{
    "text": true, "image": true, "video": true, "stories": false,
    "reels": false, "shorts": false, "scheduled": false, "direct_publish": false
  }',
  oauth_supported boolean not null default false,
  docs_url text,
  sort_order integer not null default 100
);
