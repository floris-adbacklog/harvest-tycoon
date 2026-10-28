import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,expandFarm,xpForLevel} from '../game/farm-state.js';
import {settleFields,fieldHome,FIELD_SLOTS} from '../game/farm-map.js';
// A new field never lands under a moved one (26 Oct 2026: a farmer at level 65 bought field 21 and saw nothing; he had moved field 10
// onto field 21's place in the grid).
const now=Date.UTC(2026,9,26,18);
function farm(fields,at){const s=createFarm(now);while(s.plots.length<fields)s.plots.push({id:s.plots.length,crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false});s.layout={v:1,at:structuredClone(at),cleared:[],added:[],stored:{},n:0,roads:[]};return s;}
// The farm as it was: fields 6, 10, 16, 18 and 19 moved (ids 5, 9, 15, 17, 18), field 21 (id 20) bought.
const TEDDY={'field:5':[1,13],'field:9':[-2,16],'field:15':[1,6.5],'field:17':[1,3.5],'field:18':[7,9.5]};

test('the farm that lost field 21 gets it back on the first free place of the grid, on its next load',()=>{
 const s=farm(21,TEDDY);normalizeFarm(s,now);
 assert.deepEqual(s.layout.at['field:20'],[4.15,13.05],'field 19\'s old place: the only free place in the grid');
 for(const [id,spot] of Object.entries(TEDDY))assert.deepEqual(s.layout.at[id],spot,`${id} stays where it was moved`);
 assert.deepEqual(settleFields(s),[],'once only');
});

test('nothing changes for a farm whose fields are where they were, or that never moved anything',()=>{
 const plain=createFarm(now);normalizeFarm(plain,now);assert.equal(plain.layout,undefined);
 const moved=farm(12,{'field:3':[20,20]});normalizeFarm(moved,now);assert.deepEqual(moved.layout.at,{'field:3':[20,20]});
 assert.deepEqual(settleFields(farm(12,{})),[]);
 // A field moved snugly against another, a little over its edge (a live farm): the other one stays.
 const snug=farm(16,{'field:4':[4,6.5],'field:10':[-2.5,2.5],'field:11':[-2.5,4.5],'field:12':[7.5,6.5]});normalizeFarm(snug,now);
 assert.deepEqual(Object.keys(snug.layout.at).sort(),['field:10','field:11','field:12','field:4']);
});

test('buying a field whose place a moved field took puts it on a free place at once',()=>{
 const s=farm(12,{'field:4':fieldHome(12)});s.xp=xpForLevel(60);s.coins=1e9;s.inventory={...s.inventory,plank:999,ironbar:999,timber:999,stone:999};
 for(const key of Object.keys(s.inventory))s.inventory[key]=9999;
 expandFarm(s);
 assert.equal(s.plots.length,13);assert.deepEqual(s.layout.at['field:12'],fieldHome(4).map(v=>Math.round(v*100)/100),'the place field 5 left');
});

test('the grid is the one the farm draws, and it has room for every field',()=>{
 assert.equal(FIELD_SLOTS,40);assert.deepEqual(fieldHome(0),[-2.15,.25]);assert.deepEqual(fieldHome(5).map(v=>Math.round(v*100)/100),[1,3.45]);
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/roadPieces, fieldHome \} from '\.\/farm-map\.js';/);assert.match(game,/const fieldSpot=i=>state\.layout\?\.at\?\.\[`field:\$\{i\}`\]\?\?fieldHome\(i\);/);
 for(const copy of ['public/farm-map.js','supabase/functions/farm-api/farm-map.js'])assert.equal(readFileSync(new URL(`../${copy}`,import.meta.url),'utf8'),readFileSync(new URL('../game/farm-map.js',import.meta.url),'utf8'),copy);
});
