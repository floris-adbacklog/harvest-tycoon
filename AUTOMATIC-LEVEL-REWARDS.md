# Automatic level rewards

Every newly reached level pays 10 × that level in coins and floor(level / 5) diamonds. Level 20 therefore pays 200 coins and 4 diamonds. Levels 2–4 pay coins only; level 1 has no additional signup reward.

The server applies rewards after XP boosts, paying every crossed level if one action gains multiple levels. Coin boosts do not multiply the level rewards. The existing paid-level ledger prevents duplicate payouts and keeps previously collected levels paid.

The Farm journal claim button has been removed. The level-up popup shows the automatically credited reward, and the journal previews the next level reward. Queued popups combine rewards for distinct levels.

Existing uncollected levels are automatically settled using the new reward schedule on load, through the existing optimistic-concurrency commit. Previously collected rewards are not reissued. A compatibility action for older clients uses the same ledger.

Validation: 184 automated tests pass and the static build succeeds. Tests cover the corrected level-20 example, milestone boundaries, multi-level jumps, boosts, persistence, legacy unpaid rewards, invalid actions, and duplicate popup entries. Supabase farm-api version 25 is active, with JWT verification retained; downloaded deployed source matches local source. Live authenticated end-to-end testing was not performed.

Includes all previous updates, including progressive unlocks, mobile spacing, market quantity selection and the Windmill position change. Push the ZIP contents through GitHub/Vercel to publish the frontend; the backend is already updated.
