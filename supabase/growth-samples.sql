-- Growth charts in the Admin dashboard (23 Oct 2026, Gerard: active players per week and how busy each hour is, "zoals Google Maps
-- drukte laat zien"; the owner: only if it costs little). Every 15 minutes one row: how many farmers were active in the last 30 minutes
-- (as "Online now"), the last day and the last 7 days, counted on player_stats.last_active_at (about 13,000 rows: a millisecond or two).
-- Rows older than 180 days go. admin_growth_charts gives the admin (never a moderator, never a farmer) the hours and the weeks.
create table if not exists public.online_samples(
 at timestamptz primary key,
 online integer not null,
 active_day integer not null,
 active_week integer not null);
alter table public.online_samples enable row level security;
revoke all on public.online_samples from public, anon, authenticated;

create or replace function public.harvest_online_sample() returns void language sql security definer set search_path to '' as $$
 insert into public.online_samples(at,online,active_day,active_week)
 select date_trunc('minute',now()),
  count(*) filter (where s.last_active_at>now()-interval '30 minutes'),
  count(*) filter (where s.last_active_at>now()-interval '1 day'),
  count(*) filter (where s.last_active_at>now()-interval '7 days')
 from public.player_stats s
 on conflict (at) do nothing;
 delete from public.online_samples where at<now()-interval '180 days';
$$;
revoke all on function public.harvest_online_sample() from public, anon, authenticated;

create or replace function public.admin_growth_charts() returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return jsonb_build_object(
  'hours',coalesce((select jsonb_agg(jsonb_build_object('hour',h,'avg',a,'samples',n) order by h) from (
    select extract(hour from at at time zone 'UTC')::int h,avg(online)::numeric(10,2) a,count(*) n
    from public.online_samples where at>now()-interval '28 days' group by 1) x),'[]'::jsonb),
  'weeks',coalesce((select jsonb_agg(jsonb_build_object('week',w,'active',v,'complete',done) order by w) from (
    select distinct on (date_trunc('week',at at time zone 'UTC')) (date_trunc('week',at at time zone 'UTC'))::date w,active_week v,
     date_trunc('week',at at time zone 'UTC')+interval '7 days'<=now() at time zone 'UTC' done
    from public.online_samples where at>now()-interval '13 weeks' order by date_trunc('week',at at time zone 'UTC'),at desc) x),'[]'::jsonb),
  'days',coalesce((select jsonb_agg(jsonb_build_object('day',d,'active',v) order by d) from (
    select distinct on ((at at time zone 'UTC')::date) (at at time zone 'UTC')::date d,active_day v
    from public.online_samples where at>now()-interval '30 days' order by (at at time zone 'UTC')::date,at desc) x),'[]'::jsonb),
  'since',(select min(at) from public.online_samples));
end $$;
revoke all on function public.admin_growth_charts() from public, anon;
grant execute on function public.admin_growth_charts() to authenticated;

select cron.schedule('harvest-online-sample','*/15 * * * *','select public.harvest_online_sample()');
select public.harvest_online_sample();
select * from public.online_samples order by at desc limit 1;
