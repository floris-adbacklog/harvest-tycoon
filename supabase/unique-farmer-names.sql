-- Every farmer name is unique, whatever the capitals (26 Sep 2026; before, two farmers could both be "Anna"). The five names that
-- were already there twice: the farmer with the higher level (then the older account) keeps it, the other gets " 2" after it
-- (" 3" if that is taken too) and a notice that they can change it. From now on the database refuses a name that is taken; the
-- sign-up form asks username_available first, and farm-api gives a new farm a free name and refuses a taken one on rename.
do $names$
declare r record; base text; candidate text; n integer;
begin
 for r in
  select ps.player_id, btrim(ps.username) as username from (
   select p.player_id, p.username, row_number() over (partition by lower(btrim(p.username)) order by p.level desc, u.created_at, p.player_id) as place
   from public.player_stats p left join auth.users u on u.id=p.player_id where p.username is not null) ps
  where ps.place>1
 loop
  n:=2;
  loop
   base:=left(r.username,20-char_length(' '||n));candidate:=btrim(base)||' '||n;
   exit when not exists(select 1 from public.player_stats where lower(btrim(username))=lower(candidate));
   n:=n+1;
  end loop;
  update public.player_stats set username=candidate where player_id=r.player_id;
  insert into public.player_notices(player_id,kind,body,expires_at)
   values(r.player_id,'account',format('Your farmer name “%s” was already taken by another farmer, so it is now “%s”. You can change it on the leaderboard.',r.username,candidate),now()+interval '30 days');
 end loop;
end
$names$;

create unique index if not exists player_stats_username_unique on public.player_stats (lower(btrim(username))) where username is not null;

-- Is this farmer name still free? For the sign-up form, before there is an account (the leaderboard shows names anyway).
create or replace function public.username_available(p_name text)
 returns boolean language sql stable security definer set search_path to '' as $function$
 select char_length(btrim(coalesce(p_name,'')))>0 and not exists(select 1 from public.player_stats where lower(btrim(username))=lower(btrim(p_name)))
$function$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated, service_role;
