import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel} from '../public/farm-state.js';
import {guideSections} from '../public/farm-guide.js';

test('How to play is short: one sentence per card, and closed features say from which level',()=>{
 const fresh=createFarm(Date.now()),cards=guideSections(fresh).flatMap(s=>s.cards);
 for(const c of cards)assert.ok(c.text.length<=90&&(c.text.match(/\./g)??[]).length<=2,c.title);
 assert.equal(cards.find(c=>c.title==='Lend a hand').locked,8);assert.equal(cards.find(c=>c.title==='Farm events').locked,10);
 const grown=createFarm(Date.now());grown.xp=xpForLevel(20);
 assert.ok(guideSections(grown).flatMap(s=>s.cards).every(c=>!c.locked),'nothing locked at level 20');
 assert.match(cards.find(c=>c.title==='Water and care').text,/Each adds one crop/,'matches harvestYield: +1 each');
});
test('the guide is titled like the menu entry',()=>{
 const html=readFileSync(new URL('../public/farm.html',import.meta.url),'utf8');
 assert.match(html,/<h2 id="help-title">How to play<\/h2>/);assert.match(html,/<div id="help-content"><\/div>/);
});
