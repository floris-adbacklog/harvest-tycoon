-- Farm events: open from level 10 with an email address the game has checked itself (25 Sep 2026).
-- Supabase marks every email sign-up as confirmed at once (confirmation is off at sign-in), so email_confirmed_at said nothing.
-- Now a farmer confirms once with a 6-digit code (farm-api, operation events: email_send / email_confirm); Google and
-- Facebook accounts count as checked, those providers verify the address. The 48-hour wait after sign-up is gone.
create table if not exists public.email_checks(
 player_id uuid primary key references auth.users(id) on delete cascade,
 email text,
 code_hash text,
 code_expires_at timestamptz,
 attempts integer not null default 0,
 sent_at timestamptz,
 send_day date,
 sends_today integer not null default 0,
 confirmed_at timestamptz
);
alter table public.email_checks enable row level security;
revoke all on public.email_checks from anon, authenticated;

-- Checked: a Google or Facebook account, or a code confirmed for the address the account has now.
create or replace function public.harvest_email_checked(p_player uuid) returns boolean language sql stable security definer set search_path to '' as $f$
 select exists(select 1 from auth.users u where u.id=p_player and coalesce(u.raw_app_meta_data->>'provider','email')<>'email')
  or exists(select 1 from public.email_checks c join auth.users u on u.id=c.player_id where c.player_id=p_player and c.confirmed_at is not null and lower(c.email)=lower(u.email))
$f$;
revoke all on function public.harvest_email_checked(uuid) from public, anon, authenticated;
grant execute on function public.harvest_email_checked(uuid) to service_role;

-- The progress trigger: only its gate changes (read from the live definition, so nothing else can drift).
do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_event_progress()'::regprocedure);
 before:=definition;
 definition:=replace(definition,'not exists(select 1 from auth.users where id=new.player_id and created_at<now()-interval ''48 hours'' and email_confirmed_at is not null)','not public.harvest_email_checked(new.player_id)');
 if definition=before then raise exception 'harvest_event_progress: the old account gate was not found'; end if;
 execute definition;
end
$migration$;
