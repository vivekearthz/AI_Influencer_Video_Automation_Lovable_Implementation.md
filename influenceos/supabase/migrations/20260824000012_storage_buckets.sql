-- Storage buckets (spec §2 "Supabase Storage for portfolio uploads
-- (images/video, max 100MB/file, 5 files)", §8 contract PDFs).

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('creator-portfolios', 'creator-portfolios', true, 104857600), -- 100MB
  ('contracts', 'contracts', false, 20971520), -- 20MB
  ('content-deliveries', 'content-deliveries', false, 524288000) -- 500MB
on conflict (id) do nothing;

-- Portfolio files are stored at {user_id}/... and are publicly viewable
-- (brands need to see them without extra signed-URL plumbing) but only the
-- owning creator can write/delete their own files.
create or replace function public.is_owner_of_storage_path(object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  owner_uuid uuid;
begin
  begin
    owner_uuid := (split_part(object_name, '/', 1))::uuid;
  exception when others then
    return false;
  end;
  return owner_uuid = auth.uid();
end;
$$;

create policy "portfolio_public_read" on storage.objects
  for select using (bucket_id = 'creator-portfolios');

create policy "portfolio_owner_write" on storage.objects
  for insert with check (bucket_id = 'creator-portfolios' and public.is_owner_of_storage_path(name));

create policy "portfolio_owner_update" on storage.objects
  for update using (bucket_id = 'creator-portfolios' and public.is_owner_of_storage_path(name));

create policy "portfolio_owner_delete" on storage.objects
  for delete using (bucket_id = 'creator-portfolios' and public.is_owner_of_storage_path(name));

-- Contracts and content deliveries are private; access is mediated entirely
-- through Edge Functions using the service role key (never directly by
-- client-side storage queries), so no additional client policies are added
-- here beyond the default "no access" that RLS provides once enabled.
