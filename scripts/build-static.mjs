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
// A page per language (/es/, /fr/, ...) made from the same page and the translations; the home page gets the list of them (hreflang).
const {buildLanguagePages,buildSupportPages,buildAppPages}=await import('./build-languages.mjs');
const home=buildLanguagePages('dist-static',html);
writeFileSync('dist-static/index.html',home);writeFileSync('dist-static/play.html',home);
// Help and support (3 Oct 2026): /support and /es/support, ... the same way, from public/support.html.
buildSupportPages('dist-static',readFileSync('public/support.html','utf8'));
// Harvest Tycoon on your phone (4 Oct 2026): /app and /es/app, ... the same way, from public/app.html.
buildAppPages('dist-static',readFileSync('public/app.html','utf8'));
// The CrazyGames page (Oct 2026) carries the same version, so a player there gets the new game on the way back in, as in the app.
const crazy=readFileSync('public/crazygames.html','utf8').replace('<meta name="harvest-version" content="dev">',`<meta name="harvest-version" content="${version}">`);
if(!crazy.includes(`content="${version}"`))throw new Error('crazygames.html lost its harvest-version meta tag');
writeFileSync('dist-static/crazygames.html',crazy);
// The public farm wiki (/wiki), made from the game rules on every deploy.
const {buildWiki}=await import('./build-wiki.mjs');await buildWiki('dist-static');
console.log('Standalone static game ready in dist-static/. No application server is required.');
