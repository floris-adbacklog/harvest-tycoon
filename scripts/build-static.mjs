import {cpSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
await import('./sync-game.mjs');
process.env.HARVEST_REQUIRE_CLOUD='1';
await import('./build-cloud.mjs');
rmSync('dist-static',{recursive:true,force:true});mkdirSync('dist-static',{recursive:true});cpSync('public','dist-static',{recursive:true});
const html=readFileSync('public/play.html','utf8').replace('data-legacy-migration="true"','data-legacy-migration="false"');
writeFileSync('dist-static/index.html',html);writeFileSync('dist-static/play.html',html);
console.log('Standalone static game ready in dist-static/. No application server is required.');
