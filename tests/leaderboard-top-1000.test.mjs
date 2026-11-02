import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchLeaderboard,boardReadFor,BOARD_SIZE,BOARD_CHUNK,BOARD_PAGE} from '../src/leaderboard.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// The top 1000 (30 Oct 2026, the owner: "do this"): a board opens with its first hundred, as before; a page past them reads the hundred
// it is in first; the 30-second refresh reads as many as are shown.
const fakeClient=(total)=>{const limits=[];const rows=[...Array(total)].map((_,i)=>({player_id:`p${i}`,username:`F${i}`,level:300-i%300,last_active_at:null}));
 const q=(head)=>{const o={head,_limit:null,select(_,opts){o.head=opts?.head;return o;},not(){return o;},order(){return o;},eq(){return o;},gt(){return o;},
  limit(n){o._limit=n;limits.push(n);return o;},maybeSingle:async()=>({data:null}),then(ok){return Promise.resolve(o.head?{count:0}:{data:rows.slice(0,o._limit??rows.length)}).then(ok);}};return o;};
 return {from:()=>q(false),rpc:async()=>({data:[]}),limits};};
test('a board reads a hundred, and says when there is more, up to the top 1000',async()=>{
 assert.deepEqual([0,9,10,25,99,150].map(boardReadFor),[100,100,200,300,1000,1000]);
 assert.equal(BOARD_SIZE/BOARD_CHUNK,10);assert.equal(BOARD_CHUNK/BOARD_PAGE,10);
 const big=fakeClient(2500);
 const first=await fetchLeaderboard(big,null,'level');assert.equal(first.rows.length,100);assert.equal(first.more,true);
 const third=await fetchLeaderboard(big,null,'level',{upTo:300});assert.equal(third.rows.length,300);assert.equal(third.more,true);
 const all=await fetchLeaderboard(big,null,'level',{upTo:5000});assert.equal(all.rows.length,1000,'never past the top 1000');assert.equal(all.more,false);
 const small=await fetchLeaderboard(fakeClient(42),null,'level');assert.equal(small.rows.length,42);assert.equal(small.more,false,'a short board has nothing more');
});
test('the game reads what a page needs before it shows it, and both bridges pass it on',()=>{
 const cloud=read('src/game-cloud.js');
 assert.match(cloud,/if\(board\?\.more&&page\*BOARD_PAGE>=board\.rows\.length\)\{/);
 assert.match(cloud,/bridge\.leaderboard\(category,\{upTo:boardReadFor\(page\)\}\)/);
 assert.match(cloud,/bridge\.leaderboard\(category,\{upTo:quiet&&board\?\.category===category\?board\.rows\.length:undefined\}\)/,'the refresh keeps what is shown');
 for(const f of ['src/main.js','src/farm-session.js'])assert.match(read(f),/async leaderboard\(category='level',\{upTo\}=\{\}\)\{[^}]*\{counts:true,now:Date\.now\(\)\+clock,upTo\}\)/,f);
 assert.match(read('src/leaderboard.js'),/jump\.setAttribute\('aria-label','Go to places'\)/,'a jump by hundreds past ten pages');
});
