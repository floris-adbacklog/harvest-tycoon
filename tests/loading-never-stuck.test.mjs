import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import vm from 'node:vm';
import * as nodeModule from 'node:module';
import {farmHandOver,watchLoading,loadStep,LOAD_STALL_MS,LOAD_RETRY_KEY,LOAD_RETRY_GAP_MS,FRAME_FAILED_MS,LOAD_FAILED_TEXT,RELOAD_HUNG_MS} from '../public/loading-screen.js';
import {trackGame} from '../src/analytics.js';
import {describeFailure,connectionMessage,safeToRepeat,withRetry} from '../src/connection.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 11 Oct 2026, "the loading screen sometimes hangs at 12% again": a farm can never stay stuck while it loads. Nothing watched the farm
// page until its own code ran (src/game-cloud.js), so a page whose files did not come stayed hidden for good behind an empty frame. The
// page around it (play.html, crazygames.html, discord.html, kongregate.html) now watches the frame (public/loading-screen.js farmHandOver).
function frameFixture({stored,storage=true,started='blank'}={}){
 let tick=null,clock=1_000_000,ids=0,onReload=null;const later=[],live=new Map(),reloads=[],fails=[],tracked=[],store=new Map(stored==null?[]:[[LOAD_RETRY_KEY,String(stored)]]);
 // The frame's first empty page (about:blank: shown, no bar) and the farm page (farm.html: its bar, hidden until its code runs).
 const blank={getElementById:()=>null,body:{hidden:false},readyState:'complete'};
 const page=()=>({getElementById:id=>id==='load-progress'?{value:12}:null,body:{hidden:true},readyState:'interactive'});
 const frame={files:0,src:'https://www.harvesttycoon.com/farm.html',contentDocument:started==='blank'?blank:started==='error'?null:page()};
 frame.contentWindow={performance:{getEntriesByType:type=>type==='resource'?{length:frame.files}:[]}};
 // Timeouts keep their delay (live: the ones not run or cleared yet) and run on flush, one round at a time.
 const timers={setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;},setTimeout:(fn,ms)=>{const id=++ids;live.set(id,ms);later.push(()=>{if(live.delete(id))fn();});return id;},clearTimeout:id=>{live.delete(id);}};
 const screen={hidden:true},win={},view={hidden:false};
 const storageApi=storage?{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}:null;
 const hand=farmHandOver(win,screen,{frame:()=>frame,reload:()=>{reloads.push('page');onReload?.();},fail:()=>fails.push('card'),track:(e,p)=>tracked.push([e,p]),storage:storageApi,now:()=>clock,hidden:()=>view.hidden,timers});
 const pass=ms=>{for(let t=0;t<ms;t+=1000){clock+=1000;tick?.();}};
 return {hand,frame,page,blank,screen,win,view,store,storageApi,reloads,fails,tracked,pass,later,running:()=>Boolean(tick),flush:()=>later.splice(0).forEach(fn=>fn()),delays:()=>[...live.values()],set onReload(fn){onReload=fn;},get clock(){return clock;},set clock(v){clock=v;}};
}
test('a farm page whose files stop coming: the loading screen stays over it, and after 30 seconds in view it is opened again, once',()=>{
 const f=frameFixture();f.hand.wait();assert.equal(f.screen.hidden,false);
 f.frame.contentDocument=f.page();f.frame.files=40;f.pass(1000);
 f.pass(LOAD_STALL_MS-1000);f.flush();assert.deepEqual(f.reloads,[],'not before 30 seconds');assert.equal(f.screen.hidden,false,'never an empty frame instead');
 f.pass(1000);assert.deepEqual(f.reloads,[]);f.flush();assert.deepEqual(f.reloads,['page'],'once: the whole page on the website, the farm again on a portal');
 assert.deepEqual(f.tracked,[['farm_load_retry',{reason:'stalled',again:false,step:'frame',models:0}]]);assert.ok(f.store.get(LOAD_RETRY_KEY),'counted, the same count as the farm page\'s');
 assert.equal(f.running(),false);f.pass(LOAD_STALL_MS*4);f.flush();assert.deepEqual(f.reloads,['page'],'nothing more');
});
test('farm.html itself that never comes (the frame stays on its first empty page) is opened again too; that page never counts as shown',()=>{
 const f=frameFixture();f.hand.wait();f.pass(LOAD_STALL_MS+1000);f.flush();
 assert.equal(f.screen.hidden,false);assert.deepEqual(f.reloads,['page']);assert.equal(f.tracked[0][1].step,'frame');
});
test('a slow line keeps its files coming and is never taken for stuck; the farm page that shows takes the screen away',()=>{
 const f=frameFixture();f.hand.wait();f.frame.contentDocument=f.page();
 for(let i=0;i<30;i++){f.pass(20000);f.frame.files+=3;}f.flush();assert.deepEqual(f.reloads,[],'ten minutes of a file every few seconds');assert.equal(f.screen.hidden,false);
 // src/game-cloud.js shows its page and then says so; seen shown is enough (its word may never come).
 f.frame.contentDocument.body.hidden=false;f.pass(1000);assert.equal(f.screen.hidden,true);
 f.pass(LOAD_STALL_MS*10);f.flush();assert.deepEqual(f.reloads,[]);assert.deepEqual(f.fails,[]);assert.deepEqual(f.tracked,[]);
 const said=frameFixture({started:'page'});said.hand.wait();said.win.harvestFarmShown();assert.equal(said.screen.hidden,true,'its word');
 said.pass(LOAD_STALL_MS*4);said.flush();assert.deepEqual(said.reloads,[],'that page is its own watch\'s now (watchLoading)');
});
test('all its files there and still not shown (its code did not run, as right after a deploy): opened again after 3 seconds',()=>{
 const f=frameFixture({started:'page'});f.hand.wait();f.frame.files=120;f.pass(1000);
 f.pass(FRAME_FAILED_MS);f.flush();assert.deepEqual(f.reloads,[],'still loading: the 30 seconds count');
 // Its last file and its load end together: from then on 3 seconds.
 f.frame.files++;f.frame.contentDocument.readyState='complete';f.pass(1000);f.pass(FRAME_FAILED_MS-1000);f.flush();assert.deepEqual(f.reloads,[]);
 f.pass(1000);f.flush();assert.deepEqual(f.reloads,['page']);assert.deepEqual(f.tracked,[['farm_load_retry',{reason:'failed',again:false,step:'frame',models:0}]]);
 assert.equal(FRAME_FAILED_MS,3000);
});
test('only seconds in view count; a second time within ten minutes is the page\'s own pause card, never a loop',()=>{
 const away=frameFixture({started:'page'});away.hand.wait();away.view.hidden=true;away.pass(LOAD_STALL_MS*10);away.flush();
 assert.deepEqual(away.reloads,[],'nothing while nobody looks (a tab behind another, an app in the background)');
 away.view.hidden=false;away.pass(LOAD_STALL_MS-1000);away.flush();assert.deepEqual(away.reloads,[],'not before 30 seconds in view');away.pass(1000);away.flush();assert.deepEqual(away.reloads,['page']);
 const second=frameFixture({stored:1_000_000-60000,started:'page'});second.hand.wait();second.pass(LOAD_STALL_MS+1000);second.flush();
 assert.deepEqual(second.reloads,[]);assert.deepEqual(second.fails,['card']);assert.equal(second.tracked[0][1].again,true);
 const later=frameFixture({stored:1_000_000-LOAD_RETRY_GAP_MS-1,started:'page'});later.hand.wait();later.pass(LOAD_STALL_MS+1000);later.flush();assert.deepEqual(later.reloads,['page'],'long after, once more');
 const nowhere=frameFixture({storage:false,started:'page'});nowhere.hand.wait();nowhere.pass(LOAD_STALL_MS+1000);nowhere.flush();assert.deepEqual(nowhere.reloads,[],'no place to count it: the card at once');assert.deepEqual(nowhere.fails,['card']);
 const stopped=frameFixture({started:'page'});stopped.hand.wait();stopped.hand.stop();stopped.pass(LOAD_STALL_MS*3);stopped.flush();assert.deepEqual([...stopped.reloads,...stopped.fails],[],'stop leaves it to the page (signed out, a pause)');
});
test('a trip\'s new farm page (World II) is watched as well, without the loading screen over it',()=>{
 const f=frameFixture({started:'page'});f.hand.wait();f.frame.contentDocument.body.hidden=false;f.pass(1000);assert.equal(f.screen.hidden,true);
 // src/main.js bridge.travel loads the frame again: until the new page commits the old one stays (and is played on).
 f.pass(LOAD_STALL_MS*2);f.flush();assert.deepEqual(f.reloads,[]);
 f.frame.contentDocument=f.page();f.frame.files=0;f.pass(LOAD_STALL_MS);f.flush();assert.deepEqual(f.reloads,[]);assert.equal(f.screen.hidden,true,'no screen of this page over a trip');
 f.pass(1000);f.flush();assert.deepEqual(f.reloads,['page']);
 const fine=frameFixture({started:'page'});fine.hand.wait();fine.win.harvestFarmShown();fine.frame.contentDocument=fine.page();fine.pass(5000);fine.frame.contentDocument.body.hidden=false;fine.pass(LOAD_STALL_MS*3);fine.flush();assert.deepEqual(fine.reloads,[]);
});
// Review fix (11 Oct 2026): farm.html's own request that fails (a network switch, a reset connection) leaves the browser's error page
// in the frame, a page this page cannot read (contentDocument null). That read as no frame at all, and the screen stayed at 10% for good.
test('farm.html that fails to load (the browser\'s error page, unreadable): opened again after 3 seconds, a second time the pause card',()=>{
 // The frame's first empty page is there when the farm opens, the error page comes after (a portal: the frame is added at 10%).
 const f=frameFixture();f.hand.wait();assert.equal(f.running(),true);f.pass(2000);
 f.frame.contentDocument=null;f.pass(1000);f.pass(FRAME_FAILED_MS-1000);f.flush();assert.deepEqual(f.reloads,[],'not before 3 seconds');assert.equal(f.screen.hidden,false,'the screen stays over it');
 f.pass(1000);f.flush();assert.deepEqual(f.reloads,['page']);assert.deepEqual(f.tracked,[['farm_load_retry',{reason:'failed',again:false,step:'frame',models:0}]]);
 assert.equal(f.running(),false);f.pass(LOAD_STALL_MS*3);f.flush();assert.deepEqual(f.reloads,['page'],'once');
 // The error page already there when the farm opens: watched too, never the old reveal after 20 seconds.
 const first=frameFixture({started:'error'});first.hand.wait();assert.equal(first.running(),true);assert.deepEqual(first.later,[],'no 20-second reveal');
 first.pass(FRAME_FAILED_MS+1000);first.flush();assert.deepEqual(first.reloads,['page']);assert.equal(first.screen.hidden,false);
 const again=frameFixture({stored:1_000_000-60000,started:'error'});again.hand.wait();again.pass(FRAME_FAILED_MS+1000);again.flush();
 assert.deepEqual(again.reloads,[]);assert.deepEqual(again.fails,['card'],'within ten minutes: the pause card with Try again');
 const away=frameFixture({started:'error'});away.hand.wait();away.view.hidden=true;away.pass(LOAD_STALL_MS*3);away.flush();assert.deepEqual(away.reloads,[],'only seconds in view');
 away.view.hidden=false;away.pass(FRAME_FAILED_MS+1000);away.flush();assert.deepEqual(away.reloads,['page']);
});
test('a trip whose farm.html fails is opened again; a shown farm page that went to another site itself is left alone',()=>{
 const trip=frameFixture({started:'page'});trip.hand.wait();trip.win.harvestFarmShown();assert.equal(trip.screen.hidden,true);
 // src/main.js bridge.travel sends the frame to a new address, and that load fails.
 trip.frame.src='https://www.harvesttycoon.com/farm.html?world=village';trip.frame.contentDocument=null;
 trip.pass(FRAME_FAILED_MS+1000);trip.flush();assert.deepEqual(trip.reloads,['page']);assert.equal(trip.screen.hidden,true,'no screen of this page over a trip');
 const away=frameFixture({started:'page'});away.hand.wait();away.frame.contentDocument.body.hidden=false;away.pass(1000);assert.equal(away.screen.hidden,true);
 away.frame.contentDocument=null;away.pass(LOAD_STALL_MS*4);away.flush();assert.deepEqual([...away.reloads,...away.fails],[],'the frame was not sent anywhere: not ours to reload');
 // No farm frame at all (a page without one): the screen still goes after `wait`, as before.
 const screen={hidden:true},later=[],none=farmHandOver({},screen,{frame:()=>null,timers:{setTimeout:fn=>{later.push(fn);return 1;},clearTimeout(){},setInterval:()=>{throw new Error('no watch without a frame');},clearInterval(){}}});
 none.wait();assert.equal(screen.hidden,false);later.splice(0).forEach(fn=>fn());assert.equal(screen.hidden,true);
});
// 13 Oct 2026 (Android app 1.3, the Back button): a trip now sends the frame with location.replace (no new step in the history), so its
// src stays; src/main.js says where it went in dataset.address, and a trip whose farm.html fails is still opened again.
test('a trip sent with location.replace (its src unchanged) whose farm.html fails is opened again; a frame sent nowhere is left alone',()=>{
 const trip=frameFixture({started:'page'});trip.hand.wait();trip.win.harvestFarmShown();
 trip.frame.dataset={address:'/farm.html?world=village'};trip.frame.contentDocument=null;
 trip.pass(FRAME_FAILED_MS+1000);trip.flush();assert.deepEqual(trip.reloads,['page']);assert.equal(trip.screen.hidden,true,'no screen of this page over a trip');
 const home=frameFixture({started:'page'});home.frame.dataset={address:'/farm.html?world=village'};home.hand.wait();home.win.harvestFarmShown();
 home.frame.dataset.address='/farm.html';home.frame.contentDocument=null;home.pass(FRAME_FAILED_MS+1000);home.flush();assert.deepEqual(home.reloads,['page'],'and the trip home');
 const stay=frameFixture({started:'page'});stay.frame.dataset={address:'/farm.html?world=village'};stay.hand.wait();stay.win.harvestFarmShown();
 stay.frame.contentDocument=null;stay.pass(LOAD_STALL_MS*4);stay.flush();assert.deepEqual([...stay.reloads,...stay.fails],[],'not sent anywhere: not ours to reload');
});
// 15 Oct 2026 (the 12% report, a fourth time): the reload this page starts is watched too. A reload that gets no answer keeps the old
// page on screen, and nothing watched it then: 12% until the player refreshed.
test('a reload that gets no answer: the pause card with Try again 15 seconds later, never a second reload by itself',()=>{
 const f=frameFixture({started:'page'});f.hand.wait();f.pass(LOAD_STALL_MS+1000);f.flush();
 assert.deepEqual(f.reloads,['page']);assert.deepEqual(f.delays(),[RELOAD_HUNG_MS],'watched from the moment it starts');assert.deepEqual(f.fails,[]);
 f.flush();assert.deepEqual(f.reloads,['page'],'no second reload: it would only start the waiting one over');assert.deepEqual(f.fails,['card']);
 assert.deepEqual(f.tracked.at(-1),['farm_load_retry',{reason:'reload_hung',again:true,step:'frame',models:0}]);assert.equal(RELOAD_HUNG_MS,15000);
 // farm.html that failed (the browser's error page) is opened again the same way, and watched the same way.
 const error=frameFixture({started:'error'});error.hand.wait();error.pass(FRAME_FAILED_MS+1000);error.flush();error.flush();assert.deepEqual(error.reloads,['page']);assert.deepEqual(error.fails,['card']);
});
test('the watch on a reload ends when a portal opens the farm again inside its page, or the farm page shows itself after all',()=>{
 // CrazyGames, Discord, Kongregate: portal.reopen opens the farm in this page, whose phase 'checking' stops this watch at once.
 const portal=frameFixture({started:'page'});portal.onReload=()=>portal.hand.stop();portal.hand.wait();portal.pass(LOAD_STALL_MS+1000);portal.flush();
 assert.deepEqual(portal.reloads,['page']);assert.deepEqual(portal.delays(),[]);portal.flush();assert.deepEqual(portal.fails,[]);
 assert.equal(read('src/farm-session.js').includes("connection.stop();dispose();const ticket=generation;phase('checking','Checking your account…');"),true,'reopen reaches phase checking before anything waits');
 for(const file of ['src/crazygames.js','src/discord-page.js','src/kongregate-page.js'])assert.match(read(file),/if\(value==='authenticated'\)handOver\.wait\(\);else\{handOver\.stop\(\);/,file);
 // The page that took long was not gone: it shows itself before the reload lands, and no card comes over the farm.
 const late=frameFixture({started:'page'});late.hand.wait();late.pass(LOAD_STALL_MS+1000);late.flush();late.win.harvestFarmShown();
 assert.deepEqual(late.delays(),[]);late.flush();assert.deepEqual(late.fails,[]);assert.equal(late.screen.hidden,true);
 // The page signed out or paused meanwhile (stop), or waits for a new farm (wait): its own screen, no card of this watch.
 const stopped=frameFixture({started:'page'});stopped.hand.wait();stopped.pass(LOAD_STALL_MS+1000);stopped.flush();stopped.hand.stop();stopped.flush();assert.deepEqual(stopped.fails,[]);
});
// The farm page's own watch and this one share one count: whichever opens the farm again first, the next stuck load within ten
// minutes shows Try again (the farm page's card or this page's pause card), and a farm that opened forgets it.
test('never a loop: the page around the farm and the farm page share one count of opening it again',()=>{
 const f=frameFixture({started:'page'});f.hand.wait();f.pass(LOAD_STALL_MS+1000);f.flush();assert.deepEqual(f.reloads,['page']);
 // The farm page after that reload, stuck at 12% within the ten minutes: its card, not a reload.
 let clock=f.clock+60000,tick=null;const reloads=[],el={progress:{value:12},error:{hidden:true,style:{}}};
 const doc={hidden:false,getElementById:id=>id==='load-progress'?el.progress:id==='error'?el.error:null,querySelector:()=>null};
 const win={setInterval:fn=>{tick=fn;return 3;},clearInterval:()=>{tick=null;},setTimeout:fn=>fn(),parent:{location:{reload:()=>reloads.push('page')}}};
 const inner=watchLoading({},null,{doc,win,storage:f.storageApi,now:()=>clock});
 for(let i=0;i<=LOAD_STALL_MS/1000;i++){clock+=1000;tick?.();}
 assert.deepEqual(reloads,[]);assert.equal(el.error.hidden,false,'Try again');
 const next=frameFixture({started:'page'});next.store.set(LOAD_RETRY_KEY,f.store.get(LOAD_RETRY_KEY));next.clock=clock;next.hand.wait();next.pass(LOAD_STALL_MS+1000);next.flush();
 assert.deepEqual(next.reloads,[]);assert.deepEqual(next.fails,['card']);
 // A farm that opened (watchLoading done) forgets the count: the next stuck load may open again by itself.
 const opened=watchLoading({},null,{doc,win,storage:next.storageApi,now:()=>clock});opened.done(true);assert.equal(next.store.has(LOAD_RETRY_KEY),false);
 next.hand.wait();next.pass(LOAD_STALL_MS+1000);next.flush();assert.deepEqual(next.reloads,['page']);
 inner.done(false);
});
test('the pages around the farm reload it, then show their own pause card with the farm card\'s words; the event knows the frame',()=>{
 assert.equal(LOAD_FAILED_TEXT,'Check your connection and try again.');
 assert.ok(JSON.parse(read('i18n/catalog.json'))[LOAD_FAILED_TEXT]!==undefined,'a text the game has already, in every language');
 assert.match(read('src/main.js'),/const handOver=farmHandOver\(window,\$\('loading-screen'\),\{reload:\(\)=>location\.reload\(\),fail:\(\)=>unavailable\(LOAD_FAILED_TEXT\),track:\(event,params\)=>trackGame\(event,params\)\}\);/);
 assert.match(read('src/crazygames.js'),/const handOver=farmHandOver\(window,\$\('loading-screen'\),\{reload:\(\)=>portal\.reopen\(\),fail:\(\)=>pause\(LOAD_FAILED_TEXT\)\}\);/);
 for(const file of ['src/discord-page.js','src/kongregate-page.js'])assert.match(read(file),/const handOver=farmHandOver\(win,\$\('loading-screen'\),\{frame:\(\)=>\$\('farm-host'\)\?\.querySelector\?\.\('iframe'\),reload:\(\)=>portal\.reopen\(\),fail:\(\)=>pause\(LOAD_FAILED_TEXT\)\}\);/,file);
 for(const page of ['public/play.html','public/crazygames.html','public/discord.html','public/kongregate.html'])assert.match(read(page),/id="farm-host"/,page);
 const pushed=[],win={dataLayer:{push:e=>pushed.push(e)},innerWidth:390,matchMedia:()=>({matches:true})};
 for(const step of ['frame','village'])trackGame('farm_load_retry',{reason:'stalled',again:false,step,models:0},win);
 assert.deepEqual(pushed.map(e=>e.step),['frame','village']);
 assert.equal(loadStep({models:0,of:100,account:true,finished:false,village:true}),'village');assert.equal(loadStep({models:0,of:141,account:true,finished:false}),'models');
});

// The farm page's own watch (watchLoading), 11 Oct 2026: until public/game.js runs, the files of its code that arrive count as moving
// (on a slow line its 1 MB took longer than 30 seconds at 12%), and a finished bar is never stuck.
function innerFixture(){
 let clock=1_000_000,tick=null;const reloads=[],el={progress:{value:12},error:{hidden:true,style:{}}},perf={files:0};
 const doc={hidden:false,getElementById:id=>id==='load-progress'?el.progress:id==='error'?el.error:null,querySelector:()=>null};
 const win={performance:{getEntriesByType:()=>({length:perf.files})},setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;},setTimeout:fn=>fn(),parent:{location:{reload:()=>reloads.push('page')}}};
 const store=new Map(),watch=watchLoading({},null,{doc,win,storage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},now:()=>clock});
 return {watch,win,perf,el,reloads,pass:ms=>{for(let t=0;t<ms;t+=1000){clock+=1000;tick?.();}}};
}
test('the game\'s code still arriving at 12% is not stuck; once the game runs, only its bar counts',()=>{
 const slow=innerFixture();for(let i=0;i<20;i++){slow.pass(20000);slow.perf.files+=2;}assert.deepEqual(slow.reloads,[],'a module every ten seconds for almost seven minutes');
 slow.pass(LOAD_STALL_MS+1000);assert.deepEqual(slow.reloads,['page'],'a module that never comes, and nothing else either: 30 seconds');
 const game=innerFixture();game.win.harvestLoading={models:0,of:141,account:true,finished:false};game.pass(1000);
 for(let i=0;i<2;i++){game.pass(14000);game.perf.files+=5;}game.pass(3000);assert.deepEqual(game.reloads,['page'],'tip pictures arriving never hide a stuck palette');
});
test('a farm on screen (a finished bar) is never opened again, even when its start never said so',()=>{
 const f=innerFixture();f.win.harvestLoading={models:141,of:141,account:true,finished:true};f.el.progress.value=100;f.pass(LOAD_STALL_MS*10);assert.deepEqual(f.reloads,[]);
 const game=read('public/game.js');
 assert.match(game,/await new Promise\(resolve=>setTimeout\(\(\)=>\{try\{\$\('loading'\)\.hidden=true;stopTips\(\);progression\.refresh\(\);\}finally\{resolve\(\);\}\},450\)\);/,'the farm\'s start ends whatever the refresh does');
 assert.match(read('src/game-cloud.js'),/const ready=game\?await game\.farmReady\.catch\(error=>\{firstError\(error\);console\.error\('The game could not load',error\);game=null;return false;\}\):false;\n  if\(ready\)startup\.stage='ready';\n(?:  \/\/[^\n]*\n)*  if\(!game\)watch\.failed\(\);else watch\.done\(ready,\{brokenPart,failure:ready\?null:game\.farmFailure\?\?null\}\);/,'a start that fails is a load that failed');
});

// The trip to the village (World II): the real village-scene.js and the real files over a pretend network and a pretend clock.
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
// Each trip is a page of its own: its own model-atlas.js (the palette is kept for the page), as village-scene.js?trip=n asks for it.
registerHooks?.({resolve:(specifier,context,next)=>{
 const found=next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context),trip=/[?&](trip=\d+)/.exec(context.parentURL??'')?.[1];
 return trip&&/\/model-atlas\.js$/.test(found.url)?{...found,url:`${found.url}?${trip}`}:found;
}});
let trips=0;
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';
const flush=async(rounds=40)=>{for(let i=0;i<rounds;i++)await new Promise(resolve=>setImmediate(resolve));};
const later=async ms=>{for(let t=0;t<ms;t+=250){mock.timers.tick(Math.min(250,ms-t));await flush(4);}await flush();};
// rule(url, nth) for a file: 'ok', 'hang' (until stopped), '404' or {trickle:ms} (eight pieces); palette: 'ok', 'hang' or 'error'.
async function trip(rule=()=>'ok',{palette='ok'}={}){
 const net={asked:[],aborted:[],pictures:[],progress:[],warned:[]};
 globalThis.self??=globalThis;globalThis.ProgressEvent??=class extends Event{constructor(type,init){super(type);Object.assign(this,init);}};
 globalThis.Request=class{constructor(url,init={}){this.url=url;this.signal=init.signal;}};
 globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
 globalThis.fetch=async(input,init={})=>{
  const url=typeof input==='string'?input:input.url,signal=init.signal??input.signal;
  if(url.startsWith('blob:')){const {resolveObjectURL}=await import('node:buffer');return new Response(await resolveObjectURL(url).arrayBuffer());}
  net.asked.push(url);const file=url.split('?')[0],how=rule(url,net.asked.filter(u=>u.split('?')[0]===file).length);
  if(how==='hang')return new Promise((_,reject)=>signal?.addEventListener('abort',()=>{net.aborted.push(url);reject(new DOMException('The operation was aborted.','AbortError'));}));
  if(how==='404')return new Response('Not found',{status:404});
  const bytes=readFileSync(new URL(`../public${file}`,import.meta.url));
  // packed: a server that does send a length, the packed one (smaller than what arrives unpacked).
  if(how?.trickle){const size=Math.ceil(bytes.length/8);let at=0;
   return new Response(new ReadableStream({pull:controller=>new Promise(resolve=>setTimeout(()=>{if(at>=bytes.length)controller.close();else{controller.enqueue(new Uint8Array(bytes.subarray(at,at+size)));at+=size;}resolve();},how.trickle))}),how.packed?{headers:{'content-length':String(how.packed)}}:{});}
  return new Response(bytes);   // no Content-Length, as the site sends it packed
 };
 // The village palette is an <img> (THREE.ImageLoader).
 globalThis.document={createElementNS:()=>{const on={},img={width:1024,height:1024,addEventListener:(type,fn)=>{on[type]=fn;},removeEventListener(){},
  set src(url){net.pictures.push(url);if(palette==='ok')setTimeout(()=>on.load?.call(img),0);else if(palette==='error')setTimeout(()=>on.error?.call(img,new Event('error')),0);}};return img;}};
 const {warn,error}=console;console.warn=(...a)=>net.warned.push(a.map(String).join(' '));console.error=()=>{};
 const V=await import(`../public/village-scene.js?trip=${++trips}`);
 const run={net,V,done:false,village:null,failure:null,restore:()=>{Object.assign(console,{warn,error});delete globalThis.document;}};
 V.loadVillage({onProgress:share=>net.progress.push(share)}).then(village=>{run.village=village;run.done=true;},failure=>{run.failure=failure;run.done=true;});
 return run;
}
const VILLAGE='/assets/village/village.glb',LAYOUT='/assets/village/village-layout.json';
const files=(net,path)=>net.asked.filter(u=>u.split('?')[0]===path);
test('the trip\'s bar follows the village as it arrives, though the site sends no length (it stood at 12% until all 5.3 MB had come)',{skip},async t=>{
 mock.timers.enable({apis:['setTimeout']});t.after(()=>mock.timers.reset());
 const run=await trip(url=>url.startsWith(VILLAGE)?{trickle:2000}:'ok');t.after(run.restore);
 assert.equal(run.V.VILLAGE_BYTES,statSync(new URL(`../public${VILLAGE}`,import.meta.url)).size,'the file\'s own size, unpacked as it arrives');
 await later(9000);
 assert.equal(run.done,false);assert.ok(run.net.progress.length>=3&&run.net.progress.at(-1)<1,'moving while it comes in, so watchLoading sees a moving bar');
 for(let i=0;i<40&&!run.done;i++)await later(250);
 assert.equal(run.failure,null);assert.ok(run.village?.isGroup);
 assert.deepEqual(run.net.progress.map(v=>Math.round(v*8)),[1,2,3,4,5,6,7,8],'one step a piece, up to all of it');
 assert.equal(files(run.net,VILLAGE).length,1,'only slow: never asked twice');assert.deepEqual(run.net.warned,[]);
 run.restore();
 const packed=await trip(url=>url.startsWith(VILLAGE)?{trickle:2000,packed:3071567}:'ok');t.after(packed.restore);
 for(let i=0;i<80&&!packed.done;i++)await later(250);
 assert.ok(packed.village?.isGroup);assert.deepEqual(packed.net.progress.map(v=>Math.round(v*8)),[1,2,3,4,5,6,7,8],'a packed length sent along does not end the bar halfway');
 const game=read('public/game.js');assert.match(game,/loadVillage\(\{onProgress:share=>\{loadingUI\.modelsReady\(Math\.round\(share\*99\)\);if\(Math\.round\(share\*99\)%10===0\)markRun\(gfxStore,\{percent:Number\(\$\('load-progress'\)\?\.value\)\|\|0\}\);\}\}\)/);
 assert.match(game,/villageWorld\?\{loading:'Travelling to the village',village:true\}:undefined/,'its own step in farm_load_retry');
});
test('a layout request that never answers: a fresh one beside it after 8 seconds, and the village opens',{skip},async t=>{
 mock.timers.enable({apis:['setTimeout']});t.after(()=>mock.timers.reset());
 const run=await trip((url,nth)=>url.startsWith(LAYOUT)&&nth===1?'hang':'ok');t.after(run.restore);
 await later(7900);assert.equal(run.done,false,'it used to wait for good');assert.equal(files(run.net,LAYOUT).length,1);
 await later(400);for(let i=0;i<40&&!run.done;i++)await later(250);
 assert.equal(run.failure,null);assert.ok(run.village?.isGroup);
 assert.match(files(run.net,LAYOUT)[1],/\?fresh=\d+$/);assert.deepEqual(run.net.aborted,[files(run.net,LAYOUT)[0]],'the stuck one is stopped');
});
test('a village palette that never answers: the village opens with its own copy after 20 seconds instead of waiting for good',{skip},async t=>{
 mock.timers.enable({apis:['setTimeout']});t.after(()=>mock.timers.reset());
 const run=await trip(()=>'ok',{palette:'hang'});t.after(run.restore);
 await later(19750);assert.equal(run.done,false);assert.ok(run.net.pictures.length>=2,'asked again beside it, as the farm\'s palette');
 assert.match(run.net.pictures[0],/\/assets\/models\/village-palette\.png\?v=\d+$/,'versioned past a day-old cache');
 await later(500);for(let i=0;i<40&&!run.done;i++)await later(250);
 assert.equal(run.failure,null);assert.ok(run.village?.userData.palette?.image?.width===1024,'its own copy, from village.glb');
 assert.equal(run.V.VILLAGE_PALETTE_WAIT,20000);
});
test('a village that is refused is asked once more past the cache; refused again, the game\'s words, not the browser\'s',{skip},async t=>{
 mock.timers.enable({apis:['setTimeout']});t.after(()=>mock.timers.reset());
 const once=await trip((url,nth)=>url.startsWith(VILLAGE)&&nth===1?'404':'ok');t.after(once.restore);
 for(let i=0;i<40&&!once.done;i++)await later(250);
 assert.equal(once.failure,null);assert.ok(once.village?.isGroup);assert.equal(files(once.net,VILLAGE).length,2);assert.match(files(once.net,VILLAGE)[1],/\?fresh=\d+$/);
 once.restore();
 const never=await trip(url=>url.startsWith(VILLAGE)?'404':'ok');t.after(never.restore);
 for(let i=0;i<40&&!never.done;i++)await later(250);
 assert.equal(never.failure?.message,'The village could not load.');
});

// The account check and the farm request (src/supabase.js): neither may wait for good (the 4% and 10% of the same loading screen).
function supabaseModule(client){
 const timers=[];let clock=0,id=0;
 const source=read('src/supabase.js').replace(/^import .*;\n/gm,'').replace(/^export /gm,'')
  .replace('import.meta.env.VITE_SUPABASE_URL','"https://x.supabase.co"').replace('import.meta.env.VITE_SUPABASE_ANON_KEY','"anon"');
 const context=vm.createContext({createClient:()=>client,describeFailure,connectionMessage,safeToRepeat,withRetry,enabledProviders:async()=>[],chosenLanguage:()=>'en',noteReloadAfter:data=>data,
  navigator:{onLine:true},Intl,Date,Promise,Error,Object,Boolean,Number,String,
  setTimeout:(fn,ms)=>{timers.push({id:++id,at:clock+ms,fn});return id;},clearTimeout:t=>{const i=timers.findIndex(x=>x.id===t);if(i>=0)timers.splice(i,1);}});
 const api=vm.runInContext(`${source}\n;({verifiedUser,farmRequest,ACCOUNT_WAIT})`,context);
 const advance=async ms=>{const end=clock+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const next=timers[0];if(!next||next.at>end)break;timers.shift();clock=next.at;next.fn();await flush(2);}clock=end;await flush(2);};
 return {...api,advance,pending:()=>timers.length};
}
const outcome=promise=>{const seen={settled:false};promise.then(value=>Object.assign(seen,{settled:true,value}),error=>Object.assign(seen,{settled:true,error}));return seen;};
test('an account check that never answers ends after 20 seconds as a slow connection: the pause screen, which keeps trying',async()=>{
 const never=new Promise(()=>{});
 for(const auth of [{getSession:()=>never},{getSession:async()=>({data:{session:{user:{id:'A'}}},error:null}),getUser:()=>never}]){
  const m=supabaseModule({auth});assert.equal(m.ACCOUNT_WAIT,20000);
  const seen=outcome(m.verifiedUser());await m.advance(19999);assert.equal(seen.settled,false);
  await m.advance(1);assert.equal(seen.error?.transient,true);assert.equal(seen.error?.kind,'timeout');assert.equal(seen.error?.message,connectionMessage('timeout'));
 }
 const fine=supabaseModule({auth:{getSession:async()=>({data:{session:{user:{id:'A'}}},error:null}),getUser:async()=>({data:{user:{id:'A'}},error:null})}});
 const seen=outcome(fine.verifiedUser());await fine.advance(0);assert.equal(seen.value?.id,'A');assert.equal(fine.pending(),0,'no timer left behind');
 assert.match(read('src/main.js'),/else if\(error\.transient\|\|navigator\.onLine===false\)connection\.pause\(reasonOf\(error,navigator\.onLine\)\);/,'a transient failure of the start: the pause screen');
});
test('a farm request stuck before it is even sent (waiting for its session) ends too; invoke\'s own limit keeps it from going out late',async()=>{
 const calls=[];const m=supabaseModule({auth:{},functions:{invoke:(name,options)=>{calls.push([name,options.timeout]);return new Promise(()=>{});}}});
 const seen=outcome(m.farmRequest({operation:'load'},{retry:false}));await m.advance(m.ACCOUNT_WAIT);assert.equal(seen.settled,false,'its own 20 seconds first');
 await m.advance(1000);assert.equal(seen.error?.transient,true);assert.equal(seen.error?.kind,'timeout');
 assert.deepEqual(calls,[['farm-api?forceFunctionRegion=eu-central-1',20000]]);
 const fine=supabaseModule({auth:{},functions:{invoke:async()=>({data:{ok:1},error:null})}});const answer=outcome(fine.farmRequest({operation:'load'}));await fine.advance(0);
 assert.deepEqual(answer.value,{ok:1});assert.equal(fine.pending(),0);
});
test('the portals\' own sign-in servers have a limit as well',()=>{
 for(const file of ['src/crazygames.js','src/discord-page.js','src/kongregate-page.js'])assert.match(read(file),/body:JSON\.stringify\(body\),signal:globalThis\.AbortSignal\?\.timeout\?\.\(20000\)\}\);\}/,file);
});
