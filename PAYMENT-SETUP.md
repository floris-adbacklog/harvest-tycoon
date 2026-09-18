# Harvest Tycoon payments

## Current status

The purchase table and credit function are installed in project `jnmdirvidffzxukbdmij`. The `diamond-checkout` and `stripe-webhook` Edge Functions are deployed. Database tests confirmed that duplicate fulfillment adds diamonds only once, increments the farm revision, and that test payments cannot add live diamonds. Browser users cannot write purchases or call the credit function.

The live webhook now exists and was verified as enabled: `we_1UH6Qg04FdNTUSp4IZoRQh6J`. Its URL and events are correct. The user reports that its signing secret has been saved in Supabase. Secret values and a full Checkout payment have not been inspected or verified. Do not create a second live webhook.

Endpoint: `https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/stripe-webhook`
Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`.
The configured destination uses event API version `2024-04-10`; the handler uses the common Checkout Session fields supported by that version.

If the shop shows **Currently unavailable**, check that `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are present, `STRIPE_MODE` matches the key's mode, and `PAYMENTS_ENABLED=true`. The webhook signing secret alone does not enable checkout. Keep all secrets in Supabase, never in the browser or GitHub.

## Starter Pack

Product: `prod_VHfWRMcedF9ShZ`; verified active one-time EUR price: `price_1UH6BG04FdNTUSp4Mg5Zl4pD` (€2.99).
Rewards: 10,000 coins, 300 diamonds, and +1 Corn, Wheat, Cabbage, Pumpkin, Sunflower, Barley, Lettuce, Red cabbage and Cauliflower in the ordinary inventory. There is no separate seed inventory and no automatic planting.

The small bottom-left offer is available for 72 hours from the verified account creation date and disappears after purchase. The server enforces one purchase per account and mode. Returning to the game without payment does not award anything. Delayed payment confirmation can finish an eligible checkout after the offer window; new checkouts cannot start after it.

For sandbox tests, also configure `STRIPE_TEST_PRICE_starter` with a sandbox one-time EUR price of 299 cents. The lowercase `starter` suffix is intentional. A sandbox Starter Pack never grants live coins, diamonds or crops.

## Server secrets

Set these in Supabase Edge Function Secrets, never in frontend variables:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Restricted Stripe API key for the chosen mode, with Checkout Sessions write/read and Prices read access. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this exact webhook destination and mode. |
| `STRIPE_MODE` | `test` first; `live` only after successful verification. |
| `PAYMENTS_ENABLED` | `false` until ready to run the payment test; `true` to enable checkout in the selected mode. |
| `STRIPE_TEST_PRICE_50` | Sandbox EUR one-time Price ID for €1.99. |
| `STRIPE_TEST_PRICE_300` | Sandbox EUR one-time Price ID for €9.99. |
| `STRIPE_TEST_PRICE_1000` | Sandbox EUR one-time Price ID for €24.99. |

The `STRIPE_TEST_PRICE_*` values are only needed in test mode. Live prices have already been verified against the supplied products and are allowlisted on the server. Existing Supabase service credentials are provided by Supabase; do not copy them to the browser.

## Test before switching live

1. In a Stripe sandbox, create the three matching prices and a webhook with the same two events. Configure the test key, test signing secret, test price IDs, `STRIPE_MODE=test` and `PAYMENTS_ENABLED=true`.
2. Deploy this ZIP to the existing GitHub/Vercel project. Sign in on `https://www.harvesttycoon.com` and open Diamonds & boosts. Buttons should say **Test checkout**.
3. Complete a payment using Stripe's test payment details. The return screen must say **Test payment confirmed**. The purchase row must show `test_paid`; live diamonds must not increase.
4. Resend the event from Stripe. It must receive HTTP 200 and create no additional credit. Also test closing checkout, an unsuccessful payment and a delayed payment method. An unpaid completed event must never award diamonds.
5. Only after this passes, set the live key and live destination signing secret, `STRIPE_MODE=live`, and enable payments. No real payment was made during this update.

In live mode, confirmed purchases update the farm and private purchase receipt in one transaction. Both successful event types for the same Checkout Session still credit exactly once. Reloading the return URL never awards diamonds. Failed webhook processing returns an error so Stripe can retry.

## Deployment and limitations

Replace the project's files with the contents of `Harvest-Tycoon/`, commit and push using GitHub Desktop. Preserve your existing hosting configuration and environment variables. The frontend remains static; payment secrets and logic run in Supabase.

Checkout returns to the canonical domain `https://www.harvesttycoon.com`. Change the server's `origin` before using another domain. Do not rerun `supabase/payments.sql`, `supabase/starter-pack.sql` or `supabase/activity-status.sql` on this project: these changes are already applied. On a fresh project, apply them in that order after the original farm schema.

Automatic tax calculation is not enabled. Review the merchant's applicable tax setup before live sales; the implementation verifies the exact configured EUR amount. Refunds and disputes do not automatically remove diamonds in this version and require merchant review.

The Supabase security advisor reports no client policies on `harvest_purchases`: this is intentional, because only server functions can access it. It also reports the existing disabled leaked-password protection setting; see https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Official references: https://docs.stripe.com/checkout/fulfillment and https://docs.stripe.com/webhooks.
