-- -----------------------------------------------------------------------------
-- Storage buckets (spec §46). Paths are always prefixed with
-- `{workspace_id}/...` so RLS policies can scope access per workspace.
-- Buckets are public-read (so published social posts/videos have a stable
-- URL) but writes are restricted to workspace members; adjust to
-- private + signed URLs if your compliance requirements need that instead.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('campaign-inputs', 'campaign-inputs', false),
  ('presenters', 'presenters', true),
  ('voices', 'voices', false),
  ('raw-video', 'raw-video', false),
  ('rendered-video', 'rendered-video', true),
  ('thumbnails', 'thumbnails', true),
  ('subtitles', 'subtitles', false),
  ('exports', 'exports', false)
on conflict (id) do nothing;

-- Helper: extract the workspace_id (first path segment) from an object path
-- and confirm the caller is a member of that workspace.
create or replace function public.is_workspace_member_for_storage_path(object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  workspace_uuid uuid;
begin
  begin
    workspace_uuid := (split_part(object_name, '/', 1))::uuid;
  exception when others then
    return false;
  end;
  return public.is_workspace_member(workspace_uuid);
end;
$$;

do $$
declare
  bucket_id text;
begin
  foreach bucket_id in array array['campaign-inputs', 'presenters', 'voices', 'raw-video', 'rendered-video', 'thumbnails', 'subtitles', 'exports']
  loop
    execute format(
      'create policy %I on storage.objects for select using (bucket_id = %L and (public.is_workspace_member_for_storage_path(name) or exists (select 1 from storage.buckets b where b.id = %L and b.public)))',
      'ws_select_' || replace(bucket_id, '-', '_'), bucket_id, bucket_id
    );
    execute format(
      'create policy %I on storage.objects for insert with check (bucket_id = %L and public.is_workspace_member_for_storage_path(name))',
      'ws_insert_' || replace(bucket_id, '-', '_'), bucket_id
    );
    execute format(
      'create policy %I on storage.objects for update using (bucket_id = %L and public.is_workspace_member_for_storage_path(name))',
      'ws_update_' || replace(bucket_id, '-', '_'), bucket_id
    );
    execute format(
      'create policy %I on storage.objects for delete using (bucket_id = %L and public.is_workspace_member_for_storage_path(name))',
      'ws_delete_' || replace(bucket_id, '-', '_'), bucket_id
    );
  end loop;
end $$;
