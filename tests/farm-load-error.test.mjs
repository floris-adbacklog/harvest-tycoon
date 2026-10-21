import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createFarmRenderer,startErrorText,androidPhoneApp,webgl2Available,SAFE_CONTEXT,START_TEXTS,WEBGL_FAILED} from '../public/farm-start.js';
import {watchLoading,startFailure,errorLine,LOAD_STALL_KEY,LOAD_FAILED_KEY,START_FAILURES} from '../public/loading-screen.js';
import {stallRow} from '../supabase/functions/farm-api/load-stall-service.js';
import {describeFailure,connectionMessage,safeToRepeat,withRetry} from '../src/connection.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 21 Oct 2026: a player in the Android app saw "This game needs WebGL 2" the day after playing in a browser. public/game.js init ran its UI
// code before it made the renderer, so any fault there showed the WebGL text, and nothing of it was ever reported. Now the renderer is made
// on its own with a safer second try, the WebGL text shows only when WebGL 2 is really missing (the Android app says how to fix it), any
// other fault is "Your saved farm could not load", and both are noted for the next farm load.

// A canvas that gives a WebGL 2 context or not, and hears the browser's reason as a real one does (webglcontextcreationerror).
function canvases({plain=false,reason=''}={}){
 const made=[];
 const makeCanvas=()=>{const on={};const c={on,removed:[],addEventListener:(t,fn)=>{on[t]=fn;},removeEventListener:(t)=>{c.removed.push(t);},
  getContext:kind=>{if(kind==='webgl2'&&plain)return {getExtension:()=>({loseContext:()=>{c.lost=true;}})};if(reason)on.webglcontextcreationerror?.({statusMessage:reason});return null;}};made.push(c);return c;};
 return {made,makeCanvas};
}
const BASE={antialias:true,alpha:false,powerPreference:'high-performance'};
const quiet=()=>{};

test('the 3D view: the first try as before; a refused one is tried once more with the safe options, each on a canvas of its own',()=>{
 const {made,makeCanvas}=canvases(),calls=[];
 const first=createFarmRenderer(options=>{calls.push(options);return {ok:1};},BASE,{makeCanvas,warn:quiet});
 assert.deepEqual(first,{renderer:{ok:1},retried:false});assert.deepEqual(calls,[{...BASE,canvas:made[0]}],'the options of before');
 const tries=[];
 const second=createFarmRenderer(options=>{tries.push(options);if(options.antialias||options.powerPreference!=='default')throw new Error('Error creating WebGL context with your selected attributes.');return {ok:2};},BASE,{makeCanvas,warn:quiet});
 assert.deepEqual(second,{renderer:{ok:2},retried:true});
 assert.deepEqual(tries[1],{...BASE,...SAFE_CONTEXT,canvas:tries[1].canvas});assert.notEqual(tries[0].canvas,tries[1].canvas,'a new canvas');
 assert.deepEqual(SAFE_CONTEXT,{antialias:false,powerPreference:'default',failIfMajorPerformanceCaveat:false});
 assert.ok(made.every(c=>c.removed.includes('webglcontextcreationerror')),'the listener goes again');
});
test('"needs WebGL 2" only when both tries fail and not even a plain WebGL 2 context can be made, with the browser\'s reason',()=>{
 const none=canvases({reason:'GPU process unavailable'});
 const fail=options=>{options.canvas.getContext('webgl2',options);throw new Error('Error creating WebGL context.');};
 assert.throws(()=>createFarmRenderer(fail,BASE,{makeCanvas:none.makeCanvas,warn:quiet}),error=>error.name===WEBGL_FAILED&&error.webgl===true&&error.message==='Error creating WebGL context. (GPU process unavailable)');
 // A browser that does make a WebGL 2 context: the renderer's own fault, never "needs WebGL 2".
 const has=canvases({plain:true}),bug=new TypeError('Cannot read properties of null (reading \'precision\')');
 assert.throws(()=>createFarmRenderer(()=>{throw bug;},BASE,{makeCanvas:has.makeCanvas,warn:quiet}),error=>error===bug);
 assert.equal(has.made.at(-1).lost,true,'the probe\'s context is let go at once');
 assert.equal(webgl2Available(has.makeCanvas),true);assert.equal(webgl2Available(none.makeCanvas),false);assert.equal(webgl2Available(()=>{throw new Error('x');}),false);
});
test('the error card says what it was: WebGL 2 (the Android app\'s own help), a message for players, or "Your saved farm could not load"',()=>{
 const webgl=Object.assign(new Error('Error creating WebGL context.'),{name:WEBGL_FAILED});
 assert.equal(startErrorText(webgl),'This game needs WebGL 2. Try a current browser with hardware acceleration enabled.');
 assert.equal(startErrorText(webgl,{androidApp:true}),'This phone could not start the 3D farm. Update Android System WebView and Chrome in the Play Store, or play in your browser at harvesttycoon.com.');
 for(const fault of [new TypeError('Cannot set properties of null (setting \'textContent\')'),new ReferenceError('x is not defined'),new RangeError('Invalid array length'),new Error(''),null,undefined,{}])
  assert.equal(startErrorText(fault,{androidApp:true}),'Your saved farm could not load. Please try again.',String(fault?.name));
 assert.equal(startErrorText(new Error('The village could not load.')),'The village could not load.','a message written for players, as before');
 for(const text of Object.values(START_TEXTS))assert.doesNotMatch(text,/ · /);
});
test('the Android app is the page or the page around this frame marked data-app="android", never the iPhone app or a browser',()=>{
 const html=(app,os)=>({getAttribute:name=>name==='data-app'?app??null:name==='data-app-os'?os??null:null});
 const win=(app,os,parent)=>{const w={document:{documentElement:html(app,os)}};w.parent=parent??w;return w;};
 assert.equal(androidPhoneApp(win('android')),true);assert.equal(androidPhoneApp(win('android','ios')),false);assert.equal(androidPhoneApp(win()),false);
 assert.equal(androidPhoneApp(win(null,null,win('android'))),true,'the game frame follows the page around it');
 assert.equal(androidPhoneApp(win(null,null,win('android','ios'))),false);
 const blocked={document:{documentElement:html()},get parent(){throw new Error('cross-origin');}};assert.equal(androidPhoneApp(blocked),false);
});

test('the note\'s error says which: [webgl] or [init], then the error\'s first line, cut at 160 as before',()=>{
 const webgl=Object.assign(new Error('Error creating WebGL context. (GPU process unavailable)'),{name:WEBGL_FAILED,webgl:true,stack:'Error: Error creating WebGL context.\n    at new WebGLRenderer (https://www.harvesttycoon.com/vendor/three.module.js?v=1:15217:13)'});
 assert.equal(startFailure(webgl),'[webgl] WebGL2Unavailable: Error creating WebGL context. (GPU process unavailable) @ /vendor/three.module.js:15217');
 const bug=new TypeError('Cannot set properties of null (setting \'textContent\')');bug.stack=`TypeError: x\n    at updateUI (https://www.harvesttycoon.com/game.js?v=familyhall-model-2:1189:29)`;
 assert.equal(startFailure(bug),'[init] TypeError: Cannot set properties of null (setting \'textContent\') @ /game.js:1189');
 assert.equal(startFailure(Object.assign(new Error('a'.repeat(400)),{stack:''})).length,160);
 assert.equal(startFailure(null),`[init] ${errorLine(null)??'Error'}`);
 assert.deepEqual(START_FAILURES,['webgl','init']);
});

// The farm page's watch, as tests/load-stall.test.mjs sets it up, with a tab and a device store.
const memory=()=>{const store=new Map();return {store,api:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};};
function farmPage(){
 const tab=memory(),device=memory();let clock=2_000_000_000;
 const doc={baseURI:'https://www.harvesttycoon.com/farm.html',hidden:false,querySelectorAll:()=>[],getElementById:id=>id==='load-progress'?{value:40}:id==='error'?{hidden:true,style:{}}:null,querySelector:()=>null};
 const win={navigator:{onLine:true},performance:{getEntriesByType:()=>[],timeOrigin:1},addEventListener:()=>{},setInterval:()=>7,clearInterval:()=>{},setTimeout:()=>{},parent:{location:{reload:()=>{}}},
  harvestLoading:{models:0,of:141,account:false,finished:false},harvestStartup:{stage:'farm',error:'Error: an earlier one @ /cloud/chat-ui.js:3'}};
 const watch=watchLoading({},null,{doc,win,storage:tab.api,device:device.api,now:()=>clock});
 return {watch,tab:tab.store,device:device.store,win};
}
test('a farm that showed its own error card leaves a "card" note with that failure, in the tab and on the device',()=>{
 const p=farmPage();p.watch.done(false,{failure:'[webgl] WebGL2Unavailable: Error creating WebGL context.'});
 const note=JSON.parse(p.tab.get(LOAD_STALL_KEY));
 assert.equal(note.kind,'card');assert.equal(note.step,'models');assert.equal(note.stage,'farm');assert.equal(note.error,'[webgl] WebGL2Unavailable: Error creating WebGL context.','its own failure, not the page\'s first error');
 assert.deepEqual(JSON.parse(p.device.get(LOAD_FAILED_KEY)),note,'the same note, id and all');
 // farm-api takes it as it is: kind, step and stage within the table's checks (no SQL or farm-api change).
 const row=stallRow(note,{platform:'app',agent:'Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/155.0.0.0 Mobile Safari/537.36 HarvestTycoonApp/1.3 PlayBilling/1',now:note.at});
 assert.equal(row.kind,'card');assert.equal(row.stage,'farm');assert.equal(row.platform,'android_app');assert.equal(row.error,note.error);
 // Nothing else changes: a farm that opened, or a start that failed without its card, writes no such note.
 const opened=farmPage();opened.watch.done(true,{failure:'[init] x'});assert.equal(opened.tab.has(LOAD_STALL_KEY),false);assert.equal(opened.device.has(LOAD_FAILED_KEY),false);
 const plain=farmPage();plain.watch.done(false);assert.equal(plain.tab.has(LOAD_STALL_KEY),false);
 const once=farmPage();once.watch.done(false,{failure:'[init] a'});once.watch.done(false,{failure:'[init] b'});assert.equal(JSON.parse(once.tab.get(LOAD_STALL_KEY)).error,'[init] a','once');
});

// The next farm load (src/supabase.js takeStall), run as it is with a pretend tab, device and server.
function nextLoad({tab,device}){
 const clock=2_000_000_000,bodies=[],session=new Map(tab?[[LOAD_STALL_KEY,JSON.stringify(tab)]]:[]),local=new Map(device?[[LOAD_FAILED_KEY,typeof device==='string'?device:JSON.stringify(device)]]:[]);
 const api=store=>({getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)});
 const client={functions:{invoke:async(name,{body})=>{bodies.push(body);return {data:{ok:true},error:null};}}};
 const source=read('src/supabase.js').replace(/^import .*;\n/gm,'').replace(/^export /gm,'').replace('import.meta.env.VITE_SUPABASE_URL','"https://x.supabase.co"').replace('import.meta.env.VITE_SUPABASE_ANON_KEY','"anon"');
 const context=vm.createContext({createClient:()=>client,describeFailure,connectionMessage,safeToRepeat,withRetry,enabledProviders:async()=>[],chosenLanguage:()=>'en',LOAD_STALL_KEY,LOAD_FAILED_KEY,
  sessionStorage:api(session),localStorage:api(local),performance:{getEntriesByType:()=>[{type:'navigate'}]},navigator:{onLine:true},Intl,Date:{now:()=>clock},Promise,Error,Object,Boolean,Number,String,JSON,Array,setTimeout,clearTimeout});
 const {farmRequest}=vm.runInContext(`${source}\n;({farmRequest})`,context);
 return {load:async()=>{await farmRequest({operation:'load'});return bodies.at(-1);},session,local};
}
const CARD={id:'5f0c6c1e-8a43-4d5b-9b1a-2f3e4d5c6b7a',kind:'card',step:'models',percent:4,models:0,view:3,total:3,hidden:false,online:true,protocol:'h2',waiting:0,files:[],stage:'farm',error:'[webgl] WebGL2Unavailable: Error creating WebGL context.',at:2_000_000_000-60000};
test('the next load brings the failure kept on the device when the tab has none (an app closed on the card), once',async()=>{
 const app=nextLoad({device:{...CARD,at:2_000_000_000-19*3600000}});
 assert.deepEqual((await app.load()).loadStall,{...CARD,at:2_000_000_000-19*3600000});assert.equal(app.local.has(LOAD_FAILED_KEY),false);assert.equal('loadStall' in await app.load(),false,'once');
 // Try again in the same tab: the tab's note goes, and the device's copy of it (one id) is cleared with it.
 const same=nextLoad({tab:CARD,device:CARD});assert.deepEqual((await same.load()).loadStall,CARD);assert.equal(same.local.has(LOAD_FAILED_KEY),false);
 // Another note in the tab goes first; the device's failure waits for the load after.
 const other={...CARD,id:'0b6f2a1c-3d4e-4f5a-8b6c-7d8e9f0a1b2c',kind:'left'},both=nextLoad({tab:other,device:CARD});
 assert.equal((await both.load()).loadStall.id,other.id);assert.equal(both.local.has(LOAD_FAILED_KEY),true);assert.deepEqual((await both.load()).loadStall,CARD);
 // Too old for farm-api (20 hours at most here) or unreadable: dropped.
 for(const device of [{...CARD,at:2_000_000_000-21*3600000},'{"kind":',JSON.stringify([CARD])]){const old=nextLoad({device});assert.equal('loadStall' in await old.load(),false);assert.equal(old.local.has(LOAD_FAILED_KEY),false);}
});

test('public/game.js makes the renderer on its own, after its UI, and its error card says what broke',()=>{
 const game=read('public/game.js'),init=game.slice(game.indexOf('async function init(){'),game.indexOf('export const farmReady=init();'));
 assert.match(game,/import \{createFarmRenderer,startErrorText,androidPhoneApp\} from '\.\/farm-start\.js';/);
 assert.ok(init.indexOf('bindUI();updateUI();')<init.indexOf('renderer=createFarmRenderer('),'the UI first, as before');
 assert.match(init,/renderer=createFarmRenderer\(options=>new THREE\.WebGLRenderer\(options\),\{antialias:!mobileLayout\.matches,alpha:false,powerPreference:mobileLayout\.matches\?'low-power':'high-performance'\}\)\.renderer;/);
 assert.doesNotMatch(game,/new THREE\.WebGLRenderer\(\{/,'no renderer made around it');
 assert.doesNotMatch(init,/if\(!renderer\)\$\('error-message'\)/,'never "needs WebGL 2" for a missing renderer alone');
 assert.match(init,/farmFailure=startFailure\(error\);\n  try\{\$\('error-message'\)\.textContent=startErrorText\(error,\{androidApp:androidPhoneApp\(window\)\}\);\}catch\{\}/);
 assert.match(game,/export let farmFailure=null;\n[^]*export const farmReady=init\(\);/,'declared before init runs');
 assert.match(read('src/game-cloud.js'),/watch\.done\(ready,\{brokenPart,failure:ready\?null:game\.farmFailure\?\?null\}\)/);
});
test('the Android app\'s text is in every language, without a middle dot, and the WebGL text keeps its translations',()=>{
 const codes=['nl','de','es','fr','pt','id','tr','cs','hu','ru','uk','hi','ja','ar','zh'];
 for(const code of codes){const t=JSON.parse(read(`public/i18n/${code}.json`));
  const app=t[START_TEXTS.androidApp];assert.ok(app,code);assert.doesNotMatch(app,/ · /,code);assert.match(app,/harvesttycoon\.com/,code);assert.match(app,/Android System WebView/,code);
  for(const text of [START_TEXTS.webgl,START_TEXTS.init,'Your farm could not load'])assert.ok(t[text],`${code}: ${text}`);}
 assert.ok(read('public/privacy.html').includes(`<code>${LOAD_FAILED_KEY}</code>`),'the device copy is in the privacy policy\'s storage list');
});
