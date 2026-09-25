-- A staff gift to whom (25 Sep 2026): everyone, the farmers active this week (last 7 days), the farmers online now (last 30 minutes,
-- the same rule as the online dot) or one farmer. The daily room stays the same for all staff together: at most 5 gifts, 500 coins and
-- 50 diamonds a day (UTC). Who gets it is fixed when it is sent (staff_donations.recipients; null is everyone whose farm existed
-- then), and farm-api hands a farm only the gifts meant for it. Everyone gets one notice for all; the others each their own.
alter table public.staff_donations add column if not exists audience text not null default 'all';
alter table public.staff_donations add column if not exists recipients uuid[];
alter table public.staff_donations drop constraint if exists staff_donations_audience_check;
alter table public.staff_donations add constraint staff_donations_audience_check check (audience in ('all','active','online','player') and (audience='all')=(recipients is null));

drop function if exists public.staff_donate(integer,integer,text);
create or replace function public.staff_donate(p_coins integer, p_diamonds integer, p_message text, p_audience text default 'all', p_player uuid default null)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid()); msg text:=nullif(regexp_replace(btrim(coalesce(p_message,'')),'\s+',' ','g'),''); c int; d int; n int; parts text[];
 who text:=coalesce(p_audience,'all'); farmers uuid[]; note text;
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
 select coalesce(sum(x.coins),0),coalesce(sum(x.diamonds),0),count(*) into c,d,n from public.staff_donations x where (x.created_at at time zone 'UTC')::date=(now() at time zone 'UTC')::date;
 if n>=5 then raise exception 'Today''s 5 gifts have been sent. Try again tomorrow.' using errcode='54000'; end if;
 if c+p_coins>500 or d+p_diamonds>50 then raise exception 'Today there is room for % more coins and % more diamonds.', 500-c, 50-d using errcode='22023'; end if;
 insert into public.staff_donations(coins,diamonds,message,by_player,audience,recipients) values(p_coins,p_diamonds,msg,me,who,farmers);
 parts:=array_remove(array[case when p_diamonds>0 then p_diamonds::text||' diamonds' end, case when p_coins>0 then p_coins::text||' coins' end],null);
 note:='Donation: you received '||array_to_string(parts,' + ')||'.'||coalesce(' “'||msg||'”','');
 if who='all' then insert into public.player_notices(player_id,kind,body) values(null,'donation',note);
 else insert into public.player_notices(player_id,kind,body) select f,'donation',note from unnest(farmers) f; end if;
 return jsonb_build_object('coins',500-c-p_coins,'diamonds',50-d-p_diamonds,'gifts',4-n,'audience',who,'farmers',case when who='all' then null else array_length(farmers,1) end);
end $f$;
revoke execute on function public.staff_donate(integer,integer,text,text,uuid) from public, anon;
grant execute on function public.staff_donate(integer,integer,text,text,uuid) to authenticated;
