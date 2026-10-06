import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moduleGraph,preloadLines,START,END} from '../scripts/module-preload.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 6 Oct 2026: game.js is imported once the farm has loaded, and its modules then came one after the other (about 3 s on 4G).
test('the farm page preloads every module game.js imports, exactly as imported, and the list is up to date (node scripts/module-preload.mjs)',()=>{
 const html=read('public/farm.html'),list=moduleGraph();
 const inPage=html.slice(html.indexOf(START)+START.length,html.indexOf(END)).trim();
 assert.equal(inPage,preloadLines(list).trim(),'run node scripts/module-preload.mjs after changing the imports');
 for(const path of ['/vendor/three.module.js','/vendor/three.core.js','/vendor/addons/loaders/GLTFLoader.js','/farm-state.js','/visual-icons.js'])assert.ok(list.includes(path),path);
 assert.ok(list.includes('/economy-ui.js?v=familyhall-model-2')&&!list.includes('/economy-ui.js'),'a versioned import keeps its version, or it would download twice');
 assert.ok(!list.includes('/game.js'),'game.js has its own preload with its version');
 assert.ok(html.indexOf(END)<html.indexOf('</head>'),'in the head, so they start with the page');
});
