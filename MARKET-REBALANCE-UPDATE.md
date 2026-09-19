# Market payout rebalance

All 12 crops and 28 farm goods now sell for 20% less than their previous quote for the same UTC day, rounded to the nearest whole coin (minimum 1 coin). The shared market multiplier is 0.8. Daily variation, forecasts, price ranges, quantities and Sell all use the same reduced server quote. Normal-price production comparisons are also reduced.

Sunflower oil now ranges from 640 to 2,560 coins, with a normal price of 1,280 coins. Double earnings applies once to the reduced sale value.

New delivery orders and replacement orders use the lower market value and retain their existing premium percentage. Already-issued orders keep their promised rewards until replaced or the daily reset. Diamond and XP rewards are unchanged. Existing balances, inventories, seed costs and building upgrade costs are unchanged.

Validation: 191 automated tests passed; static production build succeeded. Compared all 40 items across 365 days (14,600 quotes) against the previous version and verified the 20% reduction with whole-coin rounding. The shared logic matches public, static-build and server copies.

Supabase farm-api version 27 is ACTIVE, with JWT verification enabled. Deployed source was read back and matched this export. No database migration is required.

This is a full project ZIP containing all prior features, including diamond options, higher hands-on XP and the updated guide. Copy the contents into your GitHub project, commit and push for Vercel to publish the frontend. Preserve your local environment secrets. No physical-device or authenticated live-player end-to-end test was performed.
