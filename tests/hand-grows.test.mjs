import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,activityStatus,activityRoundReward,handShare,ACTIVE_STATIONS,ACTIVITY_ROUND_REWARD,HAND_FULL_LEVEL,HAND_REST_PER_LEVEL,FEATURE_LEVELS,beginnerProgress,BEGINNER_QUESTS,BEGINNER_STEP_XP,BEGINNER_REWARD,xpForLevel,levelOf,availableDaily,QUESTS,DAILY_POOLS,buildingEligible} from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
import {guideSteps} from '../public/guide-steps.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,11,12),MIN=60000,HOUR=3600000;
const STOPS=Object.keys(ACTIVE_STATIONS);
const at=(level,make=createFarm)=>{const s=make(now);s.xp=xpForLevel(level);s.xpOffset=0;normalizeFarm(s,now);return s;};
function job(s,station,time){
 const {startedAt}=act(s,{type:'activity_start',station},time);let r;
 s.activities.jobs[station].targets.forEach((target,i)=>{r=act(s,{type:'activity_work',station,startedAt,target},time+(i+1)*700);});return r;
}

// 11 Oct 2026 (the owner's call, part B of the first-ten-minutes plan): A helping hand opens at level 3 and grows with the farm until
// level 10: a stop rests 6 minutes a level, its XP and the round bonus are a tenth of the full amount a level; the goods stay the same.
test('below level 10 a stop rests 6 minutes a level and pays a tenth of the full XP and round bonus a level',()=>{
 assert.deepEqual([FEATURE_LEVELS.activities,HAND_FULL_LEVEL,HAND_REST_PER_LEVEL],[3,10,6*MIN]);
 // level: rest in minutes, XP of the greenhouse, apiary, paddock and workshop, round bonus coins and XP
 const table={3:[18,[13,14,13,14],75,18],4:[24,[17,19,17,19],100,24],5:[30,[21,24,21,24],125,30],6:[36,[25,29,25,29],150,36],7:[42,[29,34,29,34],175,42],
  8:[48,[34,38,34,38],200,48],9:[54,[38,43,38,43],225,54],10:[60,[42,48,42,48],250,60],11:[60,[42,48,42,48],250,60],12:[60,[42,48,42,48],250,60]};
 for(const [level,[rest,xp,coins,bonus]] of Object.entries(table)){
  const s=at(Number(level)),all=STOPS.map(k=>activityStatus(s,k,now));
  assert.deepEqual(all.map(a=>a.cooldown/MIN),[rest,rest,rest,rest],`level ${level} rests`);
  assert.deepEqual(all.map(a=>a.xp),xp,`level ${level} XP`);
  assert.deepEqual(activityRoundReward(s),{coins,xp:bonus},`level ${level} round bonus`);
  assert.deepEqual(all.map(a=>[a.item,a.itemCount??1]),[['lettuce',3],['honey',3],['fertilizer',1],['feed',1]],'the goods never change');
  assert.equal(handShare(s),Math.min(1,Number(level)/10));
 }
 // A real round at level 3: what it pays, the goods, and when each stop is back.
 const s=at(3),coins=s.coins,xp=s.xp,inv={...s.inventory};let levelCoins=0,r;
 STOPS.forEach((k,i)=>{r=job(s,k,now+i*5000);levelCoins+=r.levelReward?.coins??0;});
 assert.ok(r.roundComplete);assert.equal(r.coins,75);
 assert.equal(s.xp-xp,13+14+13+14+18,'72 XP: 30% of a full round');assert.equal(s.coins-coins-levelCoins,75);
 assert.deepEqual([s.inventory.lettuce-inv.lettuce,s.inventory.honey-inv.honey,s.inventory.fertilizer-inv.fertilizer,s.inventory.feed-inv.feed],[3,3,1,1]);
 for(const [i,k] of STOPS.entries())assert.equal(s.activities.cooldowns[k],now+i*5000+3*700+18*MIN,`${k} is back 18 minutes after its job`);
 assert.throws(()=>act(s,{type:'activity_start',station:'greenhouse'},now+17*MIN),/returns in/);
 assert.ok(act(s,{type:'activity_start',station:'greenhouse'},now+18*MIN+2100));
});

test('the hand pays at most 240 XP and 250 coins an hour at every level, as from level 8 before; the rest of the game is unchanged',()=>{
 for(let level=3;level<=40;level++){
  const s=at(level),all=STOPS.map(k=>activityStatus(s,k,now)),bonus=activityRoundReward(s),rest=all[0].cooldown;
  assert.equal((all.reduce((n,a)=>n+a.xp,0)+bonus.xp)*HOUR/rest,240,`level ${level}: XP an hour`);
  assert.equal(bonus.coins*HOUR/rest,250,`level ${level}: coins an hour`);
 }
 // From level 10 nothing changes, so events (from 15) and families (from 10) see the same stops as before.
 for(const level of [10,15,30])for(const k of STOPS){const a=activityStatus(at(level),k,now);assert.deepEqual([a.cooldown,a.xp,a.share],[HOUR,ACTIVE_STATIONS[k].xp,1],`${level} ${k}`);}
 assert.deepEqual(activityRoundReward(at(15)),{...ACTIVITY_ROUND_REWARD});
});

test('older (legacy) farms keep the full amounts at every level',()=>{
 for(const level of [1,3,5,9]){
  const s=at(level,createLegacyFarm);assert.equal(handShare(s),1);assert.deepEqual(activityRoundReward(s),{coins:250,xp:60});
  for(const k of STOPS){const a=activityStatus(s,k,now);assert.deepEqual([a.cooldown,a.xp],[HOUR,ACTIVE_STATIONS[k].xp],`legacy ${level} ${k}`);}
 }
 const s=at(4,createLegacyFarm),xp=s.xp;STOPS.forEach((k,i)=>job(s,k,now+i*5000));assert.equal(s.xp-xp,240);
});

test('the level that counts is the one before the job\'s XP; a stop that already rests keeps its time',()=>{
 // One XP short of level 4: the job pays level 3's 13 XP and rests 18 minutes, though it brings the farm to level 4.
 const s=at(4);s.xp-=1;normalizeFarm(s,now);assert.equal(levelOf(s),3);
 const r=job(s,'greenhouse',now);assert.equal(r.xp,13);assert.equal(levelOf(s),4);assert.equal(s.activities.cooldowns.greenhouse,now+2100+18*MIN);
 // The fourth stop of a round that levels the farm up pays the round bonus of the level it started at.
 const t=at(5);for(const [i,k] of STOPS.slice(0,3).entries())job(t,k,now+i*5000);
 t.xp=xpForLevel(6)-5;normalizeFarm(t,now);assert.equal(levelOf(t),5);
 const last=job(t,'workshop',now+20000);assert.ok(last.roundComplete);assert.deepEqual([last.xp,last.coins],[24+30,125]);assert.equal(levelOf(t),6);
 // A level-8 farm that rested a stop for an hour before this change keeps that hour; the next job rests 48 minutes.
 const old=at(8);old.activities.cooldowns.paddock=now+50*MIN;const saved=structuredClone(old);normalizeFarm(old,now+MIN);
 assert.equal(old.activities.cooldowns.paddock,saved.activities.cooldowns.paddock);assert.equal(activityStatus(old,'paddock',now+MIN).remaining,49*MIN);
 job(old,'paddock',now+50*MIN);assert.equal(old.activities.cooldowns.paddock,now+50*MIN+2100+48*MIN);
});

test('the hand\'s quests and challenges open at level 3; quests and challenges that use fertilizer still wait for the Windmill',()=>{
 const quest=title=>QUESTS.find(q=>q.title===title),daily=title=>DAILY_POOLS.flat().find(q=>q.title===title);
 for(const title of ['A helping hand everywhere','A taste of honey','Around the farm']){assert.equal(availableDaily(at(2),quest(title)),false,title);assert.equal(availableDaily(at(3),quest(title)),true,title);}
 // The paddock's fertilizer is used in the Windmill's window: before 11 Oct 2026 the hand opened at 8, after the Windmill (6).
 const gentle=quest('A gentler way to grow'),soil=daily('A soil boost');
 for(const level of [3,4,5]){const s=at(level);assert.equal(buildingEligible(s,'windmill'),false);assert.equal(availableDaily(s,gentle),false,`quest at ${level}`);assert.equal(availableDaily(s,soil),false,`challenge at ${level}`);}
 assert.equal(availableDaily(at(6),gentle),true);assert.equal(availableDaily(at(6),soil),true);
});

test('guide step 9 is A helping hand on a guided farm: one finished job, any stop; the step numbers stay the same',()=>{
 const s=createFarm(now);
 assert.deepEqual(beginnerProgress(s,now).map(q=>q.id),['harvest','sell','plant','water','produce','gift','sell_egg','tend','hand','collect']);
 const hand=beginnerProgress(s,now)[8];
 assert.deepEqual([hand.title,hand.guide,hand.description],['A helping hand','hand','Help at the Greenhouse: water the three dry seedlings. Every stop on the farm has a small job like this.']);
 assert.equal(BEGINNER_QUESTS.length,10);assert.deepEqual(beginnerProgress(createLegacyFarm(now),now).map(q=>q.id).slice(6,9),['chore','tend','wheat'],'older farms keep their steps');
 // A farm in the middle of the guide, at step 9 with the wheat already in: it now needs a helping-hand job.
 const mid=at(5);mid.onboarding={completed:8,milestones:Object.fromEntries(['harvest','sell','plant','water','produce','gift','sell_egg','tend','wheat'].map(k=>[k,true])),rewardClaimed:false};
 const xp=mid.xp;act(mid,{type:'field',id:0,action:'harvest'},now);assert.equal(mid.onboarding.completed,8,'the wheat does not finish it');
 const r=job(mid,'paddock',now+1000);assert.equal(mid.onboarding.completed,9);assert.equal(r.guide[0].step,'hand');assert.equal(r.guide[0].xp,BEGINNER_STEP_XP);
 assert.ok(mid.onboarding.stepAt.hand);assert.ok(mid.xp>xp);
 // Step 10 and the 50 diamonds as before.
 const eggs=act(mid,{type:'produce',recipe:'eggs'},now+2000);act(mid,{type:'collect',building:'coop'},eggs.readyAt);
 const diamonds=mid.diamonds,claim=act(mid,{type:'beginner_claim',id:'collect'},eggs.readyAt);
 assert.deepEqual([claim.completed,claim.diamonds,claim.xp],[10,BEGINNER_REWARD,BEGINNER_STEP_XP]);assert.equal(mid.diamonds-diamonds,BEGINNER_REWARD+(claim.levelReward?.diamonds??0));
 // A farmer who already lent a hand before step 9 finds it done at once.
 const early=at(4);job(early,'apiary',now);assert.equal(early.onboarding.milestones.hand,true);
 // Every farmer is at least level 4 at step 9 (eight steps of 15 XP), so the hand is always open there.
 assert.ok(levelOf({xp:8*BEGINNER_STEP_XP,xpOffset:0,xpCurve:createFarm(now).xpCurve})>=FEATURE_LEVELS.activities+1);
 // Older farms do not get the milestone written into their finished guide, and legacy farms never need it.
 const done=at(12);done.onboarding.rewardClaimed=true;done.onboarding.completed=10;job(done,'greenhouse',now);assert.equal(done.onboarding.milestones.hand,undefined);
 const legacy=at(5,createLegacyFarm);job(legacy,'greenhouse',now);assert.equal(legacy.onboarding.milestones.hand,undefined);
});

test('Show me for step 9 moves the view to the Greenhouse and points at its pin, or on a phone through More; without either it opens the stops',()=>{
 globalThis.getComputedStyle??=()=>({visibility:'visible',display:'block'});
 const el=()=>({isConnected:true,getBoundingClientRect:()=>({left:10,top:10,width:40,height:40,right:50,bottom:50}),getClientRects:()=>[1],closest:()=>null});
 const doc=map=>({querySelector:sel=>map[sel]??null,querySelectorAll:sel=>map[sel]?[map[sel]]:[]}),win={innerWidth:900,innerHeight:500},state=createFarm(now);
 const pin=el(),tile=el();
 const map=guideSteps('hand',{state,now,doc:doc({'.activity-label[data-activity="greenhouse"]':pin,'#activities-dialog[open] .activity-tile.needs-care':tile}),win});
 assert.deepEqual(map.map(s=>s.text),['Tap the Greenhouse.','Tap each one that needs help.']);assert.equal(map[0].find(),pin);assert.equal(map[1].find(),tile);
 const more=el(),entry=el(),card=el();
 const phone=guideSteps('hand',{state,now,doc:doc({'#more-button':more,'#more-dialog[open] [data-menu-utility="activities"]':entry,'#activities-hub-dialog[open] [data-open-station="greenhouse"]':card}),win});
 assert.deepEqual(phone.map(s=>s.text),['Tap More.','Tap A helping hand.','Open the Greenhouse.','Tap each one that needs help.']);
 assert.equal(phone[0].find(),more);assert.equal(phone[1].find(),entry);assert.equal(phone[2].find(),card);
 assert.equal(guideSteps('hand',{state,now,doc:doc({}),win}),null);
 const game=read('public/game.js');
 assert.match(game,/else if\(target==='hand'\)\{const v=farmLife\?\.views\.get\('greenhouse'\);if\(v&&!villageWorld\)\{lookAt\(v\.x,v\.z\);positionBuildingLabels\(\);\}const steps=guideSteps\('hand',\{state,now:farmNow\(\)\}\);if\(steps\)coach\.start\(steps,\{auto\}\);else if\(!auto\)activities\.openHub\(\);\}\n[^\n]*\n[^\n]*\n else if\(guideSteps\(target/,'the view moves to the Greenhouse first, then Show me points (in showWay since Part A; never a window by itself)');
 assert.match(read('public/farm-life.js'),/label\.className='activity-label';label\.dataset\.activity=id;/);
 assert.match(read('public/beginner-ui.js'),/hand:'Help at the Greenhouse'/);
 assert.match(read('src/analytics.js'),/'tend','wheat','hand','collect'\]/);
});

test('the hub shows this farm\'s own amounts and the rule in one line below level 10; a ready pin hops, no popup',()=>{
 const ui=read('public/activities-ui.js');
 assert.match(ui,/const bonus=activityRoundReward\(state\);/);assert.match(ui,/All four stops: \+\$\{bonus\.coins\} coins · \+\$\{bonus\.xp\} XP/);
 assert.match(ui,/if\(handShare\(state\)>=1\)return '';/,'the rule line only while it applies');
 assert.match(ui,/Stops grow with your farm: now each rests \$\{Math\.round\(HAND_REST_PER_LEVEL\*levelOf\(state\)\/60000\)\} minutes after its job\. Every level adds 6 minutes and a little more XP, up to 1 hour and the full reward at level \$\{HAND_FULL_LEVEL\}\./);
 assert.match(ui,/\$\('activities-hub-round'\)\.innerHTML=roundStrip\(all,round\)\+growRule\(\);/);
 assert.match(ui,/const paid=action\.type==='activity_work'\?\{xp:activityStatus\(state,action\.station,farmNow\(\)\)\.xp,bonus:activityRoundReward\(state\)\}:null;/,'what a job paid, at the level before its XP');
 assert.doesNotMatch(ui,/ACTIVITY_ROUND_REWARD/,'no fixed round bonus on screen');
 const life=read('public/farm-life.js'),css=read('public/farm-life.css');
 assert.match(life,/else if\(!v\.hopped&&!covered&&seen\(v\.label\)\)\{v\.hopped=true;if\(!reducedMotion\)\{v\.label\.classList\.remove\('just-ready'\);void v\.label\.offsetWidth;v\.label\.classList\.add\('just-ready'\);\}\}/);
 assert.match(css,/\.activity-label\.just-ready\{animation:activity-ready-hop \.9s ease-in-out 2\}/);assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{\.activity-label\.just-ready\{animation:none\}\}/);
 const wiki=read('public/wiki-content.js');
 assert.match(wiki,/Until level \$\{HAND_FULL_LEVEL\} the stops grow with your farm: a stop rests \$\{HAND_REST_PER_LEVEL\/60000\} minutes for every level of your farm/);
});

// 11 Oct 2026 review of part B. A job that levels the farm up (at levels 3 to 6 a round is about one level) showed three sets of
// numbers: the stop's reward line already at the next level, the result with what was paid, and the round strip with the next round's
// bonus. The result is now the only one: the reward line goes while it shows, and so does the strip's bonus after a round.
function fakeDom(){
 const els=new Map(),el=id=>({id,innerHTML:'',textContent:'',open:false,targets:[],showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},querySelector:()=>null,
  querySelectorAll(sel){return sel!=='[data-activity-target]'?[]:this.targets=[...this.innerHTML.matchAll(/data-activity-target="(\d+)"/g)].map(m=>({dataset:{activityTarget:m[1]}}));}});
 globalThis.document={getElementById:id=>els.get(id)??els.set(id,el(id)).get(id),querySelector:()=>null,querySelectorAll:sel=>sel==='dialog[open]'?[...els.values()].filter(e=>e.open):[]};
 return els;
}
test('a job that levels the farm up shows what it paid, once: no reward line beside the result, no next round\'s bonus after a round',async()=>{
 const t=Date.now()-120000,s=createFarm(t);s.xp=xpForLevel(3);s.xpOffset=0;normalizeFarm(s,t);
 job(s,'greenhouse',t);job(s,'apiary',t+5000);job(s,'paddock',t+10000);
 const {startedAt}=act(s,{type:'activity_start',station:'workshop'},t+15000),targets=s.activities.jobs.workshop.targets;
 targets.slice(0,2).forEach((target,i)=>act(s,{type:'activity_work',station:'workshop',startedAt,target},t+16000+i*1000));
 s.xp=xpForLevel(4)-5;assert.equal(levelOf(s),3);
 const paid=activityStatus(s,'workshop',Date.now()).xp,bonus=activityRoundReward(s);
 const els=fakeDom();
 try{
  const {createActivitiesUI}=await import('../public/activities-ui.js');
  const ui=createActivitiesUI({state:s,runAction:async a=>act(s,a,Date.now()),notify:()=>{}}),panel=els.get('activity-work')??document.getElementById('activity-work');
  ui.open('workshop');
  assert.match(panel.innerHTML,new RegExp(`class="activity-reward">.*<b>\\+${paid} XP</b>`),'while working, the line says what the job pays');
  assert.match(els.get('activity-round').innerHTML,new RegExp(`All four stops: \\+${bonus.coins} coins`));
  await panel.targets.find(b=>Number(b.dataset.activityTarget)===targets[2]).onclick();
  const next=activityStatus(s,'workshop',Date.now()).xp,nextBonus=activityRoundReward(s);
  assert.equal(levelOf(s),4);assert.notEqual(next,paid);assert.notEqual(nextBonus.coins,bonus.coins);
  assert.match(panel.innerHTML,/Round complete!/);
  assert.doesNotMatch(panel.innerHTML,/class="activity-reward"/,'no reward line beside the result');
  assert.match(panel.innerHTML,new RegExp(`\\+${paid} XP</span>`),'the job\'s chip says what it paid');assert.doesNotMatch(panel.innerHTML,new RegExp(`\\+${next} XP`));
  assert.match(panel.innerHTML,new RegExp(`Round bonus: \\+${bonus.coins} coins · \\+${bonus.xp} XP`),'the bonus that was paid');
  assert.doesNotMatch(els.get('activity-round').innerHTML,/All four stops/,'the strip leaves out the next round\'s bonus while the result shows');
  // The next stop: the reward line and the strip's bonus are back, at the new level.
  ui.open('greenhouse');
  assert.match(panel.innerHTML,/class="activity-reward"/);assert.match(els.get('activity-round').innerHTML,new RegExp(`All four stops: \\+${nextBonus.coins} coins · \\+${nextBonus.xp} XP`));
 }finally{delete globalThis.document;}
});

// The pin's hop waits until the pin can be seen: on screen, no window open, nothing on top of it (at level 3 it hopped under the level-up
// card; on a computer the one pin on screen sat under the diamonds).
test('a ready pin hops once it can be seen, once per ready time',()=>{
 const life=read('public/farm-life.js'),src=life.slice(life.indexOf(' // A pin is seen when'),life.indexOf(' function watchProduction('));
 const label={style:{},hidden:false,adds:0,offsetWidth:40,contains:el=>el===label,getBoundingClientRect:()=>({left:100,top:100,width:44,height:44}),classList:{set:new Set(),toggle(c,on){on?this.set.add(c):this.set.delete(c);},remove(c){this.set.delete(c);},add(c){this.set.add(c);if(c==='just-ready')label.adds++;}}};
 let screenX=0,dialogOpen=true,onTop=label,status={remaining:0,job:null};
 const THREE={Vector3:class{project(){return {x:screenX,y:0};}}},views=new Map([['greenhouse',{object:{position:{x:0,z:0}},height:1,label}]]);
 const position=new Function('THREE','views','activityStatus','featureUnlocked','state','reducedMotion','document',`${src}\nreturn position;`)(THREE,views,()=>status,()=>true,{},false,{querySelector:()=>dialogOpen?{}:null,elementFromPoint:(x,y)=>x===122&&y===122?onTop:null});
 const frame=()=>position({},1280,800,0);
 frame();assert.equal(label.adds,0,'not under the level-up card');
 dialogOpen=false;onTop={};frame();assert.equal(label.adds,0,'not under the top bar');
 onTop=label;frame();assert.equal(label.adds,1,'in sight: it hops');frame();frame();assert.equal(label.adds,1,'then it stands still');
 status={remaining:60000,job:null};frame();screenX=2;status={remaining:0,job:null};frame();assert.equal(label.hidden,true);assert.equal(label.adds,1,'ready again, but off screen');
 screenX=.5;frame();assert.equal(label.adds,2,'panned into view: it hops');
 status={remaining:0,job:{}};frame();status={remaining:0,job:null};dialogOpen=true;frame();assert.equal(label.adds,2);dialogOpen=false;frame();assert.equal(label.adds,3,'after a job and its rest');
});

// 19 Oct 2026, the owner: "Haal het bolletje icon weg bij helping hand als je hem al hebt gedaan, mensen klikken erop die dan een timer
// krijgen": a stop that rests has no pin; a started job keeps its pin, and the pin hops back when the rest ends.
test('a resting stop has no pin on the farm; a started job keeps it, and the ready pin comes back with its hop',()=>{
 const life=read('public/farm-life.js');
 assert.match(life,/const resting=s\.remaining>0&&!s\.job;\n   v\.label\.hidden=!featureUnlocked\(state,'activities'\)\|\|resting\|\|Math\.abs\(p\.x\)>\.94\|\|Math\.abs\(p\.y\)>\.86;/);
 // The hop needs the pin seen, and ready (no rest, no job) clears it while resting, so the pin hops when it shows again.
 assert.match(life,/const ready=featureUnlocked\(state,'activities'\)&&!s\.remaining&&!s\.job;\n   if\(!ready\)v\.hopped=false;/);
 // The stop itself still opens its window (its hit box is unchanged).
 assert.match(life,/hit\.userData\.activity=id;scene\.add\(hit\);/);
});
