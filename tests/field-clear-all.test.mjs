import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyFarmAction,createFarm,normalizeFarm,CROPS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,26,12);

function farm(){
 const s=normalizeFarm(createFarm(now),now);
 const plant=(id,crop,plantedAt)=>Object.assign(s.plots[id],{crop,plantedAt,readyAt:plantedAt+60e3,careAt:plantedAt+1e3,watered:false,tended:false,harvestCycles:0});
 plant(0,'wheat',now-1000);plant(1,'apples',now-2000);plant(2,'corn',now-3000);
 return s;
}
const seen=(s,ids)=>ids.map(id=>({id,expectedPlantedAt:s.plots[id].plantedAt}));

test('Remove all: every listed field is cleared in one save, as it was shown, and nothing comes back',()=>{
 assert.ok(CROPS.apples.perennial,'apples regrow');
 const s=farm(),coins=s.coins,inventory=structuredClone(s.inventory);
 const r=applyFarmAction(s,{type:'clear_plantings',fields:seen(s,[0,2])},now);
 assert.deepEqual(r.cleared,[0,2]);assert.equal(s.plots[0].crop,null);assert.equal(s.plots[2].crop,null);
 assert.equal(s.plots[1].crop,'apples','"Remove all but regrowing" leaves the apples');
 assert.equal(s.coins,coins);assert.deepEqual(s.inventory,inventory,'no harvest and no seed coins back');
});
test('Remove all: if one planting changed since the list was shown, nothing is removed',()=>{
 const s=farm(),fields=seen(s,[0,1,2]);fields[2].expectedPlantedAt-=1;
 assert.throws(()=>applyFarmAction(s,{type:'clear_plantings',fields},now),/A planting has changed/);
 assert.deepEqual(s.plots.slice(0,3).map(p=>p.crop),['wheat','apples','corn']);
 assert.throws(()=>applyFarmAction(s,{type:'clear_plantings',fields:[]},now),/Choose the fields/);
 assert.throws(()=>applyFarmAction(s,{type:'clear_plantings',fields:[...seen(s,[0]),...seen(s,[0])]},now),/Choose the fields/,'a field once');
 const empty=s.plots.findIndex(p=>!p.crop);assert.ok(empty>2);
 assert.throws(()=>applyFarmAction(s,{type:'clear_plantings',fields:[{id:empty,expectedPlantedAt:0}]},now),/something growing/,'an empty field');
 assert.deepEqual(s.plots.slice(0,3).map(p=>p.crop),['wheat','apples','corn']);
});
test('Your fields has "Remove all but regrowing" (only when there are both kinds) and "Remove all"; both ask to type ALL',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/both=annual>0&&annual<planted\.length/);
 assert.match(ui,/data-clear-all="annual">Remove all but regrowing \(\$\{annual\}\)<\/button>/);assert.match(ui,/data-clear-all="all">Remove all \(\$\{planted\.length\}\)<\/button>/);
 assert.match(ui,/tone:'danger',typeToConfirm:'ALL'\}/);
 assert.match(ui,/runAction\(\{type:'clear_plantings',fields:fields\.map\(p=>\(\{id:p\.id,expectedPlantedAt:p\.plantedAt\}\)\)\}\)/,'one save');
 assert.match(read('supabase/functions/farm-api/player-log.js'),/clear_plantings:\['farm',\(a,s,r\)=>`Removed \$\{r\?\.cleared\?\.length\?\?''\} crops from the fields`\]/);
});
test('the chat fills a phone screen and opens without a focus ring on its first button',()=>{
 const css=read('public/chat.css'),ui=read('src/chat-ui.js');
 assert.match(css,/@media\(max-width:600px\)\{#chat-dialog\{inset:0;width:100%;height:100%;border:0;border-radius:0\}\}/);
 assert.match(css,/#chat-dialog:focus\{outline:none\}/);
 assert.match(ui,/dialog\.tabIndex=-1;/);assert.match(ui,/dialog\.showModal\(\);dialog\.focus\(\{preventScroll:true\}\);/);
});
