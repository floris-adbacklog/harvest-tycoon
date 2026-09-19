import {copyFileSync} from 'node:fs';
for(const name of ['diamond-checkout','stripe-webhook'])copyFileSync(new URL('../game/payments.js',import.meta.url),new URL(`../supabase/functions/${name}/payments.js`,import.meta.url));
copyFileSync(new URL('../game/farm-state.js',import.meta.url),new URL('../public/farm-state.js',import.meta.url));

copyFileSync(new URL('../game/farm-state.js',import.meta.url),new URL('../supabase/functions/farm-api/farm-state.js',import.meta.url));

copyFileSync(new URL('../src/presence.js',import.meta.url),new URL('../supabase/functions/farm-api/presence.js',import.meta.url));
