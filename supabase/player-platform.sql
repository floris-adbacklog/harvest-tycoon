-- On what each farmer plays (13 Oct 2026, the measurement package). farm-api saves it with every farm load next to the country,
-- device and language (admin-analytics-service.js recordSeen and platformOf), in player_seen.platform: where the farm was last opened.
--  web          a browser tab
--  pwa          the web app opened from the home screen (display-mode standalone, or an iPhone's Home Screen app)
--  frame        the website inside another site, as on itch.io
--  android_app  our app from Google Play; galaxy_app the same app from the Galaxy Store; ios_app our iPhone app
--  crazygames, kongregate, discord: a portal's own page
-- Our apps are told by their user agent, the portals by their own page or account, the rest by the page itself. A load that cannot
-- tell (a game tab from before this) keeps what was saved. Like the rest of the row, only the latest visit is kept.
-- On player_seen, one row per farmer, so no new table: harvest_delete_account (delete-account.sql) already removes the row, and nothing
-- goes into the farm's saved state. Only farm-api (the service role) reads or writes the table, as before.
-- Release: run this first, then farm-api (it writes the column: without it the whole row of that load is not saved), then the site.
-- Safe to run again.
alter table public.player_seen add column if not exists platform text;
do $do$
begin
 if not exists(select 1 from pg_constraint where conrelid='public.player_seen'::regclass and conname='player_seen_platform_check') then
  alter table public.player_seen add constraint player_seen_platform_check
   check (platform in ('web','pwa','frame','android_app','galaxy_app','ios_app','crazygames','kongregate','discord'));
 end if;
end
$do$;
