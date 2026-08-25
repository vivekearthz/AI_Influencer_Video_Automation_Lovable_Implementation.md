-- WhatsApp campaign (spec §16).

create table if not exists public.whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  phone_list jsonb not null default '[]',
  template_name text,
  language text default 'en',
  media_url text,
  status text not null default 'draft' check (status in (
    'draft', 'queued', 'sending', 'sent', 'partially_failed', 'failed'
  )),
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  read_count integer not null default 0,
  failed_count integer not null default 0,
  external_campaign_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_campaigns_campaign on public.whatsapp_campaigns(campaign_id);

drop trigger if exists trg_whatsapp_campaigns_updated_at on public.whatsapp_campaigns;
create trigger trg_whatsapp_campaigns_updated_at
  before update on public.whatsapp_campaigns
  for each row execute function public.set_updated_at();
