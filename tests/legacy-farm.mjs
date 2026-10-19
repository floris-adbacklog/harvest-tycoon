// Existing regression scenarios model farms created before progressive unlocks.
// Preserve their original starting plots; new-player flow is covered separately in progression.test.mjs using the real createFarm export.
// Since 19 Oct 2026 features open at their level on every farm, older ones too: a test that plays a feature passes the level it needs
// ({level}); without one the farm is level 1, as before.
import {createFarm,normalizeFarm,CROPS,xpForLevel} from '../game/farm-state.js';
export function createLegacyFarm(now=Date.now(),{level}={}){
 const s=createFarm(now);s.progression={mode:'legacy'};if(level)s.xp=xpForLevel(level);
 // Farms from before started with 12 fields: 3 ripe corn, 2 growing wheat, then pumpkin, cabbage and sunflower, 4 empty.
 s.plots=Array.from({length:12},(_,id)=>({id,crop:null,plantedAt:0,readyAt:0,watered:false}));
 ['corn','corn','corn','wheat','wheat'].forEach((crop,id)=>{s.plots[id]={id,crop,plantedAt:now-CROPS[crop].duration*(id<3?1.1:.4),readyAt:now+(id<3?-1000:CROPS[crop].duration*.6),watered:false};});
 for(const [index,crop]of ['pumpkin','cabbage','sunflower'].entries())s.plots[index+5]={id:index+5,crop,plantedAt:now-CROPS[crop].duration*.4,readyAt:now+CROPS[crop].duration*.6,watered:false};
 delete s.daily;return normalizeFarm(s,now);
}
