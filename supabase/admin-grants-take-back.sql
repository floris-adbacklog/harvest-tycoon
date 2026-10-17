-- The admin can take diamonds back (17 Oct 2026, the owner: farmers cheat with Invite a friend). A minus in the admin gift's Diamonds
-- (src/player-profiles.js, farm-api admin-service.js) takes them back, never below 0, and is logged here as a row with negative diamonds.
-- The other amounts stay gifts only. Safe to run again.
alter table public.admin_grants drop constraint if exists admin_grants_diamonds_check;
alter table public.admin_grants add constraint admin_grants_diamonds_check check (diamonds between -20000 and 20000);
