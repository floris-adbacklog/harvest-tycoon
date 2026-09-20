# Harvest Tycoon — gradual progression, full release v7

This complete export builds on Family Invitations v6. It includes the entire game, assets, source, regression tests and a deployable `dist-static/` frontend.

## New-player flow

New accounts begin with Wheat, Corn, the Farmhouse, the Chicken Coop and two starter feed. The daily gift is available immediately. Previously unlocked crops, buildings, recipes and activities are preserved for existing accounts; existing ownership and purchase opportunities are grandfathered.

| Level | New crop | New building (coins) | Production or activity introduced |
|---|---|---|---|
| 1 | Wheat, Corn | Farmhouse and Chicken Coop included | Eggs; daily gift |
| 2 | — | Feed Mill · 100 | Animal feed |
| 3 | Lettuce | — | Daily challenges |
| 4 | — | Dairy Barn · 300 | Milk |
| 5 | Barley | — | Barley feed; quick deliveries |
| 6 | — | Windmill · 700 | Grain meal, flour; hands-on jobs |
| 7 | Green beans | — | Large barley-feed recipe; farm chores |
| 8 | — | Bakery · 1,000 | Bread; village orders |
| 9 | Cabbage | — | Cheese, fertilizer; crop mastery |
| 10 | — | Packing Shed · 1,400 | Fresh salad; Farm Family |
| 11 | Cauliflower | — | Vegetable boxes, large flour batches; farm stall |
| 12 | — | Farm Kitchen · 3,500 | Vegetable stew; tractor; special commissions |
| 13 | Pumpkin | — | Pumpkin pie |
| 14 | — | — | Diamond boosts |
| 15 | Red cabbage | — | Pickled cabbage |
| 16 | — | — | Green bean gratin |
| 17 | Sunflower | — | Sunflower oil |
| 18 | — | — | Silo research |
| 19 | — | — | Estate projects |
| 20 | Apples | — | Orchard salad; regrowing fruit |
| 21 | — | Juice Press · 6,500 | Apple juice |
| 22 | — | — | Apple pie |
| 23 | Berries | — | Apple & berry juice, berry smoothie, berry cheesecake |
| 24 | — | Preserves Workshop · 10,000 | Berry preserves, apple compote, apple vinegar |
| 25 | — | — | Pickled green beans, berry tart, harvest hamper |

Buildings unlock the option to buy them. Recipes also require their buildings and ingredient chains. The Dairy Barn requires the Feed Mill first; the Bakery requires the Dairy Barn and Windmill. Every production building has an obtainable starting recipe at its unlock level when earlier suppliers are owned. All crops, buildings, recipe level gates and feature level gates are available by level 25. Building upgrades, purchases, chore mastery and estate completion still require play.

Wheat and Corn stay available at every level. The early production chain is feed → milk/eggs, followed by grain meal → flour → bread. The old additional bread-collection requirement for Cabbage and Packing Shed is removed for new progression. Hands-on jobs open at level 6; selling an egg remains an early beginner step, with updated explanatory text.

Quick deliveries start at level 5, village orders at level 8 and special commissions at level 12, subject to an available ingredient chain. A commission is never replaced with an inflated-reward wheat order. Newly available tiers append without changing an existing order, its revision or claimed reward. Challenges and orders use obtainable crops and owned production. Level-10 families receive weekly baskets using level-10 ingredients; advanced templates return when every member has reached level 17. Existing weekly orders are left intact.

## Interface and artwork

- Locked seeds, buildings and recipes are grouped in collapsed sections. Gray artwork, readable text, a painted lock and explicit unlock requirements distinguish them from usable options.
- Only three upcoming milestones appear in the journal. Early regular quests show up to three active goals; later levels show up to five.
- Level-up popups show the actual crop/product/building artwork and new unlocks. Purchasing a building also announces its usable recipes.
- Locked activities stay out of the main farm controls. Market highlights use obtainable goods or items in stock. The Farmhouse orchard section appears once relevant.
- Layout rules include wrapping recipe controls, full-width rows on narrow screens, 44px-or-larger relevant touch targets and responsive popup sizing.
- `public/assets/icons/lock.png`: new original imagegen illustration, 384 × 384, transparent; prompt and method in `LOCK-ICON-NOTES.md`.
- `public/assets/icons/familyhall-model.png`: transparent thumbnail rendered from `house_008.glb`, used specifically by the Family Hall map pin. The uploaded GLB matches the existing model byte for byte. The painted `familyhall.png` remains used elsewhere. Reproduction script: `scripts/render-family-hall-thumbnail.py`.

## Existing farms and server

Supabase project `jnmdirvidffzxukbdmij`: `farm-api` version **39**, ACTIVE, JWT verification enabled. Only the shared rules model changed in the Edge Function; the other five deployed files are unchanged. Save format is version 14, progression version 2. Migration runs in the authoritative model and preserves balances, inventory, XP, jobs, timers, quests, beginner rewards and already granted level rewards. It does not plant Starter Pack crops or grant extra resources.

No database schema migration is needed. The protected `harvest_commit_farm` function remains unchanged (MD5 `3aee1c7fbd773babbe9017a3f543ba16`). Do not reapply obsolete leaderboard SQL over this function.

## Verification

- **268 automated tests pass**, including progression at all 25 levels, construction prerequisites, delivery availability with and without purchased buildings, final-chain reachability, unauthorized locked actions and save migration.
- Production static build passes; shared model copies match; progression CSS parses without errors.
- Read-only migration checks on all **37** current saved farms (32 guided, 5 legacy) preserved existing access, balances, inventory, timers and progress. No live farms were rewritten for this test. A separate regression covers previously available buildings bought after migration.
- An optimistic scripted early-game run without paid boosts, artificial XP or chores reached levels 2/3/4/5/6 after approximately 1.5/6/11/16.5/24 minutes and could afford its Feed Mill and Dairy Barn. This checks for early resource deadlocks; it is not a player-retention prediction.
- Browser/device visual testing and a real authenticated-player walkthrough were unavailable. Responsive CSS, assets and game logic were checked; verify the published frontend on representative phone/tablet/desktop browsers before a broad rollout.

## Publish

The server rules are already live. Publish the included frontend using the existing GitHub/Vercel workflow, or upload the contents of `dist-static/` to the current static host. This export does not itself publish the frontend.
