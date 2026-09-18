# Harvest Tycoon payments

## Current status

The purchase table and credit function are installed in project `jnmdirvidffzxukbdmij`. The `diamond-checkout` and `stripe-webhook` Edge Functions are deployed. Database tests confirmed that duplicate fulfillment adds diamonds only once, increments the farm revision, and that test payments cannot add live diamonds. Browser users cannot write purchases or call the credit function.

**Stripe webhook creation was blocked:** the connected Stripe API key does not have `PostWebhookEndpoints` permissions. No new Stripe destination was created. Secrets and an end-to-end Checkout payment have not been verified. Purchases stay unavailable unless their configuration is present and `PAYMENTS_ENABLED` is explicitly `true`.

## Finish the screen currently open in Stripe

1. Select **Your account** (Je account).
2. Choose API version **2026-07-29.dahlia**, matching the receiving function.
3. Select `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Choose **Webhook endpoint** as the destination type.
5. Endpoint URL: `https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/stripe-webhook`
6. Description: **Harvest Tycoon diamond purchases**. Create the destination.
7. Reveal its signing secret (`whsec_...`). Copy it directly into Supabase → Edge Functions → Secrets as `STRIPE_WEBHOOK_SECRET`. Do not put it in GitHub, Vercel frontend variables or chat.

The live destination and a sandbox destination have different signing secrets. Use the secret for the mode you are testing. Avoid creating duplicate destinations for this endpoint.

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

The three `STRIPE_TEST_PRICE_*` values are only needed in test mode. Live prices have already been verified against the supplied products and are allowlisted on the server. Existing Supabase service credentials are provided by Supabase; do not copy them to the browser.

## Test before switching live

1. In a Stripe sandbox, create the three matching prices and a webhook with the same two events. Configure the test key, test signing secret, test price IDs, `STRIPE_MODE=test` and `PAYMENTS_ENABLED=true`.
2. Deploy this ZIP to the existing GitHub/Vercel project. Sign in on `https://www.harvesttycoon.com` and open Diamonds & boosts. Buttons should say **Test checkout**.
3. Complete a payment using Stripe's test payment details. The return screen must say **Test payment confirmed**. The purchase row must show `test_paid`; live diamonds must not increase.
4. Resend the event from Stripe. It must receive HTTP 200 and create no additional credit. Also test closing checkout, an unsuccessful payment and a delayed payment method. An unpaid completed event must never award diamonds.
5. Only after this passes, set the live key and live destination signing secret, `STRIPE_MODE=live`, and enable payments. No real payment was made during this update.

In live mode, confirmed purchases update the farm and private purchase receipt in one transaction. Both successful event types for the same Checkout Session still credit exactly once. Reloading the return URL never awards diamonds. Failed webhook processing returns an error so Stripe can retry.

## Deployment and limitations

Replace the project's files with the contents of `Harvest-Tycoon/`, commit and push using GitHub Desktop. Preserve your existing hosting configuration and environment variables. The frontend remains static; payment secrets and logic run in Supabase.

Checkout returns to the canonical domain `https://www.harvesttycoon.com`. Change the server's `origin` before using another domain. Do not run `supabase/payments.sql` again on this project: it has already been applied.

Automatic tax calculation is not enabled. Review the merchant's applicable tax setup before live sales; the implementation verifies the exact configured EUR amount. Refunds and disputes do not automatically remove diamonds in this version and require merchant review.

The Supabase security advisor reports no client policies on `harvest_purchases`: this is intentional, because only server functions can access it. It also reports the existing disabled leaked-password protection setting; see https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Official references: https://docs.stripe.com/checkout/fulfillment and https://docs.stripe.com/webhooks.
