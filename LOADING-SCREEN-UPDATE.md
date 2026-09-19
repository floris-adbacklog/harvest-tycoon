# Harvest Tycoon — Loading screen update

This release builds on the Farm Pantry Update and retains all nine new products, artwork, quests, daily challenges, deliveries and existing game progress.

- Matching visual treatment for account checks and farm loading.
- Sharp existing farm illustration as the background, softly shaded for contrast.
- Larger Harvest Tycoon logo in a warm cream panel.
- Gently animated wheat, apple and corn icons.
- English gameplay tips change as loading advances.
- Real progress counts completed models, account data and the first rendered frame. There is no fake progress timer or added waiting period.
- Responsive portrait and short landscape layouts, with scroll fallback.
- Reduced-motion preferences stop decorative animation.
- Existing error handling and sign-in requirements are preserved.

Verification: all 165 automated tests passed and the static Vercel build succeeded. Loading tests cover delayed account data, out-of-order callbacks and completion after the first frame. A physical mobile browser was not used for visual verification.

No new artwork was generated: the logo, background and crop illustrations reuse existing game assets. No Supabase changes are needed; farm-api remains at version 22.

To publish: extract this ZIP, replace matching project files in GitHub Desktop, commit and push. Vercel uses the existing build:static configuration. No website deployment was performed automatically.
