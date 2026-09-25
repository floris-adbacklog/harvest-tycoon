import {cpSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
await import('./sync-game.mjs');
// Only the line icons the game uses (public/lucide-icons.js), made again on every deploy so a new icon is never missing.
await import('./build-lucide-subset.mjs');
process.env.HARVEST_REQUIRE_CLOUD='1';
await import('./build-cloud.mjs');
rmSync('dist-static',{recursive:true,force:true});mkdirSync('dist-static',{recursive:true});cpSync('public','dist-static',{recursive:true});
// This deploy's version: the page carries it and /version.json says what is live, so an app that stayed open reloads after an update
// (src/app-update.js).
const version=(process.env.VERCEL_GIT_COMMIT_SHA??'').slice(0,12)||Date.now().toString(36);
writeFileSync('dist-static/version.json',JSON.stringify({version})+'\n');
const html=readFileSync('public/play.html','utf8').replace('data-legacy-migration="true"','data-legacy-migration="false"').replace('<meta name="harvest-version" content="dev">',`<meta name="harvest-version" content="${version}">`);
if(!html.includes(`content="${version}"`))throw new Error('play.html lost its harvest-version meta tag');
writeFileSync('dist-static/index.html',html);writeFileSync('dist-static/play.html',html);
// The public farm wiki (/wiki), made from the game rules on every deploy.
const {buildWiki}=await import('./build-wiki.mjs');await buildWiki('dist-static');
console.log('Standalone static game ready in dist-static/. No application server is required.');
