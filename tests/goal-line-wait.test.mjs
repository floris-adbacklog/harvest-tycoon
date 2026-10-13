import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel,applyFarmAction as act,EARLY_FIELDS,STARTER_FIELDS,QUESTS,dailyTasks} from '../game/farm-state.js';
import {nextGoal,actNow,readyAllAt} from '../public/next-goal.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Plan F, proposals 2 and 3 (13 Oct 2026; the owner's yes): of the farmers who stopped at level 7 to 10, 58 to 63% left every field growing,
// with about 20 minutes to go, while a phone showed no goal (only the tap hints); and at level 5 the median farmer had 1,335 coins while 38
// of 42 still had 8 fields. After the guide a phone now always shows one line: what can be done now (a quest or a daily challenge to claim,
// a building, a field), otherwise when everything is ready, and when nothing grows the quest closest to done. A computer keeps its card.
const now=Date.now();
function farmer({level=5,coins=0}={}){
 const s=createFarm(now);s.xp=xpForLevel(level)+5;s.coins=coins;s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};
 for(const b of Object.values(s.buildings)){b.built=true;b.job=null;b.extraJobs=[];}
 s.plots=s.plots.map(p=>({...p,crop:null,readyAt:0}));   // a new farm's starter crops are cleared: each test plants its own
 return s;
}

test('the next goal: a field (9 to 12) that opened and can be paid for, after a building and only while no building waits to be built',()=>{
 assert.equal(STARTER_FIELDS,8);
 const s=farmer({coins:99});assert.equal(s.plots.length,8);
 assert.notEqual(nextGoal(s,now).kind,'field','99 coins: field 9 costs 100');
 s.coins=100;let goal=nextGoal(s,now);
 assert.deepEqual(goal,{kind:'field',field:9,cost:EARLY_FIELDS[0].coins});assert.ok(actNow(goal),'something to do now: the phone line shows it');
 // The same field the Farmhouse sells: buying it takes those coins and gives that field.
 act(s,{type:'expand'},now);assert.equal(s.plots.length,9);assert.equal(s.coins,0);
 s.coins=1000;assert.deepEqual(nextGoal(s,now),{kind:'field',field:10,cost:150});
 // Not before its level: field 10 opens at level 3.
 const young=farmer({level:2,coins:1000});act(young,{type:'expand'},now);assert.notEqual(nextGoal(young,now).kind,'field','level 2: field 10 is not open yet');
 // A building that can be paid for comes first; one that opened and is still to build (even without the coins) holds the field back.
 s.buildings.dairy.built=false;assert.equal(nextGoal(s,now).kind,'build');
 s.coins=200;assert.equal(nextGoal(s,now).kind,'progress','the Dairy Barn (300) opened and is not built: no field');
 s.buildings.dairy.built=true;assert.equal(nextGoal(s,now).kind,'field');
 const six=farmer({level:6,coins:500});six.buildings.windmill.built=false;assert.notEqual(nextGoal(six,now).kind,'field','the Windmill (700) opened at level 6: it comes before a field of 100');
 six.buildings.windmill.built=true;assert.equal(nextGoal(six,now).kind,'field');
 // Never past field 12, never on an older farm that started with 12 fields; quests and daily challenges still come first.
 const full=farmer({coins:1e6});for(let i=0;i<4;i++)act(full,{type:'expand'},now);assert.equal(full.plots.length,12);assert.notEqual(nextGoal(full,now).kind,'field');
 const quest=QUESTS.findIndex(q=>q.stat==='harvested'&&q.target<=5);s.stats.harvested=QUESTS[quest].target;assert.equal(nextGoal(s,now).kind,'quest');
 s.claimed=QUESTS.map((_,i)=>i);const task=dailyTasks(s,now)[0];s.stats[task.stat]=(s.daily.baseline[task.stat]??0)+task.target;assert.equal(nextGoal(s,now).kind,'daily');
});

test('readyAllAt: the last crop and the last batch that still grow, 0 when nothing grows; the guide\'s end says the same time',()=>{
 const s=farmer();assert.equal(readyAllAt(s,now),0);
 s.plots[0]={...s.plots[0],crop:'wheat',readyAt:now+20*60000};s.plots[1]={...s.plots[1],crop:'corn',readyAt:now-1000};
 assert.equal(readyAllAt(s,now),now+20*60000,'a ripe crop does not count');
 s.buildings.coop.job={id:'a',recipe:'eggs',readyAt:now+35*60000};assert.equal(readyAllAt(s,now),now+35*60000,'a batch too');
 assert.equal(readyAllAt(s,now+36*60000),0);
 const game=read('public/game.js');
 assert.match(game,/const last=readyAllAt\(state,now\),clock=t=>new Date\(t\)\.toLocaleTimeString\(\[\],\{hour:'2-digit',minute:'2-digit'\}\);/,'comeBackNote');
 // The guide-complete card's green button leads to the field too (Show me: the Farmhouse and its button for one more field).
 assert.match(game,/if\(goal\.kind==='field'\)return \{label:`Buy field \$\{goal\.field\}`,run:\(\)=>showWay\('field'\)\};/);
 assert.match(read('public/guide-steps.js'),/if\(target==='field'\)return \[\.\.\.building\('farmhouse','Tap this building\.','Open this building\.'\),\{find:\(\)=>doc\.querySelector\('dialog\[open\] #expand-fields'\),text:'Buy your new field here\.'\}\];/);
 assert.match(read('public/economy-ui.js'),/id="expand-fields"/,'the button Show me ends on');
});

// The card and the line (beginner-ui.js) with a small stand-in page.
function page(){
 const els=new Map();
 class El{hidden=false;open=false;disabled=false;className='';textContent='';innerHTML='';attrs={};listeners={};classes=new Set();classList={toggle:(c,on)=>{if(on??!this.classes.has(c))this.classes.add(c);else this.classes.delete(c);},add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c)};
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}close(){this.open=false;}showModal(){this.open=true;}focus(){}querySelector(){return new El();}getClientRects(){return [];}
  click(){for(const fn of this.listeners.click??[])fn({target:this});}}
 const get=id=>{if(!els.has(id))els.set(id,new El());return els.get(id);};
 return {get,document:{getElementById:get,querySelector:get,querySelectorAll:()=>[]}};
}
async function ui(s,{phone}){
 const {createBeginnerUI}=await import('../public/beginner-ui.js'),{get,document}=page(),guided=[],quests=[];
 const previous=globalThis.document;globalThis.document=document;
 try{return {get,guided,quests,ui:createBeginnerUI({state:s,runAction:async a=>act(s,a,now),icons(){},notify(){},onChange(){},guide:t=>guided.push(t),openQuest:id=>quests.push(id),claimQuest:async()=>assert.fail('nothing is claimed'),phone:()=>phone,storage:null})};}
 finally{globalThis.document=previous;}
}
const clock=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});

test('phone: while the farm grows the line says when everything is ready, and the moment it names passes on to the next goal',async()=>{
 const s=farmer(),goal=nextGoal(s,now);assert.equal(goal.kind,'progress','nothing to claim, build or buy');
 const at=Date.now()+150;s.plots[0]={...s.plots[0],crop:'wheat',readyAt:at};
 const {get,guided,quests,ui:beginner}=await ui(s,{phone:true});
 const prev=globalThis.document;globalThis.document={getElementById:get,querySelector:get,querySelectorAll:()=>[]};
 try{
  assert.equal(get('next-goal-mobile').hidden,false,'a phone always shows the line after the guide');
  assert.equal(get('next-goal-mobile-copy').textContent,`Everything is ready at ${clock(at)}`);
  assert.ok(get('game').classes.has('goal-line'),'the tap hints make way for it');
  assert.equal(get('next-goal-card').hidden,false);assert.equal(get('next-goal-kind').textContent,'QUEST IN PROGRESS','the card (a computer) is as it was');
  // Its tap opens Quests, where the quests in progress are (no Show me to a crop that is not ripe); it claims nothing.
  get('next-goal-mobile').click();assert.deepEqual(quests,[goal.id]);assert.deepEqual(guided,[]);
  // Ripe: twice a second the game ticks, and the line moves on (nothing grows now: the quest closest to done, with its count).
  await new Promise(r=>setTimeout(r,200));beginner.tick();
  assert.equal(get('next-goal-mobile-copy').textContent,`Quest: ${goal.title} (${goal.value} / ${goal.target})`);
  get('next-goal-mobile').click();assert.deepEqual(guided,goal.guide?[goal.guide]:[],'then its tap is the card\'s Show me');
  // Past midnight it says tomorrow.
  const late=new Date();late.setHours(24,0,0,0);const t=late.getTime()+7*3600000;s.plots[1]={...s.plots[1],crop:'wheat',readyAt:t};beginner.refresh();
  assert.equal(get('next-goal-mobile-copy').textContent,`Everything is ready tomorrow at ${clock(t)}`);
  // A field to buy is something to do now: it comes before the time.
  s.coins=100;beginner.refresh();assert.equal(get('next-goal-mobile-copy').textContent,'Next: Buy field 9 for 100 coins');
  assert.equal(get('next-goal-kind').textContent,'NEW FIELD');assert.equal(get('next-goal-title').textContent,'Buy field 9');
  assert.equal(get('next-goal-button').textContent,'Show me');assert.equal(get('next-goal-button').hidden,false);
  get('next-goal-button').click();get('next-goal-mobile').click();assert.deepEqual(guided.slice(-2),['field','field'],'Show me: the Farmhouse');
 }finally{globalThis.document=prev;}
});

test('computer: the card as it was, and a short computer window (the line instead of the card) shows only the goals to act on',async()=>{
 const s=farmer();s.plots[0]={...s.plots[0],crop:'wheat',readyAt:Date.now()+3600000};
 const {get,ui:beginner}=await ui(s,{phone:false});
 const prev=globalThis.document;globalThis.document={getElementById:get,querySelector:get,querySelectorAll:()=>[]};
 try{
  assert.equal(get('next-goal-card').hidden,false);assert.equal(get('next-goal-kind').textContent,'QUEST IN PROGRESS');
  assert.equal(get('next-goal-mobile').hidden,true);assert.equal(get('game').classes.has('goal-line'),false);
  s.coins=100;beginner.refresh();assert.equal(get('next-goal-mobile').hidden,false);assert.equal(get('next-goal-title').textContent,'Buy field 9','the field on the card too');
 }finally{globalThis.document=prev;}
 // The phone query is mobile-ui.js's own.
 const query=read('public/mobile-ui.js').match(/matchMedia\('([^']+)'\)/)[1];
 assert.ok(read('public/beginner-ui.js').includes(`globalThis.matchMedia?.('${query}')?.matches??false`));
 // The wiki says it.
 assert.match(read('public/wiki-content.js'),/a new field to buy \(fields 9 to 12, once no building waits to be built\), the quest closest to done or your next level\. On a phone it is one line at the top; while your crops or batches grow and nothing else waits, it says when everything is ready\./);
});

// Review (13 Oct 2026): at midnight "tomorrow at 07:05" becomes "at 07:05" by itself, as the twice-a-second tick already moves the line
// on when the moment comes (before, it waited for the next farm action).
test('phone: at midnight the line\'s "tomorrow at" becomes "at" without a farm action',async t=>{
 const evening=new Date();evening.setHours(23,59,58,0);const morning=new Date(evening);morning.setHours(24+7,5,0,0);
 t.mock.timers.enable({apis:['Date'],now:evening.getTime()});
 const s=farmer();s.plots[0]={...s.plots[0],crop:'wheat',readyAt:morning.getTime()};
 const {get,ui:beginner}=await ui(s,{phone:true});
 const prev=globalThis.document;globalThis.document={getElementById:get,querySelector:get,querySelectorAll:()=>[]};
 try{
  assert.equal(get('next-goal-mobile-copy').textContent,`Everything is ready tomorrow at ${clock(morning)}`);
  beginner.tick();assert.equal(get('next-goal-mobile-copy').textContent,`Everything is ready tomorrow at ${clock(morning)}`,'still the same day');
  t.mock.timers.tick(5000);beginner.tick();
  assert.equal(get('next-goal-mobile-copy').textContent,`Everything is ready at ${clock(morning)}`);
 }finally{globalThis.document=prev;}
});
