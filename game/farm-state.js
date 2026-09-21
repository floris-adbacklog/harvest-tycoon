export const FAMILY_MIN_LEVEL=10;
export const CROPS = Object.freeze({
 corn:       {name:'Corn',cost:10,sell:40,duration:900000,xp:5,model:'plant_001',height:1.55,use:'Animal feed'},
 wheat:      {name:'Wheat',cost:3,sell:8,duration:120000,xp:2,model:'plant_011',height:.85,use:'Flour & bread'},
 cabbage:    {name:'Cabbage',cost:40,sell:110,duration:7200000,xp:18,model:'plant_004',height:.48,use:'Vegetable boxes'},
 pumpkin:    {name:'Pumpkin',cost:95,sell:250,duration:28800000,xp:36,model:'plant_003',height:.8,use:'Pumpkin pies'},
 sunflower:  {name:'Sunflower',cost:180,sell:480,duration:86400000,xp:68,model:'plant_007',height:1.65,use:'Sunflower oil'},
 barley: {name:'Barley',cost:20,sell:85,duration:2700000,xp:12,model:'plant_010',height:1.05,use:'Animal feed',art:'/assets/icons/barley.svg'},
 lettuce:{name:'Lettuce',cost:7,sell:20,duration:300000,xp:3,model:'plant_005',height:.47,use:'Fresh salads',art:'/assets/icons/lettuce.svg'},
 redcabbage:{name:'Red cabbage',cost:130,sell:340,duration:43200000,xp:48,model:'plant_004',height:.6,use:'Pickled vegetables',art:'/assets/icons/redcabbage.svg',tint:0xb66cce},
 cauliflower:{name:'Cauliflower',cost:65,sell:175,duration:14400000,xp:27,model:'plant_005',height:.5,use:'Vegetable boxes'},
 greenbeans:{"name": "Green beans", "cost": 45, "sell": 90, "duration": 5400000, "xp": 21, "model": "plant_006", "height": 1.25, "use": "Vegetable stew", "minLevel": 6},
 apples:{"name": "Apples", "cost": 700, "sell": 100, "duration": 43200000, "regrow": 21600000, "xp": 33, "model": "tree_009", "height": 1.8, "use": "Apple juice & apple pie", "minLevel": 8, "perennial": true},
 berries:{"name": "Berries", "cost": 1000, "sell": 130, "duration": 28800000, "regrow": 14400000, "xp": 27, "model": "bush_003", "height": 0.95, "use": "Berry preserves & berry tart", "minLevel": 10, "perennial": true}
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
 vegetables:{name:'Vegetable box',sell:1700,icon:'salad',color:'green'},
 applejuice:{"name": "Apple juice", "sell": 650, "icon": "package-check", "color": "gold"},
 applepie:{"name": "Apple pie", "sell": 1200, "icon": "package-check", "color": "gold"},
 berrypreserves:{"name": "Berry preserves", "sell": 800, "icon": "package-check", "color": "gold"},
 berrytart:{"name": "Berry tart", "sell": 3000, "icon": "package-check", "color": "gold"},
 stew:{"name": "Vegetable stew", "sell": 1100, "icon": "package-check", "color": "gold"},
orchardjuice:{"name": "Apple & Berry Juice", "sell": 780, "icon": "package-check", "color": "gold"},
berrysmoothie:{"name": "Berry Smoothie", "sell": 810, "icon": "package-check", "color": "gold"},
applecompote:{"name": "Honey Apple Compote", "sell": 640, "icon": "package-check", "color": "gold"},
applevinegar:{"name": "Apple Vinegar", "sell": 1150, "icon": "package-check", "color": "gold"},
pickledbeans:{"name": "Pickled Green Beans", "sell": 4100, "icon": "package-check", "color": "gold"},
beangratin:{"name": "Green Bean Gratin", "sell": 1650, "icon": "package-check", "color": "gold"},
orchardsalad:{"name": "Orchard Salad", "sell": 1200, "icon": "package-check", "color": "gold"},
berrycheesecake:{"name": "Berry Cheesecake", "sell": 2250, "icon": "package-check", "color": "gold"},
harvesthamper:{"name": "Harvest Hamper", "sell": 5900, "icon": "package-check", "color": "gold"}

});
export const ITEMS=Object.freeze({...CROPS,...PRODUCTS});
// Calendar-based quotes are shared by every player and evaluated with server time.
// Common prices sit near normal; the outer bands are deliberately uncommon.
export const MARKET_PAYOUT_MULTIPLIER=0.8;
const reducedMarketPrice=value=>Math.max(1,Math.round(value*MARKET_PAYOUT_MULTIPLIER));
const MARKET_CURVE=[0,.12,.22,.30,.36,.41,.45,.48,.50,.50,.50,.52,.55,.59,.64,.70,.78,.88,1];
function calendarHash(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return h>>>0;}
export function marketQuote(item,now=Date.now()){
 if(!Object.hasOwn(ITEMS,item))throw new Error('Choose a valid market item.');
 const base=ITEMS[item].sell,range=item==='oil'?[.5,2]:Object.hasOwn(CROPS,item)?[.85,1.15]:[.7,1.6];
 const baseMin=Math.max(1,Math.round(base*range[0])),baseMax=Math.round(base*range[1]);
 const position=MARKET_CURVE[calendarHash(`market-v1:${utcDay(now)}:${item}`)%MARKET_CURVE.length];
 const originalPrice=Math.round(position<=.5?baseMin+(base-baseMin)*position*2:base+(baseMax-base)*(position-.5)*2);
 const price=reducedMarketPrice(originalPrice),normal=reducedMarketPrice(base),min=reducedMarketPrice(baseMin),max=reducedMarketPrice(baseMax);
 const change=Math.round((price/normal-1)*100),demand=change< -10?'low':change>10?'high':'fair';
 return {item,day:utcDay(now),price,normal,min,max,change,demand,label:demand==='low'?'Low demand':demand==='high'?'High demand':'Fair price',resetsAt:(dayNumber(now)+1)*DAY_MS};
}
export function marketValue(items,now=Date.now()){return Object.entries(items).reduce((sum,[key,count])=>sum+marketQuote(key,now).price*count,0);}
export function marketHighlights(now=Date.now(),state){
 const keys=state&&guidedFarm(state)?Object.keys(ITEMS).filter(k=>state.inventory[k]>0||itemAvailable(state,k)):Object.keys(PRODUCTS);
 const sorted=time=>keys.map(k=>marketQuote(k,time)).sort((a,b)=>b.change-a.change||a.item.localeCompare(b.item));
 return {today:sorted(now)[0],tomorrow:sorted(now+DAY_MS)[0]};
}
export const BUILDINGS = Object.freeze({
 familyhall:{name:'Family Hall',tagline:'Grow together with your Farm Family.',icon:'users',model:'house_008',type:'family',minLevel:FAMILY_MIN_LEVEL},
 farmhouse:{name:'Farmhouse',tagline:'Room for your next big idea.',icon:'house',model:'house_010',type:'farm',upgradeCost:140},
 mill:{name:'Feed Mill',tagline:'Make animal feed and press golden sunflower oil.',icon:'factory',model:'hangar_003',type:'production',upgradeCost:90},
 dairy:{name:'Dairy Barn',tagline:'Happy cows, fresh milk and farmhouse cheese.',icon:'milk',model:'hangar_004',type:'production',upgradeCost:110},
 coop:{name:'Chicken Coop',tagline:'A little feed. A basket of fresh eggs.',icon:'egg',model:'coop_001',type:'production',upgradeCost:75},
 bakery:{name:'Bakery',tagline:'Bake something worth coming home for.',icon:'croissant',model:'house_027',type:'production',upgradeCost:130},
 packing:{name:'Packing Shed',tagline:'Pack your vegetables for a better price.',icon:'package-check',model:'house_030',type:'production',upgradeCost:100},
 windmill:{name:'Windmill',tagline:'Mill grain, make natural fertilizer and help your crops grow.',icon:'wind',model:'tower_001',type:'production',upgradeCost:180},
 kitchen:{"name": "Farm Kitchen", "tagline": "Turn fresh vegetables into a comforting bowl of stew.", "icon": "cooking-pot", "model": "house_011", "type": "production", "upgradeCost": 420, "minLevel": 6, "buildCost": 3500},
 juicepress:{"name": "Juice Press", "tagline": "Bottle the sweetness of your orchard.", "icon": "cup-soda", "model": "hangar_005", "type": "production", "upgradeCost": 600, "minLevel": 8, "buildCost": 6500},
 preserves:{"name": "Preserves Workshop", "tagline": "Berries and honey, saved for something special.", "icon": "amphora", "model": "hangar_002", "type": "production", "upgradeCost": 850, "minLevel": 10, "buildCost": 10000}
});
export const RECIPES=Object.freeze({
 grainmeal:{building:'windmill',name:'Grind grain meal',input:{wheat:8,barley:4},output:{grainmeal:3},duration:1200000,xp:30},
 fertilizer:{building:'windmill',name:'Mix natural fertilizer',input:{grainmeal:2,cabbage:2},output:{fertilizer:3},duration:1800000,xp:40},
 windflour:{building:'windmill',name:'Mill a large flour batch',input:{grainmeal:3},output:{flour:14},duration:720000,xp:24},
 windfeed:{building:'windmill',name:'Wind-milled barley feed',input:{barley:8},output:{feed:10},duration:1200000,xp:32},
 barleyfeed:{building:'mill',name:'Mix barley feed',input:{barley:2},output:{feed:2},duration:120000,xp:6},
 salad:{building:'packing',name:'Prepare a fresh salad',input:{lettuce:4,cabbage:2},output:{salad:1},duration:900000,xp:14},
 pickles:{building:'packing',name:'Pickle red cabbage',input:{redcabbage:2},output:{pickles:1},duration:10800000,xp:60},
 flour:{building:'windmill',name:'Refine grain meal into flour',input:{grainmeal:1},output:{flour:4},duration:240000,xp:8},
 feed:{building:'mill',name:'Mix animal feed',input:{corn:2},output:{feed:1},duration:120000,xp:4},
 oil:{building:'mill',name:'Press sunflower oil',input:{sunflower:2},output:{oil:1},duration:14400000,xp:80},
 milk:{building:'dairy',name:'Feed the cows',input:{feed:1},output:{milk:2},duration:600000,xp:10},
 cheese:{building:'dairy',name:'Make farmhouse cheese',input:{milk:2},output:{cheese:1},duration:3600000,xp:24},
 eggs:{building:'coop',name:'Feed the chickens',input:{feed:1},output:{eggs:3},duration:300000,xp:10},
 bread:{building:'bakery',name:'Bake fresh bread',input:{flour:4,milk:2},output:{bread:2},duration:1200000,xp:16},
 pie:{building:'bakery',name:'Bake fresh pumpkin pie',input:{flour:2,pumpkin:2,eggs:2},output:{pie:1},duration:7200000,xp:50},
 vegetables:{building:'packing',name:'Pack a vegetable box',input:{cabbage:4,cauliflower:4},output:{vegetables:1},duration:3600000,xp:30},
 stew:{"building": "kitchen", "name": "Simmer vegetable stew", "input": {"greenbeans": 4, "corn": 3, "cabbage": 2}, "output": {"stew": 1}, "duration": 7200000, "xp": 40, "minLevel": 6},
 applejuice:{"building": "juicepress", "name": "Press apple juice", "input": {"apples": 4}, "output": {"applejuice": 1}, "duration": 10800000, "xp": 45, "minLevel": 8},
 applepie:{"building": "bakery", "name": "Bake an apple pie", "input": {"apples": 4, "flour": 4, "eggs": 2}, "output": {"applepie": 1}, "duration": 14400000, "xp": 55, "minLevel": 8},
 berrypreserves:{"building": "preserves", "name": "Cook berry preserves", "input": {"berries": 4, "honey": 3}, "output": {"berrypreserves": 1}, "duration": 10800000, "xp": 50, "minLevel": 10},
 berrytart:{"building": "bakery", "name": "Bake a berry tart", "input": {"berrypreserves": 2, "flour": 4, "eggs": 2}, "output": {"berrytart": 1}, "duration": 18000000, "xp": 70, "minLevel": 10, "requiresBuildings": ["preserves"]},
orchardjuice:{"building": "juicepress", "name": "Press apple and berry juice", "input": {"apples": 2, "berries": 2}, "output": {"orchardjuice": 1}, "duration": 3600000, "xp": 45, "minLevel": 10},
berrysmoothie:{"building": "juicepress", "name": "Blend a berry smoothie", "input": {"berries": 2, "milk": 2, "honey": 2}, "output": {"berrysmoothie": 1}, "duration": 5400000, "xp": 48, "minLevel": 10},
applecompote:{"building": "preserves", "name": "Cook honey apple compote", "input": {"apples": 3, "honey": 2}, "output": {"applecompote": 1}, "duration": 7200000, "xp": 42, "minLevel": 10},
applevinegar:{"building": "preserves", "name": "Ferment apple vinegar", "input": {"applejuice": 1}, "output": {"applevinegar": 1}, "duration": 21600000, "xp": 90, "minLevel": 10, "requiresBuildings": ["juicepress"]},
pickledbeans:{"building": "preserves", "name": "Pickle green beans", "input": {"greenbeans": 4, "applevinegar": 2}, "output": {"pickledbeans": 1}, "duration": 10800000, "xp": 80, "minLevel": 10, "requiresBuildings": ["juicepress"]},
beangratin:{"building": "kitchen", "name": "Bake green bean gratin", "input": {"greenbeans": 4, "cheese": 2, "milk": 2}, "output": {"beangratin": 1}, "duration": 10800000, "xp": 65, "minLevel": 7},
orchardsalad:{"building": "packing", "name": "Prepare an orchard salad", "input": {"apples": 2, "lettuce": 4, "cheese": 2}, "output": {"orchardsalad": 1}, "duration": 2700000, "xp": 38, "minLevel": 8},
berrycheesecake:{"building": "bakery", "name": "Bake a berry cheesecake", "input": {"berries": 4, "cheese": 2, "flour": 4, "eggs": 2}, "output": {"berrycheesecake": 1}, "duration": 14400000, "xp": 85, "minLevel": 11},
harvesthamper:{"building": "packing", "name": "Pack a harvest hamper", "input": {"applejuice": 2, "berrypreserves": 2, "bread": 2}, "output": {"harvesthamper": 1}, "duration": 28800000, "xp": 140, "minLevel": 12, "requiresBuildings": ["juicepress", "preserves"]}

});
// This introductory track is deliberately independent of the regular QUESTS IDs/stats.
export const BEGINNER_REWARD=50;
// Every finished guide step also pays XP: following the guide takes a new farmer to level 3 in about ten minutes.
export const BEGINNER_STEP_XP=15;
export const BEGINNER_QUESTS=Object.freeze([
 {id:'harvest',title:'Your first basket',description:'Harvest one ready crop. Tap the crop or its basket.',guide:'harvest',icon:'shopping-basket'},
 {id:'sell',title:'Your first market sale',description:'Open Market and sell some corn. Save your animal feed for the chickens.',guide:'market',icon:'store'},
 {id:'plant',title:'Plant a little possibility',description:'Select Wheat and plant it in an empty field. Seeds cost 3 coins.',guide:'plant',icon:'sprout'},
 {id:'water',title:'A little water goes a long way',description:'Use Water on one growing crop. It grows faster and gives an extra crop.',guide:'water',icon:'droplets'},
 {id:'produce',title:'Put your buildings to work',description:'Start a production batch. Try Feed the chickens in the Chicken Coop using your starter feed.',guide:'produce',icon:'egg'},
 {id:'gift',title:'A gift for showing up',description:'Open Today and collect your daily gift. Come back tomorrow to build your streak.',guide:'today',icon:'gift'},
 {id:'chore',title:'A helping hand',description:'Complete one Farm chore for extra coins while your crops and buildings work.',guide:'chores',icon:'shovel'},
 {id:'tend',title:'Good things need a little care',description:'Use Care on a growing crop once its care marker appears. Wheat needs about 36 seconds.',guide:'tend',icon:'leaf'},
 {id:'wheat',title:'Bring in the wheat',description:'Harvest one wheat field when it is ready. Water and care make your harvest bigger.',guide:'harvest',icon:'wheat'},
 {id:'collect',title:'Made on your farm',description:'Collect a finished batch from a building. Chicken feed becomes eggs in 5 minutes.',guide:'collect',icon:'package-check'}
]);
function beginnerQuests(state){return guidedFarm(state)?BEGINNER_QUESTS.map(q=>q.id==='chore'?{id:'sell_egg',title:'An egg opens new doors',description:'Collect eggs from the Chicken Coop and sell at least one in Market → Goods. Save the coins for your next building. Hands-on jobs open at level 6.',guide:'eggs',icon:'egg'}:q):BEGINNER_QUESTS;}
export function beginnerProgress(state){
 const guide=state.onboarding??{completed:0,milestones:{}};
 return beginnerQuests(state).map((quest,index)=>({...quest,index,done:index<guide.completed,current:index===guide.completed,ready:!!guide.milestones[quest.id]}));
}
export function claimBeginnerQuest(state,id){
 const guide=state.onboarding,quest=beginnerQuests(state)[guide.completed];
 if(!quest||guide.rewardClaimed)throw new Error('Your beginner guide is already complete.');
 if(id!==quest.id)throw new Error('Complete the current beginner step first.');
 if(!guide.milestones[quest.id])throw new Error('Try this farming action before completing the step.');
 guide.completed++;state.xp+=BEGINNER_STEP_XP;
 const diamonds=guide.completed===BEGINNER_QUESTS.length?BEGINNER_REWARD:0;
 if(diamonds){state.diamonds+=diamonds;guide.rewardClaimed=true;}
 return {step:quest.id,completed:guide.completed,total:BEGINNER_QUESTS.length,diamonds,xp:BEGINNER_STEP_XP};
}
function recordBeginnerAction(state,action,result,before){
 const m=state.onboarding.milestones;
 if(state.stats.harvested>before.harvested)m.harvest=true;
 if((state.stats.harvest_wheat??0)>before.wheat)m.wheat=true;
 if(action.type==='field'&&action.action==='plant'&&result.crop==='wheat'||action.type==='tractor'&&action.mode==='plant'&&action.crop==='wheat')m.plant=true;
 if(state.stats.watered>before.watered)m.water=true;
 if(state.stats.tended>before.tended)m.tend=true;
 if(action.type==='sell'&&result.coins>0)m.sell=true;
 if(state.stats.sold_eggs>0)m.sell_egg=true;
 if(action.type==='produce')m.produce=true;
 if(action.type==='collect'||action.type==='collect_all')m.collect=true;
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
 {title:'The whole garden',description:'Discover 9 crop varieties by harvesting them.',stat:'varieties',target:9,reward:150},
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
 {title:'A lifelong grower',description:'Claim 36 crop mastery medals.',stat:'mastery_medals',target:36,reward:20000},
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
 {"title":"Sunflower specialist","description":"Harvest 15 sunflower.","stat":"harvest_sunflower","target":15,"reward":500},
{"title": "Green beans beginnings", "description": "Harvest 12 green beans.", "stat": "harvest_greenbeans", "target": 12, "reward": 500},
{"title": "Apples beginnings", "description": "Harvest 12 apples.", "stat": "harvest_apples", "target": 12, "reward": 500},
{"title": "Berries beginnings", "description": "Harvest 12 berries.", "stat": "harvest_berries", "target": 12, "reward": 500},
{"title": "Open the Farm Kitchen", "description": "Open the Farm Kitchen.", "stat": "built_kitchen", "target": 1, "reward": 400},
{"title": "Open the Juice Press", "description": "Open the Juice Press.", "stat": "built_juicepress", "target": 1, "reward": 400},
{"title": "Open the Preserves Workshop", "description": "Open the Preserves Workshop.", "stat": "built_preserves", "target": 1, "reward": 400},
{"title": "Vegetable stew specialist", "description": "Produce 6 vegetable stew.", "stat": "made_stew", "target": 6, "reward": 1200},
{"title": "Apple juice specialist", "description": "Produce 6 apple juice.", "stat": "made_applejuice", "target": 6, "reward": 1200},
{"title": "Apple pie specialist", "description": "Produce 6 apple pie.", "stat": "made_applepie", "target": 6, "reward": 1200},
{"title": "Berry preserves specialist", "description": "Produce 6 berry preserves.", "stat": "made_berrypreserves", "target": 6, "reward": 1200},
{"title": "Berry tart specialist", "description": "Produce 6 berry tart.", "stat": "made_berrytart", "target": 6, "reward": 1200},
{"title": "Twelve tastes of the valley", "description": "Discover all 12 crops by harvesting them.", "stat": "varieties", "target": 12, "reward": 2000},
{"title": "A complete crop collection", "description": "Claim all 48 crop mastery medals.", "stat": "mastery_medals", "target": 48, "reward": 30000},
{"title": "Apple & Berry Juice specialist", "description": "Collect 3 batches of Apple & Berry Juice.", "stat": "made_orchardjuice", "target": 3, "reward": 310},
{"title": "Berry Smoothie specialist", "description": "Collect 3 batches of Berry Smoothie.", "stat": "made_berrysmoothie", "target": 3, "reward": 300},
{"title": "Honey Apple Compote specialist", "description": "Collect 3 batches of Honey Apple Compote.", "stat": "made_applecompote", "target": 3, "reward": 300},
{"title": "Apple Vinegar specialist", "description": "Collect 3 batches of Apple Vinegar.", "stat": "made_applevinegar", "target": 3, "reward": 460},
{"title": "Pickled Green Beans specialist", "description": "Collect 3 batches of Pickled Green Beans.", "stat": "made_pickledbeans", "target": 3, "reward": 980},
{"title": "Green Bean Gratin specialist", "description": "Collect 3 batches of Green Bean Gratin.", "stat": "made_beangratin", "target": 3, "reward": 660},
{"title": "Orchard Salad specialist", "description": "Collect 3 batches of Orchard Salad.", "stat": "made_orchardsalad", "target": 3, "reward": 340},
{"title": "Berry Cheesecake specialist", "description": "Collect 3 batches of Berry Cheesecake.", "stat": "made_berrycheesecake", "target": 3, "reward": 900},
{"title": "Harvest Hamper specialist", "description": "Collect 3 batches of Harvest Hamper.", "stat": "made_harvesthamper", "target": 3, "reward": 2360},
 // Late game: long ladders above what the first players have reached. Append-only, like everything above.
 {title:'Fields of plenty',description:'Harvest 2,500 crops.',stat:'harvested',target:2500,reward:6000},
 {title:'Overflowing barns',description:'Harvest 5,000 crops.',stat:'harvested',target:5000,reward:14000},
 {title:'Harvest legend',description:'Harvest 10,000 crops.',stat:'harvested',target:10000,reward:32000},
 {title:'Seed sower',description:'Plant 1,500 crops.',stat:'planted',target:1500,reward:4000},
 {title:'Master of the seasons',description:'Plant 5,000 crops.',stat:'planted',target:5000,reward:14000},
 {title:'Rainmaker',description:'Water 1,500 crops.',stat:'watered',target:1500,reward:4000},
 {title:'Every drop counts',description:'Water 5,000 crops.',stat:'watered',target:5000,reward:14000},
 {title:'Caring for every plant',description:'Give 1,000 crops extra care.',stat:'tended',target:1000,reward:5000},
 {title:'Tender loving care',description:'Give 3,000 crops extra care.',stat:'tended',target:3000,reward:15000},
 {title:'Behind the wheel',description:'Use the tractor 250 times.',stat:'tractor',target:250,reward:3000},
 {title:'Market regular',description:'Sell 1,000 items at the market.',stat:'sold',target:1000,reward:3500},
 {title:'Market favourite',description:'Sell 5,000 items at the market.',stat:'sold',target:5000,reward:16000},
 {title:'A trader’s dream',description:'Sell 20,000 items at the market.',stat:'sold',target:20000,reward:60000},
 {title:'Quarter of a million',description:'Earn 250,000 coins from sales and deliveries.',stat:'earned',target:250000,reward:8000},
 {title:'Coin millionaire',description:'Earn 1,000,000 coins from sales and deliveries.',stat:'earned',target:1000000,reward:25000},
 {title:'Tycoon of the valley',description:'Earn 5,000,000 coins from sales and deliveries.',stat:'earned',target:5000000,reward:80000},
 {title:'Busy hands',description:'Collect 1,000 production batches.',stat:'produced',target:1000,reward:5000},
 {title:'A well-run farm',description:'Collect 3,000 production batches.',stat:'produced',target:3000,reward:16000},
 {title:'Never idle',description:'Start 1,000 batches while another batch is still running in the same building.',stat:'parallel_batches',target:1000,reward:8000},
 {title:'The factory floor',description:'Start 2,500 batches while another batch is still running in the same building.',stat:'parallel_batches',target:2500,reward:20000},
 {title:'Trusted supplier',description:'Complete 250 delivery orders.',stat:'deliveries',target:250,reward:15000},
 {title:'The valley’s favourite',description:'Complete 500 delivery orders.',stat:'deliveries',target:500,reward:36000},
 {title:'Master of the pantry',description:'Complete 100 delivery orders containing processed farm goods.',stat:'crafted_deliveries',target:100,reward:8000},
 {title:'Chore champion',description:'Complete 500 farm chores.',stat:'chores',target:500,reward:6000},
 {title:'Always lending a hand',description:'Complete 1,500 farm chores.',stat:'chores',target:1500,reward:20000},
 {title:'Farm helper',description:'Complete 250 hands-on jobs.',stat:'activities',target:250,reward:6000},
 {title:'Hands-on legend',description:'Complete 1,000 hands-on jobs.',stat:'activities',target:1000,reward:24000},
 {title:'A round every day',description:'Finish 100 full farm rounds.',stat:'activity_rounds',target:100,reward:8000},
 {title:'The heart of the farm',description:'Finish 250 full farm rounds.',stat:'activity_rounds',target:250,reward:22000},
 {title:'Daily devotion',description:'Complete 100 daily challenges.',stat:'dailies',target:100,reward:4000},
 {title:'Never miss a day',description:'Complete 250 daily challenges.',stat:'dailies',target:250,reward:12000},
 {title:'Money while you sleep',description:'Collect 25,000 coins from the farm stall.',stat:'passive_earned',target:25000,reward:5000},
 {title:'A little extra, again and again',description:'Activate 10 boosts.',stat:'boosts_used',target:10,reward:2500},
 {title:'Wheat master',description:'Harvest 1,000 wheat.',stat:'harvest_wheat',target:1000,reward:4500},
 {title:'Corn master',description:'Harvest 750 corn.',stat:'harvest_corn',target:750,reward:6000},
 {title:'Pumpkin master',description:'Harvest 250 pumpkin.',stat:'harvest_pumpkin',target:250,reward:6000}

]);
export const MAX_PLOTS=24;
export function xpForLevel(level){const n=level-1;return 60*n+20*n*(n-1);}
export function levelOf(state){const total=state.xp+(state.xpOffset??0);return 1+Math.floor((Math.sqrt(1600+80*total)-40)/40);}
export function levelProgress(state){const level=levelOf(state);return {level,current:state.xp+(state.xpOffset??0)-xpForLevel(level),target:60+40*(level-1)};}
export const MAX_BUILDING_LEVEL=10;
export function productionSlots(level){return Math.max(1,Math.min(MAX_BUILDING_LEVEL,Math.floor(level)));}
// Keep the primary job for older clients; extra jobs run in parallel, not a queue.
export function productionJobs(building){return [building?.job,...(building?.extraJobs??[])].filter(Boolean);}
export function recipeValue(id,now){const r=RECIPES[id],value=items=>now===undefined?Object.entries(items).reduce((sum,[key,n])=>sum+reducedMarketPrice(ITEMS[key].sell)*n,0):marketValue(items,now);const input=value(r.input),output=value(r.output);return {input,output,added:output-input};}
export function productionSpeed(level){return level<=3?.2*(level-1):.4+.04*(level-3);}
export function recipeDuration(state,id,now=Date.now()){return Math.round(RECIPES[id].duration*(1-productionSpeed(state.buildings[RECIPES[id].building].level))*(vipActive(state,now)?.9:1));}
export function siloBonus(level){return {seeds:Math.min(level,3)*.05+Math.max(0,level-3)*.05,growth:Math.min(level,3)*.1+Math.max(0,level-3)*.05};}
// Version 2 introduces one small step at a time. Old unlocks are saved once,
// independently of inventory bundles, so purchases never bypass progression.
export const CROP_LEVELS=Object.freeze({corn:1,wheat:1,lettuce:3,barley:5,greenbeans:7,cabbage:9,cauliflower:11,pumpkin:13,redcabbage:15,sunflower:17,apples:20,berries:23});
export const BUILDING_LEVELS=Object.freeze({familyhall:FAMILY_MIN_LEVEL,farmhouse:1,coop:1,mill:2,dairy:4,windmill:6,bakery:8,packing:10,kitchen:12,juicepress:21,preserves:24});
export const BUILDING_COSTS=Object.freeze({mill:100,dairy:300,windmill:700,bakery:1000,packing:1400,kitchen:3500,juicepress:6500,preserves:10000});
export const RECIPE_LEVELS=Object.freeze({eggs:1,feed:2,milk:4,barleyfeed:5,grainmeal:6,flour:6,windfeed:7,bread:8,cheese:9,fertilizer:9,salad:10,vegetables:11,windflour:11,stew:12,pie:13,pickles:15,beangratin:16,oil:17,orchardsalad:20,applejuice:21,applepie:22,orchardjuice:23,berrysmoothie:23,berrycheesecake:23,applecompote:24,berrypreserves:24,applevinegar:24,pickledbeans:25,berrytart:25,harvesthamper:25});
export const FEATURE_LEVELS=Object.freeze({challenges:3,cart:5,activities:6,chores:4,mastery:7,family:FAMILY_MIN_LEVEL,stall:11,tractor:12,boosts:14,silo:18,projects:19});
export const DELIVERY_LEVELS=Object.freeze({quick:5,village:8,commission:12});
export const FEATURE_NAMES={challenges:'Daily challenges',family:'Farm Family',chores:'Farm chores',stall:'Farm stall',mastery:'Crop mastery',tractor:'Tractor',silo:'Silo research',cart:'Delivery orders',projects:'Estate projects',boosts:'Diamond boosts',activities:'A helping hand'};
export function guidedFarm(state){return state.progression?.mode==='guided';}
const kept=(state,kind,key)=>state.progression?.kept?.[kind]?.includes(key)===true;
export function buildingCost(state,key){return guidedFarm(state)?BUILDING_COSTS[key]??0:BUILDINGS[key]?.buildCost??0;}
export function constructionNeeds(state,key){return guidedFarm(state)?({dairy:['mill'],bakery:['dairy','windmill']}[key]??[]).filter(k=>!buildingUnlocked(state,k)):[];}
export function cropUnlockHint(state,crop){return `Reach level ${guidedFarm(state)?CROP_LEVELS[crop]:CROPS[crop].minLevel??1}.`;}
export function buildingUnlockHint(state,key){return `Reach level ${guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1}.`;}
export function cropUnlocked(state,crop){return Object.hasOwn(CROPS,crop)&&(kept(state,'crops',crop)||levelOf(state)>=(guidedFarm(state)?CROP_LEVELS[crop]:CROPS[crop].minLevel??1));}
export function buildingEligible(state,key){return Object.hasOwn(BUILDINGS,key)&&(kept(state,'buildings',key)||levelOf(state)>=(guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1));}
export function buildingUnlocked(state,key){return buildingEligible(state,key)&&(!buildingCost(state,key)||state.buildings[key]?.built===true);}
export function featureUnlocked(state,key){if(key==='family')return familyUnlocked(state);return !guidedFarm(state)||kept(state,'features',key)||levelOf(state)>=(FEATURE_LEVELS[key]??1);}
export function featureUnlockHint(key){return `Reach level ${FEATURE_LEVELS[key]} to unlock ${FEATURE_NAMES[key]}.`;}
export function recipeLevel(state,id){return guidedFarm(state)&&!kept(state,'recipes',id)&&!kept(state,'buildings',RECIPES[id].building)?RECIPE_LEVELS[id]??1:RECIPES[id].minLevel??1;}
export function deliveryTierUnlocked(state,tier){return !guidedFarm(state)||kept(state,'orderTiers',tier)||levelOf(state)>=DELIVERY_LEVELS[tier];}
const FEATURE_ART={challenges:'quests',family:'familyhall',mastery:'trophy',projects:'estate',boosts:'boost',activities:'helping-hand'};
export function unlockEntries(state){return [
 ...Object.entries(CROPS).map(([key,c])=>({id:'crop:'+key,name:c.name,art:key,kind:'Crop',level:guidedFarm(state)?CROP_LEVELS[key]:c.minLevel??1,unlocked:cropUnlocked(state,key),hint:cropUnlockHint(state,key)})),
 ...Object.entries(BUILDINGS).filter(([key])=>key!=='familyhall').map(([key,b])=>({id:'building:'+key,name:b.name,art:key,kind:buildingCost(state,key)?'Ready to build':'Building',level:guidedFarm(state)?BUILDING_LEVELS[key]:b.minLevel??1,unlocked:buildingEligible(state,key),hint:buildingUnlockHint(state,key)})),
 ...Object.entries(FEATURE_NAMES).map(([key,name])=>({id:'feature:'+key,name,art:FEATURE_ART[key]??key,kind:'Activity',level:FEATURE_LEVELS[key],unlocked:featureUnlocked(state,key),hint:featureUnlockHint(key)})),
 ...Object.entries(RECIPES).filter(([,r])=>buildingUnlocked(state,r.building)).map(([key,r])=>({id:'recipe:'+key,name:r.name,art:Object.keys(r.output)[0],kind:'Recipe',level:recipeLevel(state,key),unlocked:recipeUnlocked(state,key),hint:recipeUnlockHint(state,key)}))
 ];}
function migrateProgression(state){
 if(!guidedFarm(state)||state.progression.version>=2)return;
 const crops={corn:1,wheat:1,lettuce:2,barley:4,cabbage:5,cauliflower:6,greenbeans:6,pumpkin:7,apples:8,redcabbage:9,sunflower:10,berries:10};
 const buildings={familyhall:10,farmhouse:1,coop:1,mill:2,dairy:3,windmill:4,bakery:5,packing:5,kitchen:6,juicepress:8,preserves:10};
 const features={family:10,chores:3,stall:3,mastery:3,tractor:4,silo:4,cart:3,projects:6,boosts:3,challenges:1};
 const level=levelOf(state),bread=(state.stats.made_bread??state.stats.bread??0)>0;
 const cropOpen=k=>level>=crops[k]&&(k!=='cabbage'||bread);
 const buildingOpen=k=>level>=buildings[k]&&(k!=='packing'||bread);
 const owned=k=>buildingOpen(k)&&(!BUILDINGS[k].buildCost||state.buildings[k]?.built===true);
 const activities=(state.stats.sold_eggs??0)>0;
 const rights={crops:Object.keys(CROPS).filter(cropOpen),buildings:Object.keys(BUILDINGS).filter(buildingOpen),features:Object.keys(features).filter(k=>level>=features[k]),recipes:Object.keys(RECIPES).filter(k=>{const r=RECIPES[k];return buildingOpen(r.building)&&level>=(r.minLevel??1)&&(r.requiresBuildings??[]).every(buildingOpen);}),orderTiers:level>=3?Object.keys(DELIVERY_LEVELS):[]};
 if(activities)rights.features.push('activities');
 // A paid building or already growing crop remains usable, including old jobs.
 for(const [k,b]of Object.entries(state.buildings))if(owned(k)||b.built===true||productionJobs(b).length||b.level>1){b.built=true;if(!rights.buildings.includes(k))rights.buildings.push(k);}
 for(const p of state.plots)if(p.crop&&!rights.crops.includes(p.crop))rights.crops.push(p.crop);
 state.progression={...state.progression,version:2,kept:rights};
}
// Orders must be achievable from unlocked chains, even when a player owns a
// locked ingredient from a welcome bundle. A seen set prevents recipe cycles.
export function itemAvailable(state,item,seen=new Set()){
 if(!guidedFarm(state))return true;
 if(seen.has(item))return false;
 if(CROPS[item])return cropUnlocked(state,item);
 if(['honey','feed','fertilizer'].includes(item)&&featureUnlocked(state,'activities'))return true;
 if(item==='eggs'&&state.inventory.feed>0)return true;
 const path=new Set([...seen,item]);
 return Object.entries(RECIPES).some(([id,r])=>r.output[item]&&buildingUnlocked(state,r.building)&&levelOf(state)>=recipeLevel(state,id)&&(r.requiresBuildings??[]).every(k=>buildingUnlocked(state,k))&&Object.keys(r.input).every(k=>itemAvailable(state,k,path)));
}
export function constructBuilding(state,key){
 if(!Object.hasOwn(BUILDINGS,key)||!buildingCost(state,key))throw new Error('Choose a new production building.');
 const b=BUILDINGS[key],cost=buildingCost(state,key);
 if(state.buildings[key].built)throw new Error('This building is already open.');
 if(!buildingEligible(state,key))throw new Error(buildingUnlockHint(state,key));
 const needs=constructionNeeds(state,key);if(needs.length)throw new Error(`Open ${needs.map(k=>BUILDINGS[k].name).join(' and ')} first to supply this building.`);
 if(state.coins<cost)throw new Error(`You need ${cost} coins to open ${b.name}.`);
 state.coins-=cost;state.buildings[key].built=true;state.stats['built_'+key]=1;
 return {building:key,cost};
}
export function clearPlanting(state,id,expectedPlantedAt){
 const p=state.plots[id];
 if(!Number.isInteger(id)||!p||!CROPS[p.crop]?.perennial)throw new Error('Choose an apple tree or berry bush.');
 if(p.plantedAt!==expectedPlantedAt)throw new Error('This planting has changed. Review it before removing.');
 const crop=p.crop;Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0});
 return {id,crop};
}
export function cropDuration(state,crop,regrowing=false,now=Date.now()){return Math.round((regrowing?(CROPS[crop].regrow??CROPS[crop].duration):CROPS[crop].duration)*(1-siloBonus(state.siloLevel??0).growth)*(vipActive(state,now)?.9:1));}
export function harvestYield(plot){return 1+(plot.watered?1:0)+(plot.tended?1:0);}
export function formatDuration(ms){const s=Math.max(0,Math.ceil(ms/1000));if(s<60)return `${s}s`;const m=Math.ceil(s/60);if(m<60)return `${m}m`;const h=Math.floor(m/60);if(h<24)return `${h}h${m%60?` ${m%60}m`:''}`;return `${Math.floor(h/24)}d${h%24?` ${h%24}h`:''}`;}
export function cropIcon(key){return CROPS[key].art??`/assets/icons/${CROPS[key].icon??key}.png`;}
export function expansionCost(state){return state.plots.length>=MAX_PLOTS?null:Math.ceil(600*1.75**Math.max(0,state.plots.length-12)/25)*25;}
const FIELD_MATERIALS=[{wheat:12,corn:6},{wheat:20,barley:10},{barley:18,cabbage:10},{corn:24,cauliflower:12,flour:8},{cabbage:24,pumpkin:12,bread:10},{redcabbage:20,sunflower:12,cheese:12},{pumpkin:24,oil:10,vegetables:12},{sunflower:30,pickles:16,pie:16},{lettuce:30,flour:18,milk:12},{cauliflower:32,feed:20,eggs:14},{redcabbage:30,cheese:16,bread:18},{pumpkin:36,oil:18,pie:20}];
export function expansionMaterials(state){return state.plots.length>=MAX_PLOTS?{}:{...FIELD_MATERIALS[Math.max(0,state.plots.length-12)]};}
export function upgradeCost(state,building){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')return null;
 const level=state.buildings[building].level;
 return level>=MAX_BUILDING_LEVEL?null:Math.ceil(Math.round(BUILDINGS[building].upgradeCost*(level<3?level*1.5:12*2.7**(level-3)))*(state.boosts?.upgradeCredits>0?.5:1));
}
function createBaseFarm(now=Date.now()) {
 const plots=Array.from({length:12},(_,id)=>({id,crop:null,plantedAt:0,readyAt:0,watered:false}));
 ['corn','corn','corn','wheat','wheat'].forEach((crop,id)=>{
  plots[id]={id,crop,plantedAt:now-CROPS[crop].duration*(id<3?1.1:.4),readyAt:now+(id<3?-1000:CROPS[crop].duration*.6),watered:false};
 });
 return {version:14,progression:{mode:'guided',version:2},coins:180,xp:0,inventory:{...Object.fromEntries(Object.keys(ITEMS).map(k=>[k,0])),wheat:4,feed:2},stats:{harvested:0,planted:0,watered:0,earned:0,produced:0,upgrades:0,expansions:0,bread:0},claimed:[],plots,buildings:Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,{level:1,job:null}]))};
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
  if(!cropUnlocked(state,crop))throw new Error(cropUnlockHint(state,crop));
  if(p.crop)throw new Error('This field is already planted.');
  if(state.coins<seedCost(state,crop))throw new Error('Not enough coins. Sell some produce at the market.');
  state.coins-=seedCost(state,crop);state.stats.planted++;
  const duration=cropDuration(state,crop,false,now);Object.assign(p,{crop,harvestCycles:0,plantedAt:now,readyAt:now+duration,careAt:now+Math.max(30000,duration*.3),watered:false,tended:false,fertilized:false});
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
 const regrowing=!!CROPS[harvested].perennial;
 // One waiting harvest only. A new cycle starts at collection, never at the old deadline.
 if(regrowing){const duration=cropDuration(state,harvested,true,now);Object.assign(p,{plantedAt:now,readyAt:now+duration,careAt:now+Math.max(30000,duration*.3),watered:false,tended:false,fertilized:false,harvestCycles:(p.harvestCycles??0)+1});}
 else Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0});
 return {action,crop:harvested,quantity,xp,regrowing};
}
export function sellCrops(state,item='all',now=Date.now(),day,category,quantity) {
 if(day!==undefined&&day!==utcDay(now))throw new Error('Market prices have refreshed. Check today’s prices before selling.');
 if(category!==undefined&&!['crops','goods'].includes(category))throw new Error('Choose a market category.');
 if(item!=='all'&&!Object.hasOwn(ITEMS,item))throw new Error('Choose a valid item.');
 const keys=category?Object.keys(category==='crops'?CROPS:PRODUCTS):item==='all'?Object.keys(ITEMS):[item];
 if(quantity!==undefined&&(item==='all'||category!==undefined||!Number.isSafeInteger(quantity)||quantity<1||quantity>state.inventory[item]))throw new Error('Choose a valid quantity within your stock.');
 const amounts=Object.fromEntries(keys.map(k=>[k,quantity??state.inventory[k]]));
 const total=marketSaleValue(state,keys.reduce((v,k)=>v+amounts[k]*marketQuote(k,now).price,0),now);
 if(total===0)throw new Error('Your basket is empty. Harvest or produce something first.');
 const units=keys.reduce((v,k)=>v+amounts[k],0);
 for(const k of keys){state.inventory[k]-=amounts[k];state.stats['sold_'+k]=(state.stats['sold_'+k]??0)+amounts[k];}
 state.coins+=total;state.stats.earned+=total;state.stats.sold+=units;
 return {coins:total,day:utcDay(now)};
}
export function recipeUnlocked(state,id){const r=RECIPES[id];return !!r&&buildingUnlocked(state,r.building)&&levelOf(state)>=recipeLevel(state,id)&&(r.requiresBuildings??[]).every(k=>buildingUnlocked(state,k))&&(!guidedFarm(state)||Object.keys(r.input).every(k=>k==='feed'&&state.inventory.feed>0||itemAvailable(state,k)));}
export function recipeUnlockHint(state,id){
 const r=RECIPES[id];if(!buildingEligible(state,r.building))return buildingUnlockHint(state,r.building);
 if(levelOf(state)<recipeLevel(state,id))return `Reach level ${recipeLevel(state,id)}.`;
 if(!buildingUnlocked(state,r.building))return `Open the ${BUILDINGS[r.building].name} in Buildings.`;
 const crops=Object.keys(r.input).filter(k=>CROPS[k]&&!cropUnlocked(state,k));
 if(crops.length)return crops.map(k=>`${CROPS[k].name}: ${cropUnlockHint(state,k)}`).join(' ');
 const missing=(r.requiresBuildings??[]).filter(k=>!buildingUnlocked(state,k));
 if(missing.length)return `Open ${missing.map(k=>BUILDINGS[k].name).join(' and ')} first.`;
 const ingredients=Object.keys(r.input).filter(k=>!itemAvailable(state,k));
 if(ingredients.length){
  const item=ingredients[0],suppliers=Object.entries(RECIPES).filter(([,recipe])=>recipe.output[item]).sort(([a],[b])=>recipeLevel(state,a)-recipeLevel(state,b));
  const supplier=suppliers[0]?.[1];
  if(supplier&&!buildingUnlocked(state,supplier.building))return `Open the ${BUILDINGS[supplier.building].name} to make ${ITEMS[item].name}.`;
  if(item==='honey')return featureUnlockHint('activities');
 }
 return ingredients.length?`Unlock production for ${ingredients.map(k=>ITEMS[k].name).join(', ')} first.`:`Make in the ${BUILDINGS[r.building].name}.`;
}
export function recipeAvailability(state,id){
 if(!Object.hasOwn(RECIPES,id))throw new Error('Choose a valid recipe.');
 const r=RECIPES[id];
 const missing=Object.entries(r.input).filter(([k,n])=>state.inventory[k]<n).map(([k,n])=>({item:k,name:ITEMS[k].name,need:n,have:state.inventory[k]}));
 const b=state.buildings[r.building],used=productionJobs(b).length,slots=productionSlots(b.level),busy=used>=slots;
 const locked=!recipeUnlocked(state,id);
 const maxCount=locked?0:Math.max(0,Math.min(slots-used,...Object.entries(r.input).map(([k,n])=>Math.floor(state.inventory[k]/n))));
 return {canStart:!locked&&!busy&&missing.length===0,missing,busy,used,slots,maxCount,locked};
}
export function startProduction(state,id,now=Date.now(),count=1){
 if(!Number.isInteger(count)||count<1||count>MAX_BUILDING_LEVEL)throw new Error('Choose 1–10 batches.');
 const a=recipeAvailability(state,id),r=RECIPES[id];
 if(a.locked)throw new Error(`Unlock this recipe first. ${recipeUnlockHint(state,id)}`);
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
 const duration=recipeDuration(state,id,now);
 for(const [k,n]of Object.entries(r.input))state.inventory[k]-=n;
 b.batchSequence=(b.batchSequence??0)+1;
 const job={id:`${r.building}-${b.batchSequence}`,recipe:id,startedAt:now,readyAt:now+duration,output:{...r.output},xp:r.xp};
 if(productionJobs(b).some(j=>j.readyAt>now))state.stats.parallel_batches=(state.stats.parallel_batches??0)+1;
 if(!b.job)b.job=job;else (b.extraJobs??=[]).push(job);
 return {building:r.building,recipe:id,jobId:job.id,readyAt:job.readyAt};
}
export function collectProduction(state,building,now=Date.now(),jobId){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')throw new Error('Choose a production building.');
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
export function collectAllProduction(state,building,now=Date.now()){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')throw new Error('Choose a production building.');
 const ready=productionJobs(state.buildings[building]).filter(job=>job.readyAt<=now);
 if(!ready.length)throw new Error('No batches are ready to collect yet.');
 const result={building,count:ready.length,items:{},xp:0};
 for(const job of ready){
  const collected=collectProduction(state,building,now,job.id);
  for(const [key,count] of Object.entries(collected.items))result.items[key]=(result.items[key]??0)+count;
  result.xp+=collected.xp;
 }
 return result;
}
export const DIAMOND_UPGRADE_COSTS=Object.freeze([25,45,75,110,160,225,300,400,525]);
export function diamondUpgradeCost(state,building){if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')return null;return DIAMOND_UPGRADE_COSTS[state.buildings[building].level-1]??null;}
export function upgradeBuilding(state,building,currency='coins',expectedCost,expectedLevel){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')throw new Error('Choose a production building.');
 if(!buildingUnlocked(state,building))throw new Error('Open this building before upgrading it.');
 if(!['coins','diamonds'].includes(currency))throw new Error('Choose coins or diamonds.');
 const b=state.buildings[building],cost=currency==='diamonds'?diamondUpgradeCost(state,building):upgradeCost(state,building);
 if(currency==='diamonds'&&(!featureUnlocked(state,'boosts')||expectedCost!==cost||expectedLevel!==b.level))throw new Error('Review the current diamond upgrade price and building level.');
 if(cost===null)throw new Error('This building is fully upgraded.');
 if(productionJobs(b).length)throw new Error('Finish and collect all current batches before upgrading.');
 if(state[currency]<cost)throw new Error(`You need ${cost} ${currency} for this upgrade.`);
 state[currency]-=cost;b.level++;state.stats.upgrades++;state.xp+=15;
 if(currency==='coins'&&state.boosts?.upgradeCredits>0)state.boosts.upgradeCredits--;
 if(building==='windmill')state.stats.windmill_upgrades=(state.stats.windmill_upgrades??0)+1;
 return {building,level:b.level,cost,currency};
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
 return {coins:state.coins,diamonds:state.diamonds,boosts:{...state.boosts},xp:state.xp,level:levelOf(state),inventory:{...state.inventory},plots:state.plots.map(p=>({id:p.id,crop:p.crop,watered:p.watered,fertilized:p.fertilized,status:!p.crop?'empty':now>=p.readyAt?'ready':'growing',secondsRemaining:Math.max(0,Math.ceil((p.readyAt-now)/1000))})),buildings:Object.entries(state.buildings).map(([id,b])=>({id,name:BUILDINGS[id].name,level:b.level,slots:BUILDINGS[id].type==='production'?productionSlots(b.level):0,jobs:productionJobs(b).map(j=>({id:j.id,recipe:j.recipe,secondsRemaining:Math.max(0,Math.ceil((j.readyAt-now)/1000))})),status:productionJobs(b).some(j=>now>=j.readyAt)?'ready':b.job?(now>=b.job.readyAt?'ready':'working'):'idle',job:b.job?{recipe:b.job.recipe,secondsRemaining:Math.max(0,Math.ceil((b.job.readyAt-now)/1000))}:null,upgradeCost:upgradeCost(state,id)})),expansionCost:expansionCost(state),quests:QUESTS.map((q,id)=>({id,title:q.title,progress:Math.min(q.target,state.stats[q.stat]),target:q.target,claimed:state.claimed.includes(id)}))};
}

export const DAY_MS=86400000;
export const DAILY_REWARDS=[40,55,70,85,100,120,160];
export const DAILY_DIAMONDS=[4,6,8,10,12,16,24];
export const DAILY_CHALLENGE_DIAMONDS=Object.freeze([2,2,4]);
export const DIAMOND_PACKS=Object.freeze([{amount:150,price:'€1.99'},{amount:500,price:'€4.99'},{amount:1250,price:'€9.99'},{amount:3500,price:'€24.99'}]);
// VIP has a single server-owned expiry. New purchases extend time, never strength.
export const VIP_PLANS=Object.freeze({week:{name:'VIP · 7 days',cost:500,duration:7*86400000},month:{name:'VIP · 30 days',cost:1500,duration:30*86400000}});
export function vipActive(state,now=Date.now()){return Number.isSafeInteger(state.vipExpiresAt)&&state.vipExpiresAt>now;}
export function dailyRewardMultiplier(state,now=Date.now()){return vipActive(state,now)?2:1;}
export function marketSaleValue(state,base,now=Date.now()){return Math.floor(base*(vipActive(state,now)?1.05:1)*(state.boosts?.coinsUntil>now?2:1));}
export function buyVip(state,plan,expectedCost,expectedExpiresAt,now=Date.now()){
 if(typeof plan!=='string'||!Object.hasOwn(VIP_PLANS,plan))throw new Error('Choose a VIP plan.');
 const offer=VIP_PLANS[plan],previous=state.vipExpiresAt??0;
 if(expectedCost!==offer.cost)throw new Error('The price has changed. Review the current price.');
 if(expectedExpiresAt!==previous)throw new Error('Your VIP status has changed. Review it before extending.');
 if(state.diamonds<offer.cost)throw new Error(`You need ${offer.cost} diamonds.`);
 const expiresAt=Math.max(now,previous)+offer.duration;
 if(!Number.isSafeInteger(expiresAt))throw new Error('VIP cannot be extended further.');
 state.diamonds-=offer.cost;state.vipExpiresAt=expiresAt;
 return {plan,cost:offer.cost,vipExpiresAt:expiresAt,extended:previous>now};
}
export const SINGLE_BATCH_COST=10;
export function finishSingleBatch(state,building,jobId,expectedCost,now=Date.now()){
 if(expectedCost!==SINGLE_BATCH_COST)throw new Error('The price has changed. Review the current price.');
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production'||!buildingUnlocked(state,building))throw new Error('Choose an open production building.');
 const job=productionJobs(state.buildings[building]).find(j=>j.id===jobId);
 if(!job||job.readyAt<=now)throw new Error('Choose a batch that is still running.');
 if(state.diamonds<SINGLE_BATCH_COST)throw new Error(`You need ${SINGLE_BATCH_COST} diamonds.`);
 state.diamonds-=SINGLE_BATCH_COST;job.readyAt=now;
 state.stats.boosts_used=(state.stats.boosts_used??0)+1;
 return {building,jobId,cost:SINGLE_BATCH_COST,affected:1};
}
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
 xp:{name:'Double XP',cost:50,duration:1800000,art:'xp',description:'Earn twice the XP from farm actions for 30 minutes.'},
 coins:{name:'Double earnings',cost:100,duration:1800000,art:'coins',description:'Double your market sales and delivery coins for 30 minutes. Passive income and gifts stay the same.'},
 crops:{name:'Instant harvest',cost:150,art:'seeds',description:'Make every currently growing crop ready to harvest. Crops stay in their fields until you collect them.'},
 production:{name:'Finish production',cost:200,art:'boost',description:'Finish all current production batches instantly. Collect the finished goods from their buildings.'},
 upgrade:{name:'Buildings discount',cost:250,art:'hammer',description:'Save 50% of the coin cost on your next production-building upgrade. One voucher at a time; it never expires.'}
});
export function boostStatus(state,id,now=Date.now()){
 if(!Object.hasOwn(BOOSTS,id))throw new Error('Choose a valid boost.');
 const boost=BOOSTS[id],until=id==='xp'?state.boosts?.xpUntil:id==='coins'?state.boosts?.coinsUntil:0;
 const remaining=Math.max(0,(until??0)-now);
 let reason='';
 if(remaining)reason='Already active';
 if(id==='upgrade'&&state.boosts?.upgradeCredits>0)reason='Voucher ready';
 if(id==='upgrade'&&!Object.entries(state.buildings).some(([key,b])=>BUILDINGS[key].type==='production'&&b.level<MAX_BUILDING_LEVEL))reason='All buildings at maximum level';
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
const ORCHARD_DAILIES=[[{"stat": "harvest_greenbeans", "target": 3, "title": "Green beans baskets", "description": "Harvest 3 green beans.", "reward": 140, "minLevel": 6}, {"stat": "harvest_apples", "target": 3, "title": "Apples baskets", "description": "Harvest 3 apples.", "reward": 140, "minLevel": 8}, {"stat": "harvest_berries", "target": 3, "title": "Berries baskets", "description": "Harvest 3 berries.", "reward": 140, "minLevel": 10}], [{"stat": "made_stew", "target": 1, "title": "Vegetable stew day", "description": "Collect 1 vegetable stew.", "reward": 200, "minLevel": 6, "requiresBuildings": ["kitchen"]}, {"stat": "made_applejuice", "target": 1, "title": "Apple juice day", "description": "Collect 1 apple juice.", "reward": 200, "minLevel": 8, "requiresBuildings": ["juicepress"]}, {"stat": "made_berrypreserves", "target": 1, "title": "Berry preserves day", "description": "Collect 1 berry preserves.", "reward": 200, "minLevel": 10, "requiresBuildings": ["preserves"]}], [{"stat": "made_applepie", "target": 1, "title": "Apple pie baking", "description": "Collect 1 apple pie.", "reward": 280, "minLevel": 8, "requiresBuildings": []}, {"stat": "made_berrytart", "target": 1, "title": "Berry tart baking", "description": "Collect 1 berry tart.", "reward": 280, "minLevel": 10, "requiresBuildings": ["preserves"]}]];
const PANTRY_DAILIES=[[{"stat": "made_orchardjuice", "target": 1, "title": "Apple & Berry Juice day", "description": "Collect 1 batch of Apple & Berry Juice.", "reward": 150, "minLevel": 10, "requiresBuildings": ["juicepress"]}, {"stat": "made_berrysmoothie", "target": 1, "title": "Berry Smoothie day", "description": "Collect 1 batch of Berry Smoothie.", "reward": 150, "minLevel": 10, "requiresBuildings": ["juicepress"]}, {"stat": "made_orchardsalad", "target": 1, "title": "Orchard Salad day", "description": "Collect 1 batch of Orchard Salad.", "reward": 150, "minLevel": 8, "requiresBuildings": []}], [{"stat": "made_applecompote", "target": 1, "title": "Honey Apple Compote day", "description": "Collect 1 batch of Honey Apple Compote.", "reward": 200, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"stat": "made_pickledbeans", "target": 1, "title": "Pickled Green Beans day", "description": "Collect 1 batch of Pickled Green Beans.", "reward": 200, "minLevel": 10, "requiresBuildings": ["preserves", "juicepress"]}, {"stat": "made_beangratin", "target": 1, "title": "Green Bean Gratin day", "description": "Collect 1 batch of Green Bean Gratin.", "reward": 200, "minLevel": 7, "requiresBuildings": ["kitchen"]}, {"stat": "made_berrycheesecake", "target": 1, "title": "Berry Cheesecake day", "description": "Collect 1 batch of Berry Cheesecake.", "reward": 200, "minLevel": 11, "requiresBuildings": []}], [{"stat": "made_applevinegar", "target": 1, "title": "Apple Vinegar day", "description": "Collect 1 batch of Apple Vinegar.", "reward": 250, "minLevel": 10, "requiresBuildings": ["preserves", "juicepress"]}, {"stat": "made_harvesthamper", "target": 1, "title": "Harvest Hamper day", "description": "Collect 1 batch of Harvest Hamper.", "reward": 250, "minLevel": 12, "requiresBuildings": ["juicepress", "preserves"]}]];
export const DAILY_POOLS=LEGACY_DAILY_POOLS.map((pool,id)=>Object.freeze([...pool,...ORCHARD_DAILIES[id],...PANTRY_DAILIES[id],...[[{"stat":"activity_greenhouse","target":2,"title":"Seedling care","description":"Finish 2 Greenhouse jobs.","reward":65},{"stat":"activity_paddock","target":2,"title":"Happy herd","description":"Finish 2 Animal paddock jobs.","reward":65},{"stat":"chore_weeds","target":3,"title":"A tidy start","description":"Successfully clear the paths 3 times.","reward":70},{"stat":"tended","target":4,"title":"More than watering","description":"Give 4 growing crops extra care.","reward":65},{"stat":"harvest_lettuce","target":8,"title":"Leafy little harvest","description":"Harvest 8 lettuce.","reward":55},{"stat":"harvest_corn","target":6,"title":"Golden corn","description":"Harvest 6 corn.","reward":65}],[{"stat":"activity_apiary","target":3,"title":"Honey time","description":"Finish 3 Apiary jobs and collect their Honey.","reward":85},{"stat":"activity_workshop","target":3,"title":"Tools of the trade","description":"Finish 3 Tool workshop jobs.","reward":85},{"stat":"made_feed","target":3,"title":"Feed the farm","description":"Collect 3 animal feed from production.","reward":80},{"stat":"parallel_batches","target":2,"title":"Side by side","description":"Start 2 batches while another batch is still running in the same building.","reward":90,"parallel":true},{"stat":"fertilized","target":2,"title":"A soil boost","description":"Use natural fertilizer on 2 growing fields.","reward":80,"minLevel":3},{"stat":"made_flour","target":4,"title":"Flour power","description":"Collect 4 flour from production.","reward":80,"minLevel":3},{"stat":"made_salad","target":1,"title":"Freshly prepared","description":"Collect 1 fresh salad.","reward":90,"minLevel":4}],[{"stat":"activity_rounds","target":1,"title":"Make the rounds","description":"Finish a full farm round by helping at all four stops.","reward":110},{"stat":"activities","target":6,"title":"A hands-on day","description":"Finish 6 hands-on jobs around the farm.","reward":110},{"stat":"chore_troughs","target":2,"title":"Fresh water rounds","description":"Successfully fill the water troughs twice.","reward":110,"chore":"troughs"},{"stat":"chore_sorting","target":1,"title":"Everything sorted","description":"Successfully sort the seed boxes once.","reward":140,"chore":"sorting"},{"stat":"made_bread","target":2,"title":"Warm from the oven","description":"Collect 2 fresh bread.","reward":100,"minLevel":4},{"stat":"passive_earned","target":30,"title":"Roadside trade","description":"Collect 30 coins from the farm stall.","reward":80,"minLevel":3}]][id]]));
export const ORDER_POOL=Object.freeze([{"title": "The baker next door", "input": {"wheat": 5}, "xp": 15, "minLevel": 1}, {"title": "A leafy lunch", "input": {"lettuce": 4, "corn": 2}, "xp": 20, "minLevel": 1}, {"title": "Sweet little favour", "input": {"honey": 2, "wheat": 4}, "xp": 20, "minLevel": 1}, {"title": "Breakfast at the inn", "input": {"eggs": 3, "milk": 2}, "xp": 25, "minLevel": 1}, {"title": "The paddock pantry", "input": {"feed": 2, "corn": 2}, "xp": 25, "minLevel": 1}, {"title": "Honey on toast", "input": {"honey": 2, "bread": 2}, "xp": 35, "minLevel": 3}, {"title": "A cream tea", "input": {"honey": 3, "milk": 2, "bread": 1}, "xp": 35, "minLevel": 3}, {"title": "The village grocer", "input": {"corn": 3, "lettuce": 2, "cabbage": 1}, "xp": 25, "minLevel": 3}, {"title": "The millers basket", "input": {"grainmeal": 2, "flour": 4}, "xp": 30, "minLevel": 3}, {"title": "For the garden club", "input": {"fertilizer": 2, "lettuce": 4}, "xp": 30, "minLevel": 3}, {"title": "The animal sanctuary", "input": {"feed": 3, "barley": 3}, "xp": 30, "minLevel": 3}, {"title": "A picnic in the park", "input": {"bread": 2, "salad": 1, "honey": 1}, "xp": 40, "minLevel": 4}, {"title": "The cheese board", "input": {"cheese": 2, "bread": 1}, "xp": 35, "minLevel": 4}, {"title": "A farm-fresh lunch", "input": {"salad": 2, "eggs": 3}, "xp": 35, "minLevel": 4}, {"title": "Sunday lunch", "input": {"cabbage": 2, "pumpkin": 2}, "xp": 35, "minLevel": 5}, {"title": "The harvest kitchen", "input": {"vegetables": 1, "flour": 3}, "xp": 45, "minLevel": 5}, {"title": "A golden afternoon", "input": {"pie": 1, "honey": 2, "milk": 2}, "xp": 50, "minLevel": 6}, {"title": "Autumn pantry", "input": {"redcabbage": 2, "cauliflower": 2}, "xp": 40, "minLevel": 6}, {"title": "The village feast", "input": {"bread": 3, "cheese": 2, "vegetables": 1}, "xp": 65, "minLevel": 7}, {"title": "Pantry provisions", "input": {"pickles": 1, "vegetables": 1}, "xp": 55, "minLevel": 7}, {"title": "A chefs finishing touch", "input": {"oil": 1, "salad": 2, "honey": 2}, "xp": 65, "minLevel": 8}, {"title": "Golden harvest hamper", "input": {"sunflower": 2, "oil": 1}, "xp": 60, "minLevel": 8}, {"title": "The autumn festival", "input": {"pie": 2, "pickles": 1, "honey": 3}, "xp": 75, "minLevel": 8}, {"title": "The estate banquet", "input": {"oil": 1, "vegetables": 2, "cheese": 2, "bread": 2}, "xp": 85, "minLevel": 10}, {"title": "The kitchen garden", "input": {"stew": 2, "bread": 2}, "xp": 80, "minLevel": 6, "requiresBuildings": ["kitchen"]}, {"title": "An orchard picnic", "input": {"applejuice": 2, "applepie": 1}, "xp": 110, "minLevel": 8, "requiresBuildings": ["juicepress"]}, {"title": "Breakfast preserves", "input": {"berrypreserves": 2, "bread": 3}, "xp": 120, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"title": "The orchard tea room", "input": {"berrytart": 2, "applepie": 2}, "xp": 160, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"title": "A colourful orchard refreshment", "input": {"orchardjuice": 1, "bread": 2}, "xp": 65, "minLevel": 10, "requiresBuildings": ["juicepress"]}, {"title": "Smoothies for the village", "input": {"berrysmoothie": 1, "bread": 2}, "xp": 68, "minLevel": 10, "requiresBuildings": ["juicepress"]}, {"title": "A honey-sweet breakfast", "input": {"applecompote": 1, "bread": 2}, "xp": 62, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"title": "The pickling pantry", "input": {"applevinegar": 1, "bread": 2}, "xp": 80, "minLevel": 10, "requiresBuildings": ["preserves", "juicepress"]}, {"title": "Beans for the village deli", "input": {"pickledbeans": 1, "bread": 2}, "xp": 100, "minLevel": 10, "requiresBuildings": ["preserves", "juicepress"]}, {"title": "A warming farm supper", "input": {"beangratin": 1, "bread": 2}, "xp": 85, "minLevel": 7, "requiresBuildings": ["kitchen"]}, {"title": "Lunch under the apple trees", "input": {"orchardsalad": 1, "bread": 2}, "xp": 58, "minLevel": 8, "requiresBuildings": []}, {"title": "Cheesecake at the tea room", "input": {"berrycheesecake": 1, "honey": 2}, "xp": 105, "minLevel": 11, "requiresBuildings": []}, {"title": "A gift from the valley", "input": {"harvesthamper": 1, "honey": 2}, "xp": 160, "minLevel": 12, "requiresBuildings": ["juicepress", "preserves"]}]);
export function availableDaily(state,q){
 if(guidedFarm(state)){
  const stat=q.stat??'';
  if(q.input&&!Object.keys(q.input).every(k=>itemAvailable(state,k)))return false;
  if(stat.startsWith('harvest_')&&!cropUnlocked(state,stat.slice(8)))return false;
  if(stat.startsWith('made_')&&!itemAvailable(state,stat.slice(5)))return false;
  if(stat==='produced'&&!Object.keys(RECIPES).some(id=>recipeUnlocked(state,id)))return false;
  if(stat.startsWith('built_')&&!buildingEligible(state,stat.slice(6)))return false;
  if(stat==='varieties'&&q.target>Object.keys(CROPS).filter(k=>cropUnlocked(state,k)).length)return false;
  const gate=stat==='mastery_medals'?'mastery':stat==='projects'?'projects':stat==='silo_upgrades'?'silo':stat==='tractor'?'tractor':stat==='dailies'?'challenges':stat.startsWith('activity')||stat==='activities'?'activities':stat.startsWith('chore')?'chores':stat==='deliveries'?'cart':stat==='passive_earned'?'stall':null;
  if(gate&&!featureUnlocked(state,gate))return false;
  if(stat==='fertilized'&&!itemAvailable(state,'fertilizer'))return false;
 }
 return levelOf(state)>=(q.minLevel??1)&&(q.requiresBuildings??[]).every(key=>buildingUnlocked(state,key))&&(!q.chore||!choreStatus(state,q.chore).locked)&&(!q.parallel||Object.entries(state.buildings).some(([id,b])=>BUILDINGS[id].type==='production'&&b.level>=2));
}
function selectDailyTasks(state,day){
 return DAILY_POOLS.map((pool,id)=>{const eligible=pool.filter(q=>availableDaily(state,q));if(!eligible.length)eligible.push(LEGACY_DAILY_POOLS[0][id]);return {...eligible[(day+id)%eligible.length]};});
}
export function deliveryDiamonds(order){
 if(order.tier&&Number.isInteger(order.diamonds))return order.diamonds;
 const entries=Object.entries(order.input),value=entries.reduce((n,[k,count])=>n+ITEMS[k].sell*count,0);
 const crafted=entries.filter(([k])=>k!=='honey'&&Object.hasOwn(PRODUCTS,k)).length;
 const difficulty=value+crafted*250+Math.max(0,entries.length-1)*100;
 return difficulty>=3000?4:difficulty>=1400?3:difficulty>=500?2:1;
}
function orderQuote(order){return {...order,diamonds:deliveryDiamonds(order),coins:Math.ceil(Object.entries(order.input).reduce((n,[key,count])=>n+ITEMS[key].sell*count,0)*1.4)};}
export const COMMISSION_POOL=Object.freeze([
 {title:'The village breakfast',customer:'Village Inn',story:'A full house of guests needs a hearty farm breakfast.',input:{milk:8,eggs:12,flour:8},xp:75,minLevel:1},
 {title:'A countryside picnic',customer:'Valley School',story:'Pack fresh supplies for the children’s countryside outing.',input:{milk:6,eggs:9,honey:6},xp:80,minLevel:1},
 {title:'The baker’s big weekend',customer:'Willow Bakery',story:'Help the bakery prepare a whole counter of fresh treats.',input:{bread:6,flour:12,milk:6},xp:110,minLevel:4},
 {title:'Lunch in the village square',customer:'Village Kitchen',story:'The village is gathering for a farm-to-table lunch.',input:{salad:4,cheese:6,bread:4},xp:120,minLevel:4},
 {title:'The golden harvest festival',customer:'Harvest Festival',story:'Fill the festival pantry with your finest golden produce.',input:{oil:3,pie:3,honey:8},xp:160,minLevel:8},
 {title:'The winter pantry',customer:'Valley Grocer',story:'Stock the village shelves with a generous assortment of farm goods.',input:{vegetables:3,pickles:4,cheese:6},xp:170,minLevel:8},
 {title:'The grand estate banquet',customer:'Hilltop Estate',story:'A special celebration calls for an impressive farm-made feast.',input:{oil:4,vegetables:4,pie:3,bread:8},xp:220,minLevel:12},
 {title:'The valley food fair',customer:'Valley Food Fair',story:'Bring a showcase of your best goods to the annual food fair.',input:{pickles:5,oil:3,cheese:8,vegetables:3},xp:230,minLevel:12},
{"title": "The orchard opening", "customer": "Valley Orchard Fair", "story": "Serve the fair a fresh taste of the orchard.", "input": {"applejuice": 4, "applepie": 3, "stew": 3}, "xp": 300, "minLevel": 14, "requiresBuildings": ["juicepress", "kitchen"]},
{"title": "The summer preserve festival", "customer": "Village Summer Festival", "story": "Celebrate the season with honey-sweet preserves and berry baking.", "input": {"berrypreserves": 5, "berrytart": 4, "applejuice": 3}, "xp": 380, "minLevel": 16, "requiresBuildings": ["preserves", "juicepress"]},
{"title": "The valley gift collection", "customer": "Valley Gift Shop", "story": "Pack two complete farm-made hampers for the village celebration.", "input": {"harvesthamper": 2}, "xp": 420, "minLevel": 16, "requiresBuildings": ["juicepress", "preserves"]},
{"title": "The orchard dessert reception", "customer": "Hilltop Tea Room", "story": "Bring a colourful dessert table to the orchard reception.", "input": {"berrycheesecake": 3, "applecompote": 3, "orchardjuice": 3}, "xp": 380, "minLevel": 16, "requiresBuildings": ["preserves", "juicepress"]},
{"title": "A feast from the kitchen garden", "customer": "Village Supper Club", "story": "Prepare warm dishes, crisp pickles and fresh orchard salads for the supper club.", "input": {"beangratin": 3, "pickledbeans": 3, "orchardsalad": 3}, "xp": 400, "minLevel": 16, "requiresBuildings": ["kitchen", "preserves", "juicepress"]}

]);
export const DELIVERY_TIERS=Object.freeze({quick:{name:'Quick delivery',minBonus:25,maxBonus:40},village:{name:'Village order',minBonus:45,maxBonus:70},commission:{name:'Special commission',minBonus:90,maxBonus:125}});
function selectDailyOrders(state,day){
 const level=levelOf(state),now=day*DAY_MS,used=new Set();
 const quick=ORDER_POOL.filter(o=>o.minLevel===1&&availableDaily(state,o));
 const eligibleVillage=ORDER_POOL.filter(o=>availableDaily(state,o)&&Object.keys(o.input).some(k=>k!=='honey'&&Object.hasOwn(PRODUCTS,k)));
 // Keep a quick order each day; two days out of three favour advanced village orders.
 // Every third day rotates the full catalogue so earlier goods stay useful.
 const villageLevel=Math.max(1,...eligibleVillage.map(o=>o.minLevel));
 const village=day%3===0?eligibleVillage:eligibleVillage.filter(o=>o.minLevel>=Math.max(1,villageLevel-3));
 const commissionLevel=Math.max(...COMMISSION_POOL.filter(o=>availableDaily(state,o)).map(o=>o.minLevel));
 const commissions=COMMISSION_POOL.filter(o=>o.minLevel===commissionLevel&&availableDaily(state,o));
 return [['quick',quick],['village',village],['commission',commissions]].filter(([tier,pool])=>deliveryTierUnlocked(state,tier)&&(!guidedFarm(state)||pool.length)).map(([tier,pool],slot)=>{
  const candidates=pool.length?pool:quick,unused=candidates.filter(o=>!used.has(o.title)),choices=unused.length?unused:candidates,rotation=tier==='village'?(day%3===0?Math.floor(day/3):day-Math.floor(day/3)):day,template=choices[(rotation+slot)%choices.length];used.add(template.title);
  return quoteTierOrder(template,tier,now,calendarHash(`orders-v1:${day}:${tier}`));
 });
}
function quoteTierOrder(template,tier,now,roll){
  const input=Object.fromEntries(Object.entries(template.input).map(([k,n])=>[k,tier==='village'?n*2:n]));
  const band=DELIVERY_TIERS[tier],bonus=band.minBonus+roll%(band.maxBonus-band.minBonus+1);
  const value=marketValue(input,now),baseValue=Object.entries(input).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0);
  const diamonds=tier==='quick'?1:tier==='village'?3+roll%3:Math.min(18,8+Math.floor(baseValue/2000)+roll%3);
  return {...template,input,tier,customer:template.customer??(tier==='quick'?'Your neighbours':'Village trading post'),story:template.story??(tier==='quick'?'A small basket to brighten someone’s day.':'The village needs a selection of your farm-made goods.'),bonus,marketValue:value,coins:Math.ceil(value*(100+bonus)/100),diamonds,xp:tier==='village'?template.xp*2:template.xp};
}
export const REPLACE_ORDER_COST=5;
export const DAILY_ORDER_REPLACEMENTS=2;
export function replacementOptions(state,id,now=Date.now()){
 const order=state.daily.orderBoard[id];if(!order?.tier||state.daily.orders.includes(id))return [];
 const used=new Set(state.daily.orderBoard.map(o=>o.title)),pool=order.tier==='commission'?COMMISSION_POOL:ORDER_POOL;
 return pool.filter(o=>o.minLevel===order.minLevel&&!used.has(o.title)&&availableDaily(state,o)&&(order.tier!=='village'||Object.keys(o.input).some(k=>k!=='honey'&&Object.hasOwn(PRODUCTS,k))));
}
export function replaceOrder(state,id,day,revision,expectedCost,now=Date.now()){
 if(day!==utcDay(now)||state.daily.date!==day)throw new Error('A new day has started. Review the current orders.');
 if(!Number.isInteger(id)||id<0||id>=state.daily.orderBoard.length)throw new Error('Choose an order.');
 if(revision!==(state.daily.orderRevisions[id]??0))throw new Error('This order has changed. Review the current order.');
 if(expectedCost!==REPLACE_ORDER_COST)throw new Error('The price has changed. Review the current price.');
 if(state.daily.orders.includes(id))throw new Error('Delivered orders cannot be replaced.');
 if(state.daily.replacements>=DAILY_ORDER_REPLACEMENTS)throw new Error('You have used both replacements today.');
 const options=replacementOptions(state,id,now);if(!options.length)throw new Error('No alternative order is available for this difficulty yet.');
 if(state.diamonds<REPLACE_ORDER_COST)throw new Error(`You need ${REPLACE_ORDER_COST} diamonds.`);
 const roll=calendarHash(`replace:${day}:${id}:${state.daily.replacements}`),order=quoteTierOrder(options[roll%options.length],state.daily.orderBoard[id].tier,now,roll);
 state.diamonds-=REPLACE_ORDER_COST;state.daily.orderBoard[id]=order;state.daily.orderRevisions[id]=(state.daily.orderRevisions[id]??0)+1;state.daily.replacements++;
 return {id,title:order.title,cost:REPLACE_ORDER_COST,remaining:DAILY_ORDER_REPLACEMENTS-state.daily.replacements};
}
export function utcDay(now=Date.now()){return new Date(now).toISOString().slice(0,10);}
export function dayNumber(now=Date.now()){return Math.floor(now/DAY_MS);}
export function seedCost(state,crop){return Math.max(1,Math.ceil(CROPS[crop].cost*(1-siloBonus(state.siloLevel??0).seeds)));}
export function normalizeFarm(state,now=Date.now()){
 const oldVersion=state.version??0;
 if((state.version??0)<4){const previousLevel=1+Math.floor(state.xp/60);state.xpOffset=xpForLevel(previousLevel)-60*(previousLevel-1);}
 state.progression??={mode:'legacy'};
 state.version=14;state.vipExpiresAt=Number.isSafeInteger(state.vipExpiresAt)?Math.max(0,state.vipExpiresAt):0;state.inventory??={};for(const k of Object.keys(ITEMS))state.inventory[k]??=0;
 state.diamonds=Number.isFinite(state.diamonds)?Math.max(0,Math.floor(state.diamonds)):0;
 state.boosts??={};for(const key of ['xpUntil','coinsUntil','upgradeCredits'])state.boosts[key]=Number.isFinite(state.boosts[key])?Math.max(0,Math.floor(state.boosts[key])):0;
 state.boosts.upgradeCredits=Math.min(1,state.boosts.upgradeCredits);
 state.buildings??={};for(const key of Object.keys(BUILDINGS))state.buildings[key]??={level:1,job:null};
 state.stats??={};migrateProgression(state);
 for(const key of Object.keys(BUILDINGS))if(buildingCost(state,key))state.buildings[key].built??=false;
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
 for(const k of ['harvested','watered','planted','produced','earned','deliveries','tractor','dailies','tended','chores','passive_earned','projects','mastery_medals','sold'])state.stats[k]??=0;
 state.family??={familyId:null,unclaimedCount:0};
 state.discovered??=[];state.siloLevel??=0;state.tractorReadyAt??=0;
 state.login??={lastDay:null,streak:0,best:0,visits:0};state.levelRewards??=[1];
 // Existing farms keep every regular quest, inventory item and timer. A past daily gift
 // counts so returning players never have to wait a day to finish the introduction.
 state.onboarding??={completed:0,milestones:{gift:state.login.visits>0},rewardClaimed:false};
 state.onboarding.milestones??={};
 state.mastery??={harvests:Object.fromEntries(Object.keys(CROPS).map(k=>[k,state.stats['harvest_'+k]??0])),claimed:[]};
 for(const key of Object.keys(CROPS)){state.mastery.harvests[key]??=0;state.stats['harvest_'+key]??=0;}
 state.stall??={level:1,since:now,bank:0};state.estate??={completed:0,job:null};state.estate.diamondChapters??=[];state.chores??={};state.chorePractice??={};
 state.activities??={jobs:{},cooldowns:{},completed:{},round:[],rounds:0};
 for(const p of state.plots){p.tended??=false;p.fertilized??=false;p.careAt??=p.plantedAt+Math.max(0,(p.readyAt-p.plantedAt)*.3);}
 const day=utcDay(now);
 const existingDay=state.daily?.date===day;
 if(!existingDay)state.daily={date:day,baseline:{...state.stats},claimed:[],orders:[],bonusClaimed:false};
 const d=dayNumber(now);
 state.daily.replacements??=0;state.daily.orderRevisions??={};
 state.daily.tasks??=oldVersion<10&&existingDay?LEGACY_DAILY_POOLS.map((pool,id)=>({...pool[(d+id)%pool.length]})):featureUnlocked(state,'challenges')?selectDailyTasks(state,d):[];
 state.daily.orderBoard??=oldVersion<10&&existingDay?[0,2,4].map(offset=>orderQuote(LEGACY_ORDER_POOL[(d+offset)%LEGACY_ORDER_POOL.length])):selectDailyOrders(state,d);
 return state;
}
function refreshProgressionDaily(state,now){
 if(!guidedFarm(state))return;
 const day=dayNumber(now);
 if(!state.daily.tasks.length&&featureUnlocked(state,'challenges'))state.daily.tasks=selectDailyTasks(state,day);
 const tiers=new Set(state.daily.orderBoard.map(o=>o.tier));
 if(Object.keys(DELIVERY_LEVELS).some(t=>deliveryTierUnlocked(state,t)&&!tiers.has(t)))for(const order of selectDailyOrders(state,day))if(!tiers.has(order.tier))state.daily.orderBoard.push(order);
}
export function createFarm(now=Date.now()){return normalizeFarm(createBaseFarm(now),now);}
export function dailyTasks(state,now=Date.now()){
 normalizeFarm(state,now);refreshProgressionDaily(state,now);const d=dayNumber(now);
 return state.daily.tasks.map((q,id)=>{return {...q,id,reward:q.reward*dailyRewardMultiplier(state,now),xp:10*dailyRewardMultiplier(state,now),diamonds:DAILY_CHALLENGE_DIAMONDS[id]*dailyRewardMultiplier(state,now),progress:Math.min(q.target,Math.max(0,(state.stats[q.stat]??0)-(state.daily.baseline[q.stat]??0))),claimed:state.daily.claimed.includes(id)};});
}
export function dailyOrders(state,now=Date.now()){
 normalizeFarm(state,now);refreshProgressionDaily(state,now);const d=dayNumber(now);
 return state.daily.orderBoard.map((order,id)=>({...order,coins:order.coins*dailyRewardMultiplier(state,now),xp:order.xp*dailyRewardMultiplier(state,now),diamonds:deliveryDiamonds(order)*dailyRewardMultiplier(state,now),id,revision:state.daily.orderRevisions[id]??0,done:state.daily.orders.includes(id)}));
}
export function claimDaily(state,id,day,now=Date.now()){
 normalizeFarm(state,now);if(day!==utcDay(now))throw new Error('A new day has started. Check the fresh challenges.');
 const q=dailyTasks(state,now).find(q=>q.id===id);if(!q)throw new Error('Choose a daily challenge.');
 if(q.claimed)throw new Error('You already claimed this daily reward.');if(q.progress<q.target)throw new Error('Finish this daily challenge first.');
 state.daily.claimed.push(id);state.coins+=q.reward;state.diamonds+=q.diamonds;state.xp+=q.xp;state.stats.dailies++;
 state.stats.challenge_diamonds=(state.stats.challenge_diamonds??0)+q.diamonds;
 let bonus=0;if(state.daily.claimed.length===3&&!state.daily.bonusClaimed){bonus=60*dailyRewardMultiplier(state,now);state.daily.bonusClaimed=true;state.coins+=bonus;state.xp+=15*dailyRewardMultiplier(state,now);}
 return {coins:q.reward+bonus,diamonds:q.diamonds,xp:q.xp+(bonus?15*dailyRewardMultiplier(state,now):0),bonus};
}
export function checkIn(state,now=Date.now()){
 normalizeFarm(state,now);const day=utcDay(now);
 if(state.login.lastDay===day)throw new Error('Your daily gift is already collected.');
 state.login.streak=state.login.lastDay===utcDay(now-DAY_MS)?state.login.streak+1:1;
 state.login.lastDay=day;state.login.best=Math.max(state.login.best,state.login.streak);state.login.visits++;
 const index=(state.login.streak-1)%7,coins=DAILY_REWARDS[index]*dailyRewardMultiplier(state,now),diamonds=DAILY_DIAMONDS[index]*dailyRewardMultiplier(state,now),xp=10*dailyRewardMultiplier(state,now);state.coins+=coins;state.diamonds+=diamonds;state.xp+=xp;
 state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;
 return {coins,diamonds,streak:state.login.streak,xp};
}
export function deliverOrder(state,id,day,now=Date.now(),revision=0){
 normalizeFarm(state,now);if(day!==utcDay(now))throw new Error('The order board has refreshed. Pick a new order.');
 const order=dailyOrders(state,now).find(o=>o.id===id);if(!order)throw new Error('Choose an order.');if(order.done)throw new Error('This order is already delivered.');
 if(revision!==order.revision)throw new Error('This order has changed. Review the current order before delivering.');
 if(Object.entries(order.input).some(([k,n])=>state.inventory[k]<n))throw new Error('Gather the ingredients for this order first.');
 for(const[k,n]of Object.entries(order.input))state.inventory[k]-=n;
 state.daily.orders.push(id);state.coins+=order.coins;state.xp+=order.xp;state.stats.deliveries++;state.stats.earned+=order.coins;
 state.diamonds+=order.diamonds;state.stats.delivery_diamonds=(state.stats.delivery_diamonds??0)+order.diamonds;
 if(order.input.honey)state.stats.honey_deliveries=(state.stats.honey_deliveries??0)+1;
 if(Object.keys(order.input).some(k=>k!=='honey'&&Object.hasOwn(PRODUCTS,k)))state.stats.crafted_deliveries=(state.stats.crafted_deliveries??0)+1;
 return {coins:order.coins,xp:order.xp,diamonds:order.diamonds};
}
export function levelReward(level){return {coins:10*level,diamonds:Math.floor(level/5)};}
export function grantLevelRewards(state,firstLevel=2){
 const highest=levelOf(state),claimed=new Set(state.levelRewards??[1]),levels=[];
 let coins=0,diamonds=0;
 for(let level=Math.max(2,firstLevel);level<=highest;level++)if(!claimed.has(level)){const reward=levelReward(level);coins+=reward.coins;diamonds+=reward.diamonds;levels.push(level);}
 if(levels.length){state.coins+=coins;state.diamonds+=diamonds;state.levelRewards.push(...levels);state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;}
 return {coins,diamonds,levels};
}
// Compatibility for an already-open older client. The same ledger prevents
// repeat claims after automatic payment; the new UI has no claim button.
export function claimLevelRewards(state){const reward=grantLevelRewards(state);if(!reward.levels.length)throw new Error('Level rewards are already added automatically.');return reward;}
export function tractorQuote(state,mode,crop='corn',now=Date.now()){
 const eligible=state.plots.filter(p=>mode==='plant'?!p.crop:mode==='water'?p.crop&&!p.watered&&p.readyAt>now:p.crop&&p.readyAt<=now);
 const count=mode==='plant'?Math.min(eligible.length,Math.max(0,Math.floor((state.coins-12)/(seedCost(state,crop)+2)))):eligible.length;
 const fuel=count?12+count*2:0,seeds=mode==='plant'?count*seedCost(state,crop):0;
 return {count,fuel,seeds,total:fuel+seeds,ids:eligible.slice(0,count).map(p=>p.id)};
}
export function useTractor(state,mode,crop='corn',now=Date.now()){
 if(!['plant','water','harvest'].includes(mode))throw new Error('Choose a tractor task.');if(!Object.hasOwn(CROPS,crop))throw new Error('Choose a crop.');
 if(now<state.tractorReadyAt)throw new Error(`The tractor will be ready in ${Math.ceil((state.tractorReadyAt-now)/1000)} seconds.`);
 if(mode==='plant'&&!cropUnlocked(state,crop))throw new Error(cropUnlockHint(state,crop));
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
 const beforeXP=state.xp,beforeCoins=state.coins,beforeLevel=levelOf(state);
 const beginnerBefore={harvested:state.stats.harvested,wheat:state.stats.harvest_wheat??0,watered:state.stats.watered,tended:state.stats.tended};
 const result=dispatchFarmAction(state,action,now,random);
 recordBeginnerAction(state,action,result,beginnerBefore);
 const earnedXP=state.xp-beforeXP;
 if(state.boosts.xpUntil>now&&earnedXP>0){state.xp+=earnedXP;result.xp=(result.xp??earnedXP)+earnedXP;}
 if(state.boosts.coinsUntil>now&&['delivery'].includes(action.type)){
  const bonus=state.coins-beforeCoins;if(bonus>0){state.coins+=bonus;state.stats.earned+=bonus;result.coins+=bonus;}
 }
 const reward=grantLevelRewards(state,beforeLevel+1);
 if(reward.levels.length)result.levelReward=reward;
 refreshProgressionDaily(state,now);
 return result;
}
function dispatchFarmAction(state,action,now,random){
 const gates={buy_vip:'boosts',daily:'challenges',finish_batch:'boosts',replace_order:'cart',activity_start:'activities',activity_work:'activities',chore:'chores',stall_collect:'stall',stall_upgrade:'stall',mastery:'mastery',project_start:'projects',project_collect:'projects',tractor:'tractor',silo_upgrade:'silo',delivery:'cart',buy_boost:'boosts',finish_crop:'boosts'};
 const gate=gates[action.type];if(gate&&!featureUnlocked(state,gate))throw new Error(featureUnlockHint(gate));
 switch(action.type){
  case 'buy_vip':return buyVip(state,action.plan,action.expectedCost,action.expectedExpiresAt,now);
  case 'construct':return constructBuilding(state,action.building);
  case 'clear_planting':return clearPlanting(state,action.id,action.expectedPlantedAt);
  case 'finish_batch':return finishSingleBatch(state,action.building,action.jobId,action.expectedCost,now);
  case 'replace_order':return replaceOrder(state,action.id,action.day,action.revision,action.expectedCost,now);
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
  case 'sell':return sellCrops(state,action.item??'all',now,action.day,action.category,action.quantity);
  case 'produce':return startProduction(state,action.recipe,now,action.count);
  case 'collect':return collectProduction(state,action.building,now,action.jobId);
  case 'collect_all':return collectAllProduction(state,action.building,now);
  case 'upgrade':return upgradeBuilding(state,action.building,action.currency,action.expectedCost,action.expectedLevel);
  case 'expand':return expandFarm(state);
  case 'quest':return claimQuest(state,action.id);
  case 'beginner_claim':return claimBeginnerQuest(state,action.id);
  case 'daily':return claimDaily(state,action.id,action.day,now);
  case 'checkin':return checkIn(state,now);
  case 'delivery':return deliverOrder(state,action.id,action.day,now,action.revision);
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
export const CHAPTER_DIAMONDS=Object.freeze([10,20,35,50,75,100]);
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
 const n=state.estate.completed;if(n<PROJECTS.length)return {...PROJECTS[n],id:n,diamonds:CHAPTER_DIAMONDS[n]};
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
export function grantChapterRewards(state){
 const claimed=new Set(state.estate.diamondChapters??[]),chapters=[];
 let diamonds=0;
 for(let id=0;id<Math.min(PROJECTS.length,state.estate.completed);id++)if(!claimed.has(id)){
  diamonds+=CHAPTER_DIAMONDS[id];chapters.push(id);
 }
 if(chapters.length){
  state.diamonds+=diamonds;state.estate.diamondChapters=[...claimed,...chapters];
  state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;
  state.stats.chapter_diamonds=(state.stats.chapter_diamonds??0)+diamonds;
 }
 return {chapters,diamonds};
}
export function completeProject(state,now=Date.now()){
 const job=state.estate.job;if(!job)throw new Error('Start an estate project first.');if(now<job.readyAt)throw new Error('Your project is still being built.');
 const project=currentProject(state);settleStall(state,now);state.estate.completed++;state.estate.job=null;state.stats.projects++;state.xp+=project.xp;const reward=grantChapterRewards(state);return {name:project.name,xp:project.xp,diamonds:reward.diamonds,chapters:reward.chapters,completed:state.estate.completed};
}

// Small hands-on jobs run alongside crops and production. Only server time and
// persisted progress determine rewards; the client submits a station and tile.
export const ACTIVE_STATIONS=Object.freeze({
 greenhouse:{name:'Greenhouse',icon:'sprout',model:'greenhouse_003',coins:0,xp:42,cooldown:180000,item:'lettuce',itemCount:3,instruction:'Water the three dry seedlings.',target:'Dry seedling',other:'Healthy seedling',verb:'Water',targetIcon:'droplets',otherIcon:'sprout'},
 apiary:{name:'Apiary',icon:'flower-2',model:'apiary_001',coins:0,xp:48,cooldown:240000,item:'honey',itemCount:3,instruction:'Collect the three capped honey frames. Leave the bees at work.',target:'Capped honey',other:'Bees at work',verb:'Collect',targetIcon:'hexagon',otherIcon:'flower-2'},
 paddock:{name:'Animal paddock',icon:'heart',model:'horse_002',coins:0,xp:42,cooldown:180000,item:'fertilizer',instruction:'Refill the three empty water bowls.',target:'Empty bowl',other:'Full bowl',verb:'Fill',targetIcon:'droplet',otherIcon:'waves'},
 workshop:{name:'Tool workshop',icon:'wrench',model:'lawn_mower_001',coins:0,xp:48,cooldown:240000,item:'feed',instruction:'Repair the three worn tools. The others are ready to use.',target:'Worn tool',other:'Ready tool',verb:'Repair',targetIcon:'wrench',otherIcon:'check'}
});
export const ACTIVITY_ROUND_REWARD=Object.freeze({coins:0,xp:60});
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
 const itemCount=s.item?(s.itemCount??1):0;
 if(s.item)state.inventory[s.item]+=itemCount;
 state.stats.activities=(state.stats.activities??0)+1;
 state.stats['activity_'+action.station]=(state.stats['activity_'+action.station]??0)+1;
 if(roundComplete)state.stats.activity_rounds=(state.stats.activity_rounds??0)+1;
 return {station:action.station,finished:true,coins,xp,item:s.item??null,itemCount,roundComplete};
}

// Farm Family rules. Only the authenticated farm-api executes mutations against
// the service-only context; browser copies expose constants and display helpers.
export const FAMILY_CONFIG=Object.freeze({MAX_MEMBERS:6,MIN_CONTRIB_POINTS:500,JOIN_COOLDOWN_MS:48*3600000,RENAME_COOLDOWN_MS:7*DAY_MS,ATTEMPTS_PER_HOUR:10,EXTRA_POINTS_CAP:30000,TOURNAMENT_FIRST_MIN:50,TOURNAMENT_FIRST_MAX:300,TOURNAMENT_PER_EXTRA_PLAYER:10,ORDER_PLAYER_WEEK_DIAMOND_CAP:25,TOURNAMENT_MIN_POINTS:1,ORDER_COIN_MULTIPLIER:1.25,ORDER_XP_PER_VALUE:1/100,ORDER_DIAMOND_BASE:1,ORDER_DIAMOND_MAX:3,ORDER_COMPLETION_DIAMONDS:4,REWARD_WEEKS:8,ORDER_MIN_VALUE_PER_MEMBER:16000,ORDER_MAX_VALUE_PER_MEMBER:30000,RANK_WEIGHTS:[1,.6,.4]});
export const FAMILY_EMBLEMS=Object.freeze(['wheat','corn','sunflower','apples','berries','honey','bread','milk','eggs','tractor','farm','trophy','family-bee','family-oak','family-barn','pumpkin','greenbeans','cheese','applejuice','berrypreserves','harvesthamper'].map((icon,i)=>({id:String(i),icon,color:['#6b8e50','#c39538','#b57851','#517c83','#8b6a95','#a66c71'][i%6]})));
export function familyUnlocked(state,minLevel=FAMILY_MIN_LEVEL){return levelOf(state)>=minLevel;}
export function familyUnlockHint(minLevel=FAMILY_MIN_LEVEL){return `Reach level ${minLevel} to unlock Farm Family.`;}
export function familyWeek(now=Date.now()){return Math.floor((now-4*DAY_MS)/(7*DAY_MS));}
export function familyWeekStart(week){return 4*DAY_MS+week*7*DAY_MS;}
const FAMILY_ORDER_TEMPLATES=Object.freeze([
 {wheat:100,bread:30,oil:6,honey:30},
 {corn:80,vegetables:6,cheese:30,honey:30},
 {barley:60,pie:8,eggs:100,honey:30},
 {cabbage:50,pickles:8,milk:80,honey:30}
]);
const FAMILY_STARTER_ORDERS=Object.freeze([
 {wheat:150,bread:30,eggs:100,honey:30},
 {corn:80,salad:12,cheese:30,honey:30},
 {barley:60,bread:24,eggs:100,honey:30},
 {cabbage:50,salad:12,milk:80,honey:30}
]);
export function familyOrder(familyId,week,members,config=FAMILY_CONFIG,minimumLevel=FAMILY_MIN_LEVEL){
 if(!Number.isInteger(members)||members<1||members>config.MAX_MEMBERS)throw new Error('Choose a valid family size.');
 const templates=minimumLevel<17?FAMILY_STARTER_ORDERS:FAMILY_ORDER_TEMPLATES;
 const template=templates[calendarHash(`family-v1:${familyId}:${week}`)%templates.length];
 const lines=Object.fromEntries(Object.entries(template).map(([k,n])=>[k,n*members]));
 return {lines,value:Object.entries(lines).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0),members};
}
export function familyShares(budget,members,cap=Infinity,minimum=0){
 const result=Object.fromEntries(members.map(m=>[m.player_id,0]));
 if(!members.length||budget<minimum*members.length)return result;
 const total=members.reduce((n,m)=>n+m.points,0);let remaining=budget;
 for(const m of members){const n=Math.min(cap,minimum+Math.floor((budget-minimum*members.length)*m.points/Math.max(1,total)));result[m.player_id]=n;remaining-=n;}
 const ranked=[...members].sort((a,b)=>b.points-a.points||a.player_id.localeCompare(b.player_id));
 while(remaining>0){let given=false;for(const m of ranked)if(remaining>0&&result[m.player_id]<cap){result[m.player_id]++;remaining--;given=true;}if(!given)break;}
 return result;
}
export function familyTournament(context,week,config=FAMILY_CONFIG){
 const entries=context.families.filter(f=>!f.deleted_at).map(f=>{
  const current=new Set(context.members.filter(m=>m.family_id===f.id&&!m.left_at).map(m=>m.player_id));
  const rows=context.contributions.filter(c=>c.family_id===f.id&&c.week===week);
  const active=rows.filter(c=>current.has(c.player_id)&&c.points>=config.TOURNAMENT_MIN_POINTS);
  return {family_id:f.id,name:f.name,emblem:f.emblem,points:rows.reduce((n,c)=>n+c.points,0),last_at:Math.max(0,...rows.map(c=>c.last_at)),active,active_members:active.length};
 }).filter(f=>f.points>0).sort((a,b)=>b.points-a.points||a.last_at-b.last_at||a.family_id.localeCompare(b.family_id));
 const qualifying=entries.filter(f=>f.active_members>=1);
 const activePlayers=qualifying.reduce((n,f)=>n+f.active_members,0);
 // A guaranteed first prize, increasing only for current members who contributed this week.
 const firstPrize=Math.min(config.TOURNAMENT_FIRST_MAX,config.TOURNAMENT_FIRST_MIN+Math.max(0,activePlayers-1)*config.TOURNAMENT_PER_EXTRA_PLAYER);
 const prizes=qualifying.map((f,i)=>{
  const budget=Math.floor(firstPrize*(config.RANK_WEIGHTS[i]??0));
  const shares=familyShares(budget,f.active,config.TOURNAMENT_FIRST_MAX,1);
  return {family_id:f.family_id,rank:i+1,diamonds:Object.values(shares).reduce((n,d)=>n+d,0),shares};
 });
 // Empty places never dilute the winning family's prize. Before entry, show the guaranteed minimum.
 const pool=qualifying.length?prizes.reduce((n,p)=>n+p.diamonds,0):firstPrize;
 return {pool,firstPrize,activePlayers,entries,qualifying,prizes};
}
export function emptyFamilyContext(){return {revision:0,families:[],members:[],invitations:[],orders:[],contributions:[],results:[],rewards:[],attempts:[],weeks:[],players:[],receipt:null};}
const familyMember=(c,p)=>c.members.find(m=>m.player_id===p);
const familyCurrent=(c,p)=>{const m=familyMember(c,p);return m&&!m.left_at&&m.family_id?c.families.find(f=>f.id===m.family_id&&!f.deleted_at):null;};
const familyMembers=(c,id)=>c.members.filter(m=>m.family_id===id&&!m.left_at);
function addFamilyReward(c,p,week,kind,coins,xp,diamonds,now,config){
 if(c.rewards.some(r=>r.player_id===p&&r.week===week&&r.kind===kind))return;
 const allocated=c.rewards.filter(r=>r.player_id===p&&r.week===week&&r.kind===kind).reduce((n,r)=>n+r.diamonds,0);
 const cap=kind==='tournament'?config.TOURNAMENT_FIRST_MAX:config.ORDER_PLAYER_WEEK_DIAMOND_CAP;
 c.rewards.push({id:`${week}:${kind}:${p}`,player_id:p,week,kind,coins:Math.floor(coins),xp:Math.floor(xp),diamonds:Math.max(0,Math.min(diamonds,cap-allocated)),created_at:now,expires_at:familyWeekStart(week+1)+config.REWARD_WEEKS*7*DAY_MS,claimed_at:null});
}
export function settleFamilyWeeks(c,now,config=FAMILY_CONFIG){
 const current=familyWeek(now),settled=[];
 const candidates=[...new Set(c.contributions.map(x=>x.week))].filter(w=>w<current&&!c.weeks.some(x=>x.week===w));
 for(const week of candidates){
  const board=familyTournament(c,week,config);
  for(const [index,f] of board.qualifying.entries()){
   const prize=board.prizes[index];
   c.results.push({week,family_id:f.family_id,rank:prize.rank,points:f.points,active_members:f.active_members,diamonds_pool:prize.diamonds,name:f.name,emblem:f.emblem,settled_at:now});
   for(const m of f.active)if(prize.shares[m.player_id]>0)addFamilyReward(c,m.player_id,week,'tournament',0,0,prize.shares[m.player_id],now,config);
  }
  c.weeks.push({week,settled_at:now,pool:board.pool});settled.push(week);
 }
 return settled;
}
function ensureFamilyOrder(c,f,week,now,config){
 let order=c.orders.find(o=>o.family_id===f.id&&o.week===week);
 if(!order){const members=familyMembers(c,f.id),minimumLevel=Math.min(...members.map(m=>c.players.find(p=>p.player_id===m.player_id)?.level??FAMILY_MIN_LEVEL));const generated=familyOrder(f.id,week,members.length,config,minimumLevel);order={family_id:f.id,week,lines:generated.lines,filled:{},member_count:generated.members,value:generated.value,created_at:now,completed_at:null};c.orders.push(order);}
 return order;
}
function completeFamilyOrder(c,order,now,config){
 if(order.completed_at||!Object.entries(order.lines).every(([k,n])=>(order.filled[k]??0)>=n))return false;
 order.completed_at=now;
 const eligible=c.contributions.filter(x=>x.family_id===order.family_id&&x.week===order.week&&x.order_points>=config.MIN_CONTRIB_POINTS).map(x=>({...x,points:x.order_points}));
 // Reward only the value personally supplied by eligible contributors; never
 // redistribute a departing or below-threshold member's goods as extra coins.
 const bonus=familyShares(config.ORDER_COMPLETION_DIAMONDS,eligible,Infinity,0);
 for(const m of eligible)addFamilyReward(c,m.player_id,order.week,'order',m.order_points*MARKET_PAYOUT_MULTIPLIER*config.ORDER_COIN_MULTIPLIER,m.order_points*config.ORDER_XP_PER_VALUE,Math.min(config.ORDER_DIAMOND_MAX,config.ORDER_DIAMOND_BASE+Math.floor(m.order_points/10000))+(bonus[m.player_id]??0),now,config);
 return true;
}
function familyCode(c,random){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let attempt=0;attempt<30;attempt++){const code=Array.from({length:6},()=>alphabet[Math.floor(random()*alphabet.length)]).join('');if(!c.families.some(f=>f.invite_code===code&&!f.deleted_at))return code;}throw new Error('Please try creating the invite code again.');}
export const FAMILY_INVITATION_LIFETIME=7*DAY_MS;
function refreshFamilyInvitations(c,now){
 c.invitations??=[];
 for(const invite of c.invitations){
  if(invite.status!=='pending')continue;
  if(invite.expires_at<=now){invite.status='expired';invite.resolved_at=now;}
  else if(!c.families.some(f=>f.id===invite.family_id&&!f.deleted_at)||familyCurrent(c,invite.recipient_id)){invite.status='cancelled';invite.resolved_at=now;}
 }
}
export function familyMutate(original,state,player,action,now,options={}){
 const config=options.config??FAMILY_CONFIG,minLevel=options.minLevel??FAMILY_MIN_LEVEL;
 if(!familyUnlocked(state,minLevel))throw new Error(familyUnlockHint(minLevel));
 const c=structuredClone(original),week=familyWeek(now),settled=settleFamilyWeeks(c,now,config);
 refreshFamilyInvitations(c,now);
 const uuid=options.uuid??(()=>crypto.randomUUID()),random=options.random??secureChoreRandom;
 let member=familyMember(c,player),family=familyCurrent(c,player),result={};
 const type=action?.type??'family_read';
 const needFamily=()=>{if(!family)throw new Error('Join a family first.');};
 const leader=()=>{needFamily();if(member.role!=='leader')throw new Error('Only the family leader can do this.');};
 const validName=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _'-]{2,19}$/.test(value.trim());
 const joinable=()=>{if(family)throw new Error('Leave your current family first.');if((member?.cooldown_until??0)>now)throw new Error(`You can join again in ${formatDuration(member.cooldown_until-now)}.`);};
 if(['family_create','family_join','family_invite','family_accept_invite'].includes(type)){
  let rate=c.attempts.find(a=>a.player_id===player);if(!rate){rate={player_id:player,window_at:now,count:0};c.attempts.push(rate);}
  if(now-rate.window_at>=3600000){rate.window_at=now;rate.count=0;}
  if(rate.count>=config.ATTEMPTS_PER_HOUR)return {context:c,result:{error:'Too many attempts. Try again later.'},settled,failed:true};
  rate.count++;
 }
 try{
  if(type==='family_create'){
   joinable();if(!validName(action.name))throw new Error('Use 3–20 letters, numbers, spaces, apostrophes, underscores or hyphens.');
   const name=action.name.trim();if(c.families.some(f=>!f.deleted_at&&f.name.toLowerCase()===name.toLowerCase()))throw new Error('That family name is taken.');
   if(!FAMILY_EMBLEMS.some(e=>e.id===action.emblem))throw new Error('Choose a family emblem.');
   family={id:uuid(),name,emblem:action.emblem,invite_code:familyCode(c,random),is_open:false,created_at:now,renamed_at:null,deleted_at:null};c.families.push(family);
   const next={id:member?.id??uuid(),player_id:player,family_id:family.id,role:'leader',joined_at:now,left_at:null,cooldown_until:null};if(member)Object.assign(member,next);else c.members.push(next);member=next;
   result={message:'Your Farm Family is ready.'};
  }else if(type==='family_join'){
   joinable();
   if(action.code)throw new Error('Invite codes have been replaced. Ask the family leader to invite your player name.');
   const found=c.families.find(f=>f.id===action.familyId&&f.is_open&&!f.deleted_at);
   if(!found||familyMembers(c,found.id).length>=config.MAX_MEMBERS)throw new Error('This family is unavailable or full.');
   const next={id:member?.id??uuid(),player_id:player,family_id:found.id,role:'member',joined_at:now,left_at:null,cooldown_until:null};if(member)Object.assign(member,next);else c.members.push(next);member=next;family=found;result={message:'Welcome to your Farm Family.'};
  }else if(type==='family_invite'){
   leader();
   const target=c.players.find(p=>p.player_id===action.playerId);
   if(!target||target.player_id===player)throw new Error('Choose another farmer.');
   if(target.level<minLevel)throw new Error(`This farmer needs level ${minLevel} to join a family.`);
   if(familyMembers(c,family.id).length>=config.MAX_MEMBERS)throw new Error('Your family is full.');
   if(familyCurrent(c,target.player_id))throw new Error('This farmer already belongs to a family.');
   if((familyMember(c,target.player_id)?.cooldown_until??0)>now)throw new Error('This farmer is still in their family join cooldown.');
   if(c.invitations.some(i=>i.recipient_id===target.player_id&&i.status==='pending'))throw new Error('This farmer already has a pending invitation. They must accept or decline it first.');
   c.invitations.push({id:uuid(),family_id:family.id,recipient_id:target.player_id,invited_by:player,created_at:now,expires_at:now+FAMILY_INVITATION_LIFETIME,status:'pending',resolved_at:null});
   result={message:`Invitation sent to ${target.username}.`};
  }else if(type==='family_accept_invite'){
   joinable();
   const invite=c.invitations.find(i=>i.id===action.invitationId&&i.recipient_id===player&&i.status==='pending');
   if(!invite)throw new Error('This invitation is no longer available.');
   const found=c.families.find(f=>f.id===invite.family_id&&!f.deleted_at);
   if(!found||familyMembers(c,found.id).length>=config.MAX_MEMBERS)throw new Error('This family is unavailable or full.');
   const next={id:member?.id??uuid(),player_id:player,family_id:found.id,role:'member',joined_at:now,left_at:null,cooldown_until:null};if(member)Object.assign(member,next);else c.members.push(next);member=next;family=found;
   invite.status='accepted';invite.resolved_at=now;result={message:`Welcome to ${found.name}!`};
  }else if(type==='family_decline_invite'){
   const invite=c.invitations.find(i=>i.id===action.invitationId&&i.recipient_id===player&&i.status==='pending');
   if(!invite)throw new Error('This invitation is no longer available.');
   invite.status='declined';invite.resolved_at=now;result={message:'Invitation declined.'};
  }else if(type==='family_cancel_invite'){
   leader();const invite=c.invitations.find(i=>i.id===action.invitationId&&i.family_id===family.id&&i.status==='pending');
   if(!invite)throw new Error('This invitation is no longer pending.');
   invite.status='cancelled';invite.resolved_at=now;result={message:'Invitation cancelled.'};
  }else if(['family_leave','family_kick'].includes(type)){
   needFamily();if(type==='family_kick')leader();const target=type==='family_leave'?member:c.members.find(m=>m.id===action.memberId&&m.family_id===family.id&&!m.left_at);
   if(!target||type==='family_kick'&&target.player_id===player)throw new Error('Choose another family member.');
   const wasLeader=target.role==='leader';target.family_id=null;target.left_at=now;target.cooldown_until=now+config.JOIN_COOLDOWN_MS;target.role='member';
   const remaining=familyMembers(c,family.id).sort((a,b)=>a.joined_at-b.joined_at||a.id.localeCompare(b.id));if(!remaining.length)family.deleted_at=now;else if(wasLeader)remaining[0].role='leader';
   result={message:type==='family_leave'?'You left the family. Joining is available again in 48 hours.':'Member removed. A 48-hour join cooldown applies.'};
  }else if(type==='family_promote'){
   leader();const target=c.members.find(m=>m.id===action.memberId&&m.family_id===family.id&&!m.left_at&&m.player_id!==player);if(!target)throw new Error('Choose another family member.');member.role='member';target.role='leader';result={message:'Family leadership transferred.'};
  }else if(type==='family_rename'){
   leader();if(family.renamed_at&&now-family.renamed_at<config.RENAME_COOLDOWN_MS)throw new Error('You can rename your family once every seven days.');if(!validName(action.name))throw new Error('Use a valid 3–20 character family name.');const name=action.name.trim();if(c.families.some(f=>f.id!==family.id&&!f.deleted_at&&f.name.toLowerCase()===name.toLowerCase()))throw new Error('That family name is taken.');family.name=name;family.renamed_at=now;result={message:'Family renamed.'};
  }else if(type==='family_emblem'){
   leader();if(!FAMILY_EMBLEMS.some(e=>e.id===action.emblem))throw new Error('Choose a family emblem.');family.emblem=action.emblem;result={message:'Family emblem updated.'};
  }else if(type==='family_open'){
   leader();if(typeof action.open!=='boolean')throw new Error('Choose open or invite-only.');family.is_open=action.open;result={message:action.open?'Your family is open to new members.':'Your family is invite-only.'};

  }else if(type==='family_contribute'||type==='family_tournament_goods'){
   needFamily();if(action.week!==week)throw new Error('A new week has started. Review the current order.');
   if(!Object.hasOwn(ITEMS,action.item)||!Number.isSafeInteger(action.count)||action.count<1)throw new Error('Choose a valid item and whole quantity.');
   const order=ensureFamilyOrder(c,family,week,now,config);let entry=c.contributions.find(x=>x.player_id===player&&x.week===week);
   if(entry&&entry.family_id!==family.id)throw new Error('You can only contribute to one family each week.');
   const needed=Math.max(0,(order.lines[action.item]??0)-(order.filled[action.item]??0)),points=ITEMS[action.item].sell*action.count;
   if(type==='family_contribute'&&(!Object.hasOwn(order.lines,action.item)||action.count>needed))throw new Error('This exceeds what the order still needs.');
   if(type==='family_tournament_goods'){
    if(!Object.entries(order.lines).some(([k,n])=>(order.filled[k]??0)>=n))throw new Error('Fill one order line to unlock Tournament goods.');
    if((entry?.extra_points??0)+points>config.EXTRA_POINTS_CAP)throw new Error('This exceeds your weekly Tournament goods limit.');
   }
   if((state.inventory[action.item]??0)<action.count)throw new Error('You do not have enough in stock.');
   if(!entry){entry={family_id:family.id,week,player_id:player,points:0,order_points:0,extra_points:0,lines:{},last_at:now};c.contributions.push(entry);}
   state.inventory[action.item]-=action.count;entry.points+=points;entry.last_at=now;
   if(type==='family_contribute'){entry.order_points+=points;entry.lines[action.item]=(entry.lines[action.item]??0)+action.count;order.filled[action.item]=(order.filled[action.item]??0)+action.count;}
   else entry.extra_points+=points;
   const complete=completeFamilyOrder(c,order,now,config);result={points,completed:complete,message:complete?'Family Order complete! Your rewards are ready.':`${action.count} ${ITEMS[action.item].name} contributed. Thank you!`};
  }else if(type==='family_claim'){
   const reward=c.rewards.find(r=>r.id===action.rewardId&&r.player_id===player);if(!reward||reward.expires_at<=now)throw new Error('This reward is unavailable or has expired.');if(reward.claimed_at)throw new Error('This reward has already been claimed.');
   reward.claimed_at=now;state.coins+=reward.coins;state.xp+=reward.xp;state.diamonds+=reward.diamonds;state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+reward.diamonds;
   const levelReward=grantLevelRewards(state);refreshProgressionDaily(state,now);result={coins:reward.coins,xp:reward.xp,diamonds:reward.diamonds,levelReward,message:`Family rewards: +${reward.coins} coins · +${reward.xp} XP · +${reward.diamonds} diamonds.`};
  }else if(type!=='family_read')throw new Error('Choose a valid family action.');
 }catch(error){if(['family_create','family_join','family_invite','family_accept_invite'].includes(type))return {context:c,result:{error:error.message},settled,failed:true};throw error;}
 refreshFamilyInvitations(c,now);
 family=familyCurrent(c,player);if(family)ensureFamilyOrder(c,family,week,now,config);
 state.family={familyId:family?.id??null,unclaimedCount:c.rewards.filter(r=>r.player_id===player&&!r.claimed_at&&r.expires_at>now).length};
 return {context:c,result,settled,failed:false};
}
export function familyPublicView(c,player,state,now,config=FAMILY_CONFIG){
 const week=familyWeek(now),family=familyCurrent(c,player),me=familyMember(c,player),board=familyTournament(c,week,config);
 const current=c.contributions.find(r=>r.player_id===player&&r.week===week),order=family?c.orders.find(o=>o.family_id===family.id&&o.week===week):null;
 const contributionLocked=!!current&&current.family_id!==family?.id;
 const yourPrize=board.prizes.find(p=>p.family_id===family?.id);
 const rewards=c.rewards.filter(r=>r.player_id===player&&!r.claimed_at&&r.expires_at>now).map(({id,week,kind,coins,xp,diamonds,expires_at})=>({id,week,kind,coins,xp,diamonds,expiresAt:expires_at}));
 const members=family?familyMembers(c,family.id).map(m=>{const p=c.players.find(p=>p.player_id===m.player_id),points=c.contributions.find(r=>r.family_id===family.id&&r.player_id===m.player_id&&r.week===week)?.points??0;return {id:m.id,username:p?.username??'Farmer',level:p?.level??1,vipExpiresAt:Date.parse(p?.vip_expires_at)||0,online:p?.online===true,points,role:m.role,isSelf:m.player_id===player};}):[];
 const card=f=>({id:f.id,name:f.name,emblem:f.emblem,members:familyMembers(c,f.id).length});
 const pending=(c.invitations??[]).filter(i=>i.status==='pending'&&i.expires_at>now&&c.families.some(f=>f.id===i.family_id&&!f.deleted_at)&&!familyCurrent(c,i.recipient_id));
 const incoming=pending.find(i=>i.recipient_id===player);
 const invitedFamily=incoming?c.families.find(f=>f.id===incoming.family_id):null;
 const invitation=incoming?{id:incoming.id,family:card(invitedFamily),invitedBy:c.players.find(p=>p.player_id===incoming.invited_by)?.username??'Family leader',expiresAt:incoming.expires_at,canAccept:!family&&(me?.cooldown_until??0)<=now&&familyMembers(c,invitedFamily.id).length<config.MAX_MEMBERS}:null;
 const sentInvitations=family&&me?.role==='leader'?pending.filter(i=>i.family_id===family.id).map(i=>({id:i.id,recipientId:i.recipient_id,username:c.players.find(p=>p.player_id===i.recipient_id)?.username??'Farmer',expiresAt:i.expires_at})):[];

 return {invitation,sentInvitations,week,endsAt:familyWeekStart(week+1),serverNow:now,config:{minLevel:FAMILY_MIN_LEVEL,maxMembers:config.MAX_MEMBERS,minPoints:config.MIN_CONTRIB_POINTS,extraCap:config.EXTRA_POINTS_CAP,diamondCap:config.TOURNAMENT_FIRST_MAX+config.ORDER_PLAYER_WEEK_DIAMOND_CAP,orderDiamondCap:config.ORDER_PLAYER_WEEK_DIAMOND_CAP},family:family?{...card(family),open:family.is_open,leader:me.role==='leader',renameAt:(family.renamed_at??0)+config.RENAME_COOLDOWN_MS}:null,cooldownUntil:me?.cooldown_until??0,openFamilies:c.families.filter(f=>!f.deleted_at&&f.is_open&&familyMembers(c,f.id).length<config.MAX_MEMBERS).slice(0,30).map(card),members,order:order?{lines:order.lines,filled:order.filled,completed:!!order.completed_at,value:order.value,memberCount:order.member_count}:null,yourPoints:current?.points??0,yourOrderPoints:current?.order_points??0,extraUsed:current?.extra_points??0,contributionLocked,rewards,rewardPreview:{coins:Math.floor((current?.order_points??0)*MARKET_PAYOUT_MULTIPLIER*config.ORDER_COIN_MULTIPLIER),xp:Math.floor((current?.order_points??0)*config.ORDER_XP_PER_VALUE),diamonds:Math.min(config.ORDER_DIAMOND_MAX,config.ORDER_DIAMOND_BASE+Math.floor((current?.order_points??0)/10000)),completionBonus:config.ORDER_COMPLETION_DIAMONDS},tournament:{pool:board.pool,minimumPool:config.TOURNAMENT_FIRST_MIN,firstPrize:board.firstPrize,firstPrizeMin:config.TOURNAMENT_FIRST_MIN,firstPrizeMax:config.TOURNAMENT_FIRST_MAX,perExtraPlayer:config.TOURNAMENT_PER_EXTRA_PLAYER,activePlayers:board.activePlayers,activeFamilies:board.qualifying.length,yourRank:yourPrize?.rank??null,yourDiamonds:yourPrize?.shares[player]??0,familyDiamonds:yourPrize?.diamonds??0,entered:!!yourPrize&&Object.hasOwn(yourPrize.shares,player),top:board.qualifying.slice(0,10).map((f,i)=>({name:f.name,emblem:f.emblem,points:f.points,activeMembers:f.active_members,qualified:true,diamonds:board.prizes[i].diamonds})),past:c.results.filter(r=>r.week>=week-4&&r.week<week).sort((a,b)=>b.week-a.week||a.rank-b.rank).map(r=>({week:r.week,name:r.name,rank:r.rank,points:r.points,activeMembers:r.active_members,diamonds:r.diamonds_pool}))}};
}
