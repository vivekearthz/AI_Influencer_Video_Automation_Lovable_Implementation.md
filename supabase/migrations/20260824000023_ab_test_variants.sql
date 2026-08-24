-- A/B testing (spec §63) — only one major variable should differ per variant.

create table if not exists public.ab_test_variants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  variant_label text not null check (variant_label in ('A', 'B', 'C', 'D')),
  variable_changed text not null check (variable_changed in (
    'hook', 'presenter', 'cta', 'voice', 'thumbnail', 'caption'
  )),
  variant_value jsonb not null default '{}',
  performance_summary jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (campaign_id, variant_label)
);

create index if not exists idx_ab_test_variants_campaign on public.ab_test_variants(campaign_id);
