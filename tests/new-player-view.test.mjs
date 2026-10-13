import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('on a phone a new farmer starts zoomed in on their fields until the Beginner guide is done',()=>{
 const game=read('public/game.js');
 assert.match(game,/const startView=\(\)=>villageWorld\?'home':mobileLayout\.matches&&!beginnerProgress\(state\)\.every\(q=>q\.done\)\|\|!\(state\.stats\.harvested>0\)\?'fields':'home';/);
 assert.match(game,/viewMode=startView\(\);/,'the first view');
 assert.match(game,/function resetView\(\)\{viewMode=startView\(\);/,'and "My farm" goes back to it');
});

// The first minute (6 Oct 2026, measured on CrazyGames: 37% of new farmers on a computer never touched anything, 11% tapped the wrong
// field, and 62% of those who harvested never found the Market).
test('the first minute: fields up close on every screen, the sickle shows itself, level 2 is a toast and the guide points to the Market',()=>{
 const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),game=read('public/game.js'),progression=read('public/progression-ui.js'),beginner=read('public/beginner-ui.js');
 assert.match(game,/\|\|!\(state\.stats\.harvested>0\)\?'fields':'home'/,'a computer starts on the fields until the first harvest');
 assert.match(game,/if\(!villageWorld&&!adminView&&!\(state\.stats\.harvested>0\)&&beginnerProgress\(state\)\.find\(q=>q\.current\)\?\.id==='harvest'\)firstBasketGhost\(\);/,'the sickle shows by itself on a new farm');
 assert.match(game,/if\(firstBasket&&!villageWorld\)firstBasketGhost\(\);/,'and still from Show me');
 // 11 Oct 2026 (Part A A11): with the first basket the level-2 line says the next step; otherwise it names the Feed Mill (7 Oct 2026).
 assert.match(progression,/if\(notify&&p\.leveled&&!p\.catchUp&&p\.level===2&&!p\.avatars\?\.length\)\{notify\(beginnerProgress\(state\)\.find\(q=>q\.current\)\?\.id==='sell'\?'Level 2! Next: sell your corn in Market\.':p\.entries\.some\(e=>e\.id==='building:mill'\)\?'Level 2! You can now build the Feed Mill and buy a new field\.':`Level \$\{p\.level\}! One harvest at a time, your farm is growing\.`\);return;\}/,'level 2 says the next step, or names the Feed Mill and the new field');
 // The way to the Market by itself (since 6 Oct 2026), now for every step (A12): pending after a step, the moment the harvest lands for step 2.
 // 13 Oct 2026: step 2 also when the farm opens on it, and its pointer comes back (repeat; tests/first-sale-quiet.test.mjs); the landing
 // points at once only the first time.
 assert.match(beginner,/if\(phase&&phase!==lastStep&&\(lastStep\|\|phase==='sell'\)\)\{pending=\{id:current\.id,phase,guide:current\.guide,wait:AUTO_WAIT_MS,quietAt:lastStep&&quiet\(\)\?Date\.now\(\):0,repeat:phase==='sell'\};\}/);
 assert.match(beginner,/function landed\(\)\{if\(pending\?\.id!=='sell'&&pending\?\.phase!=='sell_egg:sell'\|\|pending\.shown\)return;pending\.wait=0;autoCheck\(\);\}/);
 const ids=[...beginner.matchAll(/(\w+):'[^']+'/g)].map(m=>m[1]).slice(0,10);
 assert.deepEqual(ids,['harvest','sell','plant','water','produce','gift','chore','tend','wheat','collect'],'a short what-to-do for every guide step, in order');
 assert.match(beginner,/liveStep\(state,current\?\.id,farmNow\(\)\)\?\?DO_NOW\[current\?\.id\]\?\?current\?\.title/);
 assert.match(beginner,/sell_egg:'Collect eggs at the Coop, then sell one in Market'/,'a guided farm\'s step 7 too');
 assert.match(beginner,/hand:'Help at the Greenhouse'/,'and its step 9, A helping hand (11 Oct 2026)');
});
