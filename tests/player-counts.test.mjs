import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupDigits,countLines,loadPlayerCounts,startPlayerCounts} from '../src/player-counts.js';
import {ONLINE_WINDOW_MS,CACHE_MS,onlineSince,normaliseCounts} from '../supabase/functions/player-counts/counts.js';
import {ONLINE_WINDOW} from '../supabase/functions/farm-api/presence.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const answer=(data,ok=true)=>async()=>({ok,json:async()=>data});

test('numbers are grouped with a narrow space and the words follow the count',()=>{
 assert.equal(groupDigits(2218),'2 218');assert.equal(groupDigits(71),'71');assert.equal(groupDigits(1234567),'1 234 567');
 assert.deepEqual(countLines({players:2218,online:1}),{players:'2 218 players',online:'1 online'});
 assert.deepEqual(countLines({players:1,online:0}),{players:'1 player',online:'0 online'});
});
test('only two sane numbers are ever accepted from the function',async()=>{
 assert.deepEqual(await loadPlayerCounts('https://x/functions/v1',answer({players:71,online:3})),{players:71,online:3});
 assert.deepEqual(await loadPlayerCounts('https://x/functions/v1',answer({players:71,online:3,email:'a@b.c'})),{players:71,online:3},'nothing else is passed on');
 for(const bad of [{players:-1,online:0},{players:'71',online:3},{players:5,online:9},{players:1.5,online:1},{},null,{error:'no'}])assert.equal(await loadPlayerCounts('https://x/functions/v1',answer(bad)),null,JSON.stringify(bad));
 assert.equal(await loadPlayerCounts('https://x/functions/v1',answer({players:1,online:1},false)),null);
 assert.equal(await loadPlayerCounts(null,answer({players:1,online:1})),null);assert.equal(await loadPlayerCounts('https://x',null),null,'no fetch available');
 let asked;await loadPlayerCounts('https://x/functions/v1',async url=>{asked=url;return {ok:true,json:async()=>({players:1,online:1})};});assert.equal(asked,'https://x/functions/v1/player-counts');
});

function fakePage(phase='unauthenticated'){
 const shown={players:null,online:null},nodes={};
 const panel={hidden:true,querySelector:selector=>{const key=selector.match(/"(\w+)"/)[1];return nodes[key]??=Object.defineProperty({},'textContent',{get:()=>shown[key],set:value=>{shown[key]=value;}});}};
 return {shown,panel,doc:{getElementById:id=>id==='player-counts'?panel:null,hidden:false,body:{dataset:{phase}}}};
}
const wait=()=>new Promise(resolve=>setImmediate(resolve));
test('the panel appears once the numbers are in, refreshes, and stops when someone signs in',async()=>{
 const page=fakePage(),scheduled=[];let calls=0;
 const stop=startPlayerCounts({functionsUrl:'https://x/functions/v1',doc:page.doc,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({players:2218,online:calls})};},timers:{setTimeout:(fn,ms)=>{scheduled.push([fn,ms]);return scheduled.length;},clearTimeout(){}}});
 assert.equal(page.panel.hidden,true,'hidden until there is something to show');
 await wait();assert.equal(page.panel.hidden,false);assert.equal(page.shown.players,'2 218 players');assert.equal(page.shown.online,'1 online');
 assert.equal(scheduled.length,1);assert.equal(scheduled[0][1],60000);
 await scheduled[0][0]();assert.equal(page.shown.online,'2 online');assert.equal(scheduled.length,2);
 page.doc.body.dataset.phase='authenticated';await scheduled[1][0]();assert.equal(calls,2,'no request once signed in');assert.equal(scheduled.length,2,'and no more timers');
 stop();
});
test('a failing function leaves the panel hidden and never breaks the page',async()=>{
 const page=fakePage(),scheduled=[];
 startPlayerCounts({functionsUrl:'https://x/functions/v1',doc:page.doc,fetchImpl:async()=>{throw new Error('offline');},timers:{setTimeout:(fn,ms)=>scheduled.push([fn,ms]),clearTimeout(){}}});
 await wait();assert.equal(page.panel.hidden,true);assert.equal(scheduled.length,1,'it tries again later');
 assert.equal(typeof startPlayerCounts({functionsUrl:null,doc:page.doc}),'function');assert.equal(typeof startPlayerCounts({functionsUrl:'x',doc:{getElementById:()=>null}}),'function');
});
test('a hidden tab does not ask for numbers',async()=>{
 const page=fakePage(),scheduled=[];page.doc.hidden=true;let calls=0;
 startPlayerCounts({functionsUrl:'https://x/functions/v1',doc:page.doc,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({players:1,online:1})};},timers:{setTimeout:(fn,ms)=>scheduled.push([fn,ms]),clearTimeout(){}}});
 await wait();assert.equal(calls,0);assert.equal(scheduled.length,1);
});

test('the function counts players and those active in the last 30 minutes, the same rule as everywhere else',()=>{
 assert.equal(ONLINE_WINDOW_MS,ONLINE_WINDOW,'same window as presence in farm-api');assert.equal(CACHE_MS,30000);
 const now=Date.UTC(2026,8,21,12);assert.equal(onlineSince(now),'2026-09-21T11:30:00.000Z');
 assert.deepEqual(normaliseCounts(71,3),{players:71,online:3});assert.deepEqual(normaliseCounts(5,9),{players:5,online:5},'never more online than players');
 assert.deepEqual(normaliseCounts(null,undefined),{players:0,online:0});assert.deepEqual(normaliseCounts(-4,'x'),{players:0,online:0});assert.deepEqual(normaliseCounts(7.9,2.2),{players:7,online:2});
});
test('the public function returns two numbers, from the leaderboard table only, and answers GET',()=>{
 const code=read('supabase/functions/player-counts/index.ts');
 assert.match(code,/verify_jwt is off/);assert.equal((code.match(/admin\.from\(/g)??[]).length,2);assert.equal((code.match(/admin\.from\('player_stats'\)/g)??[]).length,2);
 assert.match(code,/select\('player_id',\{count:'exact',head:true\}\)/,'counts only, no rows are read');assert.match(code,/\.gte\('last_active_at',onlineSince\(now\)\)/);
 assert.match(code,/request\.method!=='GET'/);assert.match(code,/normaliseCounts\(total\.count,online\.count\)/);assert.match(code,/now-cached\.at<CACHE_MS/);
 assert(!/email|username|auth\.admin/.test(code),'nothing personal');
});
test('the sign-in page has a small, quiet line that the bundle fills in',()=>{
 const play=read('public/play.html'),css=read('public/welcome.css'),main=read('src/main.js');
 assert.match(play,/<div id="player-counts" class="player-counts"[^>]*hidden><span class="pc-item">.*data-count="players".*<span class="pc-item"><i class="pc-dot".*data-count="online".*<\/div>/);
 assert(play.indexOf('data-count="players"')<play.indexOf('data-count="online"'),'players first, then who is online');
 assert.match(css,/\.player-counts\{display:inline-flex;[^}]*font-size:12\.5px/,'small text, no box');assert(!/\.player-counts\{[^}]*(background|border|box-shadow):/.test(css),'no panel around it');
 assert.match(css,/\.pc-dot\{width:6px;height:6px;border-radius:50%;background:#78dd6c/);assert(!css.includes('.pc-person')&&!css.includes('.pc-item+.pc-item'),'no icon and no bullet between the two numbers');assert(!play.includes('pc-person'));
 assert.match(css,/\.player-counts\{order:2;align-self:center/,'on phones it follows the icon row');
 assert.match(main,/import \{startPlayerCounts\} from '\.\/player-counts\.js';/);assert.match(main,/startPlayerCounts\(\{functionsUrl\}\);/);
});
