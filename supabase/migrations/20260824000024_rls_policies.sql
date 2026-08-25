-- -----------------------------------------------------------------------------
-- Row Level Security (spec §50). Every workspace-scoped table is locked down
-- so a user can only read/write rows belonging to a workspace they are a
-- member of. Global reference tables (ai_providers, ai_models,
-- platform_catalog) are readable by any authenticated user but only
-- writable by the service role (i.e. via migrations/admin tooling).
-- -----------------------------------------------------------------------------

-- profiles ---------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- workspaces ---------------------------------------------------------------
alter table public.workspaces enable row level security;

create policy "workspaces_select_member" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces_update_admin" on public.workspaces
  for update using (public.is_workspace_admin(id));

create policy "workspaces_insert_authenticated" on public.workspaces
  for insert with check (auth.uid() is not null);

-- workspace_members ----------------------------------------------------------
alter table public.workspace_members enable row level security;

create policy "workspace_members_select_member" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "workspace_members_admin_write" on public.workspace_members
  for all using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- automation_settings -----------------------------------------------------
alter table public.automation_settings enable row level security;

create policy "automation_settings_select_member" on public.automation_settings
  for select using (public.is_workspace_member(workspace_id));

create policy "automation_settings_admin_write" on public.automation_settings
  for update using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- ai_providers (global reference data, read-only to clients) ---------------
alter table public.ai_providers enable row level security;

create policy "ai_providers_select_authenticated" on public.ai_providers
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- ai_provider_credentials — never expose raw credential refs broadly;
-- workspace admins only.
alter table public.ai_provider_credentials enable row level security;

create policy "ai_provider_credentials_admin_select" on public.ai_provider_credentials
  for select using (public.is_workspace_admin(workspace_id));

create policy "ai_provider_credentials_admin_write" on public.ai_provider_credentials
  for all using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- ai_models (global reference data, read-only to clients) -------------------
alter table public.ai_models enable row level security;

create policy "ai_models_select_authenticated" on public.ai_models
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- presenters -----------------------------------------------------------------
alter table public.presenters enable row level security;

create policy "presenters_member_all" on public.presenters
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- voice_profiles ---------------------------------------------------------
alter table public.voice_profiles enable row level security;

create policy "voice_profiles_member_all" on public.voice_profiles
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- brand_templates ----------------------------------------------------------
alter table public.brand_templates enable row level security;

create policy "brand_templates_member_all" on public.brand_templates
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- campaigns -----------------------------------------------------------------
alter table public.campaigns enable row level security;

create policy "campaigns_member_all" on public.campaigns
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- campaign_assets (scoped via parent campaign's workspace) ------------------
alter table public.campaign_assets enable row level security;

create policy "campaign_assets_member_all" on public.campaign_assets
  for all using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_assets.campaign_id
        and public.is_workspace_member(c.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_assets.campaign_id
        and public.is_workspace_member(c.workspace_id)
    )
  );

-- ai_generation_jobs ---------------------------------------------------------
alter table public.ai_generation_jobs enable row level security;

create policy "ai_generation_jobs_member_all" on public.ai_generation_jobs
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- platform_catalog (global reference data, read-only to clients) -----------
alter table public.platform_catalog enable row level security;

create policy "platform_catalog_select_authenticated" on public.platform_catalog
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- social_accounts ------------------------------------------------------------
alter table public.social_accounts enable row level security;

create policy "social_accounts_member_all" on public.social_accounts
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- social_publish_jobs ---------------------------------------------------------
alter table public.social_publish_jobs enable row level security;

create policy "social_publish_jobs_member_all" on public.social_publish_jobs
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- social_post_metrics (scoped via parent publish job's workspace) -----------
alter table public.social_post_metrics enable row level security;

create policy "social_post_metrics_member_select" on public.social_post_metrics
  for select using (
    exists (
      select 1 from public.social_publish_jobs j
      where j.id = social_post_metrics.publish_job_id
        and public.is_workspace_member(j.workspace_id)
    )
  );

-- whatsapp_campaigns ----------------------------------------------------------
alter table public.whatsapp_campaigns enable row level security;

create policy "whatsapp_campaigns_member_all" on public.whatsapp_campaigns
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- email_campaigns --------------------------------------------------------------
alter table public.email_campaigns enable row level security;

create policy "email_campaigns_member_all" on public.email_campaigns
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- approval_tasks ----------------------------------------------------------------
alter table public.approval_tasks enable row level security;

create policy "approval_tasks_member_all" on public.approval_tasks
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ai_cost_ledger (read-only to members; writes come from service role) -------
alter table public.ai_cost_ledger enable row level security;

create policy "ai_cost_ledger_member_select" on public.ai_cost_ledger
  for select using (public.is_workspace_member(workspace_id));

-- audit_logs (read-only to members; writes come from service role) ----------
alter table public.audit_logs enable row level security;

create policy "audit_logs_member_select" on public.audit_logs
  for select using (workspace_id is null or public.is_workspace_member(workspace_id));

-- ab_test_variants -------------------------------------------------------------
alter table public.ab_test_variants enable row level security;

create policy "ab_test_variants_member_all" on public.ab_test_variants
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
