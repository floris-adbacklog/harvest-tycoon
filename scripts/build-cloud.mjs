import {build,loadEnv} from 'vite';
const values={...loadEnv('production',process.cwd(),''),...process.env};
const url=values.NEXT_PUBLIC_SUPABASE_URL??values.VITE_SUPABASE_URL??'',key=values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??values.VITE_SUPABASE_ANON_KEY??'';
if(key.startsWith('sb_secret_'))throw new Error('Use a Supabase publishable/anon key, never a secret key.');
if(key.startsWith('eyJ')){let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role;}catch{}if(role!=='anon')throw new Error('The browser build only accepts a Supabase anon key.');}
if(url&&!/^https:\/\//.test(url))throw new Error('Use the HTTPS Supabase project URL.');
await build({configFile:false,publicDir:false,define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(url),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(key)},build:{outDir:'public/cloud',emptyOutDir:true,lib:{entry:'src/main.js',formats:['es'],fileName:()=> 'cloud.js'},minify:true,sourcemap:false}});
