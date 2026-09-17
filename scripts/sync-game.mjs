import {copyFileSync} from 'node:fs';
copyFileSync(new URL('../game/farm-state.js',import.meta.url),new URL('../public/farm-state.js',import.meta.url));

copyFileSync(new URL('../game/farm-state.js',import.meta.url),new URL('../supabase/functions/farm-api/farm-state.js',import.meta.url));
