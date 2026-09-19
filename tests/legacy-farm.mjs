// Existing regression scenarios model farms created before progressive unlocks.
// Preserve their original starting plots and access; new-player flow is covered
// separately in progression.test.mjs using the real createFarm export.
import {createFarm,normalizeFarm,CROPS} from '../game/farm-state.js';
export function createLegacyFarm(now=Date.now()){
 const s=createFarm(now);s.progression={mode:'legacy'};
 for(const [index,crop]of ['pumpkin','cabbage','sunflower'].entries())s.plots[index+5]={id:index+5,crop,plantedAt:now-CROPS[crop].duration*.4,readyAt:now+CROPS[crop].duration*.6,watered:false};
 delete s.daily;return normalizeFarm(s,now);
}
