-- The admin gives a pass from a farmer's Edit (22 Oct 2026, the owner: "dat ik ook Seizoenspas of Halloween pas kan geven"): the
-- Halloween Pass or a Season Pass (game/farm-state.js GIFT_PASSES), written into the farm's passPremium as if bought
-- (supabase/functions/farm-api/admin-service.js) and logged here. Run before the farm-api of this release (it writes the column).
alter table public.admin_grants add column if not exists pass text check (pass is null or char_length(pass) between 1 and 40);
select count(*) filter (where column_name='pass') pass_column from information_schema.columns where table_schema='public' and table_name='admin_grants';
