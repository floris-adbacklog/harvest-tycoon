import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEADERBOARD_CATEGORIES} from '../src/leaderboard.js';
import {rankPickerMarkup,nextRank,bindRankPicker,RANK_ART,rankArtKey} from '../public/rank-picker.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const art=key=>`<i data-art="${key}"></i>`;

test('every board has a chip: thirteen main boards, a "By crop" chip and one chip per crop',()=>{
 const html=rankPickerMarkup(LEADERBOARD_CATEGORIES,art);
 const keys=[...html.matchAll(/data-rank="([a-z_]+)"/g)].map(m=>m[1]);
 assert.deepEqual(keys.sort(),Object.keys(LEADERBOARD_CATEGORIES).sort(),'nothing lost from the old dropdown');
 assert.equal(keys.length,25);assert.match(html,/data-rank-crops/);assert.equal([...html.matchAll(/rank-chip-small/g)].length,12);
 assert.match(html,/id="rank-crops"[^>]*hidden/,'the crop row starts closed');assert.match(html,/data-rank-crops aria-pressed="false" aria-expanded="false" aria-controls="rank-crops"/);
 for(const key of ['level','currency','harvested_crops','goods_produced','items_sold','badges','deliveries','events_finished','best_streak','farm_fields','chores_done','helping_rounds','estate_projects'])assert(RANK_ART[key],`${key} has a picture`);
 assert.match(html,/data-art="wheat"/);assert.match(html,/data-art="berries"/);assert.match(html,/data-art="xp"/);
 assert(!/<select|<option/.test(html));
});
test('a tap picks a board; "By crop" opens the crops and remembers the last one',()=>{
 const c=LEADERBOARD_CATEGORIES;let state={category:'level',lastCrop:'harvested_wheat'};
 let next=nextRank(c,state,{rank:'currency'});assert.deepEqual([next.category,next.showCrops,next.changed],['currency',false,true]);
 next=nextRank(c,{category:'currency',lastCrop:'harvested_wheat'},{crops:true});assert.deepEqual([next.category,next.showCrops,next.changed],['harvested_wheat',true,true]);
 next=nextRank(c,{category:'harvested_wheat',lastCrop:'harvested_wheat'},{rank:'harvested_corn'});assert.deepEqual([next.category,next.lastCrop,next.showCrops],['harvested_corn','harvested_corn',true]);
 next=nextRank(c,{category:'harvested_corn',lastCrop:'harvested_corn'},{rank:'level'});assert.equal(next.showCrops,false);assert.equal(next.lastCrop,'harvested_corn');
 next=nextRank(c,{category:'level',lastCrop:'harvested_corn'},{crops:true});assert.equal(next.category,'harvested_corn','back to the crop you had');
 next=nextRank(c,{category:'harvested_corn',lastCrop:'harvested_corn'},{crops:true});assert.deepEqual([next.changed,next.showCrops,next.category],[false,false,'harvested_corn'],'tapping "By crop" again closes the row and keeps the crop board');
 next=nextRank(c,{category:'harvested_corn',lastCrop:'harvested_corn',open:false},{crops:true});assert.deepEqual([next.changed,next.showCrops],[false,true],'and tapping it once more opens the row again');
 next=nextRank(c,{category:'harvested_corn',lastCrop:'harvested_corn',open:false},{rank:'harvested_barley'});assert.equal(next.showCrops,true,'picking a crop shows the crops');
 next=nextRank(c,{category:'harvested_corn',lastCrop:'harvested_corn',open:false},{rank:'badges'});assert.equal(next.showCrops,false);
 assert.equal(nextRank(c,state,{rank:'made_up'}).category,'level','an unknown board is ignored');
});
function fakeRoot(){
 const buttons=[...Object.keys(LEADERBOARD_CATEGORIES).map(k=>({dataset:{rank:k},attrs:{},hasAttribute:n=>n==='data-rank',setAttribute(n,v){this.attrs[n]=v;}})),{dataset:{},attrs:{},hasAttribute:n=>n==='data-rank-crops',setAttribute(n,v){this.attrs[n]=v;}}];
 const cropsRow={hidden:true},listeners={};
 const root={querySelectorAll:sel=>sel==='[data-rank]'?buttons.filter(b=>b.dataset.rank):[],querySelector:sel=>sel==='[data-rank-crops]'?buttons.at(-1):sel==='#rank-crops'?cropsRow:null,addEventListener(name,fn){listeners[name]=fn;}};
 const tap=button=>listeners.click({target:{closest:()=>button}});
 return {root,buttons,cropsRow,tap};
}
test('the chips drive the hidden field and only report real changes',()=>{
 const {root,buttons,cropsRow,tap}=fakeRoot(),field={value:'level'},seen=[];
 bindRankPicker(root,{categories:LEADERBOARD_CATEGORIES,field,onChange:key=>seen.push(key)});
 const chip=key=>buttons.find(b=>b.dataset.rank===key);
 assert.equal(chip('level').attrs['aria-pressed'],'true');assert.equal(cropsRow.hidden,true);
 tap(chip('currency'));assert.equal(field.value,'currency');assert.equal(chip('currency').attrs['aria-pressed'],'true');assert.equal(chip('level').attrs['aria-pressed'],'false');
 tap(chip('currency'));assert.deepEqual(seen,['currency'],'the same chip twice is not a change');
 tap(buttons.at(-1));assert.equal(field.value,'harvested_wheat');assert.equal(cropsRow.hidden,false);assert.equal(buttons.at(-1).attrs['aria-pressed'],'true');
 tap(chip('harvested_pumpkin'));assert.equal(field.value,'harvested_pumpkin');
 const toggle=buttons.at(-1);assert.equal(toggle.attrs['aria-expanded'],'true');
 tap(toggle);assert.equal(cropsRow.hidden,true,'"By crop" closes the row');assert.equal(toggle.attrs['aria-expanded'],'false');assert.equal(field.value,'harvested_pumpkin','the crop board stays selected');assert.equal(toggle.attrs['aria-pressed'],'true');
 tap(toggle);assert.equal(cropsRow.hidden,false,'and opens it again');assert.equal(toggle.attrs['aria-expanded'],'true');
 tap(chip('level'));assert.equal(cropsRow.hidden,true);assert.equal(toggle.attrs['aria-expanded'],'false');
 assert.deepEqual(seen,['currency','harvested_wheat','harvested_pumpkin','level'],'opening and closing the row is not a change of board');
 listenersIgnore();function listenersIgnore(){const r=fakeRoot();bindRankPicker(r.root,{categories:LEADERBOARD_CATEGORIES,field:{value:'level'},onChange(){throw new Error('unexpected');}});}
});
test('the leaderboard no longer uses a native dropdown, and the rest of the code still gets its category',()=>{
 const ui=read('src/ui.js');
 assert(!ui.includes('<select id="leaderboard-category"'));assert.match(ui,/<input type="hidden" id="leaderboard-category" value="level">/);
 assert.match(ui,/get category\(\)\{return \$\('leaderboard-category'\)\.value;\}/);
 assert.match(ui,/bindRankPicker\(\$\('leaderboard-filter'\)/);assert.match(ui,/\$\('leaderboard-category'\)\.onchange=/);
 const css=read('public/ui-polish.css');assert.match(css,/\.rank-chip\[aria-pressed=true\]/);assert.match(css,/\.game-dialog select\{/);assert.match(css,/\.rank-chip\[aria-expanded=true\] \.rank-caret/);
 assert.match(read('public/farm.html'),/href="\/ui-polish\.css"/);
});

test('Rank by is one line with the current board; the chips fold open and close again after a choice',()=>{
 const ui=read('src/ui.js');
 assert.match(ui,/<details class="rank-drawer" id="rank-drawer"><summary><span class="rank-label" id="rank-label">Rank by<\/span><span class="rank-current" id="rank-current">/);
 assert.match(ui,/\$\('rank-current'\)\.innerHTML=`\$\{art\(rankArtKey\(key\)\)\}<b>\$\{LEADERBOARD_CATEGORIES\[key\]\.heading\}<\/b>`;\$\('rank-drawer'\)\.open=false;/);
 assert.equal(rankArtKey('harvested_pumpkin'),'pumpkin');assert.equal(rankArtKey('events_finished'),'live-events');
});
