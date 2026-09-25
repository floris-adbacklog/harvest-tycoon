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
 berries:{"name": "Berries", "cost": 1000, "sell": 130, "duration": 28800000, "regrow": 14400000, "xp": 27, "model": "bush_003", "height": 0.95, "use": "Berry preserves & berry tart", "minLevel": 10, "perennial": true},
 // The midgame expansion (levels 28-46). Each crop grows on its own model from the farm pack: a squash vine, climbing beans on a
 // pole and a second, bigger apple tree. Prices follow the crops just below them; the two perennials regrow like the berries.
 squash:{"name": "Squash", "cost": 220, "sell": 560, "duration": 57600000, "xp": 60, "model": "plant_002", "height": 0.8, "use": "Squash soup & the glasshouse", "minLevel": 28},
 polebeans:{"name": "Pole beans", "cost": 1400, "sell": 160, "duration": 21600000, "regrow": 10800000, "xp": 30, "model": "plant_009", "height": 1.7, "use": "Squash soup", "minLevel": 31, "perennial": true},
 ciderapples:{"name": "Cider apples", "cost": 1600, "sell": 180, "duration": 50400000, "regrow": 25200000, "xp": 40, "model": "tree_010", "height": 1.9, "use": "Sparkling cider", "minLevel": 46, "perennial": true},
 // Wave 2 (levels 54-70): a cherry tree that regrows like the other orchard trees.
 cherries:{"name": "Cherries", "cost": 2000, "sell": 220, "duration": 57600000, "regrow": 28800000, "xp": 46, "model": "tree_011", "height": 1.9, "use": "Cherry jam & cherry pie", "minLevel": 66, "perennial": true}
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
harvesthamper:{"name": "Harvest Hamper", "sell": 5900, "icon": "package-check", "color": "gold"},
// The midgame expansion: a soup from the new crops, the Bee Yard's wax, the Sheep Barn's wool, the Weaving Shed's yarn and cloth
// (the first goods that are not food) and cider. Each sells for about half as much again as what goes in, like the goods before.
squashsoup:{"name": "Squash soup", "sell": 2700, "icon": "soup", "color": "gold"},
beeswax:{"name": "Beeswax", "sell": 260, "icon": "hexagon", "color": "gold"},
wool:{"name": "Wool", "sell": 190, "icon": "cloud", "color": "cream"},
yarn:{"name": "Yarn", "sell": 420, "icon": "package-check", "color": "cream"},
cloth:{"name": "Cloth", "sell": 2600, "icon": "package-check", "color": "cream"},
cider:{"name": "Cider", "sell": 1650, "icon": "package-check", "color": "gold"},
// Wave 2: goat milk and goat cheese, the Craft Workshop's candles and blankets, and two cherry treats.
goatmilk:{"name": "Goat milk", "sell": 185, "icon": "milk", "color": "cream"},
goatcheese:{"name": "Goat cheese", "sell": 1350, "icon": "sandwich", "color": "cream"},
// The Pig Farm: pigs with clever noses dig up truffles, and the Farm Kitchen turns one into an omelette.
truffles:{"name": "Truffles", "sell": 230, "icon": "package-check", "color": "wheat"},
truffleomelette:{"name": "Truffle omelette", "sell": 880, "icon": "egg", "color": "gold"},
candles:{"name": "Beeswax candles", "sell": 1150, "icon": "flame", "color": "gold"},
blanket:{"name": "Wool blanket", "sell": 9800, "icon": "package-check", "color": "cream"},
cherryjam:{"name": "Cherry jam", "sell": 2700, "icon": "amphora", "color": "gold"},
cherrypie:{"name": "Cherry pie", "sell": 2900, "icon": "cake-slice", "color": "gold"},
// Wave 3: the Glasshouse's show basket, for the fair, the export trailers and the best orders.
prizeproduce:{"name": "Prize produce", "sell": 9800, "icon": "award", "color": "gold"}

});
export const ITEMS=Object.freeze({...CROPS,...PRODUCTS});
// The Starter Pack (level 14) gives one of every crop in the game. The payment itself is credited by the database
// (harvest_credit_purchase, supabase/starter-pack-all-crops.sql), which lists the same crops: a test keeps the two equal, so a
// new crop cannot be left out.
export const STARTER_PACK_CROPS=Object.freeze(Object.keys(CROPS));
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
// The Factory: an endgame building (farm level 50, 100,000 coins, levels 1-20 like every production building) that makes every
// production good in bulk, in twice the time of one normal batch, as many batches at once as the building that normally makes
// the good allows (factoryBatchCount). Crops are still grown by hand.
export const FACTORY_LEVEL=50;
export const FACTORY_COST=100000;
export const FACTORY_TIME_FACTOR=2;
// (Until 26 Sep 2026) levels 10-20 cost every production building the exact same coins to upgrade (see ESTATE_UPGRADES) —
// fine for a 100-1,400 coin building, but the Factory alone was built for 100,000. Doubled so reaching a full
// Factory stays a real, distinct investment instead of the cheapest building's own upgrade ladder.
export const FACTORY_UPGRADE_MULTIPLIER=2;
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
 preserves:{"name": "Preserves Workshop", "tagline": "Berries and honey, saved for something special.", "icon": "amphora", "model": "hangar_002", "type": "production", "upgradeCost": 850, "minLevel": 10, "buildCost": 10000},
 // The midgame expansion: four new production buildings, each on its own model from the farm pack.
 beeyard:{"name": "Bee Yard", "tagline": "Busy hives: honey for the pantry and golden beeswax to sell.", "icon": "hexagon", "model": "apiary_002", "type": "production", "upgradeCost": 950, "minLevel": 34, "buildCost": 18000},
 sheepbarn:{"name": "Sheep Barn", "tagline": "A friendly flock and soft wool, shorn with care.", "icon": "cloud", "model": "hangar_006", "type": "production", "upgradeCost": 1050, "minLevel": 37, "buildCost": 26000},
 glasshouse:{"name": "Glasshouse", "tagline": "Warm beds under glass: a crate of vegetables or sunflowers from fertilizer, no field needed.", "icon": "sprout", "model": "greenhouse_004", "type": "production", "upgradeCost": 1200, "minLevel": 40, "buildCost": 40000},
 weaving:{"name": "Weaving Shed", "tagline": "Spin wool into yarn and weave it into fine cloth.", "icon": "package-check", "model": "house_018", "type": "production", "upgradeCost": 1300, "minLevel": 43, "buildCost": 55000},
 // Wave 2: goats beside the sheep, and a workshop for the Bee Yard's wax and the Weaving Shed's cloth.
 pigfarm:{"name": "Pig Farm", "tagline": "Happy pigs with clever noses, digging up truffles.", "icon": "package-check", "model": "house_019", "type": "production", "upgradeCost": 900, "minLevel": 29, "buildCost": 14000},
 goatshed:{"name": "Goat Shed", "tagline": "Curious goats, creamy milk and a cheese to be proud of.", "icon": "milk", "model": "hangar_015", "type": "production", "upgradeCost": 1400, "minLevel": 54, "buildCost": 72000},
 craftshop:{"name": "Craft Workshop", "tagline": "Hand-poured beeswax candles and warm wool blankets.", "icon": "flame", "model": "hangar_019", "type": "production", "upgradeCost": 1500, "minLevel": 58, "buildCost": 90000},
 factory:{"name": "Factory", "tagline": "Every good in huge batches, for the fields and upgrades of a lasting estate.", "icon": "factory", "model": "hangar_007", "type": "production", "upgradeCost": 800, "minLevel": FACTORY_LEVEL, "buildCost": FACTORY_COST}
});
const BASE_RECIPES=Object.freeze({
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
harvesthamper:{"building": "packing", "name": "Pack a harvest hamper", "input": {"applejuice": 2, "berrypreserves": 2, "bread": 2}, "output": {"harvesthamper": 1}, "duration": 28800000, "xp": 140, "minLevel": 12, "requiresBuildings": ["juicepress", "preserves"]},
// The midgame expansion. The Glasshouse grows crops that already exist, in half their field time and in bigger numbers, for
// fertilizer and seed money: a sink for the Windmill's fertilizer and a reason to revisit older crops.
squashsoup:{"building": "kitchen", "name": "Cook squash soup", "input": {"squash": 2, "polebeans": 3, "milk": 2}, "output": {"squashsoup": 1}, "duration": 14400000, "xp": 75, "minLevel": 32},
hives:{"building": "beeyard", "name": "Let the bees work the sunflowers", "input": {"sunflower": 1}, "output": {"honey": 4, "beeswax": 3}, "duration": 7200000, "xp": 45, "minLevel": 34},
wool:{"building": "sheepbarn", "name": "Shear the flock", "input": {"feed": 2}, "output": {"wool": 2}, "duration": 3600000, "xp": 22, "minLevel": 37},
grazewool:{"building": "sheepbarn", "name": "Graze the flock on barley", "input": {"barley": 4}, "output": {"wool": 3}, "duration": 4500000, "xp": 24, "minLevel": 39},
glasscauliflower:{"building": "glasshouse", "name": "Grow cauliflower under glass", "input": {"fertilizer": 1}, "coins": 260, "output": {"cauliflower": 8}, "duration": 7200000, "xp": 60, "minLevel": 40},
glasspumpkin:{"building": "glasshouse", "name": "Grow pumpkins under glass", "input": {"fertilizer": 1}, "coins": 380, "output": {"pumpkin": 8}, "duration": 14400000, "xp": 90, "minLevel": 41},
glassredcabbage:{"building": "glasshouse", "name": "Grow red cabbage under glass", "input": {"fertilizer": 2}, "coins": 520, "output": {"redcabbage": 8}, "duration": 21600000, "xp": 120, "minLevel": 42},
glasssquash:{"building": "glasshouse", "name": "Grow squash under glass", "input": {"fertilizer": 2}, "coins": 880, "output": {"squash": 6}, "duration": 28800000, "xp": 150, "minLevel": 44},
// Sunflowers under glass (added with wave 3): a field needs 14-24 hours for a few, and candles, beeswax, honey and oil all start with them.
glasssunflower:{"building": "glasshouse", "name": "Grow sunflowers under glass", "input": {"fertilizer": 2}, "coins": 760, "output": {"sunflower": 6}, "duration": 28800000, "xp": 130, "minLevel": 48},
yarn:{"building": "weaving", "name": "Spin wool into yarn", "input": {"wool": 3}, "output": {"yarn": 2}, "duration": 5400000, "xp": 35, "minLevel": 43},
cloth:{"building": "weaving", "name": "Weave fine cloth", "input": {"yarn": 4}, "output": {"cloth": 1}, "duration": 14400000, "xp": 80, "minLevel": 45},
cider:{"building": "juicepress", "name": "Press sparkling cider", "input": {"ciderapples": 4, "honey": 2}, "output": {"cider": 1}, "duration": 14400000, "xp": 60, "minLevel": 47},
// Wave 2. Goat cheese is made in the Dairy Barn, the cherry treats in the Preserves Workshop and the Bakery.
trufflehunt:{"building": "pigfarm", "name": "Let the pigs hunt truffles", "input": {"feed": 2}, "output": {"truffles": 2}, "duration": 4800000, "xp": 28, "minLevel": 29},
vegetablefeast:{"building": "pigfarm", "name": "A vegetable feast for the pigs", "input": {"corn": 6, "lettuce": 8}, "output": {"truffles": 3}, "duration": 6000000, "xp": 32, "minLevel": 31},
truffleomelette:{"building": "kitchen", "name": "Cook truffle omelettes", "input": {"eggs": 4, "cheese": 2, "truffles": 2}, "output": {"truffleomelette": 2}, "duration": 10800000, "xp": 55, "minLevel": 30},
goatmilk:{"building": "goatshed", "name": "Milk the goats", "input": {"feed": 2}, "output": {"goatmilk": 2}, "duration": 3000000, "xp": 26, "minLevel": 54},
goatcheese:{"building": "dairy", "name": "Make goat cheese", "input": {"goatmilk": 4}, "output": {"goatcheese": 1}, "duration": 10800000, "xp": 60, "minLevel": 55},
goatbrowse:{"building": "goatshed", "name": "Let the goats browse", "input": {"lettuce": 6, "barley": 2}, "output": {"goatmilk": 3}, "duration": 4200000, "xp": 30, "minLevel": 56},
candles:{"building": "craftshop", "name": "Pour beeswax candles", "input": {"beeswax": 3}, "output": {"candles": 1}, "duration": 6000000, "xp": 40, "minLevel": 58},
blanket:{"building": "craftshop", "name": "Knot a wool blanket", "input": {"cloth": 2, "wool": 6}, "output": {"blanket": 1}, "duration": 28800000, "xp": 220, "minLevel": 60},
cherryjam:{"building": "preserves", "name": "Cook cherry jam", "input": {"cherries": 6, "honey": 3}, "output": {"cherryjam": 1}, "duration": 14400000, "xp": 85, "minLevel": 67},
cherrypie:{"building": "bakery", "name": "Bake a cherry pie", "input": {"cherries": 5, "flour": 4, "eggs": 2}, "output": {"cherrypie": 1}, "duration": 18000000, "xp": 95, "minLevel": 68},
// Wave 3. Prize produce is grown under glass from the best of the vegetable garden; like every Glasshouse batch it is never made in bulk.
prizeproduce:{"building": "glasshouse", "name": "Grow prize produce", "input": {"squash": 3, "cauliflower": 6, "redcabbage": 3, "fertilizer": 3}, "output": {"prizeproduce": 1}, "duration": 43200000, "xp": 260, "minLevel": 80}

});
// One Factory recipe per production recipe: quick goods (a batch of an hour or less) at most ×20, slow ones at most ×10, in twice the
// time of the normal batch. RECIPES holds that largest size; recipeFor() gives the size for one farm (factoryBatchCount). Ingredients, goods and XP scale the same way (the XP per
// ingredient stays what it was). Only production goods: the Glasshouse (the one building that grows crops) is left out. Honey
// comes from the Bee Yard (and its bulk version here): the Factory no longer bottles honey for coins.
export const factoryBatches=recipe=>recipe.duration<=3600000?20:10;
const scaled=(items,n)=>Object.freeze(Object.fromEntries(Object.entries(items).map(([key,count])=>[key,count*n])));
const MASS_RECIPES=Object.fromEntries([
 ...Object.entries(BASE_RECIPES).filter(([,r])=>r.building!=='glasshouse').map(([id,r])=>{const n=factoryBatches(r);return [`mass_${id}`,Object.freeze({building:'factory',name:`${r.name} ×${n}`,input:scaled(r.input,n),output:scaled(r.output,n),duration:r.duration*FACTORY_TIME_FACTOR,xp:r.xp*n,base:id,batches:n,minLevel:FACTORY_LEVEL})];}),
]);
export const RECIPES=Object.freeze({...BASE_RECIPES,...MASS_RECIPES});
// How big a Factory batch is on this farm (26 Sep 2026): twice the level of the building that normally makes the good, up to ×20;
// goods that take over an hour its level, up to ×10. A level-5 Dairy makes cheese ×10 in the Factory, a level-10 one ×20. Before,
// every Factory batch was ×20 (×10): balanced for level-20 buildings, it did the work of four to fifteen of the level 3-7 buildings
// farmers really have at level 50-65, and upgrading those buildings had no point left. Now an upgrade grows the Factory batch too.
export const FACTORY_BATCHES_PER_LEVEL=Object.freeze({quick:2,slow:1});
export function factoryBatchCount(state,id){
 const r=RECIPES[id];if(r?.building!=='factory')return 1;
 const quick=r.batches===20,level=Math.max(1,state?.buildings?.[RECIPES[r.base].building]?.level??1);
 return Math.min(r.batches,level*(quick?FACTORY_BATCHES_PER_LEVEL.quick:FACTORY_BATCHES_PER_LEVEL.slow));
}
// The recipe as this farm makes it: the same for every building, the Factory's sized by factoryBatchCount.
export function recipeFor(state,id){
 const r=RECIPES[id];if(r?.building!=='factory')return r;
 const n=factoryBatchCount(state,id);if(n===r.batches)return r;
 const base=RECIPES[r.base];
 return Object.freeze({...r,name:`${base.name} ×${n}`,input:scaled(base.input,n),output:scaled(base.output,n),xp:base.xp*n,batches:n});
}
// The name of a running or finished batch, with its real size (a Factory batch keeps the size it was started with).
export function jobName(job){
 const r=RECIPES[job?.recipe];if(!r)return 'Finished batch';if(r.building!=='factory'||!job.output||!r.base)return r.name;
 const base=RECIPES[r.base],item=Object.keys(base.output)[0],n=Math.round((job.output[item]??0)/base.output[item]);
 return n>0?`${base.name} ×${n}`:r.name;
}
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
 {id:'gift',title:'A gift for showing up',description:'Open Today and collect your daily gift. Come back tomorrow for the next one and 30 minutes of double harvest.',guide:'today',icon:'gift'},
 {id:'chore',title:'A helping hand',description:'Complete one Farm chore for extra coins while your crops and buildings work.',guide:'chores',icon:'shovel'},
 {id:'tend',title:'Good things need a little care',description:'Use Care on a growing crop once its care marker appears. It comes quickly while you are starting out.',guide:'tend',icon:'leaf'},
 {id:'wheat',title:'Bring in the wheat',description:'Harvest one wheat field when it is ready. Water and care make your harvest bigger.',guide:'harvest',icon:'wheat'},
 {id:'collect',title:'Made on your farm',description:'Collect a finished batch from a building. Chicken feed becomes eggs in 5 minutes.',guide:'collect',icon:'package-check'}
]);
function beginnerQuests(state){return guidedFarm(state)?BEGINNER_QUESTS.map(q=>q.id==='chore'?{id:'sell_egg',title:'An egg opens new doors',description:'Collect eggs from the Chicken Coop and sell at least one in Market → Goods. Save the coins for your next building. Hands-on jobs open at level 8.',guide:'eggs',icon:'egg'}:q):BEGINNER_QUESTS;}
export function beginnerProgress(state){
 const guide=state.onboarding??{completed:0,milestones:{}};
 return beginnerQuests(state).map((quest,index)=>({...quest,index,done:index<guide.completed,current:index===guide.completed,ready:!!guide.milestones[quest.id]}));
}
// Guide steps finish themselves as soon as the farmer has done them (many never found the "Complete step" button and
// stayed on step 1); only the last step, with the diamonds, is collected by hand.
function advanceBeginner(state){
 const guide=state.onboarding,quests=beginnerQuests(state),done=[];
 while(guide&&!guide.rewardClaimed&&guide.completed<quests.length-1&&guide.milestones[quests[guide.completed].id]){
  const quest=quests[guide.completed];guide.completed++;state.xp+=BEGINNER_STEP_XP;done.push({step:quest.id,title:quest.title,xp:BEGINNER_STEP_XP});
 }
 return done;
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
 if(action.type==='field'&&action.action==='plant'&&result.crop==='wheat'||action.type==='fields'&&action.action==='plant'&&result.crop==='wheat'||action.type==='tractor'&&action.mode==='plant'&&action.crop==='wheat')m.plant=true;
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
{"title": "A grand crop collection", "description": "Claim 48 crop mastery medals.", "stat": "mastery_medals", "target": 48, "reward": 30000},
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
 {title:'Pumpkin master',description:'Harvest 250 pumpkin.',stat:'harvest_pumpkin',target:250,reward:6000},
 // Starter quests: small, quick and paid in coins only (xp:0: with the beginner boost a farmer already levels fast), so the first minutes have
 // something to tick off every minute or two. On a guided farm the quest list shows the cheapest first (see questGroups). Everything after
 // them is unchanged: IDs never move.
 {title:'Thirsty crops',description:'Water 3 growing crops.',stat:'watered',target:3,reward:20,xp:0},
 {title:'First customers',description:'Sell 5 items at the market.',stat:'sold',target:5,reward:25,xp:0},
 {title:'Show some care',description:'Give 2 crops extra care.',stat:'tended',target:2,reward:25,xp:0},
 {title:'Pocket money',description:'Earn 60 coins at the market.',stat:'earned',target:60,reward:30,xp:0},
 {title:'Morning eggs',description:'Collect 6 eggs.',stat:'made_eggs',target:6,reward:30,xp:0},
 {title:'Corn on the cob',description:'Harvest 4 corn.',stat:'harvest_corn',target:4,reward:30,xp:0},
 {title:'Chore time',description:'Complete 2 farm chores.',stat:'chores',target:2,reward:40,xp:0},
 {title:'A full basket',description:'Harvest 10 crops.',stat:'harvested',target:10,reward:45,xp:0},
 {title:'First seeds',description:'Plant 3 crops.',stat:'planted',target:3,reward:20,xp:0},
 {title:'Wheat wave',description:'Harvest 6 wheat.',stat:'harvest_wheat',target:6,reward:30,xp:0},
 {title:'Salad days',description:'Harvest 4 lettuce.',stat:'harvest_lettuce',target:4,reward:35,xp:0},
 {title:'Well made',description:'Collect 2 finished production batches.',stat:'produced',target:2,reward:35,xp:0},
 {title:'Fresh milk',description:'Collect 4 milk.',stat:'made_milk',target:4,reward:40,xp:0},
 {title:'First challenge',description:'Complete 1 daily challenge.',stat:'dailies',target:1,reward:40,xp:0},
 {title:'Busy market day',description:'Sell 20 items at the market.',stat:'sold',target:20,reward:40,xp:0},
 {title:'First order',description:'Complete 1 delivery order.',stat:'deliveries',target:1,reward:45,xp:0},
 {title:'Feed the flock',description:'Make 6 animal feed at the Mill.',stat:'made_feed',target:6,reward:35,xp:0},
 {title:'Corn crib',description:'Harvest 12 corn.',stat:'harvest_corn',target:12,reward:40,xp:0},
 {title:'Say cheese',description:'Collect 2 cheese from the Dairy.',stat:'made_cheese',target:2,reward:45,xp:0},
 {title:'A small fortune',description:'Earn 300 coins at the market.',stat:'earned',target:300,reward:60,xp:0},
 // The midgame expansion (levels 28-46): open each new building, grow each new crop and make each new good. Appended, so every
 // earlier quest keeps its ID. A quest shows up once what it asks for is open (see availableDaily).
 {title:'A buzzing corner',description:'Open the Bee Yard.',stat:'built_beeyard',target:1,reward:2500},
 {title:'Welcome to the flock',description:'Open the Sheep Barn.',stat:'built_sheepbarn',target:1,reward:3500},
 {title:'Under glass',description:'Open the Glasshouse.',stat:'built_glasshouse',target:1,reward:5000},
 {title:'Warp and weft',description:'Open the Weaving Shed.',stat:'built_weaving',target:1,reward:6500},
 {title:'Squash season',description:'Harvest 10 squash.',stat:'harvest_squash',target:10,reward:2500},
 {title:'A cellar of squash',description:'Harvest 60 squash.',stat:'harvest_squash',target:60,reward:7000},
 {title:'Up the pole',description:'Harvest 25 pole beans.',stat:'harvest_polebeans',target:25,reward:2500},
 {title:'Bean towers',description:'Harvest 120 pole beans.',stat:'harvest_polebeans',target:120,reward:7500},
 {title:'A crisp little crop',description:'Harvest 20 cider apples.',stat:'harvest_ciderapples',target:20,reward:4000},
 {title:'The cider orchard',description:'Harvest 100 cider apples.',stat:'harvest_ciderapples',target:100,reward:12000},
 {title:'A warm bowl',description:'Cook 3 squash soup.',stat:'made_squashsoup',target:3,reward:4000},
 {title:'Soup of the day',description:'Cook 15 squash soup.',stat:'made_squashsoup',target:15,reward:14000},
 {title:'Wax on',description:'Collect 20 beeswax.',stat:'made_beeswax',target:20,reward:3000},
 {title:'Golden stores',description:'Collect 100 beeswax.',stat:'made_beeswax',target:100,reward:10000},
 {title:'First shearing',description:'Collect 30 wool.',stat:'made_wool',target:30,reward:3500},
 {title:'A mountain of fleece',description:'Collect 150 wool.',stat:'made_wool',target:150,reward:11000},
 {title:'Spinning yarns',description:'Spin 20 yarn.',stat:'made_yarn',target:20,reward:5000},
 {title:'Fine cloth',description:'Weave 5 cloth.',stat:'made_cloth',target:5,reward:8000},
 {title:'The weaver’s pride',description:'Weave 25 cloth.',stat:'made_cloth',target:25,reward:22000},
 {title:'Green fingers under glass',description:'Collect 10 batches from the Glasshouse.',stat:'glasshouse_batches',target:10,reward:5000,requiresBuildings:['glasshouse']},
 {title:'Glasshouse grower',description:'Collect 50 batches from the Glasshouse.',stat:'glasshouse_batches',target:50,reward:16000,requiresBuildings:['glasshouse']},
 {title:'Sparkling success',description:'Press 5 cider.',stat:'made_cider',target:5,reward:6000},
 {title:'The cider house',description:'Press 25 cider.',stat:'made_cider',target:25,reward:18000},
 // Wave 2 (levels 54-70).
 {title:'Kids of the valley',description:'Open the Goat Shed.',stat:'built_goatshed',target:1,reward:9000},
 {title:'The craft corner',description:'Open the Craft Workshop.',stat:'built_craftshop',target:1,reward:11000},
 {title:'First milking',description:'Collect 30 goat milk.',stat:'made_goatmilk',target:30,reward:6000},
 {title:'A creamy herd',description:'Collect 200 goat milk.',stat:'made_goatmilk',target:200,reward:18000},
 {title:'Fresh goat cheese',description:'Make 5 goat cheese.',stat:'made_goatcheese',target:5,reward:8000},
 {title:'The cheese cave',description:'Make 30 goat cheese.',stat:'made_goatcheese',target:30,reward:24000},
 {title:'Candlelight',description:'Pour 10 beeswax candles.',stat:'made_candles',target:10,reward:9000},
 {title:'A glowing trade',description:'Pour 60 beeswax candles.',stat:'made_candles',target:60,reward:26000},
 {title:'Wrapped in wool',description:'Make 3 wool blankets.',stat:'made_blanket',target:3,reward:14000},
 {title:'The blanket chest',description:'Make 20 wool blankets.',stat:'made_blanket',target:20,reward:40000},
 {title:'Cherry blossom',description:'Harvest 20 cherries.',stat:'harvest_cherries',target:20,reward:9000},
 {title:'The cherry orchard',description:'Harvest 120 cherries.',stat:'harvest_cherries',target:120,reward:26000},
 {title:'Jam session',description:'Cook 5 cherry jam.',stat:'made_cherryjam',target:5,reward:12000},
 {title:'A slice of summer',description:'Bake 5 cherry pies.',stat:'made_cherrypie',target:5,reward:13000},
 {title:'Cherry on top',description:'Bake 30 cherry pies.',stat:'made_cherrypie',target:30,reward:36000},
 {title:'Valley market day',description:'Sell 3 baskets at the Valley Market.',stat:'valley_baskets',target:3,reward:8000,minLevel:62},
 {title:'A regular at the market',description:'Sell 25 baskets at the Valley Market.',stat:'valley_baskets',target:25,reward:22000,minLevel:62},
 {title:'The talk of the valley',description:'Sell 100 baskets at the Valley Market.',stat:'valley_baskets',target:100,reward:60000,minLevel:62},
 {title:'Head of the herd',description:'Choose a herd for your ranch.',stat:'ranch_focus',target:1,reward:10000,minLevel:70},
 // Wave 3 (levels 75-90).
 {title:'The manor workshop',description:'Build an improvement at the Estate Workshop.',stat:'improvements',target:1,reward:15000,minLevel:75},
 {title:'A well-kept estate',description:'Build 4 improvements at the Estate Workshop.',stat:'improvements',target:4,reward:50000,minLevel:80},
 {title:'Nothing left to improve',description:'Build all 7 improvements at the Estate Workshop.',stat:'improvements',target:7,reward:120000,minLevel:88},
 {title:'Blue-ribbon vegetables',description:'Grow 3 prize produce.',stat:'made_prizeproduce',target:3,reward:20000,minLevel:80},
 {title:'The prize grower',description:'Grow 25 prize produce.',stat:'made_prizeproduce',target:25,reward:60000,minLevel:80},
 {title:'The first export',description:'Send a full trailer from the Trade Depot.',stat:'depot_shipments',target:1,reward:25000,minLevel:85},
 {title:'A steady trade',description:'Send 10 full trailers from the Trade Depot.',stat:'depot_shipments',target:10,reward:70000,minLevel:85},
 {title:'Valley trade baron',description:'Send 40 full trailers from the Trade Depot.',stat:'depot_shipments',target:40,reward:180000,minLevel:85},
 {title:'A ribbon at the fair',description:'Win a ribbon at the Grand Valley Fair.',stat:'fair_entries',target:1,reward:30000,minLevel:90},
 {title:'Grand champion',description:'Win all three ribbons at the fair in one week.',stat:'fair_champion',target:1,reward:80000,minLevel:90},
 {title:'Star of the fair',description:'Collect 20 fair stars.',stat:'fair_stars',target:20,reward:90000,minLevel:90},
 {title:'Legend of the fair',description:'Collect 100 fair stars.',stat:'fair_stars',target:100,reward:250000,minLevel:90},
 // 46 more (2026-09-23), rounding the list to 250: longer ladders for everything the expansion added, and the estate story,
 // the fields, mastery and upgrades carried to the end of the game. Each ladder climbs above the quests before it.
 {title:'A cellar full of squash',description:'Harvest 250 squash.',stat:'harvest_squash',target:250,reward:18000},
 {title:'Squash as far as the eye can see',description:'Harvest 600 squash.',stat:'harvest_squash',target:600,reward:40000},
 {title:'The bean poles are bending',description:'Harvest 400 pole beans.',stat:'harvest_polebeans',target:400,reward:20000},
 {title:'Crates of cider apples',description:'Harvest 400 cider apples.',stat:'harvest_ciderapples',target:400,reward:30000},
 {title:'Fields of sunshine',description:'Harvest 500 sunflowers from your fields.',stat:'harvest_sunflower',target:500,reward:15000},
 {title:'Sunflowers under glass',description:'Grow 60 sunflowers in the Glasshouse.',stat:'made_sunflower',target:60,reward:9000,minLevel:48,requiresBuildings:['glasshouse']},
 {title:'A glasshouse of gold',description:'Grow 300 sunflowers in the Glasshouse.',stat:'made_sunflower',target:300,reward:30000,minLevel:48,requiresBuildings:['glasshouse']},
 {title:'Master of the glasshouse',description:'Collect 200 batches from the Glasshouse.',stat:'glasshouse_batches',target:200,reward:45000,requiresBuildings:['glasshouse']},
 {title:'The glasshouse never sleeps',description:'Collect 500 batches from the Glasshouse.',stat:'glasshouse_batches',target:500,reward:90000,requiresBuildings:['glasshouse']},
 {title:'The soup season',description:'Cook 60 squash soup.',stat:'made_squashsoup',target:60,reward:35000},
 {title:'A river of honey',description:'Collect 500 honey from your buildings.',stat:'made_honey',target:500,reward:20000,minLevel:34,requiresBuildings:['beeyard']},
 {title:'A wall of wax',description:'Collect 400 beeswax.',stat:'made_beeswax',target:400,reward:28000},
 {title:'Fleece for the whole valley',description:'Collect 600 wool.',stat:'made_wool',target:600,reward:30000},
 {title:'Skeins and skeins',description:'Spin 100 yarn.',stat:'made_yarn',target:100,reward:14000},
 {title:'The spinning wheel never stops',description:'Spin 400 yarn.',stat:'made_yarn',target:400,reward:36000},
 {title:'Bolts of cloth',description:'Weave 100 cloth.',stat:'made_cloth',target:100,reward:55000},
 {title:'Barrels in the cellar',description:'Press 100 cider.',stat:'made_cider',target:100,reward:45000},
 {title:'Milk for the whole village',description:'Collect 800 goat milk.',stat:'made_goatmilk',target:800,reward:40000},
 {title:'A cave full of cheese',description:'Make 100 goat cheese.',stat:'made_goatcheese',target:100,reward:55000},
 {title:'Lights all over the valley',description:'Pour 200 beeswax candles.',stat:'made_candles',target:200,reward:55000},
 {title:'Blankets for every bed',description:'Make 60 wool blankets.',stat:'made_blanket',target:60,reward:80000},
 {title:'A blanket for every home',description:'Make 150 wool blankets.',stat:'made_blanket',target:150,reward:150000},
 {title:'Cherries by the cartload',description:'Harvest 500 cherries.',stat:'harvest_cherries',target:500,reward:60000},
 {title:'The cherry capital',description:'Harvest 1,500 cherries.',stat:'harvest_cherries',target:1500,reward:120000},
 {title:'Jam for the winter',description:'Cook 30 cherry jam.',stat:'made_cherryjam',target:30,reward:34000},
 {title:'The jam makers of the valley',description:'Cook 100 cherry jam.',stat:'made_cherryjam',target:100,reward:70000},
 {title:'Pies for the whole fair',description:'Bake 100 cherry pies.',stat:'made_cherrypie',target:100,reward:75000},
 {title:'The valley’s favourite stall',description:'Sell 250 baskets at the Valley Market.',stat:'valley_baskets',target:250,reward:120000,minLevel:62},
 {title:'Good business at the market',description:'Earn 250,000 coins at the Valley Market.',stat:'valley_coins',target:250000,reward:20000,minLevel:62},
 {title:'A fortune at the Valley Market',description:'Earn 1,000,000 coins at the Valley Market.',stat:'valley_coins',target:1000000,reward:60000,minLevel:62},
 {title:'A shelf full of rosettes',description:'Grow 100 prize produce.',stat:'made_prizeproduce',target:100,reward:150000,minLevel:80},
 {title:'A thousand crates',description:'Load 1,000 goods onto export trailers.',stat:'depot_loaded',target:1000,reward:40000,minLevel:85},
 {title:'Loading bay legend',description:'Load 5,000 goods onto export trailers.',stat:'depot_loaded',target:5000,reward:120000,minLevel:85},
 {title:'A million from exports',description:'Earn 1,000,000 coins from export trailers.',stat:'depot_coins',target:1000000,reward:100000,minLevel:85},
 {title:'The valley’s export house',description:'Send 100 full trailers from the Trade Depot.',stat:'depot_shipments',target:100,reward:300000,minLevel:85},
 {title:'A regular at the fair',description:'Win 10 ribbons at the Grand Valley Fair.',stat:'fair_entries',target:10,reward:60000,minLevel:90},
 {title:'Fifty ribbons',description:'Win 50 ribbons at the Grand Valley Fair.',stat:'fair_entries',target:50,reward:150000,minLevel:90},
 {title:'Champion five times over',description:'Be grand champion of the fair in 5 weeks.',stat:'fair_champion',target:5,reward:180000,minLevel:90},
 {title:'Star of the valley',description:'Collect 250 fair stars.',stat:'fair_stars',target:250,reward:300000,minLevel:90},
 {title:'Eight chapters of the estate',description:'Finish 8 estate projects.',stat:'projects',target:8,reward:40000,minLevel:55},
 {title:'The whole estate story',description:'Finish all 10 estate chapters.',stat:'projects',target:10,reward:100000,minLevel:85},
 {title:'Room to grow',description:'Buy 16 more fields.',stat:'expansions',target:16,reward:20000},
 {title:'Forty fields',description:'Grow your farm to all 40 fields.',stat:'expansions',target:28,reward:150000,minLevel:90},
 {title:'Master of every crop',description:'Earn all 64 crop mastery medals.',stat:'mastery_medals',target:64,reward:150000,minLevel:66},
 {title:'A hundred upgrades',description:'Upgrade your buildings 100 times.',stat:'upgrades',target:100,reward:25000},
 {title:'Every building at its best',description:'Upgrade all 17 production buildings to level 10.',stat:'upgrades',target:153,reward:90000},
 // 50 more (26 Sep 2026), 250 -> 300: the crops and goods that had one quest, the middle of the game (Pig Farm to Craft Workshop),
 // spending coins and diamonds, and the gaps between existing goals. Always appended: a quest's place in this list is its id.
 // Rewards follow the existing quests (between two of the same goal, or 15% of the market value of what is asked).
 {title:'A mountain of lettuce',description:'Harvest 1,000 lettuce.',stat:'harvest_lettuce',target:1000,reward:3000,minLevel:3},
 {title:'Barley by the cartload',description:'Harvest 250 barley.',stat:'harvest_barley',target:250,reward:3200,minLevel:5},
 {title:'Bean counter',description:'Harvest 150 green beans.',stat:'harvest_greenbeans',target:150,reward:2000,minLevel:7},
 {title:'Cabbage king',description:'Harvest 200 cabbages.',stat:'harvest_cabbage',target:200,reward:3300,minLevel:9},
 {title:'A thousand heads',description:'Harvest 1,000 cabbages.',stat:'harvest_cabbage',target:1000,reward:17000,minLevel:9},
 {title:'Snow-white harvest',description:'Harvest 150 cauliflowers.',stat:'harvest_cauliflower',target:150,reward:3900,minLevel:11},
 {title:'Deep purple',description:'Harvest 100 red cabbages.',stat:'harvest_redcabbage',target:100,reward:5100,minLevel:15},
 {title:'Facing the sun',description:'Harvest 100 sunflowers.',stat:'harvest_sunflower',target:100,reward:3100,minLevel:17},
 {title:'An apple a day',description:'Harvest 150 apples.',stat:'harvest_apples',target:150,reward:2300,minLevel:20},
 {title:'Berry picker',description:'Harvest 150 berries.',stat:'harvest_berries',target:150,reward:2900,minLevel:23},
 {title:'Sea of gold',description:'Harvest 5,000 wheat.',stat:'harvest_wheat',target:5000,reward:6000},
 {title:'Beanstalk',description:'Harvest 1,000 pole beans.',stat:'harvest_polebeans',target:1000,reward:24000,minLevel:31},
 {title:'The miller’s pride',description:'Make 500 flour at the Windmill.',stat:'made_flour',target:500,reward:4500,minLevel:6},
 {title:'Daily bread',description:'Bake 200 fresh bread.',stat:'made_bread',target:200,reward:10000,minLevel:8},
 {title:'Cheese cellar',description:'Make 100 farmhouse cheese.',stat:'made_cheese',target:100,reward:3500,minLevel:9},
 {title:'Salad bar',description:'Pack 60 fresh salads.',stat:'made_salad',target:60,reward:4100,minLevel:11},
 {title:'Veggie boxes',description:'Pack 40 vegetable boxes.',stat:'made_vegetables',target:40,reward:10000,minLevel:11},
 {title:'Hearty stew',description:'Cook 40 pots of stew.',stat:'made_stew',target:40,reward:6600,minLevel:12},
 {title:'Pie season',description:'Bake 60 pumpkin pies.',stat:'made_pie',target:60,reward:11000,minLevel:13},
 {title:'Pressed apples',description:'Press 40 apple juices.',stat:'made_applejuice',target:40,reward:3900,minLevel:21},
 {title:'Jars on the shelf',description:'Make 40 berry preserves.',stat:'made_berrypreserves',target:40,reward:4800,minLevel:24},
 {title:'Truffle hunters',description:'Let the pigs find 60 truffles.',stat:'made_truffles',target:60,reward:2100,minLevel:29},
 {title:'Fancy breakfast',description:'Cook 20 truffle omelettes.',stat:'made_truffleomelette',target:20,reward:2600,minLevel:30},
 {title:'Sweet tooth',description:'Bake 25 berry cheesecakes.',stat:'made_berrycheesecake',target:25,reward:8400,minLevel:33},
 {title:'Busy bees',description:'Collect 100 honey from the Bee Yard.',stat:'made_honey',target:100,reward:530,minLevel:34},
 {title:'Gift baskets',description:'Pack 25 harvest hampers.',stat:'made_harvesthamper',target:25,reward:22000,minLevel:35},
 {title:'Market legend',description:'Sell 50,000 crops and goods.',stat:'sold',target:50000,reward:120000},
 {title:'The egg seller',description:'Sell 500 eggs at the market.',stat:'sold_eggs',target:500,reward:3800},
 {title:'Cheese stall',description:'Sell 100 farmhouse cheese at the market.',stat:'sold_cheese',target:100,reward:3500,minLevel:9},
 {title:'Money well spent',description:'Spend 10,000 coins on your farm.',stat:'coins_spent',target:10000,reward:1500,minLevel:10},
 {title:'Investor',description:'Spend 100,000 coins on your farm.',stat:'coins_spent',target:100000,reward:12000,minLevel:25},
 {title:'Tycoon',description:'Spend 1,000,000 coins on your farm.',stat:'coins_spent',target:1000000,reward:90000,minLevel:50},
 {title:'A little sparkle',description:'Spend 100 diamonds.',stat:'diamonds_spent',target:100,reward:1500,minLevel:14},
 {title:'Diamond hands',description:'Spend 500 diamonds.',stat:'diamonds_spent',target:500,reward:8000,minLevel:30},
 {title:'Piggy business',description:'Build the Pig Farm.',stat:'built_pigfarm',target:1,reward:3000,minLevel:29},
 {title:'Industrial farmer',description:'Build the Factory.',stat:'built_factory',target:1,reward:20000,minLevel:50},
 {title:'Round and round',description:'Finish 100 batches at the Windmill.',stat:'windmill_batches',target:100,reward:2000,minLevel:6},
 {title:'Rich soil',description:'Fertilize 50 fields.',stat:'fertilized',target:50,reward:1500,minLevel:9},
 {title:'Master gardener',description:'Fertilize 250 fields.',stat:'fertilized',target:250,reward:6000,minLevel:9},
 {title:'Handyman',description:'Upgrade your buildings 25 times.',stat:'upgrades',target:25,reward:2500},
 {title:'Master builder',description:'Upgrade your buildings 50 times.',stat:'upgrades',target:50,reward:8000},
 {title:'Full research',description:'Finish all five silo research steps.',stat:'silo_upgrades',target:5,reward:15000,minLevel:26},
 {title:'Twenty-five chores',description:'Finish 25 farm chores.',stat:'chores',target:25,reward:200,minLevel:10},
 {title:'Always helping',description:'Lend a helping hand 50 times.',stat:'activities',target:50,reward:1200,minLevel:8},
 {title:'On the road',description:'Deliver 25 orders.',stat:'deliveries',target:25,reward:1300,minLevel:5},
 {title:'Medal collector',description:'Earn 18 crop mastery medals.',stat:'mastery_medals',target:18,reward:5500,minLevel:7},
 {title:'Decorated farmer',description:'Earn 27 crop mastery medals.',stat:'mastery_medals',target:27,reward:12000,minLevel:7},
 {title:'Every seed in the shop',description:'Harvest every one of the 16 crops at least once.',stat:'varieties',target:16,reward:40000,minLevel:66},
 {title:'Boost lover',description:'Use 25 boosts.',stat:'boosts_used',target:25,reward:5200,minLevel:14},
 {title:'Stall keeper',description:'Earn 100,000 coins at your farm stall.',stat:'passive_earned',target:100000,reward:15000,minLevel:19}
]);
export const STARTER_QUESTS=Object.freeze({first:130,count:20});
export const MAX_PLOTS=40;
// XP curves. Curve 1 is the original one (60 XP for level 2, then 40 more than the step before). Curves 2 and 3 make the first ten levels
// cheaper, so the first harvest already reaches level 2 (15 XP: a harvest is worth 5 XP and the first guide step 15 more); from level 10 on
// every step is exactly curve 1's step, just lower in total by what the first ten levels save. Curve 3 (the current one) asks 1,315 XP for
// level 10, curve 1 asked 1,980 and curve 2 (live for a day) 850, which flew an active beginner through the first ten levels in an hour.
// A farm carries the curve it was counted with (state.xpCurve, none = curve 1) and is converted once by migrateXpCurve, with its level and
// its progress inside that level kept; until then levelOf reads it with its own curve, so a new client is fine on a farm the server has not
// converted yet. An old client cannot read a converted farm: deploy the client first, the server after.
export const XP_CURVE=3;
const oldXpForLevel=level=>{const n=level-1;return 60*n+20*n*(n-1);};
const EARLY_GAPS=Object.freeze({   // XP from level 1 to 2, 2 to 3 ... 9 to 10 (curve 1: 60, 100, 140 ... 380)
 2:Object.freeze([15,30,40,60,80,105,135,170,215]),
 3:Object.freeze([15,40,65,95,130,170,215,265,320])
});
const curveOf=state=>Object.hasOwn(EARLY_GAPS,state.xpCurve)?Number(state.xpCurve):1;
const sum=list=>list.reduce((total,n)=>total+n,0);
function totalForLevel(level,curve){
 if(level<=1)return 0;
 const gaps=EARLY_GAPS[curve];if(!gaps)return oldXpForLevel(level);
 if(level<=gaps.length+1)return sum(gaps.slice(0,level-1));
 return oldXpForLevel(level)-(oldXpForLevel(gaps.length+1)-sum(gaps));
}
export const xpForLevel=level=>totalForLevel(level,XP_CURVE);
function levelFromTotal(total,curve){
 const gaps=EARLY_GAPS[curve];
 if(!gaps)return 1+Math.floor((Math.sqrt(1600+80*total)-40)/40);
 const early=sum(gaps);
 if(total<early){let level=1,spent=0;for(const gap of gaps){if(total<spent+gap)break;spent+=gap;level++;}return level;}
 return 1+Math.floor((Math.sqrt(1600+80*(total+oldXpForLevel(gaps.length+1)-early))-40)/40);
}
export function levelOf(state){return levelFromTotal(state.xp+(state.xpOffset??0),curveOf(state));}
export function levelProgress(state){
 const level=levelOf(state),curve=curveOf(state),from=totalForLevel(level,curve),to=totalForLevel(level+1,curve);
 return {level,current:state.xp+(state.xpOffset??0)-from,target:to-from};
}
// One-off conversion of a farm to the current curve: the same level, and the same share of the way to the next one.
function migrateXpCurve(state){
 if(state.xpCurve===XP_CURVE)return;
 const from=curveOf(state),total=Math.max(0,Number.isFinite(state.xp)?state.xp:0)+(Number.isFinite(state.xpOffset)?state.xpOffset:0),level=levelFromTotal(total,from);
 const start=totalForLevel(level,from),share=(total-start)/(totalForLevel(level+1,from)-start),next=xpForLevel(level),after=xpForLevel(level+1);
 state.xp=Math.min(after-1,Math.round(next+share*(after-next)));state.xpOffset=0;state.xpCurve=XP_CURVE;   // rounding never lifts a farmer into the next level
}
// Levels 1-10 are bought with coins or diamonds, one slot and a bit more speed per level. Levels 11-20 are estate upgrades for the
// long game (forty fields need far more processing): a higher farm level and finished goods on top of the price, which is coins
// or diamonds (and the 50% voucher) exactly as below level 10.
export const BASE_BUILDING_LEVEL=10;
// Level 10 is a fully upgraded building (26 Sep 2026; was 20): with every building at 10 a farm has more production slots than its
// fields can fill, the Factory's batches are full size there, and levels 11-20 (17 million coins a building) were out of reach. No
// building in the game was above level 7. ESTATE_UPGRADES below is kept only for the price ladder's top (its first step).
export const MAX_BUILDING_LEVEL=10;
// The Factory is one shared workshop for every good: a slot every two levels, up to five (reached at level 9), and half the
// speed bonus. Its batches are as big as the source building allows (factoryBatchCount, at most ×20), so a full Factory adds
// about one to two buildings of the farm's own level, and at the top a specialised building always makes the same good faster.
export const FACTORY_MAX_SLOTS=5;
export function productionSlots(level,building){const n=Math.max(1,Math.min(MAX_BUILDING_LEVEL,Math.floor(level)));return building==='factory'?Math.min(FACTORY_MAX_SLOTS,Math.ceil(n/2)):n;}
// Keep the primary job for older clients; extra jobs run in parallel, not a queue.
export function productionJobs(building){return [building?.job,...(building?.extraJobs??[])].filter(Boolean);}
export function recipeValue(id,now,state){const r=state?recipeFor(state,id):RECIPES[id],value=items=>now===undefined?Object.entries(items).reduce((sum,[key,n])=>sum+reducedMarketPrice(ITEMS[key].sell)*n,0):marketValue(items,now);const input=value(r.input)+(r.coins??0),output=value(r.output);return {input,output,added:output-input};}
export function productionSpeed(level,building){const speed=level<=3?.2*(level-1):level<=BASE_BUILDING_LEVEL?.4+.04*(level-3):Math.min(.8,.68+.012*(level-BASE_BUILDING_LEVEL));return building==='factory'?speed/2:speed;}
// The beginner boost: when a farm is created, new crops and new batches take 80% less time (corn 15 min -> 3 min). It gets smaller
// quickly at first and then slowly (the square of the time left), and is gone after the first day (ROOKIE_BOOST_MS): about 45% after
// 6 hours, 20% after 12 and 5% after 18, so the first session feels fast and a return later that day still gets a little help.
// Separately, for the first 30 minutes (ROOKIE_MS, until state.rookieUntil) the starter corn and animal feed stay in the barn so nothing
// is sold by accident. Both are plain clock time from creation; the boost counts from the same start (rookieUntil - ROOKIE_MS), so
// farms made before the boost lasted a day get the whole day too. Crops and batches that are already running keep their times.
// Only farms created in the guided flow have it: farms from before this simply have no rookieUntil.
export const ROOKIE_MS=30*60000;
export const ROOKIE_TIMER_BOOST=.8;
export const ROOKIE_BOOST_MS=24*60*60000;
export const rookieLeft=(state,now=Date.now())=>guidedFarm(state)&&Number.isSafeInteger(state.rookieUntil)?Math.max(0,state.rookieUntil-now):0;
export const rookieBoostLeft=(state,now=Date.now())=>guidedFarm(state)&&Number.isSafeInteger(state.rookieUntil)&&state.rookieUntil>0?Math.max(0,state.rookieUntil-ROOKIE_MS+ROOKIE_BOOST_MS-now):0;
export const rookieBoost=(state,now=Date.now())=>ROOKIE_TIMER_BOOST*Math.min(1,rookieBoostLeft(state,now)/ROOKIE_BOOST_MS)**2;
export function recipeDuration(state,id,now=Date.now()){return Math.round(RECIPES[id].duration*(1-productionSpeed(state.buildings[RECIPES[id].building].level,RECIPES[id].building))*(vipActive(state,now)?.9:1)*(1-rookieBoost(state,now))*(ranchFocus(state)===RECIPES[id].building?1-ranchSpeedup(state):1)*(RECIPES[id].building==='glasshouse'&&hasImprovement(state,'heating')?.75:1));}
export function siloBonus(level){return {seeds:Math.min(level,3)*.05+Math.max(0,level-3)*.05,growth:Math.min(level,3)*.1+Math.max(0,level-3)*.05};}
// Version 2 introduces one small step at a time. Old unlocks are saved once,
// independently of inventory bundles, so purchases never bypass progression.
export const CROP_LEVELS=Object.freeze({corn:1,wheat:1,lettuce:3,barley:5,greenbeans:7,cabbage:9,cauliflower:11,pumpkin:13,redcabbage:15,sunflower:17,apples:20,berries:23,squash:28,polebeans:31,ciderapples:46,cherries:66});
export const BUILDING_LEVELS=Object.freeze({familyhall:FAMILY_MIN_LEVEL,farmhouse:1,coop:1,mill:2,dairy:4,windmill:6,bakery:8,packing:11,kitchen:12,juicepress:21,preserves:24,pigfarm:29,beeyard:34,sheepbarn:37,glasshouse:40,weaving:43,goatshed:54,craftshop:58,factory:FACTORY_LEVEL});
export const BUILDING_COSTS=Object.freeze({mill:100,dairy:300,windmill:700,bakery:1000,packing:1400,kitchen:3500,juicepress:6500,preserves:10000,pigfarm:14000,beeyard:18000,sheepbarn:26000,glasshouse:40000,weaving:55000,goatshed:72000,craftshop:90000,factory:FACTORY_COST});
export const RECIPE_LEVELS=Object.freeze({trufflehunt:29,truffleomelette:30,vegetablefeast:36,eggs:1,feed:2,milk:4,barleyfeed:5,grainmeal:6,flour:6,windfeed:7,bread:8,cheese:9,fertilizer:9,salad:10,vegetables:11,windflour:14,stew:12,pie:13,pickles:15,beangratin:16,oil:17,orchardsalad:20,applejuice:21,applepie:22,orchardjuice:23,berrysmoothie:23,berrycheesecake:33,applecompote:24,berrypreserves:24,applevinegar:24,pickledbeans:25,berrytart:38,harvesthamper:35,squashsoup:32,hives:34,wool:37,grazewool:39,glasscauliflower:40,glasspumpkin:41,glassredcabbage:42,yarn:43,glasssquash:44,cloth:45,cider:47,glasssunflower:48,goatmilk:54,goatcheese:55,goatbrowse:56,candles:58,blanket:60,cherryjam:67,cherrypie:68,prizeproduce:80});
export const FEATURE_LEVELS=Object.freeze({challenges:3,cart:5,activities:8,chores:10,mastery:7,family:FAMILY_MIN_LEVEL,stall:19,tractor:18,boosts:14,silo:26,projects:27,valleymarket:62,ranch:70,estateworkshop:75,tradedepot:85,grandfair:90});
export const DELIVERY_LEVELS=Object.freeze({quick:5,village:8,commission:16});
export const FEATURE_NAMES={challenges:'Daily challenges',family:'Farm Family',chores:'Farm chores',stall:'Farm stall',mastery:'Crop mastery',tractor:'Tractor',silo:'Silo research',cart:'Delivery orders',projects:'Estate projects',boosts:'Diamond boosts',activities:'A helping hand',valleymarket:'Valley Market',ranch:'The Ranch',estateworkshop:'Estate Workshop',tradedepot:'Trade Depot',grandfair:'Grand Valley Fair'};
export function guidedFarm(state){return state.progression?.mode==='guided';}
const kept=(state,kind,key)=>state.progression?.kept?.[kind]?.includes(key)===true;
export function buildingCost(state,key){return guidedFarm(state)?BUILDING_COSTS[key]??0:BUILDINGS[key]?.buildCost??0;}
export function constructionNeeds(state,key){return guidedFarm(state)?({dairy:['mill'],bakery:['dairy','windmill']}[key]??[]).filter(k=>!buildingUnlocked(state,k)):[];}
export function cropUnlockHint(state,crop){return `Reach level ${guidedFarm(state)?CROP_LEVELS[crop]:CROPS[crop].minLevel??1}.`;}
export function buildingUnlockHint(state,key){return `Reach level ${guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1}.`;}
export function cropUnlocked(state,crop){return Object.hasOwn(CROPS,crop)&&(kept(state,'crops',crop)||levelOf(state)>=(guidedFarm(state)?CROP_LEVELS[crop]:CROPS[crop].minLevel??1));}
export function buildingEligible(state,key){return Object.hasOwn(BUILDINGS,key)&&(kept(state,'buildings',key)||levelOf(state)>=(guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1));}
export function buildingUnlocked(state,key){return buildingEligible(state,key)&&(!buildingCost(state,key)||state.buildings[key]?.built===true);}
// The Valley Market, the Ranch and the wave-3 places (Estate Workshop, Trade Depot, Grand Valley Fair) are new for every farm,
// old or new: they open at their level, never earlier.
const LATE_FEATURES=Object.freeze(['valleymarket','ranch','estateworkshop','tradedepot','grandfair']);
export function featureUnlocked(state,key){if(key==='family')return familyUnlocked(state);if(LATE_FEATURES.includes(key))return levelOf(state)>=FEATURE_LEVELS[key];return !guidedFarm(state)||kept(state,'features',key)||levelOf(state)>=(FEATURE_LEVELS[key]??1);}
export function featureUnlockHint(key){return `Reach level ${FEATURE_LEVELS[key]} to unlock ${FEATURE_NAMES[key]}.`;}
export function recipeLevel(state,id){const factory=RECIPES[id]?.building==='factory';if(factory)return Math.max(FACTORY_LEVEL,RECIPES[id].base?recipeLevel(state,RECIPES[id].base):1);return guidedFarm(state)&&!kept(state,'recipes',id)&&!kept(state,'buildings',RECIPES[id].building)?RECIPE_LEVELS[id]??1:RECIPES[id].minLevel??1;}
export function deliveryTierUnlocked(state,tier){return !guidedFarm(state)||kept(state,'orderTiers',tier)||levelOf(state)>=DELIVERY_LEVELS[tier];}
const FEATURE_ART={challenges:'quests',family:'familyhall',mastery:'trophy',projects:'estate',boosts:'boost',activities:'helping-hand',valleymarket:'valley-market',ranch:'ranch',estateworkshop:'estate-workshop',tradedepot:'trade-depot',grandfair:'grand-fair'};
export function unlockEntries(state){return [
 ...Object.entries(CROPS).map(([key,c])=>({id:'crop:'+key,name:c.name,art:key,kind:'Crop',level:guidedFarm(state)?CROP_LEVELS[key]:c.minLevel??1,unlocked:cropUnlocked(state,key),hint:cropUnlockHint(state,key)})),
 ...Object.entries(BUILDINGS).filter(([key])=>key!=='familyhall').map(([key,b])=>({id:'building:'+key,name:b.name,art:key,kind:buildingCost(state,key)?'Ready to build':'Building',level:guidedFarm(state)?BUILDING_LEVELS[key]:b.minLevel??1,unlocked:buildingEligible(state,key),hint:buildingUnlockHint(state,key)})),
 ...Object.entries(FEATURE_NAMES).map(([key,name])=>({id:'feature:'+key,name,art:FEATURE_ART[key]??key,kind:'Activity',level:FEATURE_LEVELS[key],unlocked:featureUnlocked(state,key),hint:featureUnlockHint(key)})),
 ...Object.entries(RECIPES).filter(([,r])=>r.building!=='factory'&&buildingUnlocked(state,r.building)).map(([key,r])=>({id:'recipe:'+key,name:r.name,art:Object.keys(r.output)[0],kind:'Recipe',level:recipeLevel(state,key),unlocked:recipeUnlocked(state,key),hint:recipeUnlockHint(state,key)})),
 // Fields 9-12 only for farms that started with 8 (a farm that has more than 8 but fewer than 12 fields, or 8).
 ...(state.plots.length<12||state.progression?.fields===STARTER_FIELDS?EARLY_FIELDS.map((field,i)=>({id:'field:'+(i+9),name:`Field ${i+9}`,art:'estate',kind:'Ready to expand',level:field.level,unlocked:levelOf(state)>=field.level||state.plots.length>=i+9,hint:`Level ${field.level} · Expand at the Farmhouse for ${field.coins} coins.`})):[]),
 ...ENDGAME_FIELDS.map((field,i)=>({id:'field:'+(i+29),name:`Field ${i+29} expansion`,art:'estate',kind:'Ready to expand',level:field.level,unlocked:levelOf(state)>=field.level||state.plots.length>=i+29,hint:`Level ${field.level} · Expand at the Farmhouse with coins and supplies.`}))
 ];}
// Two features were moved later on purpose: A helping hand (level 6 -> 8) and farm chores (level 4 -> 10). Moving a feature later would take it
// from farms that already have it, so a guided farm from before (progression version below 4) keeps what it had: chores from level 4, hands-on
// jobs from level 6, or as soon as it has done one. It runs once per farm and keeps any other kept rights. New farms are created at version 4.
const KEPT_FROM_LEVEL=Object.freeze({chores:4,activities:6});
function migrateFeatureLevels(state){
 if(!guidedFarm(state)||(state.progression.version??0)>=4)return;
 const level=levelOf(state),rights=Object.entries(KEPT_FROM_LEVEL).filter(([key,from])=>level>=from||(state.stats?.[key]??0)>0).map(([key])=>key);
 if(rights.length){const kept=state.progression.kept??={};kept.features=[...new Set([...(kept.features??[]),...rights])];}
 state.progression.version=4;
}
// Version 5 (25 Sep 2026): unlocks between levels 10 and 38 were spread out, so the first day is less crowded and every level up to 48
// brings something new: the Packing shed 10 -> 11, the Farm stall 11 -> 19, the Tractor 12 -> 18, commission orders 12 -> 16, Silo
// research 18 -> 26, Estate projects 19 -> 27, and five recipes. A guided farm that already had one under the old levels keeps it.
const SPREAD_FROM=Object.freeze({buildings:{packing:10},features:{stall:11,tractor:12,silo:18,projects:19},orderTiers:{commission:12},
 recipes:{windflour:11,berrycheesecake:23,harvesthamper:25,berrytart:25,vegetablefeast:31}});
function migrateUnlockSpread(state){
 if(!guidedFarm(state)||(state.progression.version??0)>=5)return;
 const level=levelOf(state),rights=state.progression.kept??={};
 for(const [kind,levels] of Object.entries(SPREAD_FROM)){
  const had=Object.entries(levels).filter(([,from])=>level>=from).map(([key])=>key);
  if(had.length)rights[kind]=[...new Set([...(rights[kind]??[]),...had])];
 }
 state.progression.version=5;
}
function migrateProgression(state){
 if(!guidedFarm(state)||state.progression.version>=2)return;
 const crops={corn:1,wheat:1,lettuce:2,barley:4,cabbage:5,cauliflower:6,greenbeans:6,pumpkin:7,apples:8,redcabbage:9,sunflower:10,berries:10};
 const buildings={familyhall:10,farmhouse:1,coop:1,mill:2,dairy:3,windmill:4,bakery:5,packing:5,kitchen:6,juicepress:8,preserves:10,factory:FACTORY_LEVEL};
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
// Older (legacy) farms are checked the same way, with their own unlock levels: an order, a Valley Market basket, an export
// trailer or a fair class may only ask for what the farm can make now (a good needs its building built, e.g. candles the
// Craft Workshop). Until 24 Sep 2026 legacy farms skipped this and could be asked for goods they could not make yet.
export function itemAvailable(state,item,seen=new Set()){
 if(seen.has(item))return false;
 if(CROPS[item])return cropUnlocked(state,item);
 if(['honey','feed','fertilizer'].includes(item)&&featureUnlocked(state,'activities'))return true;
 if(item==='eggs'&&state.inventory.feed>0)return true;
 const path=new Set([...seen,item]);
 // The Factory only makes in bulk what a farm's own building already makes, so it is never a source by itself (candles need
 // the Craft Workshop, even with a Factory).
 return Object.entries(RECIPES).some(([id,r])=>r.output[item]&&r.building!=='factory'&&buildingUnlocked(state,r.building)&&levelOf(state)>=recipeLevel(state,id)&&(r.requiresBuildings??[]).every(k=>buildingUnlocked(state,k))&&Object.keys(r.input).every(k=>itemAvailable(state,k,path)));
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
// Removes whatever grows on a field (a crop, a tree, a bush or a climbing plant), ripe or not, and gives nothing back: no harvest,
// no XP, no seed coins (25 Sep 2026: any crop, not only the ones that regrow). expectedPlantedAt makes sure it is still the planting
// the farmer saw.
export function clearPlanting(state,id,expectedPlantedAt){
 const p=state.plots[id];
 if(!Number.isInteger(id)||!p||!CROPS[p.crop])throw new Error('Choose a field with something growing on it.');
 if(p.plantedAt!==expectedPlantedAt)throw new Error('This planting has changed. Review it before removing.');
 const crop=p.crop;Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0});
 return {id,crop};
}
// The care marker shows up after 30 seconds or 30% of the growing time. The beginner boost shortens both: the growing time is
// already shorter, and the 30-second minimum shrinks with it (6 seconds), so Care fits inside a 24-second wheat field.
const careDelay=(state,duration,now)=>Math.max(30000*(1-rookieBoost(state,now)),duration*.3);
export function cropDuration(state,crop,regrowing=false,now=Date.now()){return Math.round((regrowing?(CROPS[crop].regrow??CROPS[crop].duration):CROPS[crop].duration)*(1-siloBonus(state.siloLevel??0).growth)*(vipActive(state,now)?.9:1)*(1-rookieBoost(state,now))*(regrowing&&hasImprovement(state,'ladders')?.8:1));}
// What a tap on a field does: plant an empty one, harvest a ripe one, and give a growing crop what it can use now, extra care
// first once it is ready (it has its own moment), then water. A tool the farmer picked on purpose (Water or Care) goes
// first when it fits this field. null: nothing to do yet (the crop is watered and cared for, or care is not ready).
// Water belongs to planting: a crop takes water until its extra care opens (30% of the growing time) and at least in its first
// minute (so new farmers, whose crops grow in seconds, can still follow the guide). Care comes after that, until harvest.
export const WATER_MIN_MS=60000;
export function waterUntil(plot){return Math.max(plot.careAt??plot.plantedAt??0,(plot.plantedAt??0)+WATER_MIN_MS);}
export function canWater(plot,now=Date.now()){return !!plot.crop&&!plot.watered&&now<plot.readyAt&&now<waterUntil(plot);}
export function fieldTapAction(plot,now=Date.now(),tool='plant'){
 if(!plot.crop)return 'plant';
 if(now>=plot.readyAt)return 'harvest';
 const canTend=!plot.tended&&now>=(plot.careAt??plot.plantedAt),watering=canWater(plot,now);
 if(tool==='water'&&watering)return 'water';
 if(tool==='tend'&&canTend)return 'tend';
 return canTend?'tend':watering?'water':null;
}
export function harvestYield(plot){return 1+(plot.watered?1:0)+(plot.tended?1:0);}
// What a harvest gives right now: Double harvest doubles every harvest while it runs (also a crop that ripened before it started).
export function harvestBoostActive(state,now=Date.now()){return state.boosts?.harvestUntil>now;}
export function harvestQuantity(state,plot,now=Date.now()){return harvestYield(plot)*(harvestBoostActive(state,now)?2:1);}
export function formatDuration(ms){const s=Math.max(0,Math.ceil(ms/1000));if(s<60)return `${s}s`;const m=Math.ceil(s/60);if(m<60)return `${m}m`;const h=Math.floor(m/60);if(h<24)return `${h}h${m%60?` ${m%60}m`:''}`;return `${Math.floor(h/24)}d${h%24?` ${h%24}h`:''}`;}
export function cropIcon(key){return CROPS[key].art??`/assets/icons/${CROPS[key].icon??key}.png`;}
// Fields 13-20 keep their prices. Later coin costs rise steadily; estate materials and levels add the challenge.
const LATE_FIELD_COSTS=Object.freeze([45000,65000,90000,120000,155000,190000,225000,260000]);
// Fields 29-40 open during the midgame expansion rather than after it: every four levels from 30 to 50 (while squash, pole beans, the
// Bee Yard, sheep and cider apples arrive and the trees start to claim fields), every five to 70 (cherries at 66), and the last two at
// 80 and 90, where the content ends. Each asks coins and goods, the newest goods of its level among them. On 23 Sep 2026 no farm had
// more than 21 fields, so nobody had met the old schedule (levels 40-95).
export const ENDGAME_FIELDS=Object.freeze([
 {level:30,coins:300000,materials:{bread:100,cheese:80,stew:40}},
 {level:34,coins:350000,materials:{oil:70,vegetables:70,applejuice:50,squashsoup:10}},
 {level:38,coins:410000,materials:{pie:70,berrypreserves:60,beangratin:50,beeswax:40}},
 {level:42,coins:480000,materials:{orchardjuice:90,applecompote:80,orchardsalad:80,wool:60}},
 {level:46,coins:560000,materials:{applepie:90,pickledbeans:60,cheese:140,yarn:40}},
 {level:50,coins:650000,materials:{berrytart:80,applevinegar:100,vegetables:120,cloth:20,cider:10}},
 {level:55,coins:750000,materials:{berrysmoothie:120,beangratin:100,oil:140,cider:40,goatmilk:60}},
 {level:60,coins:860000,materials:{berrycheesecake:100,berrypreserves:120,stew:140,cloth:30,goatcheese:20,candles:20}},
 {level:65,coins:980000,materials:{harvesthamper:50,applepie:120,pickledbeans:100,cider:60,blanket:4}},
 {level:70,coins:1110000,materials:{harvesthamper:65,berrytart:120,orchardjuice:180,cloth:45,candles:50,cherryjam:20}},
 {level:80,coins:1250000,materials:{harvesthamper:80,berrycheesecake:140,beangratin:160,squashsoup:60,cherrypie:30,prizeproduce:6}},
 {level:90,coins:1400000,materials:{harvesthamper:100,berrycheesecake:160,pickledbeans:180,applevinegar:180,cloth:60,cider:90,blanket:10,prizeproduce:15}}
].map(field=>Object.freeze({...field,materials:Object.freeze(field.materials)})));
// New farms start with 8 fields (STARTER_FIELDS) and earn fields 9-12 back in the first half hour: one per level, cheap, no
// supplies. Field 13 on is the same for every farm, and only those count as expansions (quests, Farmhouse level).
export const STARTER_FIELDS=8;
export const EARLY_FIELDS=Object.freeze([{level:2,coins:100},{level:3,coins:150},{level:4,coins:200},{level:5,coins:250}].map(Object.freeze));
const earlyField=state=>EARLY_FIELDS[state.plots.length-STARTER_FIELDS];
export function expansionLevel(state){return earlyField(state)?.level??ENDGAME_FIELDS[state.plots.length-28]?.level??1;}
export function expansionCost(state){const n=state.plots.length;if(earlyField(state))return earlyField(state).coins;return n>=MAX_PLOTS?null:n>=28?ENDGAME_FIELDS[n-28].coins:n<20?Math.ceil(600*1.75**Math.max(0,n-12)/25)*25:LATE_FIELD_COSTS[n-20];}
const FIELD_MATERIALS=[{wheat:12,corn:6},{wheat:20,barley:10},{barley:18,cabbage:10},{corn:24,cauliflower:12,flour:8},{cabbage:24,pumpkin:12,bread:10},{redcabbage:20,sunflower:12,cheese:12},{pumpkin:24,oil:10,vegetables:12},{sunflower:30,pickles:16,pie:16},{lettuce:30,flour:18,milk:12},{cauliflower:32,feed:20,eggs:14},{redcabbage:30,cheese:16,bread:18},{pumpkin:36,oil:18,pie:20},{sunflower:40,cheese:20,pie:22},{cauliflower:44,bread:26,eggs:24},{redcabbage:44,oil:22,vegetables:24},{pumpkin:50,pickles:26,milk:28}];
export function expansionMaterials(state){const n=state.plots.length;return n>=MAX_PLOTS||earlyField(state)?{}:{...(n>=28?ENDGAME_FIELDS[n-28].materials:FIELD_MATERIALS[Math.max(0,n-12)])};}
// Estate upgrades (retired 26 Sep 2026, when level 10 became the top; the first step's 400,000 coins is the upgrade price ladder's top): target level 11-20. Priced per step, the same for every building (the goods are what differs; from level 42 on
// they also ask for the midgame goods: wool, soup, yarn, cloth and cider, from 66 on goat cheese, candles, blankets and cherry pie, and at 85 prize produce), and like the
// last twelve fields they ask for a higher farm level. Ten steps for a farm that can process forty fields of crops.
// The diamond price continues the curve of levels 1-10 (525 diamonds for level 10, about 700 coins to a diamond).
export const ESTATE_UPGRADES=Object.freeze([
 {level:26,coins:400000,diamonds:570,materials:{bread:60,cheese:40}},
 {level:30,coins:520000,diamonds:745,materials:{stew:30,oil:30}},
 {level:34,coins:680000,diamonds:970,materials:{vegetables:40,applejuice:30,pie:25}},
 {level:38,coins:880000,diamonds:1255,materials:{berrypreserves:30,beangratin:25,orchardsalad:25}},
 {level:42,coins:1150000,diamonds:1645,materials:{applepie:30,pickledbeans:20,cheese:80,wool:40}},
 {level:50,coins:1500000,diamonds:2145,materials:{berrytart:30,orchardjuice:50,applecompote:40,squashsoup:12}},
 {level:58,coins:1950000,diamonds:2785,materials:{berrysmoothie:50,berrypreserves:60,pie:50,yarn:40}},
 {level:66,coins:2550000,diamonds:3645,materials:{berrycheesecake:40,applevinegar:60,stew:80,cloth:20,cider:20,goatcheese:15,candles:15}},
 {level:75,coins:3300000,diamonds:4715,materials:{harvesthamper:25,applepie:60,pickledbeans:50,cloth:30,blanket:5}},
 {level:85,coins:4300000,diamonds:6145,materials:{harvesthamper:40,berrycheesecake:60,berrytart:60,pickledbeans:80,cloth:40,cider:50,cherrypie:20,blanket:8,prizeproduce:8}}
].map(step=>Object.freeze({...step,materials:Object.freeze(step.materials)})));
// Upgrading asks for goods the building makes itself (26 Sep 2026): from the upgrade to level 4 on, 2 × the level in batches of its
// first product (a Dairy Barn at level 6 hands in 24 milk to reach level 7). The Factory, which makes everything, asks for a mix of
// flour, cheese and cloth. Up to level 3 it is coins only, so the beginner guide's first upgrade stays one tap. Upgrades are paid with
// coins and goods only (not diamonds, so the game does not feel pay to win); the Buildings discount boost (diamonds) halves both.
export const UPGRADE_GOODS_FROM=3;
let firstProducts=null;
export function upgradeGoods(building,level){
 if(!BUILDINGS[building]||BUILDINGS[building].type!=='production'||level<UPGRADE_GOODS_FROM||level>=MAX_BUILDING_LEVEL)return {};
 if(building==='factory')return {flour:8*level,cheese:2*level,cloth:level};
 firstProducts??=Object.fromEntries(Object.keys(BUILDINGS).map(key=>[key,Object.entries(RECIPES).filter(([,r])=>r.building===key).sort(([a],[b])=>(RECIPE_LEVELS[a]??0)-(RECIPE_LEVELS[b]??0))[0]?.[1]]).filter(([,r])=>r).map(([key,r])=>[key,Object.entries(r.output)[0]]));
 const product=firstProducts[building];return product?{[product[0]]:2*level*product[1]}:{};
}
// What the next upgrade of a building asks besides coins: its goods, halved by the Buildings discount voucher (level is the farm
// level it needs: none any more), or null.
export function upgradeRequirements(state,building){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')return null;
 const voucher=state.boosts?.upgradeCredits>0;
 const materials=Object.fromEntries(Object.entries(upgradeGoods(building,state.buildings[building].level)).map(([item,n])=>[item,voucher?Math.ceil(n/2):n]));
 return Object.keys(materials).length?{level:1,materials}:null;
}
// Upgrade prices below level 10 (26 Sep 2026). Each building follows its own curve (2.7× a level), but:
// - a first upgrade costs at least 5% of what the building cost to build, growing 2.7× a level from there, so the late buildings
//   (a 90,000 coin Craft Workshop) no longer upgrade for 2,300 coins while the Mill's first upgrades cost more than the Mill;
// - no step costs more than the ladder into the estate steps: 1.3× less for every level below 10 -> 11 (400,000), so a price
//   rises every level and never jumps to millions before dropping back to 400,000 at level 10 (the Craft Workshop's 9 -> 10
//   used to cost 7.0 million). The buildings that open first (Coop to Kitchen) keep their early prices; the ladder only trims
//   their last steps before level 10.
// - and the upgrades to level 5-10 cost 1.5× that in coins (26 Sep 2026, when level 10 became the top and the 17 million coins
//   of levels 11-20 were gone). Up to level 4 nothing changed for new farmers.
export const UPGRADE_BUILD_SHARE=.05;
export const UPGRADE_LADDER_STEP=1.3;
export const UPGRADE_LATE_LEVEL=4,UPGRADE_LATE_MULTIPLIER=1.5;
export function upgradeCost(state,building){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')return null;
 const level=state.buildings[building].level;
 const voucher=state.boosts?.upgradeCredits>0?.5:1;
 const factoryPrice=building==='factory'?FACTORY_UPGRADE_MULTIPLIER:1;
 if(level>=BASE_BUILDING_LEVEL){const step=level<MAX_BUILDING_LEVEL?ESTATE_UPGRADES[level-BASE_BUILDING_LEVEL]:null;return step?Math.ceil(step.coins*voucher*factoryPrice):null;}
 const curve=Math.round(BUILDINGS[building].upgradeCost*(level<3?level*1.5:12*2.7**(level-3)));
 const floor=Math.round((BUILDING_COSTS[building]??0)/factoryPrice*UPGRADE_BUILD_SHARE*2.7**(level-1));
 const ceiling=Math.round(ESTATE_UPGRADES[0].coins/UPGRADE_LADDER_STEP**(BASE_BUILDING_LEVEL-level));
 const late=level>=UPGRADE_LATE_LEVEL?UPGRADE_LATE_MULTIPLIER:1;
 return Math.ceil(Math.min(Math.max(curve,floor),ceiling)*late*voucher*factoryPrice);
}
// What a new farm starts with, so the first minutes are not spent waiting: coins for seeds and a second egg slot, corn to sell or to
// mix into feed at the Mill, wheat, ten animal feed for the chickens (ten batches of eggs), and barley for the Mill's feed recipe once
// level 5 opens it (barley itself is not plantable before then, but a beginner already has a first batch waiting).
export const STARTER_COINS=500;
export const STARTER_ITEMS=Object.freeze({wheat:8,corn:8,feed:10,barley:6});   // wheat stays below the 12 that field 13 asks for: that still has to be earned
// The corn, animal feed and barley a new farm starts with are for the first steps (feed and barley feed at the Mill, eggs at the Coop), not
// for the market: a beginner who has not met the market yet sells them by accident and then waits 15 minutes for corn. They cannot be sold
// during the first 30 minutes (the beginner boost window); what is grown or made on top of them can be sold at once, and using them (a batch
// of eggs, a batch of barley feed) shrinks the kept amount with the stock.
export const STARTER_KEEP=Object.freeze({corn:STARTER_ITEMS.corn,feed:STARTER_ITEMS.feed,barley:STARTER_ITEMS.barley});
export const keptStock=(state,key,now=Date.now())=>rookieLeft(state,now)>0?Math.min(state.keep?.[key]??0,state.inventory[key]??0):0;
export const sellableStock=(state,key,now=Date.now())=>Math.max(0,(state.inventory[key]??0)-keptStock(state,key,now));
function createBaseFarm(now=Date.now()) {
 // Three ripe corn for the first basket, three wheat that ripen one by one while you take the first steps (30, 60 and 90
 // seconds), and two empty fields to plant.
 const plots=Array.from({length:STARTER_FIELDS},(_,id)=>({id,crop:null,plantedAt:0,readyAt:0,watered:false}));
 for(const id of [0,1,2])plots[id]={id,crop:'corn',plantedAt:now-CROPS.corn.duration*1.1,readyAt:now-1000,watered:false};
 [30000,60000,90000].forEach((left,i)=>{plots[3+i]={id:3+i,crop:'wheat',plantedAt:now+left-CROPS.wheat.duration,readyAt:now+left,watered:false};});
 return {version:14,progression:{mode:'guided',version:5,fields:STARTER_FIELDS},coins:STARTER_COINS,xp:0,xpCurve:XP_CURVE,keep:{...STARTER_KEEP},rookieUntil:now+ROOKIE_MS,inventory:{...Object.fromEntries(Object.keys(ITEMS).map(k=>[k,0])),...STARTER_ITEMS},stats:{harvested:0,planted:0,watered:0,earned:0,produced:0,upgrades:0,expansions:0,bread:0},claimed:[],plots,buildings:Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,{level:1,job:null}]))};
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
  const duration=cropDuration(state,crop,false,now);Object.assign(p,{crop,harvestCycles:0,plantedAt:now,readyAt:now+duration,careAt:now+careDelay(state,duration,now),watered:false,tended:false,fertilized:false});
  return {action,crop,cost:seedCost(state,crop)};
 }
 if(!p.crop)throw new Error('Plant a crop in this field first.');
 if(action==='water'){
  if(now>=p.readyAt)throw new Error('This crop is ready to harvest!');
  if(p.watered)throw new Error('Already watered. Your crop is growing nicely.');
  if(!canWater(p,now))throw new Error('Water right after planting. This crop is past that; give it extra care instead.');
  p.readyAt=now+(p.readyAt-now)*(hasImprovement(state,'watertower')?.7:.8);p.watered=true;state.stats.watered++;
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
 // The very first harvest on a farm is a golden one: three times the crop, a first "wow" worth a few coins.
 const first=guidedFarm(state)&&state.stats.harvested===0,harvested=p.crop,quantity=harvestQuantity(state,p,now)*(first?FIRST_HARVEST_BONUS:1),xp=CROPS[harvested].xp*(p.watered&&p.tended?2:1);
 state.inventory[harvested]+=quantity;state.stats.harvested++;state.stats['harvest_'+harvested]=(state.stats['harvest_'+harvested]??0)+quantity;
 state.mastery.harvests[harvested]=(state.mastery.harvests[harvested]??0)+1;
 if(!state.discovered.includes(harvested))state.discovered.push(harvested);state.stats.varieties=state.discovered.length;state.xp+=xp;
 const regrowing=!!CROPS[harvested].perennial;
 // One waiting harvest only. A new cycle starts at collection, never at the old deadline.
 if(regrowing){const duration=cropDuration(state,harvested,true,now);Object.assign(p,{plantedAt:now,readyAt:now+duration,careAt:now+careDelay(state,duration,now),watered:false,tended:false,fertilized:false,harvestCycles:(p.harvestCycles??0)+1});}
 else Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0});
 return {action,crop:harvested,quantity,xp,regrowing,...(first?{firstHarvest:FIRST_HARVEST_BONUS}:{})};
}
// A swipe over several fields (game.js): the same hand work on each, in the order they were swiped, in one save. A field where it
// cannot be done right now (not ready yet, already watered, care not open yet, already planted) is skipped. It costs what tapping
// them one by one costs: nothing, or the seeds when planting (planting stops when the coins run out).
export const SWIPE_MAX_FIELDS=60;
export function workFields(state,action,ids,now=Date.now(),crop='corn'){
 if(!['plant','harvest','water','tend'].includes(action))throw new Error('Choose a valid tool.');
 if(!Array.isArray(ids)||!ids.length||ids.length>SWIPE_MAX_FIELDS)throw new Error('Choose some fields.');
 if(action==='plant'){if(!Object.hasOwn(CROPS,crop))throw new Error('Choose a valid crop.');if(!cropUnlocked(state,crop))throw new Error(cropUnlockHint(state,crop));}
 const fields=[],seen=new Set();let short=false;
 for(const id of ids){
  if(!Number.isInteger(id)||id<0||id>=state.plots.length||seen.has(id))continue;seen.add(id);
  if(fieldTapAction(state.plots[id],now,action)!==action)continue;
  if(action==='plant'&&state.coins<seedCost(state,crop)){short=true;break;}
  fields.push({id,...actOnPlot(state,id,action,crop,now)});
 }
 if(!fields.length)throw new Error(action==='harvest'?'No crops are ready to harvest there yet.':action==='plant'?(short?'Not enough coins. Sell some produce at the market.':'These fields are already planted.'):'Nothing to do on these fields right now.');
 return {action,fields,count:fields.length,...(action==='plant'?{crop,cost:fields.reduce((sum,f)=>sum+f.cost,0),short}:{})};
}
export function sellCrops(state,item='all',now=Date.now(),day,category,quantity) {
 if(day!==undefined&&day!==utcDay(now))throw new Error('Market prices have refreshed. Check today’s prices before selling.');
 if(category!==undefined&&!['crops','goods'].includes(category))throw new Error('Choose a market category.');
 if(item!=='all'&&!Object.hasOwn(ITEMS,item))throw new Error('Choose a valid item.');
 const keys=category?Object.keys(category==='crops'?CROPS:PRODUCTS):item==='all'?Object.keys(ITEMS):[item];
 if(quantity!==undefined&&(item==='all'||category!==undefined||!Number.isSafeInteger(quantity)||quantity<1||quantity>state.inventory[item]))throw new Error('Choose a valid quantity within your stock.');
 if(quantity!==undefined&&quantity>sellableStock(state,item,now))throw new Error(`Keep your first ${keptStock(state,item,now)} ${ITEMS[item].name.toLowerCase()} for now: you need them for your first steps. Sell what you grow or make on top of them; the rest is free to sell after your first 30 minutes.`);
 const amounts=Object.fromEntries(keys.map(k=>[k,quantity??sellableStock(state,k,now)]));
 const total=marketSaleValue(state,keys.reduce((v,k)=>v+amounts[k]*marketQuote(k,now).price,0),now);
 if(total===0){const kept=keys.filter(k=>keptStock(state,k,now)>0);throw new Error(kept.length?`Your starting ${kept.map(k=>ITEMS[k].name.toLowerCase()).join(' and ')} ${kept.length>1?'are':'is'} kept for your first steps. Harvest or make more to sell, or wait until your first 30 minutes are up.`:'Your basket is empty. Harvest or produce something first.');}
 const units=keys.reduce((v,k)=>v+amounts[k],0);
 for(const k of keys){state.inventory[k]-=amounts[k];state.stats['sold_'+k]=(state.stats['sold_'+k]??0)+amounts[k];}
 state.coins+=total;state.stats.earned+=total;state.stats.sold+=units;
 return {coins:total,day:utcDay(now)};
}
export function recipeUnlocked(state,id){const r=RECIPES[id];return !!r&&(!r.base||recipeUnlocked(state,r.base))&&buildingUnlocked(state,r.building)&&levelOf(state)>=recipeLevel(state,id)&&(r.requiresBuildings??[]).every(k=>buildingUnlocked(state,k))&&(!guidedFarm(state)||Object.keys(r.input).every(k=>k==='feed'&&state.inventory.feed>0||itemAvailable(state,k)));}
export function recipeUnlockHint(state,id){
 const r=RECIPES[id];if(!buildingEligible(state,r.building))return buildingUnlockHint(state,r.building);
 if(r.base&&buildingUnlocked(state,r.building)&&!recipeUnlocked(state,r.base))return `First unlock ${RECIPES[r.base].name}. ${recipeUnlockHint(state,r.base)}`;
 if(levelOf(state)<recipeLevel(state,id))return `Reach level ${recipeLevel(state,id)}.`;
 if(!buildingUnlocked(state,r.building))return `Open the ${BUILDINGS[r.building].name} in Buildings.`;
 const crops=Object.keys(r.input).filter(k=>CROPS[k]&&!cropUnlocked(state,k));
 if(crops.length)return crops.map(k=>`${CROPS[k].name}: ${cropUnlockHint(state,k)}`).join(' ');
 const missing=(r.requiresBuildings??[]).filter(k=>!buildingUnlocked(state,k));
 if(missing.length)return `Open ${missing.map(k=>BUILDINGS[k].name).join(' and ')} first.`;
 const ingredients=Object.keys(r.input).filter(k=>!itemAvailable(state,k));
 if(ingredients.length){
  const item=ingredients[0],suppliers=Object.entries(RECIPES).filter(([,recipe])=>recipe.output[item]&&recipe.building!=='factory').sort(([a],[b])=>recipeLevel(state,a)-recipeLevel(state,b));
  const supplier=suppliers[0]?.[1];
  if(supplier&&!buildingUnlocked(state,supplier.building))return `Open the ${BUILDINGS[supplier.building].name} to make ${ITEMS[item].name}.`;
  if(item==='honey')return featureUnlockHint('activities');
 }
 return ingredients.length?`Unlock production for ${ingredients.map(k=>ITEMS[k].name).join(', ')} first.`:`Make in the ${BUILDINGS[r.building].name}.`;
}
export function recipeAvailability(state,id){
 if(!Object.hasOwn(RECIPES,id))throw new Error('Choose a valid recipe.');
 const r=recipeFor(state,id);
 const missing=Object.entries(r.input).filter(([k,n])=>state.inventory[k]<n).map(([k,n])=>({item:k,name:ITEMS[k].name,need:n,have:state.inventory[k]}));
 const b=state.buildings[r.building],used=productionJobs(b).length,slots=productionSlots(b.level,r.building),busy=used>=slots;
 const locked=!recipeUnlocked(state,id);
 const price=r.coins??0,poor=price>0&&state.coins<price;
 const maxCount=locked?0:Math.max(0,Math.min(slots-used,...Object.entries(r.input).map(([k,n])=>Math.floor(state.inventory[k]/n)),...(price?[Math.floor(state.coins/price)]:[])));
 return {canStart:!locked&&!busy&&missing.length===0&&!poor,missing,busy,used,slots,maxCount,locked,price,poor};
}
export function startProduction(state,id,now=Date.now(),count=1){
 if(!Number.isInteger(count)||count<1||count>MAX_BUILDING_LEVEL)throw new Error(`Choose 1–${MAX_BUILDING_LEVEL} batches.`);
 const a=recipeAvailability(state,id),r=RECIPES[id];
 if(a.locked)throw new Error(`Unlock this recipe first. ${recipeUnlockHint(state,id)}`);
 if(count>a.slots-a.used)throw new Error('Not enough free production slots. Collect a finished batch first.');
 if(a.price&&state.coins<a.price*count)throw new Error(`You need ${a.price*count} coins for ${count===1?'this batch':`${count} batches`}.`);
 if(count>a.maxCount)throw new Error('Missing ingredients for this many batches.');
 const batches=Array.from({length:count},()=>startSingleProduction(state,id,now));
 return {...batches[0],count,batches};
}
function startSingleProduction(state,id,now=Date.now()){
 if(!Object.hasOwn(RECIPES,id))throw new Error('Choose a valid recipe.');
 const r=recipeFor(state,id),b=state.buildings[r.building],a=recipeAvailability(state,id);
 if(a.busy)throw new Error('All production slots are occupied. Collect a finished batch first.');
 if(a.missing.length)throw new Error('Missing ingredients: '+a.missing.map(m=>`${m.name} (${m.have}/${m.need})`).join(', ')+'.');
 if(a.poor)throw new Error(`You need ${r.coins} coins for this batch.`);
 const duration=recipeDuration(state,id,now);
 state.coins-=a.price;
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
 if(building==='glasshouse')state.stats.glasshouse_batches=(state.stats.glasshouse_batches??0)+1;
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
export function upgradeBuilding(state,building,currency='coins',expectedCost,expectedLevel){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')throw new Error('Choose a production building.');
 if(!buildingUnlocked(state,building))throw new Error('Open this building before upgrading it.');
 if(currency!=='coins')throw new Error('Upgrades are paid with coins and goods.');   // since 26 Sep 2026, not with diamonds
 const b=state.buildings[building],estate=upgradeRequirements(state,building);
 const cost=upgradeCost(state,building);
 if(cost===null)throw new Error('This building is fully upgraded.');
 // A running batch is unaffected either way: its speed and output were fixed when it started, not read live off b.level. Upgrading only
 // changes what a NEW batch gets, so there is nothing to protect by making a farmer wait for every slot to empty first.
 if(estate&&levelOf(state)<estate.level)throw new Error(`Reach level ${estate.level} to upgrade this building to level ${b.level+1}.`);
 if(state[currency]<cost)throw new Error(`You need ${cost} ${currency} for this upgrade.`);
 const missing=estate?Object.entries(estate.materials).filter(([key,n])=>(state.inventory[key]??0)<n):[];
 if(missing.length)throw new Error(`Make the goods first: ${missing.map(([key,n])=>`${n} ${ITEMS[key].name}`).join(', ')}. Or upgrade with diamonds.`);
 state[currency]-=cost;if(estate)for(const [key,n] of Object.entries(estate.materials))state.inventory[key]-=n;
 b.level++;state.stats.upgrades++;state.xp+=15;
 if(state.boosts?.upgradeCredits>0)state.boosts.upgradeCredits--;
 if(building==='windmill')state.stats.windmill_upgrades=(state.stats.windmill_upgrades??0)+1;
 return {building,level:b.level,cost,currency,materials:estate?{...estate.materials}:{}};
}
export function expandFarm(state){
 const cost=expansionCost(state),materials=expansionMaterials(state),early=Boolean(earlyField(state));
 if(cost===null)throw new Error('Your farm is fully expanded.');
 if(levelOf(state)<expansionLevel(state))throw new Error(`Reach level ${expansionLevel(state)} to unlock field ${state.plots.length+1}.`);
 if(state.coins<cost)throw new Error(`You need ${cost} coins for one more field.`);
 const missing=Object.entries(materials).filter(([key,n])=>(state.inventory[key]??0)<n);
 if(missing.length)throw new Error(`Gather the missing supplies: ${missing.map(([key,n])=>`${n} ${ITEMS[key].name}`).join(', ')}.`);
 state.coins-=cost;for(const [key,n] of Object.entries(materials))state.inventory[key]-=n;
 state.plots.push({id:state.plots.length,crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false});
 state.xp+=20;if(!early){state.stats.expansions++;state.buildings.farmhouse.level++;}
 return {fields:state.plots.length,cost,materials};
}
// Every quest pays 15 XP unless it says otherwise; the starter quests pay coins only (xp:0).
export const QUEST_XP=15;
// A quest's XP (26 Sep 2026): 15 for every quest up to 1,000 coins (all the early ones, as before), then growing with the reward,
// 15 × √(coins ÷ 1,000), at most 250 (about a tenth of a level at level 60). Players up to level 28 only claim quests of 1,000 coins or
// less, so nobody levels faster; a 150,000-coin quest no longer pays the same XP as "harvest 3 crops". A quest's own xp (the starter
// quests' 0) still wins.
export function questXp(q){if(q.xp!==undefined)return q.xp;return q.reward<=1000?QUEST_XP:Math.min(250,Math.round(QUEST_XP*Math.sqrt(q.reward/1000)));}
export function claimQuest(state,id){
 if(!Number.isInteger(id)||!QUESTS[id])throw new Error('Choose a valid quest.');
 const q=QUESTS[id];
 if(state.claimed.includes(id))throw new Error('This reward has already been claimed.');
 if((state.stats[q.stat]??0)<q.target)throw new Error('Finish this quest to claim your reward.');
 const xp=questXp(q);
 state.claimed.push(id);state.coins+=q.reward;state.xp+=xp;
 return {coins:q.reward,xp};
}
export function farmSummary(state,now=Date.now()) {
 return {coins:state.coins,diamonds:state.diamonds,boosts:{...state.boosts},xp:state.xp,level:levelOf(state),inventory:{...state.inventory},plots:state.plots.map(p=>({id:p.id,crop:p.crop,watered:p.watered,fertilized:p.fertilized,status:!p.crop?'empty':now>=p.readyAt?'ready':'growing',secondsRemaining:Math.max(0,Math.ceil((p.readyAt-now)/1000))})),buildings:Object.entries(state.buildings).map(([id,b])=>({id,name:BUILDINGS[id].name,level:b.level,slots:BUILDINGS[id].type==='production'?productionSlots(b.level,id):0,jobs:productionJobs(b).map(j=>({id:j.id,recipe:j.recipe,secondsRemaining:Math.max(0,Math.ceil((j.readyAt-now)/1000))})),status:productionJobs(b).some(j=>now>=j.readyAt)?'ready':b.job?(now>=b.job.readyAt?'ready':'working'):'idle',job:b.job?{recipe:b.job.recipe,secondsRemaining:Math.max(0,Math.ceil((b.job.readyAt-now)/1000))}:null,upgradeCost:upgradeCost(state,id)})),expansionCost:expansionCost(state),quests:QUESTS.map((q,id)=>({id,title:q.title,progress:Math.min(q.target,state.stats[q.stat]),target:q.target,claimed:state.claimed.includes(id)}))};
}

export const DAY_MS=86400000;
export const DAILY_REWARDS=[40,55,70,85,100,120,160];
export const RETURN_BOOST_MS=30*60000,FIRST_HARVEST_BONUS=3;
export const DAILY_DIAMONDS=[4,6,8,10,12,16,24];
export const DAILY_CHALLENGE_DIAMONDS=Object.freeze([2,2,4]);
export const DIAMOND_PACKS=Object.freeze([{amount:150,price:'€1.99'},{amount:500,price:'€4.99'},{amount:1250,price:'€9.99'},{amount:3500,price:'€24.99'}]);
// Every diamond spent goes through here, so the farm keeps the total (stats.diamonds_spent: the Gem collector avatar,
// public/player-avatars.js). Counted from 25 Sep 2026; spending before that was not kept.
export function spendDiamonds(state,amount){state.diamonds-=amount;state.stats.diamonds_spent=(state.stats.diamonds_spent??0)+amount;}
// VIP has a single server-owned expiry. New purchases extend time, never strength. stats.vip_days adds up every day bought (the Velvet
// farmer avatar), from 25 Sep 2026.
export const VIP_PLANS=Object.freeze({week:{name:'VIP · 7 days',cost:500,duration:7*86400000},month:{name:'VIP · 30 days',cost:1500,duration:30*86400000}});
export function vipActive(state,now=Date.now()){return Number.isSafeInteger(state.vipExpiresAt)&&state.vipExpiresAt>now;}
export function dailyRewardMultiplier(state,now=Date.now()){return vipActive(state,now)?2:1;}
export function marketSaleValue(state,base,now=Date.now()){return Math.floor(base*(vipActive(state,now)?1.05:1)*(state.boosts?.coinsUntil>now?2:1)*(hasImprovement(state,'ledger')?1.1:1));}
export function buyVip(state,plan,expectedCost,expectedExpiresAt,now=Date.now()){
 if(typeof plan!=='string'||!Object.hasOwn(VIP_PLANS,plan))throw new Error('Choose a VIP plan.');
 const offer=VIP_PLANS[plan],previous=state.vipExpiresAt??0;
 if(expectedCost!==offer.cost)throw new Error('The price has changed. Review the current price.');
 if(expectedExpiresAt!==previous)throw new Error('Your VIP status has changed. Review it before extending.');
 if(state.diamonds<offer.cost)throw new Error(`You need ${offer.cost} diamonds.`);
 const expiresAt=Math.max(now,previous)+offer.duration;
 if(!Number.isSafeInteger(expiresAt))throw new Error('VIP cannot be extended further.');
 spendDiamonds(state,offer.cost);state.vipExpiresAt=expiresAt;state.stats.vip_days=(state.stats.vip_days??0)+Math.round(offer.duration/86400000);
 return {plan,cost:offer.cost,vipExpiresAt:expiresAt,extended:previous>now};
}
export const SINGLE_BATCH_COST=10;
export function finishSingleBatch(state,building,jobId,expectedCost,now=Date.now()){
 if(expectedCost!==SINGLE_BATCH_COST)throw new Error('The price has changed. Review the current price.');
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production'||!buildingUnlocked(state,building))throw new Error('Choose an open production building.');
 if(building==='factory')throw new Error('Factory batches are too big to rush with diamonds.');
 const job=productionJobs(state.buildings[building]).find(j=>j.id===jobId);
 if(!job||job.readyAt<=now)throw new Error('Choose a batch that is still running.');
 if(state.diamonds<SINGLE_BATCH_COST)throw new Error(`You need ${SINGLE_BATCH_COST} diamonds.`);
 spendDiamonds(state,SINGLE_BATCH_COST);job.readyAt=now;
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
 spendDiamonds(state,SINGLE_CROP_COST);plot.readyAt=now;
 state.stats.boosts_used=(state.stats.boosts_used??0)+1;
 return {field:id,crop:plot.crop,cost:SINGLE_CROP_COST,affected:1};
}
// Timed boosts run 30 minutes, 1 hour or 1 day. Longer is cheaper per hour (1 hour costs 1.8x and 1 day 6x the 30-minute price):
// nobody plays a whole day. Buying one that is still running adds the time after it, like VIP. `cost` and `duration` are the
// 30-minute offer, which is also what an older game gets when it sends no length.
export const BOOST_DURATIONS=Object.freeze({'30m':1800000,'1h':3600000,'1d':86400000});
export const BOOST_LENGTH_NAMES=Object.freeze({'30m':'30 minutes','1h':'1 hour','1d':'1 day'});
const BOOST_UNTIL=Object.freeze({xp:'xpUntil',harvest:'harvestUntil',coins:'coinsUntil'});
export const BOOSTS=Object.freeze({
 xp:{name:'Double XP',cost:50,duration:1800000,prices:Object.freeze({'30m':50,'1h':90,'1d':300}),art:'xp',description:'Earn twice the XP from farm actions.'},
 // Between Double XP and Double earnings: it doubles crops only, not goods or deliveries, and at most one waiting harvest per field.
 harvest:{name:'Double harvest',cost:75,duration:1800000,prices:Object.freeze({'30m':75,'1h':135,'1d':450}),art:'double-harvest',description:'Twice the crops from every harvest.'},
 coins:{name:'Double earnings',cost:100,duration:1800000,prices:Object.freeze({'30m':100,'1h':180,'1d':600}),art:'coins',description:'Double coins from sales and deliveries.'},
 crops:{name:'Instant harvest',cost:150,art:'seeds',description:'Every growing crop ready to harvest now.'},
 production:{name:'Finish production',cost:200,art:'boost',description:'Every running batch ready now (not the Factory).'},
 upgrade:{name:'Buildings discount',cost:250,art:'hammer',description:'50% off the coins and goods of your next building upgrade. Never expires.'}
});
// The price and running time of one boost: a timed boost for the chosen length, any other boost as it is.
export function boostOffer(id,length='30m'){
 if(!Object.hasOwn(BOOSTS,id))throw new Error('Choose a valid boost.');
 const boost=BOOSTS[id];
 if(!boost.prices)return {cost:boost.cost,duration:0,length:null};
 if(typeof length!=='string'||!Object.hasOwn(BOOST_DURATIONS,length))throw new Error('Choose 30 minutes, 1 hour or 1 day.');
 return {cost:boost.prices[length],duration:BOOST_DURATIONS[length],length};
}
export function boostStatus(state,id,now=Date.now(),length='30m'){
 const boost=BOOSTS[id],offer=boostOffer(id,length),until=BOOST_UNTIL[id]?state.boosts?.[BOOST_UNTIL[id]]:0;
 const remaining=Math.max(0,(until??0)-now);
 let reason='';
 if(id==='upgrade'&&state.boosts?.upgradeCredits>0)reason='Voucher ready';
 if(id==='upgrade'&&!Object.entries(state.buildings).some(([key,b])=>BUILDINGS[key].type==='production'&&b.level<MAX_BUILDING_LEVEL))reason='All buildings at maximum level';
 if(id==='crops'&&!state.plots.some(p=>p.crop&&p.readyAt>now))reason='No crops are growing';
 if(id==='production'&&!Object.entries(state.buildings).some(([key,b])=>key!=='factory'&&productionJobs(b).some(j=>j.readyAt>now)))reason='No batches are running';
 return {...boost,...offer,remaining,reason,canBuy:!reason&&state.diamonds>=offer.cost};
}
export function buyBoost(state,id,now=Date.now(),length='30m'){
 const status=boostStatus(state,id,now,length);
 if(status.reason)throw new Error(status.reason+'.');
 if(state.diamonds<status.cost)throw new Error(`You need ${status.cost} diamonds. Earn more from daily gifts and challenges.`);
 const key=BOOST_UNTIL[id];
 if(key)state.boosts[key]=Math.max(now,state.boosts[key]??0)+status.duration;
 if(id==='upgrade')state.boosts.upgradeCredits=1;
 let affected=0;
 if(id==='crops')for(const p of state.plots)if(p.crop&&p.readyAt>now){p.readyAt=now;affected++;}
 if(id==='production')for(const [key,b] of Object.entries(state.buildings))if(key!=='factory')for(const job of productionJobs(b))if(job.readyAt>now){job.readyAt=now;affected++;}
 spendDiamonds(state,status.cost);
 state.stats.boosts_used=(state.stats.boosts_used??0)+1;
 return {boost:id,length:status.length,cost:status.cost,affected,expiresAt:key?state.boosts[key]:null};
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
// The midgame expansion: new crops in the harvest pool, the new buildings in the production pool, the new goods in the third.
const MIDGAME_DAILIES=[
 [{"stat":"harvest_squash","target":2,"title":"Squash baskets","description":"Harvest 2 squash.","reward":260,"minLevel":28},{"stat":"harvest_polebeans","target":4,"title":"Pole bean picking","description":"Harvest 4 pole beans.","reward":240,"minLevel":31},{"stat":"harvest_ciderapples","target":4,"title":"Cider apple picking","description":"Harvest 4 cider apples.","reward":300,"minLevel":46}],
 [{"stat":"made_beeswax","target":4,"title":"Busy bees","description":"Collect 4 beeswax.","reward":280,"minLevel":34,"requiresBuildings":["beeyard"]},{"stat":"made_wool","target":6,"title":"Shearing day","description":"Collect 6 wool.","reward":300,"minLevel":37,"requiresBuildings":["sheepbarn"]},{"stat":"glasshouse_batches","target":1,"title":"Under glass today","description":"Collect 1 batch from the Glasshouse.","reward":320,"minLevel":40,"requiresBuildings":["glasshouse"]},{"stat":"made_yarn","target":4,"title":"Spinning day","description":"Spin 4 yarn.","reward":340,"minLevel":43,"requiresBuildings":["weaving"]}],
 [{"stat":"made_squashsoup","target":1,"title":"Soup day","description":"Cook 1 squash soup.","reward":360,"minLevel":32,"requiresBuildings":["kitchen"]},{"stat":"made_cloth","target":1,"title":"Weaving day","description":"Weave 1 cloth.","reward":420,"minLevel":45,"requiresBuildings":["weaving"]},{"stat":"made_cider","target":1,"title":"Cider day","description":"Press 1 cider.","reward":400,"minLevel":47,"requiresBuildings":["juicepress"]}]
];
const VALLEY_DAILIES=[
 [{"stat":"harvest_cherries","target":4,"title":"Cherry picking","description":"Harvest 4 cherries.","reward":420,"minLevel":66}],
 [{"stat":"made_goatmilk","target":6,"title":"Milking time","description":"Collect 6 goat milk.","reward":380,"minLevel":54,"requiresBuildings":["goatshed"]},{"stat":"made_candles","target":2,"title":"Candle pouring","description":"Pour 2 beeswax candles.","reward":420,"minLevel":58,"requiresBuildings":["craftshop"]},{"stat":"valley_baskets","target":1,"title":"A basket for the valley","description":"Sell 1 basket at the Valley Market.","reward":400,"minLevel":62}],
 [{"stat":"made_goatcheese","target":1,"title":"Cheese day","description":"Make 1 goat cheese.","reward":440,"minLevel":55,"requiresBuildings":["goatshed"]},{"stat":"made_blanket","target":1,"title":"Blanket day","description":"Make 1 wool blanket.","reward":520,"minLevel":60,"requiresBuildings":["craftshop"]},{"stat":"made_cherryjam","target":1,"title":"Jam day","description":"Cook 1 cherry jam.","reward":460,"minLevel":67,"requiresBuildings":["preserves"]},{"stat":"made_cherrypie","target":1,"title":"Pie day","description":"Bake 1 cherry pie.","reward":480,"minLevel":68,"requiresBuildings":["bakery"]}]
];
// Wave 3: a big harvest day, a prize basket from the Glasshouse and two blankets.
const ESTATE_DAILIES=[
 [{"stat":"harvested","target":40,"title":"The estate harvest","description":"Harvest 40 crops.","reward":600,"minLevel":78}],
 [{"stat":"made_prizeproduce","target":1,"title":"Show-ready vegetables","description":"Grow 1 prize produce.","reward":650,"minLevel":80,"requiresBuildings":["glasshouse"]}],
 [{"stat":"made_blanket","target":2,"title":"Two warm blankets","description":"Make 2 wool blankets.","reward":700,"minLevel":82,"requiresBuildings":["craftshop"]}]
];
export const DAILY_POOLS=LEGACY_DAILY_POOLS.map((pool,id)=>Object.freeze([...pool,...ORCHARD_DAILIES[id],...PANTRY_DAILIES[id],...MIDGAME_DAILIES[id],...VALLEY_DAILIES[id],...ESTATE_DAILIES[id],...[[{"stat":"activity_greenhouse","target":2,"title":"Seedling care","description":"Finish 2 Greenhouse jobs.","reward":65},{"stat":"activity_paddock","target":2,"title":"Happy herd","description":"Finish 2 Animal paddock jobs.","reward":65},{"stat":"chore_weeds","target":3,"title":"A tidy start","description":"Successfully clear the paths 3 times.","reward":70},{"stat":"tended","target":4,"title":"More than watering","description":"Give 4 growing crops extra care.","reward":65},{"stat":"harvest_lettuce","target":8,"title":"Leafy little harvest","description":"Harvest 8 lettuce.","reward":55},{"stat":"harvest_corn","target":6,"title":"Golden corn","description":"Harvest 6 corn.","reward":65}],[{"stat":"activity_apiary","target":3,"title":"Honey time","description":"Finish 3 Apiary jobs and collect their Honey.","reward":85},{"stat":"activity_workshop","target":3,"title":"Tools of the trade","description":"Finish 3 Tool workshop jobs.","reward":85},{"stat":"made_feed","target":3,"title":"Feed the farm","description":"Collect 3 animal feed from production.","reward":80},{"stat":"parallel_batches","target":2,"title":"Side by side","description":"Start 2 batches while another batch is still running in the same building.","reward":90,"parallel":true},{"stat":"fertilized","target":2,"title":"A soil boost","description":"Use natural fertilizer on 2 growing fields.","reward":80,"minLevel":3},{"stat":"made_flour","target":4,"title":"Flour power","description":"Collect 4 flour from production.","reward":80,"minLevel":3},{"stat":"made_salad","target":1,"title":"Freshly prepared","description":"Collect 1 fresh salad.","reward":90,"minLevel":4}],[{"stat":"activity_rounds","target":1,"title":"Make the rounds","description":"Finish a full farm round by helping at all four stops.","reward":110},{"stat":"activities","target":6,"title":"A hands-on day","description":"Finish 6 hands-on jobs around the farm.","reward":110},{"stat":"chore_troughs","target":2,"title":"Fresh water rounds","description":"Successfully fill the water troughs twice.","reward":110,"chore":"troughs"},{"stat":"chore_sorting","target":1,"title":"Everything sorted","description":"Successfully sort the seed boxes once.","reward":140,"chore":"sorting"},{"stat":"made_bread","target":2,"title":"Warm from the oven","description":"Collect 2 fresh bread.","reward":100,"minLevel":4},{"stat":"passive_earned","target":30,"title":"Roadside trade","description":"Collect 30 coins from the farm stall.","reward":80,"minLevel":3}]][id]]));
export const ORDER_POOL=Object.freeze([{"title": "The judges’ table", "input": {"prizeproduce": 1, "cherryjam": 1}, "xp": 180, "minLevel": 80}, {"title": "Show day at the inn", "input": {"prizeproduce": 1, "goatcheese": 2}, "xp": 190, "minLevel": 82}, {"title": "Milk for the café", "input": {"goatmilk": 6, "honey": 4}, "xp": 90, "minLevel": 54}, {"title": "The goat farmer’s table", "input": {"goatcheese": 1, "bread": 2}, "xp": 100, "minLevel": 55}, {"title": "Evening candles", "input": {"candles": 2, "beeswax": 3}, "xp": 100, "minLevel": 58}, {"title": "A cosy winter", "input": {"blanket": 1, "candles": 1}, "xp": 160, "minLevel": 60}, {"title": "Cherry season", "input": {"cherryjam": 1, "cherries": 6}, "xp": 110, "minLevel": 67}, {"title": "The pie stand", "input": {"cherrypie": 1, "applepie": 1}, "xp": 120, "minLevel": 68}, {"title": "Soup kitchen", "input": {"squashsoup": 1, "bread": 2}, "xp": 90, "minLevel": 32}, {"title": "The candle maker", "input": {"beeswax": 4, "honey": 4}, "xp": 70, "minLevel": 34}, {"title": "The village knitters", "input": {"wool": 6}, "xp": 70, "minLevel": 37}, {"title": "Glasshouse greens", "input": {"cauliflower": 8, "salad": 2}, "xp": 75, "minLevel": 40}, {"title": "The tailor’s shelves", "input": {"yarn": 4, "wool": 4}, "xp": 95, "minLevel": 43}, {"title": "Fabric for the fair", "input": {"cloth": 1, "yarn": 2}, "xp": 120, "minLevel": 45}, {"title": "Harvest cider", "input": {"cider": 1, "ciderapples": 4}, "xp": 110, "minLevel": 47}, {"title": "The baker next door", "input": {"wheat": 5}, "xp": 15, "minLevel": 1}, {"title": "A leafy lunch", "input": {"lettuce": 4, "corn": 2}, "xp": 20, "minLevel": 1}, {"title": "Sweet little favour", "input": {"honey": 2, "wheat": 4}, "xp": 20, "minLevel": 1}, {"title": "Breakfast at the inn", "input": {"eggs": 3, "milk": 2}, "xp": 25, "minLevel": 1}, {"title": "The paddock pantry", "input": {"feed": 2, "corn": 2}, "xp": 25, "minLevel": 1}, {"title": "Honey on toast", "input": {"honey": 2, "bread": 2}, "xp": 35, "minLevel": 3}, {"title": "A cream tea", "input": {"honey": 3, "milk": 2, "bread": 1}, "xp": 35, "minLevel": 3}, {"title": "The village grocer", "input": {"corn": 3, "lettuce": 2, "cabbage": 1}, "xp": 25, "minLevel": 3}, {"title": "The millers basket", "input": {"grainmeal": 2, "flour": 4}, "xp": 30, "minLevel": 3}, {"title": "For the garden club", "input": {"fertilizer": 2, "lettuce": 4}, "xp": 30, "minLevel": 3}, {"title": "The animal sanctuary", "input": {"feed": 3, "barley": 3}, "xp": 30, "minLevel": 3}, {"title": "A picnic in the park", "input": {"bread": 2, "salad": 1, "honey": 1}, "xp": 40, "minLevel": 4}, {"title": "The cheese board", "input": {"cheese": 2, "bread": 1}, "xp": 35, "minLevel": 4}, {"title": "A farm-fresh lunch", "input": {"salad": 2, "eggs": 3}, "xp": 35, "minLevel": 4}, {"title": "Sunday lunch", "input": {"cabbage": 2, "pumpkin": 2}, "xp": 35, "minLevel": 5}, {"title": "The harvest kitchen", "input": {"vegetables": 1, "flour": 3}, "xp": 45, "minLevel": 5}, {"title": "A golden afternoon", "input": {"pie": 1, "honey": 2, "milk": 2}, "xp": 50, "minLevel": 6}, {"title": "Autumn pantry", "input": {"redcabbage": 2, "cauliflower": 2}, "xp": 40, "minLevel": 6}, {"title": "The village feast", "input": {"bread": 3, "cheese": 2, "vegetables": 1}, "xp": 65, "minLevel": 7}, {"title": "Pantry provisions", "input": {"pickles": 1, "vegetables": 1}, "xp": 55, "minLevel": 7}, {"title": "A chefs finishing touch", "input": {"oil": 1, "salad": 2, "honey": 2}, "xp": 65, "minLevel": 8}, {"title": "Golden harvest hamper", "input": {"sunflower": 2, "oil": 1}, "xp": 60, "minLevel": 8}, {"title": "The autumn festival", "input": {"pie": 2, "pickles": 1, "honey": 3}, "xp": 75, "minLevel": 8}, {"title": "The estate banquet", "input": {"oil": 1, "vegetables": 2, "cheese": 2, "bread": 2}, "xp": 85, "minLevel": 10}, {"title": "The kitchen garden", "input": {"stew": 2, "bread": 2}, "xp": 80, "minLevel": 6, "requiresBuildings": ["kitchen"]}, {"title": "An orchard picnic", "input": {"applejuice": 2, "applepie": 1}, "xp": 110, "minLevel": 8, "requiresBuildings": ["juicepress"]}, {"title": "Breakfast preserves", "input": {"berrypreserves": 2, "bread": 3}, "xp": 120, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"title": "The orchard tea room", "input": {"berrytart": 2, "applepie": 2}, "xp": 160, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"title": "A colourful orchard refreshment", "input": {"orchardjuice": 1, "bread": 2}, "xp": 65, "minLevel": 10, "requiresBuildings": ["juicepress"]}, {"title": "Smoothies for the village", "input": {"berrysmoothie": 1, "bread": 2}, "xp": 68, "minLevel": 10, "requiresBuildings": ["juicepress"]}, {"title": "A honey-sweet breakfast", "input": {"applecompote": 1, "bread": 2}, "xp": 62, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"title": "The pickling pantry", "input": {"applevinegar": 1, "bread": 2}, "xp": 80, "minLevel": 10, "requiresBuildings": ["preserves", "juicepress"]}, {"title": "Beans for the village deli", "input": {"pickledbeans": 1, "bread": 2}, "xp": 100, "minLevel": 10, "requiresBuildings": ["preserves", "juicepress"]}, {"title": "A warming farm supper", "input": {"beangratin": 1, "bread": 2}, "xp": 85, "minLevel": 7, "requiresBuildings": ["kitchen"]}, {"title": "Lunch under the apple trees", "input": {"orchardsalad": 1, "bread": 2}, "xp": 58, "minLevel": 8, "requiresBuildings": []}, {"title": "Cheesecake at the tea room", "input": {"berrycheesecake": 1, "honey": 2}, "xp": 105, "minLevel": 11, "requiresBuildings": []}, {"title": "A gift from the valley", "input": {"harvesthamper": 1, "honey": 2}, "xp": 160, "minLevel": 12, "requiresBuildings": ["juicepress", "preserves"]}]);
export function availableDaily(state,q){
 if(q.input&&!Object.keys(q.input).every(k=>itemAvailable(state,k)))return false;
 if(guidedFarm(state)){
  const stat=q.stat??'';
  if(stat.startsWith('harvest_')&&!cropUnlocked(state,stat.slice(8)))return false;
  if(stat.startsWith('made_')&&!itemAvailable(state,stat.slice(5)))return false;
  if(stat==='produced'&&!Object.keys(RECIPES).some(id=>recipeUnlocked(state,id)))return false;
  if(stat.startsWith('built_')&&!buildingEligible(state,stat.slice(6)))return false;
  if(stat==='varieties'&&q.target>Object.keys(CROPS).filter(k=>cropUnlocked(state,k)).length)return false;
  const gate=stat==='mastery_medals'?'mastery':stat==='projects'?'projects':stat==='silo_upgrades'?'silo':stat==='tractor'?'tractor':stat==='dailies'?'challenges':stat.startsWith('activity')||stat==='activities'?'activities':stat.startsWith('chore')?'chores':stat==='deliveries'?'cart':stat==='passive_earned'?'stall':stat.startsWith('valley_')?'valleymarket':stat==='ranch_focus'?'ranch':stat==='improvements'?'estateworkshop':stat.startsWith('depot_')?'tradedepot':stat.startsWith('fair_')?'grandfair':null;
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
{"title": "A feast from the kitchen garden", "customer": "Village Supper Club", "story": "Prepare warm dishes, crisp pickles and fresh orchard salads for the supper club.", "input": {"beangratin": 3, "pickledbeans": 3, "orchardsalad": 3}, "xp": 400, "minLevel": 16, "requiresBuildings": ["kitchen", "preserves", "juicepress"]},
{"title": "The honey market", "customer": "Valley Apothecary", "story": "The apothecary is stocking up on honey, wax and warm soup for the winter.", "input": {"beeswax": 10, "honey": 12, "squashsoup": 2}, "xp": 450, "minLevel": 34, "requiresBuildings": ["beeyard", "kitchen"]},
{"title": "The wool fair", "customer": "Valley Wool Fair", "story": "Bring fleece, wax and farmhouse cheese to the busiest fair of the year.", "input": {"wool": 20, "beeswax": 8, "cheese": 10}, "xp": 520, "minLevel": 40, "requiresBuildings": ["sheepbarn", "beeyard"]},
{"title": "A glasshouse banquet", "customer": "Hilltop Estate", "story": "The estate wants soup, vegetables and pickles grown and made on your farm.", "input": {"squashsoup": 3, "vegetables": 4, "pickledbeans": 2}, "xp": 540, "minLevel": 40, "requiresBuildings": ["kitchen", "packing", "preserves"]},
{"title": "The tailor’s commission", "customer": "Village Tailor", "story": "A whole wardrobe of new clothes starts with your cloth, yarn and wool.", "input": {"cloth": 3, "yarn": 8, "wool": 10}, "xp": 650, "minLevel": 46, "requiresBuildings": ["weaving", "sheepbarn"]},
{"title": "The cider festival", "customer": "Orchard Cider Fair", "story": "Pour the fair its first cider of the year, with pies and tarts on the side.", "input": {"cider": 3, "applepie": 3, "berrytart": 2}, "xp": 640, "minLevel": 46, "requiresBuildings": ["juicepress", "preserves"]},
{"title": "The goat cheese festival", "customer": "Village Dairy Fair", "story": "The dairy fair wants goat cheese, fresh bread and something sparkling to drink.", "input": {"goatcheese": 4, "bread": 6, "cider": 2}, "xp": 700, "minLevel": 58, "requiresBuildings": ["goatshed", "juicepress"]},
{"title": "A candlelit supper", "customer": "Hilltop Estate", "story": "Candles on every table, soup and cheese on every plate.", "input": {"candles": 6, "squashsoup": 3, "cheese": 8}, "xp": 720, "minLevel": 60, "requiresBuildings": ["craftshop", "kitchen"]},
{"title": "The winter market", "customer": "Valley Winter Market", "story": "Warm blankets, candles and yarn for the coldest weeks of the year.", "input": {"blanket": 2, "candles": 4, "yarn": 6}, "xp": 800, "minLevel": 64, "requiresBuildings": ["craftshop", "weaving"]},
{"title": "The cherry fair", "customer": "Orchard Cherry Fair", "story": "The first cherries of the year, baked, cooked and served with goat cheese.", "input": {"cherrypie": 3, "cherryjam": 3, "goatcheese": 2}, "xp": 850, "minLevel": 68, "requiresBuildings": ["bakery", "preserves", "goatshed"]},
{"title": "The ranch banquet", "customer": "Valley Ranchers", "story": "The ranchers celebrate the season with cheese, pie and a blanket for the winner.", "input": {"goatcheese": 4, "cherrypie": 2, "blanket": 1}, "xp": 900, "minLevel": 70, "requiresBuildings": ["goatshed", "bakery", "craftshop"]},
{"title": "The valley wedding", "customer": "The Newlyweds", "story": "Candlelight, cherry pies and blankets for a wedding under the trees.", "input": {"blanket": 2, "candles": 6, "cherrypie": 3}, "xp": 920, "minLevel": 70, "requiresBuildings": ["craftshop", "bakery"]},
{"title": "The estate open day", "customer": "Hilltop Estate", "story": "The estate opens its gardens: candles on the terrace, pies and cheese in the tent.", "input": {"candles": 8, "cherrypie": 3, "goatcheese": 4}, "xp": 950, "minLevel": 78, "requiresBuildings": ["craftshop", "bakery", "goatshed"]},
{"title": "The produce show", "customer": "Valley Show Society", "story": "The show society wants prize vegetables, cherry jam and a blanket for the raffle.", "input": {"prizeproduce": 2, "cherryjam": 3, "blanket": 1}, "xp": 1000, "minLevel": 80, "requiresBuildings": ["glasshouse", "preserves", "craftshop"]},
{"title": "A harvest for the judges", "customer": "Valley Show Society", "story": "Lunch for the judges: prize vegetables, squash soup and a glass of cider.", "input": {"prizeproduce": 2, "squashsoup": 4, "cider": 4}, "xp": 980, "minLevel": 80, "requiresBuildings": ["glasshouse", "kitchen", "juicepress"]},
{"title": "The export sampler", "customer": "City Merchants", "story": "The city merchants want to taste the valley before they sign.", "input": {"prizeproduce": 3, "blanket": 2, "candles": 6}, "xp": 1100, "minLevel": 85, "requiresBuildings": ["glasshouse", "craftshop"]},
{"title": "The harbour banquet", "customer": "Harbour Guild", "story": "The harbour guild celebrates the season's first ships.", "input": {"cherrypie": 5, "goatcheese": 6, "cider": 6}, "xp": 1080, "minLevel": 85, "requiresBuildings": ["bakery", "goatshed", "juicepress"]},
{"title": "The champions' supper", "customer": "Grand Valley Fair", "story": "Supper for this year's champions, with prize vegetables on every plate.", "input": {"prizeproduce": 4, "cherrypie": 4, "blanket": 2}, "xp": 1250, "minLevel": 90, "requiresBuildings": ["glasshouse", "bakery", "craftshop"]},
{"title": "The fair's closing night", "customer": "Grand Valley Fair", "story": "Candlelight, cherry jam and the best vegetables in the valley to close the fair.", "input": {"prizeproduce": 3, "candles": 10, "cherryjam": 5}, "xp": 1200, "minLevel": 90, "requiresBuildings": ["glasshouse", "craftshop", "preserves"]}

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
 spendDiamonds(state,REPLACE_ORDER_COST);state.daily.orderBoard[id]=order;state.daily.orderRevisions[id]=(state.daily.orderRevisions[id]??0)+1;state.daily.replacements++;
 return {id,title:order.title,cost:REPLACE_ORDER_COST,remaining:DAILY_ORDER_REPLACEMENTS-state.daily.replacements};
}
// The Ranch (level 70): choose one herd to specialise in. Its barn works a quarter faster: every new batch there takes 25% less
// time. The first choice is free; switching to another herd later costs coins.
export const RANCH_HERDS=Object.freeze({sheepbarn:'Sheep',goatshed:'Goats',dairy:'Cows'});
export const RANCH_SPEEDUP=.25,RANCH_SWITCH_COST=15000;
// The Estate Workshop's Big hay loft makes the chosen herd work 35% faster instead of 25%.
export function ranchSpeedup(state){return hasImprovement(state,'hayloft')?.35:RANCH_SPEEDUP;}
export function ranchFocus(state){return featureUnlocked(state,'ranch')?state.ranch?.focus??null:null;}
export function ranchChangeCost(state){return state.ranch?.focus?RANCH_SWITCH_COST:0;}
export function setRanchFocus(state,focus,expectedCost){
 if(!Object.hasOwn(RANCH_HERDS,focus))throw new Error('Choose a herd for your ranch.');
 if(!buildingUnlocked(state,focus))throw new Error(`Open the ${BUILDINGS[focus].name} first.`);
 if(state.ranch.focus===focus)throw new Error('Your ranch already works with this herd.');
 const cost=ranchChangeCost(state);
 if(expectedCost!==cost)throw new Error('The price has changed. Review the current price.');
 if(state.coins<cost)throw new Error(`You need ${cost.toLocaleString('en-US')} coins to switch herds.`);
 state.coins-=cost;state.ranch.focus=focus;state.ranch.changes++;state.stats.ranch_focus=(state.stats.ranch_focus??0)+1;
 return {focus,cost};
}
// The Valley Market (level 62): three stalls, each with a customer who wants one basket. A basket always holds one of the newest
// goods or crops with one or two older goods, and pays half as much again as their normal price. After a sale, or when you send
// a customer away, that stall gets its next customer four hours later. Baskets follow from the stall and a running number, so the
// game and the server always agree on them.
export const VALLEY_STALLS=3,VALLEY_RESTOCK=4*3600000,VALLEY_PREMIUM=1.5;
// The Estate Workshop's Market wagon brings the next customer after two hours instead of four.
export function valleyRestock(state){return hasImprovement(state,'wagon')?VALLEY_RESTOCK/2:VALLEY_RESTOCK;}
export const VALLEY_CUSTOMERS=Object.freeze([
 {name:'The Hilltop Inn',line:'Tonight’s guests want the best of the valley.'},
 {name:'The village school',line:'A basket for the end-of-term picnic.'},
 {name:'Willow Bakery',line:'The baker is trying out a new recipe.'},
 {name:'The riverside café',line:'Fresh stock for the weekend rush.'},
 {name:'The mayor’s kitchen',line:'Dinner for some very important visitors.'},
 {name:'The valley apothecary',line:'Supplies for the winter shelves.'},
 {name:'A travelling merchant',line:'Taking the best of your farm to the city.'},
 {name:'The harvest choir',line:'A treat after the evening rehearsal.'},
 {name:'The lighthouse keeper',line:'Stocking up for a long, quiet season.'},
 {name:'The newlyweds',line:'Filling their very first pantry.'}
]);
// The newest crops and goods: every basket has one of them.
export const VALLEY_STARS=Object.freeze(['squash','polebeans','ciderapples','cherries','squashsoup','beeswax','wool','yarn','cloth','cider','goatmilk','goatcheese','candles','blanket','cherryjam','cherrypie','prizeproduce']);
// calendarHash's lowest bits barely change between near-identical texts (stall 1, 2, 3 would all pick the same good), so the
// market's rolls get a final mix first.
const mixBits=h=>{h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return h>>>0;};
export function valleyBasketValue(level){return Math.min(9000,3000+150*Math.max(0,level-FEATURE_LEVELS.valleymarket));}
function valleyBasket(state,stall,serial){
 const roll=n=>mixBits(calendarHash(`valley-v1:${stall}:${serial}:${n}`)),target=valleyBasketValue(levelOf(state));
 const stars=VALLEY_STARS.filter(k=>itemAvailable(state,k)),others=Object.keys(PRODUCTS).filter(k=>!VALLEY_STARS.includes(k)&&!['feed','fertilizer','honey'].includes(k)&&itemAvailable(state,k));
 const star=stars[roll(0)%stars.length],input={[star]:Math.max(1,Math.min(12,Math.round(target*.5/ITEMS[star].sell)))};
 const count=Math.min(others.length,1+roll(1)%2);let rest=target-ITEMS[star].sell*input[star];
 for(let i=0;i<count;i++){const key=others.splice(roll(2+i)%others.length,1)[0];input[key]=Math.max(1,Math.min(15,Math.round(Math.max(0,rest)/(count-i)/ITEMS[key].sell)));rest-=ITEMS[key].sell*input[key];}
 const value=Object.entries(input).reduce((sum,[key,n])=>sum+ITEMS[key].sell*n,0);
 return {id:serial,customer:roll(9)%VALLEY_CUSTOMERS.length,input,value,coins:Math.ceil(value*VALLEY_PREMIUM/10)*10,xp:Math.max(20,Math.round(value/40))};
}
// Gives every free stall whose waiting time is over its next customer.
function refreshValley(state,now){
 if(!featureUnlocked(state,'valleymarket'))return;
 while(state.valley.stalls.length<VALLEY_STALLS)state.valley.stalls.push({basket:null,readyAt:0});
 state.valley.stalls.forEach((stall,i)=>{if(!stall.basket&&now>=stall.readyAt){state.valley.serial++;stall.basket=valleyBasket(state,i,state.valley.serial);}});
}
function valleyStall(state,stall,basket){
 const s=Number.isInteger(stall)?state.valley.stalls[stall]:undefined;if(!s)throw new Error('Choose a market stall.');
 if(!s.basket||s.basket.id!==basket)throw new Error('This customer has moved on. Look at the stall again.');
 return s;
}
export function valleySell(state,stall,basket,now=Date.now()){
 const s=valleyStall(state,stall,basket),b=s.basket,missing=Object.entries(b.input).filter(([k,n])=>state.inventory[k]<n);
 if(missing.length)throw new Error('Missing: '+missing.map(([k,n])=>`${ITEMS[k].name} (${state.inventory[k]}/${n})`).join(', ')+'.');
 let units=0;
 for(const [k,n] of Object.entries(b.input)){state.inventory[k]-=n;state.stats['sold_'+k]=(state.stats['sold_'+k]??0)+n;units+=n;}
 const coins=marketSaleValue(state,b.coins,now);
 state.coins+=coins;state.xp+=b.xp;state.stats.earned+=coins;state.stats.sold+=units;
 state.stats.valley_baskets=(state.stats.valley_baskets??0)+1;state.stats.valley_coins=(state.stats.valley_coins??0)+coins;
 s.basket=null;s.readyAt=now+valleyRestock(state);state.valley.sold++;
 return {coins,xp:b.xp,customer:VALLEY_CUSTOMERS[b.customer].name,readyAt:s.readyAt};
}
export function valleySkip(state,stall,basket,now=Date.now()){
 const s=valleyStall(state,stall,basket);s.basket=null;s.readyAt=now+valleyRestock(state);
 return {readyAt:s.readyAt};
}
// The Estate Workshop (level 75): lasting improvements for the whole farm. Each is built once, with coins and goods, and works
// for good from then on. They open one after another from level 75 to 88.
export const IMPROVEMENTS=Object.freeze({
 ladders:{name:'Orchard ladders',effect:'Trees, bushes and climbing plants grow back 20% faster.',art:'apples',level:75,coins:300000,materials:{cider:30,cherryjam:12,applejuice:60}},
 heating:{name:'Glasshouse heating',effect:'Glasshouse batches take 25% less time.',art:'glasshouse',level:76,coins:350000,materials:{beeswax:120,oil:50,cloth:15}},
 watertower:{name:'Water tower',effect:'Watering takes 30% off the growing time instead of 20%.',art:'water',level:78,coins:420000,materials:{goatcheese:25,blanket:5,stew:80}},
 hayloft:{name:'Big hay loft',effect:'Your ranch herd works 35% faster instead of 25%.',art:'ranch',level:80,coins:500000,materials:{wool:300,goatmilk:200,cheese:120}},
 wagon:{name:'Market wagon',effect:'Valley Market customers come back after 2 hours instead of 4.',art:'valley-market',level:82,coins:600000,materials:{candles:40,cherrypie:20,prizeproduce:3}},
 crane:{name:'Loading crane',effect:'A new export contract comes 6 hours after a trailer leaves instead of 12.',art:'trade-depot',level:86,coins:750000,materials:{blanket:10,cloth:40,prizeproduce:6}},
 ledger:{name:'Merchant’s ledger',effect:'Everything you sell at the Market pays 10% more.',art:'market',level:88,coins:900000,materials:{harvesthamper:40,cherryjam:30,prizeproduce:10}}
});
export const IMPROVEMENT_XP=250;
export function hasImprovement(state,id){return Array.isArray(state.improvements)&&state.improvements.includes(id);}
export function buildImprovement(state,id){
 if(typeof id!=='string'||!Object.hasOwn(IMPROVEMENTS,id))throw new Error('Choose an improvement.');
 const x=IMPROVEMENTS[id];
 if(hasImprovement(state,id))throw new Error(`The ${x.name} is already built.`);
 if(levelOf(state)<x.level)throw new Error(`Reach level ${x.level} to build the ${x.name}.`);
 if(state.coins<x.coins)throw new Error(`You need ${x.coins.toLocaleString('en-US')} coins for the ${x.name}.`);
 const missing=Object.entries(x.materials).filter(([key,n])=>state.inventory[key]<n);
 if(missing.length)throw new Error(`Gather the missing supplies: ${missing.map(([key,n])=>`${n} ${ITEMS[key].name}`).join(', ')}.`);
 state.coins-=x.coins;for(const [key,n] of Object.entries(x.materials))state.inventory[key]-=n;
 state.improvements.push(id);state.stats.improvements=(state.stats.improvements??0)+1;state.xp+=IMPROVEMENT_XP;
 return {improvement:id,name:x.name,coins:x.coins,xp:IMPROVEMENT_XP};
}
// The Trade Depot (level 85): one export contract at a time, a trailer to fill with four kinds of goods. Load what you have
// whenever you like; what is loaded stays loaded. A full trailer leaves at once and pays 1.6× the goods' normal price plus
// diamonds; the next contract comes 12 hours later (6 with the Loading crane). A contract with nothing loaded yet can be
// turned down, and the next one comes after the same wait. Contracts follow from a running number, like the Valley Market's
// baskets, so the game and the server agree on them.
export const DEPOT_PREMIUM=1.6,DEPOT_RESTOCK=12*3600000,DEPOT_DIAMONDS=10;
export const EXPORT_DESTINATIONS=Object.freeze([
 {name:'The city markets',line:'From the valley to the busiest stalls in town.'},
 {name:'The harbour warehouses',line:'Crates for the ships that sail at dawn.'},
 {name:'The mountain hotels',line:'The lodges want the best of the valley for the season.'},
 {name:'The northern mills',line:'Supplies for a long winter up north.'},
 {name:'The palace kitchens',line:'Only the finest goods for the palace table.'},
 {name:'The railway company',line:'Stock for the dining cars on the night train.'}
]);
export function exportValue(level){return Math.min(120000,60000+4000*Math.max(0,level-FEATURE_LEVELS.tradedepot));}
export function depotRestock(state){return hasImprovement(state,'crane')?DEPOT_RESTOCK/2:DEPOT_RESTOCK;}
function exportContract(state,serial){
 const roll=n=>mixBits(calendarHash(`export-v1:${serial}:${n}`)),target=exportValue(levelOf(state));
 const goods=Object.keys(PRODUCTS).filter(k=>ITEMS[k].sell>=400&&itemAvailable(state,k)),kinds=Math.min(4,goods.length),input={};
 if(!kinds)return null;   // nothing the farm can make yet: no trailer until it can
 for(let i=0;i<kinds;i++){const key=goods.splice(roll(i)%goods.length,1)[0];input[key]=Math.max(2,Math.min(120,Math.round(target/kinds/ITEMS[key].sell)));}
 const value=Object.entries(input).reduce((sum,[key,n])=>sum+ITEMS[key].sell*n,0);
 return {id:serial,destination:roll(9)%EXPORT_DESTINATIONS.length,input,loaded:Object.fromEntries(Object.keys(input).map(k=>[k,0])),value,coins:Math.ceil(value*DEPOT_PREMIUM/100)*100,xp:Math.round(value/40),diamonds:DEPOT_DIAMONDS};
}
function refreshDepot(state,now){
 if(!featureUnlocked(state,'tradedepot')||state.depot.contract||now<state.depot.readyAt)return;
 const contract=exportContract(state,state.depot.serial+1);
 if(contract){state.depot.serial++;state.depot.contract=contract;}
}
function depotContract(state,contract){
 const c=state.depot.contract;
 if(!c||c.id!==contract)throw new Error('This contract has changed. Look at the depot again.');
 return c;
}
// Loads one kind of goods (item) or everything the contract still needs (no item), as far as the barn has it.
export function depotLoad(state,contract,item,now=Date.now()){
 const c=depotContract(state,contract);
 if(item!==undefined&&(typeof item!=='string'||!Object.hasOwn(c.input,item)))throw new Error('This contract does not ask for that.');
 const loaded={};
 for(const key of item===undefined?Object.keys(c.input):[item]){const n=Math.min(state.inventory[key],c.input[key]-c.loaded[key]);if(n>0){state.inventory[key]-=n;c.loaded[key]+=n;loaded[key]=n;}}
 const units=Object.values(loaded).reduce((sum,n)=>sum+n,0);
 if(!units)throw new Error(item===undefined?'You have none of the goods this trailer still needs.':`You have no ${ITEMS[item].name.toLowerCase()} to load.`);
 state.stats.depot_loaded=(state.stats.depot_loaded??0)+units;
 if(Object.keys(c.input).some(key=>c.loaded[key]<c.input[key]))return {loaded,units,shipped:false};
 state.coins+=c.coins;state.xp+=c.xp;state.diamonds+=c.diamonds;state.stats.earned+=c.coins;
 state.stats.depot_shipments=(state.stats.depot_shipments??0)+1;state.stats.depot_coins=(state.stats.depot_coins??0)+c.coins;
 state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+c.diamonds;
 state.depot.shipped++;state.depot.contract=null;state.depot.readyAt=now+depotRestock(state);
 return {loaded,units,shipped:true,coins:c.coins,xp:c.xp,diamonds:c.diamonds,destination:EXPORT_DESTINATIONS[c.destination].name,readyAt:state.depot.readyAt};
}
export function depotSkip(state,contract,now=Date.now()){
 const c=depotContract(state,contract);
 if(Object.values(c.loaded).some(n=>n>0))throw new Error('Goods are already on this trailer. Finish loading it.');
 state.depot.contract=null;state.depot.readyAt=now+depotRestock(state);
 return {readyAt:state.depot.readyAt};
}
// The Grand Valley Fair (level 90): every week (from Monday, UTC) three classes, one entry each. An entry hands over the goods
// and wins a ribbon: fair stars (they count up for good), coins at half as much again as the goods' normal price, XP and
// diamonds. A ribbon in all three classes in one week makes you grand champion. The classes follow from the week and are
// kept for the whole week once the farm first sees them.
export const FAIR_PREMIUM=1.5;
export const FAIR_CLASSES=Object.freeze([
 {name:'Best harvest',stars:1,value:15000,diamonds:5},
 {name:'Finest goods',stars:2,value:30000,diamonds:5},
 {name:'Best in show',stars:3,value:50000,diamonds:10}
]);
function fairClasses(state,week){
 const roll=n=>mixBits(calendarHash(`fair-v1:${week}:${n}`)),pick=(list,n)=>list[roll(n)%list.length];
 const amount=(key,value)=>Math.max(1,Math.round(value/ITEMS[key].sell));
 const crops=Object.keys(CROPS).filter(k=>CROPS[k].sell>=100&&cropUnlocked(state,k)),products=Object.keys(PRODUCTS).filter(k=>!['prizeproduce','feed','fertilizer','honey'].includes(k)&&ITEMS[k].sell>=200&&itemAvailable(state,k));
 const fine=products.filter(k=>ITEMS[k].sell>=1000),goods=fine.length?fine:products;
 if(!crops.length||!goods.length)return null;   // a farm that makes nothing yet waits for its first classes
 const crop=pick(crops,0),good=pick(goods,1),others=goods.filter(k=>k!==good),show=pick(others.length?others:[good],2);
 const prize=itemAvailable(state,'prizeproduce')?3:0,rest=FAIR_CLASSES[2].value-prize*ITEMS.prizeproduce.sell;
 const inputs=[{[crop]:amount(crop,FAIR_CLASSES[0].value)},{[good]:amount(good,FAIR_CLASSES[1].value)},{...(prize?{prizeproduce:prize}:{}),[show]:amount(show,rest)}];
 return FAIR_CLASSES.map((c,i)=>{const input=inputs[i],value=Object.entries(input).reduce((sum,[key,n])=>sum+ITEMS[key].sell*n,0);return {name:c.name,stars:c.stars,input,value,coins:Math.ceil(value*FAIR_PREMIUM/100)*100,xp:Math.round(value/40),diamonds:c.diamonds};});
}
function refreshFair(state,now){
 if(!featureUnlocked(state,'grandfair'))return;
 const week=familyWeek(now),classes=state.fair.week===week?null:fairClasses(state,week);
 if(classes)state.fair={week,classes,entered:[]};
}
export function fairEnter(state,index,week,now=Date.now()){
 if(week!==state.fair.week||week!==familyWeek(now))throw new Error('A new fair week has started. Look at the new classes.');
 const entry=Number.isInteger(index)?state.fair.classes[index]:undefined;
 if(!entry)throw new Error('Choose a class at the fair.');
 if(state.fair.entered.includes(index))throw new Error('You already have a ribbon in this class this week.');
 const missing=Object.entries(entry.input).filter(([key,n])=>state.inventory[key]<n);
 if(missing.length)throw new Error('Missing: '+missing.map(([key,n])=>`${ITEMS[key].name} (${state.inventory[key]}/${n})`).join(', ')+'.');
 for(const [key,n] of Object.entries(entry.input))state.inventory[key]-=n;
 state.fair.entered.push(index);state.coins+=entry.coins;state.xp+=entry.xp;state.diamonds+=entry.diamonds;state.stats.earned+=entry.coins;
 state.stats.fair_entries=(state.stats.fair_entries??0)+1;state.stats.fair_stars=(state.stats.fair_stars??0)+entry.stars;
 state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+entry.diamonds;
 const champion=state.fair.entered.length===state.fair.classes.length;
 if(champion)state.stats.fair_champion=(state.stats.fair_champion??0)+1;
 return {name:entry.name,stars:entry.stars,coins:entry.coins,xp:entry.xp,diamonds:entry.diamonds,champion};
}
export function utcDay(now=Date.now()){return new Date(now).toISOString().slice(0,10);}
export function dayNumber(now=Date.now()){return Math.floor(now/DAY_MS);}
export function seedCost(state,crop){return Math.max(1,Math.ceil(CROPS[crop].cost*(1-siloBonus(state.siloLevel??0).seeds)));}
export function normalizeFarm(state,now=Date.now()){
 // Invite a friend: who invited this farm (set once when it was created) and which friends already paid out.
 if(state.invite&&!(typeof state.invite.code==='string'&&typeof state.invite.by==='string'&&Number.isFinite(state.invite.at)))delete state.invite;
 state.inviteRewards=Array.isArray(state.inviteRewards)?state.inviteRewards.filter(id=>typeof id==='string').slice(-500):[];
 state.donations=Array.isArray(state.donations)?state.donations.filter(id=>typeof id==='string').slice(-50):[];
 const oldVersion=state.version??0;
 if((state.version??0)<4){const previousLevel=1+Math.floor(state.xp/60);state.xpOffset=oldXpForLevel(previousLevel)-60*(previousLevel-1);}
 migrateXpCurve(state);
 state.progression??={mode:'legacy'};
 if(state.keep!==undefined)state.keep=Object.fromEntries(Object.entries(state.keep&&typeof state.keep==='object'?state.keep:{}).filter(([k,v])=>Object.hasOwn(ITEMS,k)&&Number.isSafeInteger(v)&&v>0));
 if(state.emailBonus!==undefined&&!Number.isSafeInteger(state.emailBonus))delete state.emailBonus;
 if(state.rookieUntil!==undefined)state.rookieUntil=Number.isSafeInteger(state.rookieUntil)?Math.max(0,state.rookieUntil):0;
 state.version=14;state.vipExpiresAt=Number.isSafeInteger(state.vipExpiresAt)?Math.max(0,state.vipExpiresAt):0;state.inventory??={};for(const k of Object.keys(ITEMS))state.inventory[k]??=0;
 state.diamonds=Number.isFinite(state.diamonds)?Math.max(0,Math.floor(state.diamonds)):0;
 state.boosts??={};for(const key of ['xpUntil','harvestUntil','coinsUntil','upgradeCredits'])state.boosts[key]=Number.isFinite(state.boosts[key])?Math.max(0,Math.floor(state.boosts[key])):0;
 state.boosts.upgradeCredits=Math.min(1,state.boosts.upgradeCredits);
 state.buildings??={};for(const key of Object.keys(BUILDINGS))state.buildings[key]??={level:1,job:null};
 state.stats??={};migrateProgression(state);migrateFeatureLevels(state);migrateUnlockSpread(state);
 for(const key of Object.keys(BUILDINGS))if(buildingCost(state,key))state.buildings[key].built??=false;
 // Keep paid-for legacy flour batches intact when milling moves to the Windmill.
 if(oldVersion<6&&state.buildings.mill.job?.recipe==='flour'){
  state.buildings.mill.job.output??={flour:1};state.buildings.mill.job.xp??=8;
 }
 for(const [key,b] of Object.entries(state.buildings)){
  b.extraJobs??=[];b.batchSequence??=0;
  for(const job of productionJobs(b))if(!job.id)job.id=`${key}-${++b.batchSequence}`;
  if(BUILDINGS[key]?.type==='production'&&b.level>MAX_BUILDING_LEVEL)b.level=MAX_BUILDING_LEVEL;   // level 10 is the top since 26 Sep 2026
 }
 state.stats??={};
 if(oldVersion<10){
  // Only recover counters that old saves actually recorded; never invent chore wins.
  const recovered={activity_rounds:state.activities?.rounds??0,silo_upgrades:state.siloLevel??0,...Object.fromEntries(Object.entries(state.activities?.completed??{}).map(([id,n])=>['activity_'+id,n]))};
  for(const [key,n] of Object.entries(recovered)){state.stats[key]??=n;if(state.daily?.baseline)state.daily.baseline[key]??=state.stats[key];}
 }
 for(const q of QUESTS)state.stats[q.stat]??=0;
 for(const k of ['harvested','watered','planted','produced','earned','deliveries','tractor','dailies','tended','chores','passive_earned','projects','mastery_medals','sold','diamonds_spent','vip_days'])state.stats[k]??=0;
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
 state.ranch??={focus:null,changes:0};state.valley??={serial:0,sold:0,stalls:[]};
 if(!Array.isArray(state.improvements))state.improvements=[];state.depot??={serial:0,shipped:0,contract:null,readyAt:0};state.fair??={week:null,classes:[],entered:[]};
 for(const p of state.plots){p.tended??=false;p.fertilized??=false;p.careAt??=p.plantedAt+Math.max(0,(p.readyAt-p.plantedAt)*.3);}
 const day=utcDay(now);
 const existingDay=state.daily?.date===day;
 if(!existingDay)state.daily={date:day,baseline:{...state.stats},claimed:[],orders:[],bonusClaimed:false};
 const d=dayNumber(now);
 state.daily.replacements??=0;state.daily.orderRevisions??={};
 state.daily.tasks??=oldVersion<10&&existingDay?LEGACY_DAILY_POOLS.map((pool,id)=>({...pool[(d+id)%pool.length]})):featureUnlocked(state,'challenges')?selectDailyTasks(state,d):[];
 state.daily.orderBoard??=oldVersion<10&&existingDay?[0,2,4].map(offset=>orderQuote(LEGACY_ORDER_POOL[(d+offset)%LEGACY_ORDER_POOL.length])):selectDailyOrders(state,d);
 refreshValley(state,now);refreshDepot(state,now);refreshFair(state,now);
 return state;
}
// An order on today's board that the farm cannot make (picked before a rule changed, or a building it has not built) is swapped,
// while undelivered, for one of the same kind it can make; its revision moves on, so an open screen asks to look again.
function swapImpossibleOrders(state,now){
 const day=dayNumber(now),board=state.daily.orderBoard??[];
 board.forEach((order,id)=>{
  if(!order.tier||state.daily.orders.includes(id)||Object.keys(order.input).every(k=>itemAvailable(state,k)))return;
  const used=new Set(board.map(o=>o.title)),pool=order.tier==='commission'?COMMISSION_POOL:ORDER_POOL;
  const options=pool.filter(o=>!used.has(o.title)&&availableDaily(state,o)&&(order.tier!=='village'||Object.keys(o.input).some(k=>k!=='honey'&&Object.hasOwn(PRODUCTS,k)))).sort((a,b)=>b.minLevel-a.minLevel||a.title.localeCompare(b.title));
  if(!options.length)return;
  const roll=calendarHash(`swap-v1:${day}:${id}`);
  board[id]=quoteTierOrder(options[roll%Math.min(3,options.length)],order.tier,now,roll);
  state.daily.orderRevisions[id]=(state.daily.orderRevisions[id]??0)+1;
 });
}
function refreshProgressionDaily(state,now){
 swapImpossibleOrders(state,now);
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
 // Day 7 is the top of the streak: after it every day pays the day-7 gift until a day is missed (then back to day 1).
 const index=Math.min(state.login.streak,DAILY_REWARDS.length)-1,coins=DAILY_REWARDS[index]*dailyRewardMultiplier(state,now),diamonds=DAILY_DIAMONDS[index]*dailyRewardMultiplier(state,now),xp=10*dailyRewardMultiplier(state,now);state.coins+=coins;state.diamonds+=diamonds;state.xp+=xp;
 state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;
 // Coming back on a second day: the gift brings 30 minutes of double harvest as well, once (guided farms).
 const returnBoost=guidedFarm(state)&&state.login.visits===2;
 if(returnBoost)state.boosts.harvestUntil=Math.max(state.boosts.harvestUntil??0,now)+RETURN_BOOST_MS;
 return {coins,diamonds,streak:state.login.streak,xp,...(returnBoost?{returnBoost:RETURN_BOOST_MS/60000}:{})};
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
// Every level pays at least one diamond, so no level-up is ever empty-handed; from level 10 on it grows with every five levels.
// Invite a friend: every farmer has a short personal code (harvesttycoon.com/?invite=CODE). A friend who starts a new farm with
// it and reaches level 10 within 30 days earns 150 diamonds, and so does the farmer who invited them, for at most 10 friends.
// The friend's reward is paid in their own farm when they reach the level; the inviter's on their next load.
export const INVITE_REWARD=150,INVITE_LEVEL=10,INVITE_LIMIT=10,INVITE_DAYS=30;
export const INVITE_CODE=/^[A-Z0-9]{4,12}$/;
const INVITE_LETTERS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// A readable code from the player name plus two random letters, e.g. "Tony" -> "TONY7K".
export function inviteCodeFrom(name,random=Math.random){
 const base=String(name??'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
 return (base.length>=2?base:'FARM')+Array.from({length:2},()=>INVITE_LETTERS[Math.floor(random()*INVITE_LETTERS.length)]).join('');
}
// The invited friend's reward, once, when they are at level 10 within 30 days of starting. Returns what was paid or null.
export function inviteeReward(state,now=Date.now()){
 const invite=state.invite;
 if(!invite||invite.rewardedAt||levelOf(state)<INVITE_LEVEL||now-invite.at>INVITE_DAYS*DAY_MS)return null;
 invite.rewardedAt=now;state.diamonds+=INVITE_REWARD;
 return {diamonds:INVITE_REWARD,from:invite.by};
}
// The inviter's rewards for friends who reached level 10 (rows from the referrals table), each paid once: the friend's id is
// kept in the farm, so a retry or a second tab never pays twice.
export function inviterRewards(state,rows){
 state.inviteRewards??=[];const paid=[];
 for(const row of rows){
  if(!(row.referrer_diamonds>0)||state.inviteRewards.includes(row.invitee_id))continue;
  state.inviteRewards.push(row.invitee_id);state.diamonds+=row.referrer_diamonds;paid.push({playerId:row.invitee_id,name:row.username??'A friend',diamonds:row.referrer_diamonds});
 }
 return paid;
}
// A gift for everyone from the staff (staff_donate, supabase/chat.sql): each one is received once, on the next load, by farms that
// already existed when it was sent. The ids received are kept (the last 50; at most 5 gifts a day, looked up for 7 days).
// A confirmed email address pays 10 diamonds, once: a Google or Facebook account at once (those check the address), an email
// sign-up after confirming it with a code (farm-api, events: email_send / email_confirm). Only the server grants it, on a load.
export const EMAIL_BONUS=10;
export function grantEmailBonus(state,now=Date.now()){if(state.emailBonus)return 0;state.emailBonus=now;state.diamonds+=EMAIL_BONUS;return EMAIL_BONUS;}
export function receiveDonations(state,rows){
 state.donations??=[];const got=[];
 for(const row of rows??[]){
  if(typeof row?.id!=='string'||state.donations.includes(row.id))continue;
  const coins=Math.max(0,Math.min(500,Math.floor(Number(row.coins)||0))),diamonds=Math.max(0,Math.min(50,Math.floor(Number(row.diamonds)||0)));
  state.donations.push(row.id);state.coins+=coins;state.diamonds+=diamonds;
  got.push({coins,diamonds,message:typeof row.message==='string'&&row.message?row.message.slice(0,120):null});
 }
 state.donations=state.donations.slice(-50);
 return got;
}
export function levelReward(level){return {coins:10*level,diamonds:Math.max(1,Math.floor(level/5))};}
// One farmer title every 5 levels, so nobody is stuck reading "Farm tycoon" from level 5 to 100: the fields keep expanding to level 95, so the
// titles keep going that far too. The last title holds from level 96 on.
export const LEVEL_TITLES=Object.freeze(['Rookie farmer','Green thumb','Market regular','Harvest hero','Farm tycoon','Estate builder','Master grower','Valley supplier','Orchard keeper','Crop master','Factory owner','Homestead legend','Regional trader','Harvest baron','Valley icon','Grand cultivator','Estate mogul','Farming dynasty','Valley champion','Legend of the valley']);
export const levelTitle=level=>LEVEL_TITLES[Math.min(LEVEL_TITLES.length-1,Math.max(0,Math.floor((level-1)/5)))];
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
 const eligible=state.plots.filter(p=>mode==='plant'?!p.crop:mode==='water'?canWater(p,now):p.crop&&p.readyAt<=now);
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
// The Starter Pack (a welcome offer, see game/payments.js) opens when diamond boosts unlock (level 14): a pack of diamonds is only a shop in the
// way until there is something to spend them on. Then it is there for 7 days. Only the server writes the moment. A farm that is already past
// that level when this is first seen had its moment long ago (unlockedAt 0: never offered again); a farm below it gets its moment on the way up.
export const STARTER_LEVEL=FEATURE_LEVELS.boosts;
function stampStarterOffer(state,levelBefore,now){
 if(state.starterOffer!==undefined||levelOf(state)<STARTER_LEVEL)return;
 state.starterOffer={unlockedAt:levelBefore<STARTER_LEVEL?now:0};
}
export function applyFarmAction(state,action,now=Date.now(),random=secureChoreRandom){
 normalizeFarm(state,now);if(!action||typeof action!=='object')throw new Error('Choose a farm action.');
 const beforeXP=state.xp,beforeCoins=state.coins,beforeLevel=levelOf(state);
 const beginnerBefore={harvested:state.stats.harvested,wheat:state.stats.harvest_wheat??0,watered:state.stats.watered,tended:state.stats.tended};
 const result=dispatchFarmAction(state,action,now,random);
 // Coins spent (seeds, buildings, upgrades, fields, research…), for the farm events' "Spend coins" goal (26 Sep 2026).
 const spent=beforeCoins-state.coins;if(spent>0)state.stats.coins_spent=(state.stats.coins_spent??0)+spent;
 recordBeginnerAction(state,action,result,beginnerBefore);
 const earnedXP=state.xp-beforeXP;
 if(state.boosts.xpUntil>now&&earnedXP>0){state.xp+=earnedXP;result.xp=(result.xp??earnedXP)+earnedXP;}
 if(state.boosts.coinsUntil>now&&['delivery','depot_load'].includes(action.type)){
  const bonus=state.coins-beforeCoins;if(bonus>0){state.coins+=bonus;state.stats.earned+=bonus;result.coins+=bonus;}
 }
 // After the boosts, so an action's own XP stays its own: the guide step's XP is shown by itself.
 const guideSteps=advanceBeginner(state);if(guideSteps.length)result.guide=guideSteps;
 const reward=grantLevelRewards(state,beforeLevel+1);
 if(reward.levels.length)result.levelReward=reward;
 stampStarterOffer(state,beforeLevel,now);
 refreshProgressionDaily(state,now);
 return result;
}
function dispatchFarmAction(state,action,now,random){
 const gates={buy_vip:'boosts',daily:'challenges',finish_batch:'boosts',replace_order:'cart',activity_start:'activities',activity_work:'activities',chore:'chores',stall_collect:'stall',stall_upgrade:'stall',mastery:'mastery',project_start:'projects',project_collect:'projects',tractor:'tractor',silo_upgrade:'silo',delivery:'cart',buy_boost:'boosts',finish_crop:'boosts',valley_sell:'valleymarket',valley_skip:'valleymarket',ranch_focus:'ranch',improve:'estateworkshop',depot_load:'tradedepot',depot_skip:'tradedepot',fair_enter:'grandfair'};
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
   // An older game sends no length: that is the 30-minute boost it always was.
   const length=action.length??'30m';
   if(action.expectedCost!==boostOffer(action.boost,length).cost)throw new Error('Boost prices have changed. Reload the game to see current prices.');
   return buyBoost(state,action.boost,now,length);
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
  case 'fields':return workFields(state,action.action,action.ids,now,action.crop??'corn');
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
  case 'valley_sell':return valleySell(state,action.stall,action.basket,now);
  case 'valley_skip':return valleySkip(state,action.stall,action.basket,now);
  case 'ranch_focus':return setRanchFocus(state,action.focus,action.expectedCost);
  case 'improve':return buildImprovement(state,action.improvement);
  case 'depot_load':return depotLoad(state,action.contract,action.item,now);
  case 'depot_skip':return depotSkip(state,action.contract,now);
  case 'fair_enter':return fairEnter(state,action.entry,action.week,now);
  default:throw new Error('Unknown farm action.');
 }
}

export const SILO_COSTS=[140,240,380,15000,65000];
export const MASTERY_TIERS=[{name:'Bronze',target:25,coins:100,xp:25},{name:'Silver',target:100,coins:350,xp:60},{name:'Gold',target:300,coins:1200,xp:150},{name:'Platinum',target:1000,coins:4000,xp:400}];
// Chores pay XP straight (a helping-hand job's worth for the quickest, more for the longer ones) and rest 5 minutes to an hour: few,
// worthwhile clicks instead of one every minute, so an autoclicker gains little. Coins per hour are what they were before the longer
// rests. Each chore done raises its bonus-find chance by CHORE_PRACTICE_STEP; at the chore's maximum it is mastered and the next unlocks.
export const CHORE_PRACTICE_STEP=4;
export const CHORES=Object.freeze({
 weeds:{name:'Clear the paths',description:'Pull weeds along the farm paths.',icon:'shovel',coins:90,xp:45,cooldown:300000,baseChance:60,maxChance:100,bonus:{item:'wheat',count:2}},
 troughs:{name:'Fill the water troughs',description:'Fresh water for the animals.',icon:'droplets',coins:133,xp:70,cooldown:600000,baseChance:40,maxChance:80,requires:'weeds',bonus:{item:'lettuce',count:2}},
 sorting:{name:'Sort the seed boxes',description:'Get tomorrow’s planting ready.',icon:'package-open',coins:225,xp:110,cooldown:1200000,baseChance:35,maxChance:60,requires:'troughs',bonus:{item:'corn',count:2}},
 fences:{name:'Mend the orchard fence',description:'Repair loose rails and keep the orchard safe.',icon:'fence',coins:360,xp:150,cooldown:1800000,baseChance:30,maxChance:70,requires:'sorting',bonus:{item:'apples',count:1}},
 irrigation:{name:'Restore the irrigation',description:'Clear the channels and bring water to the far fields.',icon:'waves',coins:594,xp:200,cooldown:2700000,baseChance:25,maxChance:65,requires:'fences',bonus:{item:'cauliflower',count:1}},
 harvestfair:{name:'Prepare the harvest fair',description:'Arrange a prize-worthy display of the farm’s best goods.',icon:'party-popper',coins:800,xp:260,cooldown:3600000,baseChance:20,maxChance:60,requires:'irrigation',bonus:{item:'pumpkin',count:1}}
});
// Guaranteed half of the original starting expected payout; the remaining budget is random.
// At every practice level expected coins/XP stay at or below the old success-only budget.
// Every chore pays a little coins and XP. The bonus roll adds goods from the farm instead of more coins: a few
// crops or goods worth about what the old coin bonus was, so a lucky chore feels like a find, not a payday.
export function choreRewards(chore,bonus=false){
 const reward=value=>Math.max(1,Math.floor(value*chore.baseChance/200));
 return {coins:reward(chore.coins),xp:chore.xp,items:bonus?{[chore.bonus.item]:chore.bonus.count}:{}};
}
export function choreStatus(state,id,now=Date.now()){
 if(!Object.hasOwn(CHORES,id))throw new Error('Choose a farm chore.');
 const c=CHORES[id],attempts=Math.max(0,Math.floor(state.chorePractice?.[id]??0));
 const chance=Math.min(c.maxChance,c.baseChance+attempts*CHORE_PRACTICE_STEP);
 const previous=c.requires?choreStatus(state,c.requires,now):null;
 return {...c,attempts,chance,mastered:chance===c.maxChance,locked:!!previous&&(previous.locked||!previous.mastered),remaining:Math.max(0,(state.chores[id]??0)-now)};
}
function secureChoreRandom(){return globalThis.crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;}
export const CHAPTER_DIAMONDS=Object.freeze([10,20,35,50,75,100,125,150,175,200]);
export const PROJECTS=Object.freeze([
 {name:'Rooted homestead',description:'Build a dependable home for your growing farm.',coins:600,input:{wheat:40,milk:12},medals:0,duration:7200000,xp:250},
 {name:'Village supplier',description:'Become the village’s everyday source of fresh food.',coins:3000,input:{corn:40,eggs:36,bread:20},medals:1,duration:28800000,xp:600},
 {name:'Irrigated gardens',description:'Turn your vegetable patch into a thriving garden.',coins:12000,input:{cabbage:50,cauliflower:35,salad:20},medals:3,duration:86400000,xp:1200},
 {name:'Artisan farmstead',description:'Establish a reputation for carefully made farm goods.',coins:45000,input:{bread:100,cheese:50,pie:30},medals:6,duration:172800000,xp:2200},
 {name:'Valley showcase',description:'Prepare a harvest worthy of the whole valley.',coins:140000,input:{sunflower:75,redcabbage:75,oil:20},medals:12,duration:259200000,xp:4000},
 {name:'Harvest estate',description:'Make your farm a lasting part of the countryside.',coins:400000,input:{pickles:100,vegetables:150,pie:100},medals:18,duration:604800000,xp:8000},
 // Chapters 7-10 (2026-09-23) are built from the goods of the three expansion waves, so each also waits for its farm level. On
 // that day no farm had finished more than three chapters, so every farm meets them in order; the ongoing commissions follow.
 {name:'Golden meadows',description:'Bees among the sunflowers and a flock on the hill: the estate makes its own wax and wool.',level:40,coins:700000,input:{beeswax:80,wool:150,squashsoup:25},medals:24,duration:345600000,xp:11000},
 {name:'The weavers’ valley',description:'Cloth, cider and goat cheese that the whole valley asks for.',level:55,coins:1100000,input:{cloth:40,cider:40,goatcheese:25},medals:30,duration:432000000,xp:15000},
 {name:'Orchard and ranch',description:'Cherry trees in bloom, candles in the windows and blankets in the ranch house.',level:70,coins:1700000,input:{cherrypie:25,cherryjam:25,blanket:12,candles:60},medals:36,duration:518400000,xp:20000},
 {name:'The grand estate',description:'Prize vegetables, full export trailers and a name known far beyond the valley.',level:85,coins:2600000,input:{prizeproduce:30,blanket:25,harvesthamper:80},medals:44,duration:604800000,xp:28000}
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
// The stall asks to be emptied (the yellow "!") once it is a quarter full: after 6 hours at stall level 1, 12 at the top.
export const STALL_NOTICE_SHARE=.25;
export function stallNotice(state,now=Date.now()){
 if(!featureUnlocked(state,'stall'))return false;
 const s=stallStatus(state,now);return s.balance>=s.capacity*STALL_NOTICE_SHARE;
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
 const bonus=random()<chore.chance/100;
 state.chorePractice??={};state.chorePractice[id]=chore.attempts+1;
 state.chores[id]=now+chore.cooldown;
 const rewards=choreRewards(chore,bonus),{coins,xp,items}=rewards;
 state.coins+=coins;state.xp+=xp;{state.stats.chores++;state.stats['chore_'+id]=(state.stats['chore_'+id]??0)+1;}
 for(const [item,count] of Object.entries(items))state.inventory[item]=(state.inventory[item]??0)+count;
 return {success:true,bonus,coins,xp,items,chance:chore.chance,nextChance:Math.min(chore.maxChance,chore.chance+CHORE_PRACTICE_STEP),attempts:chore.attempts+1,readyAt:state.chores[id]};
}
export function currentProject(state){
 const n=state.estate.completed;if(n<PROJECTS.length)return {...PROJECTS[n],id:n,diamonds:CHAPTER_DIAMONDS[n]};
 const cycle=n-PROJECTS.length+1,factor=1+cycle*.2;
 return {id:n,name:`Estate commission ${cycle}`,description:'An ongoing contract for an established estate. A larger commission follows each one.',coins:Math.round(200000*factor),input:{bread:Math.ceil(80*factor),oil:Math.ceil(30*factor),vegetables:Math.ceil(50*factor)},medals:18,duration:259200000,xp:3000+cycle*200};
}
export function startProject(state,now=Date.now()){
 if(state.estate.job)throw new Error('Finish your current estate project first.');const project=currentProject(state);
 if(project.level&&levelOf(state)<project.level)throw new Error(`Reach level ${project.level} for ${project.name}.`);
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
 greenhouse:{name:'Greenhouse',icon:'sprout',model:'greenhouse_003',coins:0,xp:42,cooldown:900000,item:'lettuce',itemCount:3,instruction:'Water the three dry seedlings.',target:'Dry seedling',other:'Healthy seedling',verb:'Water',targetIcon:'droplets',otherIcon:'sprout'},
 apiary:{name:'Apiary',icon:'flower-2',model:'apiary_001',coins:0,xp:48,cooldown:900000,item:'honey',itemCount:3,instruction:'Collect the three capped honey frames. Leave the bees at work.',target:'Capped honey',other:'Bees at work',verb:'Collect',targetIcon:'hexagon',otherIcon:'flower-2'},
 paddock:{name:'Animal paddock',icon:'heart',model:'horse_002',coins:0,xp:42,cooldown:900000,item:'fertilizer',instruction:'Refill the three empty water bowls.',target:'Empty bowl',other:'Full bowl',verb:'Fill',targetIcon:'droplet',otherIcon:'waves'},
 workshop:{name:'Tool workshop',icon:'wrench',model:'lawn_mower_001',coins:0,xp:48,cooldown:900000,item:'feed',instruction:'Repair the three worn tools. The others are ready to use.',target:'Worn tool',other:'Ready tool',verb:'Repair',targetIcon:'wrench',otherIcon:'check'}
});
export const ACTIVITY_ROUND_REWARD=Object.freeze({coins:250,xp:60});
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
export const FAMILY_CONFIG=Object.freeze({MAX_MEMBERS:10,MIN_CONTRIB_POINTS:500,JOIN_COOLDOWN_MS:48*3600000,RENAME_COOLDOWN_MS:7*DAY_MS,ATTEMPTS_PER_HOUR:10,TOURNAMENT_FIRST_MIN:100,TOURNAMENT_FIRST_MAX:5000,TOURNAMENT_PER_EXTRA_FAMILY:25,ORDER_PLAYER_WEEK_DIAMOND_CAP:25,TOURNAMENT_MIN_POINTS:1,ORDER_COIN_MULTIPLIER:1.25,ORDER_XP_PER_VALUE:1/100,ORDER_DIAMOND_BASE:1,ORDER_DIAMOND_MAX:3,ORDER_COMPLETION_DIAMONDS:4,REWARD_WEEKS:8,ORDER_MIN_VALUE_PER_MEMBER:16000,ORDER_MAX_VALUE_PER_MEMBER:30000,RANK_WEIGHTS:[1,.6,.4]});
export const FAMILY_EMBLEMS=Object.freeze(['wheat','corn','sunflower','apples','berries','honey','bread','milk','eggs','tractor','farm','trophy','family-bee','family-oak','family-barn','pumpkin','greenbeans','cheese','applejuice','berrypreserves','harvesthamper','family-fox','family-owl','family-windmill','family-horseshoe'].map((icon,i)=>({id:String(i),icon,color:['#6b8e50','#c39538','#b57851','#517c83','#8b6a95','#a66c71'][i%6]})));
export function familyUnlocked(state,minLevel=FAMILY_MIN_LEVEL){return levelOf(state)>=minLevel;}
export function familyUnlockHint(minLevel=FAMILY_MIN_LEVEL){return `Reach level ${minLevel} to unlock Farm Family.`;}
export function familyWeek(now=Date.now()){return Math.floor((now-4*DAY_MS)/(7*DAY_MS));}
export function familyWeekStart(week){return 4*DAY_MS+week*7*DAY_MS;}
// The weekly Family Order is the same for every family: four crops or goods drawn at random from everything in the game
// (every crop and good, whatever a family can make yet), so there is always a reason to unlock more and to share. The
// amounts follow the value: about 20,000 coins of goods per member, at most 150 of one thing per member, cheap things
// first so the rest of the value moves to the dearer lines; four cheap draws swap the last for a dearer good, and a week
// never asks for two of the dearest goods.
const FAMILY_ORDER_VALUE=20000,FAMILY_ORDER_MAX_COUNT=150,FAMILY_ORDER_LINES=4;
// Realistic in one week, also when only one member can make a thing: a whole line never needs more than 3 days (72 hours) of
// production from one farm, on one production slot for a good or on 12 fields for a crop (2 per harvest). Solo families never
// reach this; a bigger family then gets a little less than size x the solo amount.
const FAMILY_LINE_HOURS=72,FAMILY_LINE_FIELDS=12;
export function familyLineCap(item){
 if(CROPS[item])return FAMILY_LINE_FIELDS*Math.max(1,Math.floor(FAMILY_LINE_HOURS*3600000/CROPS[item].duration))*2;
 const perUnit=Math.min(...Object.values(RECIPES).filter(r=>r.output[item]&&r.building!=='factory').map(r=>r.duration/r.output[item]));
 return Math.max(1,Math.floor(FAMILY_LINE_HOURS*3600000/perUnit));
}
const niceCount=n=>n<10?Math.max(1,Math.round(n)):n<50?Math.round(n/5)*5:Math.round(n/10)*10;
// Goods added to the game join the Family Order from a later week: the draw picks from the list of goods, so a longer list
// would give a family that opens its order late in the week a different order than the families before it.
export const FAMILY_ORDER_FROM_WEEK=Object.freeze({truffles:2960,truffleomelette:2960});   // week 2960 starts Monday 28 September 2026
export function familyOrder(familyId,week,members,config=FAMILY_CONFIG){
 if(!Number.isInteger(members)||members<1||members>config.MAX_MEMBERS)throw new Error('Choose a valid family size.');
 const pool=Object.keys(ITEMS).filter(k=>ITEMS[k].sell>0&&(FAMILY_ORDER_FROM_WEEK[k]??0)<=week),picked=[];let draw=0;
 const next=()=>pool[calendarHash(`family-order-v2:${week}:${draw++}`)%pool.length];
 // At most one of the dearest goods (5,000+ coins each, such as a blanket) in one week.
 const dear=k=>ITEMS[k].sell>=5000;
 while(picked.length<FAMILY_ORDER_LINES){const k=next();if(!picked.includes(k)&&!(dear(k)&&picked.some(dear)))picked.push(k);}
 if(picked.every(k=>ITEMS[k].sell<300))for(;;){const k=next();if(!picked.includes(k)&&ITEMS[k].sell>=300){picked[FAMILY_ORDER_LINES-1]=k;break;}}
 let budget=FAMILY_ORDER_VALUE;const perMember={};
 [...picked].sort((a,b)=>ITEMS[a].sell-ITEMS[b].sell).forEach((k,i,list)=>{const n=Math.max(1,Math.min(FAMILY_ORDER_MAX_COUNT,familyLineCap(k),niceCount(budget/(list.length-i)/ITEMS[k].sell)));perMember[k]=n;budget-=n*ITEMS[k].sell;});
 const lines=Object.fromEntries(Object.entries(perMember).map(([k,n])=>[k,Math.max(n,Math.min(n*members,familyLineCap(k)))]));
 return {lines,value:Object.entries(lines).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0),members};
}
// From which level a guided farm can grow or make an item (Infinity: only the Factory makes it). The Family Order shows it on
// a line a farmer cannot make yet.
// The building of the easiest way to make a good (null for a crop): "needs the Mill" on a line a farmer has the level for.
export function itemBuilding(item){
 if(CROPS[item])return null;
 let best=null,level=Infinity;
 for(const [id,r] of Object.entries(RECIPES)){if(!r.output[item]||r.building==='factory')continue;const needs=Math.max(BUILDING_LEVELS[r.building]??1,RECIPE_LEVELS[id]??1,...Object.keys(r.input).map(k=>itemUnlockLevel(k)));if(needs<level){level=needs;best=r.building;}}
 return best;
}
export function itemUnlockLevel(item,seen=new Set()){
 if(CROPS[item])return CROP_LEVELS[item]??1;
 if(seen.has(item))return Infinity;
 const path=new Set([...seen,item]);
 let level=['honey','feed','fertilizer'].includes(item)?FEATURE_LEVELS.activities:Infinity;
 for(const [id,r] of Object.entries(RECIPES)){
  if(!r.output[item]||r.building==='factory')continue;
  const needs=[BUILDING_LEVELS[r.building]??1,RECIPE_LEVELS[id]??1,...(r.requiresBuildings??[]).map(k=>BUILDING_LEVELS[k]??1),...Object.keys(r.input).map(k=>itemUnlockLevel(k,path))];
  level=Math.min(level,Math.max(...needs));
 }
 return level;
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
 // A guaranteed first prize that grows with every other family taking part this week (a family takes part when a current
 // member contributed). How many members a family has does not matter.
 const firstPrize=Math.min(config.TOURNAMENT_FIRST_MAX,config.TOURNAMENT_FIRST_MIN+Math.max(0,qualifying.length-1)*config.TOURNAMENT_PER_EXTRA_FAMILY);
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
 if(!order){const members=familyMembers(c,f.id);const generated=familyOrder(f.id,week,members.length,config);order={family_id:f.id,week,lines:generated.lines,filled:{},member_count:generated.members,value:generated.value,created_at:now,completed_at:null};c.orders.push(order);}
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
 // Your family's place for the Tournament tab: its points and how far the family above is ahead.
 const place=board.qualifying.findIndex(f=>f.family_id===family?.id),above=place>0?board.qualifying[place-1]:null;
 const rewards=c.rewards.filter(r=>r.player_id===player&&!r.claimed_at&&r.expires_at>now).map(({id,week,kind,coins,xp,diamonds,expires_at})=>({id,week,kind,coins,xp,diamonds,expiresAt:expires_at}));
 const members=family?familyMembers(c,family.id).map(m=>{const p=c.players.find(p=>p.player_id===m.player_id),points=c.contributions.find(r=>r.family_id===family.id&&r.player_id===m.player_id&&r.week===week)?.points??0;return {id:m.id,playerId:m.player_id,username:p?.username??'Farmer',avatarId:p?.avatar_id??'default',level:p?.level??1,vipExpiresAt:Date.parse(p?.vip_expires_at)||0,online:p?.online===true,points,role:m.role,isSelf:m.player_id===player};}):[];
 const card=f=>({id:f.id,name:f.name,emblem:f.emblem,members:familyMembers(c,f.id).length});
 const pending=(c.invitations??[]).filter(i=>i.status==='pending'&&i.expires_at>now&&c.families.some(f=>f.id===i.family_id&&!f.deleted_at)&&!familyCurrent(c,i.recipient_id));
 const incoming=pending.find(i=>i.recipient_id===player);
 const invitedFamily=incoming?c.families.find(f=>f.id===incoming.family_id):null;
 const invitation=incoming?{id:incoming.id,family:card(invitedFamily),invitedBy:c.players.find(p=>p.player_id===incoming.invited_by)?.username??'Family leader',expiresAt:incoming.expires_at,canAccept:!family&&(me?.cooldown_until??0)<=now&&familyMembers(c,invitedFamily.id).length<config.MAX_MEMBERS}:null;
 const sentInvitations=family&&me?.role==='leader'?pending.filter(i=>i.family_id===family.id).map(i=>({id:i.id,recipientId:i.recipient_id,username:c.players.find(p=>p.player_id===i.recipient_id)?.username??'Farmer',expiresAt:i.expires_at})):[];

 return {invitation,sentInvitations,week,endsAt:familyWeekStart(week+1),serverNow:now,config:{minLevel:FAMILY_MIN_LEVEL,maxMembers:config.MAX_MEMBERS,minPoints:config.MIN_CONTRIB_POINTS,diamondCap:config.TOURNAMENT_FIRST_MAX+config.ORDER_PLAYER_WEEK_DIAMOND_CAP,orderDiamondCap:config.ORDER_PLAYER_WEEK_DIAMOND_CAP},family:family?{...card(family),open:family.is_open,leader:me.role==='leader',renameAt:(family.renamed_at??0)+config.RENAME_COOLDOWN_MS}:null,cooldownUntil:me?.cooldown_until??0,openFamilies:c.families.filter(f=>!f.deleted_at&&f.is_open&&familyMembers(c,f.id).length<config.MAX_MEMBERS).slice(0,30).map(card),members,order:order?{lines:order.lines,filled:order.filled,completed:!!order.completed_at,value:order.value,memberCount:order.member_count}:null,yourPoints:current?.points??0,yourOrderPoints:current?.order_points??0,extraUsed:current?.extra_points??0,contributionLocked,rewards,rewardPreview:{coins:Math.floor((current?.order_points??0)*MARKET_PAYOUT_MULTIPLIER*config.ORDER_COIN_MULTIPLIER),xp:Math.floor((current?.order_points??0)*config.ORDER_XP_PER_VALUE),diamonds:Math.min(config.ORDER_DIAMOND_MAX,config.ORDER_DIAMOND_BASE+Math.floor((current?.order_points??0)/10000)),completionBonus:config.ORDER_COMPLETION_DIAMONDS},tournament:{pool:board.pool,minimumPool:config.TOURNAMENT_FIRST_MIN,firstPrize:board.firstPrize,firstPrizeMin:config.TOURNAMENT_FIRST_MIN,firstPrizeMax:config.TOURNAMENT_FIRST_MAX,perExtraFamily:config.TOURNAMENT_PER_EXTRA_FAMILY,activePlayers:board.activePlayers,activeFamilies:board.qualifying.length,yourRank:yourPrize?.rank??null,yourDiamonds:yourPrize?.shares[player]??0,familyDiamonds:yourPrize?.diamonds??0,entered:!!yourPrize&&Object.hasOwn(yourPrize.shares,player),placePrizes:config.RANK_WEIGHTS.map(weight=>Math.floor(board.firstPrize*weight)),familiesForMax:Math.ceil((config.TOURNAMENT_FIRST_MAX-config.TOURNAMENT_FIRST_MIN)/config.TOURNAMENT_PER_EXTRA_FAMILY)+1,familyPoints:place>=0?board.qualifying[place].points:0,pointsBehind:above?above.points-board.qualifying[place].points:0,top:board.qualifying.slice(0,10).map((f,i)=>({name:f.name,emblem:f.emblem,points:f.points,activeMembers:f.active_members,qualified:true,diamonds:board.prizes[i].diamonds})),past:c.results.filter(r=>r.week>=week-4&&r.week<week).sort((a,b)=>b.week-a.week||a.rank-b.rank).map(r=>({week:r.week,name:r.name,rank:r.rank,points:r.points,activeMembers:r.active_members,diamonds:r.diamonds_pool}))}};
}
