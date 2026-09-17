-- Applied through the Supabase migration API as harvest_online_farms.
create table public.player_farms (
 player_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null check (jsonb_typeof(state) = 'object'),
 revision bigint not null default 1,
 receipts jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.player_farms enable row level security;
revoke all on public.player_farms from anon, authenticated;
grant select on public.player_farms to authenticated;
grant all on public.player_farms to service_role;
create policy "Read own registered farm" on public.player_farms for select to authenticated
 using ((select auth.uid()) = player_id and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) = false);
-- Only the authenticated Edge Function may commit calculated state. The revision
-- comparison and leaderboard update happen in the same database transaction.
create function public.harvest_commit_farm(p_player uuid, p_expected bigint, p_state jsonb, p_receipts jsonb, p_username text, p_currency integer, p_level integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
 if p_expected = 0 then
  insert into public.player_farms(player_id,state,revision,receipts)
   values(p_player,p_state,1,p_receipts) on conflict do nothing;
 else
  update public.player_farms set state=p_state,revision=revision+1,receipts=p_receipts,updated_at=now()
   where player_id=p_player and revision=p_expected;
 end if;
 if not found then return false; end if;
 insert into public.player_stats(player_id,username,currency,level,updated_at)
  values(p_player,p_username,p_currency,p_level,now())
  on conflict(player_id) do update set currency=excluded.currency,level=excluded.level,updated_at=now();
 return true;
end $$;
revoke execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) from public,anon,authenticated;
grant execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) to service_role;
-- Check session revocation, not just the lifetime of a signed access token.
create function public.harvest_session_active(p_player uuid,p_session uuid)
returns boolean language sql security invoker set search_path = '' as $$
 select exists(select 1 from auth.sessions where id=p_session and user_id=p_player and (not_after is null or not_after>now()));
$$;
revoke execute on function public.harvest_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.harvest_session_active(uuid,uuid) to service_role;
