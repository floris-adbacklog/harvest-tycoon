import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {watchLoading,LOAD_STALL_MS,LOAD_RETRY_KEY,LOAD_RETRY_GAP_MS} from '../public/loading-screen.js';
import {trackGame} from '../src/analytics.js';

// 3 Oct 2026: the bar sometimes stood still at 12% until a refresh: the game's code had not arrived. Now the page opens once more by
// itself, and a second time shows Try again.
function setup({stored,storage=true,portal=null}={}){
 let clock=1_000_000,tick=null;const timeouts=[],tracked=[],reloads=[],store=new Map(stored==null?[]:[[LOAD_RETRY_KEY,String(stored)]]);
 const el={progress:{value:12},loading:{hidden:false},error:{hidden:true,style:{}}},retry={onclick:null},bar={style:{}};let translated=0;
 const doc={hidden:false,getElementById:id=>el[{'load-progress':'progress',loading:'loading',error:'error'}[id]],querySelector:sel=>sel==='#error .primary-button'?retry:sel==='#loading .farm-loading-progress'?bar:null};
 const win={setInterval:fn=>{tick=fn;return 7;},clearInterval:id=>{if(id===7)tick=null;},setTimeout:fn=>timeouts.push(fn),parent:{location:{reload:()=>reloads.push('page')}}};
 const storageApi=storage?{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}:null;
 const watch=watchLoading({trackGame:(e,p)=>tracked.push([e,p])},portal,{translate:()=>translated++,doc,win,storage:storageApi,now:()=>clock});
 const pass=ms=>{for(let t=0;t<ms;t+=1000){clock+=1000;tick?.();}};
 return {watch,el,doc,retry,bar,translated:()=>translated,store,tracked,reloads,timeouts,pass,running:()=>Boolean(tick),flush:()=>timeouts.splice(0).forEach(fn=>fn())};
}
test('a bar that stands still for 30 seconds opens the whole page again, once',()=>{
 const t=setup();t.pass(LOAD_STALL_MS-1000);assert.equal(t.reloads.length,0,'not before 30 seconds');
 t.pass(2000);t.flush();assert.deepEqual(t.reloads,['page']);assert.equal(t.running(),false);
 assert.deepEqual(t.tracked,[['farm_load_retry',{reason:'stalled',again:false}]]);assert.ok(t.store.get(LOAD_RETRY_KEY),'counted, so a second time does not loop');
});
test('a moving bar, or a page out of view, is not stuck',()=>{
 const t=setup();for(let i=0;i<10;i++){t.pass(20000);t.el.progress.value+=2;}assert.equal(t.reloads.length,0);
 const away=setup();away.doc.hidden=true;away.pass(120000);away.doc.hidden=false;away.pass(20000);assert.equal(away.reloads.length,0,'time out of view does not count');
});
test('the game code failing to load opens the page again at once; a second time within ten minutes shows Try again',()=>{
 const first=setup();first.watch.failed();first.flush();assert.deepEqual(first.reloads,['page']);assert.equal(first.tracked[0][1].reason,'failed');
 const second=setup({stored:1_000_000-60000});second.watch.failed();second.flush();
 assert.deepEqual(second.reloads,[],'no loop');assert.equal(second.el.error.hidden,false);
 assert.equal(second.el.loading.hidden,false,'over the loading screen, not over placeholders');assert.equal(second.bar.style.visibility,'hidden','without its bar');assert.equal(second.el.error.style.zIndex,'101');assert.equal(second.translated(),1,'in the player\'s language');assert.deepEqual(second.tracked[0][1],{reason:'failed',again:true});
 const later=setup({stored:1_000_000-LOAD_RETRY_GAP_MS-1});later.watch.failed();later.flush();assert.deepEqual(later.reloads,['page'],'long after, it may try once more');
 const nowhere=setup({storage:false});nowhere.watch.failed();nowhere.flush();assert.deepEqual(nowhere.reloads,[],'without a place to count it never reloads by itself');assert.equal(nowhere.el.error.hidden,false);
});
test('a farm that opened stops the watch and forgets the try; the game\'s own error stays as it is',()=>{
 const ok=setup({stored:1_000_000-1000});ok.watch.done(true);assert.equal(ok.running(),false);assert.equal(ok.store.has(LOAD_RETRY_KEY),false);ok.pass(60000);assert.equal(ok.reloads.length,0);
 const webgl=setup({stored:5});webgl.watch.done(false);assert.equal(webgl.store.has(LOAD_RETRY_KEY),true);webgl.watch.failed();webgl.flush();assert.equal(webgl.reloads.length,0,'after done nothing more happens');
});
test('Try again opens the whole page (this frame alone comes back without its farm); on CrazyGames that page asks for the farm',()=>{
 const t=setup();t.retry.onclick();assert.deepEqual(t.reloads,['page']);
 let asked=0;const crazy=setup({portal:{reopen:()=>asked++}});crazy.watch.failed();crazy.flush();crazy.retry.onclick();assert.equal(asked,2);assert.deepEqual(crazy.reloads,[]);
});
test('the measurement: one fixed event with a fixed reason, after consent like every other',()=>{
 const pushed=[];const win={dataLayer:{push:e=>pushed.push(e)},innerWidth:390,matchMedia:()=>({matches:true})};
 trackGame('farm_load_retry',{reason:'stalled',again:true,extra:'x'},win);trackGame('farm_load_retry',{reason:'Failed to fetch'},win);
 const events=pushed.filter(e=>e?.event==='farm_load_retry');
 assert.equal(events.length,2);assert.equal(events[0].reason,'stalled');assert.equal(events[0].again,true);assert.equal(events[0].extra,undefined);assert.equal(events[1].reason,undefined,'never an error text');
 const analytics=readFileSync(new URL('../src/analytics.js',import.meta.url),'utf8');
 assert.match(analytics,/'connection_recovered','farm_load_retry'\]\);/);assert.match(analytics,/const LOAD_REASONS=new Set\(\['failed','stalled'\]\);/);
 const cloud=readFileSync(new URL('../src/game-cloud.js',import.meta.url),'utf8');
 assert.ok(cloud.indexOf('document.body.hidden=false;\n  const watch=watchLoading(bridge,portal,')>0,'watched from the moment the page shows');
 assert.match(cloud,/const watch=watchLoading\(bridge,portal,\{translate:\(\)=>void startTranslation\(document\)\}\);/);
 assert.match(cloud,/let game=null;try\{game=await import\([^)]*\);\}catch\(error\)\{console\.error\('The game could not load',error\);\}/);
});
