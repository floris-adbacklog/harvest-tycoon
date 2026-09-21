# VIP and diamond shop · 21 September 2026

Built only from the latest supplied ZIP and checked against the live functions. Do not restore older game versions.

## Paid catalogue

| Diamonds | Price | Stripe price |
| ---: | ---: | --- |
| 150 | €1.99 | `price_1UH4KQ04FdNTUSp4MBiogXx1` |
| 500 | €4.99 | `price_1UI5oE04FdNTUSp4F2BP95IK` |
| 1,250 | €9.99 | `price_1UH5Gv04FdNTUSp4kabIfp0Y` |
| 3,500 | €24.99 | `price_1UH5HL04FdNTUSp41DLz2C1B` |

All four prices were retrieved from the connected live Stripe account and confirmed active, EUR, one-time, with the exact amounts above. No Stripe products or descriptions were modified. The Starter Pack remains €2.99, 300 diamonds, 10,000 coins and one of each of the 12 crops in inventory.

## Diamond spending

In display order: Finish one crop 10; Finish one batch 10; Double XP 50; Double earnings 100; Instant harvest 150; Finish production 200; Buildings discount 250; VIP 7 days 500; VIP 30 days 1,500.

The single-item actions affect only the chosen crop or batch. Instant harvest readies every currently growing field; Finish production readies all current production batches. Neither collects items. Buildings discount is the existing single-use 50% coin-upgrade voucher, with no expiry. Building upgrade coin/diamond costs and order replacement costs are unchanged. Timed XP/earnings boosts still last 30 minutes.

## VIP rules

- One server-owned `vipExpiresAt` in the private farm state. Purchases extend `max(serverNow, currentExpiry)` by exactly 7 or 30 days. No recurring Stripe subscription.
- Both durations provide identical strength: 10% shorter newly started crops and batches, +5% ordinary market sales, and 2× coins/XP/diamonds from daily gifts, daily challenges (including their completion bonus) and daily deliveries, including Special commissions.
- Running crop and batch timestamps never change on purchase or expiry. Apple/berry regrowth uses the entitlement at manual harvest. Nothing collects automatically while away.
- Rewards use VIP status when claimed. VIP expiry does not allow reclaiming any gift/challenge/order.
- Existing Double XP stacks with VIP on eligible XP; existing Double earnings stacks on market/delivery coins. Market totals are `floor(baseTotal × VIP factor × earnings factor)`, rounded once per sale. Today displays account for active boosts.
- Chapters, levels, family rewards, crop mastery, hands-on jobs, ordinary quests, purchase grants and building upgrades receive no VIP multiplier. Their existing base values stay unchanged.
- Renewal increases time only, never benefit percentages. A stale expected expiry is rejected, preventing a second debit from concurrent clicks even after the normal receipt window has passed.

## UI and artwork

The shop has four ordered payment cards, VIP status/remaining time, two duration options and benefit explanations. VIP and boosts costing 150+ diamonds ask for confirmation. Submission locks prevent repeated clicks while confirmation or saving is in progress. Cancel/Escape retains diamonds.

VIP badges use the generated gold star beside names on the leaderboard, profile/search and family member list. Profile also shows time remaining. Visible badges expire without requiring another paid action. No balance or private farm state is exposed by public profiles.

`public/assets/icons/vip.png` is a new transparent 1254×1254 PNG generated with imagegen using the existing gold wheat trophy as the style reference. Prompt: “Create ONE transparent-background square game inventory icon for Harvest Tycoon VIP, in the same polished hand-painted 3D farm-game style as the supplied golden wheat trophy reference. A single large friendly five-point golden star medal, small green enamel ribbon and two curved wheat sprigs at the base, one tiny sky-blue diamond accent. Warm rich gold, forest green, cream highlights, soft dimensional painted shading. Clean distinct silhouette recognizable at 24px. Centered, empty transparent margin. No letters, text, frame, background or scene.”

Anonymous GTM events use the existing parent-page dataLayer: shop view, checkout started/completed, diamond action completed, VIP purchase started/completed/extended/expired. Only approved action/plan/pack names and numerical amounts are accepted. No names, emails, player IDs, purchase IDs or raw errors are transmitted. Payment-event deduplication uses a local sessionStorage receipt marker only; analytics is not an authoritative financial ledger.

## Deployment

Applied to Supabase project `jnmdirvidffzxukbdmij`:

- Migration `vip_and_four_diamond_packs` (source: `supabase/vip-and-diamond-catalog.sql`).
- `farm-api` v43, JWT verification retained, explicit authenticated active-session checks retained.
- `diamond-checkout` v11, JWT verification retained.
- `stripe-webhook` v11, gateway JWT remains off because Stripe supplies a verified webhook signature.
- `notify-hourly` v4 was left untouched.

VIP public status is projected to `player_stats.vip_expires_at` by a server-side trigger. Browser roles cannot write either player stats or farms. The live family-context function was patched only to add this public property.

The definitions of `harvest_commit_farm` and `harvest_credit_purchase` were not replaced. Before/after MD5 hashes match: `3aee1c7fbd773babbe9017a3f543ba16` and `cbbf4970f1607a50013bf34c3e09a5e9` respectively. Existing receipt ownership, exact amount/price checks, row locking, revision checks and credit-once behavior are retained. Historical 50/100/300/600/1,000/2,000-diamond receipts remain valid with their promised reward; cached IDs create the new corresponding pack. New 500-diamond tier has its own distinct Stripe price.

**Frontend is not deployed to Vercel by this session.** Publish this ZIP with the existing `npm run build:static` workflow to show the new shop, badges and buttons. Public build configuration uses the existing Supabase URL/publishable key; no secret values were inspected or added.

## Validation and limits

- `npm test`: 353 passing, including the existing regressions plus VIP mechanics, expiry/renewal, price substitutions, all historical payment receipts, anonymous analytics and actual farm-api handler tests with simulated database responses.
- Concurrent same-request-ID VIP purchases commit once; concurrent distinct request IDs with the same expected expiry commit once and reject the stale second request. Simulated commit failure leaves the original stored farm untouched. Forged client state/balance/player/expiry fields are ignored. Expired or missing authentication is rejected.
- `npm run build:static`: succeeds. Source, public modules and deployable server modules are synced. Transparent alpha on VIP PNG confirmed.
- Responsive CSS covers narrow mobile, tablet and desktop, including full-width action buttons and bounded confirmation dialogs. **Visual browser testing was blocked by the browser URL policy refusing the local preview file. No mobile screenshot/real-device verification is claimed.** Check 320/360/375/390/430px, tablet and desktop after frontend publication.
- No real-money purchase or end-to-end live VIP purchase was made. Checkout/credit tests use fixtures; live Stripe prices and deployed versions were checked read-only.
- Supabase advisors still report existing notification security-definer access, anonymous-policy notices and disabled leaked-password protection; this release did not alter those systems. Server-only purchase/family tables intentionally have RLS with no client policies. References: [function access](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [anonymous policies](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
