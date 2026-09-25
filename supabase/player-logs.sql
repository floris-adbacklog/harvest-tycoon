-- A log per farmer (26 Sep 2026, supabase/functions/farm-api/player-log.js): what they did and what it gave or cost, with the time,
-- in categories. Only farm-api (the service role) writes and reads it: the farmer sees their own, the admin and the moderators
-- everyone's, and purchases with real money only the farmer and the admin. Kept 90 days: a nightly job removes older lines.
-- About 1 MB a day at 160 farmers a day, so it stays far inside the database the plan includes.
create table if not exists public.player_logs(
 id bigint generated always as identity primary key,
 player_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 category text not null check (category in ('account','farm','production','market','rewards','diamonds','social','staff','purchase')),
 action text not null check (char_length(action)<=40),
 text text not null check (char_length(text)<=240),
 by_player uuid references auth.users(id) on delete set null
);
create index if not exists player_logs_player on public.player_logs(player_id,id desc);
alter table public.player_logs enable row level security;
revoke all on table public.player_logs from anon, authenticated;

-- A purchase with real money, the moment Stripe says it is paid (the same moment as harvest_purchase_alert, purchase-alerts.sql).
-- Nothing in here can stop a purchase from being credited: a problem only costs the log line.
create or replace function public.harvest_purchase_log() returns trigger language plpgsql security definer set search_path to '' as $f$
begin
 insert into public.player_logs(player_id,category,action,text)
 values(new.player_id,'purchase',case when new.livemode then 'purchase' else 'test_purchase' end,
  (case when new.livemode then 'Bought ' else 'Test purchase (no money): ' end)
  ||case when new.pack='starter' then 'the Starter Pack' else to_char(new.diamonds,'FM999G999')||' diamonds' end
  ||' for €'||to_char(new.amount_cents/100.0,'FM999990.00'));
 return new;
exception when others then return new;
end $f$;
revoke all on function public.harvest_purchase_log() from public, anon, authenticated;
drop trigger if exists harvest_purchase_log on public.harvest_purchases;
create trigger harvest_purchase_log after update of status on public.harvest_purchases
 for each row when (old.status='pending' and new.status in ('credited','test_paid')) execute function public.harvest_purchase_log();

-- Lines older than 90 days go, every night at 03:23 UTC.
select cron.unschedule('harvest-player-log-cleanup') where exists(select 1 from cron.job where jobname='harvest-player-log-cleanup');
select cron.schedule('harvest-player-log-cleanup','23 3 * * *',$c$delete from public.player_logs where created_at<now()-interval '90 days'$c$);
