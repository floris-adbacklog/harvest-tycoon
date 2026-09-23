import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm} from '../public/farm-state.js';
import {roadmapMarkup} from '../public/progression-ui.js';
const ui=readFileSync(new URL('../public/retention-ui.js',import.meta.url),'utf8');

test('the farm journal counts goods made next to crops harvested, like the leaderboards do',()=>{
 assert.match(ui,/crops=Math\.max\(stats\.harvested\?\?0,total\('harvest_'\)\),goods=Math\.max\(stats\.produced\?\?0,total\('made_'\)\)/);
 assert.match(ui,/tile\('buildings',number\(goods\),'goods made'\)/);
});

test('the journal collection has a Crops and a Goods tab; a good counts once it has been made (honey also from the Apiary)',()=>{
 assert.match(ui,/tabButton\('crops','Crops',cropKeys\)\}\$\{tabButton\('goods','Goods',goodKeys\)/);
 assert.match(ui,/const count=key=>CROPS\[key\]\?stats\['harvest_'\+key\]\?\?0:\(stats\['made_'\+key\]\?\?0\)\+\(key==='honey'\?apiaryHoney:0\);/);
 assert.match(ui,/apiaryHoney=\(stats\.activity_apiary\?\?state\.activities\?\.completed\?\.apiary\?\?0\)\*\(ACTIVE_STATIONS\.apiary\.itemCount\?\?0\)/,'Apiary honey counts towards Honey');
});

test('coming up shows each next unlock with its level, without a paragraph of text',()=>{
 const html=roadmapMarkup(createFarm(Date.now()));
 assert.match(html,/<h3>Coming up<\/h3><div class="roadmap-entry">/);
 assert.equal((html.match(/class="roadmap-level">Level \d+</g)??[]).length,3);
});
