import {build,loadEnv} from 'vite';
const values={...loadEnv('production',process.cwd(),''),...process.env};
const url=values.NEXT_PUBLIC_SUPABASE_URL??values.VITE_SUPABASE_URL??'',key=values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??values.VITE_SUPABASE_ANON_KEY??'';
if(values.HARVEST_REQUIRE_CLOUD==='1'&&(!url||!key))throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the hosting environment before building.');
if(key.startsWith('sb_secret_'))throw new Error('Use a Supabase publishable/anon key, never a secret key.');
if(key.startsWith('eyJ')){let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role;}catch{}if(role!=='anon')throw new Error('The browser build only accepts a Supabase anon key.');}
if(url&&!/^https:\/\//.test(url))throw new Error('Use the HTTPS Supabase project URL.');
await build({configFile:false,publicDir:false,define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(url),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(key)},build:{outDir:'public/cloud',emptyOutDir:true,lib:{entry:{cloud:'src/main.js','game-cloud':'src/game-cloud.js',partners:'src/partners.js'},formats:['es'],fileName:(_format,name)=>name+'.js'},minify:true,sourcemap:false}});
// Harvest Tycoon on CrazyGames (Oct 2026, public/crazygames.html): its own build next to the website's, so the website's files are
// made exactly as before; it shares no file with them.
await build({configFile:false,publicDir:false,define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(url),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(key)},build:{outDir:'public/cloud',emptyOutDir:false,lib:{entry:{crazygames:'src/crazygames.js'},formats:['es'],fileName:(_format,name)=>name+'.js'},minify:true,sourcemap:false}});
// Harvest Tycoon on Kongregate (Oct 2026, public/kongregate.html): its own build too, sharing no file with the others.
await build({configFile:false,publicDir:false,define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(url),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(key)},build:{outDir:'public/cloud',emptyOutDir:false,lib:{entry:{kongregate:'src/kongregate.js'},formats:['es'],fileName:(_format,name)=>name+'.js'},minify:true,sourcemap:false}});
// Harvest Tycoon on Discord (Oct 2026, public/discord.html): its own build too, with Discord's SDK. Inside Discord the page lives on
// <client id>.discordsays.com and reaches no other address: Discord's proxy carries /supabase to our project (Developer Portal, URL
// Mappings: /supabase -> the host of this URL), for every call supabase-js makes (sign-in, database, Edge Functions, the realtime
// websocket). On our own computer (localhost) the page talks to Supabase directly.
const discordUrl=`(location.hostname.endsWith('.discordsays.com')?location.origin+'/supabase':${JSON.stringify(url)})`;
await build({configFile:false,publicDir:false,define:{'import.meta.env.VITE_SUPABASE_URL':discordUrl,'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(key)},build:{outDir:'public/cloud',emptyOutDir:false,lib:{entry:{discord:'src/discord.js'},formats:['es'],fileName:(_format,name)=>name+'.js'},minify:true,sourcemap:false}});
