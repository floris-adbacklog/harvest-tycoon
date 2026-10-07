import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {moduleGraph,preloadLines,START,END,farmPrefetch,farmFiles,farmModels,prefetchLines,PREFETCH_START,PREFETCH_END,KEEP_OFF} from '../scripts/module-preload.mjs';
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

// 7 Oct 2026: on CrazyGames nothing of the farm came in during a new guest's sign-in round trips; now it downloads meanwhile.
test('the CrazyGames page prefetches farm.html, what it loads and the models of the first view, exactly as asked for, and the list is up to date',()=>{
 const html=read('public/crazygames.html'),farm=read('public/farm.html'),list=farmPrefetch(farm);
 const block=html.slice(html.indexOf(PREFETCH_START)+PREFETCH_START.length,html.indexOf(PREFETCH_END)).trim();
 assert.equal(block,prefetchLines(list),'run node scripts/module-preload.mjs after changing farm.html, game.js\'s imports or its models');
 assert.equal(list[0],'/farm.html','the farm page first, at the address src/farm-session.js opens');
 assert.match(read('src/farm-session.js'),/farmUrl='\/farm\.html'/);
 // Every file farm.html names itself, at the same address (a version included), except the few kept off this page.
 for(const path of farmFiles(farm))assert.ok(list.includes(path)||KEEP_OFF.test(path),path);
 const game=read('src/game-cloud.js').match(/import\(\/\* @vite-ignore \*\/ '(\/game\.js[^']*)'\)/)[1];
 for(const path of ['/styles.css',game,'/vendor/three.module.js','/cloud/game-cloud.js','/lucide-icons.js',...moduleGraph()])assert.ok(list.includes(path)||KEEP_OFF.test(path),path);
 assert.doesNotMatch(block,/android|i18n-boot/,'the app\'s files stay off this page (tests/android-app.test.mjs)');
 // The palette with the version model-atlas.js asks for, and the models game.js loads before the farm shows (scenery comes later).
 const version=read('public/model-atlas.js').match(/export const PALETTE_VERSION='([^']+)'/)[1];
 assert.ok(list.includes(`/assets/models/palette.png?v=${version}`),'the palette at the address model-atlas.js fetches');
 const models=farmModels();
 assert.ok(models.length>100&&models.every(path=>list.includes(path)),'every model of the first view');
 for(const name of ['plant_001','house_027','coop_001','ground_004','field_004','tree_002'])assert.ok(models.includes(`/assets/models/${name}.glb`),name);
 assert.match(read('public/game.js'),/loadInBatches\(modelNames,/,'game.js loads exactly these before the farm is on screen');
 assert.ok(!models.includes('/assets/models/plant_008.glb'),'scenery (public/scenery.js) loads after the farm is on screen, on its own');
 // Real files (the cloud bundle is made on deploy: scripts/build-cloud.mjs), each once, all ours.
 assert.equal(new Set(list).size,list.length,'each file once');
 for(const path of list){assert.match(path,/^\/(?!\/)/,path);if(!path.startsWith('/cloud/'))assert.ok(existsSync(new URL(`../public${path.split('?')[0]}`,import.meta.url)),`missing: ${path}`);}
 assert.match(read('scripts/build-cloud.mjs'),/'game-cloud':'src\/game-cloud\.js'/);
 // Prefetch only (lowest priority, nothing runs), after the page's own script so its files go first, in the body.
 assert.ok(block.split('\n').every(line=>/^<link rel="prefetch" href="[^"]+">$/.test(line)));
 assert.ok(html.indexOf('<script type="module" src="/cloud/crazygames.js"></script>')<html.indexOf(PREFETCH_START)&&html.indexOf(PREFETCH_END)<html.indexOf('</body>'));
});
