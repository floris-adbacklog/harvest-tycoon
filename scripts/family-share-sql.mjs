// Writes supabase/family-share.sql (20 Oct 2026). Share in chat: a farmer asked to link to their family in the chat ("Ik wil kunnen
// linken naar mijn family in de chat, dat ziet er cool uit"); the owner picked option 1: in the Family window the leader or a co-leader
// posts the family's card in the global chat (its emblem, name, family level and farmers, with View or Join), at most once an hour
// per family.
// - families.shared_at (ms, like created_at): when the family was last shared. harvest_family_read hands every family over as its whole
//   row, so farm-api and the Family window see it without any change to that function ("You can share again in 42m"), and
//   harvest_family_commit's upsert names its columns, so a family action never writes it back. The guard checks both bodies are the
//   ones read live (md5), as this rests on them.
// - chat_messages kind 'family_share': every kind the live check allows stays (another file may have added one since) and this joins.
// - harvest_family_share(p_player, p_family, p_level), for farm-api only (service_role): the farmer is in that family as its leader or
//   a co-leader, the global chat's own rules as chat_send has them (a CrazyGames guest, a ban, a mute, the global chat's level, a
//   farmer name), then the family's row is locked and the hour checked and set in one go, and the card goes in. The database writes
//   the card from the family's own row (name, emblem, join mode, minimum level, farmers now); only the family level comes from farm-api
//   (familyStanding, the chest tiers of every week), as a number from 1 to 10. The page never sends a text or a name.
// - The card's body is a plain sentence, "Tony shared the family Meadow Friends": a game from before this card has no 'family_share'
//   and shows it as an ordinary message from Tony. No mentions (chat_mentions_tag only tags a 'message'), so no push.
// Run: node scripts/family-share-sql.mjs. Never edit the file by hand. Safe to run twice: the second run changes nothing.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FAMILY_CONFIG,FAMILY_MIN_LEVEL,FAMILY_LEVEL_STEPS} from '../game/farm-state.js';

const md5=text=>createHash('md5').update(text).digest('hex');

// The two functions this rests on, read live on 20 Oct 2026 at 21:40 UTC with
//  select p.oid::regprocedure::text, md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
//   where n.nspname='public' and p.proname in ('harvest_family_read','harvest_family_commit');
// Read them again right before running this file; if one differs, read what changed (does it still hand over whole family rows, does
// the upsert still name its columns without shared_at?), paste the new md5 here and regenerate.
export const LIVE_MD5=Object.freeze({
 'harvest_family_read(uuid,uuid)':'71ca3997a60c56ff5bef2bd1e014f4f3',
 'harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean)':'03b6dd5875190236a4034c0c8ce4f7b5'
});
export const KINDS=Object.freeze(['message','request','rank','top','join','kick','chest','family_share']);
const MAX=FAMILY_CONFIG.MAX_MEMBERS,TOP_LEVEL=FAMILY_LEVEL_STEPS.length;
// The hour this file was run with (live since 20 Oct 2026). The owner made it a day the same evening: scripts/family-share-24h-sql.mjs
// replaces the function with this body's day version (supabase/family-share-24h.sql), so this file stays as it was run.
export const FIRST_GAP_MS=3600000;

// The body between the $function$ markers: md5(prosrc) in Postgres is the md5 of exactly this text.
export const SHARE_BODY=`
declare me public.family_members; f public.families; s public.chat_sanctions; nm text; lvl integer; av text; vip boolean; members integer;
 now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint; msg public.chat_messages;
begin
 if p_player is null or p_family is null then raise exception 'Choose a family.' using errcode='22023'; end if;
 -- Only the family's leader or a co-leader (they invite farmers and choose who can join).
 select * into me from public.family_members m where m.player_id=p_player and m.left_at is null;
 if me.family_id is distinct from p_family then raise exception 'Join a family first.' using errcode='42501'; end if;
 if me.role not in ('leader','coleader') then raise exception 'Your leader or a co-leader can share the family in chat.' using errcode='42501'; end if;
 -- The global chat's own rules, as chat_send.
 if public.harvest_portal_guest(p_player) then raise exception 'Log in with CrazyGames to chat.' using errcode='42501'; end if;
 select * into s from public.chat_sanctions where player_id=p_player;
 if coalesce(s.banned,false) then raise exception 'You can no longer send messages in the chat.' using errcode='42501'; end if;
 if s.muted_until>now() then raise exception 'You are muted until % UTC.', to_char(s.muted_until at time zone 'UTC','DD Mon HH24:MI') using errcode='42501'; end if;
 select ps.username, ps.level, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, lvl, av, vip from public.player_stats ps where ps.player_id=p_player;
 if nm is null then raise exception 'Choose a farmer name first.' using errcode='22023'; end if;
 if coalesce(lvl,0)<(select c.global_level from public.chat_config c) then raise exception 'The valley chat opens at level %.', (select c.global_level from public.chat_config c) using errcode='42501'; end if;
 -- Once an hour per family: the family's row is locked, so two taps at once give one card.
 select * into f from public.families where id=p_family and deleted_at is null for update;
 if f.id is null then raise exception 'This family is no longer around.' using errcode='22023'; end if;
 if f.shared_at is not null and f.shared_at>now_ms-${FIRST_GAP_MS} then
  raise exception 'Your family was shared in the chat less than an hour ago.' using errcode='54000', detail=f.shared_at::text; end if;
 select count(*) into members from public.family_members m where m.family_id=p_family and m.left_at is null;
 update public.families set shared_at=now_ms where id=p_family;
 insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body,kind,meta)
  values('global',p_player,nm,av,public.chat_staff_role(p_player) is not null,vip,format('%s shared the family %s',nm,f.name),'family_share',
   jsonb_build_object('family',f.id,'name',f.name,'emblem',f.emblem,'level',greatest(1,least(coalesce(p_level,1),${TOP_LEVEL})),'members',members,'max',${MAX},
    'mode',coalesce(f.join_mode,case when f.is_open then 'open' else 'invite' end),'minLevel',greatest(${FAMILY_MIN_LEVEL},coalesce(f.min_level,0))))
  returning * into msg;
 -- What you wrote yourself is read, as after chat_send.
 insert into public.chat_reads(player_id,channel,last_read_at) values(p_player,'global',now()) on conflict (player_id,channel) do update set last_read_at=excluded.last_read_at;
 return jsonb_build_object('sharedAt',now_ms,'message',msg.id);
end `;
export const SHARE_MD5=md5(SHARE_BODY);
const SIG='harvest_family_share(uuid,uuid,integer)';
const guardWant=JSON.stringify(LIVE_MD5);

const SQL=`-- Generated by scripts/family-share-sql.mjs. Do not edit by hand.
-- Share in chat (20 Oct 2026, the owner's option 1): the leader or a co-leader posts the family's card in the global chat, once an hour
-- per family. families.shared_at keeps when; chat_messages gets the kind 'family_share'; harvest_family_share (farm-api only) checks
-- who, the global chat's rules and the hour, and writes the card from the family's own row. A game from before shows the card as an
-- ordinary message: "Tony shared the family Meadow Friends".
-- Release: run this first, then deploy farm-api, then push the site. One transaction: any failed check rolls all of it back. Running it
-- twice changes nothing. It writes no player data (shared_at starts empty for every family).
begin;
set local lock_timeout='5s';
do $guard$
declare want jsonb:='${guardWant}'; fname text; have text;
begin
 for fname in select jsonb_object_keys(want) loop
  select md5(prosrc) into have from pg_proc where oid=to_regprocedure('public.'||fname);
  if have is distinct from want->>fname then raise exception 'family-share.sql: public.% is not the one this file expects (md5 %); read the live definition first', fname, have; end if;
 end loop;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='families' and column_name='shared_at' and data_type<>'bigint') then
  raise exception 'family-share.sql: families.shared_at is there with another type'; end if;
 if not exists(select 1 from pg_constraint where conrelid='public.chat_messages'::regclass and conname='chat_messages_kind_check') then
  raise exception 'family-share.sql: chat_messages has no kind check'; end if;
end $guard$;

-- 1. When the family was last shared (ms). Empty for every family: each can share at once.
alter table public.families add column if not exists shared_at bigint;

-- 2. The kind. Keeps every kind the live check allows and adds 'family_share'.
do $kind$
declare kinds text;
begin
 select string_agg(quote_literal(k),',' order by n) into kinds from (
  select k, min(n) as n from (
   select r.m[1] as k, r.n from pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid),'''([a-z_]+)''','g') with ordinality as r(m,n)
    where c.conrelid='public.chat_messages'::regclass and c.conname='chat_messages_kind_check'
   union all
   select y.k, 100+y.n from unnest(array[${KINDS.map(k=>`'${k}'`).join(',')}]) with ordinality as y(k,n)) z
  group by k) w;
 alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
 execute format('alter table public.chat_messages add constraint chat_messages_kind_check check (kind in (%s))',kinds);
end $kind$;

-- 3. The share, for farm-api only.
create or replace function public.harvest_family_share(p_player uuid, p_family uuid, p_level integer)
 returns jsonb language plpgsql set search_path to '' as $function$${SHARE_BODY}$function$;
revoke all on function public.${SIG} from public, anon, authenticated;
grant execute on function public.${SIG} to service_role;

-- 4. After-check, in the same transaction.
do $after$
declare want jsonb:='${guardWant}'; fname text;
begin
 if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.${SIG}')) is distinct from '${SHARE_MD5}' then
  raise exception 'family-share.sql: harvest_family_share did not come out as generated'; end if;
 if exists(select 1 from pg_proc p where p.oid=to_regprocedure('public.${SIG}') and (p.prosecdef or p.proconfig is distinct from array['search_path=""']
   or p.proacl::text is distinct from '{postgres=X/postgres,service_role=X/postgres}')) then raise exception 'family-share.sql: harvest_family_share header or grant'; end if;
 for fname in select jsonb_object_keys(want) loop
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.'||fname)) is distinct from want->>fname then raise exception 'family-share.sql: public.% changed', fname; end if;
 end loop;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='families' and column_name='shared_at' and data_type='bigint') then
  raise exception 'family-share.sql: families.shared_at is missing'; end if;
 if not exists(select 1 from pg_constraint where conrelid='public.chat_messages'::regclass and conname='chat_messages_kind_check' and pg_get_constraintdef(oid) like '%''family_share''%'
   and pg_get_constraintdef(oid) like '%''chest''%' and pg_get_constraintdef(oid) like '%''message''%') then raise exception 'family-share.sql: the kind check'; end if;
end $after$;
commit;

-- Check (read-only), after running this file:
-- select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.chat_messages'::regclass and conname='chat_messages_kind_check';
-- select id, name, shared_at from public.families where shared_at is not null order by shared_at desc limit 10;
-- select sender_name, body, meta, created_at from public.chat_messages where kind='family_share' order by created_at desc limit 10;
`;
export function familyShareSql(){return SQL;}
if(import.meta.url===`file://${process.argv[1]}`){
 writeFileSync(new URL('../supabase/family-share.sql',import.meta.url),SQL);
 console.log('supabase/family-share.sql',SQL.length,'characters, harvest_family_share md5',SHARE_MD5);
}
