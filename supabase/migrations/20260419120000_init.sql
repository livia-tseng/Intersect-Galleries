-- Intersect Galleries: profiles, portfolio items, auth trigger, storage bucket + policies.
-- Run via Supabase CLI (`supabase db push`) or paste into SQL Editor in the dashboard.

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  location text not null default '',
  website text not null default '',
  avatar_url text,
  cover_image_url text,
  portfolio_template text not null default 'minimalist'
    check (portfolio_template in ('minimalist', 'bold', 'artsy')),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_lower on public.profiles (lower(username));

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled',
  category text not null default 'Mixed Media',
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_items_user_sort on public.portfolio_items (user_id, sort_order);

alter table public.profiles enable row level security;
alter table public.portfolio_items enable row level security;

create policy "profiles_select_public" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "portfolio_items_select_public" on public.portfolio_items for select using (true);
create policy "portfolio_items_insert_own" on public.portfolio_items for insert with check (auth.uid() = user_id);
create policy "portfolio_items_update_own" on public.portfolio_items for update using (auth.uid() = user_id);
create policy "portfolio_items_delete_own" on public.portfolio_items for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  un text;
  dn text;
begin
  un := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  dn := trim(coalesce(new.raw_user_meta_data->>'display_name', ''));

  if un = '' then
    raise exception 'username_required_in_user_metadata';
  end if;

  if dn = '' then
    dn := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (id, username, display_name, bio)
  values (new.id, un, dn, '');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage: public bucket for portfolio media (paths: {user_id}/...)
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

create policy "portfolio_objects_select_public"
  on storage.objects for select
  using (bucket_id = 'portfolio');

create policy "portfolio_objects_insert_own_prefix"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "portfolio_objects_update_own_prefix"
  on storage.objects for update
  using (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "portfolio_objects_delete_own_prefix"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );
