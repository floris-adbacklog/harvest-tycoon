import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,posix,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
// Every module the game needs, preloaded by the farm page (6 Oct 2026). game.js is imported only once the farm has loaded
// (src/game-cloud.js), and its 97 modules then came one after the other, each found only once the one before had arrived: on 4G
// about 3 s. With a modulepreload for each in farm.html they all start with the page, side by side, while the farm itself is still
// loading. This script follows game.js's static imports (the import map's "three" too) and writes the list between the two markers in
// public/farm.html; tests/module-preload.test.mjs fails when the list is out of date. Run: node scripts/module-preload.mjs
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),PUBLIC=join(ROOT,'public'),PAGE=join(PUBLIC,'farm.html'),CRAZY=join(PUBLIC,'crazygames.html');
export const START='<!-- module-preload:start -->',END='<!-- module-preload:end -->';
const IMPORTMAP={'three':'/vendor/three.module.js'},PREFIX={'three/addons/':'/vendor/addons/'};
const readPublic=path=>readFileSync(join(PUBLIC,path.split('?')[0]),'utf8');
// The static imports of one module: import ... from '…', export ... from '…' and import '…'; dynamic import() is left out.
const STATIC=/(?:^|[;\n}])\s*(?:import|export)\s*(?:[^'"`;]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
function address(spec,from){
 if(IMPORTMAP[spec])return IMPORTMAP[spec];
 for(const [prefix,to] of Object.entries(PREFIX))if(spec.startsWith(prefix))return to+spec.slice(prefix.length);
 // The address exactly as imported, a version (?v=…) included: a preload of another address would be a second download.
 if(spec.startsWith('/'))return spec;
 if(spec.startsWith('.')){const [file,query]=spec.split('?');return posix.normalize(posix.join(posix.dirname(from.split('?')[0]),file))+(query?`?${query}`:'');}
 return null;   // a bare name the import map does not know: not ours
}
export function moduleGraph(entry='/game.js',read=readPublic){
 const seen=new Set(),queue=[entry];
 while(queue.length){
  const path=queue.shift();if(seen.has(path))continue;seen.add(path);
  let source;try{source=read(path);}catch{continue;}
  for(const [,spec] of source.matchAll(STATIC)){const next=address(spec,path);if(next&&!seen.has(next))queue.push(next);}
 }
 seen.delete(entry);   // game.js itself is preloaded with its own version (?v=…), as src/game-cloud.js imports it
 return [...seen].sort();
}
export const preloadLines=list=>list.map(path=>`  <link rel="modulepreload" href="${path}">`).join('\n');
function between(html,start,end,lines,page,indent=''){
 const from=html.indexOf(start),to=html.indexOf(end);
 if(from<0||to<from)throw new Error(`${page} needs the markers ${start} and ${end}`);
 return html.slice(0,from+start.length)+'\n'+lines+'\n'+indent+html.slice(to);
}
export const withPreloads=(html,list)=>between(html,START,END,preloadLines(list),'public/farm.html','  ');

// The CrazyGames page downloads the farm while the account is being checked (7 Oct 2026). Before, nothing of the farm came in during
// the 4 or 5 round trips of a new guest's sign-in (hello, token, crazygames-auth, verifyOtp, getUser): farm.html only started after
// them, and the models only after farm.html. Now public/crazygames.html prefetches farm.html, every file that page names (styles,
// scripts and the modules above), the palette and the models game.js loads before the farm shows, so they are in the browser's cache
// when the farm frame asks. A prefetch has the lowest priority, runs nothing and does not hold up the page. Measured in Chrome: the
// models and /vendor/ then come straight from the cache, styles and modules (no-cache) with a short "not changed" answer instead of
// their download, and farm.html itself is fetched again (a frame's page is cached apart). Safari ignores prefetch. Written between
// these markers by this script.
export const PREFETCH_START='<!-- farm-prefetch:start -->',PREFETCH_END='<!-- farm-prefetch:end -->';
// The models game.js loads before the farm is on screen: its modelNames (scenery.js and the village come later, on their own).
export function farmModels(read=readPublic){
 const game=read('/game.js'),life=read('/farm-life.js').match(/export const LIFE_MODELS=\[([^\]]*)\]/);
 if(!life)throw new Error('public/farm-life.js: LIFE_MODELS is not where scripts/module-preload.mjs looks for it');
 const spread={'...LIFE_MODELS':[...life[1].matchAll(/'([a-z0-9_]+)'/g)].map(m=>m[1])},names=[];
 const lines=[...game.matchAll(/^(?:const modelNames=\[([^\]]*)\]|modelNames\.push\(([^)]*)\));$/gm)];
 if(!lines.length)throw new Error('public/game.js: modelNames is not where scripts/module-preload.mjs looks for it');
 for(const m of lines)for(const item of (m[1]??m[2]).split(',').map(s=>s.trim()).filter(Boolean)){
  if(spread[item])names.push(...spread[item]);else if(/^'[a-z0-9_]+'$/.test(item))names.push(item.slice(1,-1));
  else throw new Error(`public/game.js modelNames: scripts/module-preload.mjs does not know ${item}`);
 }
 return [...new Set(names)].map(name=>`/assets/models/${name}.glb`);
}
// The one palette every model paints from, with the version model-atlas.js asks for (an address without it is another download).
export function paletteAddress(read=readPublic){
 const version=read('/model-atlas.js').match(/export const PALETTE_VERSION='([^']+)'/)?.[1];
 if(!version)throw new Error('public/model-atlas.js: PALETTE_VERSION is not where scripts/module-preload.mjs looks for it');
 return `/assets/models/palette.png?v=${version}`;
}
// What farm.html loads by itself, in page order: its styles, scripts and module preloads (our own addresses only, no pictures).
export function farmFiles(html){
 const code=html.replace(/<!--[^]*?-->/g,''),files=[];
 for(const m of code.matchAll(/<link rel="(?:stylesheet|modulepreload)" href="([^"]+)"|<script\b[^>]*\ssrc="([^"]+)"/g)){const path=m[1]??m[2];if(/^\/(?!\/)/.test(path)&&!files.includes(path))files.push(path);}
 return files;
}
// The Android app's files and the website's language start stay off this page (tests/android-app.test.mjs, crazygames.test.mjs):
// a few KB the farm frame fetches itself.
export const KEEP_OFF=/android|i18n-boot/;
export const farmPrefetch=(farm=readFileSync(PAGE,'utf8'),read=readPublic)=>['/farm.html',...farmFiles(farm).filter(path=>!KEEP_OFF.test(path)),paletteAddress(read),...farmModels(read)];
export const prefetchLines=list=>list.map(path=>`<link rel="prefetch" href="${path}">`).join('\n');
export const withPrefetch=(html,list)=>between(html,PREFETCH_START,PREFETCH_END,prefetchLines(list),'public/crazygames.html');

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const list=moduleGraph(),farm=withPreloads(readFileSync(PAGE,'utf8'),list);writeFileSync(PAGE,farm);
 const prefetch=farmPrefetch(farm);writeFileSync(CRAZY,withPrefetch(readFileSync(CRAZY,'utf8'),prefetch));
 console.log(`public/farm.html: ${list.length} modules preloaded; public/crazygames.html: ${prefetch.length} files prefetched`);
}
