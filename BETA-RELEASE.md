# Harvest Tycoon — beta update

All gameplay text is English. The farm now has 7 buildings, 16 recipes, 41 permanent quests and up to 24 planting fields.

## Mobile controls and quests

The mobile HUD has a fixed Farm / Buildings / Market / Quests / More navigation bar. Daily rewards, boosts, estate, utilities, account controls and sound are in More. The selected seed opens the seed shop. Farm or the camera reset button brings the view back to the fields.

On desktop, tablet and phone, click or tap to work a field or open a building. Hold the left mouse button, a finger or a stylus down and drag anywhere on the farm to move up, down, left or right; pinch with two fingers to zoom. This also works when starting a drag on a field or a floating building or tractor icon. Arrow buttons have been removed. A drag or pinch never plants, harvests, opens a menu or spends coins. Floating buttons stay in place when pressed, with their pictures centered. The decorative weather and farm title block has been removed.

Quests open directly in a full-height mobile sheet, with Ready / In progress / Completed filters and clear progress bars. Claimable rewards are selected first; all 41 quests remain accessible. Dialog headings and close buttons stay visible while scrolling. The farm viewport is separated from the controls, and landscape phones use a compact navigation rail.

Mobile gestures and quest opening/claiming are covered by automated event tests. The supervised preview browser was unavailable in this workspace; real-device visual and touch verification is still outstanding.

## Windmill and fresh baking

The Windmill is a separate production building with ten upgrade levels. Its body and moving sails use `tower_001.glb` and `tower_020.glb` from the supplied farm pack.

| Recipe | Ingredients | Output | Base time |
| --- | --- | --- | --- |
| Grind grain meal | 8 wheat + 4 barley | 3 grain meal | 20 min |
| Refine grain meal into flour | 1 grain meal | 4 flour | 4 min |
| Mill a large flour batch | 3 grain meal | 14 flour | 12 min |
| Wind-milled barley feed | 8 barley | 7 feed | 20 min |
| Mix natural fertilizer | 2 grain meal + 2 cabbage | 3 fertilizer | 30 min |

Flour is made at the Windmill and used at the Bakery. Fresh bread sells for 340 coins per loaf; fresh pumpkin pie sells for 2,100 coins. Flour sells for 60 coins per unit. All mixed recipes produce goods worth more than their ingredients.

Use fertilizer from the Windmill panel: choose a growing field and spend one fertilizer to remove 35% of its remaining growing time. Each planting can be fertilized once. Watering and extra care remain separate actions.

Running flour jobs from the previous Feed Mill keep their original completion time, one-flour yield and XP. New batches retain their output and XP in the save so later balancing does not alter a paid-for batch.

## Diamonds

Daily gifts retain their coin rewards and add diamonds: **2, 3, 4, 5, 6, 8, 12** over a seven-day streak. The cycle repeats. A missed day resets the streak without removing earned diamonds. Each UTC day's gift can be claimed once.

| Boost | Diamonds | Effect |
| --- | --- | --- |
| Double XP | 10 | Twice the XP from farm actions for 30 minutes |
| Double earnings | 15 | Double market and delivery coins for 30 minutes; gifts and passive income are unaffected |
| Instant harvest | 8 | Finish all currently growing crops; harvest them manually |
| Builder’s discount | 20 | One 50% discount on a production-building upgrade; no expiry |
| Finish production | 12 | Finish all active batches; collect them from their buildings |

Timed boosts cannot be bought again while active. Immediate boosts are unavailable without eligible work. An upgrade voucher is only consumed after a successful upgrade; one voucher can be held at a time. Failed purchases do not spend diamonds.

The disabled post-beta store displays **50 diamonds / €1.99**, **300 / €9.99**, and **1,000 / €24.99**. There is no payment integration or action to credit bought diamonds. Before enabling real-money purchases, balances and purchases must move to verified server-side accounting.

## Quests, artwork and saves

Nine new quests cover Windmill batches, grain meal, flour, fertilizer, diamond rewards, boosts, Windmill upgrades, fresh bread and fresh pumpkin pie. They appear first in the quest list. Existing quest IDs and rewards already collected are preserved.

The farm stall now uses the original roofed `stall_002.glb` rather than a box. The farm also uses the supplied greenhouse, goat, barrels, crates, bags and buckets. Existing crop geometry comes from the supplied pack; red cabbage is a material-color variation of the cabbage model.

All nine crop pictures and the product, currency, tool and navigation pictures share a consistent illustrated style with transparent backgrounds. The seed shop, selected seed, ingredients, market, journal and mastery collection use the same artwork for each item. The three sheets are `crops-v2.png`, `goods-v2.png` and `interface-v2.png` under `public/assets/icons/`. Each picture uses a square background cell, so neighbouring images cannot show in the margins. The old SVG atlas viewport and mixed crop thumbnails are no longer used by the interface. Building pins use each building's own original-model thumbnail; the Feed Mill and Windmill are distinct. The header and journal use a clean level badge with a readable number.

The current full-farm save remains device-local, as in the previous release. Diamonds, boosts, jobs and inventory survive reloads on that device. Only existing account stats (coins and level) are synchronized by the current Supabase integration; diamonds and the full farm do not synchronize across devices in this beta.

## Build and export

Use Node 22.13+ and the project's pnpm version. Install with `pnpm install --frozen-lockfile`.

- `pnpm test`: automated gameplay and save checks.
- `pnpm build`: Sites build.
- `pnpm build:static`: standalone Vercel/static-host output in `dist-static/`.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the build environment for account features. Use only the browser publishable key. Existing environment values and auth behavior are unchanged by this beta update.

The source ZIP includes the required art and source files, without dependency folders or local credentials. The supplied models are included only as part of this game, not as a standalone asset pack.
