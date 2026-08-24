-- Collaboration workspace messaging (spec §3 messages).

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_collaboration on public.messages(collaboration_id);
