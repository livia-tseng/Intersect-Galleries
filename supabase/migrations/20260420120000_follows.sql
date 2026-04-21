-- Follow relationships: follower follows following (both reference profiles / auth users)

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx on public.follows (follower_id);

alter table public.follows enable row level security;

-- Anyone can read follows (for follower counts on public profiles)
create policy "follows_select_public" on public.follows for select using (true);

-- Only the follower can create or delete their follow row
create policy "follows_insert_own" on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "follows_delete_own" on public.follows for delete
  using (auth.uid() = follower_id);

-- Batch stats for many profiles (used by Explore); SECURITY DEFINER keeps one efficient query
create or replace function public.follow_stats_batch(ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  if ids is null or array_length(ids, 1) is null then
    return '{"followers":{},"following":{}}'::jsonb;
  end if;

  select jsonb_build_object(
    'followers', coalesce((
      select jsonb_object_agg(following_id::text, c)
      from (
        select following_id, count(*)::int as c
        from public.follows
        where following_id = any(ids)
        group by following_id
      ) t
    ), '{}'::jsonb),
    'following', coalesce((
      select jsonb_object_agg(follower_id::text, c)
      from (
        select follower_id, count(*)::int as c
        from public.follows
        where follower_id = any(ids)
        group by follower_id
      ) t
    ), '{}'::jsonb)
  ) into r;

  return r;
end;
$$;

revoke all on function public.follow_stats_batch(uuid[]) from public;
grant execute on function public.follow_stats_batch(uuid[]) to anon, authenticated;
