# Compact VIP shop update

UI-only refinement of the existing VIP release. No Supabase migration or redeploy is required.

- Smaller badge and title row; subtitle: “Choose the plan that suits you best.”
- Removed the inactive green subheading and the full disclaimer paragraph. No replacement footer.
- Four compact benefit items: “10% faster crops”, “10% faster production”, “+5% market coins”, “2x daily rewards”. Assigned the established wheat, buildings, coins and gift artwork; no extra image downloads are introduced.
- Benefits stay in two columns on mobile and desktop. On the narrowest screens, each icon sits above its label to avoid cramped text.
- Reduced section padding, gaps, plan padding and button height to a touch-friendly minimum of 44px. Plan buttons align from the top even when only one plan has an insufficient-balance message.
- Desktop plans sit side by side; screens up to 480px stack them. Prices remain 500 and 1,500 diamonds. Active VIP shows a small remaining-time line in the header and uses Extend buttons.
- Existing confirmation, submission lock, insufficient-balance handling, expiry and server validation are retained.

Validation: all 353 existing tests pass; the static production build succeeds. Removed copy and all required new labels were checked. No new gameplay tests were added for this presentation-only change. Visual browser/device verification remains unavailable in this environment; no measured height reduction percentage is claimed.

Deploy the rebuilt frontend to Vercel to show this layout. The Supabase functions remain farm-api v43 and checkout/webhook v11.
