-- A partner's welcome (24 Oct 2026, the owner: "zet met zijn link een additionele 300 diamonds bij sign up" and "zet zijn naam in de
-- url"). Three things a partner can have, set by the admin here (the partner page does not change them):
--  alias            a second code for the link, with the partner's name in it (harvesttycoon.com/?ref=WARRIOROFLIGHT777); the first code
--                   keeps working. 4 to 20 letters or digits, never another partner's code or alias.
--  label            the name new farmers see on the sign-up card ("You're joining via Warrior of Light 777"); never the partner's own
--                   name, which stays private. Without a label the card shows nothing.
--  signup_diamonds  diamonds a brand-new farm gets on top when it starts with this partner's link (farm-api partner-service.js), with
--                   a note in Notifications. 0 is none.
-- Only farm-api and player-counts (the service role) read these; the sign-up card asks player-counts (?ref=CODE), which answers only
-- the label and the diamonds. Release: run this first, then farm-api and player-counts, then the site. Safe to run again.
alter table public.partners add column if not exists alias text;
alter table public.partners add column if not exists label text;
alter table public.partners add column if not exists signup_diamonds integer not null default 0;
do $do$
begin
 if not exists(select 1 from pg_constraint where conrelid='public.partners'::regclass and conname='partners_alias_check') then
  alter table public.partners add constraint partners_alias_check check (alias is null or alias ~ '^[A-Z0-9]{4,20}$');
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.partners'::regclass and conname='partners_label_check') then
  alter table public.partners add constraint partners_label_check check (label is null or char_length(label) between 1 and 40);
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.partners'::regclass and conname='partners_signup_diamonds_check') then
  alter table public.partners add constraint partners_signup_diamonds_check check (signup_diamonds between 0 and 1000);
 end if;
end
$do$;
create unique index if not exists partners_alias_unique on public.partners(alias) where alias is not null;
-- An alias is never someone's code (and a code never someone's alias: partner-api makes codes of 4 to 12, checked here once more).
create or replace function public.partners_alias_free() returns trigger language plpgsql set search_path to '' as $f$
begin
 if new.alias is not null and exists(select 1 from public.partners where code=new.alias and user_id<>new.user_id) then
  raise exception 'That alias is another partner''s code.' using errcode='23505';
 end if;
 if exists(select 1 from public.partners where alias=new.code and user_id<>new.user_id) then
  raise exception 'That code is another partner''s alias.' using errcode='23505';
 end if;
 return new;
end $f$;
drop trigger if exists partners_alias_free on public.partners;
create trigger partners_alias_free before insert or update of code, alias on public.partners for each row execute function public.partners_alias_free();

-- Warrior of Light 777 (Twitch), partner since 24 Oct 2026: his name in the link and 300 diamonds for every new farmer it brings.
update public.partners set alias='WARRIOROFLIGHT777', label='Warrior of Light 777', signup_diamonds=300 where code='PRESTO217';

select code, alias, label, signup_diamonds from public.partners where code='PRESTO217';
