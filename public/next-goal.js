import {BUILDINGS,questXp,buildingEligible,buildingUnlocked,buildingCost,constructionNeeds,worldTwoBuilding,levelProgress} from './farm-state.js';
import {questGroups} from './quests-ui.js';
import {nextUnlock} from './progression-ui.js';
// The next goal after the Beginner guide (11 Oct 2026, Part A A8 and A13): after step 10 there was no goal on screen, 9 or more finished
// quests waited unclaimed and wheat paid 2 XP a minute against 130 XP for level 6. One goal at a time, the first of:
// 1. a quest ready to claim (the first in Quests' own order),
// 2. a building that opened and can be paid for now (the cheapest first; never a place of the village, which is built from a golden brief),
// 3. the open quest closest to done,
// 4. what the next level opens, with the XP bar.
// A quest is claimed on its own, one tap per quest (never all at once): the card then shows the next goal. It only shows what is already
// in the game; it pays nothing itself.
// What a quest counts → where Show me points (public/guide-steps.js and the guide's own targets in game.js).
const QUEST_GUIDE={harvested:'harvest',planted:'plant',watered:'water',tended:'tend',earned:'market',sold:'market',produced:'produce',made_eggs:'produce',collected:'collect'};
export const questGuide=stat=>QUEST_GUIDE[stat]??(/^harvest_/.test(stat??'')?'harvest':null);
export function nextGoal(state){
 const groups=questGroups(state),ready=groups.ready[0];
 if(ready)return {kind:'quest',id:ready.id,title:ready.quest.title,stat:ready.quest.stat,coins:ready.quest.reward,xp:questXp(ready.quest),ready:groups.ready.length};
 const build=Object.keys(BUILDINGS).filter(key=>!worldTwoBuilding(key)&&buildingEligible(state,key)&&!buildingUnlocked(state,key)&&buildingCost(state,key)>0&&buildingCost(state,key)<=state.coins&&!constructionNeeds(state,key).length)
  .sort((a,b)=>buildingCost(state,a)-buildingCost(state,b)||a.localeCompare(b))[0];
 if(build)return {kind:'build',key:build,name:BUILDINGS[build].name,cost:buildingCost(state,build)};
 const near=[...groups.active].sort((a,b)=>b.value/b.quest.target-a.value/a.quest.target||a.quest.reward-b.quest.reward||a.id-b.id)[0];
 if(near)return {kind:'progress',id:near.id,title:near.quest.title,stat:near.quest.stat,value:near.value,target:near.quest.target,guide:questGuide(near.quest.stat)};
 const next=nextUnlock(state),lp=levelProgress(state);
 return {kind:'level',level:next?.level??lp.level+1,name:next?.name??'',art:next?.art??'xp',current:Math.max(0,lp.current),target:lp.target};
}
// A goal the farmer can act on right now (a quest to claim, a building to build): the phone's banner shows only these.
export const actNow=goal=>goal?.kind==='quest'||goal?.kind==='build';
