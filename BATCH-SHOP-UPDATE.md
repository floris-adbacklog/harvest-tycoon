# Finish one batch: shop-only update

- Removed Finish this batch from production-building panels, including its click handler.
- Finish one batch remains in the Diamond shop and now costs 10 diamonds.
- Only the selected running batch becomes ready; goods are collected afterwards at its building.
- Removed Your diamonds stay private from the tutorial footer.
- All game text remains English. All previous balance, chapter-reward and guide updates are included.

196 automated tests passed, including spending 10 diamonds once, rejecting insufficient funds and rejecting stale 20-diamond quotes. Static production build succeeded, and the public/static/server rules match.

Supabase farm-api version 29 is ACTIVE with JWT verification enabled. Deployed files were read back and matched this export. No database migration is required. No physical-device visual test was performed.

Copy the contents into the GitHub project, commit and push for Vercel to publish the updated frontend. Preserve local environment secrets. Existing open game tabs should reload after publication to use the new price and shop-only controls.
