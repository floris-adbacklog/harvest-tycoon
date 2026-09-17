-- Applied as harvest_server_owned_stats. The Edge Function atomically updates
-- scores when a farm action commits. Browsers may only read the leaderboard.
drop policy if exists "Players can insert own stats" on public.player_stats;
drop policy if exists "Players can update own stats" on public.player_stats;
revoke insert,update,delete on public.player_stats from anon,authenticated;
grant select on public.player_stats to authenticated;
