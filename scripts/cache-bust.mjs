import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,posix} from 'node:path';
// Our scripts and stylesheets at an address that changes with their content (10 Oct 2026). Discord's proxy (<client id>.discordsays.com)
// tells the browser to keep every script and stylesheet 4 hours (Cache-Control: public, max-age=14400), whatever vercel.json says, so
// after a deploy an Activity kept running the old game; its pages (HTML) and JSON it leaves alone. So the deploy gives every script and
// stylesheet a game page names an address with the start of its content's sha256 (?v=…): a changed file is a new address, an unchanged
// one keeps its address and its cache (the owner deploys many times a day). Modules import each other by their plain address
// ('./farm-state.js'): the page's import map turns each into its versioned one, so a module's own address never changes because
// another one did. Only in dist-static (scripts/build-static.mjs), never in public/: the repository and its tests see the plain pages.

export const contentHash=text=>createHash('sha256').update(text).digest('hex').slice(0,10);
const pathOf=url=>url.split(/[?#]/)[0];
// Left as they are: the three.js files (vendor/, never changed in place: vercel.json caches them a year) and Vite's shared chunks
// (cloud/<name>-<hash of their content>.js, scripts/build-cloud.mjs), whose name already changes with them. The website's own page loads
// those chunks too, unversioned: a second address in the farm frame would make every website player download them twice.
const KEPT=/^\/vendor\/|^\/cloud\/[^/]+-[\w-]{8}\.js$/;
export const versionable=url=>/^\/(?!\/)/.test(url)&&/\.(?:m?js|css)$/.test(pathOf(url))&&!KEPT.test(pathOf(url));
// '/game.js?v=familyhall-model-2' -> '/game.js?v=<hash>': the content's version replaces one made by hand.
function versioned(url,read){
 if(!versionable(url))return url;
 const path=pathOf(url),text=read(path);
 if(text==null)throw new Error(`cache-bust: a page names ${path}, which is not in the build`);
 return `${path}?v=${contentHash(text)}`;
}

// Every address a module asks for: import/export … from '…', import '…', import('…') (a /* @vite-ignore */ in between too) and
// import.meta.resolve('…'), which the game uses for its sound worker and the stylesheets it adds later (an address the import map
// gives, as for a module).
const ASKS=/\b(?:from|import)\s*(["'])([^"'\n]+)\1|\bimport\s*\(\s*(?:\/\*[^]*?\*\/\s*)?(["'`])([^"'`\n]+)\3\s*\)|\bimport\.meta\.resolve(?:\?\.)?\(\s*(["'`])([^"'`\n]+)\5\s*\)/g;
function address(spec,from,imports){
 if(spec.includes('${'))return null;
 if(/^\.\.?\//.test(spec)){const at=spec.indexOf('?'),file=at<0?spec:spec.slice(0,at);return posix.normalize(posix.join(posix.dirname(pathOf(from)),file))+(at<0?'':spec.slice(at));}
 if(/^\/(?!\/)/.test(spec))return spec;
 // A bare name ('three'): the page's import map says where it is.
 if(typeof imports[spec]==='string')return imports[spec];
 const prefix=Object.keys(imports).find(key=>key.endsWith('/')&&spec.startsWith(key));
 return prefix?imports[prefix]+spec.slice(prefix.length):null;
}
// What the page's scripts import, directly or further on, each as it is asked for (a ?query included: the import map matches the
// whole address). read(path) gives a file of the site, or null when there is none (a word in a string, an address in a comment).
export function importedFiles(roots,read,imports={}){
 const found=new Set(),seen=new Set(roots),queue=[...roots];
 while(queue.length){
  const from=queue.shift(),source=/\.m?js$/.test(pathOf(from))?read(pathOf(from)):null;
  if(source==null)continue;
  for(const m of source.matchAll(ASKS)){
   const url=address(m[2]??m[4]??m[6],from,imports);
   if(!url||read(pathOf(url))==null)continue;
   found.add(url);if(!seen.has(url)){seen.add(url);queue.push(url);}
  }
 }
 return [...found].sort();
}

const TAGS=/<!--[^]*?-->|<(?:script|link)\b[^>]*>/g,MAP=/<script type="importmap">([^]*?)<\/script>/;
const attribute=(tag,name)=>tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
// One page: every script and stylesheet (and a preload or prefetch of one) at its versioned address, and the import map with an entry
// for every one of our modules and stylesheets its scripts ask for, as they ask for it. A modulepreload gets the same address its
// import is mapped to (another address would be a second download). Comments stay as they are.
export function stampPage(html,read){
 const code=html.replace(/<!--[^]*?-->/g,''),mapTag=code.match(MAP),map=mapTag?JSON.parse(mapTag[1]):{imports:{}};
 const roots=[...code.matchAll(TAGS)].map(([tag])=>tag.startsWith('<script')?attribute(tag,'src'):attribute(tag,'rel')==='modulepreload'?attribute(tag,'href'):null).filter(Boolean);
 // A modulepreload is there because a module imports that very address, so it is mapped too, even when the scan above cannot see
 // that import (an address in a variable, Vite writing it another way): the preload and the import then stay one download. One that
 // already names its content's address (a page stamped twice) needs no entry of its own.
 const preloads=[...code.matchAll(TAGS)].filter(([tag])=>attribute(tag,'rel')==='modulepreload').map(([tag])=>attribute(tag,'href')).filter(url=>url&&versionable(url)&&versioned(url,read)!==url);
 const asked=[...new Set([...importedFiles(roots,read,map.imports??{}),...preloads])].filter(versionable).sort();
 // Two addresses of one module are two copies of it, each with its own state: one versioned address would quietly make them one.
 const byPath=new Map();
 for(const url of asked.filter(url=>/\.m?js$/.test(pathOf(url)))){const other=byPath.get(pathOf(url));if(other)throw new Error(`cache-bust: ${other} and ${url} are one module imported at two addresses; import it at one`);byPath.set(pathOf(url),url);}
 const entries=Object.fromEntries(asked.map(url=>[url,versioned(url,read)]));
 let out=html.replace(TAGS,tag=>tag.startsWith('<!--')?tag:tag.replace(/(\s(?:src|href)=")([^"]*)"/,(all,before,url)=>`${before}${versioned(url,read)}"`));
 if(!asked.length&&!mapTag)return out;
 const imports=Object.fromEntries(Object.entries(map.imports??{}).map(([key,url])=>[key,versioned(url,read)]));
 const json=JSON.stringify({...map,imports:{...imports,...entries}});
 if(mapTag)return out.replace(MAP,()=>`<script type="importmap">${json}</script>`);
 // A page without an import map gets one before its first module (the browser reads none after that), written as farm.html's.
 let placed=false;
 out=out.replace(TAGS,tag=>{if(placed||tag.startsWith('<!--')||!(attribute(tag,'type')==='module'||attribute(tag,'rel')==='modulepreload'))return tag;placed=true;return `<script type="importmap">${json}</script>${tag}`;});
 if(!placed)throw new Error('cache-bust: no module on the page to put the import map before');
 return out;
}

// The deploy (scripts/build-static.mjs): these pages of dir rewritten in place, from dir's files as they will be served.
export function cacheBust(dir,pages){
 const files=new Map(),read=path=>{if(!files.has(path)){let text=null;try{text=readFileSync(join(dir,posix.normalize(path)),'utf8');}catch{}files.set(path,text);}return files.get(path);};
 return pages.map(page=>{
  const file=join(dir,page),html=stampPage(readFileSync(file,'utf8'),read);writeFileSync(file,html);
  const code=html.replace(/<!--[^]*?-->/g,''),map=code.match(MAP);
  return {page,versioned:[...code.matchAll(TAGS)].filter(([tag])=>/\s(?:src|href)="[^"]*\?v=[0-9a-f]{10}"/.test(tag)).length,mapped:map?Object.keys(JSON.parse(map[1]).imports).length:0};
 });
}
