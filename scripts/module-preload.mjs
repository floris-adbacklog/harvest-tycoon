import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,posix,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
// Every module the game needs, preloaded by the farm page (6 Oct 2026). game.js is imported only once the farm has loaded
// (src/game-cloud.js), and its 97 modules then came one after the other, each found only once the one before had arrived: on 4G
// about 3 s. With a modulepreload for each in farm.html they all start with the page, side by side, while the farm itself is still
// loading. This script follows game.js's static imports (the import map's "three" too) and writes the list between the two markers in
// public/farm.html; tests/module-preload.test.mjs fails when the list is out of date. Run: node scripts/module-preload.mjs
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),PUBLIC=join(ROOT,'public'),PAGE=join(PUBLIC,'farm.html');
export const START='<!-- module-preload:start -->',END='<!-- module-preload:end -->';
const IMPORTMAP={'three':'/vendor/three.module.js'},PREFIX={'three/addons/':'/vendor/addons/'};
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
export function moduleGraph(entry='/game.js',read=path=>readFileSync(join(PUBLIC,path.split('?')[0]),'utf8')){
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
export function withPreloads(html,list){
 const start=html.indexOf(START),end=html.indexOf(END);
 if(start<0||end<start)throw new Error(`public/farm.html needs the markers ${START} and ${END}`);
 return html.slice(0,start+START.length)+'\n'+preloadLines(list)+'\n  '+html.slice(end);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const list=moduleGraph();writeFileSync(PAGE,withPreloads(readFileSync(PAGE,'utf8'),list));
 console.log(`public/farm.html: ${list.length} modules preloaded`);
}
