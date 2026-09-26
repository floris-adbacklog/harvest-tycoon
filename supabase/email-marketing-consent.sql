-- News and offers by email (26 Sep 2026): only with the farmer's own, separate yes, a switch that starts off (on the Confirm your
-- email screen and in Settings, Reminders). The moment it was last switched on or off is kept as the record of that choice.
-- The same switch, or the unsubscribe link in any email, withdraws it. Nothing sends these emails yet.
alter table public.notification_settings add column if not exists email_marketing boolean not null default false;
alter table public.notification_settings add column if not exists marketing_changed_at timestamptz;

-- The save function gains the switch as an optional last argument (a game that does not send it leaves it as it is).
drop function if exists public.notification_save(boolean,boolean,boolean,boolean,integer,text,boolean);
create or replace function public.notification_save(p_push_crops boolean, p_push_production boolean, p_push_daily boolean, p_email_digest boolean, p_digest_hour integer, p_timezone text, p_push_messages boolean default null, p_email_marketing boolean default null)
returns void language plpgsql security definer set search_path to '' as $f$
declare v_player uuid := (select auth.uid());
begin
 if v_player is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Sign in to change reminders.' using errcode = '28000'; end if;
 if p_digest_hour is null or p_digest_hour < 0 or p_digest_hour > 23 then raise exception 'Choose an hour between 0 and 23.' using errcode = '22023'; end if;
 if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then raise exception 'Unknown time zone.' using errcode = '22023'; end if;
 insert into public.notification_settings as s (player_id, push_crops, push_production, push_daily, email_digest, digest_hour, timezone, push_messages, email_marketing, marketing_changed_at)
  values (v_player, coalesce(p_push_crops, false), coalesce(p_push_production, false), coalesce(p_push_daily, false), coalesce(p_email_digest, false), p_digest_hour, p_timezone, coalesce(p_push_messages, false),
   coalesce(p_email_marketing, false), case when p_email_marketing then now() end)
  on conflict (player_id) do update set push_crops = excluded.push_crops, push_production = excluded.push_production, push_daily = excluded.push_daily,
   email_digest = excluded.email_digest, digest_hour = excluded.digest_hour, timezone = excluded.timezone,
   push_messages = coalesce(p_push_messages, s.push_messages),
   email_marketing = coalesce(p_email_marketing, s.email_marketing),
   marketing_changed_at = case when p_email_marketing is not null and p_email_marketing is distinct from s.email_marketing then now() else s.marketing_changed_at end,
   updated_at = now();
end $f$;
revoke all on function public.notification_save(boolean,boolean,boolean,boolean,integer,text,boolean,boolean) from public, anon;
grant execute on function public.notification_save(boolean,boolean,boolean,boolean,integer,text,boolean,boolean) to authenticated;
