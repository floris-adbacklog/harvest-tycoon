# Deploy Harvest Tycoon on Vercel

This package replaces the previous online draft. The Supabase farm-load permission failure has been fixed in the existing project. All player-facing text is English.

1. Extract this ZIP. Put the contents of `harvest-tycoon/` at the root of the GitHub repository, replacing the matching older files. Keep `package.json` and `vercel.json` together at the repository root. Remove obsolete `src/sync.js`, `tests/local-save.test.mjs` and `ONLINE-DRAFT-STATUS.md` if they are still present from an older copy. Commit and push.
2. In the connected Vercel project's Environment Variables, keep or set these values for the deployment environment:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://jnmdirvidffzxukbdmij.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project's publishable key from Supabase Project Settings → API Keys. A legacy anon key also works. Never use a secret or service-role key.
3. `vercel.json` specifies the build settings: framework Other (`null`), pinned pnpm install, `npm run build:static`, output `dist-static`. Do not use the Next.js build script (`npm run build`) for Vercel.
4. Deploy the new commit. If you changed environment variables, redeploy; these public values are embedded at build time. A missing URL or key now fails the build with a clear error instead of silently shipping a broken login screen.
5. In Supabase Authentication → URL Configuration, ensure the production domain and `https://www.harvesttycoon.com/play.html` are accepted email-confirmation redirects. Also allow the exact Vercel domain if testing there. Email confirmation behavior follows the existing Supabase settings.
6. Open the deployment in a private browser window. Sign in, perform an action, reload, and confirm the same farm returns. Sign out and verify the farm disappears. Check a phone-sized window and a second account before sharing widely.

## Backend status

The existing Supabase project is already configured. Do NOT rerun schema files against it. `farm-api` is deployed with JWT verification enabled. Its internal session checker can read only the required session columns with the server role. Browser roles cannot call internal commit/session functions or directly modify farms or leaderboard scores.

Older frontend versions that write scores directly no longer have write access. Deploy this updated frontend to use server-confirmed actions.

For a NEW Supabase project only, first apply `supabase/player_stats.sql`, then `supabase/schema-online.sql`, `supabase/session-permissions.sql`, and `supabase/server-owned-stats.sql`. Deploy the `supabase/functions/farm-api/` files as the `farm-api` Edge Function with JWT verification enabled, and enable email/password authentication. Service credentials remain inside Supabase's function environment.

## Verified scope

The static production build and automated auth/game tests pass. Real two-account API tests verified farm persistence and isolation. The actual Vercel deployment, real email delivery and mobile/desktop visual rendering have not been tested from this environment. No GitHub push or Vercel deployment was performed by this export.

Configuration reference: https://vercel.com/docs/project-configuration/vercel-json
Session validation reference: https://supabase.com/docs/guides/auth/sessions
