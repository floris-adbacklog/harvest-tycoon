-- Apply once in the SQL Editor of the Supabase project used by Harvest Tycoon.
-- Only this small row is shared. Farm layouts, inventory and jobs never enter this database.
create table if not exists public.player_stats (
  player_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$'),
  currency integer not null default 180 check (currency >= 0),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);
create unique index if not exists player_stats_username_unique on public.player_stats (lower(username));
create index if not exists player_stats_currency_ranking on public.player_stats (currency desc, player_id);
alter table public.player_stats enable row level security;
revoke all on public.player_stats from anon;
grant select, insert, update on public.player_stats to authenticated;
drop policy if exists "Players can read leaderboard" on public.player_stats;
create policy "Players can read leaderboard" on public.player_stats for select to authenticated
using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
drop policy if exists "Players can insert own stats" on public.player_stats;
create policy "Players can insert own stats" on public.player_stats for insert to authenticated
with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false and (select auth.uid()) = player_id);
drop policy if exists "Players can update own stats" on public.player_stats;
create policy "Players can update own stats" on public.player_stats for update to authenticated
using (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false and (select auth.uid()) = player_id)
with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false and (select auth.uid()) = player_id);
create or replace function public.stamp_player_stats() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists stamp_player_stats on public.player_stats;
create trigger stamp_player_stats before insert or update on public.player_stats for each row execute function public.stamp_player_stats();
