-- Staff gifts: fixed coins or coins per level (28 Sep 2026). The sender chooses: a fixed amount (now at most 1,000 a day, was 500),
-- or an amount per level, which farm-api pays times the farmer's level on the next load (farm-state.js receiveDonations), so late
-- farms get a gift that still counts: at most 50 per level a day (20 per level is about one daily gift). Diamonds stay 50 a day,
-- gifts 5 a day, all staff together. Gifts sent before this are fixed amounts (per_level false).
-- Based on the live staff_donate (md5 ebd8c42cfdb8e3ccd0b8729c54a3db72) and staff_donation_room (md5 220bc9d9970329b0f42906d21db4730b)
-- read on 28 Sep 2026. staff_donate gets one more argument (p_per_level, default false), so the old five-argument version is dropped
-- first (two versions would make every call ambiguous) and the same grants are given again.
alter table public.staff_donations add column if not exists per_level boolean not null default false;
-- The table's own limit was 500 coins a gift: now 1,000 for a fixed gift and 50 for a gift per level.
alter table public.staff_donations drop constraint if exists staff_donations_coins_check;
alter table public.staff_donations add constraint staff_donations_coins_check check (coins>=0 and coins<=case when per_level then 50 else 1000 end);

drop function if exists public.staff_donate(integer,integer,text,text,uuid);
create or replace function public.staff_donate(p_coins integer, p_diamonds integer, p_message text, p_audience text default 'all', p_player uuid default null, p_per_level boolean default false)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); msg text:=nullif(regexp_replace(btrim(coalesce(p_message,'')),'\s+',' ','g'),''); c int; l int; d int; n int; parts text[];
 who text:=coalesce(p_audience,'all'); farmers uuid[]; note text; per boolean:=coalesce(p_per_level,false);
begin
 if public.chat_staff_role(me) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_coins is null or p_diamonds is null or p_coins<0 or p_diamonds<0 or (p_coins=0 and p_diamonds=0) then raise exception 'Give some coins or diamonds.' using errcode='22023'; end if;
 if char_length(coalesce(msg,''))>120 then raise exception 'Keep the message under 120 characters.' using errcode='22023'; end if;
 if msg is not null and (public.chat_is_rude(msg) or msg ~* '(https?://|www\.)') then raise exception 'Please keep the message friendly, without links.' using errcode='22023'; end if;
 if who not in ('all','active','online','player') then raise exception 'Choose who gets the gift.' using errcode='22023'; end if;
 farmers:=case who
  when 'active' then array(select s.player_id from public.player_stats s where s.last_active_at>now()-interval '7 days')
  when 'online' then array(select s.player_id from public.player_stats s where s.last_active_at>now()-interval '30 minutes')
  when 'player' then array(select s.player_id from public.player_stats s where s.player_id=p_player)
  end;
 if who='player' and coalesce(array_length(farmers,1),0)=0 then raise exception 'Choose the farmer who gets the gift.' using errcode='22023'; end if;
 if who<>'all' and coalesce(array_length(farmers,1),0)=0 then raise exception 'Nobody to give it to right now.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-donate',0));
 select coalesce(sum(x.coins) filter (where not x.per_level),0),coalesce(sum(x.coins) filter (where x.per_level),0),coalesce(sum(x.diamonds),0),count(*) into c,l,d,n
  from public.staff_donations x where (x.created_at at time zone 'UTC')::date=(now() at time zone 'UTC')::date;
 if n>=5 then raise exception 'Today''s 5 gifts have been sent. Try again tomorrow.' using errcode='54000'; end if;
 if d+p_diamonds>50 then raise exception 'Today there is room for % more diamonds.', 50-d using errcode='22023'; end if;
 if per and l+p_coins>50 then raise exception 'Today there is room for % more coins per level.', 50-l using errcode='22023'; end if;
 if not per and c+p_coins>1000 then raise exception 'Today there is room for % more coins.', 1000-c using errcode='22023'; end if;
 insert into public.staff_donations(coins,diamonds,message,by_player,audience,recipients,per_level) values(p_coins,p_diamonds,msg,me,who,farmers,per);
 parts:=array_remove(array[case when p_diamonds>0 then p_diamonds::text||' diamonds' end, case when p_coins>0 then p_coins::text||case when per then ' coins for every level' else ' coins' end end],null);
 note:='Donation: you received '||array_to_string(parts,' + ')||'.'||coalesce(' “'||msg||'”','');
 if who='all' then insert into public.player_notices(player_id,kind,body) values(null,'donation',note);
 else insert into public.player_notices(player_id,kind,body) select f,'donation',note from unnest(farmers) f; end if;
 return jsonb_build_object('coins',1000-c-case when per then 0 else p_coins end,'perLevel',50-l-case when per then p_coins else 0 end,'diamonds',50-d-p_diamonds,'gifts',4-n,
  'audience',who,'farmers',case when who='all' then null else array_length(farmers,1) end);
end $function$;
revoke execute on function public.staff_donate(integer,integer,text,text,uuid,boolean) from public, anon;
grant execute on function public.staff_donate(integer,integer,text,text,uuid,boolean) to authenticated;

create or replace function public.staff_donation_room() returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare c int; l int; d int; n int;
begin
 if public.chat_staff_role((select auth.uid())) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 select coalesce(sum(x.coins) filter (where not x.per_level),0),coalesce(sum(x.coins) filter (where x.per_level),0),coalesce(sum(x.diamonds),0),count(*) into c,l,d,n
  from public.staff_donations x where (x.created_at at time zone 'UTC')::date=(now() at time zone 'UTC')::date;
 return jsonb_build_object('coins',1000-c,'perLevel',50-l,'diamonds',50-d,'gifts',5-n);
end $function$;
