-- DPDP Act consent logging (spec §8): "Store consent + data-processing
-- notice per DPDP Act requirements at signup ... log consent timestamp per user."

create table if not exists public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in (
    'dpdp_data_processing', 'terms_of_service', 'marketing_communications', 'age_18_plus_certification'
  )),
  consented boolean not null default true,
  consent_text_version text not null default 'v1',
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_consent_logs_user on public.consent_logs(user_id);
