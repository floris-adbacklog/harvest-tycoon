import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReminderNudge,NUDGE_LEVELS} from '../public/reminder-nudge.js';
import {noteLog} from '../supabase/functions/farm-api/player-log.js';
import {createFarm,checkIn} from '../public/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 13 Oct 2026 (item 4 of the 13 Oct proposal): the first reminder question comes right after the farm's first daily gift, once its
// window is closed; it takes the place of the level-5 ask, so a farmer who skips the gift is still asked at level 5 (three asks in all).
function harness({level=3,visits=1,kind='off',push=true,email=false,stored=null,unavailable=false,canShow=()=>true,settleMs=15000,prefs={pushCrops:true,pushProduction:true,pushDaily:false,emailDigest:false,digestHour:9}}={}){
 const log={events:[],notes:[],toasts:[],saved:null,enabled:0},storage={};if(stored)storage['harvest-tycoon:reminder-nudge']=stored;
 const buttons={later:{onclick:null,disabled:false},on:{onclick:null,disabled:false}};let card=null,shownCount=0;
 globalThis.localStorage=unavailable?{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}}:{getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=v;}};
 globalThis.document={createElement(){shownCount++;card={attrs:{},set innerHTML(v){this.html=v;},get innerHTML(){return this.html;},setAttribute(k,v){this.attrs[k]=v;},querySelector(sel){return sel==='[data-nudge-later]'?buttons.later:buttons.on;},remove(){card=null;}};return card;},body:{append(){}},querySelector:()=>card};
 const api={ready:Promise.resolve(),available:true,config:{push,email},push:push?{async status(){return {kind};},async enable(){log.enabled++;return {kind:'on'};}}:null,async get(){return prefs;},async save(p){log.saved=p;}};
 globalThis.window={parent:{harvestBridge:{notifications:api}}};
 let time=1_000_000,lvl=level;const looks=[];
 const state={plots:[],buildings:{},login:{lastDay:null,streak:1,best:1,visits}};
 const nudge=createReminderNudge({state,level:()=>lvl,notify:m=>log.toasts.push(m),track:(e,p)=>log.events.push(p.action),log:n=>log.notes.push(n),canShow,settleMs,clock:()=>time,schedule:fn=>looks.push(fn)});
 // The page's half-second look, by hand: runs what gifted() scheduled, as often as asked.
 const look=async(n=1)=>{for(let i=0;i<n;i++){const fn=looks.shift();if(!fn)return;fn();await new Promise(r=>setTimeout(r,0));}};
 return {nudge,log,buttons,storage,state,looks,look,shown:()=>card!==null,count:()=>shownCount,html:()=>card?.html??'',
  later:ms=>{time+=ms;},setLevel:l=>{lvl=l;},cleanup(){delete globalThis.localStorage;delete globalThis.document;delete globalThis.window;}};
}

test('right after the first daily gift: the gift question, once its window is closed and the farm has had 1.5 s, no harvest needed',async()=>{
 let windowOpen=true;const h=harness({canShow:()=>!windowOpen});
 h.nudge.gifted();await h.look();assert.equal(h.shown(),false,'not over the Today window (or Welcome back)');
 h.later(60000);await h.look();assert.equal(h.shown(),false,'still open after a minute');
 windowOpen=false;h.later(500);await h.look();assert.equal(h.shown(),false,'the window has only just closed');
 h.later(1000);await h.look();assert.equal(h.shown(),false);
 h.later(600);await h.look();assert.equal(h.shown(),true,'1.5 s after the window closed, not the harvest question\'s 15 s');
 assert.match(h.html(),/<strong>Want a nudge when tomorrow’s gift is ready\?<\/strong>/);assert.match(h.html(),/We only send a reminder when something is waiting\./);assert.match(h.html(),/data-nudge-on>Turn on</);
 await h.look();assert.equal(h.looks.length,0,'it stops looking once it has asked');
 assert.equal(h.storage['harvest-tycoon:reminder-nudge'],'0:5','kept as the level-5 ask');
 assert.deepEqual(h.log.notes,[{kind:'reminder',step:'shown',channel:'push',level:3,at:'gift'}]);assert.deepEqual(h.log.events,['shown']);
 h.buttons.later.onclick();assert.deepEqual(h.log.notes.at(-1),{kind:'reminder',step:'later',channel:'push',level:3,at:'gift'});h.cleanup();
});
test('only the first gift, only while this device has asked nothing, and only for 5 minutes',async()=>{
 for(const opts of [{visits:2},{visits:0},{stored:'0:5'},{stored:'0:3'},{stored:'dismissed'},{unavailable:true}]){
  const h=harness(opts);h.nudge.gifted();await h.look();h.later(2000);await h.look();h.later(31000);await h.look();
  assert.equal(h.shown(),false,JSON.stringify(opts));assert.equal(h.looks.length,0,'nothing waits: '+JSON.stringify(opts));h.cleanup();
 }
 let windowOpen=true;const late=harness({canShow:()=>!windowOpen});late.nudge.gifted();await late.look();
 late.later(5*60000+1);windowOpen=false;await late.look();late.later(2000);await late.look();
 assert.equal(late.shown(),false,'5 minutes later the moment has passed');assert.equal(late.looks.length,0);late.cleanup();
 // Another farm on the device was asked: this farm was not.
 const other=harness({stored:'1777000000000:20'});other.nudge.gifted();await other.look();other.later(2000);await other.look();assert.equal(other.shown(),true);other.cleanup();
});
test('nothing to ask where reminders are on already or cannot work; the level-5 ask then stays as it was',async()=>{
 for(const opts of [{kind:'on'},{kind:'unsupported'},{push:false},{kind:'unsupported',email:true,prefs:{emailDigest:true}}]){
  const h=harness(opts);h.nudge.gifted();await h.look();h.later(2000);await h.look();
  assert.equal(h.shown(),false,JSON.stringify(opts));assert.equal(h.storage['harvest-tycoon:reminder-nudge'],undefined,'nothing kept: '+JSON.stringify(opts));h.cleanup();
 }
});
test('three asks in all: after the first gift, then at level 10 and 20; level 5 asks nothing more',async()=>{
 const h=harness();h.nudge.gifted();await h.look();h.later(2000);await h.look();assert.equal(h.shown(),true);h.buttons.later.onclick();
 for(const [lvl,asks] of [[5,false],[9,false],[10,true],[19,false],[20,true],[40,false]]){
  h.setLevel(lvl);h.later(60000);h.nudge.harvested();h.later(16000);await h.nudge.check();h.later(16000);await h.nudge.check();
  assert.equal(h.shown(),asks,`level ${lvl}`);if(asks)h.buttons.later.onclick();
 }
 assert.equal(h.count(),3);h.cleanup();
});
test('a farmer who skips the gift is asked at level 5 as before, and the gift later asks nothing: still three asks',async()=>{
 const h=harness({level:5,visits:0});h.nudge.harvested();await h.nudge.check();h.later(16000);await h.nudge.check();assert.equal(h.shown(),true,'level 5');
 assert.match(h.html(),/Want a nudge when your crops are ready\?/);assert.deepEqual(h.log.notes,[{kind:'reminder',step:'shown',channel:'push',level:5}],'no at: the harvest ask');h.buttons.later.onclick();
 h.setLevel(6);h.state.login.visits=1;h.later(60000);h.nudge.gifted();await h.look();h.later(2000);await h.look();assert.equal(h.shown(),false,'the first gift after the level-5 ask');
 for(const lvl of [10,20]){h.setLevel(lvl);h.later(60000);h.nudge.harvested();await h.nudge.check();h.later(16000);await h.nudge.check();assert.equal(h.shown(),true,`level ${lvl}`);h.buttons.later.onclick();}
 assert.equal(h.count(),3);h.cleanup();
 // A first gift that comes late (level 12, never asked): asked then, and kept at its own level, so the next is at 20.
 const late=harness({level:12});late.nudge.gifted();await late.look();late.later(2000);await late.look();assert.equal(late.shown(),true);
 assert.equal(late.storage['harvest-tycoon:reminder-nudge'],'0:12');late.cleanup();
});
test('Turn on after the gift asks the device and switches on the daily gift reminder, keeping every other choice',async()=>{
 const h=harness();h.nudge.gifted();await h.look();h.later(2000);await h.look();await h.buttons.on.onclick();
 assert.equal(h.log.enabled,1);assert.deepEqual(h.log.saved,{pushCrops:true,pushProduction:true,pushDaily:true,emailDigest:false,digestHour:9});
 assert.deepEqual(h.log.toasts,['Reminders are on. We will let you know when your next gift is ready.']);assert.deepEqual(h.log.events,['shown','accepted']);
 assert.deepEqual(h.log.notes.map(n=>[n.step,n.at]),[['shown','gift'],['on','gift']]);assert.equal(h.shown(),false);h.cleanup();
 // The harvest question keeps its own answer: crops and goods.
 const harvest=harness({level:5,visits:0,settleMs:0});harvest.nudge.harvested();await harvest.nudge.check();await harvest.buttons.on.onclick();
 assert.deepEqual(harvest.log.saved,{pushCrops:true,pushProduction:true,pushDaily:false,emailDigest:false,digestHour:9});assert.match(harvest.log.toasts[0],/crops or batches/);harvest.cleanup();
});
test('where push cannot work, the email card asks about tomorrow\'s gift and Email me switches on the daily email',async()=>{
 for(const opts of [{kind:'unsupported'},{kind:'install-first'},{kind:'blocked'},{push:false}]){
  const h=harness({...opts,email:true});h.nudge.gifted();await h.look();h.later(2000);await h.look();
  assert.equal(h.shown(),true,JSON.stringify(opts));assert.match(h.html(),/<strong>Want an email when tomorrow’s gift is ready\?<\/strong>/);
  assert.match(h.html(),/At most one a day, only when crops or your daily gift are waiting\. Unsubscribe in one tap\./);assert.match(h.html(),/data-nudge-on>Email me</);
  assert.deepEqual(h.log.notes,[{kind:'reminder',step:'shown',channel:'email',level:3,at:'gift'}]);
  await h.buttons.on.onclick();assert.equal(h.log.enabled,0);assert.equal(h.log.saved.emailDigest,true);assert.match(h.log.toasts[0],/Email reminders are on/);h.cleanup();
 }
});
test('the first gift is the farm\'s own count (login.visits), and game.js asks after a checkin from Today or Welcome back',()=>{
 const now=Date.UTC(2026,9,13,12),farm=createFarm(now);assert.equal(farm.login.visits,0);checkIn(farm,now);assert.equal(farm.login.visits,1,'the first gift');
 checkIn(farm,now+86400000);assert.equal(farm.login.visits,2,'the next day is not the first');
 assert.match(read('public/game.js'),/beginner\?\.afterAction\(result\);if\(harvestAction\(action\)\)nudge\?\.harvested\(\);else if\(action\.type==='checkin'\)nudge\?\.gifted\(\);/);
 assert.match(read('public/retention-ui.js'),/const r=await act\(\{type:'checkin'\}/,'Today and Welcome back collect through runAction');
 assert.deepEqual(NUDGE_LEVELS,[5,10,20]);
});
test('the farmer\'s log says when the question came after the first gift; its answers read the same; nothing new is accepted',()=>{
 const note=(step,channel='push',level=3,extra={})=>({kind:'reminder',step,channel,level,...extra});
 assert.deepEqual(noteLog([note('shown','push',3,{at:'gift'}),note('shown','email',4,{at:'gift'}),note('on','push',3,{at:'gift'}),note('later','email',4,{at:'gift'})]).map(r=>[r.action,r.text]),[
  ['reminder_shown','Was asked to turn on push reminders after the first daily gift, at level 3'],['reminder_shown','Was asked to turn on the daily email after the first daily gift, at level 4'],
  ['reminder_on','Turned on push reminders from the question'],['reminder_later','Said “Not now” to the daily email']]);
 assert.deepEqual(noteLog([note('shown','push',5)]).map(r=>r.text),['Was asked to turn on push reminders at level 5'],'the harvest ask as before');
 assert.deepEqual(noteLog([note('shown','push',5,{at:'harvest'})]).map(r=>r.text),['Was asked to turn on push reminders at level 5']);
 for(const bad of [note('shown_gift'),note('shown','sms',3,{at:'gift'}),note('blocked','email',3,{at:'gift'}),note('shown','push',0,{at:'gift'})])assert.deepEqual(noteLog([bad]),[],JSON.stringify(bad));
});
test('the privacy policy says when the question comes',()=>{
 assert.match(read('public/privacy.html'),/we ask after your first daily gift or at level 5, whichever comes first, and again at level 10 and 20 while they are off/);
});
// Review fixes (13 Oct 2026): on a phone the card covers the bottom bar, and right after the first gift step 7's pointer ("Tap Buildings.")
// came 0.3 s after it, pointing under the card, and Not now ended that pointer. One at a time now, whichever came first.
test('the card and the guide\'s pointer never stand together: the card waits for the pointer, the guide\'s own pointer waits for the card',async()=>{
 let pointer=true;const h=harness({canShow:()=>!pointer});h.nudge.gifted();await h.look();h.later(20000);await h.look();assert.equal(h.shown(),false,'not while the pointer stands');
 pointer=false;h.later(500);await h.look();h.later(1600);await h.look();assert.equal(h.shown(),true,'1.5 s after the pointer is gone');h.cleanup();
 assert.match(read('public/game.js'),/canShow:\(\)=>ready&&\$\('loading'\)\.hidden&&!document\.querySelector\('dialog\[open\]'\)&&!coach\.active\}\);/);
 assert.match(read('public/beginner-ui.js'),/function quiet\(\)\{return !document\.querySelector\('dialog\[open\]'\)&&!document\.querySelector\('\.reminder-nudge'\)&&idle\(\);\}/);
 assert.match(read('public/reminder-nudge.js'),/card\.className='reminder-nudge'/,'the class the guide looks for');
});
test('the look after the first gift ends with its 5 minutes, also while the device never answers the push check',async()=>{
 const h=harness();globalThis.window.parent.harvestBridge.notifications.push.status=()=>new Promise(()=>{});
 h.nudge.gifted();await h.look();h.later(2000);await h.look();assert.equal(h.shown(),false);assert.equal(h.looks.length,1,'still looking');
 h.later(5*60000);await h.look();await h.look();assert.equal(h.looks.length,0,'it stops');assert.equal(h.shown(),false);h.cleanup();
});
