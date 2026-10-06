-- The Feedback window in the chat (6 Oct 2026). Besides the wiki, the app page and a part of Settings (supabase/chat-game-links.sql)
-- the chat now lets through https://www.harvesttycoon.com/feedback, also without https:// or www. and with a trailing slash, by the same
-- rules (standing on its own; at most 2 of our links in one message). The game shows it as a "Feedback" chip that opens the window
-- (src/chat-rich.js, public/game-links.js parseGameLink); outside the game the address opens the game there (vercel.json ?open=feedback).
-- The staff copy it from the link icon beside Feedback's title.
-- chat_game_links is patched from its LIVE definition: "app/?|" gets "feedback/?|" after it, in both of its patterns. A function patched
-- already is left alone; one without the expected text stops the file, nothing half-done. Re-runnable.
-- Read live on 6 Oct 2026: chat_game_links as in supabase/chat-game-links.sql (both patterns hold "|app/?|settings/(").
do $do$
declare def text:=pg_get_functiondef('public.chat_game_links(text)'::regprocedure);
begin
 if position('feedback/?' in def)>0 then return; end if;
 if (length(def)-length(replace(def,'|app/?|settings/(','')))/length('|app/?|settings/(')<>2 then
  raise exception 'chat_game_links: the expected text was not found twice; read the live definition before changing it';
 end if;
 execute replace(def,'|app/?|settings/(','|app/?|feedback/?|settings/(');
end $do$;
revoke all on function public.chat_game_links(text) from public, anon, authenticated;

-- Checks: the Feedback link counts as one of ours, another site still does not.
do $do$
begin
 if public.chat_game_links('Tell us here: harvesttycoon.com/feedback')<>1 then raise exception 'the feedback link is not counted'; end if;
 if public.chat_game_links('https://www.harvesttycoon.com/feedback/ and www.harvesttycoon.com/app')<>2 then raise exception 'two of our links'; end if;
 if public.chat_game_links('https://www.harvesttycoon.com/feedbackx')<>-1 then raise exception 'feedbackx is not ours'; end if;
 if public.chat_game_links('see evil.com/feedback')<>-1 then raise exception 'another site'; end if;
end $do$;
