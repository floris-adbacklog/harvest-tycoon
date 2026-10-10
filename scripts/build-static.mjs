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
// The Kongregate page (Oct 2026) the same way.
const kong=readFileSync('public/kongregate.html','utf8').replace('<meta name="harvest-version" content="dev">',`<meta name="harvest-version" content="${version}">`);
if(!kong.includes(`content="${version}"`))throw new Error('kongregate.html lost its harvest-version meta tag');
writeFileSync('dist-static/kongregate.html',kong);
// The Discord page (Oct 2026) the same way.
const discord=readFileSync('public/discord.html','utf8').replace('<meta name="harvest-version" content="dev">',`<meta name="harvest-version" content="${version}">`);
if(!discord.includes(`content="${version}"`))throw new Error('discord.html lost its harvest-version meta tag');
writeFileSync('dist-static/discord.html',discord);
// The public farm wiki (/wiki), made from the game rules on every deploy.
const {buildWiki}=await import('./build-wiki.mjs');await buildWiki('dist-static');
// The App Store badges on every page (7 Oct 2026): to the iPhone app's App Store page once Apple has approved it (APP_STORE_URL in
// public/game-links.js); until then they stay on the app page, and the pages say the iPhone app is coming soon (8 Oct 2026).
const {APP_STORE_URL}=await import('../public/game-links.js');const {applyAppStore}=await import('./app-store-links.mjs');
const appStorePages=applyAppStore('dist-static',APP_STORE_URL);if(APP_STORE_URL)console.log(`App Store badges: ${appStorePages} pages link to ${APP_STORE_URL}.`);
// Structured data (8 Oct 2026): the website, Millstone and the game on the home and app pages, the Questions on the support page, from
// the pages as they are now (scripts/structured-data.mjs).
const {applyStructuredData}=await import('./structured-data.mjs');applyStructuredData('dist-static',{appStoreUrl:APP_STORE_URL});
// The game's pages name every script and stylesheet with its content's version, and their import maps every module's (10 Oct 2026,
// scripts/cache-bust.mjs): Discord's proxy keeps those files 4 hours, so an Activity ran the old game after a deploy. Last, once
// every file is as it will be served. The portal pages prefetch the farm's files, so they need the same addresses. Not the home page
// (/, /xx/): it stays as it is, and the website sends its files with no-cache.
const {cacheBust}=await import('./cache-bust.mjs');
for(const {page,versioned,mapped} of cacheBust('dist-static',['farm.html','discord.html','crazygames.html','kongregate.html']))console.log(`${page}: ${versioned} addresses versioned, ${mapped} in its import map.`);
console.log('Standalone static game ready in dist-static/. No application server is required.');
