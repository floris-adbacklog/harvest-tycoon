-- Who the app's notifications could not reach (13 Oct 2026, the push fix). notify-hourly sends the hourly reminders to the farmers with
-- app push on (app_push_players) by player id; OneSignal names the ones it has no subscribed phone for (errors.invalid_aliases: on
-- 13 Oct 96 of the 180, most of them on Android 13 and newer, where the phone's yes comes after OneSignal's first sync; the apps now
-- send the link and the subscription again, android-app AppPush.java 1.3 and ios-app HarvestApp.swift 1.2).
-- notify-hourly (job.js, index.ts markAppPushReach) now keeps that per farmer in unreachable_at: the time OneSignal first named them,
-- cleared again the first time it takes them. The game reads its own row (src/app-push.js sync) and, on a phone that allows them, asks
-- the app to make the link anew (onesignallogin://login?id=...&fresh=1; older apps read only the id).
-- How many are reached now: select count(*) filter (where unreachable_at is null), count(*) from public.app_push_players where enabled;
-- On app_push_players, one row per farmer, so no new table: harvest_delete_account (delete-account.sql) already removes the row.
-- Players read their own row as before (select on the table, own row only); only notify-hourly (the service role) writes this column.
-- Release: in any order with notify-hourly and the site. Before this runs, notify-hourly logs that it cannot mark (nothing else
-- changes) and the game reads no mark. Safe to run again.
alter table public.app_push_players add column if not exists unreachable_at timestamptz;
comment on column public.app_push_players.unreachable_at is 'When OneSignal first named this farmer as not reachable (no subscribed phone) at an hourly reminder; null once it takes them again. Written by notify-hourly only.';
