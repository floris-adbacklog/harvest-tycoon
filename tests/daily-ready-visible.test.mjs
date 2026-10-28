import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel,dailyTasks,applyFarmAction as act,QUESTS,BUILDINGS,ACTIVE_STATIONS,utcDay} from '../game/farm-state.js';
import {readyDailies,dailyWait,createQuestsUI} from '../public/quests-ui.js';
import {nextGoal,actNow} from '../public/next-goal.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,13,12);

// Plan F, proposal 1 (13 Oct 2026): of the farmers who stopped at level 5 or 6, 48% on a phone and 65% in the app left a daily challenge
// that was ready, against 35% on a computer, where Today is a button on screen. On a phone Today sat in More as "Daily rewards".
function farmer({level=5,coins=0}={}){
 const s=createFarm(now);s.xp=xpForLevel(level)+20;s.coins=coins;s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};
 s.claimed=QUESTS.map((_,i)=>i);   // no quest waits, so the daily challenges come next
 for(const b of Object.values(s.buildings))b.built=true;
 return s;
}
const finish=(s,q)=>{s.stats[q.stat]=(s.daily.baseline[q.stat]??0)+q.target;};

test('readyDailies: the challenges that are done and not claimed yet, none before they open at level 3',()=>{
 const s=farmer(),tasks=dailyTasks(s,now);assert.equal(tasks.length,3);
 assert.deepEqual(readyDailies(s,now),[]);
 finish(s,tasks[0]);finish(s,tasks[2]);
 assert.deepEqual(readyDailies(s,now).map(q=>q.id),[tasks[0].id,tasks[2].id]);
 // Claimed one at a time, in Today: each claim takes one.
 act(s,{type:'daily',id:tasks[0].id,day:utcDay(now)},now);assert.deepEqual(readyDailies(s,now).map(q=>q.id),[tasks[2].id]);
 const young=createFarm(now);young.xp=xpForLevel(2);assert.deepEqual(readyDailies(young,now),[],'level 2: no challenges yet');
});

test('the next goal: a quest to claim, then a daily challenge to claim, then a building; the phone line shows it too',()=>{
 const s=farmer({coins:1e6}),tasks=dailyTasks(s,now);
 for(const b of Object.values(s.buildings))b.built=false;
 const quest=QUESTS.findIndex(q=>q.stat==='harvested');s.claimed=s.claimed.filter(id=>id!==quest);finish(s,tasks[1]);s.stats.harvested=Math.max(s.stats.harvested??0,QUESTS[quest].target);
 assert.equal(nextGoal(s,now).kind,'quest','a quest that is ready still comes first');
 s.claimed.push(quest);
 const goal=nextGoal(s,now),q=dailyTasks(s,now)[1];
 assert.deepEqual(goal,{kind:'daily',id:q.id,title:q.title,description:q.description,stat:q.stat,coins:q.reward,diamonds:q.diamonds,xp:q.xp,ready:1});
 assert.ok(actNow(goal),'the phone shows its line for it');
 // While an XP boost runs, its XP as Today shows it.
 s.boosts.xpUntil=now+60000;assert.equal(nextGoal(s,now).xp,q.xp*2);s.boosts.xpUntil=0;
 // Claimed: the next goal moves on (a building the farm can pay for).
 act(s,{type:'daily',id:q.id,day:utcDay(now)},now);assert.equal(nextGoal(s,now).kind,'build');
});

test('dailyWait: a challenge for a resting helping hand stop says when that stop is ready again',()=>{
 const s=farmer(),at=now+25*60000,task=(stat,target=2,progress=0)=>({stat,target,progress,claimed:false});
 s.activities={jobs:{},cooldowns:{greenhouse:at},completed:{},round:[],rounds:0};
 assert.deepEqual(dailyWait(s,task('activity_greenhouse',2,1),now),{station:'greenhouse',name:ACTIVE_STATIONS.greenhouse.name,at});
 assert.equal(dailyWait(s,task('activity_apiary'),now),null,'the Apiary is not resting');
 assert.equal(dailyWait(s,task('activity_greenhouse'),at),null,'rested: nothing to wait for');
 assert.equal(dailyWait(s,{...task('activity_greenhouse',2,2)},now),null,'done');
 assert.equal(dailyWait(s,{...task('activity_greenhouse'),claimed:true},now),null,'claimed');
 assert.equal(dailyWait(s,task('harvested',10),now),null,'not a helping hand challenge');
 s.activities.jobs.greenhouse={startedAt:now,targets:[0,2,3],done:[]};assert.equal(dailyWait(s,task('activity_greenhouse'),now),null,'a job in progress can go on now');
 delete s.activities.jobs.greenhouse;
 // A round: the stops it still needs; any jobs: all four. Only when none of them can be done now, then the first that is ready.
 s.activities.round=['apiary','paddock'];s.activities.cooldowns={greenhouse:at,workshop:at+600000,apiary:at+1200000,paddock:at+1200000};
 assert.equal(dailyWait(s,task('activity_rounds',1),now).station,'greenhouse');
 assert.equal(dailyWait(s,task('activities',6),now).station,'greenhouse');
 s.activities.cooldowns.workshop=0;assert.equal(dailyWait(s,task('activity_rounds',1),now),null,'the Tool workshop is ready');
 assert.equal(dailyWait(s,task('activities',6),now),null);
});

// The Quests window (public/quests-ui.js) with a small stand-in page: one line at the top for the challenges that are ready.
function page(){
 class El{hidden=false;open=false;disabled=false;innerHTML='';className='';dataset={};listeners={};scrollTop=0;
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}setAttribute(){}close(){this.open=false;}showModal(){this.open=true;}focus(){}
  before(){}querySelectorAll(){return [];}}
 const dialog=new El(),list=new El(),button=new El(),toolbar=new El(),line=new El(),summary=new El();dialog.querySelector=()=>null;list.querySelector=()=>null;
 toolbar.querySelector=sel=>sel==='[data-quest-today]'?line:sel==='#quest-summary'?summary:null;
 const els={'tasks-dialog':dialog,'task-list':list,'tasks-button':button};
 return {dialog,toolbar,line,button,doc:{getElementById:id=>els[id],createElement:()=>toolbar,querySelectorAll:()=>[]}};
}
test('Quests: one line at the top says how many daily challenges are ready and opens Today; it claims nothing',()=>{
 // The window counts at the farm's clock (farmNow, Date.now): held at this test's day (14 Oct 2026: from that day it counted another day's challenges).
 const realNow=Date.now;Date.now=()=>now;try{
 const s=farmer(),tasks=dailyTasks(s,now),{dialog,toolbar,line,button,doc}=page(),opened=[],claims=[];
 const ui=createQuestsUI({state:s,claim:id=>claims.push(id),claimVillage(){},icons(){},notify(){},openToday:id=>opened.push(id),document:doc});
 button.listeners.click[0]();assert.equal(dialog.open,true);assert.equal(line.hidden,true,'nothing ready: no line');
 finish(s,tasks[0]);ui.refresh();assert.equal(line.hidden,false);assert.match(line.innerHTML,/<strong>1 daily challenge ready<\/strong><span>Today<\/span>/);
 finish(s,tasks[1]);ui.refresh();assert.match(line.innerHTML,/<strong>2 daily challenges ready<\/strong>/);
 toolbar.listeners.click[0]({target:{closest:sel=>sel==='[data-quest-today]'?line:null}});
 assert.deepEqual(opened,[tasks[0].id],'a tap opens Today at the first challenge that is ready (its Claim in view)');assert.equal(dialog.open,false,'and closes Quests');assert.deepEqual(claims,[],'it claims nothing');
 // Without a way to Today (a page that gives none) the line stays away.
 const other=page(),plain=createQuestsUI({state:s,claim(){},claimVillage(){},icons(){},notify(){},document:other.doc});
 other.button.listeners.click[0]();assert.equal(other.line.hidden,true);plain.refresh();
 }finally{Date.now=realNow;}
});

test('the next-goal card and the phone line open Today at a ready challenge; it is claimed there, one at a time',async()=>{
 const {createBeginnerUI}=await import('../public/beginner-ui.js');
 const els=new Map();
 class El{hidden=false;open=false;disabled=false;className='';textContent='';innerHTML='';attrs={};listeners={};classList={toggle(){},add(){},remove(){},contains:()=>false};
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}close(){}showModal(){}focus(){}querySelector(){return new El();}getClientRects(){return [];}
  click(){for(const fn of this.listeners.click??[])fn({target:this});}}
 const get=id=>{if(!els.has(id))els.set(id,new El());return els.get(id);};
 const previous=globalThis.document;globalThis.document={getElementById:get,querySelector:get,querySelectorAll:()=>[]};
 try{
  const s=farmer(),q=dailyTasks(s,Date.now())[0],claims=[],opened=[];finish(s,q);
  const ui=createBeginnerUI({state:s,runAction:async()=>{},icons(){},notify(){},onChange(){},guide(){},claimQuest:async id=>claims.push(id),openQuest(){},openToday:id=>opened.push(id),storage:{getItem:()=>null,setItem(){}}});
  assert.equal(get('next-goal-card').hidden,false);assert.equal(get('next-goal-kind').textContent,'DAILY CHALLENGE READY');assert.equal(get('next-goal-title').textContent,q.title);
  assert.equal(get('next-goal-button').textContent,'Open Today');assert.equal(get('next-goal-button').className,'primary-button');assert.equal(get('next-goal-button').hidden,false);
  assert.match(get('next-goal-note').innerHTML,/coins<\/b><b class="reward-diamonds">.*diamonds?<\/b><b class="reward-xp">/);
  assert.equal(get('next-goal-mobile').hidden,false,'the phone shows the line');assert.equal(get('next-goal-mobile-copy').textContent,`Daily challenge ready: ${q.title}`);
  get('next-goal-button').click();get('next-goal-mobile').click();await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(opened,[q.id,q.id],'both open Today at that challenge');assert.deepEqual(claims,[],'neither claims anything itself');
  ui.refresh();
 }finally{globalThis.document=previous;}
});

test('the wiring: Quests counts the ready challenges, Today is called Today in More, Today says when a stop is ready, the texts match',()=>{
 const game=read('public/game.js'),html=read('public/farm.html'),retention=read('public/retention-ui.js'),wiki=read('public/wiki-content.js');
 assert.match(game,/const waiting=questGroups\(state\)\.ready\.length\+\(villageQuestReady\(state\)\?villageQuestGroups\(state\)\.ready\.length:0\)\+\(harbourQuestReady\(state\)\?harbourQuestGroups\(state\)\.ready\.length:0\)\+readyDailies\(state,farmNow\(\)\)\.length;/);
 assert.match(game,/quests=createQuestsUI\(\{[^\n]*openToday:id=>retention\.openToday\('challenges',\{at:id\}\)/,'the line in Quests opens Today at the first ready challenge');
 assert.match(game,/beginner=createBeginnerUI\(\{[^\n]*openToday:id=>retention\.openToday\('challenges',\{at:id\}\)/,'the card and the phone line open Today at the challenge');
 assert.match(game,/if\(goal\.kind==='daily'\)return \{label:'Open Today',run:\(\)=>retention\.openToday\('challenges',\{at:goal\.id\}\)\};/,'the guide-complete card too');
 // Plan E (13 Oct 2026) stays: until the first sale Quests shows no number, Today and More no "!".
 assert.match(read('public/beginner.css'),/#game\.first-sale-waits :is\(#task-dot,#today-dot,#more-dot\)/);
 // The More tile is called Today, like the button on a computer and like guide step 6.
 assert.match(html,/<button data-menu-action="today-button"><i data-lucide="gift"><\/i><span><strong>Today<\/strong>/);assert.doesNotMatch(html,/Daily rewards/);
 assert.match(html,/<b>Today<\/b><\/button>/);
 assert.match(read('public/guide-steps.js'),/via\('today-button','Tap Today for your daily gift\.','\[data-menu-action="today-button"\]','Tap Today\.'\)/);
 // Today: the time a resting stop is ready again, under the challenge's bar, and drawn anew when that stop is ready.
 assert.match(retention,/return w\?`<small class="daily-wait">\$\{art\('hourglass'\)\}<span>\$\{w\.name\} ready at \$\{clock\(w\.at\)\}<\/span><\/small>`:'';/);
 assert.match(retention,/featureUnlocked\(state,'challenges'\)&&waitKey\(dailyTasks\(state,farmNow\(\)\)\)!==lastWaits\)renderToday\(\);/);
 // Never a Claim all, anywhere new.
 for(const file of ['public/quests-ui.js','public/next-goal.js','public/beginner-ui.js','public/retention-ui.js'])assert.doesNotMatch(read(file),/Claim all/i,file);
 // The wiki says the same.
 assert.match(wiki,/The number on Quests also counts the daily challenges that are ready; claim those in Today\. After the Beginner guide the Next goal card shows one goal: a quest to claim, a daily challenge to claim, a building to build/);
 assert.match(wiki,/They are in Today \(on a phone: More → Today\)\. Claim each one there when it is done; the number on Quests counts it too\. A challenge for a helping hand stop that is resting says when that stop is ready again\./);
});
