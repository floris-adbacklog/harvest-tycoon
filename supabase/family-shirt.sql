-- The family shirt (21 Oct 2026, the owner: "Doe alles behalve 9; Kerstoutfit bewaren voor Kerst Pass", item 6): a family's leader or
-- a co-leader picks its cut (a T-shirt, a polo shirt or a hoodie: game/farmer-parts.js FAMILY_SHIRTS), worn by its members in My
-- farmer in the family's colour with its emblem. families has no jsonb column to keep it in (id, name, emblem, invite_code, is_open,
-- created_at, renamed_at, deleted_at, join_mode, min_level, idle_days, shared_at, read 21 Oct 2026), so it gets one of its own:
-- families.shirt, the cut's part id, or null (no shirt: every family to begin with).
-- harvest_family_commit writes a changed family row with an explicit list of columns: shirt joins that list (the one change to it,
-- patched in its live definition, so nothing else in it can differ from what runs). harvest_family_read and harvest_family_context
-- send every column of a family row already (to_jsonb / json_agg of the row): nothing to change there.
-- Release: run this first, then deploy farm-api, then push the site. Before it has run, farm-api refuses the family_shirt action
-- ("The family shirt is not open yet.", no shirt on the family's row) and the Family window shows no shirt section. One transaction:
-- any failed check rolls all of it back. Running it twice changes nothing. It writes no player data.
begin;
set local lock_timeout='5s';
do $guard$
declare want jsonb:='{"harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean)":["03b6dd5875190236a4034c0c8ce4f7b5","8c3514769a8d4e1fc0d4ed033349401c"]}'; fname text; have text;
begin
 for fname in select jsonb_object_keys(want) loop
  select md5(prosrc) into have from pg_proc where oid=to_regprocedure('public.'||fname);
  if not (want->fname ? coalesce(have,'')) then raise exception 'family-shirt.sql: public.% is not the one this file expects (md5 %); read the live definition first', fname, have; end if;
 end loop;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='families' and column_name='shirt' and data_type<>'text') then
  raise exception 'family-shirt.sql: families.shirt is there with another type'; end if;
end $guard$;

-- 1. The family's shirt: one of the three cuts, or null.
alter table public.families add column if not exists shirt text;
alter table public.families drop constraint if exists families_shirt_check;
alter table public.families add constraint families_shirt_check check (shirt is null or shirt in ('outwear_001','outwear_016','outwear_026'));

-- 2. harvest_family_commit writes it with the other columns of a changed family row (its live definition, one change).
do $patch$
declare body text; signature regprocedure:=to_regprocedure('public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean)');
begin
 if (select md5(prosrc) from pg_proc where oid=signature)='03b6dd5875190236a4034c0c8ce4f7b5' then
  body:=pg_get_functiondef(signature);
  if (length(body)-length(replace(body,'idle_days=excluded.idle_days;','')))/length('idle_days=excluded.idle_days;')<>1 then
   raise exception 'family-shirt.sql: the family row update is not where this file expects it'; end if;
  execute replace(body,'idle_days=excluded.idle_days;','idle_days=excluded.idle_days,shirt=excluded.shirt;');
 end if;
end $patch$;
revoke all on function public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean) to service_role;

-- 3. After-check, in the same transaction.
do $after$
declare signature regprocedure:=to_regprocedure('public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean)');
begin
 if (select md5(prosrc) from pg_proc where oid=signature) is distinct from '8c3514769a8d4e1fc0d4ed033349401c' then
  raise exception 'family-shirt.sql: harvest_family_commit did not come out as expected'; end if;
 if exists(select 1 from pg_proc p where p.oid=signature and (p.prosecdef or p.proconfig is distinct from array['search_path=""']
   or p.proacl::text is distinct from '{postgres=X/postgres,service_role=X/postgres}')) then raise exception 'family-shirt.sql: harvest_family_commit header or grant'; end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='families' and column_name='shirt' and data_type='text' and is_nullable='YES') then
  raise exception 'family-shirt.sql: families.shirt is missing'; end if;
 if exists(select 1 from public.families where shirt is not null and shirt not in ('outwear_001','outwear_016','outwear_026')) then
  raise exception 'family-shirt.sql: a family has a shirt that is no cut'; end if;
end $after$;
commit;

-- Check (read-only), after running this file:
-- select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='families' and column_name='shirt';
-- select md5(prosrc) from pg_proc where oid=to_regprocedure('public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean)');   -- 8c3514769a8d4e1fc0d4ed033349401c
-- select shirt, count(*) from public.families where deleted_at is null group by shirt;
