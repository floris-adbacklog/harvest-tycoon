-- Run only when player_stats does not exist. Existing tables are never overwritten.
begin;
create table public.player_stats (
 player_id uuid primary key references auth.users(id) on delete cascade,
 username text not null,
 currency integer not null default 0 check (currency >= 0),
 level integer not null default 1 check (level >= 1),
 updated_at timestamptz not null default now()
);
create index player_stats_ranking_idx on public.player_stats (currency desc, player_id);
alter table public.player_stats enable row level security;
revoke all on table public.player_stats from public, anon, authenticated;
grant select, insert, update on table public.player_stats to authenticated;
create policy "Players can read leaderboard" on public.player_stats for select to authenticated using (true);
create policy "Players can insert own stats" on public.player_stats for insert to authenticated with check ((select auth.uid()) = player_id);
create policy "Players can update own stats" on public.player_stats for update to authenticated using ((select auth.uid()) = player_id) with check ((select auth.uid()) = player_id);
create function public.harvest_stamp_player_stats() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 new.updated_at := now();
 return new;
end;
$$;
create trigger player_stats_updated_at before insert or update on public.player_stats for each row execute function public.harvest_stamp_player_stats();
commit;
