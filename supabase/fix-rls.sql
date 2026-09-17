-- ============================================================
-- FamilyVista — RLS FIX (run this in Supabase SQL Editor → Run)
-- Fixes: "permission denied for table users" on every query.
--
-- Cause: policies that subquery auth.users fail, because RLS runs
-- as the anon/authenticated role which cannot read auth.users.
-- This script replaces them with JWT-based email matching that
-- needs no special privileges.
-- ============================================================

-- Helper: current user's email straight from the JWT (no auth.users access)
create or replace function public.current_user_email()
returns text as $$
  select lower(coalesce(
    nullif(current_setting('request.jwt.claims', true)::json ->> 'email', ''),
    ''
  ));
$$ language sql stable;

-- ============ ALBUM SHARED ============
drop policy if exists "albums_owner_or_shared" on public.albums;
create policy "albums_owner_or_shared" on public.albums
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.album_shares s
      where s.album_id = albums.id
        and s.status = 'accepted'
        and (
          s.shared_with_user_id = auth.uid()
          or s.shared_with_email = public.current_user_email()
        )
    )
  );

drop policy if exists "albums_owner_write" on public.albums;
create policy "albums_owner_write" on public.albums
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ IMAGES ============
drop policy if exists "images_shared_read" on public.images;
create policy "images_shared_read" on public.images
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.albums a
      join public.album_shares s on s.album_id = a.id
      where a.id = images.album_id
        and s.status = 'accepted'
        and (
          s.shared_with_user_id = auth.uid()
          or s.shared_with_email = public.current_user_email()
        )
    )
  );

drop policy if exists "images_owner_write" on public.images;
create policy "images_owner_write" on public.images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ IMAGE GROUPS ============
drop policy if exists "groups_shared_read" on public.image_groups;
create policy "groups_shared_read" on public.image_groups
  for select using (
    exists (
      select 1 from public.albums a
      where a.id = image_groups.album_id
        and (
          a.user_id = auth.uid()
          or exists (
            select 1 from public.album_shares s
            where s.album_id = a.id
              and s.status = 'accepted'
              and (
                s.shared_with_user_id = auth.uid()
                or s.shared_with_email = public.current_user_email()
              )
          )
        )
    )
  );

drop policy if exists "groups_owner_write" on public.image_groups;
create policy "groups_owner_write" on public.image_groups
  for all using (
    exists (
      select 1 from public.albums a
      where a.id = image_groups.album_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.albums a
      where a.id = image_groups.album_id and a.user_id = auth.uid()
    )
  );

-- ============ ALBUM SHARES ============
drop policy if exists "shares_owner_all" on public.album_shares;
create policy "shares_owner_all" on public.album_shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "shares_invitee_read" on public.album_shares;
create policy "shares_invitee_read" on public.album_shares
  for select using (
    shared_with_user_id = auth.uid()
    or shared_with_email = public.current_user_email()
  );

-- ============ REPAIR ANY MISSED PROFILE ROWS ============
-- If the profile trigger missed your account (e.g. signed up before
-- the trigger existed), create it now:
insert into public.profiles (id, email, full_name, avatar_url)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
