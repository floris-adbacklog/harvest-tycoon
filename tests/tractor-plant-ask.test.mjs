import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel,applyFarmAction,tractorQuote} from '../game/farm-state.js';
import {plantAsk,askTile,ASK_MS,ASK_GUARD_MS} from '../public/tractor-ask.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,17,12);

// The owner, 17 Oct 2026: "Kunnen we een bevestiging maken bij tractor planten?" Plant sowed the crop last picked in the seed shop at once.
// Picked 1 + 4: the Plant tile shows its crop, and a first tap asks in the tile itself (no pop-up); Plant answers, Other crop changes it.

test('the question is open for 5 seconds from the first tap, and Plant answers only after 0.4 s (a double tap never plants)',()=>{
 const ask=plantAsk();
 assert.equal(ask.open(now),false,'nothing asked yet');assert.equal(ask.answers(now),false);
 ask.start(now);
 assert.equal(ask.open(now),true);assert.equal(ask.open(now+ASK_MS-1),true);assert.equal(ask.open(now+ASK_MS),false,'after 5 s the tile is a tile again');
 assert.equal(ask.answers(now+ASK_GUARD_MS-1),false,'the second tap of a double tap');assert.equal(ask.answers(now+ASK_GUARD_MS),true);
 assert.equal(ask.answers(now+ASK_MS),false,'a question that has gone answers nothing');
 ask.stop();assert.equal(ask.open(now+1000),false);assert.equal(ask.answers(now+1000),false);
 assert.equal(ASK_MS,5000);assert.equal(ASK_GUARD_MS,400);
});

test('the asking tile: the crop, the price of the job, "Plant 6 × Barley?", then Plant and Other crop; a group, never a button in a button',()=>{
 const html=askTile('barley','Barley',{count:6,total:144});
 assert.match(html,/^<div class="tractor-tile is-asking" role="group" data-tractor-ask>/);
 assert.match(html,/data-art="barley"/,'the crop picture');assert.match(html,/<span class="tractor-job-cost">.*144<\/span>/);
 assert.match(html,/<strong>Plant 6 × Barley\?<\/strong>/);
 assert.match(html,/<button type="button" class="primary-button" data-tractor-go>Plant<\/button><button type="button" class="small-button" data-tractor-other>Other crop<\/button><\/span><\/div>$/);
 assert.equal(html.match(/<button/g).length,2);
});

test('the tractor window: Plant shows its crop and asks; Water, Extra care and Harvest stay one tap; the job sent is the same as before',()=>{
 const ui=read('public/retention-ui.js');
 assert.match(ui,/import \{plantAsk,askTile,ASK_MS\} from '\.\/tractor-ask\.js';/);
 assert.match(ui,/\['plant',crop,`Plant \$\{CROPS\[crop\]\.name\}`\],\['water','water','Water'\],\['tend','care','Extra care'\],\['harvest','harvest','Harvest'\]/,'option 4: the crop as the tile\'s picture and name');
 assert.match(ui,/if\(mode==='plant'&&asking\)return askTile\(crop,CROPS\[crop\]\.name,q\);/);
 assert.match(ui,/const asking=ask\.open\(Date\.now\(\)\)&&quotes\.plant\.count>0&&state\.coins>=quotes\.plant\.total;if\(!asking\)ask\.stop\(\);/,'a question with nothing to plant goes');
 assert.match(ui,/b\.onclick=\(\)=>b\.dataset\.tractor==='plant'\?askPlant\(\):work\(b\.dataset\.tractor\)/);
 assert.match(ui,/if\(go\)go\.onclick=\(\)=>\{if\(!ask\.answers\(Date\.now\(\)\)\)return;ask\.stop\(\);work\('plant'\);\};/);
 // Since 17 Oct 2026 (fuel follows the crop, tractor-fuel.test.mjs) the price on the tile goes along: never more is charged.
 assert.match(ui,/const work=mode=>act\(\{type:'tractor',mode,crop:getCrop\(\),expectedCost:quotes\[mode\]\.total\}/);
 assert.match(ui,/ask\.start\(Date\.now\(\)\);renderUtility\(\);document\.querySelector\('\[data-tractor-go\]'\)\?\.focus\(\{preventScroll:true\}\);/,'Enter answers on a keyboard');
 assert.match(ui,/askTimer=setTimeout\(\(\)=>\{if\(\$\('utility-dialog'\)\.open&&utility==='tractor'\)renderUtility\(\);\},ASK_MS\+50\);/);
 // A tap anywhere else, or closing the window, puts the tile back; the tile's own tap (the event bubbles on) does not.
 assert.match(ui,/\$\('utility-dialog'\)\.addEventListener\('click',e=>\{if\(utility==='tractor'&&ask\.open\(Date\.now\(\)\)&&!e\.target\.closest\?\.\('\[data-tractor-ask\],\[data-tractor="plant"\]'\)\)\{ask\.stop\(\);renderUtility\(\);\}\}\);/);
 assert.match(ui,/\$\('utility-dialog'\)\.addEventListener\('close',\(\)=>ask\.stop\(\)\);/);
 // The night shift keeps its own confirm.
 assert.match(ui,/note:'Once it starts, it cannot be stopped\.'\},\{type:'tractor_shift',crop,expectedCost:shown\}/);
});

test('Other crop and the crop chip: the seed shop, then back to the tractor (asking again after Other crop), never over another window',()=>{
 const ui=read('public/retention-ui.js'),economy=read('public/economy-ui.js');
 assert.match(ui,/const other=document\.querySelector\('\[data-tractor-other\]'\);if\(other\)other\.onclick=\(\)=>toSeeds\(true\);/);
 assert.match(ui,/document\.querySelector\('\[data-tractor-crop\]'\)\.onclick=\(\)=>toSeeds\(false\);/);
 assert.match(ui,/seeds\.addEventListener\('close',\(\)=>\{delete seeds\.dataset\.from;if\(document\.querySelector\('dialog\[open\]'\)\)return;openUtility\('tractor'\);if\(asking\)askPlant\(\);\},\{once:true\}\);/);
 assert.match(economy,/const fromTractor=\$\('seed-dialog'\)\.dataset\.from==='tractor';\$\('seed-dialog'\)\.close\(\);if\(!fromTractor\)notify\(cropChoiceText/,'no "Choose an empty field to plant." while the tractor opens again');
});

test('the wiki and the look: the wiki says Plant asks first; the asking tile is edged in gold and its buttons wrap on a phone',()=>{
 assert.match(read('public/wiki-content.js'),/\['seeds','Plant','Your chosen crop on every empty field\. It asks first, so you can check the crop\.'\]/);
 const css=read('public/retention.css');
 assert.match(css,/\.tractor-tile\.is-asking\{cursor:default;border-color:#c9a45a;background:#fff8e1;/);
 assert.match(css,/\.tractor-ask-buttons\{display:flex;flex-wrap:wrap;/);
 for(const code of ['nl','de','es','fr','ja','ru','ar']){
  const t=JSON.parse(read(`public/i18n/${code}.json`));
  for(const text of ['Plant {0}','Plant {0} × {1}?','Other crop'])assert.ok(t[text],`${code}: ${text}`);
  assert.match(t['Plant {0} × {1}?'],/\{0\}.*\{1\}|\{1\}.*\{0\}/);
 }
});

test('the rules are unchanged: one tractor job plants the chosen crop on every empty field it can pay for, at the price the tile shows',()=>{
 const s=createFarm(now);s.xp=xpForLevel(20)+10;s.coins=5000;s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};
 const q=tractorQuote(s,'plant','barley',now),coins=s.coins;assert.ok(q.count>0);
 const r=applyFarmAction(s,{type:'tractor',mode:'plant',crop:'barley'},now);
 assert.equal(r.count,q.count);assert.equal(coins-s.coins,q.total,'the price on the asking tile');
 assert.ok(q.ids.every(id=>s.plots[id].crop==='barley'));
});
