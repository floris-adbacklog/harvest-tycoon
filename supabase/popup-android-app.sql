-- Pop-ups for the Android app (9 Oct 2026): a new group 'android_app', "Android app (Google Play)" in the Admin dashboard. The game
-- decides it on the device (src/popup-ui.js fitsDevice, public/android.js googlePlayApp): only in our app from Google Play, never in the
-- iPhone app, a browser, CrazyGames, Kongregate or itch. A game from before today does not know the group and never shows it (every
-- version since 26 Sep 2026 shows only the groups it knows and leaves the rest unseen), so players with an old version open are safe
-- without a check here: they get the pop-up once their game has updated. Its notification would reach every farmer (News knows no
-- devices), so this group takes a pop-up only. The table's check and popup_post's own check learn it; popup_post is changed in place
-- from its LIVE definition (only that line, as live on 9 Oct 2026), so nothing else in it can go back to an older copy; it stops if the
-- line is not as expected. Re-runnable. Run after popup-feedback-target.sql and news-min-level.sql.
alter table public.popups drop constraint if exists popups_audience_check;
alter table public.popups add constraint popups_audience_check check (audience in ('all','browser','phone_browser','phone','desktop','android_app'));
do $patch$
declare d text;
 old text:=$o$ if who not in ('all','browser','phone_browser','phone','desktop') then raise exception 'Choose who sees it.' using errcode='22023'; end if;$o$;
 new text:=$n$ if who not in ('all','browser','phone_browser','phone','desktop','android_app') then raise exception 'Choose who sees it.' using errcode='22023'; end if;
 if who='android_app' and coalesce(p_news,true) then raise exception 'Send it to the Android app as a pop-up only: a notification would reach every farmer.' using errcode='22023'; end if;$n$;
begin
 d:=pg_get_functiondef('public.popup_post(text,text,text,text,text,integer,integer,boolean,jsonb)'::regprocedure);
 if position('''android_app''' in d)>0 then return; end if;
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'popup_post is not as expected: add android_app to its audience list by hand'; end if;
 execute replace(d,old,new);
end $patch$;
-- Check: select pg_get_constraintdef(oid) from pg_constraint where conname='popups_audience_check'; -- ... 'desktop'::text, 'android_app'::text])
-- and: select position('android_app' in pg_get_functiondef('public.popup_post(text,text,text,text,text,integer,integer,boolean,jsonb)'::regprocedure))>0; -- true
