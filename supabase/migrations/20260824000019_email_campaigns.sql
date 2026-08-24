-- Email campaign tracking (spec §17 EmailProvider interface).

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  recipient_list jsonb not null default '[]',
  subject text,
  html_asset_id uuid references public.campaign_assets(id) on delete set null,
  status text not null default 'draft' check (status in (
    'draft', 'queued', 'sending', 'sent', 'partially_failed', 'failed'
  )),
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  opened_count integer not null default 0,
  clicked_count integer not null default 0,
  bounced_count integer not null default 0,
  external_campaign_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_campaigns_campaign on public.email_campaigns(campaign_id);

drop trigger if exists trg_email_campaigns_updated_at on public.email_campaigns;
create trigger trg_email_campaigns_updated_at
  before update on public.email_campaigns
  for each row execute function public.set_updated_at();
