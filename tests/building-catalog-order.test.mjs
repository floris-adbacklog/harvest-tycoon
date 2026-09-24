import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {BUILDINGS,BUILDING_LEVELS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the Buildings dialog lists buildings by the level they unlock, not by their place in the source',()=>{
 // BUILDINGS itself is NOT already in level order (Family Hall is declared first, level 10) — the catalog must sort it.
 const declared=Object.keys(BUILDINGS),byLevel=[...declared].sort((a,b)=>BUILDING_LEVELS[a]-BUILDING_LEVELS[b]);
 assert.notDeepEqual(declared,byLevel,'this test needs BUILDINGS to still be unordered; re-check by hand if it is now already sorted');
 const ui=read('public/economy-ui.js');
 assert.match(ui,/const buildingLevel=key=>guidedFarm\(state\)\?BUILDING_LEVELS\[key\]:BUILDINGS\[key\]\.minLevel\?\?1;/);
 assert.match(ui,/Object\.entries\(BUILDINGS\)\.sort\(\(\[a\],\[b\]\)=>readyFirst\(a\)-readyFirst\(b\)\|\|buildingLevel\(a\)-buildingLevel\(b\)\)\.map/,'the catalog sorts before it maps to cards: finished batches first, then by level');
 assert.match(ui,/const readyFirst=key=>status\(key\)\.kind==='ready'\?0:1;/,'a building with a finished batch comes first, so collecting is one tap away');
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

test('the places in the valley are listed with the buildings, each with what is waiting there, and open like from the map',()=>{
 const ui=read('public/economy-ui.js'),game=read('public/game.js');
 for(const key of ['valleymarket','ranch','estateworkshop','tradedepot','grandfair'])assert.match(ui,new RegExp(`${key}:'`),key);
 assert.match(ui,/<h3 class="catalog-heading">Places in the valley<\/h3>/);assert.match(ui,/foldLocked\(\$\('building-catalog'\),'\[data-open-place\]'/);
 assert.match(game,/onPlace:key=>openUtility\(key\)/);
 assert.match(ui,/<img src="\$\{pictureFile\(`place-\$\{key\}`\)\}" alt="">/,'a render of the place, like the building cards, not the painted icon');
 // Served as WebP; the PNG render it was made from stays on disk.
 for(const key of ['valleymarket','ranch','estateworkshop','tradedepot','grandfair'])for(const ext of ['png','webp'])assert.ok(existsSync(new URL(`../public/assets/icons/place-${key}.${ext}`,import.meta.url)),`place-${key}.${ext}`);
});
test('on every farm, older (legacy) farms too, what is still locked goes to the bottom, folded: seeds, buildings, places and recipes',()=>{
 const ui=read('public/economy-ui.js');
 for(const [target,title] of [["\\$\\('crop-catalog'\\),'\\[data-choose-crop\\]'",'Seeds to unlock'],["\\$\\('building-catalog'\\),'\\[data-open-building\\]'",'Buildings to unlock'],["\\$\\('building-catalog'\\),'\\[data-open-place\\]'",'Places to unlock'],["recipeList,'\\[data-recipe-card\\]'",'Coming later']]){
  assert.match(ui,new RegExp(`foldLocked\\(${target},[^\\n]*'${title}'\\)`),title);
  assert.doesNotMatch(ui,new RegExp(`guidedFarm\\(state\\)\\)foldLocked\\(${target}`),`${title}: not only on guided farms`);
 }
 assert.doesNotMatch(ui,/openPlaces\.length\|\|!guidedFarm/,'the places heading only shows above places that are open');
});
