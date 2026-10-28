// World III, The Harbour (levels 200-300): its numbers as the wiki and the tests read them (27 Oct 2026). The rules themselves are in
// farm-state.js (HARBOUR_GOODS, the harbour places in BUILDINGS, their recipes, HARBOUR_WORKS, HARBOUR_QUESTS, ship orders), where the
// server checks them; this file only lays them out by level and by good, for the wiki's tables.
import {RECIPES,RECIPE_LEVELS,BUILDINGS,worldThreeBuilding,HARBOUR_WORKS} from './farm-state.js';
export {HARBOUR_WAREHOUSE,WORLD_THREE_LEVEL,WORLD_THREE_TOP,SHIP_XP_SHARE,SHIP_RETURN,SHIP_TUG_RETURN,shipValue,CONTAINER_SHIP,WORLD_VOYAGE,HARBOUR_WEEK,HARBOUR_GOODS,HARBOUR_WORKS,HARBOUR_WORK_XP,HARBOUR_QUESTS,harbourQuestPicture} from './farm-state.js';
// A ship's pay and the quays by the level their works open at (the wiki's table: a farmer who builds each work as it opens).
const workLevel=id=>HARBOUR_WORKS.find(w=>w.id===id).level;
export const shipPremium=level=>level>=workLevel('crane2')?2.2:level>=workLevel('crane1')?2.1:2;
export const shipQuays=level=>level>=workLevel('quay3')?3:level>=workLevel('quay2')?2:1;
// The harbour's places and their recipes, by the good each makes.
export const HARBOUR_PLACES=Object.freeze(Object.fromEntries(Object.entries(BUILDINGS).filter(([k])=>worldThreeBuilding(k)).map(([k,b])=>[k,Object.freeze({name:b.name,level:b.minLevel})])));
export const HARBOUR_RECIPES=Object.freeze(Object.fromEntries(Object.entries(RECIPES).filter(([,r])=>worldThreeBuilding(r.building)).map(([id,r])=>[Object.keys(r.output)[0],Object.freeze({place:r.building,level:RECIPE_LEVELS[id],input:r.input,output:r.output,duration:r.duration,xp:r.xp})])));
