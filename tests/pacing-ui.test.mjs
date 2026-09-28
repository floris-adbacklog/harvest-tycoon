import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trackGame} from '../src/analytics.js';
import {createReminderNudge} from '../public/reminder-nudge.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('pacing events carry only numbers and fixed words',()=>{
 const win={innerWidth:390};
 trackGame('game_session',{level:3,returning:false,email:'a@b.nl',name:'Tony'},win);
 trackGame('level_up',{level:4},win);trackGame('guide_step',{step:'sell',index:1},win);trackGame('guide_complete',{},win);trackGame('reminder_prompt',{action:'accepted'},win);
 assert.deepEqual(win.dataLayer,[{event:'game_session',device:'mobile',level:3,returning:false},{event:'level_up',device:'mobile',level:4},{event:'guide_step',device:'mobile',step:'sell',index:1},{event:'guide_complete',device:'mobile'},{event:'reminder_prompt',device:'mobile',action:'accepted'}]);
 const bad={};trackGame('made_up_event',{level:1},bad);trackGame('level_up',{level:'9',index:12,step:'<script>',action:'sure'},bad);
 assert.deepEqual(bad.dataLayer,[{event:'level_up',device:'desktop'}],'unknown events are dropped and bad values are left out');
 assert.equal(trackGame('level_up',{level:9999},{}),undefined);
});

function harness({unconfirmed=false,canShow=()=>true,settleMs=0,clock,level=2,waitMinutes=30,kind='off',available=true,push=true,email=false,saveFails=false,stored=null,enable='on',prefs={pushCrops:false,pushProduction:false,pushDaily:true,emailDigest:false,digestHour:8}}={}){
 const log={events:[],toasts:[],saved:null,enabled:0,removed:0},storage={};if(stored)storage['harvest-tycoon:reminder-nudge']=stored;
 const buttons={later:{onclick:null,disabled:false},on:{onclick:null,disabled:false}};let card=null;
 globalThis.localStorage={getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=v;}};
 globalThis.document={createElement(){card={className:'',attrs:{},set innerHTML(v){this.html=v;},get innerHTML(){return this.html;},setAttribute(k,v){this.attrs[k]=v;},querySelector(sel){return sel==='[data-nudge-later]'?buttons.later:buttons.on;},remove(){log.removed++;card=null;}};return card;},body:{append(){}},querySelector:()=>card};
 const api={ready:Promise.resolve(),available,config:{push,email},push:push?{async status(){return {kind};},async enable(){log.enabled++;return {kind:enable};}}:null,async get(){return prefs;},async save(p){if(saveFails)throw new Error('offline');log.saved=p;}};
 globalThis.window={parent:{harvestBridge:{notifications:api}}};
 const now=Date.now(),state={plots:[{id:0,crop:'corn',readyAt:now+waitMinutes*60000}],buildings:{}};
 const nudge=createReminderNudge({state,farmNow:()=>now,level:()=>level,notify:m=>log.toasts.push(m),track:(e,p)=>log.events.push([e,p.action]),canShow,settleMs,emailUnconfirmed:()=>unconfirmed,confirmEmail:()=>{log.confirm=(log.confirm??0)+1;},...(clock?{clock}:{})});
 return {nudge,log,buttons,storage,shown:()=>card!==null,html:()=>card?.html??'',cleanup(){delete globalThis.localStorage;delete globalThis.document;delete globalThis.window;}};
}
test('the reminder question appears once, at the first real waiting moment',async()=>{
 const h=harness();await h.nudge.check();assert(h.shown());assert.deepEqual(h.log.events,[['reminder_prompt','shown']]);
 await h.nudge.check();assert.equal(h.log.events.length,1,'never twice');h.cleanup();
});
test('it stays quiet when it cannot help or when it is too early',async()=>{
 for(const opts of [{level:1},{waitMinutes:3},{kind:'on'},{kind:'blocked'},{kind:'install-first'},{kind:'unsupported'},{available:false},{push:false},{stored:'dismissed'},{stored:'answered'}]){
  const h=harness(opts);await h.nudge.check();assert.equal(h.shown(),false,JSON.stringify(opts));assert.equal(h.log.events.length,0);h.cleanup();
 }
 delete globalThis.window;globalThis.window={};const bare=createReminderNudge({state:{plots:[],buildings:{}},farmNow:()=>Date.now(),level:()=>5,notify(){}});await assert.doesNotReject(()=>bare.check());delete globalThis.window;
});
test('a production batch that will take a while also counts as waiting',async()=>{
 const h=harness({waitMinutes:1});const now=Date.now();
 const state={plots:[],buildings:{bakery:{job:{readyAt:now+40*60000}}}};
 const n=createReminderNudge({state,farmNow:()=>now,level:()=>3,notify(){},track:()=>{},settleMs:0});await n.check();assert.equal(h.shown(),true);h.cleanup();
});
test('Not now closes it for good',async()=>{
 const h=harness();await h.nudge.check();h.buttons.later.onclick();
 assert.equal(h.storage['harvest-tycoon:reminder-nudge'],'dismissed');assert.equal(h.shown(),false);assert.deepEqual(h.log.events.at(-1),['reminder_prompt','dismissed']);
 const again=createReminderNudge({state:{plots:[{crop:'corn',readyAt:Date.now()+3600000}],buildings:{}},farmNow:()=>Date.now(),level:()=>5,notify(){},settleMs:0});await again.check();assert.equal(h.shown(),false,'not even in a later session');h.cleanup();
});
test('Turn on asks the browser and switches on crop and production reminders, keeping the other choices',async()=>{
 const h=harness();await h.nudge.check();await h.buttons.on.onclick();
 assert.equal(h.log.enabled,1);assert.deepEqual(h.log.saved,{pushCrops:true,pushProduction:true,pushDaily:true,emailDigest:false,digestHour:8});
 assert.match(h.log.toasts[0],/Reminders are on/);assert.deepEqual(h.log.events.at(-1),['reminder_prompt','accepted']);assert.equal(h.storage['harvest-tycoon:reminder-nudge'],'answered');assert.equal(h.shown(),false);h.cleanup();
});
test('if the browser says no, nothing is saved and the player is told why',async()=>{
 const denied=harness({enable:'blocked'});await denied.nudge.check();await denied.buttons.on.onclick();
 assert.equal(denied.log.saved,null);assert.match(denied.log.toasts[0],/blocked/);assert.deepEqual(denied.log.events.at(-1),['reminder_prompt','failed']);denied.cleanup();
});
test('the game wires pacing measurements, the reminder question and the next-unlock hint',()=>{
 const game=read('public/game.js');
 assert.match(game,/track\('game_session'/);assert.match(game,/if\(change\.leveled\)track\('level_up'/);assert.match(game,/nudge\?\.check\(\)/);assert.match(game,/Level \$\{lvl\+1\} unlocks:/);
 assert.match(read('public/farm-client.js'),/trackGame\?\.\('guide_step'/);assert.match(read('src/main.js'),/bridge\.trackGame=/);
});
test('the reminder question never appears over the loading screen or another dialog',async()=>{
 let loading=true,dialogOpen=false;let time=1_000_000;
 const h=harness({canShow:()=>!loading&&!dialogOpen,settleMs:15000,clock:()=>time});
 await h.nudge.check();assert.equal(h.shown(),false,'the farm is still loading');
 time+=60000;await h.nudge.check();assert.equal(h.shown(),false,'still loading, however long it takes');
 loading=false;time+=1000;await h.nudge.check();assert.equal(h.shown(),false,'the farm has only just appeared: wait for a quiet moment');
 dialogOpen=true;time+=20000;await h.nudge.check();assert.equal(h.shown(),false,'not on top of another dialog');
 dialogOpen=false;time+=1000;await h.nudge.check();assert.equal(h.shown(),false,'the quiet moment starts again after a dialog');
 time+=16000;await h.nudge.check();assert.equal(h.shown(),true);h.cleanup();
});
test('the game only offers the question while its own screen is showing',()=>{
 assert.match(read('public/game.js'),/canShow:\(\)=>ready&&\$\('loading'\)\.hidden&&!document\.querySelector\('dialog\[open\]'\)/);
});

// 28 Sep 2026: where push cannot work, the one question offers the daily email instead (from level 2, no long crop needed).
test('where push cannot work, the question offers the daily email, from level 2 and without waiting for a long crop',async()=>{
 for(const opts of [{kind:'unsupported'},{kind:'install-first'},{kind:'blocked'},{push:false}]){
  const h=harness({...opts,email:true,waitMinutes:1});await h.nudge.check();
  assert.equal(h.shown(),true,JSON.stringify(opts));assert.match(h.html(),/Want a reminder by email\?/);assert.match(h.html(),/data-nudge-on>Email me</);
  assert.deepEqual(h.log.events,[['reminder_prompt','shown']]);h.cleanup();
 }
});
test('Email me switches on the daily email and keeps every other choice; a failure says so',async()=>{
 const h=harness({kind:'unsupported',email:true});await h.nudge.check();await h.buttons.on.onclick();
 assert.equal(h.log.enabled,0,'no browser permission is asked');
 assert.deepEqual(h.log.saved,{pushCrops:false,pushProduction:false,pushDaily:true,emailDigest:true,digestHour:8});
 assert.match(h.log.toasts[0],/Email reminders are on/);assert.equal(h.storage['harvest-tycoon:reminder-nudge'],'answered');assert.equal(h.shown(),false);h.cleanup();
 const bad=harness({kind:'unsupported',email:true,saveFails:true});await bad.nudge.check();await bad.buttons.on.onclick();
 assert.match(bad.log.toasts[0],/could not be turned on/);assert.deepEqual(bad.log.events.at(-1),['reminder_prompt','failed']);bad.cleanup();
});
test('the email question stays away when push can still be asked, when email is on already, off on the server, or too early',async()=>{
 for(const opts of [{kind:'off',waitMinutes:1,email:true},{kind:'on',email:true},{kind:'unsupported',email:false},{kind:'unsupported',email:true,level:1},{kind:'unsupported',email:true,stored:'dismissed'},
  {kind:'unsupported',email:true,prefs:{pushCrops:true,pushProduction:true,pushDaily:true,emailDigest:true,digestHour:9}}]){
  const h=harness(opts);await h.nudge.check();assert.equal(h.shown(),false,JSON.stringify(opts));h.cleanup();
 }
});
test('the reminder question says which reminder it offered',()=>{
 const win={innerWidth:390};trackGame('reminder_prompt',{action:'accepted',channel:'email'},win);trackGame('reminder_prompt',{action:'shown',channel:'sms'},win);
 assert.deepEqual(win.dataLayer,[{event:'reminder_prompt',device:'mobile',action:'accepted',channel:'email'},{event:'reminder_prompt',device:'mobile',action:'shown'}]);
});
test('an address that is not confirmed yet: Email me also opens the 6-digit code check; Settings does the same',async()=>{
 const h=harness({kind:'unsupported',email:true,unconfirmed:true});await h.nudge.check();await h.buttons.on.onclick();
 assert.equal(h.log.saved.emailDigest,true);assert.equal(h.log.confirm,1);assert.match(h.log.toasts[0],/Confirm your email address/);h.cleanup();
 const ok=harness({kind:'unsupported',email:true});await ok.nudge.check();await ok.buttons.on.onclick();assert.equal(ok.log.confirm,undefined,'a confirmed address needs nothing more');ok.cleanup();
 assert.match(read('public/game.js'),/emailUnconfirmed:\(\)=>emailAccount\.needed,confirmEmail:\(\)=>emailCheckUI\?\.open\(\),/);
 assert.match(read('public/game.js'),/createSoundSettings\(farmAudio,\{onEmailOn:\(\)=>\{if\(!emailAccount\.needed\)return;/);
 assert.match(read('public/notifications-ui.js'),/if\(next\.emailDigest&&!before\?\.emailDigest\)onEmailOn\?\.\(\);/);
});
