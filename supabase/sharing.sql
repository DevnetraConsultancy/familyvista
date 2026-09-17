-- ============================================================
-- FamilyVista — Album Sharing (run AFTER schema.sql)
-- v2 — uses JWT email matching. Do NOT subquery auth.users in RLS:
--       that fails with "permission denied for table users".
-- ============================================================

-- JWT email helper (safe for RLS, no special privileges needed)
create or replace function public.current_user_email()
returns text as $$
  select lower(coalesce(
    nullif(current_setting('request.jwt.claims', true)::json ->> 'email', ''),
    ''
  ));
$$ language sql stable;

-- ============ ALBUM SHARES TABLE ============
-- Each row = one person invited to view one album (read-only).
create table if not exists public.album_shares (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_email text not null,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',   -- pending | accepted
  created_at timestamptz not null default now()
);

create unique index if not exists idx_album_shares_unique
  on public.album_shares(album_id, shared_with_email);
create index if not exists idx_album_shares_owner on public.album_shares(owner_id);
create index if not exists idx_album_shares_with_user on public.album_shares(shared_with_user_id);
create index if not exists idx_album_shares_album on public.album_shares(album_id);

-- ============ AUTO-ACCEPT PENDING INVITES ON SIGNUP ============
create or replace function public.link_pending_shares()
returns trigger as $$
begin
  update public.album_shares
     set shared_with_user_id = new.id,
         status = 'accepted'
   where lower(shared_with_email) = lower(new.email)
     and shared_with_user_id is null;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_shares on auth.users;
create trigger on_auth_user_shares
  after insert on auth.users
  for each row execute function public.link_pending_shares();

-- Link invites for users who already existed before sharing shipped.
create or replace function public.accept_my_invites()
returns void as $$
begin
  update public.album_shares
     set shared_with_user_id = auth.uid(),
         status = 'accepted'
   where lower(shared_with_email) = lower((select email from auth.users where id = auth.uid()))
     and shared_with_user_id is null;
end;
$$ language plpgsql security definer;

-- ============ ROW LEVEL SECURITY ============
alter table public.album_shares enable row level security;

create policy "shares_owner_all" on public.album_shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "shares_invitee_read" on public.album_shares
  for select using (
    shared_with_user_id = auth.uid()
    or shared_with_email = public.current_user_email()
  );

-- ============ SHARE-AWARE POLICIES ============
drop policy if exists "albums_owner_all" on public.albums;
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

create policy "albums_owner_write" on public.albums
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "images_owner_all" on public.images;
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

create policy "images_owner_write" on public.images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "groups_owner_all" on public.image_groups;
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

-- ============ HELPER: which albums are shared with me? ============
create or replace function public.my_shared_albums()
returns setof public.albums as $$
  select a.* from public.albums a
  where exists (
    select 1 from public.album_shares s
    where s.album_id = a.id
      and s.status = 'accepted'
      and (
        s.shared_with_user_id = auth.uid()
        or s.shared_with_email = public.current_user_email()
      )
  );
$$ language sql security definer;
