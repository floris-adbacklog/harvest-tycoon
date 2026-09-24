-- Security hardening (24 Sep 2026), after a review of every table, policy and function. Re-runnable. Nothing a player can do
-- changes: every table already has RLS on, and these tables are only written by farm-api / notify-hourly (service_role) or by
-- the notification_* functions (security definer, they run as their owner).
-- 1. Table rights: the signed-in and anonymous roles keep only what a policy needs (reading their own reminder settings and
--    push devices). RLS already refused the rest, because none of these tables has a policy for it; this removes the grants
--    too, so a policy added by mistake later cannot open them.
revoke all on public.admin_grants, public.notification_job, public.notification_state from anon, authenticated;
revoke all on public.notification_settings, public.push_subscriptions from anon, authenticated;
grant select on public.notification_settings, public.push_subscriptions to authenticated;

-- 2. A push device must be a real browser push service (https, a known host, at most 1,000 characters): notify-hourly sends
--    to this address, so it may not point anywhere else. Otherwise the same as the live function.
create or replace function public.notification_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_player uuid := (select auth.uid()); v_host text;
begin
 if v_player is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Sign in to turn on notifications.' using errcode = '28000'; end if;
 v_host := lower(split_part(coalesce(p_endpoint,''), '/', 3));
 if p_endpoint is null or length(p_endpoint) > 1000 or left(p_endpoint, 8) <> 'https://'
  or not (v_host = 'fcm.googleapis.com' or v_host = 'android.googleapis.com' or v_host = 'updates.push.services.mozilla.com'
   or v_host = 'web.push.apple.com' or v_host like '%.push.apple.com' or v_host like '%.notify.windows.com')
  or coalesce(length(p_p256dh), 0) not between 20 and 200 or coalesce(length(p_auth), 0) not between 8 and 100
 then raise exception 'This device cannot receive notifications.' using errcode = '22023'; end if;
 insert into public.push_subscriptions as p (player_id, endpoint, p256dh, auth, user_agent)
  values (v_player, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set player_id = excluded.player_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, failures = 0;
 delete from public.push_subscriptions where player_id = v_player and id not in (select id from public.push_subscriptions where player_id = v_player order by created_at desc limit 5);
end $function$;

-- 3. The referral function names every table with its schema, so it can run with an empty search path like the others.
alter function public.harvest_referral_qualify(uuid,bigint,integer,integer) set search_path to '';
