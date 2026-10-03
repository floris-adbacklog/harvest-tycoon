-- Wiki links in the chat (3 Oct 2026). The chat refused every link, also one to our own wiki, and How to play has no address bar to
-- copy from. Now a link to the Harvest Tycoon wiki goes through: https://www.harvesttycoon.com/wiki/<topic>#<section>, also without
-- https:// or www., at most 2 in one message. Every other link is still refused, now with words that say what is allowed. The game shows
-- such a link as a chip with a book and the section's title in the reader's language, which opens How to play there (src/chat-rich.js
-- with the wiki's own public/wiki-link.js: a chip only for a link this lets through, a test checks it); outside the game (WhatsApp,
-- socials) the same address opens the website's wiki.
-- One function sends in every chat (global, family, private and the Crew): chat_send. It and the staff's edit (chat_mod_edit) are
-- patched from their LIVE definition, only the link line, so anything deployed since stays as it is (as supabase/crazygames.sql does):
-- a function patched already is left alone, and one without the expected line stops the whole file, nothing half-done. Re-runnable.
-- Read live on 3 Oct 2026: chat_send md5 c956bc312fc09a85d7b736176f2dbdde, chat_mod_edit b2f9823fe2e3d36cdafa2ff9b5cb0d2f
-- (md5 of pg_get_functiondef). Run before supabase/chat-mentions.sql.

-- How many links to our wiki a message holds, or -1 when it holds any other link. A wiki link stands on its own: the start, a space or
-- a bracket before it, so "myharvesttycoon.com/wiki" is not one; the end, a space, a bracket or a stop after it. What is left once the
-- wiki links are taken out goes through the chat's old link check (an address, www., or a name with a common ending such as .com).
create or replace function public.chat_wiki_links(p_body text) returns integer language sql immutable set search_path to '' as $f$
 select case when regexp_replace(coalesce(p_body,''),'(^|[\s(])(https?://)?(www\.)?harvesttycoon\.com/wiki(/[a-z-]+)?/?(#[a-z0-9-]+)?(?=$|[\s).,!?;:])','\1 ','gi')
   ~* '(https?://|www\.|\m[a-z0-9-]{2,}\.(com|net|org|nl|be|de|eu|io|gg|ly|me|app|xyz|ru|co|info|biz|tk|link|site|shop)\M)' then -1
  else regexp_count(coalesce(p_body,''),'(^|[\s(])(https?://)?(www\.)?harvesttycoon\.com/wiki(/[a-z-]+)?/?(#[a-z0-9-]+)?(?=$|[\s).,!?;:])',1,'i') end
$f$;
revoke all on function public.chat_wiki_links(text) from public, anon, authenticated;

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
select pg_temp.chat_links_patch('public.chat_send(text,text)','chat_wiki_links(',
 $a$if body ~* '(https?://|www\.|\m[a-z0-9-]{2,}\.(com|net|org|nl|be|de|eu|io|gg|ly|me|app|xyz|ru|co|info|biz|tk|link|site|shop)\M)' then raise exception 'Links are not allowed in the chat.' using errcode='22023'; end if;$a$,
 $b$if public.chat_wiki_links(body)<0 then raise exception 'Only links to the Harvest Tycoon wiki are allowed in the chat.' using errcode='22023'; end if;
 if public.chat_wiki_links(body)>2 then raise exception 'Up to 2 wiki links fit in one message.' using errcode='22023'; end if;$b$);

-- 2. A moderator's or the admin's edit: the same rules as sending.
select pg_temp.chat_links_patch('public.chat_mod_edit(uuid,text)','chat_wiki_links(',
 $a$if clean ~* '(https?://|www\.|\m[a-z0-9-]{2,}\.(com|net|org|nl|be|de|eu|io|gg|ly|me|app|xyz|ru|co|info|biz|tk|link|site|shop)\M)' then raise exception 'Links are not allowed in the chat.' using errcode='22023'; end if;$a$,
 $b$if public.chat_wiki_links(clean)<0 then raise exception 'Only links to the Harvest Tycoon wiki are allowed in the chat.' using errcode='22023'; end if;
 if public.chat_wiki_links(clean)>2 then raise exception 'Up to 2 wiki links fit in one message.' using errcode='22023'; end if;$b$);
