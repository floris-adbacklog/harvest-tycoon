import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stampPage,cacheBust,contentHash,versionable} from '../scripts/cache-bust.mjs';
import {moduleGraph} from '../scripts/module-preload.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const noComments=html=>html.replace(/<!--[^]*?-->/g,'');
const importMap=html=>{const m=noComments(html).match(/<script type="importmap">([^]*?)<\/script>/);return m?JSON.parse(m[1]).imports:null;};
// Every address a page's tags name (scripts, stylesheets, preloads, prefetches, icons).
const tagged=html=>[...noComments(html).matchAll(/<(?:script|link)\b[^>]*\s(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
const PAGES=['farm.html','discord.html','crazygames.html','kongregate.html'];

// ---- 10 Oct 2026: Discord's proxy keeps every script and stylesheet 4 hours, so the deploy gives each an address with its version ----
const FILES={
 '/boot.js':'var booted=1;',
 '/style.css':'a{color:red}',
 '/a.js':"import {b} from './b.js';\nexport const later=()=>import('./lazy.js');",
 '/b.js':"import{c}from\"/c.js?v=old\";export const b=c,sheet=import.meta.resolve?.('/late.css')??'/late.css';",
 '/c.js':'export const c=1;',
 '/lazy.js':"import * as three from 'three';export default three;",
 '/late.css':'b{color:blue}',
 // As Vite writes them (scripts/build-cloud.mjs): a fixed name for the entry, the content's hash in a shared chunk's name.
 '/cloud/entry.js':'import { x } from "./shared-AbC_12-z.js";\nconst game = await import(\n\t/* @vite-ignore */\n\t"/a.js"\n);',
 '/cloud/shared-AbC_12-z.js':'export const x = 1;',
 '/vendor/three.module.js':"export * from './three.core.js';",
 '/vendor/three.core.js':'export const REVISION="180";'
};
const PAGE=`<!doctype html><html><head><script src="/boot.js"></script><link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.ico">
<link rel="preload" as="image" href="/assets/backdrop.webp" media="(orientation: landscape)">
<script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>
<link rel="modulepreload" href="/c.js?v=old"><link rel="modulepreload" href="/vendor/three.module.js">
<!-- <script src="/gone.js"></script> -->
</head><body><script type="module" src="/cloud/entry.js"></script>
<link rel="prefetch" href="/farm.html"><link rel="prefetch" href="/a.js"><link rel="prefetch" href="/assets/models/barn.glb"></body></html>`;
const at=(files,path)=>`${path}?v=${contentHash(files[path])}`;

test('a page names each of our scripts and stylesheets at its content\'s version; its import map gives every module a page\'s scripts import its own',()=>{
 const files={...FILES},out=stampPage(PAGE,path=>files[path]??null),v=path=>at(files,path);
 assert.match(v('/a.js'),/^\/a\.js\?v=[0-9a-f]{10}$/);
 assert.deepEqual(tagged(out),[v('/boot.js'),v('/style.css'),'/favicon.ico','/assets/backdrop.webp',v('/c.js'),'/vendor/three.module.js',v('/cloud/entry.js'),'/farm.html',v('/a.js'),'/assets/models/barn.glb'],
  'classic and module scripts, stylesheets and prefetches versioned; a hand-made ?v= replaced; pictures, models, pages and three.js as they were');
 assert.ok(out.includes('<!-- <script src="/gone.js"></script> -->'),'a comment stays as it is');
 // Each module as it is asked for (a ?query too: the browser matches the whole address), statically, dynamically (a /* @vite-ignore */
 // in between), through the import map's bare name or with import.meta.resolve; never Vite's hashed chunks or three.js.
 assert.deepEqual(importMap(out),{three:'/vendor/three.module.js','/a.js':v('/a.js'),'/b.js':v('/b.js'),'/c.js?v=old':v('/c.js'),'/late.css':v('/late.css'),'/lazy.js':v('/lazy.js')});
 assert.equal(tagged(out)[4],importMap(out)['/c.js?v=old'],'the preload is the address the import really asks for');
 // A file that did not change keeps its address when another one does (the owner deploys many times a day).
 const changed={...files,'/b.js':files['/b.js']+'\n'},again=stampPage(PAGE,path=>changed[path]??null);
 assert.equal(importMap(again)['/a.js'],v('/a.js'));assert.notEqual(importMap(again)['/b.js'],v('/b.js'));
 assert.equal(stampPage(out,path=>files[path]??null),out,'stamping again changes nothing');
});

test('a page without imports gets no import map, one with imports and none gets one before its first module; mistakes stop the deploy',()=>{
 const read=path=>FILES[path]??null;
 const plain='<head><link rel="stylesheet" href="/style.css"></head><body><script type="module" src="/c.js"></script></body>';
 assert.equal(stampPage(plain,read),`<head><link rel="stylesheet" href="${at(FILES,'/style.css')}"></head><body><script type="module" src="${at(FILES,'/c.js')}"></script></body>`);
 const needs=stampPage('<head></head><body><script src="/boot.js"></script><script type="module" src="/a.js"></script></body>',read);
 assert.ok(needs.indexOf('<script type="importmap">')>needs.indexOf('/boot.js')&&needs.indexOf('<script type="importmap">')<needs.indexOf(at(FILES,'/a.js')));
 assert.deepEqual(Object.keys(importMap(needs)),['/b.js','/c.js?v=old','/late.css','/lazy.js']);
 // A preload whose import the scan cannot see (its address in a variable) is mapped as it is preloaded, so the import that really
 // comes asks for the preloaded address: one download, never the old copy beside the new one.
 const hidden={...FILES,'/e.js':"const at='/c.js?v=old';export const c=await import(at);"},readHidden=path=>hidden[path]??null;
 const preloaded=stampPage('<head><link rel="modulepreload" href="/c.js?v=old"></head><body><script type="module" src="/e.js"></script></body>',readHidden);
 assert.deepEqual(importMap(preloaded),{'/c.js?v=old':at(FILES,'/c.js')});
 assert.ok(tagged(preloaded).includes(at(FILES,'/c.js')));assert.equal(stampPage(preloaded,readHidden),preloaded,'stamping again changes nothing');
 assert.throws(()=>stampPage('<script src="/missing.js"></script>',read),/names \/missing\.js, which is not in the build/);
 // One module at two addresses is two copies of it; one versioned address would quietly make them one.
 const twice={...FILES,'/d.js':"import './c.js';import '/c.js?v=old';"};
 assert.throws(()=>stampPage('<script type="module" src="/d.js"></script>',path=>twice[path]??null),/\/c\.js and \/c\.js\?v=old are one module imported at two addresses/);
});

// The deploy's own run over the real pages and modules, with stand-ins for the Vite bundles (npm run build:static makes those).
test('the deploy versions every script and stylesheet of the game pages, maps every module of the farm, and leaves public/ and the home page alone',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cache-bust-'));
 const before=Object.fromEntries(['farm.html','play.html',...PAGES].map(page=>[page,read(`public/${page}`)]));
 try{
  cpSync(new URL('../public',import.meta.url).pathname,dir,{recursive:true,filter:src=>!/\/public\/(?:assets|i18n|cloud|vendor)(?:\/|$)/.test(src)});
  writeFileSync(join(dir,'index.html'),before['play.html']);
  // The cloud bundles as Vite writes them: game-cloud.js asks for game.js, the modules and the stylesheets src/ asks for.
  const game=read('src/game-cloud.js').match(/import\(\/\* @vite-ignore \*\/ '(\/game\.js[^']*)'\)/)[1];
  const src=readdirSync(new URL('../src',import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>read(`src/${f}`)).join('\n');
  const asked=[...src.matchAll(/import\(\/\* @vite-ignore \*\/ '([^']+)'\)/g)].map(m=>m[1]),sheets=[...src.matchAll(/import\.meta\.resolve\?\.\('([^']+)'\)/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(sheets)].sort(),['/admin-view.css','/offer.css','/starter-pack.css']);
  mkdirSync(join(dir,'cloud'));
  writeFileSync(join(dir,'cloud/game-cloud.js'),`import { t as e } from "./i18n-GhQDEmBg.js";\n${asked.map(path=>`await import(\n\t/* @vite-ignore */\n\t"${path}"\n);`).join('\n')}\n${sheets.map(path=>`s.href = import.meta.resolve?.("${path}") ?? "${path}";`).join('\n')}`);
  writeFileSync(join(dir,'cloud/i18n-GhQDEmBg.js'),'export const t = 1;');
  for(const name of ['discord','crazygames','kongregate'])writeFileSync(join(dir,`cloud/${name}.js`),'export {};');
  const files=path=>{try{return readFileSync(join(dir,path),'utf8');}catch{return null;}};
  const report=cacheBust(dir,PAGES);
  assert.deepEqual(report.map(r=>r.page),PAGES);
  const out=Object.fromEntries(PAGES.map(page=>[page,files(`/${page}`)]));
  // Every script and stylesheet (our own, not three.js) at its content's version, on every page.
  for(const page of PAGES)for(const url of tagged(out[page]).filter(url=>/^\/(?!\/)[^?]+\.(?:js|css)(?:\?|$)/.test(url))){
   const path=url.split('?')[0];
   if(path.startsWith('/vendor/'))assert.equal(url,path,`${page}: ${url}`);else assert.equal(url,`${path}?v=${contentHash(files(path))}`,`${page}: ${url}`);
  }
  // The farm's import map: still three.js, and every module the farm imports (statically, later, or the sound worker) and every stylesheet
  // src/ adds, each as it is asked for; Vite's hashed chunks and three.js keep their address.
  const map=importMap(out['farm.html']),graph=moduleGraph().filter(path=>!path.startsWith('/vendor/'));
  assert.equal(map.three,'/vendor/three.module.js');assert.equal(map['three/addons/'],'/vendor/addons/');
  assert.ok(graph.length>80);
  for(const path of [...graph,game,...asked,...sheets,'/scenery.js','/village-scene.js','/sound-worker.js','/sound-kit.js'])assert.equal(map[path],`${path.split('?')[0]}?v=${contentHash(files(path.split('?')[0]))}`,path);
  assert.ok(map['/economy-ui.js?v=familyhall-model-2']&&!map['/economy-ui.js'],'as imported, with its hand-made version');
  assert.ok(Object.entries(map).every(([key,url])=>!versionable(key)||url.startsWith(key.split('?')[0]+'?v=')));
  assert.ok(!Object.keys(map).some(key=>key.startsWith('/cloud/')||key.startsWith('/vendor/')),'Vite\'s hashed chunks and three.js stay unmapped (the farm imports no Vite entry)');
  // A preload is the address its import is mapped to (or the browser downloads the module twice).
  const preloads=[...noComments(before['farm.html']).matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(m=>m[1]);
  assert.ok(preloads.length>80);
  for(const url of preloads)if(!url.startsWith('/vendor/'))assert.ok(tagged(out['farm.html']).includes(map[url]),url);
  // The portal pages prefetch the farm's files at the farm's own new addresses; they import nothing, so no import map there.
  const farmAt=new Set(tagged(out['farm.html']));
  for(const page of ['discord.html','crazygames.html','kongregate.html']){
   const block=out[page].slice(out[page].indexOf('<!-- farm-prefetch:start -->'),out[page].indexOf('<!-- farm-prefetch:end -->'));
   const prefetched=[...block.matchAll(/<link rel="prefetch" href="([^"]+)">/g)].map(m=>m[1]).filter(url=>/\.(?:js|css)(?:\?|$)/.test(url));
   assert.ok(prefetched.length>80,page);for(const url of prefetched)assert.ok(farmAt.has(url),`${page}: ${url}`);
   assert.equal(importMap(out[page]),null,page);
  }
  // Only dist-static: the repository's pages, and the home page in the build, stay exactly as they were.
  assert.equal(files('/play.html'),before['play.html']);assert.equal(files('/index.html'),before['play.html']);
  for(const page of ['farm.html','play.html',...PAGES])assert.equal(read(`public/${page}`),before[page],`public/${page}`);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('the deploy runs it last, over dist-static\'s game pages only; Vite\'s entries are versioned, never mistaken for a hashed chunk',()=>{
 const build=read('scripts/build-static.mjs');
 const run=build.indexOf("cacheBust('dist-static',['farm.html','discord.html','crazygames.html','kongregate.html'])");
 assert.ok(run>build.indexOf("cpSync('public','dist-static'")&&run>build.indexOf('applyStructuredData('),'after every other step');
 assert.equal(build.match(/cacheBust\(/g).length,1);assert.doesNotMatch(build.slice(run),/play\.html|index\.html'/);
 const cloud=read('scripts/build-cloud.mjs'),entries=[...cloud.matchAll(/entry:\{([^}]*)\}/g)].flatMap(m=>[...m[1].matchAll(/'?([\w-]+)'?:'src\//g)].map(e=>e[1]));
 assert.deepEqual(entries,['cloud','game-cloud','partners','crazygames','kongregate','discord']);
 for(const name of entries)assert.ok(versionable(`/cloud/${name}.js`),name);
 assert.ok(!versionable('/cloud/payments-BN8PMmeA.js')&&!versionable('/vendor/three.module.js')&&!versionable('/assets/models/barn.glb')&&!versionable('//cdn.example/x.js'));
 assert.doesNotMatch(cloud,/chunkFileNames|entryFileNames/,'Vite\'s own names: <name>-<hash>.js for a shared chunk');
});
