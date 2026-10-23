# Checkout recovery (23 Oct 2026): release

Options 1, 2, 4 and 5 of the checkout drop-off. Nothing here was run or deployed. Order matters only as below; each step is safe on
its own (the site reads `unfinished` only when the catalogue has it; the cron only gets a 404 until its function is deployed).

1. **SQL** (Supabase SQL editor, project `jnmdirvidffzxukbdmij`): run `supabase/checkout-reminder.sql` as a whole.
   Adds two columns to `harvest_purchases` (`reminder_mailed_at`, `reminder_mail_note`), two indexes, four service-role functions
   (`checkout_reminder_due/_candidates/_claim/_done`) and the cron `harvest-checkout-reminder` (every hour at :23). No new table, so
   the account deletion needs nothing new. Safe to run again.

2. **Functions** (from the repo root, after `node scripts/sync-game.mjs`, which copies `game/payments.js` into both):

   ```sh
   supabase functions deploy diamond-checkout --project-ref jnmdirvidffzxukbdmij
   supabase functions deploy checkout-reminder --no-verify-jwt --project-ref jnmdirvidffzxukbdmij
   ```

   - `diamond-checkout`: the website's catalogue now carries `unfinished` (the latest website purchase of the last 24 hours that was
     not paid, nothing paid since). One extra query in the same round trip, only for the website (never Google Play, the App Store or
     Kongregate). Deploy with JWT verification as before (no flag).
   - `checkout-reminder`: new, uses the existing secrets `RESEND_API_KEY` and `MAIL_FROM` (and `APP_URL` if set). Off switch:
     `supabase secrets set CHECKOUT_REMINDER_ENABLED=false --project-ref jnmdirvidffzxukbdmij`.

3. **Site**: push the branch as usual (Vercel builds `public/cloud` from `src/`). The choice after Buy (Android browser), the
   not-available line and the reminder card go live with it. Without step 2 the reminder card simply never shows.

Check after a day:

```sql
select p.pack, p.created_at, p.reminder_mailed_at, p.reminder_mail_note,
 exists(select 1 from public.harvest_purchases c where c.player_id=p.player_id and c.status='credited' and c.created_at>p.reminder_mailed_at) as paid_after
from public.harvest_purchases p where p.reminder_mailed_at>now()-interval '7 days' order by p.reminder_mailed_at desc;
```

Analytics (Tag Manager / GA4): `pay_choice_shown`, `pay_with_google_play`, `pay_with_app_store`, `card_unavailable_shown`,
`checkout_reminder_shown`, `checkout_reminder_retry`, `checkout_reminder_other` (each with `pack`). Google Play Console's acquisition
report shows the store visits as `utm_source=shop` / `utm_source=reminder`, `utm_medium=web`, `utm_campaign=checkout`.

Roll back: the site and `diamond-checkout` can go back freely (the extra field is ignored by older pages). To stop the emails:
`select cron.unschedule('harvest-checkout-reminder');` or the secret above.
