# Starter Pack loading fix

The Starter Pack and payment-return screen now wait until account data and farm models have loaded, the first farm frame has rendered, and the loading overlay has finished fading out. Failed initialization does not show purchase UI.

The requested shorter Starter Pack description is included.

Validation: static production build and 167 passing automated tests, including delayed and failed farm startup.

Deploy the updated project through the existing GitHub/Vercel workflow. No Supabase changes are required for this loading fix.
