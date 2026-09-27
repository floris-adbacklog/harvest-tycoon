-- Family ranks (27 Sep 2026): besides the leader and members, co-leaders (at most 2, a rule in farm-state.js) and honorary members.
-- harvest_family_commit keeps checking that every family has exactly one leader and at most 10 farmers.
alter table public.family_members drop constraint if exists family_members_role_check;
alter table public.family_members add constraint family_members_role_check check (role in ('leader','coleader','honorary','member'));
