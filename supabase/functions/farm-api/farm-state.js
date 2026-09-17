export const CROPS = Object.freeze({
 corn:       {name:'Corn',cost:10,sell:40,duration:900000,xp:5,model:'plant_001',height:1.55,use:'Animal feed'},
 wheat:      {name:'Wheat',cost:3,sell:8,duration:120000,xp:2,model:'plant_011',height:.85,use:'Flour & bread'},
 cabbage:    {name:'Cabbage',cost:40,sell:170,duration:7200000,xp:12,model:'plant_004',height:.48,use:'Vegetable boxes'},
 pumpkin:    {name:'Pumpkin',cost:95,sell:480,duration:28800000,xp:24,model:'plant_003',height:.8,use:'Pumpkin pies'},
 sunflower:  {name:'Sunflower',cost:180,sell:1100,duration:86400000,xp:45,model:'plant_007',height:1.65,use:'Sunflower oil'},
 barley: {name:'Barley',cost:20,sell:85,duration:2700000,xp:8,model:'plant_010',height:1.05,use:'Animal feed',art:'/assets/icons/barley.svg'},
 lettuce:{name:'Lettuce',cost:7,sell:20,duration:300000,xp:3,model:'plant_005',height:.47,use:'Fresh salads',art:'/assets/icons/lettuce.svg'},
 redcabbage:{name:'Red cabbage',cost:130,sell:720,duration:43200000,xp:32,model:'plant_004',height:.6,use:'Pickled vegetables',art:'/assets/icons/redcabbage.svg',tint:0xb66cce},
 cauliflower:{name:'Cauliflower',cost:65,sell:300,duration:14400000,xp:18,model:'plant_005',height:.5,use:'Vegetable boxes'}
});
export const PRODUCTS = Object.freeze({
 grainmeal:{name:'Grain meal',sell:180,icon:'wheat',color:'wheat'},
 fertilizer:{name:'Natural fertilizer',sell:260,icon:'sprout',color:'green'},
 salad:{name:'Fresh salad',sell:550,icon:'salad',color:'green'},
 pickles:{name:'Pickled cabbage',sell:1850,icon:'amphora',color:'coral'},
 flour:{name:'Flour',sell:60,icon:'wheat',color:'wheat'},
 feed:{name:'Animal feed',sell:115,icon:'package-open',color:'wheat'},
 oil:{name:'Sunflower oil',sell:3000,icon:'droplet',color:'gold'},
 milk:{name:'Milk',sell:80,icon:'milk',color:'blue'},
 eggs:{name:'Eggs',sell:50,icon:'egg',color:'cream'},
 cheese:{name:'Cheese',sell:230,icon:'sandwich',color:'gold'},
 bread:{name:'Fresh bread',sell:340,icon:'croissant',color:'wheat'},
 pie:{name:'Fresh pumpkin pie',sell:2100,icon:'cake-slice',color:'coral'},
 vegetables:{name:'Vegetable box',sell:2500,icon:'salad',color:'green'}
});
export const ITEMS=Object.freeze({...CROPS,...PRODUCTS});
export const BUILDINGS = Object.freeze({
 farmhouse:{name:'Farmhouse',tagline:'Room for your next big idea.',icon:'house',model:'house_010',type:'farm',upgradeCost:140},
 mill:{name:'Feed Mill',tagline:'Make animal feed and press golden sunflower oil.',icon:'factory',model:'hangar_003',type:'production',upgradeCost:90},
 dairy:{name:'Dairy Barn',tagline:'Happy cows, fresh milk and farmhouse cheese.',icon:'milk',model:'hangar_004',type:'production',upgradeCost:110},
 coop:{name:'Chicken Coop',tagline:'A little feed. A basket of fresh eggs.',icon:'egg',model:'coop_001',type:'production',upgradeCost:75},
 bakery:{name:'Bakery',tagline:'Bake something worth coming home for.',icon:'croissant',model:'house_027',type:'production',upgradeCost:130},
 packing:{name:'Packing Shed',tagline:'Pack your vegetables for a better price.',icon:'package-check',model:'house_030',type:'production',upgradeCost:100},
 windmill:{name:'Windmill',tagline:'Mill grain, make natural fertilizer and help your crops grow.',icon:'wind',model:'tower_001',type:'production',upgradeCost:180}
});
export const RECIPES=Object.freeze({
 grainmeal:{building:'windmill',name:'Grind grain meal',input:{wheat:8,barley:4},output:{grainmeal:3},duration:1200000,xp:30},
 fertilizer:{building:'windmill',name:'Mix natural fertilizer',input:{grainmeal:2,cabbage:2},output:{fertilizer:3},duration:1800000,xp:40},
 windflour:{building:'windmill',name:'Mill a large flour batch',input:{grainmeal:3},output:{flour:14},duration:720000,xp:24},
 windfeed:{building:'windmill',name:'Wind-milled barley feed',input:{barley:8},output:{feed:7},duration:1200000,xp:32},
 barleyfeed:{building:'mill',name:'Mix barley feed',input:{barley:2},output:{feed:2},duration:120000,xp:8},
 salad:{building:'packing',name:'Prepare a fresh salad',input:{lettuce:4,cabbage:2},output:{salad:1},duration:900000,xp:14},
 pickles:{building:'packing',name:'Pickle red cabbage',input:{redcabbage:2},output:{pickles:1},duration:10800000,xp:20},
 flour:{building:'windmill',name:'Refine grain meal into flour',input:{grainmeal:1},output:{flour:4},duration:240000,xp:12},
 feed:{building:'mill',name:'Mix animal feed',input:{corn:2},output:{feed:1},duration:120000,xp:8},
 oil:{building:'mill',name:'Press sunflower oil',input:{sunflower:2},output:{oil:1},duration:14400000,xp:15},
 milk:{building:'dairy',name:'Feed the cows',input:{feed:1},output:{milk:2},duration:600000,xp:10},
 cheese:{building:'dairy',name:'Make farmhouse cheese',input:{milk:2},output:{cheese:1},duration:3600000,xp:14},
 eggs:{building:'coop',name:'Feed the chickens',input:{feed:1},output:{eggs:3},duration:300000,xp:10},
 bread:{building:'bakery',name:'Bake fresh bread',input:{flour:4,milk:2},output:{bread:2},duration:1200000,xp:16},
 pie:{building:'bakery',name:'Bake fresh pumpkin pie',input:{flour:2,pumpkin:2,eggs:2},output:{pie:1},duration:7200000,xp:20},
 vegetables:{building:'packing',name:'Pack a vegetable box',input:{cabbage:4,cauliflower:4},output:{vegetables:1},duration:3600000,xp:15}
});
// This introductory track is deliberately independent of the regular QUESTS IDs/stats.
export const BEGINNER_REWARD=20;
export const BEGINNER_QUESTS=Object.freeze([
 {id:'harvest',title:'Your first basket',description:'Harvest one ready crop. Tap the crop or its basket.',guide:'harvest',icon:'shopping-basket'},
 {id:'plant',title:'Plant a little possibility',description:'Select Wheat and plant it in an empty field. Seeds cost 3 coins.',guide:'plant',icon:'sprout'},
 {id:'water',title:'A little water goes a long way',description:'Use Water on one growing crop. It grows faster and gives an extra crop.',guide:'water',icon:'droplets'},
 {id:'sell',title:'Your first market sale',description:'Open Market and sell some corn. Save your animal feed for the chickens.',guide:'market',icon:'store'},
 {id:'produce',title:'Put your buildings to work',description:'Start a production batch. Try Feed the chickens in the Chicken Coop using your starter feed.',guide:'produce',icon:'egg'},
 {id:'gift',title:'A gift for showing up',description:'Open Today and collect your daily gift. Come back tomorrow to build your streak.',guide:'today',icon:'gift'},
 {id:'chore',title:'A helping hand',description:'Complete one Farm chore for extra coins while your crops and buildings work.',guide:'chores',icon:'shovel'},
 {id:'tend',title:'Good things need a little care',description:'Use Care on a growing crop once its care marker appears. Wheat needs about 36 seconds.',guide:'tend',icon:'leaf'},
 {id:'wheat',title:'Bring in the wheat',description:'Harvest one wheat field when it is ready. Water and care make your harvest bigger.',guide:'harvest',icon:'wheat'},
 {id:'collect',title:'Made on your farm',description:'Collect a finished batch from a building. Chicken feed becomes eggs in 5 minutes.',guide:'collect',icon:'package-check'}
]);
export function beginnerProgress(state){
 const guide=state.onboarding??{completed:0,milestones:{}};
 return BEGINNER_QUESTS.map((quest,index)=>({...quest,index,done:index<guide.completed,current:index===guide.completed,ready:!!guide.milestones[quest.id]}));
}
export function claimBeginnerQuest(state,id){
 const guide=state.onboarding,quest=BEGINNER_QUESTS[guide.completed];
 if(!quest||guide.rewardClaimed)throw new Error('Your beginner guide is already complete.');
 if(id!==quest.id)throw new Error('Complete the current beginner step first.');
 if(!guide.milestones[quest.id])throw new Error('Try this farming action before completing the step.');
 guide.completed++;
 const diamonds=guide.completed===BEGINNER_QUESTS.length?BEGINNER_REWARD:0;
 if(diamonds){state.diamonds+=diamonds;guide.rewardClaimed=true;}
 return {step:quest.id,completed:guide.completed,total:BEGINNER_QUESTS.length,diamonds};
}
function recordBeginnerAction(state,action,result,before){
 const m=state.onboarding.milestones;
 if(state.stats.harvested>before.harvested)m.harvest=true;
 if((state.stats.harvest_wheat??0)>before.wheat)m.wheat=true;
 if(action.type==='field'&&action.action==='plant'&&result.crop==='wheat'||action.type==='tractor'&&action.mode==='plant'&&action.crop==='wheat')m.plant=true;
 if(state.stats.watered>before.watered)m.water=true;
 if(state.stats.tended>before.tended)m.tend=true;
 if(action.type==='sell'&&result.coins>0)m.sell=true;
 if(action.type==='produce')m.produce=true;
 if(action.type==='collect')m.collect=true;
 if(action.type==='checkin')m.gift=true;
 if(action.type==='chore')m.chore=true;
}

export const QUESTS = Object.freeze([
 {title:'Your first harvest',description:'Harvest 3 crops from your fields.',stat:'harvested',target:3,reward:40},
 {title:'A little green thumb',description:'Plant 6 crops and let them grow.',stat:'planted',target:6,reward:65},
 {title:'Open for business',description:'Earn 120 coins at the market.',stat:'earned',target:120,reward:100},
 {title:'Made on the farm',description:'Collect 3 finished production batches.',stat:'produced',target:3,reward:100},
 {title:'A growing operation',description:'Upgrade a production building.',stat:'upgrades',target:1,reward:80},
 {title:'Room for more',description:'Expand your fields at the Farmhouse.',stat:'expansions',target:1,reward:100},
 {title:'From field to oven',description:'Collect 2 loaves of fresh bread.',stat:'bread',target:2,reward:120},
 {title:'Harvest tycoon',description:'Earn 1,000 coins at the market.',stat:'earned',target:1000,reward:200},
 {title:'Wheat beginnings',description:'Harvest 12 wheat.',stat:'harvest_wheat',target:12,reward:65},
 {title:'A splash of care',description:'Water 20 crops.',stat:'watered',target:20,reward:90},
 {title:'The whole garden',description:'Discover all 9 crops by harvesting them.',stat:'varieties',target:9,reward:150},
 {title:'Fresh every morning',description:'Collect 10 milk.',stat:'made_milk',target:10,reward:110},
 {title:'Egg-cellent work',description:'Collect 18 eggs.',stat:'made_eggs',target:18,reward:110},
 {title:'Golden goodness',description:'Collect 3 sunflower oil.',stat:'made_oil',target:3,reward:130},
 {title:'Sweet success',description:'Collect 4 pumpkin pies.',stat:'made_pie',target:4,reward:180},
 {title:'The greener side',description:'Harvest 10 lettuce.',stat:'harvest_lettuce',target:10,reward:80},
 {title:'A colourful harvest',description:'Harvest 8 red cabbage.',stat:'harvest_redcabbage',target:8,reward:140},
 {title:'Freshly packed',description:'Collect 5 vegetable boxes.',stat:'made_vegetables',target:5,reward:160},
 {title:'Delivery day',description:'Complete 3 orders from the farm cart.',stat:'deliveries',target:3,reward:120},
 {title:'A helping hand',description:'Use the tractor 5 times.',stat:'tractor',target:5,reward:100},
 {title:'Built to last',description:'Upgrade production buildings 5 times.',stat:'upgrades',target:5,reward:180},
 {title:'A full field',description:'Harvest 100 crops.',stat:'harvested',target:100,reward:250},
 {title:'A farm favourite',description:'Collect 30 production batches.',stat:'produced',target:30,reward:200},
 {title:'A little every day',description:'Complete 6 daily challenges.',stat:'dailies',target:6,reward:160},
 {title:'Above and beyond',description:'Give 50 crops extra care.',stat:'tended',target:50,reward:300},
 {title:'A familiar face',description:'Complete 100 farm chores.',stat:'chores',target:100,reward:500},
 {title:'Roots for the future',description:'Complete your first estate project.',stat:'projects',target:1,reward:600},
 {title:'A specialist touch',description:'Claim 9 crop mastery medals.',stat:'mastery_medals',target:9,reward:1500},
 {title:'A thousand little harvests',description:'Harvest 1,000 fields.',stat:'harvested',target:1000,reward:2500},
 {title:'From farm to estate',description:'Complete 6 estate projects.',stat:'projects',target:6,reward:8000},
 {title:'Known across the valley',description:'Complete 100 delivery orders.',stat:'deliveries',target:100,reward:6000},
 {title:'A lifelong grower',description:'Claim all 36 crop mastery medals.',stat:'mastery_medals',target:36,reward:20000},
 {title:'Catch the wind',description:'Collect your first production batch at the Windmill.',stat:'windmill_batches',target:1,reward:180},
 {title:'Grain with a purpose',description:'Make 3 grain meal at the Windmill.',stat:'made_grainmeal',target:3,reward:160},
 {title:'Fresh from the mill',description:'Refine grain meal into 12 flour for the Bakery.',stat:'made_flour',target:12,reward:200},
 {title:'A gentler way to grow',description:'Use natural fertilizer on 4 growing fields.',stat:'fertilized',target:4,reward:240},
 {title:'A sparkling streak',description:'Earn 10 diamonds from daily gifts.',stat:'diamonds_earned',target:10,reward:200},
 {title:'A little extra power',description:'Activate 2 boosts with earned diamonds.',stat:'boosts_used',target:2,reward:250},
 {title:'A stronger windmill',description:'Upgrade your Windmill to level 2.',stat:'windmill_upgrades',target:1,reward:200},
 {title:'From mill to oven',description:'Collect 12 fresh bread from the Bakery.',stat:'made_bread',target:12,reward:300},
 {title:'Pumpkin perfection',description:'Collect 6 fresh pumpkin pies from the Bakery.',stat:'made_pie',target:6,reward:400}
]);
export const MAX_PLOTS=24;
export function xpForLevel(level){const n=level-1;return 60*n+20*n*(n-1);}
export function levelOf(state){const total=state.xp+(state.xpOffset??0);return 1+Math.floor((Math.sqrt(1600+80*total)-40)/40);}
export function levelProgress(state){const level=levelOf(state);return {level,current:state.xp+(state.xpOffset??0)-xpForLevel(level),target:60+40*(level-1)};}
export const MAX_BUILDING_LEVEL=10;
export function productionSpeed(level){return level<=3?.2*(level-1):.4+.04*(level-3);}
export function recipeDuration(state,id){return Math.round(RECIPES[id].duration*(1-productionSpeed(state.buildings[RECIPES[id].building].level)));}
export function siloBonus(level){return {seeds:Math.min(level,3)*.05+Math.max(0,level-3)*.05,growth:Math.min(level,3)*.1+Math.max(0,level-3)*.05};}
export function cropDuration(state,crop){return Math.round(CROPS[crop].duration*(1-siloBonus(state.siloLevel??0).growth));}
export function harvestYield(plot){return 1+(plot.watered?1:0)+(plot.tended?1:0);}
export function formatDuration(ms){const s=Math.max(0,Math.ceil(ms/1000));if(s<60)return `${s}s`;const m=Math.ceil(s/60);if(m<60)return `${m}m`;const h=Math.floor(m/60);if(h<24)return `${h}h${m%60?` ${m%60}m`:''}`;return `${Math.floor(h/24)}d${h%24?` ${h%24}h`:''}`;}
export function cropIcon(key){return CROPS[key].art??`/assets/icons/${CROPS[key].icon??key}.png`;}
export function expansionCost(state){return state.plots.length>=MAX_PLOTS?null:Math.ceil(600*1.75**Math.max(0,state.plots.length-12)/25)*25;}
const FIELD_MATERIALS=[{wheat:12,corn:6},{wheat:20,barley:10},{barley:18,cabbage:10},{corn:24,cauliflower:12,flour:8},{cabbage:24,pumpkin:12,bread:10},{redcabbage:20,sunflower:12,cheese:12},{pumpkin:24,oil:10,vegetables:12},{sunflower:30,pickles:16,pie:16},{lettuce:30,flour:18,milk:12},{cauliflower:32,feed:20,eggs:14},{redcabbage:30,cheese:16,bread:18},{pumpkin:36,oil:18,pie:20}];
export function expansionMaterials(state){return state.plots.length>=MAX_PLOTS?{}:{...FIELD_MATERIALS[Math.max(0,state.plots.length-12)]};}
export function upgradeCost(state,building){
 if(!Object.hasOwn(BUILDINGS,building)||building==='farmhouse')return null;
 const level=state.buildings[building].level;
 return level>=MAX_BUILDING_LEVEL?null:Math.ceil(Math.round(BUILDINGS[building].upgradeCost*(level<3?level:12*2.7**(level-3)))*(state.boosts?.upgradeCredits>0?.5:1));
}
function createBaseFarm(now=Date.now()) {
 const plots=Array.from({length:12},(_,id)=>({id,crop:null,plantedAt:0,readyAt:0,watered:false}));
 ['corn','corn','corn','wheat','wheat','pumpkin','cabbage','sunflower'].forEach((crop,id)=>{
  plots[id]={id,crop,plantedAt:now-CROPS[crop].duration*(id<3?1.1:.4),readyAt:now+(id<3?-1000:CROPS[crop].duration*.6),watered:false};
 });
 return {coins:180,xp:0,inventory:{...Object.fromEntries(Object.keys(ITEMS).map(k=>[k,0])),wheat:4,feed:2},stats:{harvested:0,planted:0,watered:0,earned:0,produced:0,upgrades:0,expansions:0,bread:0},claimed:[],plots,buildings:Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,{level:1,job:null}]))};
}
export function progress(plot,now=Date.now()) {
 if(!plot.crop)return 0;
 return Math.min(1,Math.max(0,(now-plot.plantedAt)/(plot.readyAt-plot.plantedAt)));
}
export function actOnPlot(state,id,action,crop='corn',now=Date.now()) {
 if(!Number.isInteger(id)||id<0||id>=state.plots.length)throw new Error('Choose an unlocked field.');
 if(!['plant','water','harvest','tend'].includes(action))throw new Error('Choose a valid tool.');
 const p=state.plots[id];
 if(action==='plant'){
  if(!Object.hasOwn(CROPS,crop))throw new Error('Choose a valid crop.');
  if(p.crop)throw new Error('This field is already planted.');
  if(state.coins<seedCost(state,crop))throw new Error('Not enough coins. Sell some produce at the market.');
  state.coins-=seedCost(state,crop);state.stats.planted++;
  const duration=cropDuration(state,crop);Object.assign(p,{crop,plantedAt:now,readyAt:now+duration,careAt:now+Math.max(30000,duration*.3),watered:false,tended:false,fertilized:false});
  return {action,crop,cost:seedCost(state,crop)};
 }
 if(!p.crop)throw new Error('Plant a crop in this field first.');
 if(action==='water'){
  if(now>=p.readyAt)throw new Error('This crop is ready to harvest!');
  if(p.watered)throw new Error('Already watered. Your crop is growing nicely.');
  p.readyAt=now+(p.readyAt-now)*.8;p.watered=true;state.stats.watered++;
  return {action,crop:p.crop};
 }
 if(action==='tend'){
  if(now>=p.readyAt)throw new Error('This crop is ready to harvest!');
  if(p.tended)throw new Error('This crop has already had extra care.');
  if(now<(p.careAt??p.plantedAt))throw new Error(`Extra care will be available in ${formatDuration(p.careAt-now)}.`);
  p.readyAt=now+(p.readyAt-now)*.85;p.tended=true;state.stats.tended++;
  return {action,crop:p.crop,yield:harvestYield(p)};
 }
 if(now<p.readyAt)throw new Error('Still growing. Give it a little more time.');
 const harvested=p.crop,quantity=harvestYield(p),xp=CROPS[harvested].xp*(p.watered&&p.tended?2:1);
 state.inventory[harvested]+=quantity;state.stats.harvested++;state.stats['harvest_'+harvested]=(state.stats['harvest_'+harvested]??0)+quantity;
 state.mastery.harvests[harvested]=(state.mastery.harvests[harvested]??0)+1;
 if(!state.discovered.includes(harvested))state.discovered.push(harvested);state.stats.varieties=state.discovered.length;state.xp+=xp;
 Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false});
 return {action,crop:harvested,quantity,xp};
}
export function sellCrops(state,item='all') {
 if(item!=='all'&&!Object.hasOwn(ITEMS,item))throw new Error('Choose a valid item.');
 const keys=item==='all'?Object.keys(ITEMS):[item];
 const total=keys.reduce((v,k)=>v+state.inventory[k]*ITEMS[k].sell,0);
 if(total===0)throw new Error('Your basket is empty. Harvest or produce something first.');
 for(const k of keys)state.inventory[k]=0;
 state.coins+=total;state.stats.earned+=total;
 return {coins:total};
}
export function recipeAvailability(state,id){
 if(!Object.hasOwn(RECIPES,id))throw new Error('Choose a valid recipe.');
 const r=RECIPES[id];
 const missing=Object.entries(r.input).filter(([k,n])=>state.inventory[k]<n).map(([k,n])=>({item:k,name:ITEMS[k].name,need:n,have:state.inventory[k]}));
 return {canStart:!state.buildings[r.building].job&&missing.length===0,missing,busy:!!state.buildings[r.building].job};
}
export function startProduction(state,id,now=Date.now()){
 if(!Object.hasOwn(RECIPES,id))throw new Error('Choose a valid recipe.');
 const r=RECIPES[id],b=state.buildings[r.building],a=recipeAvailability(state,id);
 if(a.busy)throw new Error('Collect the current batch before starting another.');
 if(a.missing.length)throw new Error('Missing ingredients: '+a.missing.map(m=>`${m.name} (${m.have}/${m.need})`).join(', ')+'.');
 const duration=recipeDuration(state,id);
 for(const [k,n]of Object.entries(r.input))state.inventory[k]-=n;
 b.job={recipe:id,startedAt:now,readyAt:now+duration,output:{...r.output},xp:r.xp};
 return {building:r.building,recipe:id,readyAt:b.job.readyAt};
}
export function collectProduction(state,building,now=Date.now()){
 if(!Object.hasOwn(BUILDINGS,building)||building==='farmhouse')throw new Error('Choose a production building.');
 const b=state.buildings[building],job=b.job;
 if(!job)throw new Error('Nothing to collect yet. Start a recipe first.');
 if(now<job.readyAt)throw new Error('This batch is still being made.');
 const r=RECIPES[job.recipe],output=job.output??r.output,xp=job.xp??r.xp;
 for(const [k,n]of Object.entries(output)){state.inventory[k]+=n;state.stats['made_'+k]=(state.stats['made_'+k]??0)+n;}
 state.stats.produced++;state.stats.bread+=output.bread??0;state.xp+=xp;b.job=null;
 if(building==='windmill')state.stats.windmill_batches=(state.stats.windmill_batches??0)+1;
 return {building,items:{...output},xp};
}
export function upgradeBuilding(state,building){
 if(!Object.hasOwn(BUILDINGS,building)||building==='farmhouse')throw new Error('Choose a production building.');
 const b=state.buildings[building],cost=upgradeCost(state,building);
 if(cost===null)throw new Error('This building is fully upgraded.');
 if(b.job)throw new Error('Finish and collect the current batch before upgrading.');
 if(state.coins<cost)throw new Error(`You need ${cost} coins for this upgrade.`);
 state.coins-=cost;b.level++;state.stats.upgrades++;state.xp+=15;
 if(state.boosts?.upgradeCredits>0)state.boosts.upgradeCredits--;
 if(building==='windmill')state.stats.windmill_upgrades=(state.stats.windmill_upgrades??0)+1;
 return {building,level:b.level,cost};
}
export function expandFarm(state){
 const cost=expansionCost(state),materials=expansionMaterials(state);
 if(cost===null)throw new Error('Your farm is fully expanded.');
 if(state.coins<cost)throw new Error(`You need ${cost} coins for one more field.`);
 const missing=Object.entries(materials).filter(([key,n])=>(state.inventory[key]??0)<n);
 if(missing.length)throw new Error(`Gather the missing supplies: ${missing.map(([key,n])=>`${n} ${ITEMS[key].name}`).join(', ')}.`);
 state.coins-=cost;for(const [key,n] of Object.entries(materials))state.inventory[key]-=n;
 state.plots.push({id:state.plots.length,crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false});
 state.stats.expansions++;state.xp+=20;state.buildings.farmhouse.level++;
 return {fields:state.plots.length,cost,materials};
}
export function claimQuest(state,id){
 if(!Number.isInteger(id)||!QUESTS[id])throw new Error('Choose a valid quest.');
 const q=QUESTS[id];
 if(state.claimed.includes(id))throw new Error('This reward has already been claimed.');
 if(state.stats[q.stat]<q.target)throw new Error('Finish this quest to claim your reward.');
 state.claimed.push(id);state.coins+=q.reward;state.xp+=15;
 return {coins:q.reward,xp:15};
}
export function farmSummary(state,now=Date.now()) {
 return {coins:state.coins,diamonds:state.diamonds,boosts:{...state.boosts},xp:state.xp,level:levelOf(state),inventory:{...state.inventory},plots:state.plots.map(p=>({id:p.id,crop:p.crop,watered:p.watered,fertilized:p.fertilized,status:!p.crop?'empty':now>=p.readyAt?'ready':'growing',secondsRemaining:Math.max(0,Math.ceil((p.readyAt-now)/1000))})),buildings:Object.entries(state.buildings).map(([id,b])=>({id,name:BUILDINGS[id].name,level:b.level,status:b.job?(now>=b.job.readyAt?'ready':'working'):'idle',job:b.job?{recipe:b.job.recipe,secondsRemaining:Math.max(0,Math.ceil((b.job.readyAt-now)/1000))}:null,upgradeCost:upgradeCost(state,id)})),expansionCost:expansionCost(state),quests:QUESTS.map((q,id)=>({id,title:q.title,progress:Math.min(q.target,state.stats[q.stat]),target:q.target,claimed:state.claimed.includes(id)}))};
}

export const DAY_MS=86400000;
export const DAILY_REWARDS=[40,55,70,85,100,120,160];
export const DAILY_DIAMONDS=[2,3,4,5,6,8,12];
export const DIAMOND_PACKS=Object.freeze([{amount:50,price:'€1.99'},{amount:300,price:'€9.99'},{amount:1000,price:'€24.99'}]);
export const BOOSTS=Object.freeze({
 xp:{name:'Double XP',cost:10,duration:1800000,art:'xp',description:'Earn twice the XP from farm actions for 30 minutes.'},
 coins:{name:'Double earnings',cost:15,duration:1800000,art:'coins',description:'Double your market sales and delivery coins for 30 minutes. Passive income and gifts stay the same.'},
 crops:{name:'Instant harvest',cost:8,art:'seeds',description:'Make every currently growing crop ready to harvest. Crops stay in their fields until you collect them.'},
 upgrade:{name:'Builder’s discount',cost:20,art:'hammer',description:'Save 50% of the coin cost on your next production-building upgrade. One voucher at a time; it never expires.'},
 production:{name:'Finish production',cost:12,art:'boost',description:'Finish all current production batches instantly. Collect the finished goods from their buildings.'}
});
export function boostStatus(state,id,now=Date.now()){
 if(!Object.hasOwn(BOOSTS,id))throw new Error('Choose a valid boost.');
 const boost=BOOSTS[id],until=id==='xp'?state.boosts?.xpUntil:id==='coins'?state.boosts?.coinsUntil:0;
 const remaining=Math.max(0,(until??0)-now);
 let reason='';
 if(remaining)reason='Already active';
 if(id==='upgrade'&&state.boosts?.upgradeCredits>0)reason='Voucher ready';
 if(id==='upgrade'&&!Object.entries(state.buildings).some(([key,b])=>key!=='farmhouse'&&b.level<MAX_BUILDING_LEVEL))reason='All buildings at maximum level';
 if(id==='crops'&&!state.plots.some(p=>p.crop&&p.readyAt>now))reason='No crops are growing';
 if(id==='production'&&!Object.values(state.buildings).some(b=>b.job&&b.job.readyAt>now))reason='No batches are running';
 return {...boost,remaining,reason,canBuy:!reason&&state.diamonds>=boost.cost};
}
export function buyBoost(state,id,now=Date.now()){
 const status=boostStatus(state,id,now);
 if(status.reason)throw new Error(status.reason+'.');
 if(state.diamonds<status.cost)throw new Error(`You need ${status.cost} diamonds. Earn more from your daily streak.`);
 if(id==='xp')state.boosts.xpUntil=now+status.duration;
 if(id==='coins')state.boosts.coinsUntil=now+status.duration;
 if(id==='upgrade')state.boosts.upgradeCredits=1;
 let affected=0;
 if(id==='crops')for(const p of state.plots)if(p.crop&&p.readyAt>now){p.readyAt=now;affected++;}
 if(id==='production')for(const b of Object.values(state.buildings))if(b.job&&b.job.readyAt>now){b.job.readyAt=now;affected++;}
 state.diamonds-=status.cost;
 state.stats.boosts_used=(state.stats.boosts_used??0)+1;
 return {boost:id,cost:status.cost,affected,expiresAt:status.duration?now+status.duration:null};
}
export function fertilizeField(state,id,now=Date.now()){
 if(!Number.isInteger(id)||id<0||id>=state.plots.length)throw new Error('Choose an unlocked field.');
 const plot=state.plots[id];
 if(!plot.crop||plot.readyAt<=now)throw new Error('Choose a crop that is still growing.');
 if(plot.fertilized)throw new Error('This crop has already been fertilized.');
 if(state.inventory.fertilizer<1)throw new Error('Make natural fertilizer at the Windmill first.');
 const saved=Math.floor((plot.readyAt-now)*.35);
 plot.readyAt-=saved;plot.fertilized=true;state.inventory.fertilizer--;state.xp+=5;state.stats.fertilized=(state.stats.fertilized??0)+1;
 return {id,crop:plot.crop,saved,xp:5};
}
const DAILY_POOLS=[
 [{stat:'harvested',target:8,title:'Bring in the harvest',description:'Harvest 8 crops.',reward:45},{stat:'watered',target:8,title:'A little extra care',description:'Water 8 growing crops.',reward:40},{stat:'planted',target:10,title:'A fresh start',description:'Plant 10 crops.',reward:45}],
 [{stat:'produced',target:2,title:'Busy little buildings',description:'Collect 2 production batches.',reward:55},{stat:'made_milk',target:4,title:'Fresh from the barn',description:'Collect 4 milk.',reward:60},{stat:'made_eggs',target:6,title:'The morning basket',description:'Collect 6 eggs.',reward:55}],
 [{stat:'earned',target:120,title:'Market day',description:'Earn 120 coins from sales or deliveries.',reward:55},{stat:'deliveries',target:1,title:'Special delivery',description:'Complete an order at the farm cart.',reward:60},{stat:'harvest_wheat',target:6,title:'Golden fields',description:'Harvest 6 wheat.',reward:45}]
];
const ORDER_POOL=[
 {title:'The village grocer',input:{corn:3,lettuce:2},coins:112,xp:18},
 {title:'Breakfast at the inn',input:{eggs:3,milk:2},coins:155,xp:25},
 {title:'The flower stall',input:{sunflower:3},coins:190,xp:25},
 {title:'Sunday lunch',input:{cabbage:2,pumpkin:2},coins:132,xp:20},
 {title:'The baker next door',input:{wheat:5},coins:60,xp:15},
 {title:'A picnic in the park',input:{bread:2,salad:1},coins:265,xp:35},
 {title:'Autumn pantry',input:{redcabbage:2,cauliflower:2},coins:245,xp:30}
];
export function utcDay(now=Date.now()){return new Date(now).toISOString().slice(0,10);}
export function dayNumber(now=Date.now()){return Math.floor(now/DAY_MS);}
export function seedCost(state,crop){return Math.max(1,Math.ceil(CROPS[crop].cost*(1-siloBonus(state.siloLevel??0).seeds)));}
export function normalizeFarm(state,now=Date.now()){
 const oldVersion=state.version??0;
 if((state.version??0)<4){const previousLevel=1+Math.floor(state.xp/60);state.xpOffset=xpForLevel(previousLevel)-60*(previousLevel-1);}
 state.version=6;state.inventory??={};for(const k of Object.keys(ITEMS))state.inventory[k]??=0;
 state.diamonds=Number.isFinite(state.diamonds)?Math.max(0,Math.floor(state.diamonds)):0;
 state.boosts??={};for(const key of ['xpUntil','coinsUntil','upgradeCredits'])state.boosts[key]=Number.isFinite(state.boosts[key])?Math.max(0,Math.floor(state.boosts[key])):0;
 state.boosts.upgradeCredits=Math.min(1,state.boosts.upgradeCredits);
 state.buildings??={};for(const key of Object.keys(BUILDINGS))state.buildings[key]??={level:1,job:null};
 // Keep paid-for legacy flour batches intact when milling moves to the Windmill.
 if(oldVersion<6&&state.buildings.mill.job?.recipe==='flour'){
  state.buildings.mill.job.output??={flour:1};state.buildings.mill.job.xp??=8;
 }
 state.stats??={};for(const q of QUESTS)state.stats[q.stat]??=0;
 for(const k of ['harvested','watered','planted','produced','earned','deliveries','tractor','dailies','tended','chores','passive_earned','projects','mastery_medals'])state.stats[k]??=0;
 state.discovered??=[];state.siloLevel??=0;state.tractorReadyAt??=0;
 state.login??={lastDay:null,streak:0,best:0,visits:0};state.levelRewards??=[1];
 // Existing farms keep every regular quest, inventory item and timer. A past daily gift
 // counts so returning players never have to wait a day to finish the introduction.
 state.onboarding??={completed:0,milestones:{gift:state.login.visits>0},rewardClaimed:false};
 state.onboarding.milestones??={};
 state.mastery??={harvests:Object.fromEntries(Object.keys(CROPS).map(k=>[k,state.stats['harvest_'+k]??0])),claimed:[]};
 state.stall??={level:1,since:now,bank:0};state.estate??={completed:0,job:null};state.chores??={};
 for(const p of state.plots){p.tended??=false;p.fertilized??=false;p.careAt??=p.plantedAt+Math.max(0,(p.readyAt-p.plantedAt)*.3);}
 const day=utcDay(now);
 if(state.daily?.date!==day)state.daily={date:day,baseline:{...state.stats},claimed:[],orders:[],bonusClaimed:false};
 return state;
}
export function createFarm(now=Date.now()){return normalizeFarm(createBaseFarm(now),now);}
export function dailyTasks(state,now=Date.now()){
 normalizeFarm(state,now);const d=dayNumber(now);
 return DAILY_POOLS.map((pool,id)=>{const q=pool[(d+id)%pool.length];return {...q,id,progress:Math.min(q.target,Math.max(0,(state.stats[q.stat]??0)-(state.daily.baseline[q.stat]??0))),claimed:state.daily.claimed.includes(id)};});
}
export function dailyOrders(state,now=Date.now()){
 normalizeFarm(state,now);const d=dayNumber(now);
 return [0,2,4].map((offset,id)=>{const order=ORDER_POOL[(d+offset)%ORDER_POOL.length];return {...order,coins:Math.ceil(Object.entries(order.input).reduce((n,[key,count])=>n+ITEMS[key].sell*count,0)*1.4),id,done:state.daily.orders.includes(id)};});
}
export function claimDaily(state,id,day,now=Date.now()){
 normalizeFarm(state,now);if(day!==utcDay(now))throw new Error('A new day has started. Check the fresh challenges.');
 const q=dailyTasks(state,now).find(q=>q.id===id);if(!q)throw new Error('Choose a daily challenge.');
 if(q.claimed)throw new Error('You already claimed this daily reward.');if(q.progress<q.target)throw new Error('Finish this daily challenge first.');
 state.daily.claimed.push(id);state.coins+=q.reward;state.xp+=10;state.stats.dailies++;
 let bonus=0;if(state.daily.claimed.length===3&&!state.daily.bonusClaimed){bonus=60;state.daily.bonusClaimed=true;state.coins+=bonus;state.xp+=15;}
 return {coins:q.reward+bonus,xp:10+(bonus?15:0),bonus};
}
export function checkIn(state,now=Date.now()){
 normalizeFarm(state,now);const day=utcDay(now);
 if(state.login.lastDay===day)throw new Error('Your daily gift is already collected.');
 state.login.streak=state.login.lastDay===utcDay(now-DAY_MS)?state.login.streak+1:1;
 state.login.lastDay=day;state.login.best=Math.max(state.login.best,state.login.streak);state.login.visits++;
 const index=(state.login.streak-1)%7,coins=DAILY_REWARDS[index],diamonds=DAILY_DIAMONDS[index];state.coins+=coins;state.diamonds+=diamonds;state.xp+=10;
 state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;
 return {coins,diamonds,streak:state.login.streak,xp:10};
}
export function deliverOrder(state,id,day,now=Date.now()){
 normalizeFarm(state,now);if(day!==utcDay(now))throw new Error('The order board has refreshed. Pick a new order.');
 const order=dailyOrders(state,now).find(o=>o.id===id);if(!order)throw new Error('Choose an order.');if(order.done)throw new Error('This order is already delivered.');
 if(Object.entries(order.input).some(([k,n])=>state.inventory[k]<n))throw new Error('Gather the ingredients for this order first.');
 for(const[k,n]of Object.entries(order.input))state.inventory[k]-=n;
 state.daily.orders.push(id);state.coins+=order.coins;state.xp+=order.xp;state.stats.deliveries++;state.stats.earned+=order.coins;
 return {coins:order.coins,xp:order.xp};
}
export function claimLevelRewards(state){
 const levels=Array.from({length:levelOf(state)},(_,i)=>i+1).filter(l=>!state.levelRewards.includes(l));if(!levels.length)throw new Error('No new level rewards yet.');
 const coins=levels.length*30;state.coins+=coins;state.levelRewards.push(...levels);return {coins,levels};
}
export function tractorQuote(state,mode,crop='corn',now=Date.now()){
 const eligible=state.plots.filter(p=>mode==='plant'?!p.crop:mode==='water'?p.crop&&!p.watered&&p.readyAt>now:p.crop&&p.readyAt<=now);
 const count=mode==='plant'?Math.min(eligible.length,Math.max(0,Math.floor((state.coins-12)/(seedCost(state,crop)+2)))):eligible.length;
 const fuel=count?12+count*2:0,seeds=mode==='plant'?count*seedCost(state,crop):0;
 return {count,fuel,seeds,total:fuel+seeds,ids:eligible.slice(0,count).map(p=>p.id)};
}
export function useTractor(state,mode,crop='corn',now=Date.now()){
 if(!['plant','water','harvest'].includes(mode))throw new Error('Choose a tractor task.');if(!Object.hasOwn(CROPS,crop))throw new Error('Choose a crop.');
 if(now<state.tractorReadyAt)throw new Error(`The tractor will be ready in ${Math.ceil((state.tractorReadyAt-now)/1000)} seconds.`);
 const quote=tractorQuote(state,mode,crop,now);
 if(!quote.count)throw new Error(mode==='plant'?'No empty fields you can afford to plant, including fuel.':mode==='water'?'No growing crops need water.':'No crops are ready to harvest.');
 if(state.coins<quote.total)throw new Error(`You need ${quote.fuel} coins for tractor fuel. Working by hand is free.`);
 state.coins-=quote.fuel;
 for(const id of quote.ids)actOnPlot(state,id,mode,crop,now);
 state.tractorReadyAt=now+15000;state.stats.tractor++;return {count:quote.count,mode,cost:quote.total,fuel:quote.fuel};
}
export function upgradeSilo(state){
 if(state.siloLevel>=5)throw new Error('Your silo research is complete.');const cost=SILO_COSTS[state.siloLevel];if(state.coins<cost)throw new Error(`You need ${cost} coins for this research.`);
 state.coins-=cost;state.siloLevel++;state.xp+=20;return {level:state.siloLevel,cost};
}
export function applyFarmAction(state,action,now=Date.now()){
 normalizeFarm(state,now);if(!action||typeof action!=='object')throw new Error('Choose a farm action.');
 const beforeXP=state.xp,beforeCoins=state.coins;
 const beginnerBefore={harvested:state.stats.harvested,wheat:state.stats.harvest_wheat??0,watered:state.stats.watered,tended:state.stats.tended};
 const result=dispatchFarmAction(state,action,now);
 recordBeginnerAction(state,action,result,beginnerBefore);
 const earnedXP=state.xp-beforeXP;
 if(state.boosts.xpUntil>now&&earnedXP>0){state.xp+=earnedXP;result.xp=(result.xp??earnedXP)+earnedXP;}
 if(state.boosts.coinsUntil>now&&['sell','delivery'].includes(action.type)){
  const bonus=state.coins-beforeCoins;if(bonus>0){state.coins+=bonus;state.stats.earned+=bonus;result.coins+=bonus;}
 }
 return result;
}
function dispatchFarmAction(state,action,now){
 switch(action.type){
  case 'buy_boost':return buyBoost(state,action.boost,now);
  case 'fertilize':return fertilizeField(state,action.id,now);
  case 'stall_collect':return collectStall(state,now);
  case 'stall_upgrade':return upgradeStall(state,now);
  case 'chore':return doChore(state,action.id,now);
  case 'mastery':return claimMastery(state,action.crop,action.tier);
  case 'project_start':return startProject(state,now);
  case 'project_collect':return completeProject(state,now);
  case 'field':return actOnPlot(state,action.id,action.action,action.crop??'corn',now);
  case 'sell':return sellCrops(state,action.item??'all');
  case 'produce':return startProduction(state,action.recipe,now);
  case 'collect':return collectProduction(state,action.building,now);
  case 'upgrade':return upgradeBuilding(state,action.building);
  case 'expand':return expandFarm(state);
  case 'quest':return claimQuest(state,action.id);
  case 'beginner_claim':return claimBeginnerQuest(state,action.id);
  case 'daily':return claimDaily(state,action.id,action.day,now);
  case 'checkin':return checkIn(state,now);
  case 'delivery':return deliverOrder(state,action.id,action.day,now);
  case 'level_rewards':return claimLevelRewards(state);
  case 'tractor':return useTractor(state,action.mode,action.crop,now);
  case 'silo_upgrade':return upgradeSilo(state);
  default:throw new Error('Unknown farm action.');
 }
}

export const SILO_COSTS=[140,240,380,15000,65000];
export const MASTERY_TIERS=[{name:'Bronze',target:25,coins:100,xp:25},{name:'Silver',target:100,coins:350,xp:60},{name:'Gold',target:300,coins:1200,xp:150},{name:'Platinum',target:1000,coins:4000,xp:400}];
export const CHORES=Object.freeze({weeds:{name:'Clear the paths',description:'Pull weeds along the farm paths.',icon:'shovel',coins:12,xp:3,cooldown:180000},troughs:{name:'Fill the water troughs',description:'Fresh water for the animals.',icon:'droplets',coins:10,xp:3,cooldown:180000},sorting:{name:'Sort the seed boxes',description:'Get tomorrow’s planting ready.',icon:'package-open',coins:8,xp:3,cooldown:120000}});
export const PROJECTS=Object.freeze([
 {name:'Rooted homestead',description:'Build a dependable home for your growing farm.',coins:600,input:{wheat:40,milk:12},medals:0,duration:7200000,xp:250},
 {name:'Village supplier',description:'Become the village’s everyday source of fresh food.',coins:3000,input:{corn:40,eggs:36,bread:20},medals:1,duration:28800000,xp:600},
 {name:'Irrigated gardens',description:'Turn your vegetable patch into a thriving garden.',coins:12000,input:{cabbage:50,cauliflower:35,salad:20},medals:3,duration:86400000,xp:1200},
 {name:'Artisan farmstead',description:'Establish a reputation for carefully made farm goods.',coins:45000,input:{bread:100,cheese:50,pie:30},medals:6,duration:172800000,xp:2200},
 {name:'Valley showcase',description:'Prepare a harvest worthy of the whole valley.',coins:140000,input:{sunflower:75,redcabbage:75,oil:20},medals:12,duration:259200000,xp:4000},
 {name:'Harvest estate',description:'Make your farm a lasting part of the countryside.',coins:400000,input:{pickles:100,vegetables:150,pie:100},medals:18,duration:604800000,xp:8000}
]);
export function masteryStatus(state,crop){return MASTERY_TIERS.map((tier,id)=>({...tier,id,progress:Math.min(tier.target,state.mastery.harvests[crop]??0),claimed:state.mastery.claimed.includes(`${crop}:${id}`)}));}
export function claimMastery(state,crop,tier){
 if(!Object.hasOwn(CROPS,crop)||!Number.isInteger(tier)||!MASTERY_TIERS[tier])throw new Error('Choose a crop mastery reward.');
 const goal=masteryStatus(state,crop)[tier];if(goal.claimed)throw new Error('This mastery reward is already collected.');if(goal.progress<goal.target)throw new Error('Keep harvesting this crop to earn its medal.');
 state.mastery.claimed.push(`${crop}:${tier}`);state.stats.mastery_medals++;state.coins+=goal.coins;state.xp+=goal.xp;return {crop,tier,coins:goal.coins,xp:goal.xp};
}
export function stallStatus(state,now=Date.now()){
 const level=state.stall.level,rate=36+(level-1)*18+state.estate.completed*6,capacityHours=24+Math.min(24,(level-1)*4),capacity=rate*capacityHours;
 const balance=Math.min(capacity,Math.max(0,state.stall.bank)+Math.max(0,now-state.stall.since)/3600000*rate);
 return {level,rate,capacityHours,capacity,balance,available:Math.floor(balance+1e-8),upgradeCost:level>=8?null:Math.round(800*2.4**(level-1))};
}
function settleStall(state,now){state.stall.bank=stallStatus(state,now).balance;state.stall.since=now;}
export function collectStall(state,now=Date.now()){
 const available=stallStatus(state,now).available;if(available<1)throw new Error('Your stall is just getting started. Come back for your first coin.');
 settleStall(state,now);state.stall.bank=Math.max(0,state.stall.bank-available);state.coins+=available;state.stats.passive_earned+=available;return {coins:available};
}
export function upgradeStall(state,now=Date.now()){
 const cost=stallStatus(state,now).upgradeCost;if(cost===null)throw new Error('Your farm stall is fully upgraded.');if(state.coins<cost)throw new Error(`You need ${cost} coins to upgrade the stall.`);
 settleStall(state,now);state.coins-=cost;state.stall.level++;return {level:state.stall.level,cost};
}
export function doChore(state,id,now=Date.now()){
 if(!Object.hasOwn(CHORES,id))throw new Error('Choose a farm chore.');const chore=CHORES[id];
 if(now<(state.chores[id]??0))throw new Error(`This chore returns in ${formatDuration(state.chores[id]-now)}.`);
 state.chores[id]=now+chore.cooldown;state.coins+=chore.coins;state.xp+=chore.xp;state.stats.chores++;return {coins:chore.coins,xp:chore.xp};
}
export function currentProject(state){
 const n=state.estate.completed;if(n<PROJECTS.length)return {...PROJECTS[n],id:n};
 const cycle=n-PROJECTS.length+1,factor=1+cycle*.2;
 return {id:n,name:`Estate commission ${cycle}`,description:'An ongoing contract for an established estate. A larger commission follows each one.',coins:Math.round(200000*factor),input:{bread:Math.ceil(80*factor),oil:Math.ceil(30*factor),vegetables:Math.ceil(50*factor)},medals:18,duration:259200000,xp:3000+cycle*200};
}
export function startProject(state,now=Date.now()){
 if(state.estate.job)throw new Error('Finish your current estate project first.');const project=currentProject(state);
 if(state.mastery.claimed.length<project.medals)throw new Error(`Earn ${project.medals} crop mastery medals for this project.`);
 if(state.coins<project.coins)throw new Error(`You need ${project.coins.toLocaleString('en-US')} coins for this project.`);
 if(Object.entries(project.input).some(([k,n])=>state.inventory[k]<n))throw new Error('Gather the required goods before starting this project.');
 state.coins-=project.coins;for(const[k,n]of Object.entries(project.input))state.inventory[k]-=n;
 state.estate.job={id:project.id,startedAt:now,readyAt:now+project.duration};return {name:project.name,readyAt:state.estate.job.readyAt};
}
export function completeProject(state,now=Date.now()){
 const job=state.estate.job;if(!job)throw new Error('Start an estate project first.');if(now<job.readyAt)throw new Error('Your project is still being built.');
 const project=currentProject(state);settleStall(state,now);state.estate.completed++;state.estate.job=null;state.stats.projects++;state.xp+=project.xp;return {name:project.name,xp:project.xp,completed:state.estate.completed};
}
