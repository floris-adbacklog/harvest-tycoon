import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {keptView,keepView,warmOnPress,KEPT_KEY,KEPT_DAYS,KEPT_MAX} from '../public/kept-views.js';
import {createLoadingScreen} from '../public/loading-screen.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The game feels faster (6 Nov 2026, the owner: "doe alle", all six): own farm behind the loading screen, a bar that never stands still,
// windows with their last view after a new start, a read started on the press, diamond spends at once (tests/online-client.test.mjs),
// and windows that open in 130 ms.
const memory=()=>{const kept=new Map();return {getItem:k=>kept.has(k)?kept.get(k):null,setItem:(k,v)=>{kept.set(k,String(v));},removeItem:k=>{kept.delete(k);},kept};};

test('a window\'s last view is kept per farmer on this device, for a few days, and never when too large or storage is blocked',()=>{
 const storage=memory(),now=Date.UTC(2026,10,6,12);
 assert.equal(keepView('family','anna',{family:{id:'f1'}},{storage,now}),true);
 assert.deepEqual(keptView('family','anna',{storage,now:now+1000}),{family:{id:'f1'}});
 assert.equal(keptView('family','ben',{storage,now}),null,'another farmer on this device sees none of it');
 assert.equal(keptView('family','anna',{storage,now:now+KEPT_DAYS*86400000+1}),null,'too old');
 assert.equal(keptView('board:level','anna',{storage,now}),null,'each window its own');
 assert.equal(keepView('family','anna',{rows:'x'.repeat(KEPT_MAX)},{storage,now}),false,'too large is not kept');
 assert.equal(storage.kept.has(`${KEPT_KEY}family`),false,'and the older one goes, so it never shows a stale view');
 const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};
 assert.equal(keepView('family','anna',{a:1},{storage:blocked,now}),false);assert.equal(keptView('family','anna',{storage:blocked,now}),null);
 storage.setItem(`${KEPT_KEY}news`,'{broken');assert.equal(keptView('news','anna',{storage,now}),null);
});

test('a press on a window\'s button or its More-menu tile starts its read, at most once in a while',()=>{
 let listener=null;const doc={addEventListener:(type,fn)=>{assert.equal(type,'pointerdown');listener=fn;},removeEventListener(){}};
 let t=0,warmed=0;warmOnPress(['family-button'],()=>{warmed++;},{doc,gap:4000,now:()=>t});
 const press=el=>listener({target:{closest:()=>el}});
 press({id:'family-button',dataset:{}});assert.equal(warmed,1);
 press({id:'family-button',dataset:{}});assert.equal(warmed,1,'not again straight away');
 t=5000;press({id:'',dataset:{menuAction:'family-button'}});assert.equal(warmed,2,'the More menu\'s tile too');
 t=10000;press({id:'market-button',dataset:{}});press({id:'family-button',dataset:{},disabled:true});assert.equal(warmed,2);
 t=15000;assert.doesNotThrow(()=>warmOnPress(['x'],()=>{throw new Error('read failed');},{doc,now:()=>t}));assert.doesNotThrow(()=>press({id:'x',dataset:{}}));
});

test('the Leaderboard, the Farm Family and News keep their view on this device and read on the press',()=>{
 const cloud=read('src/game-cloud.js'),family=read('public/family-ui.js'),chat=read('src/chat-ui.js');
 assert.match(cloud,/keepView\(`board:\$\{result\.category\}`,bridge\.playerId,result\)/);assert.match(cloud,/cached=!quiet&&lastBoard\(category\)/);
 assert.match(cloud,/warmOnPress\(\['leaderboard-button'\]/);
 assert.match(family,/keepView\('family',me\(\),view\)/);assert.match(family,/warmOnPress\(\['family-button'\]/);
 assert.match(family,/\(kept\.family\?\.id\?\?null\)===\(state\.family\?\.familyId\?\?null\)/,'only the family this farm is in now');
 assert.match(chat,/keepView\('notices',me,notices\)/);assert.match(chat,/warmOnPress\(\['chat-button'\]/);
 assert.match(read('src/main.js'),/window\.harvestBridge=\{pending:true,ready,playerId\}/,'the farm page knows whose farm it opens before it arrives');
 assert.match(read('src/farm-session.js'),/win\.harvestBridge=\{pending:true,ready,playerId:user\.id\}/);
});

test('the bar that moves is only the look: the real progress and step stay for the watchdogs and the stall notes',()=>{
 const el=()=>{const attrs={};return {value:0,textContent:'',setAttribute:(k,v)=>{attrs[k]=v;},getAttribute:k=>attrs[k]??null,attrs};};
 const make=creep=>{const els={'load-progress':el(),'load-percent':el(),'load-text':el()};const doc={getElementById:id=>els[id],defaultView:{},documentElement:{hasAttribute:name=>creep&&name==='data-load-creep'}};return {doc,els};};
 const plain=make(false),ui=createLoadingScreen(plain.doc,4);ui.modelsReady(2);
 assert.equal(plain.els['load-percent'].textContent,`${plain.els['load-progress'].value}%`,'without the script, as before');
 assert.equal(plain.els['load-text'].textContent,'Loading your farm');
 const feel=make(true),ui2=createLoadingScreen(feel.doc,4);ui2.modelsReady(2);
 assert.equal(feel.els['load-progress'].value,plain.els['load-progress'].value,'the real value as before');
 assert.equal(feel.els['load-text'].attrs['data-step'],'Loading your farm');assert.equal(feel.els['load-text'].textContent,'','the line is the script\'s');
 assert.equal(feel.els['load-percent'].textContent,'');
 ui2.complete();assert.equal(feel.els['load-progress'].value,100);assert.equal(feel.els['load-text'].attrs['data-step'],'Ready!');
 const script=read('public/loading-feel.js');
 assert.doesNotMatch(script,/real\.value\s*=|\.value\s*=[^=]/,'never writes the real progress');
 assert.match(script,/Math\.min\(99,/,'never 100% before the farm is ready');
 const page=read('public/farm.html');
 assert.ok(page.indexOf('<script src="/loading-feel.js"></script>')>page.indexOf('id="load-progress"'),'runs right after the loading screen, before the game\'s code');
});

test('your own farm behind the loading screen: only your own home farm, small, kept now and then and when the page goes',()=>{
 const game=read('public/game.js'),script=read('public/loading-feel.js');
 assert.match(game,/if\(!keep\|\|!player\|\|!ready\|\|!renderer\|\|villageWorld\|\|visitView\|\|adminView\|\|visitLayer\|\|renderer\.getContext\(\)\.isContextLost\(\)\)return;/);
 assert.match(game,/renderer\.render\(scene,camera\);if\(lookDue\)keepFarmLook\(\);/,'copied right after a drawn frame');
 assert.match(game,/'image\/webp',\.62/);assert.match(game,/LOOK_WIDTH=480/);
 assert.match(script,/look\.player!==player/,'another farmer on this device sees the painting');
 assert.match(script,/homeFarm\(\)/);assert.match(script,/LOOK_DAYS=14/);
 const css=read('public/loading-screen.css');
 assert.match(css,/\.farm-loading \.farm-loading-look\{[^}]*filter:blur\(7px\)/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.farm-loading \.farm-loading-bar>i,\.farm-loading \.farm-loading-look\{transition:none\}/);
});

test('windows and pop-ups open in 130 ms, and not at all with reduced motion',()=>{
 assert.match(read('public/styles.css'),/\.game-dialog:open\{animation:appear \.13s ease-out\}/);
 assert.match(read('public/dialog-shell.css'),/dialog\.is-sheet\[open\],dialog\.is-card\[open\]\{animation:shell-in \.13s ease-out\}/);
 assert.match(read('public/chat.css'),/#chat-dialog\[open\]\{display:flex;animation:chat-in \.13s ease-out\}/);
 assert.match(read('public/retention.css'),/animation:center-notice-in \.13s ease-out\}/);
 assert.match(read('public/styles.css'),/prefers-reduced-motion:reduce\)\{\*\{animation:none!important;transition:none!important/);
});
