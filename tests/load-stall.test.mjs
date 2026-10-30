import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {watchLoading,farmHandOver,missingFiles,loadStep,LOAD_STALL_KEY,LOAD_STALL_MS,LOAD_RETRY_KEY,RELOAD_HUNG_MS} from '../public/loading-screen.js';
import {stallRow,recordLoadStall,STALL_KINDS,STALL_STEPS,STALL_KEEP_DAYS,STALL_ID} from '../supabase/functions/farm-api/load-stall-service.js';
import {describeFailure,connectionMessage,safeToRepeat,withRetry} from '../src/connection.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 15 Oct 2026 (the 12% report, option 5): every stalled load leaves a short note in its tab, and the next farm load brings it to
// farm-api, cookie-free: how long the player waited, at which step, whether they refreshed by hand, which file never arrived.
const FARM='https://www.harvesttycoon.com/farm.html',SITE='https://www.harvesttycoon.com';
// A page's own tags, with just enough of querySelectorAll to run the real selectors against them.
const element=(tag,attrs)=>({tag,attrs,getAttribute:name=>attrs[name]??null});
const matches=(el,selector)=>selector.split(',').some(part=>{const [,tag,attrs]=/^(\w+)((?:\[[^\]]+\])*)$/.exec(part.trim());return el.tag===tag&&[...attrs.matchAll(/\[(\w+)(?:=([\w-]+))?\]/g)].every(([,name,value])=>el.attrs[name]!=null&&(value===undefined||el.attrs[name]===value));});
const farmTags=()=>[element('script',{src:'/i18n-boot.js'}),element('link',{rel:'stylesheet',href:'/styles.css?v=1a2b'}),element('link',{rel:'icon',href:'/favicon.ico'}),
 element('link',{rel:'stylesheet',href:'https://fonts.googleapis.com/css2?family=Nunito'}),element('link',{rel:'modulepreload',href:'/farm-state.js?v=3c4d'}),
 element('link',{rel:'modulepreload',href:'/game.js?v=5e6f'}),element('link',{rel:'prefetch',href:'/assets/models/plant_001.glb'}),element('script',{}),element('script',{type:'module',src:'/cloud/game-cloud.js'})];
const pageOf=(tags=farmTags())=>({baseURI:FARM,querySelectorAll:selector=>tags.filter(el=>matches(el,selector))});
// What arrived: two of the page's own files, a tip picture it never named and a font from elsewhere.
const ARRIVED=[`${SITE}/i18n-boot.js`,`${SITE}/styles.css?v=1a2b`,`${SITE}/assets/icons/apples.webp`,'https://fonts.gstatic.com/s/nunito.woff2'];
const MISSING={waiting:3,files:['/farm-state.js','/game.js','/cloud/game-cloud.js']};
const perf=(arrived,navigation)=>({getEntriesByType:type=>type==='resource'?arrived.map(name=>({name})):type==='navigation'?navigation:[]});
const memory=(entries=[])=>{const store=new Map(entries);return {store,api:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};};
// Each note has its own random id (review fix: a load sent again counts its stall once): its own test checks it, the others leave it out.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const stalled=store=>JSON.parse(store.get(LOAD_STALL_KEY)??'null'),noteIn=store=>{const note=stalled(store);if(note)delete note.id;return note;};

test('missingFiles: the page\'s own modules, stylesheets and scripts with no resource timing yet, by address without ?v=',()=>{
 const win={performance:perf(ARRIVED,[])};
 assert.deepEqual(missingFiles(pageOf(),win),MISSING,'never the icon, a prefetch, a font from elsewhere or an inline script');
 const more=pageOf([...farmTags(),element('link',{rel:'stylesheet',href:'/family.css?v=7'})]);
 assert.deepEqual(missingFiles(more,{performance:perf([],[])}),{waiting:6,files:['/i18n-boot.js','/styles.css','/farm-state.js','/game.js','/cloud/game-cloud.js']},'the first five named, all six counted');
 assert.deepEqual(missingFiles(pageOf(),{performance:perf([],[])},2),{waiting:5,files:['/i18n-boot.js','/styles.css']});
 const twice=pageOf([...farmTags(),element('link',{rel:'modulepreload',href:'/game.js?v=other'})]);assert.equal(missingFiles(twice,{performance:perf([],[])}).waiting,5,'one address once');
 const all=ARRIVED.concat(['/farm-state.js?v=3c4d','/game.js','/cloud/game-cloud.js?v=9'].map(path=>SITE+path));assert.deepEqual(missingFiles(pageOf(),{performance:perf(all,[])}),{waiting:0,files:[]});
 // A request cut off by the page's going (a refresh) gets its entry just before pagehide, with no answer (responseStart 0; lab, 15 Oct
 // 2026: a refresh at 12% named no file): still missing. One that was answered (responseStart above 0) came.
 const cut=ARRIVED.map(name=>({name,responseStart:5})).concat([{name:`${SITE}/game.js?v=5e6f`,responseStart:0},{name:`${SITE}/farm-state.js?v=3c4d`,responseStart:12}]);
 assert.deepEqual(missingFiles(pageOf(),{performance:{getEntriesByType:type=>type==='resource'?cut:[]}}),{waiting:2,files:['/game.js','/cloud/game-cloud.js']});
 // The base comes from the window when the document has none.
 const bare={querySelectorAll:pageOf().querySelectorAll};assert.deepEqual(missingFiles(bare,{location:{href:FARM},performance:perf(ARRIVED,[])}),MISSING);
 // Never throws: nothing known is none.
 for(const [doc,win] of [[null,null],[pageOf(),null],[pageOf(),{}],[{baseURI:FARM},{performance:perf([],[])}],[{baseURI:FARM,querySelectorAll(){throw new Error('x');}},{performance:perf([],[])}],[pageOf(),{performance:{getEntriesByType:()=>({length:4})}}]])
  assert.deepEqual(missingFiles(doc,win),{waiting:0,files:[]});
});

// The farm page's own watch (watchLoading), as tests/loading-retry.test.mjs sets it up, with a page that can be read and listened to.
function inner({stored,storage,began}={}){
 let clock=1_000_000,tick=null;const timeouts=[],reloads=[],on={},kept=memory(stored==null?[]:[[LOAD_RETRY_KEY,String(stored)]]);
 const el={progress:{value:12},error:{hidden:true,style:{}}};
 const doc={...pageOf(),hidden:false,getElementById:id=>id==='load-progress'?el.progress:id==='error'?el.error:null,querySelector:()=>null};
 const win={navigator:{onLine:true},performance:{...perf(ARRIVED,[{type:'navigate',nextHopProtocol:'h2'}]),timeOrigin:began},addEventListener:(type,fn)=>{on[type]=fn;},
  setInterval:fn=>{tick=fn;return 7;},clearInterval:()=>{tick=null;},setTimeout:fn=>timeouts.push(fn),parent:{location:{reload:()=>reloads.push('page')}}};
 const watch=watchLoading({},null,{doc,win,storage:storage??kept.api,now:()=>clock});
 const pass=ms=>{for(let t=0;t<ms;t+=1000){clock+=1000;tick?.();}};
 return {watch,doc,win,el,on,reloads,store:kept.store,pass,note:()=>noteIn(kept.store),raw:()=>stalled(kept.store),flush:()=>timeouts.splice(0).forEach(fn=>fn()),get clock(){return clock;}};
}
test('the farm page that opens itself again leaves "auto": its step, bar, seconds, connection and the files that never came',()=>{
 const t=inner();t.pass(LOAD_STALL_MS+1000);assert.deepEqual(t.reloads,[]);
 assert.deepEqual(t.note(),{kind:'auto',step:'code',percent:12,models:0,view:31,total:31,hidden:false,online:true,protocol:'h2',...MISSING,at:t.clock},'written before the reload goes out');
 t.flush();assert.deepEqual(t.reloads,['page'],'the reload as before');
 // The note's words are the server's: it is taken as it is.
 assert.equal(stallRow(t.note(),{now:t.clock}).step,'code');
 const models=inner();models.win.harvestLoading={models:96,of:141,account:true,finished:false};models.el.progress.value=65;models.watch.failed();
 assert.deepEqual({...models.note(),at:0},{kind:'auto',step:'models',percent:65,models:96,view:0,total:0,hidden:false,online:true,protocol:'h2',...MISSING,at:0});
});
test('Try again leaves "card", a reload that never answers "reload_hung" over the "auto" of its reload; a farm on screen by then leaves it',()=>{
 const card=inner({stored:1_000_000-60000});card.pass(LOAD_STALL_MS+1000);assert.equal(card.el.error.hidden,false);assert.equal(card.note().kind,'card');
 const hung=inner();hung.pass(LOAD_STALL_MS+1000);hung.flush();assert.equal(hung.note().kind,'auto');
 hung.pass(RELOAD_HUNG_MS);hung.flush();assert.equal(hung.el.error.hidden,false);
 assert.deepEqual(hung.note(),{kind:'reload_hung',step:'code',percent:12,models:0,view:31,total:46,hidden:false,online:true,protocol:'h2',...MISSING,at:hung.clock},'the seconds in view stop with the watch; in all they run on');
 const late=inner();late.pass(LOAD_STALL_MS+1000);late.flush();late.win.harvestLoading={models:141,of:141,account:true,finished:true};late.flush();assert.equal(late.note().kind,'auto','the farm came after all');
});
test('the page going while it still loads leaves "left"; not once the watch is over, and not when Back brings it back from the cache',()=>{
 const t=inner();t.pass(5000);t.doc.hidden=true;t.pass(10000);t.doc.hidden=false;t.pass(3000);t.on.pagehide();
 assert.deepEqual(t.note(),{kind:'left',step:'code',percent:12,models:0,view:8,total:18,hidden:true,online:true,protocol:'h2',...MISSING,at:t.clock},'only the seconds in view count as such');
 t.on.pageshow({persisted:true});assert.equal(t.store.has(LOAD_STALL_KEY),false,'back from the back/forward cache: it never went');
 t.on.pagehide();t.on.pageshow({persisted:false});assert.equal(t.note().kind,'left','a fresh load is another page');
 const other=inner();other.on.pagehide();other.store.set(LOAD_STALL_KEY,JSON.stringify({kind:'auto',at:1}));other.on.pageshow({persisted:true});assert.equal(other.note().kind,'auto','only its own note');
 const done=inner();done.pass(5000);done.watch.done(true);done.on.pagehide();done.pass(LOAD_STALL_MS*3);done.flush();assert.equal(done.store.has(LOAD_STALL_KEY),false,'the farm opened: nothing to say');
 const failed=inner();failed.watch.done(false);failed.on.pagehide();assert.equal(failed.store.has(LOAD_STALL_KEY),false);
 const auto=inner();auto.pass(LOAD_STALL_MS+1000);auto.flush();auto.on.pagehide();assert.equal(auto.note().kind,'auto','its own reload is no "left"');
 const shown=inner({stored:1_000_000-60000});shown.watch.failed();shown.on.pagehide();assert.equal(shown.note().kind,'card','Try again is no "left" either');
});
test('a note that cannot be written never stands in the farm\'s way',()=>{
 const kept=memory(),full={...kept.api,setItem:(k,v)=>{if(k===LOAD_STALL_KEY)throw new Error('QuotaExceededError');kept.api.setItem(k,v);}};
 const t=inner({storage:full});t.pass(LOAD_STALL_MS+1000);t.flush();assert.deepEqual(t.reloads,['page']);t.on.pagehide();
 const broken=inner();broken.doc.querySelectorAll=()=>{throw new Error('x');};broken.win.performance=null;broken.win.navigator=undefined;broken.pass(LOAD_STALL_MS+1000);broken.flush();
 assert.deepEqual(broken.reloads,['page']);assert.deepEqual({...broken.note(),at:0},{kind:'auto',step:'code',percent:12,models:0,view:31,total:31,hidden:false,online:null,protocol:'',waiting:0,files:[],at:0});
});

// The page around the farm (farmHandOver), as tests/loading-never-stuck.test.mjs sets it up.
function outer({stored,started='page',began}={}){
 let tick=null,clock=1_000_000,ids=0;const later=[],live=new Map(),reloads=[],fails=[],on={},kept=memory(stored==null?[]:[[LOAD_RETRY_KEY,String(stored)]]);
 const blank={getElementById:()=>null,body:{hidden:false},readyState:'complete'};
 const page=()=>({...pageOf(),getElementById:id=>id==='load-progress'?{value:12}:null,body:{hidden:true},readyState:'interactive'});
 const frame={src:FARM,arrived:[...ARRIVED],contentDocument:started==='blank'?blank:started==='error'?null:page()};
 frame.contentWindow={performance:{getEntriesByType:type=>type==='resource'?frame.arrived.map(name=>({name})):type==='navigation'?[{nextHopProtocol:'h3'}]:[]}};
 const timers={setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;},setTimeout:(fn,ms)=>{const id=++ids;live.set(id,ms);later.push(()=>{if(live.delete(id))fn();});return id;},clearTimeout:id=>{live.delete(id);}};
 const view={hidden:false},screen={hidden:true,querySelector:selector=>selector==='progress'?{value:10}:null};
 const win={navigator:{onLine:false},performance:{...perf([],[{nextHopProtocol:'http/1.1'}]),timeOrigin:began},addEventListener:(type,fn)=>{on[type]=fn;}};
 const hand=farmHandOver(win,screen,{frame:()=>frame,reload:()=>reloads.push('page'),fail:()=>fails.push('card'),storage:kept.api,now:()=>clock,hidden:()=>view.hidden,timers});
 const pass=ms=>{for(let t=0;t<ms;t+=1000){clock+=1000;tick?.();}};
 return {hand,frame,page,win,view,on,reloads,fails,store:kept.store,api:kept.api,pass,note:()=>noteIn(kept.store),raw:()=>stalled(kept.store),flush:()=>later.splice(0).forEach(fn=>fn()),get clock(){return clock;}};
}
test('the page around a farm page that never shows leaves the same notes with step "frame": auto, card, reload_hung',()=>{
 const f=outer();f.hand.wait();f.pass(LOAD_STALL_MS+1000);
 assert.deepEqual(f.note(),{kind:'auto',step:'frame',percent:10,models:0,view:31,total:31,hidden:false,online:false,protocol:'h3',...MISSING,at:f.clock},'this page\'s bar, the farm page\'s files and protocol');
 f.flush();assert.deepEqual(f.reloads,['page']);f.pass(RELOAD_HUNG_MS);f.flush();assert.deepEqual(f.fails,['card']);assert.equal(f.note().kind,'reload_hung');assert.equal(f.note().total,46);
 const card=outer({stored:1_000_000-60000});card.hand.wait();card.pass(LOAD_STALL_MS+1000);assert.deepEqual(card.fails,['card']);assert.equal(card.note().kind,'card');
 // farm.html that failed (the browser's error page): nothing of it can be read, so no files; the protocol is this page's.
 const error=outer({started:'error'});error.hand.wait();error.view.hidden=true;error.pass(2000);error.view.hidden=false;error.pass(3000);
 assert.deepEqual(error.note(),{kind:'auto',step:'frame',percent:10,models:0,view:3,total:5,hidden:true,online:false,protocol:'http/1.1',waiting:0,files:[],at:error.clock});
});
test('the page around goes while it waits for a farm page that has not shown: "left"; a farm page that showed is its own watch\'s',()=>{
 const f=outer({started:'blank'});f.hand.wait();f.pass(7000);f.on.pagehide();assert.deepEqual({...f.note(),at:0},{kind:'left',step:'frame',percent:10,models:0,view:7,total:7,hidden:false,online:false,protocol:'h3',waiting:0,files:[],at:0},'farm.html never came');
 f.on.pageshow({persisted:true});assert.equal(f.store.has(LOAD_STALL_KEY),false);
 const loading=outer();loading.hand.wait();loading.pass(3000);loading.on.pagehide();assert.deepEqual(loading.note().files,MISSING.files);
 // Shown (seen, said, or shown since the last look): the farm page's watchLoading speaks for it.
 const seen=outer();seen.hand.wait();seen.frame.contentDocument.body.hidden=false;seen.pass(1000);seen.on.pagehide();assert.equal(seen.store.has(LOAD_STALL_KEY),false);
 const said=outer();said.hand.wait();said.win.harvestFarmShown();said.on.pagehide();assert.equal(said.store.has(LOAD_STALL_KEY),false);
 const between=outer();between.hand.wait();between.pass(2000);between.frame.contentDocument.body.hidden=false;between.on.pagehide();assert.equal(between.store.has(LOAD_STALL_KEY),false);
 // Its own reload, a stop (signed out, a pause) or no watch at all: nothing.
 const auto=outer();auto.hand.wait();auto.pass(LOAD_STALL_MS+1000);auto.flush();auto.on.pagehide();assert.equal(auto.note().kind,'auto');
 const stopped=outer();stopped.hand.wait();stopped.hand.stop();stopped.on.pagehide();assert.equal(stopped.store.has(LOAD_STALL_KEY),false);
 const idle=outer();idle.on.pagehide();assert.equal(idle.store.has(LOAD_STALL_KEY),false);
});
test('a trip\'s farm page that stalls counts its own seconds, not the time played before it',()=>{
 const f=outer();f.hand.wait();f.pass(4000);f.frame.contentDocument.body.hidden=false;f.pass(1000);f.pass(60000);
 f.frame.contentDocument=f.page();f.pass(LOAD_STALL_MS+1000);
 assert.equal(f.note().kind,'auto');assert.equal(f.note().view,30);assert.equal(f.note().total,30);
});
// 15 Oct 2026, review fix: the page around gave up on a farm page that then showed itself after all (its files came late) and went with
// that reload or pause card. Its 'left' wrote over the note of the reload, and the reloaded page made it the player's own refresh.
test('a farm page that goes with the reload or pause card of the page around keeps that note, never "left" over it',()=>{
 const f=outer();f.hand.wait();f.pass(LOAD_STALL_MS+1000);f.flush();assert.deepEqual(f.reloads,['page']);
 // Meanwhile its files came: it showed itself and its own watch started (the page began before the note). The reload then arrives.
 const late=inner({storage:f.api,began:1_000_000-2000});late.pass(5000);late.on.pagehide();
 assert.deepEqual([f.note().kind,f.note().step,f.note().view],['auto','frame',31],'opened again by itself, not a refresh by hand');
 late.on.pageshow({persisted:true});assert.equal(f.note().kind,'auto','nothing of its own to take back');
 // The reload that never answered: the pause card takes the frame away (src/main.js unavailable), and its page goes.
 const h=outer();h.hand.wait();h.pass(LOAD_STALL_MS+1000);h.flush();const shown=inner({storage:h.api,began:1_000_000-2000});h.pass(RELOAD_HUNG_MS);h.flush();
 assert.deepEqual(h.fails,['card']);shown.on.pagehide();assert.equal(h.note().kind,'reload_hung');
 // A note from before this page began (another load's, not yet taken) gives way, as does a 'left'; not knowing when it began, as before.
 const before=inner({began:1_000_000-2000});before.store.set(LOAD_STALL_KEY,JSON.stringify({kind:'auto',step:'frame',at:1_000_000-2001}));before.on.pagehide();assert.deepEqual([before.note().kind,before.note().step],['left','code']);
 const left=inner({began:1_000_000-2000});left.store.set(LOAD_STALL_KEY,JSON.stringify({kind:'left',step:'frame',at:1_000_000}));left.on.pagehide();assert.equal(left.note().step,'code');
 const unknown=inner();unknown.store.set(LOAD_STALL_KEY,JSON.stringify({kind:'auto',step:'frame',at:1_000_000}));unknown.on.pagehide();assert.equal(unknown.note().kind,'left');
 // The page around, the same: a note left since it began stays, an older one gives way.
 const around=outer({began:1_000_000-1000});around.store.set(LOAD_STALL_KEY,JSON.stringify({kind:'card',step:'models',at:1_000_500}));around.hand.wait();around.pass(2000);around.on.pagehide();assert.equal(around.note().kind,'card');
 const older=outer({began:1_000_000-1000});older.store.set(LOAD_STALL_KEY,JSON.stringify({kind:'card',step:'models',at:1_000_000-1001}));older.hand.wait();older.pass(2000);older.on.pagehide();assert.deepEqual([older.note().kind,older.note().step],['left','frame']);
});
test('each note has its own random id; without one (no crypto) it is written all the same',t=>{
 const a=inner();a.pass(LOAD_STALL_MS+1000);assert.match(a.raw().id,UUID);
 const b=inner();b.watch.failed();assert.match(b.raw().id,UUID);assert.notEqual(b.raw().id,a.raw().id);
 const f=outer();f.hand.wait();f.pass(LOAD_STALL_MS+1000);assert.match(f.raw().id,UUID);f.on.pagehide();
 const gone=outer({started:'blank'});gone.hand.wait();gone.pass(2000);gone.on.pagehide();assert.match(gone.raw().id,UUID);
 const crypto=Object.getOwnPropertyDescriptor(globalThis,'crypto');t.after(()=>Object.defineProperty(globalThis,'crypto',crypto));
 Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true,writable:true});
 const old=inner();old.pass(LOAD_STALL_MS+1000);old.flush();assert.deepEqual(old.reloads,['page']);assert.deepEqual([old.raw().id,old.raw().kind],[null,'auto']);
});

// The next farm load takes the note along (src/supabase.js takeStall), run as it is with a pretend tab and server.
function supabaseModule({stored,navigation='navigate',answers=[]}={}){
 let clock=2_000_000_000;const bodies=[],kept=memory(stored===undefined?[]:[[LOAD_STALL_KEY,typeof stored==='string'?stored:JSON.stringify(stored)]]);
 const client={functions:{invoke:async(name,{body})=>{bodies.push(body);return answers.shift()??{data:{ok:true},error:null};}}};
 const source=read('src/supabase.js').replace(/^import .*;\n/gm,'').replace(/^export /gm,'')
  .replace('import.meta.env.VITE_SUPABASE_URL','"https://x.supabase.co"').replace('import.meta.env.VITE_SUPABASE_ANON_KEY','"anon"');
 const context=vm.createContext({createClient:()=>client,describeFailure,connectionMessage,safeToRepeat,withRetry,enabledProviders:async()=>[],chosenLanguage:()=>'en',noteReloadAfter:data=>data,LOAD_STALL_KEY,
  sessionStorage:kept.api,performance:{getEntriesByType:type=>type==='navigation'?[{type:navigation}]:[]},navigator:{onLine:true},
  Intl,Date:{now:()=>clock},Promise,Error,Object,Boolean,Number,String,JSON,Array,setTimeout,clearTimeout});
 const {farmRequest}=vm.runInContext(`${source}\n;({farmRequest})`,context);
 return {farmRequest,bodies,store:kept.store,get clock(){return clock;},set clock(value){clock=value;}};
}
const STARTED=2_000_000_000,NOTE={id:'5f0c6c1e-8a43-4d5b-9b1a-2f3e4d5c6b7a',kind:'auto',step:'code',percent:12,models:0,view:31,total:31,hidden:false,online:true,protocol:'h2',waiting:1,files:['/game.js'],at:STARTED-60000};
test('the next farm load takes the note along once, only a load, and only a recent one',async()=>{
 const m=supabaseModule({stored:NOTE});
 await m.farmRequest({operation:'action',requestId:'00000000-0000-4000-8000-000000000001',action:{type:'harvest'}});await m.farmRequest({operation:'family'});
 assert.ok(m.bodies.every(body=>!('loadStall' in body)),'no other request carries it');assert.ok(m.store.has(LOAD_STALL_KEY),'nor takes it');
 await m.farmRequest({operation:'load'});assert.deepEqual(m.bodies.at(-1).loadStall,NOTE);assert.equal(m.bodies.at(-1).platform,null);assert.equal(m.store.has(LOAD_STALL_KEY),false);
 await m.farmRequest({operation:'load'});assert.equal('loadStall' in m.bodies.at(-1),false,'once');
 const none=supabaseModule();await none.farmRequest({operation:'load'});assert.equal('loadStall' in none.bodies[0],false);
 // Six hours at most; anything that is not a note is dropped, and gone from the tab all the same.
 assert.deepEqual((await (async()=>{const ok=supabaseModule({stored:{...NOTE,at:STARTED-6*3600000}});await ok.farmRequest({operation:'load'});return ok.bodies[0].loadStall;})()),{...NOTE,at:STARTED-6*3600000});
 for(const stored of [{...NOTE,at:STARTED-6*3600000-1},{...NOTE,at:STARTED+1},{...NOTE,at:String(STARTED)},{...NOTE,at:undefined},'{"kind":"auto"','[1,2]','null','12',JSON.stringify([NOTE])]){
  const m2=supabaseModule({stored});await m2.farmRequest({operation:'load'});assert.equal('loadStall' in m2.bodies[0],false,String(typeof stored==='string'?stored:stored.at));assert.equal(m2.store.has(LOAD_STALL_KEY),false);
 }
});
test('a load sent again after a failure brings the same note, id and all (farm-api counts it once)',async()=>{
 const busy={data:null,error:{name:'FunctionsHttpError',context:{status:503,json:async()=>({error:'Busy',code:'SERVER_UNAVAILABLE'})}}};
 const m=supabaseModule({stored:NOTE,answers:[busy]});await m.farmRequest({operation:'load'});
 assert.equal(m.bodies.length,2,'sent again');assert.deepEqual(m.bodies[1].loadStall,NOTE);assert.equal(m.bodies[1],m.bodies[0],'the same body');
});
test('"left" from a page this one replaced by a reload is the player\'s own refresh; any other "left" stays',async()=>{
 const left={...NOTE,kind:'left'};
 const refreshed=supabaseModule({stored:left,navigation:'reload'});await refreshed.farmRequest({operation:'load'});assert.deepEqual(JSON.parse(JSON.stringify(refreshed.bodies[0].loadStall)),{...left,kind:'refresh'});
 for(const navigation of ['navigate','back_forward',undefined]){const m=supabaseModule({stored:left,navigation});await m.farmRequest({operation:'load'});assert.equal(m.bodies[0].loadStall.kind,'left',String(navigation));}
 const auto=supabaseModule({stored:NOTE,navigation:'reload'});await auto.farmRequest({operation:'load'});assert.equal(auto.bodies[0].loadStall.kind,'auto','only a "left" can be a refresh');
 // Its own farm frame, taken away while it loaded (a pause), after this page started: not a refresh, whatever opened this page.
 const own=supabaseModule({navigation:'reload'});own.clock=STARTED+90000;own.store.set(LOAD_STALL_KEY,JSON.stringify({...left,at:STARTED+60000}));
 await own.farmRequest({operation:'load'});assert.equal(own.bodies[0].loadStall.kind,'left');
});

// farm-api checks the note again (load-stall-service.js): only what fits, nothing about the player.
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const NOW=Date.UTC(2026,9,15,12),GOOD={id:'0b6f2a1c-3d4e-4f5a-8b6c-7d8e9f0a1b2c',kind:'left',step:'models',percent:47,models:96,view:42,total:65,hidden:true,online:true,protocol:'h3',waiting:2,files:['/game.js','/model-atlas.js'],at:NOW-60000};
test('stallRow: a checked row with the platform and device type, never a player, an IP address or a user agent',()=>{
 const row=stallRow(GOOD,{platform:'browser',agent:IPHONE,portal:undefined,staff:false,now:NOW});
 assert.deepEqual(row,{note_id:GOOD.id,created_at:'2026-10-15T12:00:00.000Z',platform:'web',device:'iPhone · Safari',staff:false,kind:'left',step:'models',percent:47,models:96,view_s:42,total_s:65,hidden:true,online:true,protocol:'h3',waiting:2,files:['/game.js','/model-atlas.js'],stage:null,error:null,gpu:null,gfx:null});
 for(const key of Object.keys(row))assert.doesNotMatch(key,/player|user|ip|agent|email|name/,key);assert.ok(!Object.values(row).includes(IPHONE));
 assert.equal(stallRow({...GOOD,player_id:'f1',ip:'1.2.3.4'},{now:NOW}).player_id,undefined,'what else comes along stays out');
 assert.equal(stallRow({...GOOD,kind:'refresh'},{agent:`${IPHONE} HarvestTycoonApp/1.1`,staff:true,now:NOW}).platform,'ios_app');assert.equal(stallRow(GOOD,{staff:true,now:NOW}).staff,true);
 assert.equal(stallRow(GOOD,{staff:'true',now:NOW}).staff,false);assert.equal(stallRow(GOOD,{platform:'crazygames',now:NOW}).platform,'crazygames');assert.equal(stallRow(GOOD,{portal:'kongregate',now:NOW}).platform,'kongregate');
 assert.equal(stallRow(GOOD,{platform:'<b>',now:NOW}).platform,null);assert.equal(stallRow(GOOD,{now:NOW}).device,null);
 for(const kind of STALL_KINDS)assert.equal(stallRow({...GOOD,kind},{now:NOW}).kind,kind);for(const step of STALL_STEPS)assert.equal(stallRow({...GOOD,step},{now:NOW}).step,step);
});
test('stallRow: junk, unknown words and a stale or future note are no row; a number out of range or a wrong type is left out',()=>{
 for(const note of [null,undefined,'auto',42,[GOOD],{...GOOD,kind:'stalled'},{...GOOD,kind:undefined},{...GOOD,step:'frames'},{...GOOD,step:'Code'},{...GOOD,at:undefined},{...GOOD,at:String(NOW)},{...GOOD,at:NaN},{...GOOD,at:Infinity},{...GOOD,at:NOW-86400000-1},{...GOOD,at:NOW+300001}])
  assert.equal(stallRow(note,{now:NOW}),null,JSON.stringify(note));
 assert.ok(stallRow({...GOOD,at:NOW-86400000},{now:NOW})&&stallRow({...GOOD,at:NOW+300000},{now:NOW}),'a day back, five minutes ahead');
 const edge=stallRow({...GOOD,percent:100,models:999,view:86400,total:0,waiting:999},{now:NOW});assert.deepEqual([edge.percent,edge.models,edge.view_s,edge.total_s,edge.waiting],[100,999,86400,0,999]);
 const out=stallRow({...GOOD,percent:101,models:1000,view:86401,total:-1,waiting:1000},{now:NOW});assert.deepEqual([out.percent,out.models,out.view_s,out.total_s,out.waiting],[null,null,null,null,null]);
 const types=stallRow({...GOOD,percent:'47',models:9.5,view:null,total:true,waiting:{},hidden:'yes',online:1,protocol:'quic'},{now:NOW});
 assert.deepEqual([types.percent,types.models,types.view_s,types.total_s,types.waiting,types.hidden,types.online,types.protocol],[null,null,null,null,null,null,null,null]);
 for(const protocol of ['h2','h3','http/1.1','http/1.0'])assert.equal(stallRow({...GOOD,protocol},{now:NOW}).protocol,protocol);for(const protocol of ['H2','','h2 ',null])assert.equal(stallRow({...GOOD,protocol},{now:NOW}).protocol,null);
 assert.equal(stallRow({...GOOD,hidden:false,online:false},{now:NOW}).online,false);
 // Files: at most five of our own addresses, nothing else.
 const files=['/game.js','/../etc/passwd','/x..y.js','game.js','https://evil.example/a.js','/a b.js','/<script>.js','/',`/${'a'.repeat(101)}`,42,null,'/ok/b.css','/c.js','/d.js','/e.js','/f.js'];
 assert.deepEqual(stallRow({...GOOD,files},{now:NOW}).files,['/game.js','/ok/b.css','/c.js','/d.js','/e.js']);
 assert.deepEqual(stallRow({...GOOD,files:'/game.js'},{now:NOW}).files,[]);assert.deepEqual(stallRow({...GOOD,files:undefined},{now:NOW}).files,[]);
 assert.deepEqual(stallRow({...GOOD,files:[`/${'a'.repeat(100)}`]},{now:NOW}).files,[`/${'a'.repeat(100)}`],'up to 100 characters after the slash');
});
// 15 Oct 2026, review fixes: the note's own id is kept only when it is one (else null: still a row), and the time only to the hour, so a
// row cannot be matched to the player_seen and player log entries of the load that brought it.
test('stallRow: the note\'s own id when it is one, and the time to the hour only',()=>{
 assert.equal(stallRow({...GOOD,id:GOOD.id.toUpperCase()},{now:NOW}).note_id,GOOD.id.toUpperCase());assert.ok(STALL_ID.test(crypto.randomUUID()));
 for(const id of [undefined,null,42,'',`${GOOD.id} `,'not-a-uuid',GOOD.id.replace(/-/g,''),`${GOOD.id}0`,'0b6f2a1c-3d4e-4f5a-8b6c-7d8e9f0a1b2g',{toString:()=>GOOD.id},[GOOD.id]]){
  const row=stallRow({...GOOD,id},{now:NOW});assert.equal(row.note_id,null,String(id));assert.equal(row.kind,'left');
 }
 assert.equal(stallRow(GOOD,{now:NOW+3599999}).created_at,'2026-10-15T12:00:00.000Z');assert.equal(stallRow({...GOOD,at:NOW+3540000},{now:NOW+3600000}).created_at,'2026-10-15T13:00:00.000Z');
 assert.equal(stallRow({...GOOD,at:NOW-60000},{now:NOW+1234}).created_at,'2026-10-15T12:00:00.000Z','never the moment of the load');
 assert.equal(stallRow({...GOOD,at:NOW-86400000-1},{now:NOW+1234}),null,'the day back still counts from the moment itself');
});
// As the table: note_id unique, a duplicate with ignoreDuplicates left out.
function db({upsert=null,clear=null,throws=false}={}){
 const calls=[],rows=[];
 return {calls,rows,from(table){return {
  upsert(row,options){calls.push(['upsert',table,row,options]);if(throws)return Promise.reject(Object.assign(new Error('network'),{code:'ECONNRESET'}));
   if(!upsert&&!(options?.ignoreDuplicates&&row[options.onConflict]!=null&&rows.some(old=>old[options.onConflict]===row[options.onConflict])))rows.push(row);return Promise.resolve({error:upsert});},
  delete(){return {lt(column,value){calls.push(['delete',table,column,value]);return Promise.resolve({error:clear});}};}
 };}};
}
test('recordLoadStall: one row in load_stalls, once per note, then rows older than 90 days go; a failure is only a logged code',async t=>{
 const errors=mock.method(console,'error',()=>{});t.after(()=>errors.mock.restore());
 const a=db(),row=await recordLoadStall({admin:a,note:GOOD,platform:'browser',agent:IPHONE,staff:false,now:NOW});
 assert.deepEqual(a.calls,[['upsert','load_stalls',row,{onConflict:'note_id',ignoreDuplicates:true}],['delete','load_stalls','created_at',new Date(NOW-90*86400000).toISOString()]]);assert.equal(STALL_KEEP_DAYS,90);
 // The same load sent again (src/connection.js withRetry), up to four times: one row. Another note, or one without an id: a row each.
 for(let n=0;n<3;n++)await recordLoadStall({admin:a,note:GOOD,platform:'browser',agent:IPHONE,staff:false,now:NOW+(n+1)*1200});
 assert.equal(a.rows.length,1);await recordLoadStall({admin:a,note:{...GOOD,id:crypto.randomUUID()},now:NOW});assert.equal(a.rows.length,2);
 await recordLoadStall({admin:a,note:{...GOOD,id:undefined},now:NOW});await recordLoadStall({admin:a,note:{...GOOD,id:undefined},now:NOW});assert.equal(a.rows.length,4);
 const junk=db();assert.equal(await recordLoadStall({admin:junk,note:{kind:'x'},now:NOW}),null);assert.deepEqual(junk.calls,[],'nothing to write: nothing asked');
 const missing=db({upsert:{code:'42P01',message:'relation "public.load_stalls" does not exist'},clear:{code:'42P01',message:'x'}});
 await recordLoadStall({admin:missing,note:GOOD,now:NOW});assert.equal(missing.calls.length,2,'the clean-up runs anyway');
 const down=db({throws:true});await recordLoadStall({admin:down,note:GOOD,now:NOW});
 assert.deepEqual(errors.mock.calls.map(c=>c.arguments),[['Load stall record failed','42P01'],['Load stall cleanup failed','42P01'],['Load stall record failed','ECONNRESET']],'the code only, never the note or the message');
});
test('farm-api counts the note beside the load, for every account, never in its way',()=>{
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/import \{recordLoadStall\} from '\.\/load-stall-service\.js';/);
 const line="if(body.operation==='load'&&body.loadStall)later(Promise.resolve().then(()=>recordLoadStall({admin,note:body.loadStall,platform:body.platform,agent:req.headers.get('user-agent'),portal:user.app_metadata?.portal,staff:isAdminAccount(user)})).catch(()=>{}));";
 assert.ok(api.includes(line),'beside the load (later), its failure caught');assert.doesNotMatch(api,/await recordLoadStall/);
 const at=api.indexOf(line);
 assert.ok(api.indexOf("if(!['events','admin_events','social','load'")<at,'a known request only');
 assert.ok(at<api.indexOf('const profileResponse=await (mine?.profile')&&at<api.indexOf("if(body.operation==='load'&&isAdminAccount(user)){"),'before anything that may end the load first, the admin\'s showcase included');
 assert.match(api,/if\(raw\.length>bodyMax\)return reply\(\{error:'Request is too large\.'\},413\);/,'the note fits a load under the size limit');assert.match(api,/family_emblem_upload'\?EMBLEM_BODY_MAX:4096;/,'4 KB for every request but an own emblem');
 assert.ok(JSON.stringify({operation:'load',timeZone:'America/Argentina/ComodRivadavia',language:'nl',platform:'browser',loadStall:{...GOOD,kind:'reload_hung',files:Array(5).fill(`/${'a'.repeat(99)}`)}}).length<1200);
});
test('supabase/load-stalls.sql: locked to farm-api, no player id, the same kinds and steps as the service',()=>{
 const sql=read('supabase/load-stalls.sql'),table=sql.slice(sql.indexOf('create table if not exists public.load_stalls ('),sql.indexOf(');',sql.indexOf('create table'))+2);
 assert.ok(table.length>100);
 const list=column=>new RegExp(`${column} text not null check \\(${column} in \\(([^)]*)\\)\\)`).exec(table)?.[1].split(',').map(word=>word.trim().replace(/^'|'$/g,''));
 assert.deepEqual(list('kind'),[...STALL_KINDS]);assert.deepEqual(list('step'),[...STALL_STEPS]);
 for(const column of ['id bigint generated always as identity primary key','note_id uuid unique','created_at timestamptz not null default now()','platform text','device text','staff boolean not null default false',
  'percent smallint','models smallint','view_s integer','total_s integer','hidden boolean','online boolean','protocol text','waiting smallint',"files text[] not null default '{}'"])assert.ok(table.includes(` ${column}`),column);
 assert.doesNotMatch(table,/player|user|auth\.|\bip\b|agent|references/i,'nothing that leads back to a farmer');
 assert.match(sql,/create index if not exists load_stalls_created on public\.load_stalls\(created_at\);/);
 assert.match(sql,/alter table public\.load_stalls enable row level security;\nrevoke all on public\.load_stalls from anon, authenticated;/);
 assert.doesNotMatch(sql,/^\s*(create policy|grant)/im,'no policy: only the service role');
 assert.match(sql,/supabase\/delete-account\.sql needs no change/);assert.match(sql,/created_at the hour only/);assert.match(sql,/older than 90 days/);assert.match(sql,/unnest\(files\)/,'the owner\'s query for the files that never came');
 assert.doesNotMatch(read('supabase/delete-account.sql'),/load_stalls/);
});
test('one list of steps: the analytics event, the loading screen\'s words and the server\'s',()=>{
 const analytics=/const LOAD_STEPS=new Set\(\[([^\]]*)\]\);/.exec(read('src/analytics.js'))[1].split(',').map(word=>word.trim().replace(/^'|'$/g,''));
 const words=new Set([loadStep(undefined),loadStep({models:0,of:9,account:false}),loadStep({models:9,of:9,account:false}),loadStep({models:9,of:9,account:true}),loadStep({models:0,of:9,account:true,village:true}),'frame']);
 assert.deepEqual(analytics,[...STALL_STEPS]);assert.deepEqual([...words],[...STALL_STEPS]);
 assert.match(read('public/loading-screen.js'),/const note=\(kind,at=view\(\)\)=>\{try\{return noteStall\(storage,\{kind,step:'frame',/,'farmHandOver\'s own step');
 assert.equal(LOAD_STALL_KEY,'harvest-tycoon:load-stall');
});
test('the farm page keeps room for every file\'s timing, before it waits for anything',()=>{
 const cloud=read('src/game-cloud.js'),line='try{performance.setResourceTimingBufferSize?.(1000);}catch{}';
 assert.ok(cloud.includes(line));assert.ok(cloud.indexOf(line)<cloud.indexOf('await '),'before the first await');assert.ok(cloud.indexOf(line)<cloud.indexOf('watchLoading(bridge'));
 assert.match(read('src/supabase.js'),/import \{LOAD_STALL_KEY,LOAD_FAILED_KEY\} from '\.\.\/public\/loading-screen\.js';/);
});
test('the privacy policy says what the report holds, that it is not linked to the account, and lists its storage key',()=>{
 const policy=read('public/privacy.html'),game=policy.slice(policy.indexOf('<h3>Your game</h3>'),policy.indexOf('</ul>',policy.indexOf('<h3>Your game</h3>')));
 const item='<li>When the game does not finish loading, its 3D view stops, or it closes while starting: a short technical report, sent with your next visit, of how far it got, how long it took, which game files did not arrive, your browser and device type, the name of your device\'s graphics chip and the graphics setting the game used, and whether you were online. It is not linked to your account, and we delete it after 90 days.</li>';
 assert.ok(game.includes(item),'in the "Your game" list');assert.ok(game.indexOf('<li>Where and on what you last opened the game:')<game.indexOf(item),'after where and on what you last opened it');
 assert.equal(STALL_KEEP_DAYS,90,'as the policy says');
 const kept=policy.slice(policy.indexOf('<h2 id="retention">'),policy.indexOf('<h2 id="your-rights">'));
 assert.ok(kept.includes('<li><strong>Reports of a game that did not finish loading</strong>: 90 days, then they are deleted. They are not linked to your account.</li>'),'and in How long we keep data');
 const storage=policy.slice(policy.indexOf('<h2 id="cookies">'),policy.indexOf('<h3>Analytics and advertising</h3>'));
 assert.match(storage,/<tr><td data-label="Name"><code>harvest-tycoon:load-stall<\/code><\/td><td data-label="What it does">Session storage: [^<]*/);
 assert.ok(storage.includes(`<code>${LOAD_STALL_KEY}</code>`));assert.match(policy,/Last updated: (1[5-9]|2\d|3[01]) October 2026/,'15 Oct 2026 or a later update');
 // 21 Oct 2026 (public/graphics-mode.js): the two graphics keys on the device are listed too.
 for(const key of ['harvest-tycoon:graphics-choice','harvest-tycoon:graphics-run'])assert.match(storage,new RegExp(`<tr><td data-label="Name"><code>${key}</code></td><td data-label="What it does">Local storage: `),key);assert.doesNotMatch(policy,/ · /);
});
// 15 Oct 2026, review fix: both store apps load this site, so from the site's release they send the report too, with no app update. The
// owner's steps for their privacy answers (Play's Data safety, the App Store's App Privacy) are written down with the others.
test('the store apps send the report too: their privacy answers are in the owner\'s notes, before the release',()=>{
 const setup=read('NOTIFICATIONS-SETUP.md'),notes=setup.slice(setup.indexOf('### Google Play: Data safety'));
 assert.match(notes,/\nLaadverslag \(15 okt 2026[^\n]*`supabase\/load-stalls\.sql`/);assert.match(notes,/zonder app-update/);
 assert.match(notes,/Play Console, Data safety → \*App info and performance\* → \*Diagnostics\*, verzameld voor\s+\*App functionality\* en \*Analytics\*, niet gedeeld/);
 assert.match(notes,/App Store Connect \(de iPhone-app\), App Privacy → \*Diagnostics\* →\s+\*Performance Data\*, \*Not linked to the user\*, niet voor tracking/);
 assert.match(read('supabase/load-stalls.sql'),/the store apps' privacy answers \(they load the site: NOTIFICATIONS-SETUP\.md, Laadverslag\)/);
});
