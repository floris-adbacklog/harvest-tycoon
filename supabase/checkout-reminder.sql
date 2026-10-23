-- One reminder email for a website purchase started but not paid (23 Oct 2026, the owner's option 5; supabase/functions/checkout-reminder).
-- Only for farmers who said yes to news and offers by email (notification_settings.email_marketing, with a confirmed real address:
-- news_mail_ok, the news email's own rule), never anyone else. One email per purchase at most, one per farmer per 30 days at most, no
-- discount or bonus in it. Nothing leaves our database except what the news email already sends Resend (the address, the email).
-- Run this whole file first, then deploy the functions (supabase/checkout-recovery-RELEASE.md). Until checkout-reminder is deployed the
-- hourly call only gets a 404; nothing else changes. Safe to run again.

-- 1. The mark on the purchase itself: when its reminder email was claimed (before it goes, so it never goes twice) and what Resend said.
-- On the purchase row, so the account deletion (supabase/delete-account.sql) needs nothing new: the row loses its farmer there as before.
alter table public.harvest_purchases add column if not exists reminder_mailed_at timestamptz;
alter table public.harvest_purchases add column if not exists reminder_mail_note text;
-- The catalogue's look-up of a farmer's last day (diamond-checkout, unfinished) and the hourly pick below.
create index if not exists harvest_purchases_player_created on public.harvest_purchases(player_id, created_at desc);
create index if not exists harvest_purchases_open_stripe on public.harvest_purchases(created_at) where store='stripe' and status in ('pending','expired');

-- 2. The rule, in one place: whether this purchase's reminder email is due now.
--  - a website (Stripe) purchase, live, still pending or expired, of a farmer (not a deleted account), never reminded;
--  - started 1 to 24 hours ago (not while the farmer may still be on the payment page);
--  - the farmer's latest website purchase (a newer one, even a minute old, waits for its own turn);
--  - nothing paid since it was started, in any store (Stripe, Google Play, the App Store, Kreds);
--  - no reminder email to this farmer in the last 30 days;
--  - a farmer who may get news and offers by email now (news_mail_ok: said yes, confirmed real address, no portal or guest account).
create or replace function public.checkout_reminder_due(p_purchase uuid)
 returns boolean language sql stable security definer set search_path to '' as $function$
 select exists(
  select 1 from public.harvest_purchases p
  where p.id=p_purchase and p.store='stripe' and p.livemode and p.status in ('pending','expired') and p.player_id is not null
   and p.reminder_mailed_at is null
   and p.created_at>now()-interval '24 hours' and p.created_at<=now()-interval '1 hour'
   and not exists(select 1 from public.harvest_purchases n where n.player_id=p.player_id and n.store='stripe' and n.created_at>p.created_at)
   and not exists(select 1 from public.harvest_purchases c where c.player_id=p.player_id and c.status in ('credited','test_paid') and c.created_at>=p.created_at)
   and not exists(select 1 from public.harvest_purchases r where r.player_id=p.player_id and r.reminder_mailed_at>now()-interval '30 days')
   and public.news_mail_ok(p.player_id))
$function$;
revoke all on function public.checkout_reminder_due(uuid) from public, anon, authenticated;

-- 3. The purchases due now, oldest first, at most p_limit (20 a run; a handful a day is expected), with what the function needs to know
-- whether the pack is still for sale: the Starter Pack week and the special offer still running (an hour left at least). Never an address.
create or replace function public.checkout_reminder_candidates(p_limit integer default 20)
 returns table(purchase_id uuid, pack text, diamonds integer, pass_id text, starter_running boolean, offer_running boolean, created_at timestamptz)
 language sql stable security definer set search_path to '' as $function$
 select p.id, p.pack, p.diamonds, p.pass_id,
  case when p.pack='starter' then coalesce(p.starter_expires_at>now()+interval '1 hour',false) end,
  case when p.pack='offer' then exists(select 1 from public.harvest_offers o where o.id=p.offer_id and o.stopped_at is null and o.starts_at<=now() and o.ends_at>now()+interval '1 hour') end,
  p.created_at
 from public.harvest_purchases p
 where p.store='stripe' and p.livemode and p.status in ('pending','expired') and p.reminder_mailed_at is null
  and p.created_at>now()-interval '24 hours' and p.created_at<=now()-interval '1 hour'
  and public.checkout_reminder_due(p.id)
 order by p.created_at
 limit least(greatest(coalesce(p_limit,20),1),50)
$function$;
revoke all on function public.checkout_reminder_candidates(integer) from public, anon, authenticated;
grant execute on function public.checkout_reminder_candidates(integer) to service_role;

-- 4. Claim one before its email goes: checked again, marked, and only then the address, the unsubscribe token and the game language
-- (one of the game's languages, else English). null when it is no longer due (paid meanwhile, said no, already claimed).
create or replace function public.checkout_reminder_claim(p_purchase uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_player uuid; v jsonb;
begin
 if not public.checkout_reminder_due(p_purchase) then return null; end if;
 update public.harvest_purchases set reminder_mailed_at=now() where id=p_purchase and reminder_mailed_at is null returning player_id into v_player;
 if v_player is null then return null; end if;
 select jsonb_build_object('email',u.email,'token',s.unsubscribe_token,
   'language',case when seen.language in ('en','cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja','ar','zh') then seen.language else 'en' end)
  into v
  from auth.users u join public.notification_settings s on s.player_id=u.id left join public.player_seen seen on seen.player_id=u.id
  where u.id=v_player;
 return v;
end $function$;
revoke all on function public.checkout_reminder_claim(uuid) from public, anon, authenticated;
grant execute on function public.checkout_reminder_claim(uuid) to service_role;

-- 5. What Resend said ('sent <id>' or 'failed: …'), for the owner's look-ups. A failed one is not sent again.
create or replace function public.checkout_reminder_done(p_purchase uuid, p_note text)
 returns void language sql security definer set search_path to '' as $function$
 update public.harvest_purchases set reminder_mail_note=left(coalesce(p_note,''),200) where id=p_purchase and reminder_mailed_at is not null;
$function$;
revoke all on function public.checkout_reminder_done(uuid,text) from public, anon, authenticated;
grant execute on function public.checkout_reminder_done(uuid,text) to service_role;

-- 6. Every hour at :23 (notify-hourly runs at :05, play-voided at :41).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('harvest-checkout-reminder') where exists (select 1 from cron.job where jobname='harvest-checkout-reminder');
select cron.schedule('harvest-checkout-reminder','23 * * * *',$job$
 select net.http_post(
  url := 'https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/checkout-reminder',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb,
  timeout_milliseconds := 25000);
$job$);

-- Look-up for the owner (not run here): the reminders of the last week and whether they were paid after.
-- select p.id, p.pack, p.created_at, p.reminder_mailed_at, p.reminder_mail_note,
--  exists(select 1 from public.harvest_purchases c where c.player_id=p.player_id and c.status='credited' and c.created_at>p.reminder_mailed_at) as paid_after
-- from public.harvest_purchases p where p.reminder_mailed_at>now()-interval '7 days' order by p.reminder_mailed_at desc;
