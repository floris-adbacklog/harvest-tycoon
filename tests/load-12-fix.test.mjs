// The 12% report, once more (18 Oct 2026, the owner picked 1, 2 and 3): live, nearly every stall at 12% had every file in and step
// 'code' (public/game.js never ran), and none said why. 1: the stall note now says how far src/game-cloud.js came and the first thing
// that broke there; 2: the game's code is asked for before the farm page's own parts, so one of them that breaks no longer keeps the
// farm away; 3: with every file in and no game for 8 seconds in view, the farm opens again then instead of after 30.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {errorLine,STARTUP_STAGES,CODE_STALL_MS,LOAD_STALL_MS,watchLoading,LOAD_STALL_KEY,LOAD_RETRY_KEY} from '../public/loading-screen.js';
import {stallRow,stallError,STALL_STAGES,STALL_KINDS} from '../supabase/functions/farm-api/load-stall-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the first thing that broke: one short line with its name, message and file, never an address with its ?v= or another site',()=>{
 const e=new TypeError("Cannot read properties of undefined (reading 'open')");e.stack="TypeError: x\n    at createChatUI (https://www.harvesttycoon.com/cloud/game-cloud-abc.js?v=9:12:34)";
 assert.equal(errorLine(e),"TypeError: Cannot read properties of undefined (reading 'open') @ /cloud/game-cloud-abc.js:12");
 assert.equal(errorLine(undefined,{message:'Script error.',filename:'https://www.harvesttycoon.com/game.js?v=3ada',lineno:1709}),'Error: Script error. @ /game.js:1709');
 assert.equal(errorLine('nope'),'Rejected: nope');
 const web=new Error('see https://example.com/a?b=c here');web.stack='';assert.equal(errorLine(web),'Error: see /a here');
 assert.equal(errorLine(new Error('x'.repeat(400))).length,160);
 assert.deepEqual([...STARTUP_STAGES],[...STALL_STAGES],'the page and farm-api know the same stages');
});

test('farm-api keeps the stage and the error line, one line, at most 160 characters, no e-mail address; anything else is left out',()=>{
 const now=Date.UTC(2026,9,18,12),note={kind:'auto',step:'code',at:now-1000,stage:'parts',error:'TypeError: boom for jan@example.com\nnext'};
 const row=stallRow(note,{now});assert.equal(row.stage,'parts');assert.equal(row.error,'TypeError: boom for [email] next');
 assert.equal(stallRow({...note,stage:'elsewhere',error:42},{now}).stage,null);assert.equal(stallRow({...note,error:42},{now}).error,null);
 assert.equal(stallError('y'.repeat(500)).length,160);assert.equal(stallError('   '),null);
 const sql=read('supabase/load-stalls-stage.sql');
 assert.match(sql,/add column if not exists stage text check \(stage in \('begin','watch','parts','game','farm','ready'\)\)/);assert.match(sql,/add column if not exists error text check \(char_length\(error\) <= 160\)/);
});

test('the game is asked for before the farm page\'s own parts, and the start says how far it came',()=>{
 const cloud=read('src/game-cloud.js');
 const ask=cloud.indexOf("const gameLoad=import(/* @vite-ignore */ '/game.js?v=familyhall-model-2');gameLoad.catch(()=>{});");
 assert.ok(ask>0&&ask<cloud.indexOf('const ui=part(()=>createCloudUI(')&&ask>cloud.indexOf('const watch=watchLoading('),'after the watch, before the parts');
 assert.equal(cloud.split("import(/* @vite-ignore */ '/game.js").length,2,'asked for once');
 for(const stage of ["startup.stage='watch'","startup.stage='parts'","startup.stage='game'","startup.stage='farm'","if(ready)startup.stage='ready'"])assert.ok(cloud.includes(stage),stage);
 assert.match(cloud,/window\.addEventListener\('error',event=>firstError\(event\?\.error\?\?event\?\.message,event\)\);\nwindow\.addEventListener\('unhandledrejection',event=>firstError\(event\?\.reason\)\);/);
});

// A farm page in view: every second the watch looks; the bar stays at 12% and public/game.js never runs.
function page({files=true,readable=true}={}){
 const store=new Map(),reloads=[];let tick=null,clock=1_000_000;
 const asked=[{getAttribute:()=>'/game.js?v=1'},{getAttribute:()=>'/styles.css?v=1'}];
 const doc={hidden:false,baseURI:'https://www.harvesttycoon.com/farm.html',getElementById:id=>id==='load-progress'?{value:12}:null,querySelector:()=>null,querySelectorAll:()=>{if(!readable)throw new Error('x');return asked;}};
 const win={location:{href:doc.baseURI},parent:{location:{reload:()=>reloads.push('page')}},navigator:{onLine:true},setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;},setTimeout:(fn,ms)=>{if(ms===400)fn();return 1;},
  performance:{getEntriesByType:type=>type==='resource'?(files?[{name:'https://www.harvesttycoon.com/game.js?v=1',responseStart:5},{name:'https://www.harvesttycoon.com/styles.css?v=1',responseStart:5}]:[{name:'https://www.harvesttycoon.com/styles.css?v=1',responseStart:5}]):[]},
  harvestStartup:{stage:'parts',error:'TypeError: boom @ /cloud/game-cloud.js:12'},on:{},addEventListener(type,fn){this.on[type]=fn;}};
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const watch=watchLoading({trackGame(){}},null,{doc,win,storage,now:()=>clock});
 return {reloads,watch,win,store,pass:s=>{for(let i=0;i<s;i++){clock+=1000;tick?.();}},note:()=>JSON.parse(store.get(LOAD_STALL_KEY)??'null'),leave:()=>win.on.pagehide?.({})};
}
test('every file in and no game for 8 seconds in view: opened again then, with where the start stopped and why',()=>{
 assert.equal(CODE_STALL_MS,8000);
 const p=page();p.pass(CODE_STALL_MS/1000);assert.deepEqual(p.reloads,[],'not before 8 still seconds');p.pass(1);assert.deepEqual(p.reloads,['page']);
 const n=p.note();assert.equal(n.kind,'auto');assert.equal(n.step,'code');assert.equal(n.view,9);assert.equal(n.stage,'parts');assert.equal(n.error,'TypeError: boom @ /cloud/game-cloud.js:12');
});
test('a file still on its way, or a page that cannot be read, keeps the 30 seconds (a slow line is not a stopped start)',()=>{
 for(const options of [{files:false},{readable:false}]){
  const p=page(options);p.pass(20);assert.deepEqual(p.reloads,[],JSON.stringify(options));p.pass(LOAD_STALL_MS/1000);assert.deepEqual(p.reloads,['page'],JSON.stringify(options));
 }
});

// Review of 18 Oct 2026: a part of the farm page that breaks no longer stops the rest of the page. Before, the farm still opened (game.js
// was already asked for) but the watch never heard so: every refresh or village trip after it wrote a false 'left' or 'refresh' note at
// 100%, the error reached nobody, and the payment return, the pop-ups, CrazyGames' start and links from notifications never ran.
test('a part that breaks is noted and skipped: the rest of the page runs and the watch hears the farm opened',()=>{
 const cloud=read('src/game-cloud.js');
 assert.match(cloud,/const part=start=>\{try\{return start\(\);\}catch\(error\)\{brokenPart=true;firstError\(error\);/);
 const from=cloud.indexOf("startup.stage='parts';"),to=cloud.indexOf("startup.stage='game';"),parts=cloud.slice(from,to);
 for(const call of ['createCloudUI(','createPlayerProfiles(','createChatUI(','createAdminDashboard(','startAdminView(','createPortalUI(','createDiscordSwitch(','createSignInLine(','createAccountDelete(','createDiscordUnlink(','createAvatarSettings(','bridge.presence?.subscribe('])
  assert.match(parts,new RegExp(`part\\(\\(\\)=>(\\{[^\\n]*)?${call.replace(/[.?()]/g,'\\$&')}`),call);
 assert.ok(!/\bui\.(open|setProfile|showBoard)\b/.test(parts.replace(/if\(ui\)part\(\(\)=>\{ui\.setProfile[^\n]*/,'')),'ui may be missing: ui?.');
 assert.match(cloud,/if\(!game\)watch\.failed\(\);else watch\.done\(ready,\{brokenPart,failure:ready\?null:game\.farmFailure\?\?null\}\);/);
 assert.match(cloud,/if\(ui\)setTimeout\(\(\)=>\{const category=ui\.category;/);assert.match(cloud,/void chat\?\.open\(intent\.channel/);
});
test('the farm opened with a broken part: one note of kind part with the stage and the error, never a later left',()=>{
 const p=page();p.store.set(LOAD_RETRY_KEY,'1');p.win.harvestStartup={stage:'ready',error:'TypeError: boom @ /cloud/chat-ui.js:12'};
 p.watch.done(true,{brokenPart:true});
 const n=p.note();assert.equal(n.kind,'part');assert.equal(n.stage,'ready');assert.equal(n.error,'TypeError: boom @ /cloud/chat-ui.js:12');
 assert.equal(p.store.has(LOAD_RETRY_KEY),false,'the retry is over');
 p.store.delete(LOAD_STALL_KEY);p.leave();p.pass(60);assert.equal(p.note(),null,'the watch is over: no left, no reload');assert.deepEqual(p.reloads,[]);
 const q=page();q.watch.done(true);assert.equal(q.note(),null,'nothing broke: no note');q.leave();assert.equal(q.note(),null);
 assert.ok(STALL_KINDS.includes('part'));const now=Date.UTC(2026,9,18,12);assert.equal(stallRow({kind:'part',step:'scene',at:now-1000,stage:'ready',error:'x'},{now}).kind,'part');
 const sql=read('supabase/load-stalls-stage.sql');
 assert.match(sql,/drop constraint if exists load_stalls_kind_check;\nalter table public\.load_stalls add constraint load_stalls_kind_check check \(kind in \('auto','card','reload_hung','left','refresh','part'\)\);/);
});
test('160 characters as Postgres counts them: an emoji is never cut in half, and a lone half is taken out',()=>{
 const lone=/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
 const e=new Error('x'.repeat(152)+'\u{1F600}'+'y'.repeat(40));e.stack='';
 const line=errorLine(e);assert.equal(lone.test(line),false);assert.equal(Array.from(line).length,160);assert.ok(line.includes('\u{1F600}'));
 const kept=stallError('z'.repeat(159)+'\u{1F600}'+'z');assert.equal(lone.test(kept),false);assert.equal(Array.from(kept).length,160);
 assert.equal(stallError('a\uD83Db\uDE00c'),'abc');assert.equal(lone.test(stallError('\uD83D'.repeat(300))??''),false);
});
