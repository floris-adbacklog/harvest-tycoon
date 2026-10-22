-- Reload everyone now (22 Oct 2026): the time the admin last pressed the button in the Admin dashboard (Settings). One row, like
-- event_config and chat_config: only postgres and service_role (farm-api, supabase/functions/farm-api/reload-service.js) read and
-- write it; no policies, nothing for anon or authenticated. No function. Not a player table (set_by is the admin's id and goes to
-- null if that account is ever deleted), so the account delete function does not need it.
-- Run once, before farm-api with reload-service.js goes live (farm-api reads nothing until it exists, and the button says it failed).
create table if not exists public.site_reload(
 id boolean primary key default true check (id),
 reload_after timestamptz,
 set_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
insert into public.site_reload(id) values (true) on conflict do nothing;
alter table public.site_reload enable row level security;
revoke all on public.site_reload from public, anon, authenticated;
grant select, insert, update on public.site_reload to service_role;

-- After-check: the row is there, row level security is on, and neither anon nor authenticated can read or change it.
do $$
begin
 if not exists(select 1 from public.site_reload where id) then raise exception 'site_reload has no row'; end if;
 if not (select relrowsecurity from pg_class where oid='public.site_reload'::regclass) then raise exception 'site_reload: RLS is off'; end if;
 if has_table_privilege('anon','public.site_reload','select,insert,update,delete')
  or has_table_privilege('authenticated','public.site_reload','select,insert,update,delete')
  then raise exception 'site_reload is open to anon or authenticated'; end if;
 if not has_table_privilege('service_role','public.site_reload','select,insert,update') then raise exception 'service_role cannot use site_reload'; end if;
end $$;
select id, reload_after, set_by, updated_at from public.site_reload;
