# Harvest Tycoon — live payments

The deployed diamond-checkout function now runs in **live mode**. STRIPE_MODE is no longer used by this production endpoint. A missing PAYMENTS_ENABLED value no longer leaves the shop disabled.

## Required Supabase secrets

Open Supabase project jnmdirvidffzxukbdmij → Edge Functions → Secrets.

| Name | Value |
| --- | --- |
| STRIPE_SECRET_KEY | A live Stripe restricted server key (rk_live_…) with Checkout Sessions write/read and Prices read access. A live sk_live_… key also works; restricted access is preferred. |
| STRIPE_WEBHOOK_SECRET | The whsec_… signing secret for webhook we_1UH6Qg04FdNTUSp4IZoRQh6J. |
| PAYMENTS_ENABLED | Optional. Set to true to enable, or false to explicitly disable sales. |

Never place these keys in GitHub, frontend environment variables, or chat. A test key cannot enable this live shop. Product IDs and a webhook secret do not replace the Stripe server API key.

The webhook is verified as enabled with the correct endpoint and both required events:
- https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/stripe-webhook
- checkout.session.completed
- checkout.session.async_payment_succeeded

The destination currently uses event API version 2024-04-10; the receiving handler reads Checkout fields supported by that version. No duplicate destination is needed.

## Products

| Pack | EUR | Reward |
| --- | --- | --- |
| 50 diamonds | €1.99 | 50 diamonds |
| 300 diamonds | €9.99 | 300 diamonds |
| 1,000 diamonds | €24.99 | 1,000 diamonds |
| Starter Pack | €2.99 | 10,000 coins, 300 diamonds and each of the 9 crops ×1 in ordinary inventory |

Starter product: prod_VHfWRMcedF9ShZ. Its verified one-time price is price_1UH6BG04FdNTUSp4Mg5Zl4pD.

The Starter Pack is available during the first 72 hours after account creation, once per account. It disappears after purchase or expiry. Rewards are added to the account only after a signed successful-payment webhook. Closing checkout or reopening the return URL grants nothing. Server-side reservation prevents multiple payable starter checkouts; confirmed Stripe expiry releases an unpaid reservation.

## Verification status

Latest user report: checkout opens after enabling Prices Read on the live restricted key. The earlier permission-denied failure was therefore identified. The latest frontend update restores full-colour available pack cards and styles the purchase return dialog; it does not change payment permissions or server fulfilment.

The server functions are deployed. Automated tests cover live/test key selection, the emergency off switch, pack amounts, ownership, payment status and line items. Database transactions verified one-time rewards, ordinary inventory grants, expiry, revision updates and client access restrictions under the actual server role. All fixtures were rolled back.

**No end-to-end Stripe payment has been performed or claimed as verified.** Secret values have not been inspected. A matching live key and a correct signing secret are still required. To test with Stripe test cards, use a separate sandbox deployment configured for test mode; this production endpoint deliberately accepts live purchases only.

After an authorized payment, verify the purchase is credited in harvest_purchases and the correct player's balance increases once. Resending the same event must not award a second reward. Investigate any failed webhook delivery in Stripe before taking further payments; PAYMENTS_ENABLED=false disables new checkouts.

## Deploy the interface

Replace your GitHub project's files with the contents of Harvest-Tycoon/ and push using GitHub Desktop. Vercel will build the updated interface. Preserve the existing hosting environment variables. Payment keys stay in Supabase.

The database changes are already applied: do not rerun payments.sql, starter-pack.sql or activity-status.sql on this project. On a fresh installation, apply those scripts in that order after the base farm schema.

The checkout return URL is https://www.harvesttycoon.com/play.html. Automatic tax calculation is not enabled; review the merchant's applicable tax configuration. Refunds/disputes do not automatically remove diamonds and require merchant review.

The Supabase advisor notice about harvest_purchases having no client policies is intentional: only the server can access purchase records. Existing leaked-password protection remains disabled; see https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
