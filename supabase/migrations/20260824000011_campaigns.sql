-- Campaigns (spec §7).

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  objective text,
  product_name text,
  product_description text,
  target_audience text,
  language text not null default 'English',
  tone text not null default 'professional',
  presenter_id uuid references public.presenters(id) on delete set null,
  brand_template_id uuid references public.brand_templates(id) on delete set null,
  style text default 'premium UGC',
  duration_seconds integer not null default 30,
  aspect_ratio text not null default '9:16' check (aspect_ratio in ('9:16', '16:9', '1:1')),
  quality_profile text not null default 'economy' check (quality_profile in ('economy', 'balanced', 'premium')),
  cta text,
  landing_url text,
  whatsapp_enabled boolean not null default false,
  email_enabled boolean not null default false,
  target_channel_keys text[] not null default '{}',
  publish_to_all_connected boolean not null default false,
  status text not null default 'draft' check (status in (
    'draft', 'script_pending', 'script_ready', 'generating', 'rendering',
    'qc_pending', 'qc_failed', 'ready_for_review', 'approved',
    'scheduled', 'publishing', 'completed', 'failed', 'cancelled'
  )),
  scheduled_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  total_estimated_cost numeric default 0,
  total_actual_cost numeric default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_workspace on public.campaigns(workspace_id);
create index if not exists idx_campaigns_status on public.campaigns(status);

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();
