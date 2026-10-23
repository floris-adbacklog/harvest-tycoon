// Older browsers and the loads that never started (23 Oct 2026, the loading reports): public/compat.js adds what an older browser lacks,
// keeps the first thing that broke before the game's own watch, and shows a browser without import maps why the farm cannot open;
// the stall note takes that first error (public/loading-screen.js), src/game-cloud.js stops there, and each chat gets its own channel.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {noteOnDevice} from '../public/loading-screen.js';
import {createChatClient} from '../src/chat-client.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const compat=read('public/compat.js');

// A page for compat.js: the window's listeners, a few elements by id, a browser of choice.
function page({agent='Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/96.0.4664.104 Mobile Safari/537.36',importmaps=true,old=false,ids={},app=null,dict=null,own={}}={}){
 const listeners={},docListeners={},attrs={...(app?{'data-app':app}:{})};
 const el=(extra={})=>({hidden:true,textContent:'',...extra});
 const card=el({h2:el({textContent:'Your farm could not load'}),button:el({hidden:false})});card.querySelector=sel=>sel==='h2'?card.h2:sel==='button'?card.button:null;
 const elements={error:card,'error-message':el({textContent:'Check your connection and try again.'}),'load-progress':el(),loading:el({hidden:false}),...ids};
 const document={readyState:'loading',body:{hidden:true},documentElement:{getAttribute:name=>attrs[name]??null},getElementById:id=>elements[id]??null,addEventListener:(type,fn)=>{docListeners[type]=fn;}};
 const window={navigator:{userAgent:agent},addEventListener:(type,fn,capture)=>{(listeners[type]??=[]).push({fn,capture});},crypto:{getRandomValues:a=>{for(let i=0;i<a.length;i++)a[i]=(i*37+11)&255;return a;}},
  ...(dict?{harvestI18n:{load:Promise.resolve(dict)}}:{}),...own};
 window.parent=window;
 // The page's own built-ins (its own Array, Object, Map …), so taking one away here never touches this test's own.
 const context=vm.createContext({window,document,HTMLScriptElement:importmaps?{supports:type=>type==='importmap'}:{}});
 if(old)vm.runInContext('delete Array.prototype.at;delete String.prototype.at;delete Object.hasOwn;',context);
 vm.runInContext(compat,context);
 return {context,window,document,elements,card,listeners,ready:()=>docListeners.DOMContentLoaded?.()};
}

test('what an older browser lacks is added, and only there: .at, Object.hasOwn, crypto.randomUUID, structuredClone',()=>{
 const {context,window}=page({old:true});
 assert.deepEqual(Array.from(vm.runInContext('[[1,2,3].at(-1),[1,2,3].at(0),[1,2,3].at(5),"abc".at(-1),Object.hasOwn({a:1},"a"),Object.hasOwn({a:1},"toString")]',context)),[3,1,undefined,'c',true,false]);
 assert.match(window.crypto.randomUUID(),/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 // Copied in the page itself, with its own Date, Map, Set and typed arrays.
 const check=vm.runInContext(`(()=>{const farm={coins:5,plots:[{id:0,crop:'wheat'}],at:new Date(0),seen:new Map([['a',{n:1}]]),tags:new Set(['x']),bytes:new Uint8Array([1,2])};
  const c=window.structuredClone(farm),ring={};ring.self=ring;const r=window.structuredClone(ring);
  return [c.coins,c.plots[0].crop,c.plots!==farm.plots,c.at instanceof Date&&c.at.getTime()===0,c.seen instanceof Map&&c.seen.get('a').n===1&&c.seen.get('a')!==farm.seen.get('a'),c.tags.has('x'),c.bytes instanceof Uint8Array&&c.bytes[1]===2&&c.bytes!==farm.bytes,r.self===r&&r!==ring].join(',');})()`,context);
 assert.equal(check,'5,wheat,true,true,true,true,true,true','a deep copy: other objects, the same values; a loop stays a loop');
 // A current browser keeps its own.
 const mine=v=>v,current=page({own:{structuredClone:mine}}),at=vm.runInContext('Array.prototype.at',current.context);
 assert.equal(at.toString().includes('[native code]'),true);assert.equal(current.window.structuredClone,mine,'a browser that has one keeps it');
});

test('the first thing that breaks, with the browser: a script that did not load, an error, a refused promise; pictures do not count',()=>{
 const {window,listeners}=page();
 assert.equal(window.harvestBoot.browser,'Chrome 96');assert.equal(window.harvestBoot.tooOld,false);
 const [error]=listeners.error;assert.equal(error.capture,true,'in the capture phase: a file that did not load only says so on its element');
 error.fn({target:{tagName:'IMG',src:'https://www.harvesttycoon.com/assets/x.webp'}});assert.equal(window.harvestBoot.error,null,'a picture is no broken start');
 error.fn({target:{tagName:'SCRIPT',src:'https://www.harvesttycoon.com/game.js?v=1'}});assert.equal(window.harvestBoot.error,'load failed /game.js');
 error.fn({target:window,message:'TypeError: x is not a function',filename:'https://www.harvesttycoon.com/farm-client.js',lineno:28});assert.equal(window.harvestBoot.error,'load failed /game.js','only the first');
 const other=page({agent:'Mozilla/5.0 (Windows NT 10.0; rv:102.0) Gecko/20100101 Firefox/102.0'});
 other.listeners.error[0].fn({target:other.window,message:'TypeError: x is not a function',filename:'https://www.harvesttycoon.com/farm-client.js?v=2',lineno:28});
 assert.equal(other.window.harvestBoot.error,'TypeError: x is not a function @ /farm-client.js:28');assert.equal(other.window.harvestBoot.browser,'Firefox 102');
 const third=page({agent:'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/15.4 Mobile/15E148 Safari/604.1'});
 third.listeners.unhandledrejection[0].fn({reason:{name:'TypeError',message:'Failed to fetch dynamically imported module'}});
 assert.deepEqual([third.window.harvestBoot.error,third.window.harvestBoot.browser],['TypeError: Failed to fetch dynamically imported module','Safari 15']);
});

test('a farm page whose own code never ran says why in its stall note: the first thing that broke, with the browser',()=>{
 const store=new Map(),device={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const win={harvestBoot:{error:'load failed /game.js',browser:'Chrome 96'},navigator:{onLine:true}};
 const note=noteOnDevice({kind:'crash',step:'code',percent:12,win,device,now:Date.now()});
 assert.equal(note.error,'[boot] load failed /game.js (Chrome 96)');
 // The game's own start, when it ran, says first what broke there.
 store.clear();const ran=noteOnDevice({kind:'crash',step:'code',win:{...win,harvestStartup:{stage:'game',error:'TypeError: y'}},device,now:Date.now()});
 assert.deepEqual([ran.stage,ran.error],['game','TypeError: y']);
 store.clear();const quiet=noteOnDevice({kind:'crash',step:'code',win:{...win,harvestStartup:{stage:'game',error:null}},device,now:Date.now()});
 assert.equal(quiet.error,'[boot] load failed /game.js (Chrome 96)','its start broke nothing itself: what broke before it');
});

test('a browser without import maps: the farm page\'s own card says why, in the farmer\'s language, and the game does not start',async()=>{
 const english='This browser is too old for Harvest Tycoon. Update it, or play in a current Chrome, Edge, Firefox or Safari.';
 const old=page({importmaps:false,dict:{[english]:'Deze browser is te oud voor Harvest Tycoon. Werk hem bij, of speel in een recente Chrome, Edge, Firefox of Safari.','Your farm could not load':'Je boerderij kon niet laden'}});
 assert.equal(old.window.harvestBoot.tooOld,true);assert.equal(old.window.harvestBoot.error,'no import maps');
 old.ready();
 assert.equal(old.card.hidden,false);assert.equal(old.document.body.hidden,false,'the page around sees the farm page shown and stops waiting for it');
 assert.equal(old.elements.loading.hidden,true);assert.equal(old.card.button.hidden,true,'no Try again: it would only fail again');
 assert.equal(old.elements['error-message'].textContent,english);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(old.elements['error-message'].textContent,'Deze browser is te oud voor Harvest Tycoon. Werk hem bij, of speel in een recente Chrome, Edge, Firefox of Safari.');
 assert.equal(old.card.h2.textContent,'Je boerderij kon niet laden');
 // In our Android app: the app's own words (update Android System WebView).
 const app=page({importmaps:false,app:'android'});app.ready();
 assert.match(app.elements['error-message'].textContent,/^This phone could not start the 3D farm\. Update Android System WebView and Chrome/);
 // Not a farm page (no farm loading bar): nothing shows.
 const shell=page({importmaps:false,ids:{'load-progress':null}});shell.ready();assert.equal(shell.card.hidden,true);
 // A browser with import maps: nothing changes.
 const fine=page();fine.ready();assert.equal(fine.card.hidden,true);
 assert.match(read('src/game-cloud.js'),/if\(window\.harvestBoot\?\.tooOld\)\{window\.harvestBoot\.show\?\.\(\);throw new Error\('This browser has no import maps\.'\);\}/);
 assert.ok(read('src/game-cloud.js').indexOf('harvestBoot?.tooOld')<read('src/game-cloud.js').indexOf('watchLoading(bridge'),'before the farm page\'s own watch, which would open it again');
});

test('every game page runs compat.js before any module, and Tag Manager stays in play.html\'s first 1024 bytes',()=>{
 for(const file of ['public/play.html','public/farm.html','public/kongregate.html','public/crazygames.html','public/discord.html']){
  const html=read(file),at=html.indexOf('<script src="/compat.js"></script>');
  assert.ok(at>0,file);assert.equal(html.split('/compat.js"></script>').length-1,1,file);
  const module=html.search(/<script type="module"|<link rel="modulepreload"|<script type="importmap"/);
  assert.ok(module<0||at<module,`${file}: before the modules and the import map`);
 }
 assert.ok(read('public/play.html').indexOf('googletagmanager.com/gtm.js')<1024);
});

test('each chat its own channel: a renewed session never gets the last chat\'s channel back, still subscribed',()=>{
 const names=[],fake={channel:name=>{names.push(name);const ch={on:()=>ch,subscribe:()=>ch};return ch;},removeChannel:async()=>'ok'};
 const first=createChatClient(fake,{playerId:'p1'});first.subscribe(()=>{});first.subscribe(()=>{});
 first.dispose();const second=createChatClient(fake,{playerId:'p1'});second.subscribe(()=>{});
 assert.equal(names.length,2,'one channel per chat, made once');
 for(const name of names)assert.match(name,/^chat:p1:[a-z0-9]+$/);
 assert.notEqual(names[0],names[1]);
});
