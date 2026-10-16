import {BUILDINGS,EARLY_FIELDS,STARTER_FIELDS,questXp,buildingEligible,buildingUnlocked,buildingCost,constructionNeeds,worldTwoBuilding,levelProgress,levelOf,productionJobs} from './farm-state.js';
import {questGroups,readyDailies} from './quests-ui.js';
import {farmNow} from './farm-client.js';
import {nextUnlock} from './progression-ui.js';
// The next goal after the Beginner guide (11 Oct 2026, Part A A8 and A13): after step 10 there was no goal on screen, 9 or more finished
// quests waited unclaimed and wheat paid 2 XP a minute against 130 XP for level 6. One goal at a time, the first of:
// 1. a quest ready to claim (the first in Quests' own order),
// 1b. a daily challenge ready to claim in Today (Plan F, 13 Oct 2026: on a phone Today sits in More, and many left one there),
// 2. a building that opened and can be paid for now (the cheapest first; never a place of the village, which is built from a golden brief),
// 2b. a field (9 to 12) that opened and can be paid for now (Plan F, proposal 3, 13 Oct 2026: at level 5 the median farmer had 1,335 coins
//    and 38 of 42 still had 8 fields), only while no building that opened is still to build (so a field of 150 never holds up the Windmill),
// 3. the open quest closest to done,
// 4. what the next level opens, with the XP bar.
// A quest is claimed on its own, one tap per quest (never all at once): the card then shows the next goal. It only shows what is already
// in the game; it pays nothing itself.
// 16 Oct 2026 (the owner): a quest or daily challenge also brings its description, what to do for it, for the card under its title.
// What a quest counts → where Show me points (public/guide-steps.js and the guide's own targets in game.js).
const QUEST_GUIDE={harvested:'harvest',planted:'plant',watered:'water',tended:'tend',earned:'market',sold:'market',produced:'produce',made_eggs:'produce',collected:'collect'};
export const questGuide=stat=>QUEST_GUIDE[stat]??(/^harvest_/.test(stat??'')?'harvest':null);
export function nextGoal(state,now=farmNow()){
 const groups=questGroups(state),ready=groups.ready[0];
 if(ready)return {kind:'quest',id:ready.id,title:ready.quest.title,description:ready.quest.description,stat:ready.quest.stat,coins:ready.quest.reward,xp:questXp(ready.quest),ready:groups.ready.length};
 // Its rewards as Today shows them (XP doubled while an XP boost runs); the card opens Today, where it is claimed.
 const dailies=readyDailies(state,now),daily=dailies[0];
 if(daily)return {kind:'daily',id:daily.id,title:daily.title,description:daily.description,stat:daily.stat,coins:daily.reward,diamonds:daily.diamonds,xp:daily.xp*(state.boosts?.xpUntil>now?2:1),ready:dailies.length};
 const open=Object.keys(BUILDINGS).filter(key=>!worldTwoBuilding(key)&&buildingEligible(state,key)&&!buildingUnlocked(state,key)&&buildingCost(state,key)>0);
 const build=open.filter(key=>buildingCost(state,key)<=state.coins&&!constructionNeeds(state,key).length).sort((a,b)=>buildingCost(state,a)-buildingCost(state,b)||a.localeCompare(b))[0];
 if(build)return {kind:'build',key:build,name:BUILDINGS[build].name,cost:buildingCost(state,build)};
 // The same field the Farmhouse sells next (farm-state.js expandFarm): its level reached, its coins in the bank.
 const field=EARLY_FIELDS[state.plots.length-STARTER_FIELDS];
 if(field&&!open.length&&levelOf(state)>=field.level&&state.coins>=field.coins)return {kind:'field',field:state.plots.length+1,cost:field.coins};
 const near=[...groups.active].sort((a,b)=>b.value/b.quest.target-a.value/a.quest.target||a.quest.reward-b.quest.reward||a.id-b.id)[0];
 if(near)return {kind:'progress',id:near.id,title:near.quest.title,description:near.quest.description,stat:near.quest.stat,value:near.value,target:near.quest.target,guide:questGuide(near.quest.stat)};
 const next=nextUnlock(state),lp=levelProgress(state);
 return {kind:'level',level:next?.level??lp.level+1,name:next?.name??'',art:next?.art??'xp',current:Math.max(0,lp.current),target:lp.target};
}
// A goal the farmer can act on right now (a quest or a daily challenge to claim, a building to build, a field to buy). On a phone the line
// shows any goal (Plan F, proposal 2: while the farm grows it says when everything is ready instead); a short computer window, which shows
// the line instead of the card, only these.
export const actNow=goal=>goal?.kind==='quest'||goal?.kind==='daily'||goal?.kind==='build'||goal?.kind==='field';
// When everything that grows on the farm is ready: the last crop on a field and the last batch in a building (0: nothing grows). The phone's
// line says it while the farmer waits (Plan F, proposal 2, 13 Oct 2026), and so does the end of the Beginner guide (game.js comeBackNote).
export function readyAllAt(state,now=farmNow()){
 const times=[...state.plots.filter(p=>p.crop&&p.readyAt>now).map(p=>p.readyAt),...Object.entries(state.buildings??{}).filter(([key])=>!worldTwoBuilding(key)).flatMap(([,b])=>productionJobs(b)).filter(j=>j.readyAt>now).map(j=>j.readyAt)];
 return times.length?Math.max(...times):0;
}
