-- ============================================================
-- FamilyVista — ALL-IN-ONE SUPABASE SETUP
-- ============================================================
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste this
--   entire file → Run.
--
-- You do NOT need to delete the tables manually first — the
-- script drops them itself, then recreates everything:
--   tables + triggers + indexes + RLS (fixed, share-aware)
--   + storage bucket + storage policies.
--
-- The RLS policies here are the FIXED versions: they match the
-- user's email straight from the JWT instead of subquerying
-- auth.users, so you will NOT get "permission denied for table
-- users" anymore. Safe to re-run any time.
-- ============================================================

-- ============ 0. TEAR DOWN OLD OBJECTS ============
drop table if exists public.album_shares cascade;
drop table if exists public.images cascade;
drop table if exists public.image_groups cascade;
drop table if exists public.albums cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.link_pending_shares() cascade;
drop function if exists public.accept_my_invites() cascade;
drop function if exists public.current_user_email() cascade;
drop function if exists public.my_shared_albums() cascade;

-- ============ 1. PROFILES (auto-created on signup) ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ============ 2. ALBUMS (2-level hierarchy: parent → sub-albums) ============
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.albums(id) on delete cascade,
  name text not null,
  description text not null default '',
  cover_image_url text,
  sort_order integer not null default 0,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ 3. IMAGE GROUPS ============
create table public.image_groups (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============ 4. IMAGES ============
create table public.images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  group_id uuid references public.image_groups(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  original_url text not null,
  thumbnail_url text,
  width integer,
  height integer,
  file_size bigint,
  mime_type text,
  caption text not null default '',
  sort_order integer not null default 0,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ 5. ALBUM SHARES ============
-- Each row = one person invited to view one album (read-only).
create table public.album_shares (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_email text not null,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',   -- pending | accepted
  created_at timestamptz not null default now()
);

-- ============ 6. INDEXES ============
create index idx_albums_user on public.albums(user_id);
create index idx_albums_parent on public.albums(parent_id);
create index idx_albums_deleted on public.albums(is_deleted);
create index idx_groups_album on public.image_groups(album_id);
create index idx_images_album on public.images(album_id);
create index idx_images_group on public.images(group_id);
create index idx_images_user on public.images(user_id);
create index idx_images_deleted on public.images(is_deleted);
create unique index idx_album_shares_unique on public.album_shares(album_id, shared_with_email);
create index idx_album_shares_owner on public.album_shares(owner_id);
create index idx_album_shares_with_user on public.album_shares(shared_with_user_id);
create index idx_album_shares_album on public.album_shares(album_id);

-- ============ 7. FUNCTIONS & TRIGGERS ============

-- Keep updated_at fresh
create function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger albums_updated_at
  before update on public.albums
  for each row execute function public.handle_updated_at();

create trigger images_updated_at
  before update on public.images
  for each row execute function public.handle_updated_at();

-- Auto-create a profile row whenever someone signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-accept pending invites when the invited person signs up
create function public.link_pending_shares()
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

create trigger on_auth_user_shares
  after insert on auth.users
  for each row execute function public.link_pending_shares();

-- Link invites for users who already existed before sharing shipped
create function public.accept_my_invites()
returns void as $$
begin
  update public.album_shares
     set shared_with_user_id = auth.uid(),
         status = 'accepted'
   where lower(shared_with_email) = lower((select email from auth.users where id = auth.uid()))
     and shared_with_user_id is null;
end;
$$ language plpgsql security definer;

-- Helper: current user's email straight from the JWT
-- (no auth.users access needed — this is the RLS fix)
create function public.current_user_email()
returns text as $$
  select lower(coalesce(
    nullif(current_setting('request.jwt.claims', true)::json ->> 'email', ''),
    ''
  ));
$$ language sql stable;

-- ============ 8. ROW LEVEL SECURITY ============
alter table public.profiles enable row level security;
alter table public.albums enable row level security;
alter table public.image_groups enable row level security;
alter table public.images enable row level security;
alter table public.album_shares enable row level security;

-- Profiles: owner full access
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Albums: owner can see + write
create policy "albums_owner_write" on public.albums
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Albums: people the album is shared with can read (JWT email match)
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

-- Images: owner can see + write
create policy "images_owner_write" on public.images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Images: readable through a shared album
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

-- Image groups: owner of the parent album can write
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

-- Image groups: readable through a shared album
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

-- Album shares: owner manages their invites
create policy "shares_owner_all" on public.album_shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Album shares: invitee can see invites addressed to them
create policy "shares_invitee_read" on public.album_shares
  for select using (
    shared_with_user_id = auth.uid()
    or shared_with_email = public.current_user_email()
  );

-- Helper: which albums are shared with me?
create function public.my_shared_albums()
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

-- ============ 9. STORAGE ============
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "images_public_read" on storage.objects;
drop policy if exists "images_owner_insert" on storage.objects;
drop policy if exists "images_owner_update" on storage.objects;
drop policy if exists "images_owner_delete" on storage.objects;

create policy "images_public_read" on storage.objects
  for select using (bucket_id = 'images');

create policy "images_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "images_owner_update" on storage.objects
  for update using (
    bucket_id = 'images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "images_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============ 10. REPAIR PROFILES FOR EXISTING USERS ============
-- Dropping the profiles table wiped existing profile rows, and the
-- signup trigger only fires for NEW users. This re-creates a profile
-- for every user who already exists in auth.users:
insert into public.profiles (id, email, full_name, avatar_url)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
