import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVEL_TITLES,levelTitle,xpForLevel,ENDGAME_FIELDS} from '../game/farm-state.js';

test('a new title arrives every 5 levels, all the way past the last endgame field, then holds',()=>{
 assert.equal(LEVEL_TITLES.length,20);assert.equal(new Set(LEVEL_TITLES).size,20,'every title is unique');
 assert.equal(LEVEL_TITLES[0],'Rookie farmer');assert.equal(LEVEL_TITLES[4],'Farm tycoon');
 for(let level=1;level<=200;level++){
  const tier=Math.min(19,Math.floor((level-1)/5));
  assert.equal(levelTitle(level),LEVEL_TITLES[tier],`level ${level}`);
 }
 // The boundary of every tier is exactly a multiple of 5, and the title changes there, never mid-tier.
 for(let start=1;start<=96;start+=5){assert.equal(levelTitle(start),levelTitle(start+4),`level ${start}..${start+4} share a title`);if(start>1)assert.notEqual(levelTitle(start-1),levelTitle(start),`the title changes at level ${start}`);}
 // The ladder reaches at least as far as the last field expansion, so nobody outgrows their title with fields still to unlock.
 const lastField=Math.max(...ENDGAME_FIELDS.map(f=>f.level));assert(LEVEL_TITLES.length*5>=lastField,`${LEVEL_TITLES.length*5} >= ${lastField}`);
 assert.equal(levelTitle(200),levelTitle(96),'it holds past the last tier instead of running out');
});
test('the top bar shows the title from farm-state.js, not its own copy',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/import \{[^}]*levelTitle[^}]*\} from '\.\/farm-state\.js';/);
 assert.match(game,/\$\('level-name'\)\.textContent=levelTitle\(lvl\);/);
 assert.doesNotMatch(game,/'Rookie farmer','Green thumb'/,'no separate hard-coded list left behind');
});
