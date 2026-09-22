import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILDINGS,BUILDING_LEVELS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the Buildings dialog lists buildings by the level they unlock, not by their place in the source',()=>{
 // BUILDINGS itself is NOT already in level order (Family Hall is declared first, level 10) — the catalog must sort it.
 const declared=Object.keys(BUILDINGS),byLevel=[...declared].sort((a,b)=>BUILDING_LEVELS[a]-BUILDING_LEVELS[b]);
 assert.notDeepEqual(declared,byLevel,'this test needs BUILDINGS to still be unordered; re-check by hand if it is now already sorted');
 const ui=read('public/economy-ui.js');
 assert.match(ui,/const buildingLevel=key=>guidedFarm\(state\)\?BUILDING_LEVELS\[key\]:BUILDINGS\[key\]\.minLevel\?\?1;/);
 assert.match(ui,/Object\.entries\(BUILDINGS\)\.sort\(\(\[a\],\[b\]\)=>buildingLevel\(a\)-buildingLevel\(b\)\)\.map/,'the catalog sorts before it maps to cards');
 assert.match(ui,/import \{[^}]*BUILDING_LEVELS[^}]*\} from '\.\/farm-state\.js';/,'BUILDING_LEVELS is imported to sort with');
});

test('Family Hall looks locked exactly like every other locked building: the lock icon and "Locked · Reach level N." text',()=>{
 const ui=read('public/economy-ui.js');
 const familyhall=ui.slice(ui.indexOf("key==='familyhall'"),ui.indexOf(';',ui.indexOf("key==='familyhall'"))+1);
 assert.match(familyhall,/kind:'locked'/,'a locked Family Hall gets the same status kind as every other locked building');
 assert.match(familyhall,/Locked · \$\{buildingUnlockHint\(state,key\)\}/,'and the same "Locked · Reach level N." text, not its own wording');
 // The card template only prepends the lock glyph for kind==='locked', so Family Hall needed that exact kind to get one.
 assert.match(ui,/\$\{s\.kind==='locked'\?art\('lock','unlock-lock'\):''\}/);
 // Its own copy ("Your weekly order & family") still shows once it is actually open.
 assert.match(familyhall,/text:'Your weekly order & family',kind:'family'/);
});
