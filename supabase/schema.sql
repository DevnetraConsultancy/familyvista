-- ============================================================
-- FamilyVista — Supabase Schema
-- Paste this whole file into: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ============ PROFILES (auto-created on signup) ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ============ ALBUMS (2-level hierarchy: parent → sub-albums) ============
create table if not exists public.albums (
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

-- ============ IMAGE GROUPS ============
create table if not exists public.image_groups (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============ IMAGES ============
create table if not exists public.images (
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

-- ============ UPDATED_AT TRIGGER ============
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists albums_updated_at on public.albums;
create trigger albums_updated_at
  before update on public.albums
  for each row execute function public.handle_updated_at();

drop trigger if exists images_updated_at on public.images;
create trigger images_updated_at
  before update on public.images
  for each row execute function public.handle_updated_at();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
create or replace function public.handle_new_user()
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ INDEXES ============
create index if not exists idx_albums_user on public.albums(user_id);
create index if not exists idx_albums_parent on public.albums(parent_id);
create index if not exists idx_albums_deleted on public.albums(is_deleted);
create index if not exists idx_groups_album on public.image_groups(album_id);
create index if not exists idx_images_album on public.images(album_id);
create index if not exists idx_images_group on public.images(group_id);
create index if not exists idx_images_user on public.images(user_id);
create index if not exists idx_images_deleted on public.images(is_deleted);

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles enable row level security;
alter table public.albums enable row level security;
alter table public.image_groups enable row level security;
alter table public.images enable row level security;

-- Profiles: owner full access
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Albums: owner full access (strict ownership)
create policy "albums_owner_all" on public.albums
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Groups: owner via parent album
create policy "groups_owner_all" on public.image_groups
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

-- Images: owner (direct check for speed)
create policy "images_owner_all" on public.images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ STORAGE ============
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Storage policies
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
