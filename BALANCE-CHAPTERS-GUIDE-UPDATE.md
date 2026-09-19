# Balance, chapter rewards and shorter guide

This complete project export includes the previous diamond options, higher hands-on XP and the 20% Market reduction for all crops and farm goods.

## Balance review

A read-only review of the two requested leading farms found substantial accumulated stock and upgraded buildings, but limited liquid coins. There are only five players; these snapshots and legacy counters cannot establish reliable earning rates or historical XP sources. No existing balances, levels, inventory or unlocked features were reset. Existing production jobs retain their saved rewards and output.

The recipe definitions did reveal a large difference between short-batch XP and long-production XP, plus an inefficient bulk feed recipe. Targeted adjustments apply to newly started batches:

| Recipe | Previous XP | New XP |
| --- | ---: | ---: |
| Corn feed | 8 | 4 |
| Barley feed | 8 | 6 |
| Refine grain meal into flour | 12 | 8 |
| Sunflower oil | 15 | 80 |
| Pickled cabbage | 20 | 60 |
| Pumpkin pie | 20 | 50 |
| Farmhouse cheese | 14 | 24 |
| Vegetable box | 15 | 30 |
| Apple vinegar | 60 | 90 |

Wind-milled barley feed now produces 10 feed from 8 barley instead of 7. Its 20-minute base production time stays the same. Small feed batches remain quicker; the bulk recipe saves ingredients. All recipes retain positive value added at normal market prices, while daily demand can still make selling ingredients preferable on some days.

Village orders favour the upper range of accessible production on two days out of three. Every third day uses the full eligible catalogue to preserve variety and demand for earlier goods. Quick deliveries remain accessible, while Special commissions keep their existing larger goals and premium. Already-issued boards keep their contents and promised rewards until replacement or daily reset.

## Estate chapter diamonds

| Chapter | Diamonds |
| --- | ---: |
| 1 | 10 |
| 2 | 20 |
| 3 | 35 |
| 4 | 50 |
| 5 | 75 |
| 6 | 100 |

Total: 290 diamonds, alongside the existing XP and farm-stall income upgrades. Rewards are credited when the player completes the finished chapter. An estate ledger prevents double claiming. Double XP does not multiply diamonds.

Previously completed chapters receive any missing diamond rewards once on the next farm load/refresh, persisted through the existing atomic revision check. Their XP is not awarded again. After the six chapters, ongoing commissions continue with their existing XP and stall-income rewards; they do not repeat the chapter diamond payouts.

The Estate screen shows chapter diamond rewards before construction and in the completion message.

## Shorter guide

A little guide to growing now contains nine short practical topics. Exact prices, percentages and long reward lists were removed from the guide; their dedicated game screens still show the relevant figures. All game copy remains English.

## Verification and release

- 196 automated tests passed, including the introductory progression, all daily order categories, saved-job preservation, chapter catch-up/replay prevention and boost handling.
- Static production build succeeded. Changed client scripts passed syntax checks.
- Shared rules match the public, static-build and server copies.
- Supabase farm-api version 28 is ACTIVE with JWT verification enabled. Deployed source was read back and matched this export.
- No schema migration is required; the new chapter ledger is stored in the existing farm state.
- No personal player snapshots are included in this ZIP.
- No physical-device visual test or authenticated live-player end-to-end test was performed.

Copy this ZIP's contents over the GitHub project, commit and push to publish the frontend through Vercel. Preserve your locally managed environment secrets. Supabase has already been updated.
