-- The admin's powers only with Google (10 Oct 2026). Since the website also signs in with Discord and Apple, a session that says "oauth"
-- (supabase/admin-google-only.sql) no longer proves Google: Supabase links a Discord or Apple sign-in with the same verified address to
-- the account. So the admin's own session counts only while the account has no sign-in besides Google and its email (auth.identities);
-- an admin account that picked up another one has no powers until it is removed. For another player (a message's staff badge, "cannot
-- be muted", the purchase alerts) the confirmed address alone still says admin. The same rule is in farm-api (admin-service.js).
-- On 10 Oct 2026 both admin accounts have only Google and email. Patched from the LIVE definition (read on 10 Oct 2026, md5
-- 681aff59b24e63e597d7390b4693f0bd), only the session check: a function patched already is left alone, one without the expected text
-- stops the file. Re-runnable.
do $do$
declare def text:=pg_get_functiondef('public.chat_staff_role(uuid)'::regprocedure);
 old text:=$a$coalesce((select auth.jwt()->'amr') @> '[{"method":"oauth"}]'::jsonb,false))$a$;
 new text:=$b$(coalesce((select auth.jwt()->'amr') @> '[{"method":"oauth"}]'::jsonb,false) and not exists(select 1 from auth.identities i where i.user_id=p_player and i.provider not in ('google','email')))) $b$;
begin
 if position('auth.identities' in def)>0 then return; end if;
 if position(old in def)=0 then raise exception 'chat_staff_role: the expected text was not found; read the live definition before changing it'; end if;
 execute replace(def,old,rtrim(new));
end $do$;
revoke execute on function public.chat_staff_role(uuid) from public, anon, authenticated;
