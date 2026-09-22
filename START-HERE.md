Latest retention update: see [RETENTION-RELEASE.md](RETENTION-RELEASE.md) for features, tests, database rollout and rollback. These changes have not been deployed to the live game.

Latest UI update: see [LOADING-SCREEN-UPDATE.md](LOADING-SCREEN-UPDATE.md).

Latest release: see [PANTRY-UPDATE.md](PANTRY-UPDATE.md) for new recipes, artwork and deployment status. Earlier release notes follow.

# Harvest Tycoon — updated project export, September 17, 2026

## Included changes
- Extra space above the leaderboard account information.
- Packing Shed moved behind the growing area.
- Unlock one field at a time, starting at 600 coins plus supplies, with increasing prices and varied ingredient combinations.
- Larger mixed-ingredient production batches, with profitable output prices.
- Tractor fuel: 12 coins per job plus 2 per worked field. Seeds are charged separately; manual work is free.
- Distinct barley, lettuce and red cabbage illustrations, and crop timing badges.
- Responsive controls and dialogs for phones, tablets and short landscape screens.
- All game text is English. Existing unlocked plots, inventory and timers are preserved.

## Upload with GitHub Desktop
1. Extract this ZIP.
2. Open the cloned floris-adbacklog/harvest-tycoon repository using Repository > Show in Finder / Show in Explorer.
3. Copy the CONTENTS of this export's harvest-tycoon folder into the repository folder, replacing the corresponding older project files. Keep the repository's .git folder and your private environment settings. Include .env.example and .gitignore if your file manager hides them.
4. package.json, pnpm-lock.yaml and vercel.json must be directly in the repository root, not inside a second harvest-tycoon folder.
5. Review changes in GitHub Desktop, commit, and Push origin. Do not upload the ZIP itself, node_modules, .env files or generated build directories.

## Vercel
Import that GitHub repository. vercel.json selects the static build automatically:
- Framework: Other
- Install: pnpm install --frozen-lockfile
- Build: pnpm run build:static
- Output: dist-static
- Node.js: 22.x or a later supported release compatible with package.json
Configure these Environment Variables in Vercel before deployment (see .env.example):
NEXT_PUBLIC_SUPABASE_URL = your Supabase Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = your public publishable key
The older VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY names are also accepted. Avoid conflicting duplicate values; NEXT_PUBLIC values take precedence. Values are embedded at build time, so redeploy after changing them. Never use a service_role, secret or management key in a frontend build.

## Supabase and existing accounts
Target project: jnmdirvidffzxukbdmij.
This export preserves the CURRENT account-based version (email/password sign-in); it does not revert the game to the earlier anonymous-login prototype. Keep the existing player_stats table and auth settings. If email confirmations are enabled, add the new site's /play.html address to your Supabase allowed redirect URLs and configure the Site URL appropriately.
Do not rerun supabase/player_stats.sql over an existing setup without checking its schema and policies. This file is included as source reference for the current version. No live database migration or account change was performed for this export.

## Saves and verification
Farm layouts stay in browser storage. A new host/domain has separate storage: the existing farm on the Sites address does not automatically move to Vercel. Keep using the old address for that farm until a save transfer has been arranged. Accounts share player name, coins and level; they do not transfer the full farm layout.
The game rules and sync tests pass (25 tests), and the production build passes. Mobile styling was updated but has not been tested on physical phones. This ZIP has not been uploaded to your GitHub repository or deployed to Vercel on your behalf. Verify sign-in, purchases, coin syncing and the leaderboard on your final Vercel URL.

The app/ server files are retained from the original project. Use build:static for Vercel; it disables the old Sites save-migration API. Game assets are supplied for use in this game; keep your source repository private unless your asset licence permits public redistribution.
