import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DIAMOND_PACKS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const ui=read('public/boosts-ui.js'),icons=read('public/visual-icons.js');

test('every diamond pack has its own painted picture, registered and on disk',()=>{
 const art=JSON.parse(ui.match(/const PACK_ART=(\[[^\]]+\])/)[1].replace(/'/g,'"'));
 assert.equal(art.length,DIAMOND_PACKS.length);
 for(const key of [...art,'vip-farmer']){
  assert.ok(icons.includes(`'${key}'`),key);
  for(const ext of ['webp','png'])assert.ok(existsSync(new URL(`../public/assets/icons/${key}.${ext}`,import.meta.url)),`${key}.${ext}`);
 }
});

test('the +% extra tabs compare diamonds per euro with the smallest pack',()=>{
 const perEuro=pack=>pack.amount/Number(pack.price.replace(/[^0-9.]/g,'')),base=perEuro(DIAMOND_PACKS[0]);
 assert.deepEqual(DIAMOND_PACKS.map(pack=>Math.round((perEuro(pack)/base-1)*100)),[0,33,66,86]);
 assert.match(ui,/Best value · \+\$\{extra\}%/);assert.match(ui,/\+\$\{extra\}% extra/);
});

test('short of diamonds never leaves a dead button: boosts, finishing and VIP lead to the packs',()=>{
 assert.match(ui,/class="small-button get-diamonds" data-get-diamonds="\$\{short\}"/);
 assert.match(ui,/boost-buy is-short" data-get-diamonds=/);
 assert.match(ui,/data-get-diamonds="\$\{short\}"`:`data-buy-vip="\$\{id\}"`/);
 assert.match(ui,/button\.dataset\.getDiamonds=short;button\.disabled=finishing;/);
 assert.doesNotMatch(ui,/Popular|in small packs|VIP sunshine/);
});

test('a checkout that fails to open says so under the packs, and a closed one leads back to the shop',()=>{
 assert.match(ui,/<p class="pack-error" role="alert">/);
 assert.match(read('src/payment-ui.js'),/data-shop hidden>Back to the shop<\/button>/);
 assert.match(read('public/game.js'),/window\.harvestShop=\{open:\(\)=>boosts\.open\(\)\};/);
});
