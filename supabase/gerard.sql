-- Gerard, the second admin (3 Oct 2026; supabase/admins.sql made harvesttycoon@gmail.com an admin with the owner's rules).
-- 1. His own face, 'gerard' ("Gerard, the owner", public/player-avatars.js GERARD_AVATAR): like Tony's 'owner', only an admin account
--    may wear it (avatar-service.js); other farmers keep the 40. player_stats.avatar_id only takes known faces, so 'gerard' joins the
--    live list, and Gerard wears it from now on.
-- 2. The welcome message can come from either admin (the Admin dashboard's From): welcome_dm_save takes the sender, welcome_dm_get
--    says who it is and which admins there are. For now it comes from Gerard, and its texts say "I'm Gerard, the community manager".
-- Built on the LIVE definitions read on 3 Oct 2026 (welcome_dm_get md5 ff863943e3655b871510041968c99e52, the avatar check with 'owner').
-- Re-runnable: each step leaves what is done already alone; one that finds something unexpected stops the file.

-- 1. The face.
do $avatar$
declare definition text;
begin
 select pg_get_constraintdef(oid) into definition from pg_constraint where conrelid='public.player_stats'::regclass and conname='player_stats_avatar_id_check';
 if definition is null then raise exception 'player_stats_avatar_id_check not found'; end if;
 if position('''gerard''::text' in definition)>0 then return; end if;
 definition:=replace(definition,'''owner''::text,','''owner''::text, ''gerard''::text,');
 if position('''gerard''::text' in definition)=0 then raise exception 'The avatar list was not where it was expected.'; end if;
 execute 'alter table public.player_stats drop constraint player_stats_avatar_id_check';
 execute 'alter table public.player_stats add constraint player_stats_avatar_id_check '||definition;
end
$avatar$;
update public.player_stats set avatar_id='gerard'
 where player_id=(select id from auth.users where lower(email)='harvesttycoon@gmail.com' and email_confirmed_at is not null) and avatar_id is distinct from 'gerard';

-- 2. Saving with a sender: one of the admins (for another farmer the confirmed address alone says admin; the caller needs Google).
create or replace function public.welcome_dm_save(p_enabled boolean, p_body text, p_delay integer, p_sender uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); msg text:=btrim(coalesce(p_body,'')); who uuid:=coalesce(p_sender,(select auth.uid()));
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if who<>me and public.chat_staff_role(who) is distinct from 'admin' then raise exception 'Choose one of the admins.' using errcode='22023'; end if;
 if char_length(msg)<1 or char_length(msg)>500 then raise exception 'Write 1–500 characters.' using errcode='22023'; end if;
 if p_delay is null or p_delay<1 or p_delay>60 then raise exception 'Choose 1–60 minutes.' using errcode='22023'; end if;
 update public.welcome_dm_config set body=msg,delay_minutes=p_delay,sender=who,
  enabled_since=case when coalesce(p_enabled,false) and not enabled then now() else enabled_since end,
  enabled=coalesce(p_enabled,false),updated_at=now() where id;
 return public.welcome_dm_get();
end $function$;
revoke all on function public.welcome_dm_save(boolean,text,integer,uuid) from public, anon;
grant execute on function public.welcome_dm_save(boolean,text,integer,uuid) to authenticated;

-- Reading it: who it comes from now, and the admins it can come from.
do $get$
declare def text:=pg_get_functiondef('public.welcome_dm_get()'::regprocedure);
begin
 if position('''senders''' in def)>0 then return; end if;
 if position($a$'enabled',c.enabled,$a$ in def)=0 then raise exception 'welcome_dm_get: the expected text was not found; read the live definition before changing it'; end if;
 execute replace(def,$a$'enabled',c.enabled,$a$,$b$'enabled',c.enabled,'sender',c.sender,
  'senders',(select jsonb_agg(jsonb_build_object('id',u.id,'name',coalesce(ps.username,'Admin')) order by ps.username) from auth.users u left join public.player_stats ps on ps.player_id=u.id where public.chat_staff_role(u.id)='admin'),$b$);
end
$get$;

-- For now from Gerard, and the texts say so: "I'm Gerard, the community manager of Harvest Tycoon" in every language (the first sentence
-- only; the rest stays). A text that still names Tony afterwards stops the whole file, so nothing is half changed.
update public.welcome_dm_config set sender=(select id from auth.users where lower(email)='harvesttycoon@gmail.com' and email_confirmed_at is not null),
 body=replace(body,$o$I'm Tony, the maker of Harvest Tycoon.$o$,$n$I'm Gerard, the community manager of Harvest Tycoon.$n$),updated_at=now()
 where id and exists(select 1 from auth.users where lower(email)='harvesttycoon@gmail.com' and email_confirmed_at is not null);
update public.welcome_dm_texts t set body=replace(t.body,x.old,x.new),updated_at=now() from (values
 ('ar',$o$أنا توني، صانع Harvest Tycoon.$o$,$n$أنا جيرارد، مدير مجتمع Harvest Tycoon.$n$),
 ('cs',$o$Jsem Tony, tvůrce Harvest Tycoonu.$o$,$n$Jsem Gerard, komunitní manažer Harvest Tycoonu.$n$),
 ('de',$o$Ich bin Tony, der Macher von Harvest Tycoon.$o$,$n$Ich bin Gerard, der Community-Manager von Harvest Tycoon.$n$),
 ('es',$o$Soy Tony, el creador de Harvest Tycoon.$o$,$n$Soy Gerard, el community manager de Harvest Tycoon.$n$),
 ('fr',$o$Je suis Tony, le créateur de Harvest Tycoon.$o$,$n$Je suis Gerard, le community manager de Harvest Tycoon.$n$),
 ('hi',$o$मैं टोनी हूँ, Harvest Tycoon का निर्माता।$o$,$n$मैं जेरार्ड हूँ, Harvest Tycoon का कम्युनिटी मैनेजर।$n$),
 ('hu',$o$Tony vagyok, a Harvest Tycoon készítője.$o$,$n$Gerard vagyok, a Harvest Tycoon közösségi menedzsere.$n$),
 ('id',$o$Aku Tony, pembuat Harvest Tycoon.$o$,$n$Aku Gerard, community manager Harvest Tycoon.$n$),
 ('ja',$o$Harvest Tycoon を作っているトニーです。$o$,$n$Harvest Tycoon のコミュニティマネージャー、ジェラルドです。$n$),
 ('nl',$o$Ik ben Tony, de maker van Harvest Tycoon.$o$,$n$Ik ben Gerard, de communitymanager van Harvest Tycoon.$n$),
 ('pt',$o$Eu sou o Tony, o criador do Harvest Tycoon.$o$,$n$Eu sou o Gerard, o gerente de comunidade do Harvest Tycoon.$n$),
 ('ru',$o$Я Тони, создатель Harvest Tycoon.$o$,$n$Я Герард, комьюнити-менеджер Harvest Tycoon.$n$),
 ('tr',$o$Ben Tony, Harvest Tycoon'un yapımcısıyım.$o$,$n$Ben Gerard, Harvest Tycoon'un topluluk yöneticisiyim.$n$),
 ('uk',$o$Я Тоні, творець Harvest Tycoon.$o$,$n$Я Герард, ком'юніті-менеджер Harvest Tycoon.$n$),
 ('zh',$o$我是 Tony，Harvest Tycoon 的制作者。$o$,$n$我是 Gerard，Harvest Tycoon 的社区经理。$n$)
) as x(language,old,new) where t.language=x.language and position(x.old in t.body)>0;
do $check$
begin
 if exists(select 1 from public.welcome_dm_texts where body ~ '(Tony|توني|टोनी|トニー|Тоні|Тони)')
  or exists(select 1 from public.welcome_dm_config where id and body ~ 'Tony') then
  raise exception 'A welcome text still names Tony: read the live texts before changing them';
 end if;
end
$check$;
