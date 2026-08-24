-- Reusable brand overlay templates (spec §26).

create table if not exists public.brand_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  logo_url text,
  primary_font text,
  secondary_font text,
  colors jsonb not null default '{}',
  overlay_config jsonb not null default '{
    "logo": {"position": "top-right", "width": 180},
    "cta": {"position": "bottom", "style": "pill"},
    "website": {"position": "bottom"},
    "phone": {"position": "bottom"}
  }',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brand_templates_workspace on public.brand_templates(workspace_id);

drop trigger if exists trg_brand_templates_updated_at on public.brand_templates;
create trigger trg_brand_templates_updated_at
  before update on public.brand_templates
  for each row execute function public.set_updated_at();
