-- A request for goods above 5 was refused with "Choose a valid social action." (29 Sep 2026). family-sharing-by-level.sql let a
-- request grow with the asker's level (5 per 10 levels: 35 at level 70), and harvest_social checks that, but the table kept its
-- first rule of 1 to 5, so the insert failed on the check. The function already holds the per-level limit; the table only
-- keeps a request from being empty.
alter table public.family_social_requests drop constraint if exists family_social_requests_quantity_check;
alter table public.family_social_requests add constraint family_social_requests_quantity_check check (quantity >= 1);
