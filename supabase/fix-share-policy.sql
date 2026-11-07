-- ============================================================
-- FamilyVista — SECURITY FIX for album sharing
-- ============================================================
-- Problem: the old "shares_owner_all" policy only checked
--   auth.uid() = owner_id
-- so ANY signed-in user could insert an album_shares row with
-- their own id as owner_id and ANY album_id, then read that
-- album (and its photos) through the "shared" select policies.
--
-- Fix: the insert/update must also prove the caller owns the
-- album being shared. Safe to re-run.
-- ============================================================

drop policy if exists "shares_owner_all" on public.album_shares;

create policy "shares_owner_select" on public.album_shares
  for select using (auth.uid() = owner_id);

create policy "shares_owner_insert" on public.album_shares
  for insert with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.albums a
      where a.id = album_shares.album_id
        and a.user_id = auth.uid()
    )
  );

create policy "shares_owner_update" on public.album_shares
  for update using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.albums a
      where a.id = album_shares.album_id
        and a.user_id = auth.uid()
    )
  );

create policy "shares_owner_delete" on public.album_shares
  for delete using (auth.uid() = owner_id);

-- Remove any rows that slipped through the old policy.
delete from public.album_shares s
where not exists (
  select 1 from public.albums a
  where a.id = s.album_id and a.user_id = s.owner_id
);
