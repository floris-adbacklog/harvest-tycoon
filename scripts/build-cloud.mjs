import {build,loadEnv} from 'vite';
const values={...loadEnv('production',process.cwd(),''),...process.env};
const url=values.NEXT_PUBLIC_SUPABASE_URL??values.VITE_SUPABASE_URL??'',key=values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??values.VITE_SUPABASE_ANON_KEY??'';
if(values.HARVEST_REQUIRE_CLOUD==='1'&&(!url||!key))throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the hosting environment before building.');
if(key.startsWith('sb_secret_'))throw new Error('Use a Supabase publishable/anon key, never a secret key.');
if(key.startsWith('eyJ')){let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role;}catch{}if(role!=='anon')throw new Error('The browser build only accepts a Supabase anon key.');}
if(url&&!/^https:\/\//.test(url))throw new Error('Use the HTTPS Supabase project URL.');
await build({configFile:false,publicDir:false,define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(url),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(key)},build:{outDir:'public/cloud',emptyOutDir:true,lib:{entry:{cloud:'src/main.js','game-cloud':'src/game-cloud.js',admin:'src/admin.js'},formats:['es'],fileName:(_format,name)=>name+'.js'},minify:true,sourcemap:false}});
