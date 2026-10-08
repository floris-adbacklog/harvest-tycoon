// The Bonuses tab in the Estate window (8 Oct 2026): every bonus a farm has now in one overview, in groups, each with its total and
// the next bonus of that group the farm does not have yet (a farmer asked how much VIP and the late unlocks take off). Plain data,
// read from the rules in farm-state.js only: a bonus is worth what the real rule gives with it against the same rule without it,
// so no number here can drift from the game. Three are written out because farm-state.js keeps them inside an action, and its own
// texts state them: the Water tower's 30% (actOnPlot; its own share is 1 − 0.7/0.8 of what is left), the Buildings discount's 50%
// (upgradeCost) and the boosts' ×2.
import {CROPS,RECIPES,BUILDINGS,BOOSTS,IMPROVEMENTS,MASTER_BRANCHES,VALLEY_PROJECTS,EVENT_LEAGUES,FEATURE_LEVELS,SILO_COSTS,FAMILY_LEVEL_BONUS,ROOKIE_BOOST_MS,ROOKIE_TIMER_BOOST,DAY_MS,
 levelOf,featureUnlocked,cropDuration,recipeDuration,marketSaleValue,siloBonus,vipActive,dailyRewardMultiplier,rookieBoost,rookieBoostLeft,masterRank,masterBonus,valleyProjectLevel,valleyProjectBonus,
 hasImprovement,ranchFocus,ranchSpeedup,visitorPay,eventLeague,boostStatus,formatDuration} from './farm-state.js';

const pct=n=>Math.round(n*100);
const less=n=>`−${pct(n)}%`,more=n=>`+${pct(n)}%`;
// A normal crop and a crop that grows back, a batch no building of its own speeds up (the Chicken Coop), and a sale big enough
// that marketSaleValue's rounding down does not count.
const CROP=Object.keys(CROPS).find(k=>!CROPS[k].regrow),REGROW=Object.keys(CROPS).find(k=>CROPS[k].regrow);
const BATCH=Object.keys(RECIPES).find(k=>RECIPES[k].building==='coop'),GLASS=Object.keys(RECIPES).find(k=>RECIPES[k].building==='glasshouse'),SALE=1e6;
// The beginner boost counts as over once it reads 0%, as on the hourglass (rookie-ui.js ROOKIE_FADED_MS, worked out again from farm-state.js).
const ROOKIE_FADED_MS=Math.ceil(ROOKIE_BOOST_MS*.005/ROOKIE_TIMER_BOOST);
const REGROWS='When trees, bushes and climbing plants grow back';
const row=(id,name,sub,value,active=true)=>({id,name,sub,value,active});
// The next bonus of a group: the first by level that the farm does not have. Not open yet: the level it opens at; open: where to get it.
function upcoming(list){const c=list.filter(c=>!c.had).sort((a,b)=>a.level-b.level)[0];return c?row(c.id,c.name,c.sub,c.open?c.where:`From level ${c.level}`,false):null;}
function group(id,title,art,rows,next=[],totals=[],note=''){const all=[...rows.filter(Boolean),upcoming(next)].filter(Boolean);return all.length?{id,title,art,totals:totals.filter(t=>pct(t.value)>0),rows:all,note}:null;}

export function bonusOverview(state,now=Date.now()){
 const level=levelOf(state),vip=vipActive(state,now),vipLeft=vip?`${formatDuration(state.vipExpiresAt-now)} left`:'',silo=state.siloLevel??0,siloOpen=featureUnlocked(state,'silo'),herd=ranchFocus(state);
 const without=patch=>({...state,...patch}),noVip=without({vipExpiresAt:0}),noImprovement=id=>without({improvements:(state.improvements??[]).filter(x=>x!==id)});
 const grow=s=>cropDuration(s,CROP,false,now),regrow=s=>cropDuration(s,REGROW,true,now),batch=s=>recipeDuration(s,BATCH,now),sale=s=>marketSaleValue(s,SALE,now);
 const cut=(rule,off)=>1-rule(state)/rule(off),gain=(rule,off)=>rule(state)/rule(off)-1;
 const rookieLeft=Math.max(0,rookieBoostLeft(state,now)-ROOKIE_FADED_MS),rookie=rookieLeft>0&&row('rookie','Beginner boost',`${formatDuration(rookieLeft)} left`,less(rookieBoost(state,now)));
 const ranks=b=>masterRank(state,b)>0,projectDone=id=>valleyProjectLevel(state,id)>0;
 const improvement=id=>({id,level:IMPROVEMENTS[id].level,had:hasImprovement(state,id),open:featureUnlocked(state,'estateworkshop')&&level>=IMPROVEMENTS[id].level,where:'Estate Workshop',name:IMPROVEMENTS[id].name,sub:IMPROVEMENTS[id].effect});
 const branch=b=>({id:b,level:FEATURE_LEVELS.master,had:ranks(b),open:featureUnlocked(state,'master'),where:'Master points',name:MASTER_BRANCHES[b].name,sub:MASTER_BRANCHES[b].effect});
 const project=id=>({id,level:FEATURE_LEVELS.valleyprojects,had:projectDone(id),open:featureUnlocked(state,'valleyprojects'),where:'Valley projects',name:VALLEY_PROJECTS[id].name,sub:VALLEY_PROJECTS[id].effect});
 // VIP opens with the shop at level 10: for a farm without it, it is the next bonus in the groups it makes faster or richer. For
 // crops the next Silo research step goes first while there is one (a step to play for, not to buy), so VIP is not in every group.
 const vipNext=sub=>({id:'vip',level:FEATURE_LEVELS.boosts,had:vip,open:featureUnlocked(state,'boosts'),where:'Diamonds & boosts',name:'VIP',sub});
 const siloNext=(kind,name,sub,first)=>({id:'silo',level:FEATURE_LEVELS.silo,had:silo>=SILO_COSTS.length,open:siloOpen,where:`Next step: −${pct(siloBonus(silo+1)[kind]-siloBonus(silo)[kind])}%`,name,sub:siloOpen?sub:first});
 // The totals are the real growing time against the crop's own: a normal crop, and a cycle that grows back when that has bonuses of its own.
 const regrowing=hasImprovement(state,'ladders')||projectDone('terraces'),faster=1-grow(state)/CROPS[CROP].duration,back=1-regrow(state)/CROPS[REGROW].regrow;
 const crops=group('crops','Faster crops','seeds',[
  silo>0&&row('silo','Silo research',`Level ${silo} of ${SILO_COSTS.length}`,less(siloBonus(silo).growth)),
  vip&&row('vip','VIP',vipLeft,less(cut(grow,noVip))),
  rookie,
  ranks('growth')&&row('growth',MASTER_BRANCHES.growth.name,'Master points',less(masterBonus(state,'growth'))),
  projectDone('canal')&&row('canal',VALLEY_PROJECTS.canal.name,'Valley projects',less(valleyProjectBonus(state,'canal'))),
  hasImprovement(state,'watertower')&&row('watertower',IMPROVEMENTS.watertower.name,IMPROVEMENTS.watertower.effect,less(1-.7/.8)),
  hasImprovement(state,'ladders')&&row('ladders',IMPROVEMENTS.ladders.name,REGROWS,less(cut(regrow,noImprovement('ladders')))),
  projectDone('terraces')&&row('terraces',VALLEY_PROJECTS.terraces.name,REGROWS,less(valleyProjectBonus(state,'terraces')))
 ],[...(siloOpen&&silo<SILO_COSTS.length?[]:[vipNext('10% faster crops')]),siloNext('growth','Silo research',`Level ${silo+1} of ${SILO_COSTS.length}`,`−${pct(siloBonus(1).growth)}% growing time`),improvement('ladders'),improvement('watertower'),branch('growth'),project('canal'),project('terraces')],[
  {value:faster,text:`Crops grow ${pct(faster)}% faster`},...(regrowing?[{value:back,text:`Trees, bushes and climbing plants grow back ${pct(back)}% faster`}]:[])
 ]);
 // Production: VIP, the beginner boost and Busy hands work in every building and make the total; the rest in one building each.
 const shared=cut(batch,without({vipExpiresAt:0,rookieUntil:0,master:{...state.master,production:0}}));
 const production=group('production','Faster production','buildings',[
  vip&&row('vip','VIP',vipLeft,less(cut(batch,noVip))),
  rookie,
  ranks('production')&&row('production',MASTER_BRANCHES.production.name,'Master points',less(masterBonus(state,'production'))),
  herd&&row('ranch','The Ranch',BUILDINGS[herd].name,less(ranchSpeedup(state))),
  hasImprovement(state,'heating')&&row('heating',IMPROVEMENTS.heating.name,BUILDINGS.glasshouse.name,less(1-recipeDuration(state,GLASS,now)/recipeDuration(noImprovement('heating'),GLASS,now))),
  projectDone('watermill')&&row('watermill',VALLEY_PROJECTS.watermill.name,'Windmill and Feed Mill',less(valleyProjectBonus(state,'watermill')))
 ],[{id:'ranch',level:FEATURE_LEVELS.ranch,had:!!herd,open:featureUnlocked(state,'ranch'),where:'Pick a herd',name:'The Ranch',sub:`Batches in one barn take ${pct(ranchSpeedup(state))}% less time.`},vipNext('10% faster production'),improvement('heating'),improvement('hayloft'),branch('production'),project('watermill')],
  [{value:shared,text:`Batches take ${pct(shared)}% less time`}],'Every building also gets faster with its own level.');
 // The Market: everything but the Double earnings boost, which runs out (it is under Running now).
 const market=sale(without({boosts:{...state.boosts,coinsUntil:0}}))/SALE-1;
 const sales=group('market','The Market pays more','market',[
  vip&&row('vip','VIP',vipLeft,more(gain(sale,noVip))),
  hasImprovement(state,'ledger')&&row('ledger',IMPROVEMENTS.ledger.name,'Estate Workshop',more(gain(sale,noImprovement('ledger')))),
  ranks('market')&&row('market',MASTER_BRANCHES.market.name,'Master points',more(masterBonus(state,'market'))),
  projectDone('barn')&&row('barn',VALLEY_PROJECTS.barn.name,'Valley projects',more(valleyProjectBonus(state,'barn')))
 ],[vipNext('+5% market coins'),improvement('ledger'),branch('market'),project('barn')],[{value:market,text:`+${pct(market)}% at the Market`}]);
 const cheaper=group('cheaper','Cheaper','coins',[
  silo>0&&row('seeds','Seed price','Silo research',less(siloBonus(silo).seeds)),
  state.boosts?.upgradeCredits>0&&row('voucher','Next building upgrade','Buildings discount','−50%')
 ],[siloNext('seeds','Seed price','Silo research',`−${pct(siloBonus(1).seeds)}% seed price`)]);
 // Bigger rewards: a league pays ×1 in the first (no bonus), so the next one with more coins is the one to show.
 const familyLevel=state.family?.familyId?Math.max(1,Number(state.family.level)||1):0,league=level>=EVENT_LEAGUES[0].from?eventLeague(level):null,nextLeague=EVENT_LEAGUES.find(l=>l.from>level&&l.coins>(league?.coins??1));
 const visitors=featureUnlocked(state,'visitors')?visitorPay(state)-1:0,welcome=ranks('visitors'),bridge=projectDone('bridge');
 const rewards=group('rewards','Bigger rewards','gift',[
  vip&&row('vip','VIP','Daily gift, daily challenges and delivery orders',`×${dailyRewardMultiplier(state,now)}`),
  familyLevel>1&&row('family',`Family level ${familyLevel}`,'Family Chest and Family Order',more((familyLevel-1)*FAMILY_LEVEL_BONUS)),
  league?.coins>1&&row('league',league.name,'Events',`Coins ×${league.coins}`),
  hasImprovement(state,'wagon')&&row('wagon',IMPROVEMENTS.wagon.name,IMPROVEMENTS.wagon.effect,'×2'),
  hasImprovement(state,'crane')&&row('crane',IMPROVEMENTS.crane.name,IMPROVEMENTS.crane.effect,'×2'),
  visitors>0&&row('visitors','Valley visitors',welcome&&bridge?'Warm welcome and Stone bridge':welcome?MASTER_BRANCHES.visitors.name:VALLEY_PROJECTS.bridge.name,more(visitors))
 ],[improvement('wagon'),improvement('crane'),...(nextLeague?[{id:'league',level:nextLeague.from,had:false,open:false,name:nextLeague.name,sub:`Coins ×${nextLeague.coins} in events`}]:[]),
  {id:'visitors',level:FEATURE_LEVELS.visitors,had:visitors>0,open:featureUnlocked(state,'visitors'),where:'Master points',name:'Valley visitors',sub:'Warm welcome and Stone bridge'}]);
 const running=group('running','Running now','boost',[...['xp','harvest','coins'].map(id=>{const left=boostStatus(state,id,now).remaining;return left>0&&row(id,BOOSTS[id].name,`${formatDuration(left)} left`,'×2');}),rookie]);
 return {groups:[crops,production,sales,cheaper,rewards,running].filter(Boolean)};
}
