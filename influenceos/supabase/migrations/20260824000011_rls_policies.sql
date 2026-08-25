-- -----------------------------------------------------------------------------
-- Row Level Security. Creator profiles are only readable by their owner,
-- admins, and logged-in brands (spec §4: "creator profile card ... visible
-- to logged-in brands only"). Collaboration-scoped tables (messages,
-- reviews, contract/escrow fields on collaborations) are only readable by
-- the two parties involved plus admins.
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or (role = 'creator' and public.current_user_role() = 'brand')
    or (role = 'brand' and exists (
      select 1 from public.collaborations col
      where col.brand_id = profiles.id and col.creator_id = auth.uid()
    ))
  );

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

alter table public.consent_logs enable row level security;

create policy "consent_logs_select_own" on public.consent_logs
  for select using (user_id = auth.uid() or public.is_admin());

create policy "consent_logs_insert_own" on public.consent_logs
  for insert with check (user_id = auth.uid());

alter table public.creator_profiles enable row level security;

create policy "creator_profiles_select" on public.creator_profiles
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or public.current_user_role() = 'brand'
  );

create policy "creator_profiles_write_own" on public.creator_profiles
  for insert with check (user_id = auth.uid());

create policy "creator_profiles_update_own" on public.creator_profiles
  for update using (user_id = auth.uid() or public.is_admin());

alter table public.brand_profiles enable row level security;

create policy "brand_profiles_select_authenticated" on public.brand_profiles
  for select using (auth.uid() is not null);

create policy "brand_profiles_write_own" on public.brand_profiles
  for insert with check (user_id = auth.uid());

create policy "brand_profiles_update_own" on public.brand_profiles
  for update using (user_id = auth.uid() or public.is_admin());

alter table public.campaigns enable row level security;

create policy "campaigns_select" on public.campaigns
  for select using (
    brand_id = auth.uid()
    or public.is_admin()
    or (status = 'open' and public.current_user_role() = 'creator')
    or exists (
      select 1 from public.collaborations col
      where col.campaign_id = campaigns.id and col.creator_id = auth.uid()
    )
  );

create policy "campaigns_write_own" on public.campaigns
  for insert with check (brand_id = auth.uid());

create policy "campaigns_update_own" on public.campaigns
  for update using (brand_id = auth.uid() or public.is_admin());

alter table public.collaborations enable row level security;

create policy "collaborations_select_party" on public.collaborations
  for select using (creator_id = auth.uid() or brand_id = auth.uid() or public.is_admin());

create policy "collaborations_insert_brand" on public.collaborations
  for insert with check (brand_id = auth.uid() or public.is_admin());

create policy "collaborations_update_party" on public.collaborations
  for update using (creator_id = auth.uid() or brand_id = auth.uid() or public.is_admin());

alter table public.messages enable row level security;

create policy "messages_select_party" on public.messages
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.collaborations col
      where col.id = messages.collaboration_id
        and (col.creator_id = auth.uid() or col.brand_id = auth.uid())
    )
  );

create policy "messages_insert_party" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.collaborations col
      where col.id = messages.collaboration_id
        and (col.creator_id = auth.uid() or col.brand_id = auth.uid())
    )
  );

alter table public.reviews enable row level security;

create policy "reviews_select" on public.reviews
  for select using (
    public.is_admin()
    or rater_id = auth.uid()
    or ratee_id = auth.uid()
    or exists (
      select 1 from public.collaborations col
      where col.id = reviews.collaboration_id
        and (col.creator_id = auth.uid() or col.brand_id = auth.uid())
    )
  );

create policy "reviews_insert_party" on public.reviews
  for insert with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.collaborations col
      where col.id = reviews.collaboration_id
        and (col.creator_id = auth.uid() or col.brand_id = auth.uid())
        and col.status in ('approved', 'paid')
    )
  );
