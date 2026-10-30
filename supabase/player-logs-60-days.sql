-- The farm log keeps 60 days (30 Oct 2026, the owner: "bewaar 60 dagen"), was 90: the nightly job is replaced (same name), and the
-- lines older than 60 days go once now. The day's totals (farm-api player-log.js tallyDay) need nothing here: their lines are
-- category 'account', action 'day_total'. Safe to run again.
select cron.schedule('harvest-player-log-cleanup','23 3 * * *',$c$delete from public.player_logs where created_at<now()-interval '60 days'$c$);
delete from public.player_logs where created_at<now()-interval '60 days';
