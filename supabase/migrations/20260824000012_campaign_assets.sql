-- Campaign assets (spec §7 campaign_assets).

create table if not exists public.campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  asset_type text not null check (asset_type in (
    'presenter_image', 'reference_image', 'script', 'voice', 'raw_video',
    'final_video', 'thumbnail', 'logo', 'caption', 'subtitle',
    'email_html', 'whatsapp_template'
  )),
  scene_index integer,
  storage_path text,
  public_url text,
  metadata jsonb not null default '{}',
  provider text,
  provider_job_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaign_assets_campaign on public.campaign_assets(campaign_id);
create index if not exists idx_campaign_assets_type on public.campaign_assets(asset_type);

drop trigger if exists trg_campaign_assets_updated_at on public.campaign_assets;
create trigger trg_campaign_assets_updated_at
  before update on public.campaign_assets
  for each row execute function public.set_updated_at();
