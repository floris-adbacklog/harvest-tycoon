-- The app page and Settings in the chat (4 Oct 2026). Besides a link to the wiki (supabase/chat-wiki-links.sql) the chat now lets
-- through a link to the app page, https://www.harvesttycoon.com/app, and to one part of Settings,
-- https://www.harvesttycoon.com/settings/<part> with <part> one of avatar, email, sound, chat, reminders, farm-app, language, privacy
-- (public/game-links.js SETTINGS_PARTS; any other part is refused like any other link). The same rules as a wiki link: also without
-- https:// or www., standing on its own (the start, a space or a bracket before it; the end, a space, a bracket or a stop after it),
-- and wiki links and these together at most 2 in one message. The game shows them as chips (src/chat-rich.js with game-links.js:
-- "Get the app", "Settings › Farm app"); outside the game the same address opens /app or the game at that part of Settings.
-- chat_send and the staff's edit (chat_mod_edit) are patched from their LIVE definition, only the two link lines, so anything deployed
-- since stays as it is: a function patched already is left alone, one without the expected lines stops the whole file, nothing
-- half-done. Re-runnable. The refusals said "wiki" only; now they name what is allowed.
-- Read live on 4 Oct 2026: chat_send md5 f806390ed158778847f8a1a4332f5274, chat_mod_edit 29808d9c2f03027d184d2a7ffcc5a938,
-- chat_wiki_links fe1da1892042a30fc5a7bb2269a4bc28 (md5 of pg_get_functiondef). Run after supabase/chat-wiki-links.sql; this replaces
-- that file's two link lines (chat_wiki_links stays, unused), and running that file again afterwards changes nothing.

-- How many of our links a message holds (wiki, app page, Settings part), or -1 when it holds any other link. What is left once ours are
-- taken out goes through the chat's old link check (an address, www., or a name with a common ending such as .com), with one fix
-- (4 Oct 2026 review): a name glued to a letter of another alphabet (жevil.com, Cyrillic һarvesttycoon.com/app) counts too; the old
-- \m saw no word start there and let it through.
create or replace function public.chat_game_links(p_body text) returns integer language sql immutable set search_path to '' as $f$
 select case when regexp_replace(coalesce(p_body,''),'(^|[\s(])(https?://)?(www\.)?harvesttycoon\.com/(wiki(/[a-z-]+)?/?(#[a-z0-9-]+)?|app/?|settings/(avatar|email|sound|chat|reminders|farm-app|language|privacy)/?)(?=$|[\s).,!?;:])','\1 ','gi')
   ~* '(https?://|www\.|(^|[^a-z0-9-])[a-z0-9-]{2,}\.(com|net|org|nl|be|de|eu|io|gg|ly|me|app|xyz|ru|co|info|biz|tk|link|site|shop)\M)' then -1
  else regexp_count(coalesce(p_body,''),'(^|[\s(])(https?://)?(www\.)?harvesttycoon\.com/(wiki(/[a-z-]+)?/?(#[a-z0-9-]+)?|app/?|settings/(avatar|email|sound|chat|reminders|farm-app|language|privacy)/?)(?=$|[\s).,!?;:])',1,'i') end
$f$;
revoke all on function public.chat_game_links(text) from public, anon, authenticated;

-- Patches one function from its live definition: nothing when p_marker shows it is done already, an error when p_from is missing.
create or replace function pg_temp.chat_links_patch(p_fn regprocedure, p_marker text, p_from text, p_to text)
returns void language plpgsql as $f$
declare def text:=pg_get_functiondef(p_fn);
begin
 if position(p_marker in def)>0 then return; end if;
 if position(p_from in def)=0 then raise exception using message=format('%s: the expected text was not found; read the live definition before changing it', p_fn); end if;
 execute replace(def,p_from,p_to);
end $f$;

-- 1. Sending, in every chat.
select pg_temp.chat_links_patch('public.chat_send(text,text)','chat_game_links(',
 $a$if public.chat_wiki_links(body)<0 then raise exception 'Only links to the Harvest Tycoon wiki are allowed in the chat.' using errcode='22023'; end if;
 if public.chat_wiki_links(body)>2 then raise exception 'Up to 2 wiki links fit in one message.' using errcode='22023'; end if;$a$,
 $b$if public.chat_game_links(body)<0 then raise exception 'Only links to the Harvest Tycoon wiki, the app page and Settings are allowed in the chat.' using errcode='22023'; end if;
 if public.chat_game_links(body)>2 then raise exception 'Up to 2 links fit in one message.' using errcode='22023'; end if;$b$);

-- 2. A moderator's or the admin's edit: the same rules as sending.
select pg_temp.chat_links_patch('public.chat_mod_edit(uuid,text)','chat_game_links(',
 $a$if public.chat_wiki_links(clean)<0 then raise exception 'Only links to the Harvest Tycoon wiki are allowed in the chat.' using errcode='22023'; end if;
 if public.chat_wiki_links(clean)>2 then raise exception 'Up to 2 wiki links fit in one message.' using errcode='22023'; end if;$a$,
 $b$if public.chat_game_links(clean)<0 then raise exception 'Only links to the Harvest Tycoon wiki, the app page and Settings are allowed in the chat.' using errcode='22023'; end if;
 if public.chat_game_links(clean)>2 then raise exception 'Up to 2 links fit in one message.' using errcode='22023'; end if;$b$);
