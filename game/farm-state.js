export const CROPS = Object.freeze({
 corn:       {name:'Corn',cost:10,sell:40,duration:900000,xp:5,model:'plant_001',height:1.55,use:'Animal feed'},
 wheat:      {name:'Wheat',cost:3,sell:8,duration:120000,xp:2,model:'plant_011',height:.85,use:'Flour & bread'},
 cabbage:    {name:'Cabbage',cost:40,sell:110,duration:7200000,xp:12,model:'plant_004',height:.48,use:'Vegetable boxes'},
 pumpkin:    {name:'Pumpkin',cost:95,sell:250,duration:28800000,xp:24,model:'plant_003',height:.8,use:'Pumpkin pies'},
 sunflower:  {name:'Sunflower',cost:180,sell:480,duration:86400000,xp:45,model:'plant_007',height:1.65,use:'Sunflower oil'},
 barley: {name:'Barley',cost:20,sell:85,duration:2700000,xp:8,model:'plant_010',height:1.05,use:'Animal feed',art:'/assets/icons/barley.svg'},
 lettuce:{name:'Lettuce',cost:7,sell:20,duration:300000,xp:3,model:'plant_005',height:.47,use:'Fresh salads',art:'/assets/icons/lettuce.svg'},
 redcabbage:{name:'Red cabbage',cost:130,sell:340,duration:43200000,xp:32,model:'plant_004',height:.6,use:'Pickled vegetables',art:'/assets/icons/redcabbage.svg',tint:0xb66cce},
 cauliflower:{name:'Cauliflower',cost:65,sell:175,duration:14400000,xp:18,model:'plant_005',height:.5,use:'Vegetable boxes'}
});
export const PRODUCTS = Object.freeze({
 honey:{name:'Honey',sell:35,icon:'hexagon',color:'gold'},
 grainmeal:{name:'Grain meal',sell:180,icon:'wheat',color:'wheat'},
 fertilizer:{name:'Natural fertilizer',sell:260,icon:'sprout',color:'green'},
 salad:{name:'Fresh salad',sell:450,icon:'salad',color:'green'},
 pickles:{name:'Pickled cabbage',sell:1100,icon:'amphora',color:'coral'},
 flour:{name:'Flour',sell:60,icon:'wheat',color:'wheat'},
 feed:{name:'Animal feed',sell:115,icon:'package-open',color:'wheat'},
 oil:{name:'Sunflower oil',sell:1600,icon:'droplet',color:'gold'},
 milk:{name:'Milk',sell:80,icon:'milk',color:'blue'},
 eggs:{name:'Eggs',sell:50,icon:'egg',color:'cream'},
 cheese:{name:'Cheese',sell:230,icon:'sandwich',color:'gold'},
 bread:{name:'Fresh bread',sell:340,icon:'croissant',color:'wheat'},
 pie:{name:'Fresh pumpkin pie',sell:1250,icon:'cake-slice',color:'coral'},
 vegetables:{name:'Vegetable box',sell:1700,icon:'salad',color:'green'}
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
 if(action.type==='chore'&&result.success)m.chore=true;
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
 {title:'Pumpkin perfection',description:'Collect 6 fresh pumpkin pies from the Bakery.',stat:'made_pie',target:6,reward:400},
 // Append-only: existing quest IDs and claimed rewards never move.
 {"title":"A helping hand everywhere","description":"Complete 8 hands-on jobs.","stat":"activities","target":8,"reward":180},
 {"title":"Greenhouse regular","description":"Finish 10 Greenhouse jobs.","stat":"activity_greenhouse","target":10,"reward":220},
 {"title":"A taste of honey","description":"Finish 5 Apiary jobs.","stat":"activity_apiary","target":5,"reward":180},
 {"title":"The bee keeper","description":"Finish 30 Apiary jobs.","stat":"activity_apiary","target":30,"reward":550},
 {"title":"Happy animals","description":"Finish 10 Animal paddock jobs.","stat":"activity_paddock","target":10,"reward":220},
 {"title":"Tools in good hands","description":"Finish 10 Tool workshop jobs.","stat":"activity_workshop","target":10,"reward":220},
 {"title":"Around the farm","description":"Finish 3 full farm rounds by helping at all four stops.","stat":"activity_rounds","target":3,"reward":300},
 {"title":"A well-loved farm","description":"Finish 25 full farm rounds.","stat":"activity_rounds","target":25,"reward":1600},
 {"title":"Clear paths ahead","description":"Successfully clear the paths 10 times.","stat":"chore_weeds","target":10,"reward":180},
 {"title":"Water you can count on","description":"Successfully fill the water troughs 10 times.","stat":"chore_troughs","target":10,"reward":350},
 {"title":"Everything in its place","description":"Successfully sort the seed boxes 10 times.","stat":"chore_sorting","target":10,"reward":650},
 {"title":"Working side by side","description":"Start 5 batches while another batch is still running in the same building.","stat":"parallel_batches","target":5,"reward":250},
 {"title":"An efficient workshop","description":"Start 50 batches while another batch is still running in the same building.","stat":"parallel_batches","target":50,"reward":1400},
 {"title":"Good soil, good harvests","description":"Collect 15 natural fertilizer from production.","stat":"made_fertilizer","target":15,"reward":300},
 {"title":"Food for the farm","description":"Collect 30 animal feed from production.","stat":"made_feed","target":30,"reward":350},
 {"title":"Fresh combinations","description":"Collect 10 fresh salads.","stat":"made_salad","target":10,"reward":400},
 {"title":"A pantry worth keeping","description":"Collect 10 pickled cabbage.","stat":"made_pickles","target":10,"reward":600},
 {"title":"Sweet deliveries","description":"Complete 5 delivery orders containing Honey.","stat":"honey_deliveries","target":5,"reward":300},
 {"title":"Crafted with care","description":"Complete 15 delivery orders containing processed farm goods.","stat":"crafted_deliveries","target":15,"reward":600},
 {"title":"A familiar daily rhythm","description":"Complete 30 daily challenges.","stat":"dailies","target":30,"reward":600},
 {"title":"The roadside regular","description":"Collect 2,000 coins from the farm stall.","stat":"passive_earned","target":2000,"reward":400},
 {"title":"Prepared for the season","description":"Upgrade silo research 3 times.","stat":"silo_upgrades","target":3,"reward":400},
 {"title":"Wheat specialist","description":"Harvest 100 wheat.","stat":"harvest_wheat","target":100,"reward":300},
 {"title":"Corn specialist","description":"Harvest 75 corn.","stat":"harvest_corn","target":75,"reward":500},
 {"title":"Lettuce specialist","description":"Harvest 100 lettuce.","stat":"harvest_lettuce","target":100,"reward":300},
 {"title":"Barley specialist","description":"Harvest 60 barley.","stat":"harvest_barley","target":60,"reward":500},
 {"title":"Cabbage specialist","description":"Harvest 40 cabbage.","stat":"harvest_cabbage","target":40,"reward":500},
 {"title":"Cauliflower specialist","description":"Harvest 30 cauliflower.","stat":"harvest_cauliflower","target":30,"reward":500},
 {"title":"Pumpkin specialist","description":"Harvest 25 pumpkin.","stat":"harvest_pumpkin","target":25,"reward":500},
 {"title":"Red cabbage specialist","description":"Harvest 20 red cabbage.","stat":"harvest_redcabbage","target":20,"reward":500},
 {"title":"Sunflower specialist","description":"Harvest 15 sunflower.","stat":"harvest_sunflower","target":15,"reward":500}
]);
export const MAX_PLOTS=24;
export function xpForLevel(level){const n=level-1;return 60*n+20*n*(n-1);}
export function levelOf(state){const total=state.xp+(state.xpOffset??0);return 1+Math.floor((Math.sqrt(1600+80*total)-40)/40);}
export function levelProgress(state){const level=levelOf(state);return {level,current:state.xp+(state.xpOffset??0)-xpForLevel(level),target:60+40*(level-1)};}
export const MAX_BUILDING_LEVEL=10;
export function productionSlots(level){return Math.max(1,Math.min(MAX_BUILDING_LEVEL,Math.floor(level)));}
// Keep the primary job for older clients; extra jobs run in parallel, not a queue.
export function productionJobs(building){return [building?.job,...(building?.extraJobs??[])].filter(Boolean);}
export function recipeValue(id){const r=RECIPES[id],value=items=>Object.entries(items).reduce((sum,[key,n])=>sum+ITEMS[key].sell*n,0);const input=value(r.input),output=value(r.output);return {input,output,added:output-input};}
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
 return level>=MAX_BUILDING_LEVEL?null:Math.ceil(Math.round(BUILDINGS[building].upgradeCost*(level<3?level*1.5:12*2.7**(level-3)))*(state.boosts?.upgradeCredits>0?.5:1));
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
 const b=state.buildings[r.building],used=productionJobs(b).length,slots=productionSlots(b.level),busy=used>=slots;
 const maxCount=Math.max(0,Math.min(slots-used,...Object.entries(r.input).map(([k,n])=>Math.floor(state.inventory[k]/n))));
 return {canStart:!busy&&missing.length===0,missing,busy,used,slots,maxCount};
}
export function startProduction(state,id,now=Date.now(),count=1){
 if(!Number.isInteger(count)||count<1||count>MAX_BUILDING_LEVEL)throw new Error('Choose 1–10 batches.');
 const a=recipeAvailability(state,id),r=RECIPES[id];
 if(count>a.slots-a.used)throw new Error('Not enough free production slots. Collect a finished batch first.');
 if(count>a.maxCount)throw new Error('Missing ingredients for this many batches.');
 const batches=Array.from({length:count},()=>startSingleProduction(state,id,now));
 return {...batches[0],count,batches};
}
function startSingleProduction(state,id,now=Date.now()){
 if(!Object.hasOwn(RECIPES,id))throw new Error('Choose a valid recipe.');
 const r=RECIPES[id],b=state.buildings[r.building],a=recipeAvailability(state,id);
 if(a.busy)throw new Error('All production slots are occupied. Collect a finished batch first.');
 if(a.missing.length)throw new Error('Missing ingredients: '+a.missing.map(m=>`${m.name} (${m.have}/${m.need})`).join(', ')+'.');
 const duration=recipeDuration(state,id);
 for(const [k,n]of Object.entries(r.input))state.inventory[k]-=n;
 b.batchSequence=(b.batchSequence??0)+1;
 const job={id:`${r.building}-${b.batchSequence}`,recipe:id,startedAt:now,readyAt:now+duration,output:{...r.output},xp:r.xp};
 if(productionJobs(b).some(j=>j.readyAt>now))state.stats.parallel_batches=(state.stats.parallel_batches??0)+1;
 if(!b.job)b.job=job;else (b.extraJobs??=[]).push(job);
 return {building:r.building,recipe:id,jobId:job.id,readyAt:job.readyAt};
}
export function collectProduction(state,building,now=Date.now(),jobId){
 if(!Object.hasOwn(BUILDINGS,building)||building==='farmhouse')throw new Error('Choose a production building.');
 const b=state.buildings[building],jobs=productionJobs(b),job=jobId===undefined?(jobs.find(j=>j.readyAt<=now)??jobs[0]):jobs.find(j=>j.id===jobId);
 if(!job)throw new Error('Nothing to collect yet. Start a recipe first.');
 if(now<job.readyAt)throw new Error('This batch is still being made.');
 const r=RECIPES[job.recipe],output=job.output??r.output,xp=job.xp??r.xp;
 for(const [k,n]of Object.entries(output)){state.inventory[k]+=n;state.stats['made_'+k]=(state.stats['made_'+k]??0)+n;}
 state.stats.produced++;state.stats.bread+=output.bread??0;state.xp+=xp;
 const remaining=jobs.filter(j=>j!==job);b.job=remaining.shift()??null;b.extraJobs=remaining;
 if(building==='windmill')state.stats.windmill_batches=(state.stats.windmill_batches??0)+1;
 return {building,items:{...output},xp};
}
export function upgradeBuilding(state,building){
 if(!Object.hasOwn(BUILDINGS,building)||building==='farmhouse')throw new Error('Choose a production building.');
 const b=state.buildings[building],cost=upgradeCost(state,building);
 if(cost===null)throw new Error('This building is fully upgraded.');
 if(productionJobs(b).length)throw new Error('Finish and collect all current batches before upgrading.');
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
 if((state.stats[q.stat]??0)<q.target)throw new Error('Finish this quest to claim your reward.');
 state.claimed.push(id);state.coins+=q.reward;state.xp+=15;
 return {coins:q.reward,xp:15};
}
export function farmSummary(state,now=Date.now()) {
 return {coins:state.coins,diamonds:state.diamonds,boosts:{...state.boosts},xp:state.xp,level:levelOf(state),inventory:{...state.inventory},plots:state.plots.map(p=>({id:p.id,crop:p.crop,watered:p.watered,fertilized:p.fertilized,status:!p.crop?'empty':now>=p.readyAt?'ready':'growing',secondsRemaining:Math.max(0,Math.ceil((p.readyAt-now)/1000))})),buildings:Object.entries(state.buildings).map(([id,b])=>({id,name:BUILDINGS[id].name,level:b.level,slots:id==='farmhouse'?0:productionSlots(b.level),jobs:productionJobs(b).map(j=>({id:j.id,recipe:j.recipe,secondsRemaining:Math.max(0,Math.ceil((j.readyAt-now)/1000))})),status:productionJobs(b).some(j=>now>=j.readyAt)?'ready':b.job?(now>=b.job.readyAt?'ready':'working'):'idle',job:b.job?{recipe:b.job.recipe,secondsRemaining:Math.max(0,Math.ceil((b.job.readyAt-now)/1000))}:null,upgradeCost:upgradeCost(state,id)})),expansionCost:expansionCost(state),quests:QUESTS.map((q,id)=>({id,title:q.title,progress:Math.min(q.target,state.stats[q.stat]),target:q.target,claimed:state.claimed.includes(id)}))};
}

export const DAY_MS=86400000;
export const DAILY_REWARDS=[40,55,70,85,100,120,160];
export const DAILY_DIAMONDS=[4,6,8,10,12,16,24];
export const DAILY_CHALLENGE_DIAMONDS=Object.freeze([2,2,4]);
export const DIAMOND_PACKS=Object.freeze([{amount:50,price:'€1.99'},{amount:300,price:'€9.99'},{amount:1000,price:'€24.99'}]);
export const SINGLE_CROP_COST=10;
export function finishSingleCrop(state,id,expectedCost,now=Date.now()){
 if(expectedCost!==SINGLE_CROP_COST)throw new Error('The price has changed. Reload the game.');
 if(!Number.isInteger(id)||id<0||id>=state.plots.length)throw new Error('Choose one unlocked field.');
 const plot=state.plots[id];
 if(!plot.crop||plot.readyAt<=now)throw new Error('Choose a crop that is still growing.');
 if(state.diamonds<SINGLE_CROP_COST)throw new Error(`You need ${SINGLE_CROP_COST} diamonds.`);
 state.diamonds-=SINGLE_CROP_COST;plot.readyAt=now;
 state.stats.boosts_used=(state.stats.boosts_used??0)+1;
 return {field:id,crop:plot.crop,cost:SINGLE_CROP_COST,affected:1};
}
export const BOOSTS=Object.freeze({
 xp:{name:'Double XP',cost:25,duration:1800000,art:'xp',description:'Earn twice the XP from farm actions for 30 minutes.'},
 coins:{name:'Double earnings',cost:60,duration:1800000,art:'coins',description:'Double your market sales and delivery coins for 30 minutes. Passive income and gifts stay the same.'},
 crops:{name:'Instant harvest',cost:90,art:'seeds',description:'Make every currently growing crop ready to harvest. Crops stay in their fields until you collect them.'},
 upgrade:{name:'Builder’s discount',cost:150,art:'hammer',description:'Save 50% of the coin cost on your next production-building upgrade. One voucher at a time; it never expires.'},
 production:{name:'Finish production',cost:75,art:'boost',description:'Finish all current production batches instantly. Collect the finished goods from their buildings.'}
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
 if(id==='production'&&!Object.values(state.buildings).some(b=>productionJobs(b).some(j=>j.readyAt>now)))reason='No batches are running';
 return {...boost,remaining,reason,canBuy:!reason&&state.diamonds>=boost.cost};
}
export function buyBoost(state,id,now=Date.now()){
 const status=boostStatus(state,id,now);
 if(status.reason)throw new Error(status.reason+'.');
 if(state.diamonds<status.cost)throw new Error(`You need ${status.cost} diamonds. Earn more from daily gifts and challenges.`);
 if(id==='xp')state.boosts.xpUntil=now+status.duration;
 if(id==='coins')state.boosts.coinsUntil=now+status.duration;
 if(id==='upgrade')state.boosts.upgradeCredits=1;
 let affected=0;
 if(id==='crops')for(const p of state.plots)if(p.crop&&p.readyAt>now){p.readyAt=now;affected++;}
 if(id==='production')for(const b of Object.values(state.buildings))for(const job of productionJobs(b))if(job.readyAt>now){job.readyAt=now;affected++;}
 state.diamonds-=status.cost;
 state.stats.boosts_used=(state.stats.boosts_used??0)+1;
 return {boost:id,cost:status.cost,affected,expiresAt:status.duration?now+status.duration:null};
}
export function fertilizeFields(state,ids,now=Date.now()){
 if(!Array.isArray(ids)||!ids.length||ids.length>MAX_PLOTS||new Set(ids).size!==ids.length)throw new Error('Select unique growing fields to fertilize.');
 for(const id of ids){
  if(!Number.isInteger(id)||id<0||id>=state.plots.length)throw new Error('Choose unlocked fields.');
  const p=state.plots[id];if(!p.crop||p.readyAt<=now||p.fertilized)throw new Error('One of these fields is no longer eligible. Refresh your selection.');
 }
 if(state.inventory.fertilizer<ids.length)throw new Error(`You need ${ids.length} fertilizer for these fields.`);
 const fields=ids.map(id=>fertilizeField(state,id,now));
 return {fields,count:fields.length,cost:fields.length,xp:fields.reduce((n,f)=>n+f.xp,0)};
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
const LEGACY_DAILY_POOLS=[
 [{stat:'harvested',target:8,title:'Bring in the harvest',description:'Harvest 8 crops.',reward:45},{stat:'watered',target:8,title:'A little extra care',description:'Water 8 growing crops.',reward:40},{stat:'planted',target:10,title:'A fresh start',description:'Plant 10 crops.',reward:45}],
 [{stat:'produced',target:2,title:'Busy little buildings',description:'Collect 2 production batches.',reward:55},{stat:'made_milk',target:4,title:'Fresh from the barn',description:'Collect 4 milk.',reward:60},{stat:'made_eggs',target:6,title:'The morning basket',description:'Collect 6 eggs.',reward:55}],
 [{stat:'earned',target:120,title:'Market day',description:'Earn 120 coins from sales or deliveries.',reward:55},{stat:'deliveries',target:1,title:'Special delivery',description:'Complete an order at the farm cart.',reward:60},{stat:'harvest_wheat',target:6,title:'Golden fields',description:'Harvest 6 wheat.',reward:45}]
];
const LEGACY_ORDER_POOL=[
 {title:'The village grocer',input:{corn:3,lettuce:2},coins:112,xp:18},
 {title:'Breakfast at the inn',input:{eggs:3,milk:2},coins:155,xp:25},
 {title:'The flower stall',input:{sunflower:3},coins:190,xp:25},
 {title:'Sunday lunch',input:{cabbage:2,pumpkin:2},coins:132,xp:20},
 {title:'The baker next door',input:{wheat:5},coins:60,xp:15},
 {title:'A picnic in the park',input:{bread:2,salad:1},coins:265,xp:35},
 {title:'Autumn pantry',input:{redcabbage:2,cauliflower:2},coins:245,xp:30}
];
export const DAILY_POOLS=LEGACY_DAILY_POOLS.map((pool,id)=>Object.freeze([...pool,...[[{"stat":"activity_greenhouse","target":2,"title":"Seedling care","description":"Finish 2 Greenhouse jobs.","reward":65},{"stat":"activity_paddock","target":2,"title":"Happy herd","description":"Finish 2 Animal paddock jobs.","reward":65},{"stat":"chore_weeds","target":3,"title":"A tidy start","description":"Successfully clear the paths 3 times.","reward":70},{"stat":"tended","target":4,"title":"More than watering","description":"Give 4 growing crops extra care.","reward":65},{"stat":"harvest_lettuce","target":8,"title":"Leafy little harvest","description":"Harvest 8 lettuce.","reward":55},{"stat":"harvest_corn","target":6,"title":"Golden corn","description":"Harvest 6 corn.","reward":65}],[{"stat":"activity_apiary","target":3,"title":"Honey time","description":"Finish 3 Apiary jobs and collect their Honey.","reward":85},{"stat":"activity_workshop","target":3,"title":"Tools of the trade","description":"Finish 3 Tool workshop jobs.","reward":85},{"stat":"made_feed","target":3,"title":"Feed the farm","description":"Collect 3 animal feed from production.","reward":80},{"stat":"parallel_batches","target":2,"title":"Side by side","description":"Start 2 batches while another batch is still running in the same building.","reward":90,"parallel":true},{"stat":"fertilized","target":2,"title":"A soil boost","description":"Use natural fertilizer on 2 growing fields.","reward":80,"minLevel":3},{"stat":"made_flour","target":4,"title":"Flour power","description":"Collect 4 flour from production.","reward":80,"minLevel":3},{"stat":"made_salad","target":1,"title":"Freshly prepared","description":"Collect 1 fresh salad.","reward":90,"minLevel":4}],[{"stat":"activity_rounds","target":1,"title":"Make the rounds","description":"Finish a full farm round by helping at all four stops.","reward":110},{"stat":"activities","target":6,"title":"A hands-on day","description":"Finish 6 hands-on jobs around the farm.","reward":110},{"stat":"chore_troughs","target":2,"title":"Fresh water rounds","description":"Successfully fill the water troughs twice.","reward":110,"chore":"troughs"},{"stat":"chore_sorting","target":1,"title":"Everything sorted","description":"Successfully sort the seed boxes once.","reward":140,"chore":"sorting"},{"stat":"made_bread","target":2,"title":"Warm from the oven","description":"Collect 2 fresh bread.","reward":100,"minLevel":4},{"stat":"passive_earned","target":30,"title":"Roadside trade","description":"Collect 30 coins from the farm stall.","reward":80,"minLevel":3}]][id]]));
export const ORDER_POOL=Object.freeze([{"title":"The baker next door","input":{"wheat":5},"xp":15,"minLevel":1},{"title":"A leafy lunch","input":{"lettuce":4,"corn":2},"xp":20,"minLevel":1},{"title":"Sweet little favour","input":{"honey":2,"wheat":4},"xp":20,"minLevel":1},{"title":"Breakfast at the inn","input":{"eggs":3,"milk":2},"xp":25,"minLevel":1},{"title":"The paddock pantry","input":{"feed":2,"corn":2},"xp":25,"minLevel":1},{"title":"Honey on toast","input":{"honey":2,"bread":2},"xp":35,"minLevel":3},{"title":"A cream tea","input":{"honey":3,"milk":2,"bread":1},"xp":35,"minLevel":3},{"title":"The village grocer","input":{"corn":3,"lettuce":2,"cabbage":1},"xp":25,"minLevel":3},{"title":"The millers basket","input":{"grainmeal":2,"flour":4},"xp":30,"minLevel":3},{"title":"For the garden club","input":{"fertilizer":2,"lettuce":4},"xp":30,"minLevel":3},{"title":"The animal sanctuary","input":{"feed":3,"barley":3},"xp":30,"minLevel":3},{"title":"A picnic in the park","input":{"bread":2,"salad":1,"honey":1},"xp":40,"minLevel":4},{"title":"The cheese board","input":{"cheese":2,"bread":1},"xp":35,"minLevel":4},{"title":"A farm-fresh lunch","input":{"salad":2,"eggs":3},"xp":35,"minLevel":4},{"title":"Sunday lunch","input":{"cabbage":2,"pumpkin":2},"xp":35,"minLevel":5},{"title":"The harvest kitchen","input":{"vegetables":1,"flour":3},"xp":45,"minLevel":5},{"title":"A golden afternoon","input":{"pie":1,"honey":2,"milk":2},"xp":50,"minLevel":6},{"title":"Autumn pantry","input":{"redcabbage":2,"cauliflower":2},"xp":40,"minLevel":6},{"title":"The village feast","input":{"bread":3,"cheese":2,"vegetables":1},"xp":65,"minLevel":7},{"title":"Pantry provisions","input":{"pickles":1,"vegetables":1},"xp":55,"minLevel":7},{"title":"A chefs finishing touch","input":{"oil":1,"salad":2,"honey":2},"xp":65,"minLevel":8},{"title":"Golden harvest hamper","input":{"sunflower":2,"oil":1},"xp":60,"minLevel":8},{"title":"The autumn festival","input":{"pie":2,"pickles":1,"honey":3},"xp":75,"minLevel":8},{"title":"The estate banquet","input":{"oil":1,"vegetables":2,"cheese":2,"bread":2},"xp":85,"minLevel":10}]);
function availableDaily(state,q){
 return levelOf(state)>=(q.minLevel??1)&&(!q.chore||!choreStatus(state,q.chore).locked)&&(!q.parallel||Object.entries(state.buildings).some(([id,b])=>id!=='farmhouse'&&b.level>=2));
}
function selectDailyTasks(state,day){
 return DAILY_POOLS.map((pool,id)=>{const eligible=pool.filter(q=>availableDaily(state,q));return {...eligible[(day+id)%eligible.length]};});
}
export function deliveryDiamonds(order){
 const entries=Object.entries(order.input),value=entries.reduce((n,[k,count])=>n+ITEMS[k].sell*count,0);
 const crafted=entries.filter(([k])=>k!=='honey'&&Object.hasOwn(PRODUCTS,k)).length;
 const difficulty=value+crafted*250+Math.max(0,entries.length-1)*100;
 return difficulty>=3000?4:difficulty>=1400?3:difficulty>=500?2:1;
}
function orderQuote(order){return {...order,diamonds:deliveryDiamonds(order),coins:Math.ceil(Object.entries(order.input).reduce((n,[key,count])=>n+ITEMS[key].sell*count,0)*1.4)};}
function selectDailyOrders(state,day){
 const eligible=ORDER_POOL.filter(o=>levelOf(state)>=(o.minLevel??1));
 return [0,Math.floor(eligible.length/3),Math.floor(eligible.length*2/3)].map(offset=>orderQuote(eligible[(day+offset)%eligible.length]));
}
export function utcDay(now=Date.now()){return new Date(now).toISOString().slice(0,10);}
export function dayNumber(now=Date.now()){return Math.floor(now/DAY_MS);}
export function seedCost(state,crop){return Math.max(1,Math.ceil(CROPS[crop].cost*(1-siloBonus(state.siloLevel??0).seeds)));}
export function normalizeFarm(state,now=Date.now()){
 const oldVersion=state.version??0;
 if((state.version??0)<4){const previousLevel=1+Math.floor(state.xp/60);state.xpOffset=xpForLevel(previousLevel)-60*(previousLevel-1);}
 state.version=10;state.inventory??={};for(const k of Object.keys(ITEMS))state.inventory[k]??=0;
 state.diamonds=Number.isFinite(state.diamonds)?Math.max(0,Math.floor(state.diamonds)):0;
 state.boosts??={};for(const key of ['xpUntil','coinsUntil','upgradeCredits'])state.boosts[key]=Number.isFinite(state.boosts[key])?Math.max(0,Math.floor(state.boosts[key])):0;
 state.boosts.upgradeCredits=Math.min(1,state.boosts.upgradeCredits);
 state.buildings??={};for(const key of Object.keys(BUILDINGS))state.buildings[key]??={level:1,job:null};
 // Keep paid-for legacy flour batches intact when milling moves to the Windmill.
 if(oldVersion<6&&state.buildings.mill.job?.recipe==='flour'){
  state.buildings.mill.job.output??={flour:1};state.buildings.mill.job.xp??=8;
 }
 for(const [key,b] of Object.entries(state.buildings)){
  b.extraJobs??=[];b.batchSequence??=0;
  for(const job of productionJobs(b))if(!job.id)job.id=`${key}-${++b.batchSequence}`;
 }
 state.stats??={};
 if(oldVersion<10){
  // Only recover counters that old saves actually recorded; never invent chore wins.
  const recovered={activity_rounds:state.activities?.rounds??0,silo_upgrades:state.siloLevel??0,...Object.fromEntries(Object.entries(state.activities?.completed??{}).map(([id,n])=>['activity_'+id,n]))};
  for(const [key,n] of Object.entries(recovered)){state.stats[key]??=n;if(state.daily?.baseline)state.daily.baseline[key]??=state.stats[key];}
 }
 for(const q of QUESTS)state.stats[q.stat]??=0;
 for(const k of ['harvested','watered','planted','produced','earned','deliveries','tractor','dailies','tended','chores','passive_earned','projects','mastery_medals'])state.stats[k]??=0;
 state.discovered??=[];state.siloLevel??=0;state.tractorReadyAt??=0;
 state.login??={lastDay:null,streak:0,best:0,visits:0};state.levelRewards??=[1];
 // Existing farms keep every regular quest, inventory item and timer. A past daily gift
 // counts so returning players never have to wait a day to finish the introduction.
 state.onboarding??={completed:0,milestones:{gift:state.login.visits>0},rewardClaimed:false};
 state.onboarding.milestones??={};
 state.mastery??={harvests:Object.fromEntries(Object.keys(CROPS).map(k=>[k,state.stats['harvest_'+k]??0])),claimed:[]};
 state.stall??={level:1,since:now,bank:0};state.estate??={completed:0,job:null};state.chores??={};state.chorePractice??={};
 state.activities??={jobs:{},cooldowns:{},completed:{},round:[],rounds:0};
 for(const p of state.plots){p.tended??=false;p.fertilized??=false;p.careAt??=p.plantedAt+Math.max(0,(p.readyAt-p.plantedAt)*.3);}
 const day=utcDay(now);
 const existingDay=state.daily?.date===day;
 if(!existingDay)state.daily={date:day,baseline:{...state.stats},claimed:[],orders:[],bonusClaimed:false};
 const d=dayNumber(now);
 state.daily.tasks??=oldVersion<10&&existingDay?LEGACY_DAILY_POOLS.map((pool,id)=>({...pool[(d+id)%pool.length]})):selectDailyTasks(state,d);
 state.daily.orderBoard??=oldVersion<10&&existingDay?[0,2,4].map(offset=>orderQuote(LEGACY_ORDER_POOL[(d+offset)%LEGACY_ORDER_POOL.length])):selectDailyOrders(state,d);
 return state;
}
export function createFarm(now=Date.now()){return normalizeFarm(createBaseFarm(now),now);}
export function dailyTasks(state,now=Date.now()){
 normalizeFarm(state,now);const d=dayNumber(now);
 return state.daily.tasks.map((q,id)=>{return {...q,id,diamonds:DAILY_CHALLENGE_DIAMONDS[id],progress:Math.min(q.target,Math.max(0,(state.stats[q.stat]??0)-(state.daily.baseline[q.stat]??0))),claimed:state.daily.claimed.includes(id)};});
}
export function dailyOrders(state,now=Date.now()){
 normalizeFarm(state,now);const d=dayNumber(now);
 return state.daily.orderBoard.map((order,id)=>({...order,diamonds:deliveryDiamonds(order),id,done:state.daily.orders.includes(id)}));
}
export function claimDaily(state,id,day,now=Date.now()){
 normalizeFarm(state,now);if(day!==utcDay(now))throw new Error('A new day has started. Check the fresh challenges.');
 const q=dailyTasks(state,now).find(q=>q.id===id);if(!q)throw new Error('Choose a daily challenge.');
 if(q.claimed)throw new Error('You already claimed this daily reward.');if(q.progress<q.target)throw new Error('Finish this daily challenge first.');
 state.daily.claimed.push(id);state.coins+=q.reward;state.diamonds+=q.diamonds;state.xp+=10;state.stats.dailies++;
 state.stats.challenge_diamonds=(state.stats.challenge_diamonds??0)+q.diamonds;
 let bonus=0;if(state.daily.claimed.length===3&&!state.daily.bonusClaimed){bonus=60;state.daily.bonusClaimed=true;state.coins+=bonus;state.xp+=15;}
 return {coins:q.reward+bonus,diamonds:q.diamonds,xp:10+(bonus?15:0),bonus};
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
 state.diamonds+=order.diamonds;state.stats.delivery_diamonds=(state.stats.delivery_diamonds??0)+order.diamonds;
 if(order.input.honey)state.stats.honey_deliveries=(state.stats.honey_deliveries??0)+1;
 if(Object.keys(order.input).some(k=>k!=='honey'&&Object.hasOwn(PRODUCTS,k)))state.stats.crafted_deliveries=(state.stats.crafted_deliveries??0)+1;
 return {coins:order.coins,xp:order.xp,diamonds:order.diamonds};
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
 state.coins-=cost;state.siloLevel++;state.stats.silo_upgrades=(state.stats.silo_upgrades??0)+1;state.xp+=20;return {level:state.siloLevel,cost};
}
export function applyFarmAction(state,action,now=Date.now(),random=secureChoreRandom){
 normalizeFarm(state,now);if(!action||typeof action!=='object')throw new Error('Choose a farm action.');
 const beforeXP=state.xp,beforeCoins=state.coins;
 const beginnerBefore={harvested:state.stats.harvested,wheat:state.stats.harvest_wheat??0,watered:state.stats.watered,tended:state.stats.tended};
 const result=dispatchFarmAction(state,action,now,random);
 recordBeginnerAction(state,action,result,beginnerBefore);
 const earnedXP=state.xp-beforeXP;
 if(state.boosts.xpUntil>now&&earnedXP>0){state.xp+=earnedXP;result.xp=(result.xp??earnedXP)+earnedXP;}
 if(state.boosts.coinsUntil>now&&['sell','delivery'].includes(action.type)){
  const bonus=state.coins-beforeCoins;if(bonus>0){state.coins+=bonus;state.stats.earned+=bonus;result.coins+=bonus;}
 }
 return result;
}
function dispatchFarmAction(state,action,now,random){
 switch(action.type){
  case 'finish_crop':return finishSingleCrop(state,action.id,action.expectedCost,now);
  case 'buy_boost':{
   if(!Object.hasOwn(BOOSTS,action.boost))throw new Error('Choose a valid boost.');
   if(action.expectedCost!==BOOSTS[action.boost].cost)throw new Error('Boost prices have changed. Reload the game to see current prices.');
   return buyBoost(state,action.boost,now);
  }
  case 'fertilize':return action.ids===undefined?fertilizeField(state,action.id,now):fertilizeFields(state,action.ids,now);
  case 'stall_collect':return collectStall(state,now);
  case 'stall_upgrade':return upgradeStall(state,now);
  case 'chore':return doChore(state,action.id,now,random);
  case 'activity_start':return startActivity(state,action.station,now);
  case 'activity_work':return workActivity(state,action,now);
  case 'mastery':return claimMastery(state,action.crop,action.tier);
  case 'project_start':return startProject(state,now);
  case 'project_collect':return completeProject(state,now);
  case 'field':return actOnPlot(state,action.id,action.action,action.crop??'corn',now);
  case 'sell':return sellCrops(state,action.item??'all');
  case 'produce':return startProduction(state,action.recipe,now,action.count);
  case 'collect':return collectProduction(state,action.building,now,action.jobId);
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
export const CHORES=Object.freeze({
 weeds:{name:'Clear the paths',description:'Pull weeds along the farm paths.',icon:'shovel',coins:18,xp:4,cooldown:60000,baseChance:60,maxChance:100},
 troughs:{name:'Fill the water troughs',description:'Fresh water for the animals.',icon:'droplets',coins:40,xp:8,cooldown:180000,baseChance:40,maxChance:80,requires:'weeds'},
 sorting:{name:'Sort the seed boxes',description:'Get tomorrow’s planting ready.',icon:'package-open',coins:90,xp:16,cooldown:480000,baseChance:35,maxChance:60,requires:'troughs'},
 fences:{name:'Mend the orchard fence',description:'Repair loose rails and keep the orchard safe.',icon:'fence',coins:180,xp:35,cooldown:900000,baseChance:30,maxChance:70,requires:'sorting'},
 irrigation:{name:'Restore the irrigation',description:'Clear the channels and bring water to the far fields.',icon:'waves',coins:330,xp:65,cooldown:1500000,baseChance:25,maxChance:65,requires:'fences'},
 harvestfair:{name:'Prepare the harvest fair',description:'Arrange a prize-worthy display of the farm’s best goods.',icon:'party-popper',coins:600,xp:120,cooldown:2700000,baseChance:20,maxChance:60,requires:'irrigation'}
});
export function choreStatus(state,id,now=Date.now()){
 if(!Object.hasOwn(CHORES,id))throw new Error('Choose a farm chore.');
 const c=CHORES[id],attempts=Math.max(0,Math.floor(state.chorePractice?.[id]??0));
 const chance=Math.min(c.maxChance,c.baseChance+attempts*2);
 const previous=c.requires?choreStatus(state,c.requires,now):null;
 return {...c,attempts,chance,mastered:chance===c.maxChance,locked:!!previous&&(previous.locked||!previous.mastered),remaining:Math.max(0,(state.chores[id]??0)-now)};
}
function secureChoreRandom(){return globalThis.crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;}
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
export function doChore(state,id,now=Date.now(),random=secureChoreRandom){
 const chore=choreStatus(state,id,now);
 if(chore.locked)throw new Error(`Master ${CHORES[chore.requires].name} first.`);
 if(chore.remaining)throw new Error(`This chore returns in ${formatDuration(chore.remaining)}.`);
 const success=random()<chore.chance/100;
 state.chorePractice??={};state.chorePractice[id]=chore.attempts+1;
 state.chores[id]=now+chore.cooldown;
 const coins=success?chore.coins:0,xp=success?chore.xp:0;
 state.coins+=coins;state.xp+=xp;if(success){state.stats.chores++;state.stats['chore_'+id]=(state.stats['chore_'+id]??0)+1;}
 return {success,coins,xp,chance:chore.chance,nextChance:Math.min(chore.maxChance,chore.chance+2),attempts:chore.attempts+1,readyAt:state.chores[id]};
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

// Small hands-on jobs run alongside crops and production. Only server time and
// persisted progress determine rewards; the client submits a station and tile.
export const ACTIVE_STATIONS=Object.freeze({
 greenhouse:{name:'Greenhouse',icon:'sprout',model:'greenhouse_003',coins:20,xp:7,cooldown:180000,item:'lettuce',instruction:'Water the three dry seedlings.',target:'Dry seedling',other:'Healthy seedling',verb:'Water',targetIcon:'droplets',otherIcon:'sprout'},
 apiary:{name:'Apiary',icon:'flower-2',model:'apiary_001',coins:26,xp:8,cooldown:240000,item:'honey',instruction:'Collect the three capped honey frames. Leave the bees at work.',target:'Capped honey',other:'Bees at work',verb:'Collect',targetIcon:'hexagon',otherIcon:'flower-2'},
 paddock:{name:'Animal paddock',icon:'heart',model:'horse_002',coins:24,xp:7,cooldown:180000,item:'fertilizer',instruction:'Refill the three empty water bowls.',target:'Empty bowl',other:'Full bowl',verb:'Fill',targetIcon:'droplet',otherIcon:'waves'},
 workshop:{name:'Tool workshop',icon:'wrench',model:'lawn_mower_001',coins:30,xp:8,cooldown:240000,item:'feed',instruction:'Repair the three worn tools. The others are ready to use.',target:'Worn tool',other:'Ready tool',verb:'Repair',targetIcon:'wrench',otherIcon:'check'}
});
export const ACTIVITY_ROUND_REWARD=Object.freeze({coins:22,xp:10});
export function activityTargets(station,cycle){
 const offset=(Object.keys(ACTIVE_STATIONS).indexOf(station)+cycle)%6;
 return [0,2,3].map(i=>(i+offset)%6);
}
export function activityStatus(state,station,now=Date.now()){
 if(!Object.hasOwn(ACTIVE_STATIONS,station))throw new Error('Choose a farm activity.');
 const a=state.activities??{jobs:{},cooldowns:{},completed:{},round:[],rounds:0};
 return {...ACTIVE_STATIONS[station],station,job:a.jobs[station]??null,remaining:Math.max(0,(a.cooldowns[station]??0)-now),completed:a.completed[station]??0,inRound:a.round.includes(station)};
}
function startActivity(state,station,now){
 const s=activityStatus(state,station,now);
 if(s.job)throw new Error('This job is already in progress.');
 if(s.remaining)throw new Error(`This job returns in ${formatDuration(s.remaining)}.`);
 const job={startedAt:now,nextAt:now+600,targets:activityTargets(station,s.completed),done:[]};
 state.activities.jobs[station]=job;return {station,startedAt:now};
}
function workActivity(state,action,now){
 const s=activityStatus(state,action.station,now),job=s.job;
 if(!job||action.startedAt!==job.startedAt)throw new Error('Open the current job and try again.');
 if(!Number.isInteger(action.target)||!job.targets.includes(action.target))throw new Error(s.instruction);
 if(job.done.includes(action.target))throw new Error('That part of the job is already done.');
 if(now<job.nextAt)throw new Error('Give your last action a moment to finish.');
 job.done.push(action.target);job.nextAt=now+600;
 if(job.done.length<3)return {station:action.station,finished:false,progress:job.done.length};
 const a=state.activities;delete a.jobs[action.station];a.cooldowns[action.station]=now+s.cooldown;
 a.completed[action.station]=(a.completed[action.station]??0)+1;
 if(!a.round.includes(action.station))a.round.push(action.station);
 const roundComplete=Object.keys(ACTIVE_STATIONS).every(key=>a.round.includes(key));
 const coins=s.coins+(roundComplete?ACTIVITY_ROUND_REWARD.coins:0),xp=s.xp+(roundComplete?ACTIVITY_ROUND_REWARD.xp:0);
 if(roundComplete){a.round=[];a.rounds++;}
 state.coins+=coins;state.xp+=xp;
 if(s.item)state.inventory[s.item]++;
 state.stats.activities=(state.stats.activities??0)+1;
 state.stats['activity_'+action.station]=(state.stats['activity_'+action.station]??0)+1;
 if(roundComplete)state.stats.activity_rounds=(state.stats.activity_rounds??0)+1;
 return {station:action.station,finished:true,coins,xp,item:s.item??null,roundComplete};
}
