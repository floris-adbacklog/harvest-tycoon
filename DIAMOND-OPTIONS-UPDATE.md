# Diamond options and hands-on rewards

This full project export includes all previous updates.

## Diamond options

- Finish one batch: 20 diamonds. Choose a running batch in the shop or its building. Only that batch becomes ready. Collect its goods afterwards. It counts as a boost used.
- Replace an order: 5 diamonds, up to two replacements per UTC day. Only unfinished orders with an available alternative can be replaced. The new order stays in the same category and farmer-level group; inventory is retained. Current prices determine its quote, so rewards and ingredients can change.
- Building upgrades: choose coins or diamonds. Both upgrade immediately; there is no additional upgrade timer. Finish and collect current batches before upgrading. Diamond payments preserve coins and coin-discount vouchers. Existing coin prices are retained.

| Target building level | Diamonds |
| --- | ---: |
| 2 | 25 |
| 3 | 45 |
| 4 | 75 |
| 5 | 110 |
| 6 | 160 |
| 7 | 225 |
| 8 | 300 |
| 9 | 400 |
| 10 | 525 |

The server validates balances, eligibility, quoted prices, building levels, batch identity and order revisions. A stale order cannot be delivered or replaced after its contents change. Daily replacement limits survive reloads and reset with the UTC day.

## A helping hand

Hands-on job XP is four times higher:

| Station | XP | Coins | Item | Cooldown |
| --- | ---: | ---: | --- | --- |
| Greenhouse | 28 | 20 | 1 Lettuce | 3 minutes |
| Apiary | 32 | 26 | 1 Honey | 4 minutes |
| Animal paddock | 28 | 24 | 1 Natural fertilizer | 3 minutes |
| Tool workshop | 32 | 30 | 1 Animal feed | 4 minutes |

Visiting all four different stations adds 40 XP and 22 coins. A complete round earns 160 XP and 122 coins before boosts and automatic level-up rewards. Double XP doubles job and round XP once. Cooldowns start at completion, and unfinished jobs remain saved. No retrospective XP is granted for previously completed jobs.

## Guide

A little guide to growing now explains gradual unlocks, the egg-sale milestone, parallel batches, collection, market quantities, orchard regrowth, all station rewards, order replacement, diamond upgrades and automatic level rewards. Station rewards and boost prices are read from the shared game constants when the guide opens. Existing players see guidance that preserves their previously unlocked access.

## Validation and deployment

- 191 automated tests passed, including invalid/repeated actions, day rollover, inventory preservation, diamond spending, XP boosts and automatic level rewards.
- Production build succeeded; changed JavaScript passed syntax checks.
- Shared game logic matches the public, static-build and Supabase copies.
- Supabase farm-api version 26 is ACTIVE with JWT verification enabled. Its deployed source was read back and matched this export.
- No database migration is required.
- The frontend still needs to be published through your GitHub/Vercel workflow. Copy this ZIP's contents over the project, commit and push. Do not overwrite your locally managed environment secrets.
- No physical-phone visual test or authenticated live-player end-to-end test was performed in this workspace.
