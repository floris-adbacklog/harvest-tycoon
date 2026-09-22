import {productionJobs,stallStatus,featureUnlocked} from './farm-state.js';
export function welcomeSummary(state,lastSeen,now){
 const away=now-Date.parse(lastSeen);
 if(!Number.isFinite(away)||away<30*60000)return null;
 const crops=state.plots.filter(p=>p.crop&&p.readyAt<=now).length;
 const batches=Object.values(state.buildings).flatMap(productionJobs).filter(j=>j.readyAt<=now).length;
 const stall=featureUnlocked(state,'stall')?stallStatus(state,now).available:0;
 return {away,crops,batches,stall,objective:crops?'Harvest your ready fields.':batches?'Collect your finished batches.':stall?'Collect your farm stall earnings.':'Plant a fresh crop and check today’s goals.'};
}
