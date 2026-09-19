# Harvest Tycoon — Farm Pantry Update

Based on the user-supplied Harvest-Tycoon-latest.zip. Its leaderboard changes, compact Seed Shop and helping-hand tutorial illustration are retained. All gameplay text is English.

## Nine new products

Every recipe produces one item. These are base times before building upgrades.

| Product | Ingredients | Building | Farmer level | Time | Base sale value | XP |
| --- | --- | --- | ---: | --- | ---: | ---: |
| Apple & Berry Juice | 2 Apples + 2 Berries | Juice Press | 10 | 1 hour | 780 | 45 |
| Berry Smoothie | 2 Berries + 2 Milk + 2 Honey | Juice Press | 10 | 90 minutes | 810 | 48 |
| Honey Apple Compote | 3 Apples + 2 Honey | Preserves Workshop | 10 | 2 hours | 640 | 42 |
| Apple Vinegar | 1 Apple juice | Preserves Workshop | 10 | 6 hours | 1,150 | 60 |
| Pickled Green Beans | 4 Green beans + 2 Apple Vinegar | Preserves Workshop | 10 | 3 hours | 4,100 | 80 |
| Green Bean Gratin | 4 Green beans + 2 Cheese + 2 Milk | Farm Kitchen | 7 | 3 hours | 1,650 | 65 |
| Orchard Salad | 2 Apples + 4 Lettuce + 2 Cheese | Packing Shed | 8 | 45 minutes | 1,200 | 38 |
| Berry Cheesecake | 4 Berries + 2 Cheese + 4 Flour + 2 Eggs | Bakery | 11 | 4 hours | 2,250 | 85 |
| Harvest Hamper | 2 Apple juice + 2 Berry preserves + 2 Fresh bread | Packing Shed | 12 | 8 hours | 5,900 | 140 |

Prices use the existing daily market. At base prices, each recipe adds at least 35% to its ingredients' total value. Daily demand can make processing less attractive on a particular day; the recipe panel shows today's ingredient and output values.

Apple Vinegar and Pickled Green Beans require an open Juice Press. Harvest Hampers require the Juice Press and Preserves Workshop. Locks are enforced on the server even when ingredients are already in inventory. Bulk production and Collect all remain available, with one slot per building level.

## Quests and deliveries

- 9 appended regular quests: 94 total, with previous IDs and claims preserved.
- 9 daily challenges: 45 possible challenges, using existing daily diamond rewards.
- 9 delivery templates: 37 total. Village orders double template quantities as before.
- 3 special commissions: 13 total. The valley gift collection requests exactly two Harvest Hampers. The orchard dessert reception and A feast from the kitchen garden combine several production chains. Rewards are coins and diamonds, with no reputation system.
- Today's existing tasks and orders remain unchanged. Newly eligible entries rotate in on subsequent days.

Existing balances, Starter Pack contents, planted fields, running batches and tutorial completion are retained. Perennial seed cards now show a short regrowth hint that is readable on touchscreens. Recipe messages name their actual building prerequisites.

## Artwork

Nine new transparent 256 × 256 PNGs are integrated into production, inventory, Market and deliveries. They are under public/assets/icons: orchardjuice, berrysmoothie, applecompote, applevinegar, pickledbeans, beangratin, orchardsalad, berrycheesecake and harvesthamper.

Built-in image generation was used. Shared style prompt: standalone warm painted 3D farm goods, rounded forms, rich natural colors, upper-left highlights, a clear silhouette at 48px, transparent background, no text or frames. Each image depicts its corresponding product. Vinegar's surrounding glow was removed in a follow-up image edit.

## Verification and deployment

- 163 automated tests pass, including bulk production, duplicate collection, recipe chains, unlocks, daily rotation, commissions and save compatibility.
- npm run build:static succeeds.
- Supabase farm-api version 22 is ACTIVE, with JWT verification enabled. Downloaded source matches this export exactly.
- pantry-production-counters.sql is already applied to project jnmdirvidffzxukbdmij. Database verification confirmed all nine new goods are counted, while harvest and items-sold counters remain correct. The internal function is restricted to server access.
- Do not rerun the historical leaderboard-goods-sold.sql or orchard-expansion.sql on this project. The former predates the orchard counters.
- No payment code, live payment or purchase receipt was changed. Physical Android/iOS interaction was not tested.
- The security advisor still reports the existing disabled leaked-password protection setting: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Purchase receipts intentionally have no client RLS policies.

Extract this ZIP and copy its contents into the existing harvest-tycoon repository, replacing matching files. Commit and push with GitHub Desktop. Vercel runs build:static and serves dist-static. Keep the existing Supabase public environment variables. The backend is updated; this frontend has not been pushed or published automatically.
