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
 assert.match(progression,/if\(notify&&p\.leveled&&!p\.catchUp&&p\.level===2&&!p\.avatars\?\.length\)\{notify\(`Level \$\{p\.level\}! One harvest at a time, your farm is growing\.`\);return;\}/);
 assert.match(beginner,/if\(lastStep==='harvest'&&current\?\.id==='sell'\)\{clearTimeout\(marketTimer\);marketTimer=setTimeout\(\(\)=>\{if\(!document\.querySelector\('dialog\[open\]'\)&&beginnerProgress\(state\)\.find\(q=>q\.current\)\?\.id==='sell'\)guide\('market'\);\},1800\);\}/);
 const ids=[...beginner.matchAll(/(\w+):'[^']+'/g)].map(m=>m[1]).slice(0,10);
 assert.deepEqual(ids,['harvest','sell','plant','water','produce','gift','chore','tend','wheat','collect'],'a short what-to-do for every guide step, in order');
 assert.match(beginner,/DO_NOW\[current\?\.id\]\?\?current\?\.title/);
});
