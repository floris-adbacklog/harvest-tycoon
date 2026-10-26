-- Up to 5 farmers in one message (26 Oct 2026, owner: "tot 5"; was 3, supabase/chat-mentions.sql). Only the count in the trigger that
-- checks a message's mentions changes; every other rule stays: the name of now in the words, family members only in Family, never
-- yourself, the same farmer twice counts once (distinct), 10 different farmers an hour, a push per 3 minutes per chat, blocks.
-- chat_send(text,text,uuid[]) already hands on up to 20 ids, so it stays as it is. Patched from the LIVE definition (read 26 Oct 2026:
-- md5 9659aebcf56f39cf4316c0b104d6729c): done already is left alone, a definition without the expected text stops with an error.
-- Re-runnable. Run before the site goes out: a game with the 5 that meets the old 3 refuses a 4th and 5th with the old text.
do $f$
declare def text:=pg_get_functiondef('public.chat_mentions_tag()'::regprocedure);
 old text:=$o$if cardinality(ids)>3 then raise exception 'Mention up to 3 farmers in one message.' using errcode='22023'; end if;$o$;
 new text:=$n$if cardinality(ids)>5 then raise exception 'Mention up to 5 farmers in one message.' using errcode='22023'; end if;$n$;
begin
 if position(new in def)>0 then return; end if;
 if position(old in def)=0 then raise exception 'chat_mentions_tag(): the expected text was not found; read the live definition before changing it'; end if;
 execute replace(def,old,new);
end $f$;
