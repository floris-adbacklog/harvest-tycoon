-- Pop-ups for phones on the website (18 Oct 2026, the owner: the pop-up "we also have a mobile app", "excl. dingen zoals Kong"): a new
-- group 'phone_web', "Phones on the website (not the apps or the game portals)" in the Admin dashboard. The game decides it on the device
-- (src/popup-ui.js fitsDevice): a phone on harvesttycoon.com in its browser, never our apps (Android, iPhone, Galaxy Store), the home
-- screen or a game portal (Kongregate, CrazyGames, Discord), where 'phone_browser' does show. Its notification would reach every farmer
-- (News knows no devices), so this group takes a pop-up only. A game from before today does not know 'phone_web' and never shows it
-- (every version since 26 Sep 2026 shows only the groups it knows and leaves the rest unseen): push the site first, then run this.
-- The table's check and popup_post's own check learn it; popup_post is changed in place from its LIVE definition (only that line, as live
-- on 18 Oct 2026 after popup-crazygames.sql), so nothing else in it can go back to an older copy; it stops if the line is not as expected.
-- Re-runnable. No offer for this group: harvest_offers and offer_post stay as they are. Run after popup-crazygames.sql.
alter table public.popups drop constraint if exists popups_audience_check;
alter table public.popups add constraint popups_audience_check check (audience in ('all','browser','phone_browser','phone','desktop','android_app','web','crazygames','phone_web'));
do $patch$
declare d text;
 old text:=$o$ if who not in ('all','browser','phone_browser','phone','desktop','android_app','web','crazygames') then raise exception 'Choose who sees it.' using errcode='22023'; end if;$o$;
 new text:=$n$ if who not in ('all','browser','phone_browser','phone','desktop','android_app','web','crazygames','phone_web') then raise exception 'Choose who sees it.' using errcode='22023'; end if;
 if who='phone_web' and coalesce(p_news,true) then raise exception 'Send it to phones on the website as a pop-up only: a notification would reach every farmer.' using errcode='22023'; end if;$n$;
begin
 d:=pg_get_functiondef('public.popup_post(text,text,text,text,text,integer,integer,boolean,jsonb)'::regprocedure);
 if position('''phone_web''' in d)>0 then return; end if;
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'popup_post is not as expected: add phone_web to its audience list by hand'; end if;
 execute replace(d,old,new);
end $patch$;
-- Check: select pg_get_constraintdef(oid) from pg_constraint where conname='popups_audience_check'; -- ... 'crazygames'::text, 'phone_web'::text])
-- and: select position('''phone_web''' in pg_get_functiondef('public.popup_post(text,text,text,text,text,integer,integer,boolean,jsonb)'::regprocedure))>0; -- true
