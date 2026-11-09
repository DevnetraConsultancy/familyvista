-- =====================================================================
-- FamilyVista — security & performance hardening (2026-11-08)
--
-- Safe to run more than once. Run AFTER all-in-one.sql on a new project.
--
-- Fixes:
--  1. CRITICAL  Any signed-in user could insert an album_shares row for an
--               album they don't own (owner_id = themselves) and then read
--               that album and all its photos. Share writes now require
--               album ownership, and share-based reads require the share to
--               have been created by the album's real owner.
--  2. CRITICAL  storage "images_public_read" let anyone with the public anon
--               key LIST every file of every user. Listing is now owner-only.
--               (Photos still load through their public URLs.)
--  3. HIGH      Photos could be inserted into / moved to someone else's
--               album; sub-albums could be attached under someone else's
--               album. Writes now require owning the target album.
--  4. MEDIUM    SECURITY DEFINER functions were callable by anon via
--               /rest/v1/rpc and had a mutable search_path.
--  5. PERF      RLS policies re-evaluated auth.uid() per row and stacked
--               several permissive SELECT policies; rewritten as one policy
--               per action with (select auth.uid()).
--  6. PRIVACY   Invitees could read the owner's trashed albums/photos.
--  7. PERF      album_stats view so the dashboard gets photo counts and
--               covers in one small query instead of every photo row.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Private helper schema (not exposed through the REST API)
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Caller owns the album.
create or replace function private.owns_album(aid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.albums a
    where a.id = aid and a.user_id = (select auth.uid())
  );
$$;

-- Album was shared with the caller *by its real owner* and accepted.
create or replace function private.is_shared_with_me(aid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.album_shares s
    join public.albums a on a.id = s.album_id
    where s.album_id = aid
      and s.owner_id = a.user_id
      and s.status = 'accepted'
      and (
        s.shared_with_user_id = (select auth.uid())
        or s.shared_with_email = (select public.current_user_email())
      )
  );
$$;

revoke all on function private.owns_album(uuid) from public, anon;
revoke all on function private.is_shared_with_me(uuid) from public, anon;
grant execute on function private.owns_album(uuid) to authenticated;
grant execute on function private.is_shared_with_me(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Existing functions: fixed search_path, no anonymous RPC access
-- ---------------------------------------------------------------------
alter function public.current_user_email() set search_path = '';
alter function public.handle_updated_at() set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.link_pending_shares() set search_path = '';
alter function public.accept_my_invites() set search_path = '';
alter function public.my_shared_albums() set search_path = '';

-- Trigger-only functions: nobody needs to call them over the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.link_pending_shares() from public, anon, authenticated;
revoke execute on function public.handle_updated_at() from public, anon, authenticated;
-- Unused by the app and bypasses RLS.
revoke execute on function public.my_shared_albums() from public, anon, authenticated;
-- Used by signed-in users only.
revoke execute on function public.accept_my_invites() from public, anon;
grant execute on function public.accept_my_invites() to authenticated;
revoke execute on function public.current_user_email() from public, anon;
grant execute on function public.current_user_email() to authenticated;

-- ---------------------------------------------------------------------
-- Data constraints
-- ---------------------------------------------------------------------
alter table public.album_shares drop constraint if exists album_shares_status_check;
alter table public.album_shares
  add constraint album_shares_status_check check (status in ('pending', 'accepted'));

alter table public.album_shares drop constraint if exists album_shares_email_lower_check;
alter table public.album_shares
  add constraint album_shares_email_lower_check check (shared_with_email = lower(shared_with_email));

alter table public.albums drop constraint if exists albums_not_own_parent_check;
alter table public.albums
  add constraint albums_not_own_parent_check check (parent_id is null or parent_id <> id);

-- ---------------------------------------------------------------------
-- albums
-- ---------------------------------------------------------------------
drop policy if exists albums_owner_or_shared on public.albums;
drop policy if exists albums_owner_write on public.albums;
drop policy if exists albums_select on public.albums;
drop policy if exists albums_insert on public.albums;
drop policy if exists albums_update on public.albums;
drop policy if exists albums_delete on public.albums;

create policy albums_select on public.albums for select to authenticated
  -- Invitees never see the owner's trash.
  using (user_id = (select auth.uid()) or (not is_deleted and private.is_shared_with_me(id)));
create policy albums_insert on public.albums for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (parent_id is null or private.owns_album(parent_id))
  );
create policy albums_update on public.albums for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (parent_id is null or private.owns_album(parent_id))
  );
create policy albums_delete on public.albums for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- images
-- ---------------------------------------------------------------------
drop policy if exists images_owner_write on public.images;
drop policy if exists images_shared_read on public.images;
drop policy if exists images_select on public.images;
drop policy if exists images_insert on public.images;
drop policy if exists images_update on public.images;
drop policy if exists images_delete on public.images;

create policy images_select on public.images for select to authenticated
  using (user_id = (select auth.uid()) or (not is_deleted and private.is_shared_with_me(album_id)));
create policy images_insert on public.images for insert to authenticated
  with check (user_id = (select auth.uid()) and private.owns_album(album_id));
create policy images_update on public.images for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.owns_album(album_id));
create policy images_delete on public.images for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- image_groups
-- ---------------------------------------------------------------------
drop policy if exists groups_owner_write on public.image_groups;
drop policy if exists groups_shared_read on public.image_groups;
drop policy if exists groups_select on public.image_groups;
drop policy if exists groups_insert on public.image_groups;
drop policy if exists groups_update on public.image_groups;
drop policy if exists groups_delete on public.image_groups;

create policy groups_select on public.image_groups for select to authenticated
  using (private.owns_album(album_id) or private.is_shared_with_me(album_id));
create policy groups_insert on public.image_groups for insert to authenticated
  with check (private.owns_album(album_id));
create policy groups_update on public.image_groups for update to authenticated
  using (private.owns_album(album_id))
  with check (private.owns_album(album_id));
create policy groups_delete on public.image_groups for delete to authenticated
  using (private.owns_album(album_id));

-- ---------------------------------------------------------------------
-- album_shares
-- ---------------------------------------------------------------------
drop policy if exists shares_owner_all on public.album_shares;
drop policy if exists shares_invitee_read on public.album_shares;
drop policy if exists shares_owner_select on public.album_shares;
drop policy if exists shares_owner_insert on public.album_shares;
drop policy if exists shares_owner_update on public.album_shares;
drop policy if exists shares_owner_delete on public.album_shares;
drop policy if exists shares_select on public.album_shares;
drop policy if exists shares_insert on public.album_shares;
drop policy if exists shares_update on public.album_shares;
drop policy if exists shares_delete on public.album_shares;

create policy shares_select on public.album_shares for select to authenticated
  using (
    owner_id = (select auth.uid())
    or shared_with_user_id = (select auth.uid())
    or shared_with_email = (select public.current_user_email())
  );
create policy shares_insert on public.album_shares for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.owns_album(album_id));
create policy shares_update on public.album_shares for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and private.owns_album(album_id));
create policy shares_delete on public.album_shares for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists profiles_owner_all on public.profiles;
drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Storage: owner-only listing; photos are still served by public URL
-- ---------------------------------------------------------------------
drop policy if exists images_public_read on storage.objects;
drop policy if exists images_owner_read on storage.objects;
drop policy if exists images_owner_insert on storage.objects;
drop policy if exists images_owner_update on storage.objects;
drop policy if exists images_owner_delete on storage.objects;

create policy images_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy images_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy images_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy images_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Reject absurdly large uploads at the storage layer (50 MB per file).
update storage.buckets set file_size_limit = 52428800 where id = 'images';

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
-- Album page: photos of one album in display order, trash excluded.
create index if not exists idx_images_album_order
  on public.images (album_id, sort_order) where not is_deleted;
-- Invite lookups by email (accept_my_invites, sign-up trigger, RLS).
create index if not exists idx_album_shares_email
  on public.album_shares (shared_with_email);

-- ---------------------------------------------------------------------
-- Per-album photo count + cover, respecting the caller's RLS
-- ---------------------------------------------------------------------
create or replace view public.album_stats
with (security_invoker = true) as
select
  album_id,
  count(*)::int as image_count,
  (array_agg(coalesce(thumbnail_url, original_url) order by sort_order, created_at))[1] as cover_url
from public.images
where not is_deleted
group by album_id;

revoke all on public.album_stats from public, anon;
grant select on public.album_stats to authenticated;

commit;
