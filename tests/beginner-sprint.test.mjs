import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,rookieLeft,rookieBoost,ROOKIE_MS,ROOKIE_TIMER_BOOST,cropDuration,recipeDuration,keptStock,sellableStock,STARTER_KEEP,STARTER_ITEMS,CROPS,ITEMS,QUESTS,STARTER_QUESTS,QUEST_XP,levelOf,levelReward,xpForLevel} from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
import {questGroups} from '../public/quests-ui.js';
import {rookieBadge,rookieLabel,rookieTimeLeft} from '../public/rookie-ui.js';
import {ART_KEYS} from '../public/visual-icons.js';
const now=Date.UTC(2026,8,22,12),MIN=60000;
const read=name=>readFileSync(new URL(`../public/${name}`,import.meta.url),'utf8');
const emptyPlot=s=>s.plots.findIndex(p=>!p.crop);

test('a new farm gets a 30 minute sprint from its creation, in plain clock time',()=>{
 const s=createFarm(now);
 assert.equal(ROOKIE_MS,30*MIN);assert.equal(ROOKIE_TIMER_BOOST,.8);assert.equal(s.rookieUntil,now+ROOKIE_MS);
 assert.equal(rookieBoost(s,now),.8);assert.equal(rookieBoost(s,now+30*MIN-1),.8);assert.equal(rookieBoost(s,now+30*MIN),.8);
 assert.equal(rookieLeft(s,now+10*MIN),20*MIN);assert.equal(rookieLeft(s,now+45*MIN),0);
 // Nothing else moves it: not actions, not pauses, not the level.
 act(s,{type:'field',id:0,action:'harvest'},now+MIN);s.xp=1e6;assert.equal(s.rookieUntil,now+ROOKIE_MS);
 const old=structuredClone(s);delete old.rookieUntil;normalizeFarm(old,now);
 assert.equal(rookieBoost(old,now),0,'farms from before this update have no sprint');assert.equal(old.rookieUntil,undefined);
 for(const bad of [-5,NaN,'soon',1.5,null,Infinity]){const t=createFarm(now);t.rookieUntil=bad;normalizeFarm(t,now);assert.equal(t.rookieUntil,0,String(bad));assert.equal(rookieBoost(t,now),0);}
 const legacy=createLegacyFarm(now);assert.equal(rookieBoost(legacy,now),0);assert.equal(keptStock(legacy,'corn',now),0);
 assert.equal(cropDuration(legacy,'corn',false,now),CROPS.corn.duration);
});

test('inside the sprint crops, batches and Care take 80% less time; afterwards everything is normal and running things keep their time',()=>{
 const s=createFarm(now),legacy=createLegacyFarm(now);
 assert.equal(cropDuration(s,'corn',false,now),CROPS.corn.duration*.2);assert.equal(cropDuration(s,'corn',false,now+120*MIN),CROPS.corn.duration);
 assert(Math.abs(recipeDuration(s,'eggs',now)-recipeDuration(legacy,'eggs',now)*.2)<=1);
 assert.equal(recipeDuration(s,'eggs',now+120*MIN),recipeDuration(legacy,'eggs',now));
 const a=emptyPlot(s),b=a+1;
 act(s,{type:'field',id:a,action:'plant',crop:'corn'},now+MIN);act(s,{type:'field',id:b,action:'plant',crop:'wheat'},now+MIN);
 assert.equal(s.plots[a].readyAt-(now+MIN),180000,'corn 15 min -> 3 min');assert.equal(s.plots[a].careAt-(now+MIN),54000,'Care 270 s -> 54 s');
 assert.equal(s.plots[b].readyAt-(now+MIN),24000);assert.equal(s.plots[b].careAt-(now+MIN),7200,'wheat Care comes at 7.2 s, well inside its 24 s');
 act(s,{type:'field',id:b,action:'tend'},now+MIN+8000);assert.equal(s.plots[b].tended,true);
 // After the sprint: the normal 15 minutes and 270 seconds. The corn planted inside it keeps its 3 minutes.
 const late=now+121*MIN;act(s,{type:'field',id:8+2,action:'plant',crop:'corn'},late);
 assert.equal(s.plots[10].readyAt-late,900000);assert.equal(s.plots[10].careAt-late,270000);
 assert.equal(s.plots[a].readyAt,now+MIN+180000);
 // Care never comes after the crop is ready, not even with the boost.
 for(const key of Object.keys(CROPS))assert(cropDuration(s,key,false,now)*.3>=6000&&Math.max(6000,cropDuration(s,key,false,now)*.3)<cropDuration(s,key,false,now),key);
});

test('starter corn, animal feed and barley cannot be sold in the first 30 minutes; what grows on top can, and afterwards everything can',()=>{
 const s=createFarm(now);
 assert.deepEqual(STARTER_KEEP,{corn:8,feed:10,barley:6});assert.deepEqual(s.keep,STARTER_KEEP);assert.equal(s.inventory.corn,STARTER_ITEMS.corn);assert.equal(s.inventory.barley,6);
 assert.equal(keptStock(s,'corn',now),8);assert.equal(sellableStock(s,'corn',now),0);assert.equal(keptStock(s,'feed',now),10);assert.equal(keptStock(s,'barley',now),6);assert.equal(keptStock(s,'wheat',now),0,'only corn, feed and barley are kept');
 const before=structuredClone(s);
 assert.throws(()=>act(s,{type:'sell',item:'corn',quantity:1},now),/Keep your first 8 corn.*first 30 minutes/);
 assert.throws(()=>act(s,{type:'sell',item:'feed',quantity:1},now),/Keep your first 10 animal feed/);
 assert.throws(()=>act(s,{type:'sell',item:'barley',quantity:1},now),/Keep your first 6 barley.*first 30 minutes/);
 assert.throws(()=>act(s,{type:'sell',item:'corn'},now),/starting corn is kept.*30 minutes/);
 assert.deepEqual(s,before,'a refused sale changes nothing');
 // Selling a whole tab sells everything but the kept goods; a tab with only kept goods says so, naming every one of them.
 const sold=act(s,{type:'sell',category:'crops'},now);assert(sold.coins>0);assert.equal(s.inventory.corn,8);assert.equal(s.inventory.barley,6);assert.equal(s.inventory.wheat,0);
 assert.throws(()=>act(s,{type:'sell',category:'goods'},now),/starting animal feed is kept/);assert.equal(s.inventory.feed,10);
 const onlyKept=createFarm(now);onlyKept.inventory.wheat=0;
 assert.throws(()=>act(onlyKept,{type:'sell',category:'crops'},now),/starting corn and barley are kept.*30 minutes/);
 // What is grown on top is free to sell; the kept part stays.
 s.inventory.corn=8+3;assert.equal(sellableStock(s,'corn',now),3);
 assert.throws(()=>act(s,{type:'sell',item:'corn',quantity:4},now),/Keep your first 8 corn/);
 act(s,{type:'sell',item:'corn',quantity:3},now);assert.equal(s.inventory.corn,8);
 // Using some in the first steps shrinks what is kept: it is never more than what is in the barn.
 s.inventory.corn=5;assert.equal(keptStock(s,'corn',now),5);assert.equal(sellableStock(s,'corn',now),0);
 // After 30 minutes it is all free.
 s.inventory.corn=8;const late=now+30*MIN;assert.equal(keptStock(s,'corn',late),0);
 assert.equal(act(s,{type:'sell',item:'corn',quantity:8},late).coins>0,true);assert.equal(s.inventory.corn,0);
 // Not for old farms, and the list is cleaned.
 const legacy=createLegacyFarm(now);assert.equal(sellableStock(legacy,'corn',now),legacy.inventory.corn);
 const messy=createFarm(now);messy.keep={corn:-1,feed:'x',unknown:3,eggs:2.5,milk:4};normalizeFarm(messy,now);assert.deepEqual(messy.keep,{milk:4});
});

test('every level pays at least one diamond, so the first level-ups are never empty-handed',()=>{
 for(let level=2;level<=60;level++)assert(levelReward(level).diamonds>=1,`level ${level}`);
 assert.deepEqual([2,3,4,5,9].map(l=>levelReward(l).diamonds),[1,1,1,1,1]);assert.deepEqual([10,15,20].map(l=>levelReward(l).diamonds),[2,3,4]);
 const s=createFarm(now);s.xp=14;const before=s.diamonds;
 act(s,{type:'field',id:0,action:'harvest'},now);
 assert.equal(levelOf(s),2);assert.equal(s.diamonds,before+1,'level 2 already pays a diamond');
});

test('twenty starter quests are appended after the old ones: small, unique and built on counters the game already keeps',()=>{
 const starters=QUESTS.slice(STARTER_QUESTS.first,STARTER_QUESTS.first+STARTER_QUESTS.count);
 assert.equal(STARTER_QUESTS.first,130);assert.equal(starters.length,STARTER_QUESTS.count);assert.equal(starters.length,20);assert.equal(QUESTS.length,192);
 assert.equal(QUESTS[STARTER_QUESTS.first+STARTER_QUESTS.count].title,'A buzzing corner','the midgame quests come after the starters');
 assert.equal(QUESTS[129].title,'Pumpkin master','the old quests did not move');
 assert.equal(new Set(QUESTS.map(q=>q.title)).size,QUESTS.length,'every title is unique');
 const known=new Set(QUESTS.slice(0,STARTER_QUESTS.first).map(q=>q.stat));
 for(const q of starters){
  assert(Number.isInteger(q.target)&&q.target>0&&q.target<=300,q.title);assert(Number.isInteger(q.reward)&&q.reward>=20&&q.reward<=60,q.title);
  assert.equal(q.xp,0,`${q.title} pays coins only`);
  assert(known.has(q.stat)||(q.stat.startsWith('made_')&&ITEMS[q.stat.slice(5)]),`${q.title}: ${q.stat} is a counter that already exists`);assert(/^[\w ,.’-]+$/.test(q.title)&&q.description.endsWith('.'),q.title);
 }
 assert.equal(starters.reduce((n,q)=>n+q.reward,0),710);
 // Every older quest still pays the usual 15 XP.
 assert(QUESTS.slice(0,STARTER_QUESTS.first).every(q=>q.xp===undefined));assert.equal(QUEST_XP,15);
 const old=createFarm(now);old.stats.harvested=3;assert.equal(act(old,{type:'quest',id:0},now).xp,15);
 assert.match(readFileSync(new URL('../game/farm-state.js',import.meta.url),'utf8'),/state\.stats\['made_'\+k\]/,'every collected item has its own made_ counter');
});

test('a new farmer sees the quickest starter quests first, three at a time, and ticks them off for coins only',()=>{
 const s=createFarm(now);
 assert.deepEqual(questGroups(s).active.map(x=>x.quest.title),['Thirsty crops','First seeds','First customers']);
 assert.equal(questGroups(s).ready.length,0);
 for(let i=0;i<3;i++){const id=emptyPlot(s);act(s,{type:'field',id,action:'plant',crop:'wheat'},now);act(s,{type:'field',id,action:'water'},now);}
 const ready=questGroups(s).ready.map(x=>x.quest.title);assert(ready.includes('Thirsty crops')&&ready.includes('First seeds'),ready.join());
 const thirsty=QUESTS.findIndex(q=>q.title==='Thirsty crops'),coins=s.coins,xp=s.xp;
 const r=act(s,{type:'quest',id:thirsty},now);
 assert.equal(r.coins,20);assert.equal(r.xp,0,'starter quests pay coins, never XP');assert.equal(s.xp,xp);assert.equal(r.levelReward,undefined);assert.equal(s.coins,coins+20);
 assert.throws(()=>act(s,{type:'quest',id:thirsty},now),/already/);
 const titles=questGroups(s).active.map(x=>x.quest.title);assert.equal(titles.length,3);assert(!titles.includes('Thirsty crops'));
 s.xp=xpForLevel(6);assert.equal(levelOf(s),6);assert.equal(questGroups(s).active.length,5,'five at a time from level 6');
 const legacy=createLegacyFarm(now);assert.equal(questGroups(legacy).ready.length+questGroups(legacy).active.length+questGroups(legacy).done.length,QUESTS.length);
});

test('the hourglass sits next to the diamonds like the Family button, opens a screen that closes, and has its own icon',()=>{
 const html=read('farm.html'),diamonds=html.indexOf('id="diamond-button"'),rookie=html.indexOf('id="rookie-button"'),family=html.indexOf('id="family-button"');
 assert(diamonds>0&&rookie>diamonds&&family>rookie,'diamonds, hourglass, family');
 assert.match(html.slice(rookie,html.indexOf('</button>',rookie)),/data-rookie-open[\s\S]*hidden[\s\S]*data-game-art="hourglass"[\s\S]*id="rookie-time"/);
 assert.match(read('assets/icons/hourglass.svg'),/^<svg[\s\S]*<\/svg>\s*$/);assert(ART_KEYS.includes('hourglass'));
 const ui=read('rookie-ui.js');assert.match(ui,/showModal/);assert.match(ui,/data-rookie-close/);assert.match(ui,/aria-labelledby/);assert.match(ui,/\[data-rookie-open\]/);
 assert.match(read('game.js'),/createRookieUI\(\{state\}\)/);assert.match(read('game.js'),/rookie\.tick\(\)/);assert.match(read('game.js'),/rookie\?\.refresh\(\)/);
 const css=read('ui-polish.css');assert.match(css,/#rookie-button/);assert.match(css,/:has\(#rookie-button:not\(\[hidden\]\)\):has\(#family-button:not\(\[hidden\]\)\)/,'room for both buttons on a phone');
 assert.match(read('economy-ui.js'),/sellableStock\(state,key,now\)/);assert.match(read('economy-ui.js'),/kept, free in/);
});

test('the hourglass says how long is left and that it is temporary',()=>{
 assert.equal(rookieBadge(24*MIN-1),'24m');assert.equal(rookieBadge(30*MIN),'30m');assert.equal(rookieBadge(30000),'<1m');
 assert.equal(rookieTimeLeft(45000),'45s');assert.equal(rookieTimeLeft(24*MIN-1),'24 min');
 assert.equal(rookieLabel(24*MIN-1),'80% shorter waiting · 24 min left');
 assert.match(read('rookie-ui.js'),/minutes after you started your farm/);assert.match(read('rookie-ui.js'),/Beginner boost ended/);
});
