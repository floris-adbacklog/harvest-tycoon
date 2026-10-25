import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {giveawayNames,pickIndex,rollTimes,rollSequence,ROLL_MS,GIVEAWAY_KEY} from '../public/giveaway-ui.js';
import {catalog} from '../scripts/i18n.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 25 Oct 2026, the owner, for the Twitch stream: "iedereen die deelneemt doe ik erin en dan rolt die 10 sec en komt er een winnaar uit".
test('the names: one per line or comma, without @ or !join, each once whatever the case',()=>{
 assert.deepEqual(giveawayNames('Bram\n@anna\n!join Kees\n\n  bram  \nPiet, Joke\n'),['Bram','anna','Kees','Piet','Joke']);
 assert.deepEqual(giveawayNames(''),[]);assert.deepEqual(giveawayNames(null),[]);
 assert.equal(giveawayNames('x'.repeat(80))[0].length,40);
});

test('a fair pick: every name can win, nothing outside the list',()=>{
 const seen=new Set();for(let i=0;i<2000;i++){const n=pickIndex(5);assert.ok(n>=0&&n<5);seen.add(n);}
 assert.equal(seen.size,5);assert.equal(pickIndex(0),-1);assert.equal(pickIndex(1),0);
 assert.match(read('public/giveaway-ui.js'),/crypto\.getRandomValues/);
});

test('the roll: ten seconds, quick at first and slower and slower, the winner last',()=>{
 const t=rollTimes();
 assert.equal(ROLL_MS,10000);assert.equal(t.at(-1),10000);
 for(let i=1;i<t.length;i++)assert.ok(t[i]>t[i-1],'later each time');
 const gaps=t.slice(1).map((v,i)=>v-t[i]);
 assert.ok(gaps.every(g=>g>=45),'never faster than the eye can read');
 assert.ok(gaps.at(-1)>gaps[0]*4,'the last steps are slow');
 const names=['a','b','c','d'],seq=rollSequence(names,'c',t.length);
 assert.equal(seq.length,t.length);assert.equal(seq.at(-1),'c');
 for(let i=1;i<seq.length;i++)assert.notEqual(seq[i],seq[i-1],'never the same name twice in a row');
 assert.ok(seq.every(n=>names.includes(n)));
});

test('only the stream account sees it, and it loads only there; English like the staff screens',()=>{
 const game=read('public/game.js');
 assert.match(game,/const GIVEAWAY_EMAILS=Object\.freeze\(\['harvesttycoon\+twitch@gmail\.com'\]\);/);
 assert.match(game,/if\(!adminView&&!visitView&&GIVEAWAY_EMAILS\.includes\(String\(email\?\?''\)\.trim\(\)\.toLowerCase\(\)\)\)import\('\.\/giveaway-ui\.js'\)/);
 assert.match(game,/function setEmailCheck\(check\)\{[^\n]*mountGiveawayFor\(emailAccount\.email\);/);
 assert.doesNotMatch(game,/from '\.\/giveaway-ui\.js'/,'never in the start-up imports: other farmers download nothing');
 assert.doesNotMatch(read('public/farm.html'),/giveaway/i);
 const all=catalog();for(const text of ['Giveaway','Draw a winner','Take out the winner'])assert.equal(all[text],undefined,text);
 assert.ok(JSON.parse(read('i18n/ignore.json')).includes('Draw a winner'));
 assert.equal(GIVEAWAY_KEY,'harvest-tycoon:giveaway-names');
 assert.doesNotMatch(read('public/giveaway-ui.js'),/ · /);
});
