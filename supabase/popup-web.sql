-- Pop-ups for our website (9 Oct 2026): a new group 'web', "Website (not the apps, CrazyGames or Kongregate)" in the Admin dashboard,
-- first for the Trustpilot review. The game decides it on the device (src/popup-ui.js fitsDevice): harvesttycoon.com in a browser or on
-- the home screen, itch.io's frame too; never in our Android, iPhone or Galaxy Store app, never on CrazyGames or Kongregate. 'browser'
-- does show on those two (a portal is not installed) and only hides a button to a web page there, so it is not that group. A game from
-- before today does not know 'web' and never shows it (every version since 26 Sep 2026 shows only the groups it knows and leaves the rest
-- unseen), so a portal or an app with an old version open is safe without a check here: it gets nothing, the website gets it once updated.
-- Its notification would reach every farmer (News knows no devices), so this group takes a pop-up only. The table's check and popup_post's
-- own check learn it; popup_post is changed in place from its LIVE definition (only that line, as live on 9 Oct 2026 after
-- popup-android-app.sql), so nothing else in it can go back to an older copy; it stops if the line is not as expected. Re-runnable. No
-- offer for this group: harvest_offers and offer_post stay as they are. Run after popup-android-app.sql.
alter table public.popups drop constraint if exists popups_audience_check;
alter table public.popups add constraint popups_audience_check check (audience in ('all','browser','phone_browser','phone','desktop','android_app','web'));
do $patch$
declare d text;
 old text:=$o$ if who not in ('all','browser','phone_browser','phone','desktop','android_app') then raise exception 'Choose who sees it.' using errcode='22023'; end if;$o$;
 new text:=$n$ if who not in ('all','browser','phone_browser','phone','desktop','android_app','web') then raise exception 'Choose who sees it.' using errcode='22023'; end if;
 if who='web' and coalesce(p_news,true) then raise exception 'Send it to the website as a pop-up only: a notification would reach every farmer.' using errcode='22023'; end if;$n$;
begin
 d:=pg_get_functiondef('public.popup_post(text,text,text,text,text,integer,integer,boolean,jsonb)'::regprocedure);
 if position('''web''' in d)>0 then return; end if;
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'popup_post is not as expected: add web to its audience list by hand'; end if;
 execute replace(d,old,new);
end $patch$;
-- Check: select pg_get_constraintdef(oid) from pg_constraint where conname='popups_audience_check'; -- ... 'android_app'::text, 'web'::text])
-- and: select position('''web''' in pg_get_functiondef('public.popup_post(text,text,text,text,text,integer,integer,boolean,jsonb)'::regprocedure))>0; -- true
