// Your own 3D farmer's parts and which go together (21 Oct 2026): the one rule file the farm, the page and farm-api share (game/farmer-parts.js,
// copied beside each farm-state.js by scripts/sync-game.mjs).
import {validFarmerConfig,farmerOwned,cleanFarmer,FAMILY_SHIRTS,farmerPassParts} from './farmer-parts.js';
import {normalizeLayout,moveThing,clearObstacle,placeDecor,storeDecor,editDrawn,purchaseDecor,giftDecor} from './farm-map.js';
export const FAMILY_MIN_LEVEL=10;
// The season crops (Season Pass, Autumn 2026 on): grown on an ordinary field, but planted only with a seed packet from the pass
// (state.seasonSeeds) and only while their season runs (seasonCropOpen). No seed price, no medal, no leaderboard, no Starter Pack, no
// family sharing or Family Order: they are in CROPS as a property that is not listed (Object.keys(CROPS) and every list made from it
// skip them, while CROPS[key] still finds a growing one for the fields, the scene and the tractor), and in ITEMS at the end (storage
// and the market, at one fixed price: fixedPrice). Cranberries: the berry bush bush_003 in a deep red, a little lower, 4 hours,
// harvested once (the field is empty after it, unlike the berries), 400 coins each at the market (sell 500 × the market's 0.8).
// Brussels sprouts (Winter 2026 on, 21 Oct 2026): the same rules, on the cabbage plant plant_004 in a fresh sprout green and a little
// taller, so a field of them reads as sprout stalks rather than cabbages. The item key is 'sprouts'; its pictures are brussels-sprouts.
export const SEASON_CROPS=Object.freeze({
 cranberries:Object.freeze({name:'Cranberries',seedName:'Cranberry seeds',cost:0,sell:500,duration:14400000,xp:18,model:'bush_003',height:.72,use:'Sell at the market',tint:0xb0283c,season:'autumn',seedOnly:true,fixedPrice:true}),
 sprouts:Object.freeze({name:'Brussels sprouts',seedName:'Brussels sprout seeds',cost:0,sell:500,duration:14400000,xp:18,model:'plant_004',height:.62,use:'Sell at the market',tint:0x6fa83a,season:'winter',seedOnly:true,fixedPrice:true})
});
export const seasonCrop=key=>typeof key==='string'&&Object.hasOwn(SEASON_CROPS,key);
const withSeasonCrops=crops=>{for(const [key,crop] of Object.entries(SEASON_CROPS))Object.defineProperty(crops,key,{value:crop,enumerable:false});return crops;};
// Seeds cost a third and a harvest gives two thirds of the XP (wheat 1) since 22 Oct 2026 (one crop a harvest, see CARE_AT): a farmer who waters
// and cares harvests four times as often for the same crops. The trees and bushes, planted once, kept their price.
export const CROPS = Object.freeze(withSeasonCrops({
 corn:       {name:'Corn',cost:3,sell:40,duration:900000,xp:3,model:'plant_001',height:1.55,use:'Animal feed'},
 wheat:      {name:'Wheat',cost:1,sell:8,duration:120000,xp:1,model:'plant_011',height:.85,use:'Flour & bread'},
 cabbage:    {name:'Cabbage',cost:13,sell:110,duration:7200000,xp:12,model:'plant_004',height:.48,use:'Vegetable boxes'},
 pumpkin:    {name:'Pumpkin',cost:32,sell:250,duration:28800000,xp:24,model:'plant_003',height:.8,use:'Pumpkin pies'},
 sunflower:  {name:'Sunflower',cost:60,sell:480,duration:86400000,xp:45,model:'plant_007',height:1.65,use:'Sunflower oil'},
 barley: {name:'Barley',cost:7,sell:85,duration:2700000,xp:8,model:'plant_010',height:1.05,use:'Animal feed',art:'/assets/icons/barley.svg'},
 lettuce:{name:'Lettuce',cost:2,sell:20,duration:300000,xp:2,model:'plant_005',height:.47,use:'Fresh salads',art:'/assets/icons/lettuce.svg'},
 redcabbage:{name:'Red cabbage',cost:43,sell:340,duration:43200000,xp:32,model:'plant_004',height:.6,use:'Pickled vegetables',art:'/assets/icons/redcabbage.svg',tint:0xb66cce},
 cauliflower:{name:'Cauliflower',cost:22,sell:175,duration:14400000,xp:18,model:'plant_005',height:.5,use:'Vegetable boxes'},
 greenbeans:{"name": "Green beans", "cost": 15, "sell": 90, "duration": 5400000, "xp": 14, "model": "plant_006", "height": 1.25, "use": "Vegetable stew", "minLevel": 6},
 apples:{"name": "Apples", "cost": 700, "sell": 100, "duration": 43200000, "regrow": 21600000, "xp": 22, "model": "tree_009", "height": 1.8, "use": "Apple juice & apple pie", "minLevel": 8, "perennial": true},
 berries:{"name": "Berries", "cost": 1000, "sell": 130, "duration": 28800000, "regrow": 14400000, "xp": 18, "model": "bush_003", "height": 0.95, "use": "Berry preserves & berry tart", "minLevel": 10, "perennial": true},
 // The midgame expansion (levels 28-46). Each crop grows on its own model from the farm pack: a squash vine, climbing beans on a
 // pole and a second, bigger apple tree. Prices follow the crops just below them; the two perennials regrow like the berries.
 squash:{"name": "Squash", "cost": 73, "sell": 560, "duration": 57600000, "xp": 40, "model": "plant_002", "height": 0.8, "use": "Squash soup & the glasshouse", "minLevel": 28},
 polebeans:{"name": "Pole beans", "cost": 1400, "sell": 160, "duration": 21600000, "regrow": 10800000, "xp": 20, "model": "plant_009", "height": 1.7, "use": "Squash soup", "minLevel": 31, "perennial": true},
 ciderapples:{"name": "Cider apples", "cost": 1600, "sell": 180, "duration": 50400000, "regrow": 25200000, "xp": 27, "model": "tree_010", "height": 1.9, "use": "Sparkling cider", "minLevel": 46, "perennial": true},
 // Wave 2 (levels 54-70): a cherry tree that regrows like the other orchard trees.
 cherries:{"name": "Cherries", "cost": 2000, "sell": 220, "duration": 57600000, "regrow": 28800000, "xp": 31, "model": "tree_011", "height": 1.9, "use": "Cherry jam & cherry pie", "minLevel": 66, "perennial": true}
}));
export const PRODUCTS = Object.freeze({
 honey:{name:'Honey',sell:35,icon:'hexagon',color:'gold'},
 grainmeal:{name:'Grain meal',sell:180,icon:'wheat',color:'wheat'},
 fertilizer:{name:'Natural fertilizer',sell:260,icon:'sprout',color:'green'},
 salad:{name:'Fresh salad',sell:450,icon:'salad',color:'green'},
 pickles:{name:'Pickled cabbage',sell:1100,icon:'amphora',color:'coral'},
 flour:{name:'Flour',sell:60,icon:'wheat',color:'wheat'},
 // Animal feed (26 Sep 2026): feed for your animals, not a trade good, so it sells for 60 (was 115), and every feed recipe gives more:
 // corn 2 -> 2, barley 2 -> 3 and 8 -> 13 (the Windmill stays the most barley-efficient), and wheat 5 -> 1 (new). Turning crops into
 // feed still earns a little more than selling them.
 feed:{name:'Animal feed',sell:60,icon:'package-open',color:'wheat'},
 oil:{name:'Sunflower oil',sell:1600,icon:'droplet',color:'gold'},
 milk:{name:'Milk',sell:80,icon:'milk',color:'blue'},
 eggs:{name:'Eggs',sell:50,icon:'egg',color:'cream'},
 cheese:{name:'Cheese',sell:230,icon:'sandwich',color:'gold'},
 bread:{name:'Fresh bread',sell:340,icon:'croissant',color:'wheat'},
 pie:{name:'Fresh pumpkin pie',sell:1250,icon:'cake-slice',color:'coral'},
 vegetables:{name:'Vegetable box',sell:1700,icon:'salad',color:'green'},
 applejuice:{"name": "Apple juice", "sell": 650, "icon": "package-check", "color": "gold"},
 applepie:{"name": "Apple pie", "sell": 1200, "icon": "package-check", "color": "gold"},
 berrypreserves:{"name": "Berry preserves", "sell": 850, "icon": "package-check", "color": "gold"},
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
prizeproduce:{"name": "Prize produce", "sell": 9800, "icon": "award", "color": "gold"},
// World II (level 100+): the farm bakes with the village's heirloom flour (see VILLAGE_GOODS).
goldenloaf:{"name": "Golden loaf", "sell": 3800, "icon": "croissant", "color": "gold", "world": 2},
heirloompie:{"name": "Heirloom pie", "sell": 8600, "icon": "cake-slice", "color": "gold", "world": 2}

});
// Heirloom varieties (the Seed Lab, level 92; 27 Sep 2026): a cross of two crops, grown in the lab's test beds, never on a field, so
// they are not crops of the farm (no seeds, no mastery, not in the Starter Pack). Five open every two levels. A cross takes a set
// amount of each parent (about 2,400 coins' worth, 5 to 120 of it) and gives 4 heirlooms worth half as much again as the parents.
export const LAB_PARENT_VALUE=2400,LAB_YIELD=4,LAB_PREMIUM=1.5;
const HEIRLOOM_LIST=[
 ['savoycabbage','Savoy cabbage','cabbage','lettuce',92],['romanesco','Romanesco','cauliflower','cabbage',92],['goldenwheat','Golden wheat','wheat','sunflower',92],['rainbowcorn','Rainbow corn','corn','sunflower',92],['speckledlettuce','Speckled lettuce','lettuce','redcabbage',92],
 ['ghostpumpkin','Ghost pumpkin','pumpkin','cauliflower',94],['purplecauliflower','Purple cauliflower','cauliflower','redcabbage',94],['bluecorn','Blue corn','corn','berries',94],['stripedsquash','Striped squash','squash','pumpkin',94],['dragonbeans','Dragon tongue beans','greenbeans','redcabbage',94],
 ['bluepumpkin','Blue pumpkin','pumpkin','berries',96],['blackbarley','Black barley','barley','cherries',96],['purplebeans','Purple beans','polebeans','berries',96],['goldenapple','Golden apple','apples','sunflower',96],['goldenraspberries','Golden raspberries','berries','sunflower',96],
 ['redsunflower','Red sunflower','sunflower','cherries',98],['scarletrunners','Scarlet runner beans','polebeans','cherries',98],['pinkpearl','Pink pearl apple','apples','cherries',98],['russetapple','Russet apple','ciderapples','apples',98],['rainiercherries','Rainier cherries','cherries','ciderapples',98]
];
export const labParentCount=crop=>Math.max(5,Math.min(120,Math.round(LAB_PARENT_VALUE/CROPS[crop].sell)));
export const HEIRLOOMS=Object.freeze(Object.fromEntries(HEIRLOOM_LIST.map(([key,name,a,b,level])=>{
 const input={[a]:labParentCount(a),[b]:labParentCount(b)},value=Object.entries(input).reduce((sum,[k,n])=>sum+CROPS[k].sell*n,0);
 return [key,Object.freeze({name,parents:Object.freeze([a,b]),input:Object.freeze(input),level,sell:Math.round(value*LAB_PREMIUM/LAB_YIELD/10)*10,heirloom:true})];
})));
// World II, The Village (30 Sep 2026): a second, smaller world for levels 100-200, where the farm's goods feed miners and
// woodcutters and the village sends back what lets the farm grow past its top (see WORLD_TWO_LEVEL below). Village goods share the
// storage but have their own tab and their own market: they never show in the farm's Market, Family Orders, family sharing, the
// Starter Pack or the World I leaderboards (villageGood). Each sells for about 1.4 times what goes into it, like the farm's goods.
// The village's crops (crop:true, Oct 2026) grow in the Village Fields, never on a farm field: they are not CROPS (no seeds, no mastery,
// not in the Starter Pack) and sell at the Village market only. The goods of levels 110-200 (noBoard:true) have no leaderboard of their
// own; "Villagers helped" is the village's board for them. Always added at the end, in this order: requests and cargos follow it.
export const VILLAGE_GOODS=Object.freeze({
 packedlunch:{name:'Packed lunch',sell:370,village:true,world:2},
 stone:{name:'Stone',sell:45,village:true,world:2},
 ironore:{name:'Iron ore',sell:70,village:true,world:2},
 timber:{name:'Log',sell:90,village:true,world:2},
 plank:{name:'Plank',sell:195,village:true,world:2},
 ironbar:{name:'Iron bar',sell:650,village:true,world:2},
 pickaxe:{name:'Pickaxe',sell:600,village:true,world:2},
 silverore:{name:'Silver ore',sell:400,village:true,world:2},
 silverbar:{name:'Silver bar',sell:2500,village:true,world:2},
 mastertools:{name:'Master tools',sell:9400,village:true,world:2},
 heirloomflour:{name:'Heirloom flour',sell:1200,village:true,world:2},
 gemstone:{name:'Ruby',sell:2400,village:true,world:2},
 // World II, levels 110-200 (Oct 2026): the Village Fields' four crops, the Potter's Kiln's clay and roof tiles, linen, the builder's
 // crate for the farm's upgrades, the Soap Maker's two goods, the Jeweller's candlestick and ring, and the canteen's saffron buns.
 potatoes:{name:'Potatoes',sell:75,village:true,world:2,crop:true,noBoard:true},
 flax:{name:'Flax',sell:110,village:true,world:2,crop:true,noBoard:true},
 lavender:{name:'Lavender',sell:170,village:true,world:2,crop:true,noBoard:true},
 saffron:{name:'Saffron',sell:650,village:true,world:2,crop:true,noBoard:true},
 clay:{name:'Clay',sell:70,village:true,world:2,noBoard:true},
 rooftile:{name:'Roof tile',sell:220,village:true,world:2,noBoard:true},
 linen:{name:'Linen',sell:480,village:true,world:2,noBoard:true},
 builderscrate:{name:'Builder’s crate',sell:6500,village:true,world:2,noBoard:true},
 lavendersoap:{name:'Lavender soap',sell:560,village:true,world:2,noBoard:true},
 scentedsachet:{name:'Scented sachet',sell:580,village:true,world:2,noBoard:true},
 silvercandlestick:{name:'Silver candlestick',sell:10500,village:true,world:2,noBoard:true},
 rubyring:{name:'Ruby ring',sell:14000,village:true,world:2,noBoard:true},
 saffronbun:{name:'Saffron bun',sell:2100,village:true,world:2,noBoard:true}
});
export const villageGood=key=>ITEMS[key]?.village===true;
// Everything of World II (the village goods, and the farm's bakes with heirloom flour): never shared with a family, never in a
// Family Order or on the World I leaderboards.
export const worldTwoItem=key=>ITEMS[key]?.world===2;
export const ITEMS=Object.freeze({...CROPS,...PRODUCTS,...HEIRLOOMS,...VILLAGE_GOODS,...SEASON_CROPS});
// A season crop in storage: never shared with a family, gifted or asked for in a Family Order (SEASON_CROPS).
export const seasonItem=key=>seasonCrop(key);
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
// How far a price can move from normal in a day (the wiki reads these): crops a little, goods more. Sunflower oil swung 0.5-2x as
// the market's gamble until 27 Sep 2026; now it moves like every other good.
export const MARKET_RANGES=Object.freeze({crops:Object.freeze([.85,1.15]),goods:Object.freeze([.7,1.6])});
export function marketQuote(item,now=Date.now()){
 if(!Object.hasOwn(ITEMS,item))throw new Error('Choose a valid market item.');
 const base=ITEMS[item].sell,range=ITEMS[item].fixedPrice?[1,1]:Object.hasOwn(CROPS,item)||Object.hasOwn(HEIRLOOMS,item)||ITEMS[item].crop===true?MARKET_RANGES.crops:MARKET_RANGES.goods;   // the village's crops move like the farm's (Oct 2026)
 const baseMin=Math.max(1,Math.round(base*range[0])),baseMax=Math.round(base*range[1]);
 const position=MARKET_CURVE[calendarHash(`market-v1:${utcDay(now)}:${item}`)%MARKET_CURVE.length];
 const originalPrice=Math.round(position<=.5?baseMin+(base-baseMin)*position*2:base+(baseMax-base)*(position-.5)*2);
 const price=reducedMarketPrice(originalPrice),normal=reducedMarketPrice(base),min=reducedMarketPrice(baseMin),max=reducedMarketPrice(baseMax);
 const change=Math.round((price/normal-1)*100),demand=change< -10?'low':change>10?'high':'fair';
 return {item,day:utcDay(now),price,normal,min,max,change,demand,label:demand==='low'?'Low demand':demand==='high'?'High demand':'Fair price',resetsAt:(dayNumber(now)+1)*DAY_MS};
}
export function marketValue(items,now=Date.now()){return Object.entries(items).reduce((sum,[key,count])=>sum+marketQuote(key,now).price*count,0);}
export function marketHighlights(now=Date.now(),state){
 // World II's bakes only from level 100 (Oct 2026): a legacy farm below it was told golden loaf or heirloom pie was today's best price.
 const keys=(state&&guidedFarm(state)?Object.keys(ITEMS).filter(k=>!villageGood(k)&&(state.inventory[k]>0||itemAvailable(state,k))):Object.keys(PRODUCTS)).filter(k=>!worldTwoItem(k)||(state&&worldTwoOpen(state)));
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
 sheepbarn:{"name": "Sheep Barn", "tagline": "A friendly flock and soft wool, shorn with care.", "icon": "cloud", "model": "hangar_015", "type": "production", "upgradeCost": 1050, "minLevel": 37, "buildCost": 26000},
 glasshouse:{"name": "Glasshouse", "tagline": "Warm beds under glass: a crate of vegetables or sunflowers from fertilizer, no field needed.", "icon": "sprout", "model": "greenhouse_004", "type": "production", "upgradeCost": 1200, "minLevel": 40, "buildCost": 40000},
 weaving:{"name": "Weaving Shed", "tagline": "Spin wool into yarn and weave it into fine cloth.", "icon": "package-check", "model": "house_018", "type": "production", "upgradeCost": 1300, "minLevel": 43, "buildCost": 55000},
 // Wave 2: goats beside the sheep, and a workshop for the Bee Yard's wax and the Weaving Shed's cloth.
 pigfarm:{"name": "Pig Farm", "tagline": "Happy pigs with clever noses, digging up truffles.", "icon": "package-check", "model": "house_019", "type": "production", "upgradeCost": 900, "minLevel": 29, "buildCost": 14000},
 goatshed:{"name": "Goat Shed", "tagline": "Curious goats, creamy milk and a cheese to be proud of.", "icon": "milk", "model": "hangar_015", "type": "production", "upgradeCost": 1400, "minLevel": 54, "buildCost": 72000},
 craftshop:{"name": "Craft Workshop", "tagline": "Hand-poured beeswax candles and warm wool blankets.", "icon": "flame", "model": "hangar_019", "type": "production", "upgradeCost": 1500, "minLevel": 58, "buildCost": 90000},
 factory:{"name": "Factory", "tagline": "Every good in huge batches, for the fields and upgrades of a lasting estate.", "icon": "factory", "model": "hangar_007", "type": "production", "upgradeCost": 800, "minLevel": FACTORY_LEVEL, "buildCost": FACTORY_COST},
 // World II, The Village: its places work like the farm's buildings (slots, recipes, upgrades to level 10), in the village only.
 // Since Oct 2026 each is built from a golden brief at the market square (VILLAGE_BRIEFS): these coins and the brief's goods.
 mine:{name:'Mine',tagline:'Stone and iron from the mountain, silver and rubies deeper down.',icon:'pickaxe',model:null,type:'production',upgradeCost:1600,minLevel:100,buildCost:75000,world:2},
 lumbercamp:{name:'Lumber Camp',tagline:'Logs from the forest, sawn into planks.',icon:'axe',model:null,type:'production',upgradeCost:1600,minLevel:100,buildCost:75000,world:2},
 smithy:{name:'Smithy',tagline:'Iron and silver bars, pickaxes and master tools for the farm.',icon:'hammer',model:null,type:'production',upgradeCost:1800,minLevel:102,buildCost:150000,world:2},
 villagemill:{name:'Village Windmill',tagline:'Grind golden wheat into heirloom flour.',icon:'wind',model:null,type:'production',upgradeCost:2000,minLevel:112,buildCost:250000,world:2},
 // Levels 110-150 (Oct 2026, the owner's plan): six more places like the Mine (upgradeCost has no effect: the brief price and the ladder
 // decide every step) and the Pier, which makes nothing (type 'pier': no slots, no upgrades) and only carries the town boat.
 villagefields:{name:'Village Fields',tagline:'Potatoes, flax, lavender and saffron, sown with fertilizer and coins.',icon:'sprout',model:null,type:'production',upgradeCost:2000,minLevel:110,buildCost:150000,world:2},
 canteen:{name:'Miners’ Canteen',tagline:'Pasty lunches without apples, and saffron buns.',icon:'utensils',model:null,type:'production',upgradeCost:2000,minLevel:113,buildCost:200000,world:2},
 kiln:{name:'Potter’s Kiln',tagline:'Clay from the pit, fired into roof tiles.',icon:'flame',model:null,type:'production',upgradeCost:2000,minLevel:118,buildCost:250000,world:2},
 linenloft:{name:'Linen Loft',tagline:'Flax woven into fine linen.',icon:'scroll',model:null,type:'production',upgradeCost:2000,minLevel:125,buildCost:300000,world:2},
 soapmaker:{name:'Soap Maker',tagline:'Lavender soap and scented sachets.',icon:'droplets',model:null,type:'production',upgradeCost:2000,minLevel:135,buildCost:350000,world:2},
 pier:{name:'Pier',tagline:'The old pier, mended: the town boat calls for your finest goods.',icon:'anchor',model:null,type:'pier',minLevel:144,buildCost:400000,world:2},
 jeweller:{name:'Jeweller',tagline:'Silver candlesticks and ruby rings.',icon:'gem',model:null,type:'production',upgradeCost:2000,minLevel:150,buildCost:450000,world:2}
});
export const worldTwoBuilding=key=>BUILDINGS[key]?.world===2;
const BASE_RECIPES=Object.freeze({
 grainmeal:{building:'windmill',name:'Grind grain meal',input:{wheat:8,barley:4},output:{grainmeal:3},duration:1200000,xp:30},
 fertilizer:{building:'windmill',name:'Mix natural fertilizer',input:{grainmeal:2,cabbage:2},output:{fertilizer:3},duration:1800000,xp:40},
 windflour:{building:'windmill',name:'Mill a large flour batch',input:{grainmeal:3},output:{flour:14},duration:720000,xp:24},
 windfeed:{building:'windmill',name:'Wind-milled barley feed',input:{barley:8},output:{feed:13},duration:1200000,xp:32},
 barleyfeed:{building:'mill',name:'Mix barley feed',input:{barley:2},output:{feed:3},duration:120000,xp:6},
 salad:{building:'packing',name:'Prepare a fresh salad',input:{lettuce:4,cabbage:2},output:{salad:1},duration:900000,xp:14},
 pickles:{building:'packing',name:'Pickle red cabbage',input:{redcabbage:2},output:{pickles:1},duration:7200000,xp:60},
 flour:{building:'windmill',name:'Refine grain meal into flour',input:{grainmeal:1},output:{flour:4},duration:240000,xp:8},
 feed:{building:'mill',name:'Mix corn feed',input:{corn:2},output:{feed:2},duration:120000,xp:4},   // 'Mix animal feed' until 19 Oct 2026 (the owner: like Mix barley feed)
 wheatfeed:{building:'mill',name:'Mix wheat feed',input:{wheat:5},output:{feed:1},duration:120000,xp:3},
 oil:{building:'mill',name:'Press sunflower oil',input:{sunflower:2},output:{oil:1},duration:14400000,xp:80},
 milk:{building:'dairy',name:'Feed the cows',input:{feed:1},output:{milk:2},duration:600000,xp:10},
 cheese:{building:'dairy',name:'Make farmhouse cheese',input:{milk:2},output:{cheese:1},duration:1800000,xp:24},
 eggs:{building:'coop',name:'Feed the chickens',input:{feed:1},output:{eggs:3},duration:300000,xp:10},
 bread:{building:'bakery',name:'Bake fresh bread',input:{flour:4,milk:2},output:{bread:2},duration:1200000,xp:16},
 // World II: lunch for the village's miners and woodcutters, and the farm's bakes with heirloom flour from the village.
 packedlunch:{building:'kitchen',name:'Pack lunches for the village',input:{bread:2,cheese:2,apples:4},output:{packedlunch:6},duration:1800000,xp:30,minLevel:100},
 goldenloaf:{building:'bakery',name:'Bake a golden loaf',input:{heirloomflour:2,milk:2,eggs:2},output:{goldenloaf:1},duration:10800000,xp:150,minLevel:112},
 heirloompie:{building:'kitchen',name:'Bake an heirloom pie',input:{heirloomflour:2,goldenapple:2,eggs:2},output:{heirloompie:1},duration:14400000,xp:200,minLevel:115},
 pie:{building:'bakery',name:'Bake fresh pumpkin pie',input:{flour:2,pumpkin:2,eggs:2},output:{pie:1},duration:7200000,xp:50},
 vegetables:{building:'packing',name:'Pack a vegetable box',input:{cabbage:4,cauliflower:4},output:{vegetables:1},duration:3600000,xp:30},
 stew:{"building": "kitchen", "name": "Simmer vegetable stew", "input": {"greenbeans": 4, "corn": 3, "cabbage": 2}, "output": {"stew": 1}, "duration": 7200000, "xp": 40, "minLevel": 6},
 applejuice:{"building": "juicepress", "name": "Press apple juice", "input": {"apples": 4}, "output": {"applejuice": 1}, "duration": 5400000, "xp": 45, "minLevel": 8},
 applepie:{"building": "bakery", "name": "Bake an apple pie", "input": {"apples": 4, "flour": 4, "eggs": 2}, "output": {"applepie": 1}, "duration": 7200000, "xp": 55, "minLevel": 8},
 berrypreserves:{"building": "preserves", "name": "Cook berry preserves", "input": {"berries": 4, "honey": 2}, "output": {"berrypreserves": 1}, "duration": 7200000, "xp": 50, "minLevel": 10},
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
// World II's places (see VILLAGE_GOODS). The first trips need only a packed lunch; silver and rubies need pickaxes from the Smithy.
// XP about 30 a slot-hour since Oct 2026 (was 50-80, more than any farm recipe of levels 54-99), smelting iron 20: it adds little value,
// and XP follows the value added (tests/balance-world-two.test.mjs).
const VILLAGE_RECIPES=Object.freeze({
 digiron:{building:'mine',name:'Dig for iron',input:{packedlunch:1},output:{ironore:5,stone:4},duration:1800000,xp:15,minLevel:100},
 chop:{building:'lumbercamp',name:'Chop logs',input:{packedlunch:1},output:{timber:6},duration:1800000,xp:15,minLevel:100},
 saw:{building:'lumbercamp',name:'Saw planks',input:{timber:3},output:{plank:2},duration:1200000,xp:10,minLevel:100},
 smeltiron:{building:'smithy',name:'Smelt an iron bar',input:{ironore:4,timber:2},output:{ironbar:1},duration:3600000,xp:20,minLevel:102},
 forgepickaxe:{building:'smithy',name:'Forge pickaxes',input:{ironbar:2,plank:2},output:{pickaxe:4},duration:1800000,xp:15,minLevel:102},
 digsilver:{building:'mine',name:'Dig for silver',input:{pickaxe:2,packedlunch:2},output:{silverore:6,stone:8},duration:2700000,xp:23,minLevel:105},
 smeltsilver:{building:'smithy',name:'Smelt a silver bar',input:{silverore:4,timber:2},output:{silverbar:1},duration:5400000,xp:45,minLevel:105},
 mastertools:{building:'smithy',name:'Forge master tools',input:{ironbar:2,silverbar:2,plank:2},output:{mastertools:1},duration:14400000,xp:120,minLevel:108},
 heirloomflour:{building:'villagemill',name:'Grind heirloom flour',input:{goldenwheat:2},output:{heirloomflour:3},duration:3600000,xp:30,minLevel:112},
 digdeep:{building:'mine',name:'Dig deep for rubies',input:{pickaxe:2,packedlunch:2},output:{gemstone:1,stone:8},duration:7200000,xp:60,minLevel:115},
 // The Village Fields (Oct 2026) grow the village's crops as the Glasshouse grows the farm's: natural fertilizer and coins a batch, no
 // field, 20 XP a slot-hour. The Miners' Canteen bakes packed lunches from potatoes and flour: the first lunch without apples.
 sowpotatoes:{building:'villagefields',name:'Sow potatoes',input:{fertilizer:1},coins:120,output:{potatoes:10},duration:2700000,xp:15,minLevel:110},
 pastylunch:{building:'canteen',name:'Bake pasty lunches',input:{potatoes:10,flour:4},output:{packedlunch:4},duration:1800000,xp:15,minLevel:113},
 // Levels 118-128: clay dug with a packed lunch and fired into roof tiles, flax woven into linen, and builder's crates for the farm.
 digclay:{building:'kiln',name:'Dig clay',input:{packedlunch:1},output:{clay:8},duration:1500000,xp:12,minLevel:118},
 rooftile:{building:'kiln',name:'Fire roof tiles',input:{clay:6,timber:2},output:{rooftile:4},duration:1800000,xp:15,minLevel:118},
 sowflax:{building:'villagefields',name:'Sow flax',input:{fertilizer:1},coins:200,output:{flax:10},duration:4500000,xp:25,minLevel:123},
 linen:{building:'linenloft',name:'Weave linen',input:{flax:6},output:{linen:2},duration:1800000,xp:15,minLevel:125},
 builderscrate:{building:'lumbercamp',name:'Pack a builder’s crate',input:{plank:10,rooftile:6,ironbar:2},output:{builderscrate:1},duration:7200000,xp:60,minLevel:128},
 // Levels 132-150: lavender, its soap and sachets (goat milk and beeswax from the farm), and silver candlesticks from the farm's candles.
 sowlavender:{building:'villagefields',name:'Sow lavender',input:{fertilizer:2},coins:400,output:{lavender:15},duration:10800000,xp:60,minLevel:132},
 lavendersoap:{building:'soapmaker',name:'Make lavender soap',input:{lavender:4,goatmilk:2,beeswax:2},output:{lavendersoap:4},duration:3600000,xp:30,minLevel:135},
 scentedsachet:{building:'soapmaker',name:'Sew scented sachets',input:{lavender:4,linen:2},output:{scentedsachet:4},duration:3600000,xp:30,minLevel:138},
 silvercandlestick:{building:'jeweller',name:'Make a silver candlestick',input:{silverbar:2,candles:2},output:{silvercandlestick:1},duration:10800000,xp:90,minLevel:150},
 // Levels 154-158: rubies from digging deep are set in rings at the Jeweller, and saffron, the village's slowest crop (6 hours), goes
 // into the canteen's saffron buns. Rings and buns are what the town boat and the last landmarks ask for.
 rubyring:{building:'jeweller',name:'Set a ruby ring',input:{silverbar:2,gemstone:2},output:{rubyring:1},duration:12600000,xp:105,minLevel:154},
 sowsaffron:{building:'villagefields',name:'Sow saffron',input:{fertilizer:2},coins:1100,output:{saffron:8},duration:21600000,xp:120,minLevel:158},
 saffronbun:{building:'canteen',name:'Bake saffron buns',input:{saffron:4,flour:4,eggs:2},output:{saffronbun:2},duration:3600000,xp:30,minLevel:158}
});
export const RECIPES=Object.freeze({...BASE_RECIPES,...MASS_RECIPES,...VILLAGE_RECIPES});
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
 // Step 1 says the sweep first (Oct 2026): sweeping over the ripe corn harvests every field it passes; a tap still harvests one.
 {id:'harvest',title:'Your first basket',description:'Sweep across your ripe corn to harvest it, or tap one.',guide:'harvest',icon:'shopping-basket'},
 // 11 Oct 2026 (Part A A11): one thing to do. The feed sentence went: starter feed and corn cannot be sold in the first 30 minutes anyway
 // (STARTER_KEEP). 20 Oct 2026: it says the first sale pays double (firstSaleDouble).
 {id:'sell',title:'Your first market sale',description:'Open Market and sell your corn. Your first sale pays double.',guide:'market',icon:'store'},
 {id:'plant',title:'Plant a little possibility',description:'Select Wheat and plant it in an empty field. Seeds cost 3 coins.',guide:'plant',icon:'sprout'},
 // 7 Oct 2026: water works only in a crop's first minute, and the starter wheat is past it (9 of 38 new farmers who planted never watered).
 {id:'water',title:'A little water goes a long way',description:'Plant wheat and water it within a minute. It ripens much sooner.',guide:'water',icon:'droplets'},
 {id:'produce',title:'Put your buildings to work',description:'Start a production batch. Try Feed the chickens in the Chicken Coop using your starter feed.',guide:'produce',icon:'egg'},
 {id:'gift',title:'A gift for showing up',description:'Open Today and collect your daily gift. Come back tomorrow for the next one and 30 minutes of double harvest.',guide:'today',icon:'gift'},
 {id:'chore',title:'A helping hand',description:'Complete one Farm chore for extra coins while your crops and buildings work.',guide:'chores',icon:'shovel'},
 {id:'tend',title:'Good things need a little care',description:'Use Care on a growing crop once its care marker appears. It comes quickly while you are starting out.',guide:'tend',icon:'leaf'},
 {id:'wheat',title:'Bring in the wheat',description:'Harvest one wheat field when it is ready. Water and care make your harvest bigger.',guide:'harvest',icon:'wheat'},
 {id:'collect',title:'Made on your farm',description:'Collect a finished batch from a building. Chicken feed becomes eggs in 5 minutes.',guide:'collect',icon:'package-check'}
]);
// A guided farm's step 9 is A helping hand (11 Oct 2026, the owner's call; it was "Bring in the wheat", whose wheat was always ripe by
// then): the hand opens at level 3, and every farmer is at least level 4 there (eight steps of 15 XP). The step numbers stay the same,
// so a farm in the middle of the guide keeps its place. Older (legacy) farms have the same steps since 19 Oct 2026: their chore step waited
// for Farm chores at level 15 once features follow the level on every farm. Finished steps count by number, so none goes back.
const GUIDED_STEPS=Object.freeze({
 chore:{id:'sell_egg',title:'An egg opens new doors',description:'Collect eggs from the Chicken Coop and sell at least one in Market → Goods. Save the coins for your next building.',guide:'eggs',icon:'egg'},
 wheat:{id:'hand',title:'A helping hand',description:'Help at the Greenhouse: water the three dry seedlings. Every stop on the farm has a small job like this.',guide:'hand',icon:'sprout'}
});
function beginnerQuests(){return BEGINNER_QUESTS.map(q=>GUIDED_STEPS[q.id]??q);}
// Step 10 says how long the eggs take on this farm now (7 Oct 2026: it said 5 minutes, where the beginner boost makes it about 1),
// to the nearest 5 seconds (the quick first batch too, 11 Oct 2026).
export function beginnerProgress(state,now=Date.now()){
 const guide=state.onboarding??{completed:0,milestones:{}},eggs=state.buildings?.coop?formatDuration(Math.round(batchDuration(state,'eggs',now)/5000)*5000):'5m';
 return beginnerQuests(state).map((quest,index)=>({...quest,...(quest.id==='collect'?{description:`Collect a finished batch from a building. Chicken feed becomes eggs in ${eggs}.`}:{}),index,done:index<guide.completed,current:index===guide.completed,ready:!!guide.milestones[quest.id]}));
}
// Guide steps finish themselves as soon as the farmer has done them (many never found the "Complete step" button and
// stayed on step 1); only the last step, with the diamonds, is collected by hand. stepAt: when each step was finished (7 Oct 2026,
// to see where new farmers stop).
function advanceBeginner(state,now=Date.now()){
 const guide=state.onboarding,quests=beginnerQuests(state),done=[];
 while(guide&&!guide.rewardClaimed&&guide.completed<quests.length-1&&guide.milestones[quests[guide.completed].id]){
  const quest=quests[guide.completed];guide.completed++;(guide.stepAt??={})[quest.id]=now;state.xp+=BEGINNER_STEP_XP;done.push({step:quest.id,title:quest.title,xp:BEGINNER_STEP_XP});
 }
 return done;
}
export function claimBeginnerQuest(state,id,now=Date.now()){
 const guide=state.onboarding,quest=beginnerQuests(state)[guide.completed];
 if(!quest||guide.rewardClaimed)throw new Error('Your beginner guide is already complete.');
 if(id!==quest.id)throw new Error('Complete the current beginner step first.');
 if(!guide.milestones[quest.id])throw new Error('Try this farming action before completing the step.');
 guide.completed++;(guide.stepAt??={})[quest.id]=now;state.xp+=BEGINNER_STEP_XP;
 const diamonds=guide.completed===BEGINNER_QUESTS.length?BEGINNER_REWARD:0;
 if(diamonds){state.diamonds+=diamonds;guide.rewardClaimed=true;}
 return {step:quest.id,completed:guide.completed,total:BEGINNER_QUESTS.length,diamonds,xp:BEGINNER_STEP_XP};
}
// A new farm's first look (7 Oct 2026, the CrazyGames launch: did players leave while the farm loaded, or after they saw it?), kept
// once in state.onboarding.firstLook. The game sends it along with a farm action (action.look): when the farm page was first drawn
// (shownAt) and the farm could be played (readyAt), how long each took from the start of the page around it (loadMs, readyMs), the
// frame's size in steps of 10 px (frame, '960x540') and the first touch (firstInputAt, and firstInputMs: how long after readyAt, on the
// device's own clock). The times are the device's clock and sentAt is when the request left it: they move by the server's now minus
// sentAt (the game's own idea of server time ran behind by the farm page's start-up), so each is late by its request's trip to the server,
// which is why the time to the first touch is a duration of its own. Without sentAt they count as the server's. Each part is kept once:
// a time only within the last day and never ahead of the server, a duration up to 10 minutes; anything else is left out.
// 13 Oct 2026 (the measurement package): when the farm was first in view, touched or not (viewAt: the loading screen gone and the page
// in view; a tab in the background reaches readyAt unseen), and how long after readyAt (viewMs, the device's own clock).
export const FIRST_LOOK_MAX_MS=600000;
// 11 Oct 2026 (Part A, A1): the load chain (look.chain), to see which step of the wait is slow: how long after the start of the page around
// the farm (its own clock, performance.now()) CrazyGames' SDK answered (hello), its token came (token), the account was there (account:
// a guest made or a sign-in found), our server sent the farm (farm), the farm page started (frame), the 3D models were in (models) and the
// first picture was drawn (render); lost is 1 when the 3D view was lost during that first visit (public/game.js). At most these 8, each a
// whole number of ms up to 10 minutes and kept once, like the other parts; anything else is left out. A step a page does not have (the
// website has no hello or token) is simply not there.
export const FIRST_LOOK_CHAIN=Object.freeze(['hello','token','account','farm','frame','models','render','lost']);
export function recordFirstLook(state,look,now=Date.now()){
 if(!look||typeof look!=='object'||!state.onboarding)return;
 const shift=Number.isFinite(look.sentAt)?now-look.sentAt:0;
 const time=v=>Number.isFinite(v)&&v+shift>now-DAY_MS&&v+shift<now+60000?Math.min(Math.round(v+shift),now):undefined;
 const span=v=>Number.isFinite(v)&&v>=0?Math.min(Math.round(v),FIRST_LOOK_MAX_MS):undefined;
 const parts={shownAt:time(look.shownAt),loadMs:span(look.loadMs),readyAt:time(look.readyAt),readyMs:span(look.readyMs),frame:typeof look.frame==='string'&&/^\d{2,5}x\d{2,5}$/.test(look.frame)?look.frame:undefined,firstInputAt:time(look.firstInputAt),firstInputMs:span(look.firstInputMs),viewAt:time(look.viewAt),viewMs:span(look.viewMs)};
 const seen={...state.onboarding.firstLook};for(const [key,value] of Object.entries(parts))if(value!==undefined&&seen[key]===undefined)seen[key]=value;
 const chain=look.chain&&typeof look.chain==='object'&&!Array.isArray(look.chain)?look.chain:{},links={...seen.chain};
 for(const key of FIRST_LOOK_CHAIN){const value=key==='lost'?(chain.lost===1?1:undefined):span(chain[key]);if(value!==undefined&&links[key]===undefined)links[key]=value;}
 if(Object.keys(links).length)seen.chain=links;
 if(Object.keys(seen).length)state.onboarding.firstLook=seen;
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
 // Step 9 of a guided farm: any finished helping-hand job, also one done before the step came (11 Oct 2026).
 // Every farm since 19 Oct 2026 (older farms have the hand as step 9 too, beginnerQuests); a finished guide stays as it is.
 if(!state.onboarding.rewardClaimed&&(state.stats.activities??0)>0)m.hand=true;
}

// Plan F (13 Oct 2026, proposal 5): "Room for more" names field 13 (fields 9-12 are no expansion, so it stayed 0 / 1 after them), the
// tractor's quest is no second "A helping hand", and the Feed Mill and the Dairy Barn have their whole names.
export const QUESTS = Object.freeze([
 {title:'Your first harvest',description:'Harvest 6 crops from your fields.',stat:'harvested',target:6,reward:40},
 {title:'A little green thumb',description:'Plant 6 crops and let them grow.',stat:'planted',target:6,reward:65},
 {title:'Open for business',description:'Earn 120 coins at the market.',stat:'earned',target:120,reward:100},
 {title:'Made on the farm',description:'Collect 3 finished production batches.',stat:'produced',target:3,reward:100},
 {title:'A growing operation',description:'Upgrade a production building.',stat:'upgrades',target:1,reward:80},
 {title:'Room for more',description:'Unlock field 13 at the Farmhouse.',stat:'expansions',target:1,reward:100},
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
 {title:'Delivery day',description:'Complete 3 delivery orders.',stat:'deliveries',target:3,reward:120},
 {title:'Tractor time',description:'Use the tractor 5 times.',stat:'tractor',target:5,reward:100},
 {title:'Built to last',description:'Upgrade production buildings 5 times.',stat:'upgrades',target:5,reward:180},
 {title:'A full field',description:'Harvest 200 crops.',stat:'harvested',target:200,reward:250},
 {title:'A farm favourite',description:'Collect 30 production batches.',stat:'produced',target:30,reward:200},
 {title:'A little every day',description:'Complete 6 daily challenges.',stat:'dailies',target:6,reward:160},
 {title:'Above and beyond',description:'Give 50 crops extra care.',stat:'tended',target:50,reward:300},
 {title:'A familiar face',description:'Complete 100 farm chores.',stat:'chores',target:100,reward:500},
 {title:'Roots for the future',description:'Complete your first estate project.',stat:'projects',target:1,reward:600},
 {title:'A specialist touch',description:'Claim 9 crop medals.',stat:'mastery_medals',target:9,reward:1500},
 {title:'Two thousand little harvests',description:'Harvest 2,000 fields.',stat:'harvested',target:2000,reward:2500},
 {title:'From farm to estate',description:'Complete 6 estate projects.',stat:'projects',target:6,reward:8000},
 {title:'Known across the valley',description:'Complete 100 delivery orders.',stat:'deliveries',target:100,reward:6000},
 {title:'A lifelong grower',description:'Claim 36 crop medals.',stat:'mastery_medals',target:36,reward:20000},
 {title:'Catch the wind',description:'Collect your first production batch at the Windmill.',stat:'windmill_batches',target:1,reward:180},
 {title:'Grain with a purpose',description:'Make 3 grain meal at the Windmill.',stat:'made_grainmeal',target:3,reward:160},
 {title:'Fresh from the mill',description:'Refine grain meal into 12 flour for the Bakery.',stat:'made_flour',target:12,reward:200},
 {title:'A gentler way to grow',description:'Use natural fertilizer on 4 growing fields.',stat:'fertilized',target:4,reward:240},
 {title:'A sparkling streak',description:'Earn 10 diamonds from daily gifts.',stat:'diamonds_earned',target:10,reward:200},
 {title:'A little extra power',description:'Activate a boost with earned diamonds.',stat:'boosts_used',target:1,reward:100},
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
 {"title":"Prepared for the season","description":"Upgrade silo research 3 times.","stat":"silo_upgrades","target":3,"reward":2000},
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
{"title": "A grand crop collection", "description": "Claim 48 crop medals.", "stat": "mastery_medals", "target": 48, "reward": 30000},
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
 {title:'Fields of plenty',description:'Harvest 5,000 crops.',stat:'harvested',target:5000,reward:6000},
 {title:'Overflowing barns',description:'Harvest 10,000 crops.',stat:'harvested',target:10000,reward:14000},
 {title:'Harvest legend',description:'Harvest 20,000 crops.',stat:'harvested',target:20000,reward:32000},
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
 {title:'A full basket',description:'Harvest 20 crops.',stat:'harvested',target:20,reward:45,xp:0},
 {title:'First seeds',description:'Plant 3 crops.',stat:'planted',target:3,reward:20,xp:0},
 {title:'Wheat wave',description:'Harvest 6 wheat.',stat:'harvest_wheat',target:6,reward:30,xp:0},
 {title:'Salad days',description:'Harvest 4 lettuce.',stat:'harvest_lettuce',target:4,reward:35,xp:0},
 {title:'Well made',description:'Collect 2 finished production batches.',stat:'produced',target:2,reward:35,xp:0},
 {title:'Fresh milk',description:'Collect 4 milk.',stat:'made_milk',target:4,reward:40,xp:0},
 {title:'First challenge',description:'Complete 1 daily challenge.',stat:'dailies',target:1,reward:40,xp:0},
 {title:'Busy market day',description:'Sell 20 items at the market.',stat:'sold',target:20,reward:40,xp:0},
 {title:'First order',description:'Complete 1 delivery order.',stat:'deliveries',target:1,reward:45,xp:0},
 {title:'Feed the flock',description:'Make 6 animal feed at the Feed Mill.',stat:'made_feed',target:6,reward:35,xp:0},
 {title:'Corn crib',description:'Harvest 12 corn.',stat:'harvest_corn',target:12,reward:40,xp:0},
 {title:'Say cheese',description:'Collect 2 cheese from the Dairy Barn.',stat:'made_cheese',target:2,reward:45,xp:0},
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
 {title:'Master of every crop',description:'Earn all 64 crop medals.',stat:'mastery_medals',target:64,reward:150000,minLevel:66},
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
 {title:'On the road',description:'Complete 25 delivery orders.',stat:'deliveries',target:25,reward:1300,minLevel:5},
 {title:'Medal collector',description:'Earn 18 crop medals.',stat:'mastery_medals',target:18,reward:5500,minLevel:7},
 {title:'Decorated farmer',description:'Earn 27 crop medals.',stat:'mastery_medals',target:27,reward:12000,minLevel:7},
 {title:'Every seed in the shop',description:'Harvest every one of the 16 crops at least once.',stat:'varieties',target:16,reward:40000,minLevel:66},
 {title:'Boost lover',description:'Use 25 boosts.',stat:'boosts_used',target:25,reward:5200,minLevel:14},
 {title:'Stall keeper',description:'Earn 100,000 coins at your farm stall.',stat:'passive_earned',target:100000,reward:15000,minLevel:19},
 // 17 Oct 2026 (the owner's picks 1a and the round 320): the fishing pond and the Seed Lab count for quests at last. A farmer baked heirloom
 // bread that no quest asked for. The pond's from level 4 (its kinds and its legend: stats.fish_kinds and caught_whiskers, from the fish
 // book itself), the Seed Lab's from level 92 (heirlooms_found from lab.found, lab_crosses as counted since 27 Sep), so a farm that has
 // them already can claim them at once. The Seed Lab's stay hidden below level 90 on every farm (questGroups), as the endgame does.
 {title:'A first bite',description:'Catch a fish at your fishing pond.',stat:'fish',target:1,reward:100,minLevel:4},
 {title:'A few kinds',description:'Catch 4 kinds of fish for your fish book.',stat:'fish_kinds',target:4,reward:250,minLevel:4},
 {title:'A bucket of fish',description:'Catch 25 fish at your fishing pond.',stat:'fish',target:25,reward:500,minLevel:5},
 {title:'Steady hands',description:'Land 10 perfect catches.',stat:'fish_perfect',target:10,reward:800,minLevel:6},
 {title:'Eight in the book',description:'Catch 8 kinds of fish for your fish book.',stat:'fish_kinds',target:8,reward:1500,minLevel:8},
 {title:'The pond’s legend',description:'Land Old Whiskers, the legend of your pond.',stat:'caught_whiskers',target:1,reward:2000,minLevel:10},
 {title:'A hundred fish',description:'Catch 100 fish at your fishing pond.',stat:'fish',target:100,reward:3000,minLevel:12},
 {title:'Into page two',description:'Catch 12 kinds of fish for your fish book.',stat:'fish_kinds',target:12,reward:5000,minLevel:20},
 {title:'An angler’s summer',description:'Catch 250 fish at your fishing pond.',stat:'fish',target:250,reward:8000,minLevel:25},
 {title:'The whole fish book',description:'Catch all 16 kinds of fish for your fish book.',stat:'fish_kinds',target:16,reward:15000,minLevel:25},
 {title:'Perfect angler',description:'Land 100 perfect catches.',stat:'fish_perfect',target:100,reward:12000,minLevel:30},
 {title:'A thousand fish',description:'Catch 1,000 fish at your fishing pond.',stat:'fish',target:1000,reward:40000,minLevel:50},
 {title:'A new variety',description:'Discover an heirloom in the Seed Lab.',stat:'heirlooms_found',target:1,reward:30000,minLevel:92},
 {title:'Five new varieties',description:'Discover 5 heirlooms in the Seed Lab.',stat:'heirlooms_found',target:5,reward:60000,minLevel:92},
 {title:'Busy test beds',description:'Collect 10 crosses from the Seed Lab.',stat:'lab_crosses',target:10,reward:50000,minLevel:92},
 {title:'Ten varieties',description:'Discover 10 heirlooms in the Seed Lab.',stat:'heirlooms_found',target:10,reward:100000,minLevel:94},
 {title:'Fifteen varieties',description:'Discover 15 heirlooms in the Seed Lab.',stat:'heirlooms_found',target:15,reward:150000,minLevel:96},
 {title:'Every heirloom',description:'Discover all 20 heirlooms in the Seed Lab.',stat:'heirlooms_found',target:20,reward:250000,minLevel:98},
 {title:'A lab regular',description:'Collect 50 crosses from the Seed Lab.',stat:'lab_crosses',target:50,reward:150000,minLevel:95},
 {title:'Master breeder',description:'Collect 150 crosses from the Seed Lab.',stat:'lab_crosses',target:150,reward:300000,minLevel:100}
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
// Curve 4 (26 Sep 2026) is curve 3 up to level 50; from there every step asks 4% more per level above 50 (50 -> 51 as before, 60 -> 61
// +40%, 90 -> 91 +160%), and from level 100 6% more per level (100 -> 101 +200%, 110 -> 111 +260%). The top farmers went from 60 to 70
// in about ten hours of play, and a farmer past 50 is in for the long game: 50 -> 90 (the last unlock) takes about twice as long,
// roughly 80 hours of play at the fastest pace seen. Nobody goes back: a farm keeps its level and its share of the way to the next one,
// and below level 50 nothing changes.
// Curve 5 (27 Sep 2026) is curve 4 with levels 10 to 30 cheaper: after 320 XP for level 10 the next step asked 420, and 10 -> 20 as a
// whole 6,000 XP, four and a half times levels 1 to 10, just as the beginner boost runs out; experienced players had nothing new to
// do. Now 10 -> 20 asks about 4,550 XP (a quarter less), the steps grow smoothly on from level 9, and between 20 and 30 they grow
// back to curve 4's steps (about a tenth less there), so there is no new jump at 20. From level 30 every step is as before.
// Curve 6 (4 Oct 2026, the owner's call) is curve 5 with every step from level 90 on asking exactly twice as much: 90 -> 91 asks
// 18,824 XP instead of 9,412, 90 -> 100 211,544 instead of 105,772 (more than 50 -> 90 as a whole). Reaching level 90 costs the same.
// The one farmer past 90 then went up about 3.7 levels a day; the endgame after 90 (Master points, heirlooms, World II, the master
// tools) is meant to last. What comes per level (Master points, level rewards) comes half as often per XP. Nobody goes back: a farm
// keeps its level and its share of the way to the next one, and below level 90 its XP does not change.
// Two releases, so no copy of this code ever meets a farm on a curve it cannot read (an unknown curve reads as curve 1, so an old
// browser tab would show every farmer at a wrong level, and an old farm-api would rewrite their XP): first every copy learns to
// read curve 6 while farms stay on curve 5 (XP_CURVE 5, 4 Oct 2026, 14:00); then XP_CURVE became 6 (4 Oct 2026, 17:15) and farms convert.
// Curve 7 (9 Oct 2026, the owner's call: "every level goes too fast", and new things should open gradually, without a flood) is curve 6
// with the steps from level 5 to 59 dearer. From level 5 a step asks 6% more for every level, up to 1.3x at level 10; it stays 1.3x up
// to level 50 and falls back 3% a level to curve 6's own step at level 60, where unlocks are already far apart (and from 90 every step
// is doubled). So there is no jump anywhere: 9 -> 10 asks 397 XP (was 320), 10 -> 11 429 (330), 50 -> 51 2,626 (2,020), 59 -> 60 3,334
// and 60 -> 61 3,388 as before. Reaching level 6 costs the same. In real play (farms since 28 Sep 2026) a player who came back on five
// days or more was level 12 after the first day, 18 after three and 26 after a week, and the fastest went from 1 to 88 in a week.
// Nobody goes back: a farm keeps its level and its share of the way to the next one. Released in the same two steps as curve 6: first
// every copy read curve 7 while farms stayed on curve 6 (XP_CURVE 6, 9 Oct 2026, 20:09), then XP_CURVE became 7 (9 Oct 2026, same
// evening, at the owner's request) and farms convert.
export const XP_CURVE=7;
export const LATE_XP_FROM=50,LATE_XP_STEP=.04,LATER_XP_FROM=100,LATER_XP_STEP=.06,TOP_XP_FROM=90,TOP_XP_FACTOR=2;
const oldXpForLevel=level=>{const n=level-1;return 60*n+20*n*(n-1);};
const CURVE5_GAPS=Object.freeze([15,40,65,95,130,170,215,265,320,  330,355,380,405,435,465,495,525,560,595,  640,690,745,800,860,920,985,1050,1115,1175]);   // to level 30
const EARLY_GAPS=Object.freeze({   // XP from level 1 to 2, 2 to 3 ... 9 to 10 (curve 1: 60, 100, 140 ... 380); curve 5 on to level 30
 2:Object.freeze([15,30,40,60,80,105,135,170,215]),
 3:Object.freeze([15,40,65,95,130,170,215,265,320]),
 4:Object.freeze([15,40,65,95,130,170,215,265,320]),
 5:CURVE5_GAPS,
 6:CURVE5_GAPS,   // curve 6 differs from 5 only from level 90 (lateStep)
 7:CURVE5_GAPS    // listed so a farm on curve 7 is read as one; its totals come from curve7Total
});
// level -> level+1, from level 50; on curve 6 (and 7) twice that from level 90 (exactly twice the rounded step)
const lateStep=(level,curve)=>Math.round((40*level+20)*(1+(Math.min(level,LATER_XP_FROM)-LATE_XP_FROM)*LATE_XP_STEP+Math.max(0,level-LATER_XP_FROM)*LATER_XP_STEP))*(curve>=6&&level>=TOP_XP_FROM?TOP_XP_FACTOR:1);
const curveOf=state=>Object.hasOwn(EARLY_GAPS,state.xpCurve)?Number(state.xpCurve):1;
const sum=list=>list.reduce((total,n)=>total+n,0);
// Curve 7: how much dearer than curve 6 the step from a level is, and the total XP to reach each level (filled as far as asked).
export const CURVE7_FACTOR=level=>level<5?1:level<10?1+(level-5)*.06:level<50?1.3:level<60?1.3-(level-50)*.03:1;
const curve6Step=level=>level>=LATE_XP_FROM?lateStep(level,6):totalForLevel(level+1,6)-totalForLevel(level,6);
const CURVE7_TOTALS=[0,0];
function curve7Total(level){
 while(CURVE7_TOTALS.length<=level){const from=CURVE7_TOTALS.length-1;CURVE7_TOTALS.push(CURVE7_TOTALS[from]+Math.round(curve6Step(from)*CURVE7_FACTOR(from)));}
 return CURVE7_TOTALS[level];
}
function totalForLevel(level,curve){
 if(level<=1)return 0;
 if(curve>=7)return curve7Total(level);
 const gaps=EARLY_GAPS[curve];if(!gaps)return oldXpForLevel(level);
 if(level<=gaps.length+1)return sum(gaps.slice(0,level-1));
 if(curve>=4&&level>LATE_XP_FROM){let total=totalForLevel(LATE_XP_FROM,curve);for(let l=LATE_XP_FROM;l<level;l++)total+=lateStep(l,curve);return total;}
 return oldXpForLevel(level)-(oldXpForLevel(gaps.length+1)-sum(gaps));
}
export const xpForLevel=level=>totalForLevel(level,XP_CURVE);
function levelFromTotal(total,curve){
 if(curve>=7){let level=1;while(level<10000&&total>=curve7Total(level+1))level++;return level;}
 if(curve>=4&&total>=totalForLevel(LATE_XP_FROM,curve)){let level=LATE_XP_FROM,next=totalForLevel(LATE_XP_FROM,curve)+lateStep(LATE_XP_FROM,curve);while(total>=next&&level<10000){level++;next+=lateStep(level,curve);}return level;}
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
// One-off conversion of a farm to the current curve (to: another curve, for the tests): the same level, and the same share of the way
// to the next one.
export function convertXpCurve(state,to=XP_CURVE){
 if(state.xpCurve===to)return;
 const from=curveOf(state),total=Math.max(0,Number.isFinite(state.xp)?state.xp:0)+(Number.isFinite(state.xpOffset)?state.xpOffset:0),level=levelFromTotal(total,from);
 const start=totalForLevel(level,from),share=(total-start)/(totalForLevel(level+1,from)-start),next=totalForLevel(level,to),after=totalForLevel(level+1,to);
 state.xp=Math.min(after-1,Math.round(next+share*(after-next)));state.xpOffset=0;state.xpCurve=to;   // rounding never lifts a farmer into the next level
}
const migrateXpCurve=state=>convertXpCurve(state);
// Levels 1-10 are bought with coins or diamonds, one slot and a bit more speed per level. Levels 11-20 are estate upgrades for the
// long game (forty fields need far more processing): a higher farm level and finished goods on top of the price, which is coins
// or diamonds (and the 50% voucher) exactly as below level 10.
export const BASE_BUILDING_LEVEL=10;
// Level 10 is a fully upgraded building (26 Sep 2026; was 20): with every building at 10 a farm has more production slots than its
// fields can fill, the Factory's batches are full size there, and levels 11-20 (17 million coins a building) were out of reach. No
// building in the game was above level 7. ESTATE_UPGRADES below is kept only for the price ladder's top (its first step).
export const MAX_BUILDING_LEVEL=10;
// World II (30 Sep 2026): the farm's production buildings grow past level 10 with master tools from the village's Smithy, one level
// at farm level 108, 120, 140, 160 and 180 (TOP_BUILDING_LEVEL 15). Every level above 10 gives each batch a 10% chance to come out
// double (50% at level 15): a level-100 farm is held back by its fields, not by slots or speed, so more of those would add little.
// Levels 11-15 keep 10 slots. The Factory and the village's own places stop at 10. Below level 100 nothing of this shows: a level-10
// building reads as fully upgraded, as before.
export const WORLD_TWO_LEVEL=100,WORLD_TWO_TOP=200,WORLD_TWO_TEASER=90;
export const TOP_BUILDING_LEVEL=15;
export const DOUBLE_BATCH_PER_LEVEL=.1;
export const MASTER_UPGRADES=Object.freeze([
 {level:108,coins:750000,materials:{mastertools:1,plank:20,stone:30}},
 {level:120,coins:1000000,materials:{mastertools:2,plank:40,stone:60}},
 {level:140,coins:1300000,materials:{mastertools:3,plank:60,stone:90}},
 {level:160,coins:1700000,materials:{mastertools:4,plank:80,stone:120}},
 {level:180,coins:2200000,materials:{mastertools:5,plank:100,stone:150}}
].map(step=>Object.freeze({...step,materials:Object.freeze(step.materials)})));
export const beyondMaxBuilding=key=>BUILDINGS[key]?.type==='production'&&key!=='factory'&&!worldTwoBuilding(key);
export const worldTwoOpen=state=>levelOf(state)>=WORLD_TWO_LEVEL;
// The next step past level 10 for this building (with the farm level it needs), or null: none below level 100, none for the Factory
// or the village's places, none at level 15.
export function masterUpgrade(state,key){
 if(!beyondMaxBuilding(key)||!worldTwoOpen(state))return null;
 const level=state.buildings?.[key]?.level??1;
 return level>=MAX_BUILDING_LEVEL?MASTER_UPGRADES[level-MAX_BUILDING_LEVEL]??null:null;
}
export const doubleBatchChance=level=>Math.round(Math.max(0,Math.min(TOP_BUILDING_LEVEL,level)-MAX_BUILDING_LEVEL)*DOUBLE_BATCH_PER_LEVEL*100)/100;
// The Factory is one shared workshop for every good: a slot every two levels, up to five (reached at level 9), and half the
// speed bonus. Its batches are as big as the source building allows (factoryBatchCount, at most ×20), so a full Factory adds
// about one to two buildings of the farm's own level, and at the top a specialised building always makes the same good faster.
export const FACTORY_MAX_SLOTS=5;
// The slots a building has now: its level's, and one more while the farmhand works (20 Oct 2026, BOOSTS.farmhand), in every building but
// the Factory (the owner: "de knecht werkt niet voor de factory"; its batches are up to ×20 already). A batch started in that slot runs
// on when the farmhand leaves; a new one waits until the building is below its own slots again.
export const farmhandActive=(state,now=Date.now())=>(state.boosts?.farmhandUntil??0)>now;
export const farmhandWorks=key=>key!=='factory';
export function buildingSlots(state,key,now=Date.now()){return productionSlots(state.buildings[key]?.level??1,key)+(farmhandWorks(key)&&farmhandActive(state,now)?1:0);}
export function productionSlots(level,building){const n=Math.max(1,Math.min(MAX_BUILDING_LEVEL,Math.floor(level)));return building==='factory'?Math.min(FACTORY_MAX_SLOTS,Math.ceil(n/2)):n;}
// Keep the primary job for older clients; extra jobs run in parallel, not a queue.
export function productionJobs(building){return [building?.job,...(building?.extraJobs??[])].filter(Boolean);}
export function recipeValue(id,now,state){const r=state?recipeFor(state,id):RECIPES[id],value=items=>now===undefined?Object.entries(items).reduce((sum,[key,n])=>sum+reducedMarketPrice(ITEMS[key].sell)*n,0):marketValue(items,now);const input=value(r.input)+(r.coins??0),output=value(r.output);return {input,output,added:output-input};}
export function productionSpeed(level,building){const speed=level<=3?.2*(level-1):level<=BASE_BUILDING_LEVEL?.4+.04*(level-3):Math.min(.8,.68+.012*(level-BASE_BUILDING_LEVEL));return building==='factory'?speed/2:speed;}
// The beginner boost: when a farm is created, new crops and new batches take 50% less time (corn 15 min -> 7.5 min). It gets smaller
// evenly, in a straight line, and stops at exactly 0% after the first day (ROOKIE_BOOST_MS): 37.5% after 6 hours, 25% after 12 and
// 12.5% after 18, so the first session feels quick and a return later that day still gets some help. (Until 27 Sep 2026 it followed the
// square of the time left: its last hours read "0% shorter waiting" while it still ran.) It was 80% until 9 Oct 2026 (the owner's
// call): everything then grew five times as fast in the first hour, a new farmer reached level 10 in about 33 minutes of play, and the
// first half hour opened 29 new things, about one a minute. 40% from 9 Oct, 50% from 13 Oct 2026 (the owner's call).
// Separately, for the first 30 minutes (ROOKIE_MS, until state.rookieUntil) the starter corn and animal feed stay in the barn so nothing
// is sold by accident. Both are plain clock time from creation; the boost counts from the same start (rookieUntil - ROOKIE_MS), so
// farms made before the boost lasted a day get the whole day too. Crops and batches that are already running keep their times.
// Only farms created in the guided flow have it: farms from before this simply have no rookieUntil.
export const ROOKIE_MS=30*60000;
export const ROOKIE_TIMER_BOOST=.5;
export const ROOKIE_BOOST_MS=24*60*60000;
export const rookieLeft=(state,now=Date.now())=>guidedFarm(state)&&Number.isSafeInteger(state.rookieUntil)?Math.max(0,state.rookieUntil-now):0;
export const rookieBoostLeft=(state,now=Date.now())=>guidedFarm(state)&&Number.isSafeInteger(state.rookieUntil)&&state.rookieUntil>0?Math.max(0,state.rookieUntil-ROOKIE_MS+ROOKIE_BOOST_MS-now):0;
export const rookieBoost=(state,now=Date.now())=>ROOKIE_TIMER_BOOST*Math.min(1,rookieBoostLeft(state,now)/ROOKIE_BOOST_MS);
// The village's Wind pump and Longhouse (landmarks, Oct 2026) take 25% off the Village Fields' batches and 10% off every village place's;
// on the Fields both count (x0.675). A batch already running keeps the time it started with.
export function recipeDuration(state,id,now=Date.now()){return Math.round(RECIPES[id].duration*(1-productionSpeed(state.buildings[RECIPES[id].building].level,RECIPES[id].building))*(vipActive(state,now)?.9:1)*(1-rookieBoost(state,now))*(ranchFocus(state)===RECIPES[id].building?1-ranchSpeedup(state):1)*(RECIPES[id].building==='glasshouse'&&hasImprovement(state,'heating')?.75:1)*(1-masterBonus(state,'production'))*(['windmill','mill'].includes(RECIPES[id].building)?1-valleyProjectBonus(state,'watermill'):1)*(RECIPES[id].building==='villagefields'?1-landmarkBonus(state,'windpump'):1)*(worldTwoBuilding(RECIPES[id].building)?1-landmarkBonus(state,'longhouse'):1));}
// The first batch in a new building is ready in 30 seconds (11 Oct 2026, the owner's call): the guide's eggs come at once instead of
// after three minutes, and the first milk, grain meal and bread pay off right away. Guided farms only, once per building: its very first
// batch (batchSequence counts every batch started there; of several started at once only the first is quick). Time only, never more goods.
export const FIRST_BATCH_MS=30000;
export function quickFirstBatch(state,building){return guidedFarm(state)&&!(state.buildings?.[building]?.batchSequence>0);}
export function batchDuration(state,id,now=Date.now()){const full=recipeDuration(state,id,now);return quickFirstBatch(state,RECIPES[id].building)?Math.min(FIRST_BATCH_MS,full):full;}
export function siloBonus(level){return {seeds:Math.min(level,3)*.05+Math.max(0,level-3)*.05,growth:Math.min(level,3)*.1+Math.max(0,level-3)*.05};}
// Version 2 introduces one small step at a time. Old unlocks are saved once,
// independently of inventory bundles, so purchases never bypass progression.
export const CROP_LEVELS=Object.freeze({corn:1,wheat:1,lettuce:3,barley:5,greenbeans:12,cabbage:9,cauliflower:11,pumpkin:13,redcabbage:15,sunflower:17,apples:20,berries:23,squash:28,polebeans:31,ciderapples:46,cherries:66});
export const BUILDING_LEVELS=Object.freeze({familyhall:FAMILY_MIN_LEVEL,farmhouse:1,coop:1,mill:2,dairy:4,windmill:6,bakery:8,packing:11,kitchen:12,juicepress:21,preserves:24,pigfarm:29,beeyard:34,sheepbarn:37,glasshouse:40,weaving:43,goatshed:54,craftshop:58,factory:FACTORY_LEVEL,mine:100,lumbercamp:100,smithy:102,villagemill:112,
 villagefields:110,canteen:113,kiln:118,linenloft:125,soapmaker:135,pier:144,jeweller:150});
export const BUILDING_COSTS=Object.freeze({mill:100,dairy:300,windmill:700,bakery:1000,packing:1400,kitchen:3500,juicepress:6500,preserves:10000,pigfarm:14000,beeyard:18000,sheepbarn:26000,glasshouse:40000,weaving:55000,goatshed:72000,craftshop:90000,factory:FACTORY_COST,
 // World II (Oct 2026): built from the golden brief at the market square (VILLAGE_BRIEFS), with these coins and the brief's goods. One
 // number for the brief, the wiki and the upgrade ladder's floor (150k / 150k / 200k / 300k from 30 Sep 2026, when they were built here).
 mine:75000,lumbercamp:75000,smithy:150000,villagemill:250000,villagefields:150000,canteen:200000,kiln:250000,linenloft:300000,soapmaker:350000,pier:400000,jeweller:450000});
export const RECIPE_LEVELS=Object.freeze({trufflehunt:29,truffleomelette:30,vegetablefeast:36,eggs:1,feed:2,wheatfeed:2,milk:4,barleyfeed:5,grainmeal:6,flour:6,windfeed:18,bread:8,cheese:9,fertilizer:14,salad:11,vegetables:13,windflour:14,stew:12,pie:13,pickles:15,beangratin:16,oil:17,orchardsalad:20,applejuice:21,applepie:22,orchardjuice:26,berrysmoothie:23,berrycheesecake:33,applecompote:24,berrypreserves:24,applevinegar:24,pickledbeans:25,berrytart:38,harvesthamper:35,squashsoup:32,hives:34,wool:37,grazewool:39,glasscauliflower:40,glasspumpkin:41,glassredcabbage:42,yarn:43,glasssquash:44,cloth:45,cider:47,glasssunflower:48,goatmilk:54,goatcheese:55,goatbrowse:56,candles:58,blanket:60,cherryjam:67,cherrypie:68,prizeproduce:80,packedlunch:100,digiron:100,chop:100,saw:100,smeltiron:102,forgepickaxe:102,digsilver:105,smeltsilver:105,mastertools:108,goldenloaf:112,heirloomflour:112,heirloompie:115,digdeep:115,
 sowpotatoes:110,pastylunch:113,digclay:118,rooftile:118,sowflax:123,linen:125,builderscrate:128,sowlavender:132,lavendersoap:135,scentedsachet:138,silvercandlestick:150,rubyring:154,sowsaffron:158,saffronbun:158});
// The Fishing pond (11 Oct 2026, part C): POND_OPEN is its one switch. While it is false the pond is built but hidden: it is in no list
// (not in FEATURE_LEVELS or FEATURE_NAMES, so no level card, Coming up, wiki or menu names it), the game loads none of it and farm-api
// refuses every 'fish', so no save gets a pond. Release: closed first (site, about 40 minutes, then farm-api), then POND_OPEN true with
// farm-api first and the site after it. Once ponds exist farm-api never goes back before the closed release.
export const POND_OPEN=true,POND_LEVEL=4;
// The village lake (12 Oct 2026, part D): LAKE_OPEN is its one switch, the pond's release order again. While it is false nothing of the
// lake is listed and every 'lake_fish' is refused, so no save gets a lake. It opens at level 100, with World II.
export const LAKE_OPEN=true,LAKE_LEVEL=WORLD_TWO_LEVEL;
// A helping hand opens at level 3 (11 Oct 2026, the owner's call; it was 8): its stops grow with the farm until level 10 (activityStatus),
// so it pays no more an hour than from level 8 before. Level 3 then opens lettuce, Daily challenges and the hand: three things.
export const SHIP_BIN_LEVEL=7;   // the shipping bin (below, at the Warehouse)
export const NEIGHBOURS_LEVEL=8;   // the neighbours (below, after the shipping bin)
export const FEATURE_LEVELS=Object.freeze({...(POND_OPEN?{fishing:POND_LEVEL}:{}),shipbin:SHIP_BIN_LEVEL,neighbours:NEIGHBOURS_LEVEL,challenges:3,cart:7,activities:3,chores:15,mastery:14,family:FAMILY_MIN_LEVEL,stall:19,tractor:18,boosts:10,silo:5,projects:27,valleymarket:62,ranch:70,estateworkshop:75,tradedepot:85,grandfair:90,master:91,seedlab:92,visitors:93,giantpumpkin:94,valleyprojects:95});
export const DELIVERY_LEVELS=Object.freeze({quick:7,village:8,commission:16});
export const FEATURE_NAMES={...(POND_OPEN?{fishing:'Fishing pond'}:{}),shipbin:'Shipping bin',neighbours:'Neighbours',challenges:'Daily challenges',family:'Farm Family',chores:'Farm chores',stall:'Farm stall',mastery:'Medals',tractor:'Tractor',silo:'Silo research',cart:'Delivery orders',projects:'Estate projects',boosts:'Diamond boosts',activities:'A helping hand',valleymarket:'Valley Market',ranch:'The Ranch',estateworkshop:'Estate Workshop',tradedepot:'Trade Depot',grandfair:'Grand Valley Fair',master:'Master points',seedlab:'Seed Lab',visitors:'Valley visitors',giantpumpkin:'Giant pumpkin',valleyprojects:'Valley projects'};
export function guidedFarm(state){return state.progression?.mode==='guided';}
const kept=(state,kind,key)=>state.progression?.kept?.[kind]?.includes(key)===true;
export function buildingCost(state,key){return guidedFarm(state)?BUILDING_COSTS[key]??0:BUILDINGS[key]?.buildCost??0;}
export function constructionNeeds(state,key){return guidedFarm(state)?({dairy:['mill'],bakery:['dairy','windmill']}[key]??[]).filter(k=>!buildingUnlocked(state,k)):[];}
export function cropUnlockHint(state,crop){if(seasonCrop(crop))return 'Plant this crop with a seed packet from the Season Pass.';return `Reach level ${guidedFarm(state)?CROP_LEVELS[crop]:CROPS[crop].minLevel??1}.`;}
export function buildingUnlockHint(state,key){return `Reach level ${guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1}.`;}
export function cropUnlocked(state,crop){return Object.hasOwn(CROPS,crop)&&!seasonCrop(crop)&&(kept(state,'crops',crop)||levelOf(state)>=(guidedFarm(state)?CROP_LEVELS[crop]:CROPS[crop].minLevel??1));}
export function buildingEligible(state,key){return Object.hasOwn(BUILDINGS,key)&&(kept(state,'buildings',key)||levelOf(state)>=(guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1));}
export function buildingUnlocked(state,key){return buildingEligible(state,key)&&(!buildingCost(state,key)||state.buildings[key]?.built===true);}
// The Valley Market, the Ranch and the wave-3 places (Estate Workshop, Trade Depot, Grand Valley Fair) are new for every farm,
// old or new: they open at their level, never earlier. The Fishing pond too (11 Oct 2026): an old farm waits for level 4 like a new one.
const LATE_FEATURES=Object.freeze(['fishing','valleymarket','ranch','estateworkshop','tradedepot','grandfair','master','seedlab','visitors','giantpumpkin','valleyprojects']);
// Every feature opens at its level, on every farm (19 Oct 2026, the owner: what you have not reached the level for is locked, also under
// More). Before, a farm that had a feature when its level moved later kept it (progression.kept.features) and an older (legacy) farm had
// every feature from level 1. Nothing is taken away: what was bought keeps working (silo steps, running boosts), and what waits (medals to
// claim, the order board, a helping-hand job, chore practice) is there again at the level. The kept lists stay in the saves; crops,
// buildings, recipes and order tiers still keep theirs. The LATE_FEATURES line stays as it is: a closed pond has no level at all.
export function featureUnlocked(state,key){if(key==='family')return familyUnlocked(state);if(LATE_FEATURES.includes(key))return levelOf(state)>=FEATURE_LEVELS[key];return levelOf(state)>=(FEATURE_LEVELS[key]??1);}
export function featureUnlockHint(key){return `Reach level ${FEATURE_LEVELS[key]} to unlock ${FEATURE_NAMES[key]}.`;}
export function recipeLevel(state,id){const factory=RECIPES[id]?.building==='factory';if(factory)return Math.max(FACTORY_LEVEL,RECIPES[id].base?recipeLevel(state,RECIPES[id].base):1);return guidedFarm(state)&&!kept(state,'recipes',id)&&!kept(state,'buildings',RECIPES[id].building)?RECIPE_LEVELS[id]??1:RECIPES[id].minLevel??1;}
export function deliveryTierUnlocked(state,tier){return !guidedFarm(state)||kept(state,'orderTiers',tier)||levelOf(state)>=DELIVERY_LEVELS[tier];}
const FEATURE_ART={fishing:'fishingpond',shipbin:'shipping-bin',neighbours:'friendship-heart',challenges:'quests',family:'familyhall',mastery:'trophy',projects:'estate',boosts:'boost',activities:'helping-hand',valleymarket:'valley-market',ranch:'ranch',estateworkshop:'estate-workshop',tradedepot:'trade-depot',grandfair:'grand-fair',master:'master',seedlab:'seedlab',visitors:'visitors',giantpumpkin:'giantpumpkin',valleyprojects:'valleyprojects'};
// World II's unlocks (its places, and the farm's recipes for it) only show from level 100: below it nothing of the village does. Its places
// are their own kind (Oct 2026): built from a golden brief at the market square, one at a time, never from Buildings.
const worldTwoEntry=(state,level)=>level<WORLD_TWO_LEVEL||worldTwoOpen(state);
export function unlockEntries(state){return [
 ...Object.entries(CROPS).map(([key,c])=>({id:'crop:'+key,name:c.name,art:key,kind:'Crop',level:guidedFarm(state)?CROP_LEVELS[key]:c.minLevel??1,unlocked:cropUnlocked(state,key),hint:cropUnlockHint(state,key)})),
 ...Object.entries(BUILDINGS).filter(([key])=>key!=='familyhall'&&worldTwoEntry(state,guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1)).map(([key,b])=>({id:'building:'+key,name:b.name,art:key,kind:worldTwoBuilding(key)?'Village place':buildingCost(state,key)?'Ready to build':'Building',level:guidedFarm(state)?BUILDING_LEVELS[key]:b.minLevel??1,unlocked:buildingEligible(state,key),hint:buildingUnlockHint(state,key)})),
 // The market week (Oct 2026): an activity of the village's market square, so only from level 100, like every World II entry.
 ...(worldTwoOpen(state)?[{id:'village:week',name:'Market week',art:'villagemarket',kind:'Activity',level:VILLAGE_WEEK_LEVEL,unlocked:levelOf(state)>=VILLAGE_WEEK_LEVEL,hint:`Reach level ${VILLAGE_WEEK_LEVEL}.`}]:[]),
 // The miller's order (17 Oct 2026): from level 100 like every World II entry, so level 115's card names it and Coming up shows it before.
 ...(worldTwoOpen(state)?[{id:'village:miller',name:'The miller’s order',art:'villager-miller',kind:'Activity',level:MILLER_LEVEL,unlocked:levelOf(state)>=MILLER_LEVEL,hint:`Reach level ${MILLER_LEVEL}.`}]:[]),
 // The village's landmarks (Oct 2026), from level 100 like every World II unlock: built from the golden brief after the last place.
 ...Object.entries(VILLAGE_LANDMARKS).filter(([,l])=>worldTwoEntry(state,l.level)).map(([key,l])=>({id:'landmark:'+key,name:l.name,art:l.art,kind:'Landmark',level:l.level,unlocked:levelOf(state)>=l.level,hint:`Reach level ${l.level}.`})),
 ...Object.entries(FEATURE_NAMES).map(([key,name])=>({id:'feature:'+key,name,art:FEATURE_ART[key]??key,kind:'Activity',level:FEATURE_LEVELS[key],unlocked:featureUnlocked(state,key),hint:featureUnlockHint(key)})),
 // Plan F (13 Oct 2026): village orders (level 8) and special commissions (16) come to the delivery orders on their level, and its card
 // says so (level 8 named only the Bakery). Their art is the order card's own (cart, trophy).
 ...Object.entries(DELIVERY_LEVELS).filter(([tier])=>tier!=='quick').map(([tier,level])=>({id:'orders:'+tier,name:tier==='village'?'Village orders':'Special commissions',art:tier==='village'?'cart':'trophy',kind:'Activity',level,unlocked:deliveryTierUnlocked(state,tier),hint:`Reach level ${level}.`})),
 // The Fishing pond's second page (11 Oct 2026): 8 more fish from level 20. Listed only from that level (nothing of page two shows below it),
 // so it is on level 20's card and never in Coming up; a farm already past 20 when it came has it without a card.
 ...(POND_OPEN&&levelOf(state)>=POND_PAGE_TWO_LEVEL?[{id:'pond:page2',name:`${FISH_PAGES[1].length} new fish in the Fishing pond`,art:'fish-koi',kind:'Activity',level:POND_PAGE_TWO_LEVEL,unlocked:featureUnlocked(state,'fishing'),hint:`Reach level ${POND_PAGE_TWO_LEVEL}.`}]:[]),
 // The village lake (12 Oct 2026, part D): listed only from level 100 like every World II entry, its page two only from 120 like the
 // pond's, so each is on its level's card and never in Coming up; a farm already past them when the lake opens has them without a card.
 ...(lakeOpen(state)?[{id:'lake:open',name:'Village lake',art:'villagelake',kind:'Activity',level:LAKE_LEVEL,unlocked:true,hint:`Reach level ${LAKE_LEVEL}.`}]:[]),
 ...(lakePageTwoOpen(state)?[{id:'lake:page2',name:`${LAKE_FISH_PAGES[1].length} new fish in the Village lake`,art:'fish-goldentrout',kind:'Activity',level:LAKE_PAGE_TWO_LEVEL,unlocked:true,hint:`Reach level ${LAKE_PAGE_TWO_LEVEL}.`}]:[]),
 ...Object.entries(RECIPES).filter(([key,r])=>r.building!=='factory'&&buildingUnlocked(state,r.building)&&worldTwoEntry(state,recipeLevel(state,key))).map(([key,r])=>({id:'recipe:'+key,name:r.name,art:Object.keys(r.output)[0],kind:'Recipe',level:recipeLevel(state,key),unlocked:recipeUnlocked(state,key),hint:recipeUnlockHint(state,key)})),
 // Fields 9-12 only for farms that started with 8 (a farm that has more than 8 but fewer than 12 fields, or 8).
 ...(state.plots.length<12||state.progression?.fields===STARTER_FIELDS?EARLY_FIELDS.map((field,i)=>({id:'field:'+(i+9),name:`Field ${i+9}`,art:'estate',kind:'Ready to expand',level:field.level,unlocked:levelOf(state)>=field.level||state.plots.length>=i+9,hint:`Level ${field.level} · Expand at the Farmhouse for ${field.coins} coins.`})):[]),
 // Fields 29-40 only once the farm owns the field before (10 Oct 2026): fields 13-28 come first, so from level 30 the level-up card
 // and Coming up announced fields nobody could buy yet.
 ...ENDGAME_FIELDS.map((field,i)=>({id:'field:'+(i+29),name:`Field ${i+29} expansion`,art:'estate',kind:'Ready to expand',level:field.level,unlocked:levelOf(state)>=field.level||state.plots.length>=i+29,hint:`Level ${field.level} · Expand at the Farmhouse with coins and supplies.`})).filter((_,i)=>state.plots.length>=i+28),
 // The Estate Workshop's improvements, each at its own level (10 Oct 2026: the stretch 75-88 listed none of them).
 ...Object.entries(IMPROVEMENTS).map(([key,i])=>({id:'improvement:'+key,name:i.name,art:i.art,kind:'Improvement',level:i.level,unlocked:featureUnlocked(state,'estateworkshop')&&levelOf(state)>=i.level,hint:`Reach level ${i.level}.`}))
 ];}
// The recipes a building lists (Oct 2026): every recipe it makes, except World II's below level 100. The Kitchen, the Bakery and the
// Factory listed packed lunches and the heirloom bakes under "Coming later" from level 8, 12 and 50, and the build panel showed them.
export const buildingRecipes=(state,key)=>Object.keys(RECIPES).filter(id=>RECIPES[id].building===key&&worldTwoEntry(state,recipeLevel(state,id)));
// What a Market tab lists (Oct 2026; was economy-ui.js marketEntries): legacy farms listed every good, the heirloom bakes too.
export function marketItems(state,tab){
 if(tab==='village')return Object.keys(VILLAGE_GOODS).filter(k=>state.inventory[k]>0||itemAvailable(state,k));
 // A season crop (cranberries) only while the farm has some to sell.
 if(tab==='crops'){const season=Object.keys(SEASON_CROPS).filter(k=>state.inventory[k]>0);if(season.length)return [...season,...marketItems(state,'farmcrops')];}
 return Object.keys(tab==='crops'||tab==='farmcrops'?{...CROPS,...HEIRLOOMS}:PRODUCTS).filter(k=>(worldTwoOpen(state)||!worldTwoItem(k))&&(HEIRLOOMS[k]?state.inventory[k]>0||itemAvailable(state,k):!guidedFarm(state)||state.inventory[k]>0||itemAvailable(state,k)));
}
// Two features were moved later on purpose: A helping hand (level 6 -> 8) and farm chores (level 4 -> 10). Moving a feature later would take it
// from farms that already have it, so a guided farm from before (progression version below 4) keeps what it had: chores from level 4, hands-on
// jobs from level 6, or as soon as it has done one. It runs once per farm and keeps any other kept rights. New farms are created at version 4.
// Since 19 Oct 2026 featureUnlocked no longer reads the kept features (every feature opens at its level on every farm); the migrations still
// write them, so a save stays the same shape and a rollback opens them again.
const KEPT_FROM_LEVEL=Object.freeze({chores:4,activities:6});
function migrateFeatureLevels(state){
 if(!guidedFarm(state)||(state.progression.version??0)>=4)return;
 const level=levelOf(state),rights=Object.entries(KEPT_FROM_LEVEL).filter(([key,from])=>level>=from||(state.stats?.[key]??0)>0).map(([key])=>key);
 if(rights.length){const kept=state.progression.kept??={};kept.features=[...new Set([...(kept.features??[]),...rights])];}
 state.progression.version=4;
}
// Version 5 (25 Sep 2026): unlocks between levels 10 and 38 were spread out, so the first day is less crowded and every level up to 48
// brings something new: the Packing shed 10 -> 11, the Farm stall 11 -> 19, the Tractor 12 -> 18, commission orders 12 -> 16, Silo
// research 18 -> 26, Estate projects 19 -> 27, and five recipes. A guided farm that already had one under the old levels keeps it (a
// building, a recipe or an order tier; a feature only until 19 Oct 2026, see migrateFeatureLevels).
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
// Version 6 (9 Oct 2026, the owner's call: new things open gradually, without a flood): the first half hour opened 29 new things, about
// one a minute, so eight moved later and no level up to 20 opens more than three: Delivery orders 5 -> 7, Green beans 7 -> 12 (with the
// vegetable stew, their first use; they waited five levels for it), the fresh salad 10 -> 11 (with the Packing shed it is made in), the
// vegetable box 11 -> 13, Medals 7 -> 14, natural fertilizer 9 -> 14, Farm chores 10 -> 15 and the wind-milled barley feed 7 -> 18.
// Chores, fertilizer and green beans stay at 15 or below, so every event goal can still be done when events open at level 15. A guided
// farm that already had one under the old level keeps it, as with version 5, and so does a farm that has already used it (features only
// until 19 Oct 2026, see migrateFeatureLevels).
const GRADUAL_FROM=Object.freeze({crops:{greenbeans:7},features:{cart:5,mastery:7,chores:10},orderTiers:{quick:5},
 recipes:{salad:10,vegetables:11,fertilizer:9,windfeed:7}});
// What a farm has used stays open on every load, not only on the first: a farm that met the old levels after a rollback and used
// them there keeps them when this comes back (found in review, 9 Oct 2026).
function migrateGradualUnlocks(state){
 if(!guidedFarm(state))return;
 const before=(state.progression.version??0)<6,level=levelOf(state);
 const used={cart:(state.stats?.deliveries??0)>0,quick:(state.stats?.deliveries??0)>0,mastery:(state.mastery?.claimed?.length??0)>0,chores:(state.stats?.chores??0)>0};
 for(const [kind,levels] of Object.entries(GRADUAL_FROM)){
  const had=Object.entries(levels).filter(([key,from])=>(before&&level>=from)||used[key]).map(([key])=>key);
  if(had.length){const rights=state.progression.kept??={};rights[kind]=[...new Set([...(rights[kind]??[]),...had])];}
 }
 state.progression.version=Math.max(state.progression.version??0,6);
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
 if(HEIRLOOMS[item])return heirloomFound(state,item);
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
 // Since Oct 2026 only through villageBuild: a game from before this update gets this instead of paying the old price.
 if(worldTwoBuilding(key))throw new Error('Village places are built from the golden brief at the market square.');
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
// Several crops at once, in one save (26 Sep 2026: "Remove all" and "Remove all but regrowing" in Your fields). Each field comes with
// the planting the player saw; if any of them changed, nothing is removed.
export function clearPlantings(state,fields){
 if(!Array.isArray(fields)||fields.length<1||fields.length>state.plots.length||new Set(fields.map(f=>f?.id)).size!==fields.length)throw new Error('Choose the fields to clear.');
 for(const f of fields){
  const p=state.plots[f?.id];
  if(!Number.isInteger(f.id)||!p||!CROPS[p.crop])throw new Error('Choose fields with something growing on them.');
  if(p.plantedAt!==f.expectedPlantedAt)throw new Error('A planting has changed. Review your fields before removing.');
 }
 return {cleared:fields.map(f=>clearPlanting(state,f.id,f.expectedPlantedAt).id)};
}
// One crop a harvest (22 Oct 2026, the owner: "niet meer twee of drie crops van water/care, maar 1 per keer, en water/care verlaagt
// productietijd aanzienlijk"). Every harvest gives 1 crop, whatever water and care; both make the crop ripen much sooner instead:
// - Water takes WATER_CUT (60%) off the time the crop still needs (the Water tower WATER_TOWER_CUT, 65%: the same relative extra as its
//   old 30% against 20%, 0.35 / 0.4 = 0.7 / 0.8).
// - Extra care opens at CARE_AT (15%) of the growing time and takes CARE_CUT (60%) off what is left then.
// So a crop watered at planting is ready at 40% of its time, watered and cared for at 15% + 25% × 40% = 25%: four times the harvests.
// That keeps the crops an hour the same as before for a farmer who waters and cares (3 crops in 72.5% of the time = 4.1 an hour of
// growing time; now 1 in 25% = 4.0), and the same for one who only waters (2 in 80% = 1 in 40%) or does neither, so the buildings, the
// Factory, the orders and the market get as many crops as before. More harvests means more seeds: seeds cost a third of what they did,
// and a harvest gives two thirds of its old XP without the old doubling (the old 2× XP for 3 crops = 2/3 of the XP per crop; wheat too, 2 -> 1,
// the owner's option b: a farmer who only waters gains about a third more XP from the fields, not two thirds). The owner's
// proposal (water and care to about 40% of the time) gave 40% fewer crops an hour to carers, with 78-99% of the crops of farms from
// level 20 going into the buildings; the cuts above reach the same rule with the same supply. Balance tables: plan-een-gewas/balans.md.
// Crops planted before this (plots without oneCrop) keep the old rule for that cycle: 1 crop + 1 for water + 1 for care, the old cuts
// (water 20%, 30% with the Water tower; care 15%) and the old XP (LEGACY_HARVEST_XP, doubled with both).
export const CARE_AT=.15,WATER_CUT=.6,WATER_TOWER_CUT=.65,CARE_CUT=.6;
export const oneCropPlot=plot=>plot?.oneCrop===true;
const LEGACY_HARVEST_XP=Object.freeze({corn:5,wheat:2,cabbage:18,pumpkin:36,sunflower:68,barley:12,lettuce:3,redcabbage:48,cauliflower:27,greenbeans:21,apples:33,berries:27,squash:60,polebeans:30,ciderapples:40,cherries:46,cranberries:27,sprouts:27});
export function waterCut(state,plot){const tower=hasImprovement(state,'watertower');return oneCropPlot(plot)?(tower?WATER_TOWER_CUT:WATER_CUT):(tower?.3:.2);}
export const careCut=plot=>oneCropPlot(plot)?CARE_CUT:.15;
// Water and care on a growing crop (by hand, the tractor, Full care and the night shift): what they take off its time, in ms.
function waterPlot(state,p,now){const before=p.readyAt;p.readyAt=now+(p.readyAt-now)*(1-waterCut(state,p));p.watered=true;return before-p.readyAt;}
function carePlot(p,now){const before=p.readyAt;p.readyAt=now+(p.readyAt-now)*(1-careCut(p));p.tended=true;return before-p.readyAt;}
// The care marker shows up after CARE_MIN_MS or CARE_AT of the growing time. The beginner boost shortens both: the growing time is
// already shorter, and the minimum shrinks with it, so Care fits inside a short wheat field. 15 seconds since one crop a harvest (30
// before): with 30, wheat (2 minutes) needed 37 seconds with water and care instead of 30, a fifth fewer wheat an hour for a carer.
export const CARE_MIN_MS=15000;
const careDelay=(state,duration,now)=>Math.max(CARE_MIN_MS*(1-rookieBoost(state,now)),duration*CARE_AT);
export function cropDuration(state,crop,regrowing=false,now=Date.now()){return Math.round((regrowing?(CROPS[crop].regrow??CROPS[crop].duration):CROPS[crop].duration)*(1-siloBonus(state.siloLevel??0).growth)*(vipActive(state,now)?.9:1)*(1-rookieBoost(state,now))*(regrowing&&hasImprovement(state,'ladders')?.8:1)*(1-masterBonus(state,'growth'))*(1-valleyProjectBonus(state,'canal'))*(regrowing?1-valleyProjectBonus(state,'terraces'):1));}
// How long a crop takes when it is watered at planting and cared for as soon as care opens: what the seed shop and the seed picker show
// (22 Oct 2026, the owner: "zet bij Zaden de tijd die het zou kosten met water en care"). The same cuts as on a field, with the farm's
// own growth bonuses, the Water tower and the boosts that run now.
export function caredDuration(state,crop,regrowing=false,now=Date.now()){
 const d=cropDuration(state,crop,regrowing,now),care=careDelay(state,d,now),watered=d*(1-waterCut(state,{oneCrop:true}));
 return Math.round(watered>care?care+(watered-care)*(1-CARE_CUT):watered);
}
// What a tap on a field does: plant an empty one, harvest a ripe one, and give a growing crop what it can use now, extra care
// first once it is ready (it has its own moment), then water. A tool the farmer picked on purpose (Water or Care) goes
// first when it fits this field. null: nothing to do yet (the crop is watered and cared for, or care is not ready).
// Water belongs to planting: a crop takes water until its extra care opens (CARE_AT of the growing time) and at least in its first
// minute (so new farmers, whose crops grow in seconds, can still follow the guide). Care comes after that, until harvest.
export const WATER_MIN_MS=60000;
export function waterUntil(plot){return Math.max(plot.careAt??plot.plantedAt??0,(plot.plantedAt??0)+WATER_MIN_MS);}
export function canWater(plot,now=Date.now()){return !!plot.crop&&!plot.watered&&now<plot.readyAt&&now<waterUntil(plot);}
// picked: the farmer chose the tool themselves (not the tool bar following the last tap). Water chosen on a crop that can no longer
// take water does nothing (7 Oct 2026: it gave care instead and switched the tool, and new farmers never finished the water step).
export function fieldTapAction(plot,now=Date.now(),tool='plant',picked=false){
 if(!plot.crop)return 'plant';
 if(now>=plot.readyAt)return 'harvest';
 const canTend=!plot.tended&&now>=(plot.careAt??plot.plantedAt),watering=canWater(plot,now);
 if(tool==='water'&&watering)return 'water';
 if(tool==='water'&&picked)return null;
 if(tool==='tend'&&canTend)return 'tend';
 return canTend?'tend':watering?'water':null;
}
export function harvestYield(plot){return oneCropPlot(plot)?1:1+(plot.watered?1:0)+(plot.tended?1:0);}
// The XP a harvest gives (before Double XP): the crop's XP; a crop planted before one crop a harvest its old XP, doubled with both.
export function harvestXp(plot){const crop=plot.crop;return oneCropPlot(plot)?CROPS[crop].xp:(LEGACY_HARVEST_XP[crop]??CROPS[crop].xp)*(plot.watered&&plot.tended?2:1);}
// What a harvest gives right now: Double harvest doubles every harvest while it runs (also a crop that ripened before it started).
export function harvestBoostActive(state,now=Date.now()){return state.boosts?.harvestUntil>now;}
export function harvestQuantity(state,plot,now=Date.now()){return harvestYield(plot)*(harvestBoostActive(state,now)?2:1);}
// Under 2 minutes with its seconds (7 Oct 2026: a 61-second batch read "2m"); from there whole minutes, rounded up.
export function formatDuration(ms){const s=Math.max(0,Math.ceil(ms/1000));if(s<60)return `${s}s`;if(s<120)return `1m${s>60?` ${s-60}s`:''}`;const m=Math.ceil(s/60);if(m<60)return `${m}m`;const h=Math.floor(m/60);if(h<24)return `${h}h${m%60?` ${m%60}m`:''}`;return `${Math.floor(h/24)}d${h%24?` ${h%24}h`:''}`;}
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
// first product (a Dairy Barn at level 6 hands in 24 milk to reach level 7). Up to level 3 it is coins only, so the beginner guide's
// first upgrade stays one tap. Upgrades are paid with coins and goods only (not diamonds, so the game does not feel pay to win); the
// Buildings discount boost (diamonds) halves both.
// The Factory (26 Sep 2026, far stronger late in the game than one building) asks for goods from across the valley from its first
// upgrade: 16 flour, 4 cheese and 2 cloth per level, plus as many harvest hampers as its level from level 4, squash soup from 6 and
// cider from 8. All of them can be made by level 50, when the Factory opens, and they come from seven buildings, so upgrading
// those makes the Factory's upgrades quicker. 9 -> 10: 144 flour, 36 cheese, 18 cloth, 9 hampers, 9 soup and 9 cider.
export const UPGRADE_GOODS_FROM=3;
// Village places upgrade with planks and stone (Oct 2026, the owner's choice), 4 and 6 for every level they have, the same for all of
// them: their own first goods asked up to 252 heirloom flour of the Village Windmill (42 Seed Lab crosses, 210 sunflowers).
export const VILLAGE_UPGRADE_GOODS=Object.freeze({plank:4,stone:6});
// From level 125 the village's new places ask roof tiles too (Oct 2026, the owner's choice 8a): 2 for every level, from the upgrade to
// level 4, for the places that open at level 125 or later. The older places keep planks and stone, so a farm without a Kiln can upgrade them.
export const VILLAGE_TILES_FROM=125,VILLAGE_UPGRADE_TILES=2;
let firstProducts=null;
export function upgradeGoods(building,level){
 if(!BUILDINGS[building]||BUILDINGS[building].type!=='production'||level<1||level>=MAX_BUILDING_LEVEL)return {};
 if(building==='factory')return {flour:16*level,cheese:4*level,cloth:2*level,...(level>=4?{harvesthamper:level}:{}),...(level>=6?{squashsoup:level}:{}),...(level>=8?{cider:level}:{})};
 if(level<UPGRADE_GOODS_FROM)return {};
 if(worldTwoBuilding(building))return Object.fromEntries(Object.entries({...VILLAGE_UPGRADE_GOODS,...(BUILDING_LEVELS[building]>=VILLAGE_TILES_FROM?{rooftile:VILLAGE_UPGRADE_TILES}:{})}).map(([k,n])=>[k,n*level]));
 firstProducts??=Object.fromEntries(Object.keys(BUILDINGS).map(key=>[key,Object.entries(RECIPES).filter(([,r])=>r.building===key).sort(([a],[b])=>(RECIPE_LEVELS[a]??0)-(RECIPE_LEVELS[b]??0))[0]?.[1]]).filter(([,r])=>r).map(([key,r])=>[key,Object.entries(r.output)[0]]));
 const product=firstProducts[building];return product?{[product[0]]:2*level*product[1]}:{};
}
// What the next upgrade of a building asks besides coins: its goods, halved by the Buildings discount voucher (level is the farm
// level it needs: none any more), or null.
export function upgradeRequirements(state,building){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')return null;
 const voucher=state.boosts?.upgradeCredits>0,master=masterUpgrade(state,building);
 const materials=Object.fromEntries(Object.entries(master?master.materials:upgradeGoods(building,state.buildings[building].level)).map(([item,n])=>[item,voucher?Math.ceil(n/2):n]));
 return Object.keys(materials).length?{level:master?.level??1,materials}:null;
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
 if(level>=BASE_BUILDING_LEVEL){const master=masterUpgrade(state,building);if(master)return Math.ceil(master.coins*voucher);const step=level<MAX_BUILDING_LEVEL?ESTATE_UPGRADES[level-BASE_BUILDING_LEVEL]:null;return step?Math.ceil(step.coins*voucher*factoryPrice):null;}
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
 for(const id of [0,1,2])plots[id]={id,crop:'corn',plantedAt:now-CROPS.corn.duration*1.1,readyAt:now-1000,watered:false,oneCrop:true};
 [30000,60000,90000].forEach((left,i)=>{plots[3+i]={id:3+i,crop:'wheat',plantedAt:now+left-CROPS.wheat.duration,readyAt:now+left,watered:false,oneCrop:true};});
 return {version:14,progression:{mode:'guided',version:6,fields:STARTER_FIELDS},coins:STARTER_COINS,xp:0,xpCurve:XP_CURVE,keep:{...STARTER_KEEP},rookieUntil:now+ROOKIE_MS,inventory:{...Object.fromEntries(Object.keys(ITEMS).map(k=>[k,0])),...STARTER_ITEMS},stats:{harvested:0,planted:0,watered:0,earned:0,produced:0,upgrades:0,expansions:0,bread:0},claimed:[],plots,buildings:Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,{level:1,job:null}]))};
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
  // A season crop takes a seed packet instead of coins (the Season Pass).
  const packet=seasonCrop(crop);
  if(packet){const problem=seasonPlantProblem(state,crop,now);if(problem)throw new Error(problem);}
  else if(!cropUnlocked(state,crop))throw new Error(cropUnlockHint(state,crop));
  if(p.crop)throw new Error('This field is already planted.');
  if(!packet&&state.coins<seedCost(state,crop))throw new Error('Not enough coins. Sell some produce at the market.');
  if(packet)state.seasonSeeds[crop]--;else state.coins-=seedCost(state,crop);
  state.stats.planted++;
  const duration=cropDuration(state,crop,false,now);Object.assign(p,{crop,harvestCycles:0,plantedAt:now,readyAt:now+duration,careAt:now+careDelay(state,duration,now),watered:false,tended:false,fertilized:false,oneCrop:true});
  return {action,crop,cost:packet?0:seedCost(state,crop),...(packet?{packets:1}:{})};
 }
 if(!p.crop)throw new Error('Plant a crop in this field first.');
 if(action==='water'){
  if(now>=p.readyAt)throw new Error('This crop is ready to harvest!');
  if(p.watered)throw new Error('Already watered. Your crop is growing nicely.');
  if(!canWater(p,now))throw new Error('Water right after planting. This crop is past that; give it extra care instead.');
  const saved=waterPlot(state,p,now);state.stats.watered++;
  return {action,crop:p.crop,saved};
 }
 if(action==='tend'){
  if(now>=p.readyAt)throw new Error('This crop is ready to harvest!');
  if(p.tended)throw new Error('This crop has already had extra care.');
  if(now<(p.careAt??p.plantedAt))throw new Error(`Extra care will be available in ${formatDuration(p.careAt-now)}.`);
  const saved=carePlot(p,now);state.stats.tended++;
  return {action,crop:p.crop,yield:harvestYield(p),saved};
 }
 if(now<p.readyAt)throw new Error('Still growing. Give it a little more time.');
 // The very first harvest on a farm is a golden one: three times the crop, a first "wow" worth a few coins.
 const first=guidedFarm(state)&&state.stats.harvested===0,harvested=p.crop,quantity=harvestQuantity(state,p,now)*(first?FIRST_HARVEST_BONUS:1),xp=harvestXp(p);
 state.inventory[harvested]=(state.inventory[harvested]??0)+quantity;state.stats.harvested++;
 // A season crop counts as a harvest (quests, challenges, the weekly goals; the Harvest festival's goal twice), never for a medal, a
 // leaderboard or the crop kinds grown.
 if(seasonCrop(harvested))state.stats.season_crop_harvests=(state.stats.season_crop_harvests??0)+1;
 else{
  state.stats['harvest_'+harvested]=(state.stats['harvest_'+harvested]??0)+quantity;
  state.mastery.harvests[harvested]=(state.mastery.harvests[harvested]??0)+1;
  if(!state.discovered.includes(harvested))state.discovered.push(harvested);
 }
 state.stats.varieties=state.discovered.length;state.xp+=xp;
 const regrowing=!!CROPS[harvested].perennial;
 // One waiting harvest only. A new cycle starts at collection, never at the old deadline.
 if(regrowing){const duration=cropDuration(state,harvested,true,now);Object.assign(p,{plantedAt:now,readyAt:now+duration,careAt:now+careDelay(state,duration,now),watered:false,tended:false,fertilized:false,harvestCycles:(p.harvestCycles??0)+1,oneCrop:true});}
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
 const packet=action==='plant'&&seasonCrop(crop);
 if(action==='plant'){if(!Object.hasOwn(CROPS,crop))throw new Error('Choose a valid crop.');if(packet){const problem=seasonPlantProblem(state,crop,now);if(problem)throw new Error(problem);}else if(!cropUnlocked(state,crop))throw new Error(cropUnlockHint(state,crop));}
 const fields=[],seen=new Set();let short=false,full=false;
 for(const id of ids){
  if(!Number.isInteger(id)||id<0||id>=state.plots.length||seen.has(id))continue;seen.add(id);
  if(fieldTapAction(state.plots[id],now,action)!==action)continue;
  if(action==='plant'&&(packet?seasonSeedsOf(state,crop)<1:state.coins<seedCost(state,crop))){short=true;break;}
  // The Warehouse (22 Oct 2026): a sweep's harvest stops when it is full; the fields harvested so far stay harvested (each field is
  // checked before it is harvested, so the last one may go over the line).
  if(action==='harvest'&&warehouseFull(state)){full=true;break;}
  fields.push({id,...actOnPlot(state,id,action,crop,now)});
 }
 if(!fields.length&&full)throw new Error(warehouseFullText(state));
 if(!fields.length)throw new Error(action==='harvest'?'No crops are ready to harvest there yet.':action==='plant'?(short?(packet?'You have no seed packets left for this crop.':'Not enough coins. Sell some produce at the market.'):'These fields are already planted.'):'Nothing to do on these fields right now.');
 return {action,fields,count:fields.length,...(action==='plant'?{crop,cost:fields.reduce((sum,f)=>sum+f.cost,0),short}:{}),...(full?{full:true}:{})};
}
export function sellCrops(state,item='all',now=Date.now(),day,category,quantity) {
 if(day!==undefined&&day!==utcDay(now))throw new Error('Market prices have refreshed. Check today’s prices before selling.');
 if(category!==undefined&&!['crops','goods','village'].includes(category))throw new Error('Choose a market category.');
 if(item!=='all'&&!Object.hasOwn(ITEMS,item))throw new Error('Choose a valid item.');
 // World II: village goods sell only at the Village market (category 'village'), which buys nothing else.
 const village=category==='village';
 if(village&&!worldTwoOpen(state))throw new Error(`Reach level ${WORLD_TWO_LEVEL} to trade in the village.`);
 if(item!=='all'&&villageGood(item)!==village)throw new Error(village?'The Village market only buys village goods.':'Sell village goods at the Village market.');
 const keys=village?(item==='all'?Object.keys(VILLAGE_GOODS):[item]):category?(category==='crops'?[...Object.keys(CROPS),...Object.keys(HEIRLOOMS),...Object.keys(SEASON_CROPS)]:Object.keys(PRODUCTS)):item==='all'?Object.keys(ITEMS).filter(k=>!villageGood(k)):[item];   // heirlooms sell with the crops
 if(quantity!==undefined&&(item==='all'||(category!==undefined&&!village)||!Number.isSafeInteger(quantity)||quantity<1||quantity>state.inventory[item]))throw new Error('Choose a valid quantity within your stock.');
 if(quantity!==undefined&&quantity>sellableStock(state,item,now))throw new Error(`Keep your first ${keptStock(state,item,now)} ${ITEMS[item].name.toLowerCase()} for now: you need them for your first steps. Sell what you grow or make on top of them; the rest is free to sell after your first 30 minutes.`);
 const amounts=Object.fromEntries(keys.map(k=>[k,quantity??sellableStock(state,k,now)]));
 const first=!village&&firstSaleDouble(state),total=(first?2:1)*marketSaleValue(state,keys.reduce((v,k)=>v+amounts[k]*marketQuote(k,now).price,0),now);
 if(total===0){const kept=keys.filter(k=>keptStock(state,k,now)>0);throw new Error(kept.length?`Your starting ${kept.map(k=>ITEMS[k].name.toLowerCase()).join(' and ')} ${kept.length>1?'are':'is'} kept for your first steps. Harvest or make more to sell, or wait until your first 30 minutes are up.`:'Your basket is empty. Harvest or produce something first.');}
 const units=keys.reduce((v,k)=>v+amounts[k],0);
 for(const k of keys){state.inventory[k]-=amounts[k];state.stats['sold_'+k]=(state.stats['sold_'+k]??0)+amounts[k];}
 // Sold at the Village market: the village's own count, not the farm Market's (quests, challenges and the Items sold board).
 state.coins+=total;state.stats.earned+=total;if(village){state.stats.village_sold=(state.stats.village_sold??0)+units;state.stats.village_earned=(state.stats.village_earned??0)+total;}else state.stats.sold+=units;
 return {coins:total,day:utcDay(now),...(first?{firstSale:true}:{})};
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
export function recipeAvailability(state,id,now=Date.now()){
 if(!Object.hasOwn(RECIPES,id))throw new Error('Choose a valid recipe.');
 const r=recipeFor(state,id);
 const missing=Object.entries(r.input).filter(([k,n])=>state.inventory[k]<n).map(([k,n])=>({item:k,name:ITEMS[k].name,need:n,have:state.inventory[k]}));
 const b=state.buildings[r.building],used=productionJobs(b).length,slots=buildingSlots(state,r.building,now),busy=used>=slots;
 const locked=!recipeUnlocked(state,id);
 const price=r.coins??0,poor=price>0&&state.coins<price;
 const maxCount=locked?0:Math.max(0,Math.min(slots-used,...Object.entries(r.input).map(([k,n])=>Math.floor(state.inventory[k]/n)),...(price?[Math.floor(state.coins/price)]:[])));
 return {canStart:!locked&&!busy&&missing.length===0&&!poor,missing,busy,used,slots,maxCount,locked,price,poor};
}
export function startProduction(state,id,now=Date.now(),count=1,random=secureChoreRandom){
 const a=recipeAvailability(state,id,now),r=RECIPES[id];
 // At most the building's slots: its level's, and one more while the farmhand works there (buildingSlots, 20 Oct 2026).
 if(!Number.isInteger(count)||count<1||count>a.slots)throw new Error(`Choose 1–${a.slots} batches.`);
 if(a.locked)throw new Error(`Unlock this recipe first. ${recipeUnlockHint(state,id)}`);
 if(count>a.slots-a.used)throw new Error('Not enough free production slots. Collect a finished batch first.');
 if(a.price&&state.coins<a.price*count)throw new Error(`You need ${a.price*count} coins for ${count===1?'this batch':`${count} batches`}.`);
 if(count>a.maxCount)throw new Error('Missing ingredients for this many batches.');
 const batches=Array.from({length:count},()=>startSingleProduction(state,id,now,random));
 return {...batches[0],count,batches};
}
function startSingleProduction(state,id,now=Date.now(),random=secureChoreRandom){
 if(!Object.hasOwn(RECIPES,id))throw new Error('Choose a valid recipe.');
 const r=recipeFor(state,id),b=state.buildings[r.building],a=recipeAvailability(state,id,now);
 if(a.busy)throw new Error('All production slots are occupied. Collect a finished batch first.');
 if(a.missing.length)throw new Error('Missing ingredients: '+a.missing.map(m=>`${m.name} (${m.have}/${m.need})`).join(', ')+'.');
 if(a.poor)throw new Error(`You need ${r.coins} coins for this batch.`);
 const duration=batchDuration(state,id,now);
 state.coins-=a.price;
 for(const [k,n]of Object.entries(r.input))state.inventory[k]-=n;
 b.batchSequence=(b.batchSequence??0)+1;
 const chance=beyondMaxBuilding(r.building)?doubleBatchChance(b.level):0,double=chance>0&&random()<chance;
 const job={id:`${r.building}-${b.batchSequence}`,recipe:id,startedAt:now,readyAt:now+duration,output:double?scaled(r.output,2):{...r.output},xp:r.xp,...(double?{double:true}:{})};
 if(productionJobs(b).some(j=>j.readyAt>now))state.stats.parallel_batches=(state.stats.parallel_batches??0)+1;
 if(!b.job)b.job=job;else (b.extraJobs??=[]).push(job);
 return {building:r.building,recipe:id,jobId:job.id,readyAt:job.readyAt,...(double?{double:true}:{})};
}
export function collectProduction(state,building,now=Date.now(),jobId){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')throw new Error('Choose a production building.');
 const b=state.buildings[building],jobs=productionJobs(b),job=jobId===undefined?(jobs.find(j=>j.readyAt<=now)??jobs[0]):jobs.find(j=>j.id===jobId);
 if(!job)throw new Error('Nothing to collect yet. Start a recipe first.');
 if(now<job.readyAt)throw new Error('This batch is still being made.');
 const r=RECIPES[job.recipe],output=job.output??r.output,xp=job.xp??r.xp;
 for(const [k,n]of Object.entries(output)){state.inventory[k]+=n;state.stats['made_'+k]=(state.stats['made_'+k]??0)+n;}
 // A batch counts where it was made (30 Sep 2026): the village's places in the village's own count, so the farm's quests, challenges
 // and leaderboards stay the farm's; the goods themselves are in made_* either way (the village's own boards read those).
 if(worldTwoBuilding(building))state.stats.village_batches=(state.stats.village_batches??0)+1;else state.stats.produced++;
 state.stats.bread+=output.bread??0;state.xp+=xp;
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
// Builder's crates (Oct 2026, the owner's choice 4a): packed at the village's Lumber Camp from level 128, each takes BUILDER_CRATE_COINS off
// a farm building's upgrade (to level 2-10), after the Buildings discount and never more than half of what is left, so an upgrade always
// costs coins. Not the Factory, the steps past level 10 (master tools) or the village's own places. 8,000 coins for a crate the Village
// market buys for 5,200: 1.54 times, about the villagers' premium (convenience, not a leap).
export const BUILDER_CRATE_COINS=8000;
// How many crates this upgrade may take now: 0 below level 100 and wherever crates do not count, so the card shows no crate option.
export function builderCrates(state,building){
 if(!worldTwoOpen(state)||!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production'||building==='factory'||worldTwoBuilding(building)||(state.buildings[building]?.level??1)>=MAX_BUILDING_LEVEL)return 0;
 const cost=upgradeCost(state,building);return cost?Math.min(state.inventory.builderscrate??0,Math.floor(cost/2/BUILDER_CRATE_COINS)):0;
}
export function upgradeBuilding(state,building,currency='coins',expectedCost,expectedLevel,crates){
 if(!Object.hasOwn(BUILDINGS,building)||BUILDINGS[building].type!=='production')throw new Error('Choose a production building.');
 if(!buildingUnlocked(state,building))throw new Error('Open this building before upgrading it.');
 if(currency!=='coins')throw new Error('Upgrades are paid with coins and goods.');   // since 26 Sep 2026, not with diamonds
 const b=state.buildings[building],estate=upgradeRequirements(state,building);
 const cost=upgradeCost(state,building);
 if(cost===null)throw new Error('This building is fully upgraded.');
 // A running batch is unaffected either way: its speed and output were fixed when it started, not read live off b.level. Upgrading only
 // changes what a NEW batch gets, so there is nothing to protect by making a farmer wait for every slot to empty first.
 if(estate&&levelOf(state)<estate.level)throw new Error(`Reach level ${estate.level} to upgrade this building to level ${b.level+1}.`);
 // With builder's crates (from the card's second row): as many as the screen showed, which must still be what may be used now.
 if(crates!==undefined&&!(Number.isInteger(crates)&&crates>=1&&crates<=builderCrates(state,building)))throw new Error('Your builder’s crates have changed. Look at the upgrade again.');
 const used=crates??0,pay=cost-used*BUILDER_CRATE_COINS;
 if(state[currency]<pay)throw new Error(`You need ${pay} ${currency} for this upgrade.`);
 const missing=estate?Object.entries(estate.materials).filter(([key,n])=>(state.inventory[key]??0)<n):[];
 if(missing.length)throw new Error(`Make the goods first: ${missing.map(([key,n])=>`${n} ${ITEMS[key].name}`).join(', ')}.`);
 state[currency]-=pay;if(estate)for(const [key,n] of Object.entries(estate.materials))state.inventory[key]-=n;
 if(used){state.inventory.builderscrate-=used;state.stats.builder_crates_used=(state.stats.builder_crates_used??0)+used;}
 b.level++;state.stats.upgrades++;state.xp+=15;
 // Past level 10 (World II): counted per building, so a level can never come back from an old save (normalizeFarm), and for the
 // World II leaderboard.
 if(b.level>MAX_BUILDING_LEVEL){b.beyond=b.level-MAX_BUILDING_LEVEL;state.stats.beyond_upgrades=(state.stats.beyond_upgrades??0)+1;}
 if(state.boosts?.upgradeCredits>0)state.boosts.upgradeCredits--;
 if(building==='windmill')state.stats.windmill_upgrades=(state.stats.windmill_upgrades??0)+1;
 return {building,level:b.level,cost:pay,currency,materials:estate?{...estate.materials}:{},crates:used};
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
 state.claimed.push(id);state.coins+=q.reward;state.xp+=xp;state.stats.quests_claimed=(state.stats.quests_claimed??0)+1;   // the Season Pass counts claimed quests
 return {coins:q.reward,xp};
}
// World II's own quests (30 Sep 2026): a list for the village, apart from the farm's (their own tab in Your quests, from level 100).
// Each opens at the level its place or recipe does and counts the village's own numbers: its goods (made_*), its batches
// (village_batches), its market (village_sold, village_earned), its places (built_*) and the farm's buildings past level 10
// (beyond_upgrades). Claimed ones are kept in state.villageQuests, so they never count towards the farm's Quests done.
export const VILLAGE_QUESTS=Object.freeze([
 {title:'Lunch for the road',description:'Pack 30 lunches in the Farm Kitchen.',stat:'made_packedlunch',target:30,reward:15000,minLevel:100},
 {title:'Open the Mine',description:'Build the Mine.',stat:'built_mine',target:1,reward:20000,minLevel:100},
 {title:'Open the Lumber Camp',description:'Build the Lumber Camp.',stat:'built_lumbercamp',target:1,reward:20000,minLevel:100},
 {title:'First trips',description:'Collect 10 batches in the village.',stat:'village_batches',target:10,reward:15000,minLevel:100},
 {title:'Stone by stone',description:'Dig 200 stone.',stat:'made_stone',target:200,reward:20000,minLevel:100},
 {title:'Iron in the hills',description:'Dig 150 iron ore.',stat:'made_ironore',target:150,reward:25000,minLevel:100},
 {title:'Timber!',description:'Chop 300 logs.',stat:'made_timber',target:300,reward:25000,minLevel:100},
 {title:'Planks for the village',description:'Saw 100 planks.',stat:'made_plank',target:100,reward:30000,minLevel:100},
 {title:'Village trader',description:'Sell 500 goods at the Village market.',stat:'village_sold',target:500,reward:30000,minLevel:100},
 {title:'Light the forge',description:'Build the Smithy.',stat:'built_smithy',target:1,reward:30000,minLevel:102},
 {title:'Iron bars',description:'Smelt 25 iron bars.',stat:'made_ironbar',target:25,reward:40000,minLevel:102},
 {title:'Tools for the miners',description:'Forge 40 pickaxes.',stat:'made_pickaxe',target:40,reward:50000,minLevel:102},
 {title:'A silver seam',description:'Dig 120 silver ore.',stat:'made_silverore',target:120,reward:60000,minLevel:105},
 {title:'Silver in hand',description:'Smelt 20 silver bars.',stat:'made_silverbar',target:20,reward:80000,minLevel:105},
 {title:'Master craft',description:'Forge 3 master tools.',stat:'made_mastertools',target:3,reward:100000,minLevel:108},
 {title:'Past the top',description:'Take a farm building past level 10.',stat:'beyond_upgrades',target:1,reward:100000,minLevel:108},
 {title:'A busy village',description:'Collect 500 batches in the village.',stat:'village_batches',target:500,reward:150000,minLevel:110},
 {title:'Village market regular',description:'Earn 1,000,000 coins at the Village market.',stat:'village_earned',target:1000000,reward:150000,minLevel:110},
 {title:'The village windmill',description:'Build the Village Windmill.',stat:'built_villagemill',target:1,reward:60000,minLevel:112},
 {title:'Heirloom flour',description:'Grind 60 heirloom flour.',stat:'made_heirloomflour',target:60,reward:80000,minLevel:112},
 {title:'Golden loaves',description:'Bake 20 golden loaves.',stat:'made_goldenloaf',target:20,reward:100000,minLevel:112},
 {title:'Rubies below',description:'Find 10 rubies.',stat:'made_gemstone',target:10,reward:120000,minLevel:115},
 {title:'Heirloom pies',description:'Bake 15 heirloom pies.',stat:'made_heirloompie',target:15,reward:120000,minLevel:115},
 {title:'Master of the farm',description:'Take farm buildings past level 10, 10 times.',stat:'beyond_upgrades',target:10,reward:250000,minLevel:120},
 {title:'Master smith',description:'Forge 25 master tools.',stat:'made_mastertools',target:25,reward:300000,minLevel:140},
 {title:'Deep miner',description:'Find 100 rubies.',stat:'made_gemstone',target:100,reward:300000,minLevel:140},
 {title:'A valley of masters',description:'Take farm buildings past level 10, 40 times.',stat:'beyond_upgrades',target:40,reward:500000,minLevel:180},
 // The market square's villagers (Oct 2026). Always added at the end: a farm keeps its claimed quests by their place in this list.
 {title:'A friendly face',description:'Help a villager at the market square.',stat:'village_requests',target:1,reward:10000,minLevel:100},
 {title:'Good neighbours',description:'Help 10 villagers at the market square.',stat:'village_requests',target:10,reward:30000,minLevel:100},
 {title:'Known in the village',description:'Help 50 villagers at the market square.',stat:'village_requests',target:50,reward:100000,minLevel:104},
 {title:'Pillar of the village',description:'Help 200 villagers at the market square.',stat:'village_requests',target:200,reward:250000,minLevel:120},
 // World II, levels 110-116 (Oct 2026): the Village Fields, the Miners’ Canteen and the market week.
 {title:'Fields of our own',description:'Build the Village Fields.',stat:'built_villagefields',target:1,reward:60000,minLevel:110},
 {title:'A sack of potatoes',description:'Grow 200 potatoes.',stat:'made_potatoes',target:200,reward:40000,minLevel:110},
 {title:'The miners’ canteen',description:'Build the Miners’ Canteen.',stat:'built_canteen',target:1,reward:80000,minLevel:113},
 {title:'A good week at the market',description:'Open the market crate.',stat:'market_crates',target:1,reward:50000,minLevel:116},
 // Levels 118-128: the Potter’s Kiln, flax, the Linen Loft and builder’s crates.
 {title:'The potter’s kiln',description:'Build the Potter’s Kiln.',stat:'built_kiln',target:1,reward:100000,minLevel:118},
 {title:'Roofs for the village',description:'Fire 300 roof tiles.',stat:'made_rooftile',target:300,reward:80000,minLevel:118},
 {title:'Blue flowers, fine thread',description:'Grow 200 flax.',stat:'made_flax',target:200,reward:60000,minLevel:123},
 {title:'The linen loft',description:'Build the Linen Loft.',stat:'built_linenloft',target:1,reward:120000,minLevel:125},
 {title:'Fine linen',description:'Weave 100 linen.',stat:'made_linen',target:100,reward:100000,minLevel:125},
 {title:'Packed for the farm',description:'Pack 10 builder’s crates.',stat:'made_builderscrate',target:10,reward:120000,minLevel:128},
 {title:'A cheaper upgrade',description:'Use 25 builder’s crates on farm upgrades.',stat:'builder_crates_used',target:25,reward:150000,minLevel:128},
 // Levels 132-150: lavender, the Soap Maker, the Pier with the town boat, and the Jeweller.
 {title:'Purple rows',description:'Grow 300 lavender.',stat:'made_lavender',target:300,reward:80000,minLevel:132},
 {title:'The soap maker’s workshop',description:'Build the Soap Maker.',stat:'built_soapmaker',target:1,reward:150000,minLevel:135},
 {title:'Clean and fragrant',description:'Make 100 lavender soap.',stat:'made_lavendersoap',target:100,reward:120000,minLevel:135},
 {title:'A sachet for every drawer',description:'Sew 100 scented sachets.',stat:'made_scentedsachet',target:100,reward:120000,minLevel:138},
 {title:'The old pier',description:'Mend the old pier.',stat:'built_pier',target:1,reward:150000,minLevel:144},
 {title:'Bound for town',description:'Send the town boat off 10 times.',stat:'boat_trips',target:10,reward:200000,minLevel:144},
 {title:'The jeweller’s shop',description:'Build the Jeweller.',stat:'built_jeweller',target:1,reward:200000,minLevel:150},
 {title:'Silver on the table',description:'Make 20 silver candlesticks.',stat:'made_silvercandlestick',target:20,reward:200000,minLevel:150},
 // Levels 154-160: ruby rings, saffron and saffron buns, and the market square's long run.
 {title:'A ring of rubies',description:'Set 10 ruby rings.',stat:'made_rubyring',target:10,reward:250000,minLevel:154},
 {title:'Golden threads',description:'Grow 200 saffron.',stat:'made_saffron',target:200,reward:200000,minLevel:158},
 {title:'Saffron buns',description:'Bake 50 saffron buns.',stat:'made_saffronbun',target:50,reward:250000,minLevel:158},
 {title:'Friend of the village',description:'Help 500 villagers at the market square.',stat:'village_requests',target:500,reward:300000,minLevel:160},
 {title:'Weeks at the market',description:'Open the market crate 20 times.',stat:'market_crates',target:20,reward:250000,minLevel:160},
 // Levels 165-200: the village's landmarks, counted (they are finished in their order, so 5 is the Great Hall).
 {title:'A landmark for the village',description:'Finish a landmark in the village.',stat:'village_landmarks',target:1,reward:300000,minLevel:165},
 {title:'Three landmarks',description:'Finish 3 landmarks in the village.',stat:'village_landmarks',target:3,reward:400000,minLevel:185},
 {title:'The Great Hall',description:'Finish the Great Hall.',stat:'village_landmarks',target:5,reward:500000,minLevel:200},
 // 17 Oct 2026 (the owner's picks 2a and the round 70): first steps for the heirloom bakes (the three above ask 60, 20 and 15, about ten
 // Seed Lab crosses away) and bigger ones after, and the village lake (its kinds and its legend from the lake's fish book, as the pond's).
 {title:'The first heirloom flour',description:'Grind 3 heirloom flour at the Village Windmill.',stat:'made_heirloomflour',target:3,reward:20000,minLevel:112},
 {title:'A golden loaf',description:'Bake a golden loaf at the Bakery.',stat:'made_goldenloaf',target:1,reward:20000,minLevel:112},
 {title:'An heirloom pie',description:'Bake an heirloom pie in the Farm Kitchen.',stat:'made_heirloompie',target:1,reward:30000,minLevel:115},
 {title:'Flour by the sack',description:'Grind 200 heirloom flour.',stat:'made_heirloomflour',target:200,reward:200000,minLevel:125},
 {title:'A basket of golden loaves',description:'Bake 60 golden loaves.',stat:'made_goldenloaf',target:60,reward:200000,minLevel:130},
 {title:'Pies for the whole village',description:'Bake 50 heirloom pies.',stat:'made_heirloompie',target:50,reward:300000,minLevel:140},
 {title:'Out on the lake',description:'Catch a fish at the village lake.',stat:'lake_fish',target:1,reward:10000,minLevel:100},
 {title:'Fifty from the boat',description:'Catch 50 fish at the village lake.',stat:'lake_fish',target:50,reward:30000,minLevel:100},
 {title:'The lake’s first page',description:'Catch 10 kinds of fish for the lake’s fish book.',stat:'lake_fish_kinds',target:10,reward:60000,minLevel:102},
 {title:'The lake’s legend',description:'Land Old Granite, the legend of the village lake.',stat:'caught_oldgranite',target:1,reward:100000,minLevel:105},
 {title:'The whole lake book',description:'Catch all 20 kinds of fish for the lake’s fish book.',stat:'lake_fish_kinds',target:20,reward:200000,minLevel:120},
 {title:'Five hundred lake fish',description:'Catch 500 fish at the village lake.',stat:'lake_fish',target:500,reward:250000,minLevel:130}
].map(q=>Object.freeze(q)));
// A village quest is open from its level; the lake's quests also wait for the lake (LAKE_OPEN).
const LAKE_QUEST_STATS=Object.freeze(['lake_fish','lake_fish_kinds','caught_oldgranite']);
export const villageQuestOpen=(state,q)=>levelOf(state)>=q.minLevel&&(!LAKE_QUEST_STATS.includes(q.stat)||lakeOpen(state));
export function claimVillageQuest(state,id){
 if(!Number.isInteger(id)||!VILLAGE_QUESTS[id])throw new Error('Choose a valid quest.');
 const q=VILLAGE_QUESTS[id];
 if(levelOf(state)<q.minLevel)throw new Error(`Reach level ${q.minLevel} for this quest.`);
 if(!villageQuestOpen(state,q))throw new Error('The village lake is not open yet.');
 state.villageQuests??=[];
 if(state.villageQuests.includes(id))throw new Error('This reward has already been claimed.');
 if((state.stats[q.stat]??0)<q.target)throw new Error('Finish this quest to claim your reward.');
 const xp=questXp(q);
 state.villageQuests.push(id);state.coins+=q.reward;state.xp+=xp;state.stats.quests_claimed=(state.stats.quests_claimed??0)+1;
 return {coins:q.reward,xp};
}
export function farmSummary(state,now=Date.now()) {
 return {coins:state.coins,diamonds:state.diamonds,boosts:{...state.boosts},xp:state.xp,level:levelOf(state),inventory:{...state.inventory},plots:state.plots.map(p=>({id:p.id,crop:p.crop,watered:p.watered,fertilized:p.fertilized,status:!p.crop?'empty':now>=p.readyAt?'ready':'growing',secondsRemaining:Math.max(0,Math.ceil((p.readyAt-now)/1000))})),buildings:Object.entries(state.buildings).map(([id,b])=>({id,name:BUILDINGS[id].name,level:b.level,slots:BUILDINGS[id].type==='production'?buildingSlots(state,id,now):0,jobs:productionJobs(b).map(j=>({id:j.id,recipe:j.recipe,secondsRemaining:Math.max(0,Math.ceil((j.readyAt-now)/1000))})),status:productionJobs(b).some(j=>now>=j.readyAt)?'ready':b.job?(now>=b.job.readyAt?'ready':'working'):'idle',job:b.job?{recipe:b.job.recipe,secondsRemaining:Math.max(0,Math.ceil((b.job.readyAt-now)/1000))}:null,upgradeCost:upgradeCost(state,id)})),expansionCost:expansionCost(state),quests:QUESTS.map((q,id)=>({id,title:q.title,progress:Math.min(q.target,state.stats[q.stat]),target:q.target,claimed:state.claimed.includes(id)}))};
}

export const DAY_MS=86400000;
// The daily gift, day 1 to 7 of a streak (day 7 repeats while the streak holds). 27 Sep 2026: the coins grow with the farm level
// (× level/2, never below these, in fives: 40-160 at level 2, 400-1,600 at level 20), because a fixed 160 coins was less than one
// pumpkin from level 10 on; days 3, 5 and 7 of every streak week bring a 30-minute boost (double XP, double harvest, double
// earnings, rising like their shop prices, and no double harvest right after the second day's welcome one; VIP doubles the whole gift, so an hour); and one missed day a week keeps the streak (the save). The diamonds stayed then; they were halved on 7 Oct 2026 (below).
export const DAILY_REWARDS=[40,55,70,85,100,120,160];
export const RETURN_BOOST_MS=30*60000,FIRST_HARVEST_BONUS=3;
// Diamonds earned in play (7 Oct 2026, the owner's choice): about half at every level and about 60% less in the end game, because a
// daily player earned a €4.99 pack's worth every week. Diamonds already earned stay. The gift was 4/6/8/10/12/16/24.
export const DAILY_DIAMONDS=[2,3,4,5,6,8,12];
export const DAILY_BOOSTS=Object.freeze({3:'xp',5:'harvest',7:'coins'}),DAILY_BOOST_MS=30*60000,STREAK_SAVE_DAYS=7;
// The comeback chest (Oct 2026): away COMEBACK_MIN_DAYS days or more, the Welcome back card holds 20 coins × half the level for every
// day away (up to 7), plus the gift's 30 minutes of double XP; VIP doubles it like the gift. No diamonds and no XP, so it stays below a
// 3-day gift run in every part (tests/comeback-chest.test.mjs): coming back never pays better than coming every day. One every 14 days.
export const COMEBACK_MIN_DAYS=3,COMEBACK_MAX_DAYS=7,COMEBACK_EVERY_DAYS=14,COMEBACK_COINS=20,COMEBACK_BOOST='xp';
export const DAILY_CHALLENGE_DIAMONDS=Object.freeze([1,1,2]),DAILY_BONUS=Object.freeze({coins:60,xp:15});   // the bonus for all three; 2/2/4 diamonds until 7 Oct 2026
export const DIAMOND_PACKS=Object.freeze([{amount:150,price:'€1.99'},{amount:500,price:'€4.99'},{amount:1250,price:'€9.99'},{amount:3500,price:'€24.99'}]);
// Every diamond spent goes through here, so the farm keeps the total (stats.diamonds_spent: the Gem collector avatar,
// public/player-avatars.js). Counted from 25 Sep 2026; spending before that was not kept.
export function spendDiamonds(state,amount){state.diamonds-=amount;state.stats.diamonds_spent=(state.stats.diamonds_spent??0)+amount;}
// VIP has a single server-owned expiry. New purchases extend time, never strength. stats.vip_days adds up every day bought (the Velvet
// farmer avatar), from 25 Sep 2026.
export const VIP_PLANS=Object.freeze({week:{name:'VIP · 7 days',cost:500,duration:7*86400000},month:{name:'VIP · 30 days',cost:1500,duration:30*86400000}});
export function vipActive(state,now=Date.now()){return Number.isSafeInteger(state.vipExpiresAt)&&state.vipExpiresAt>now;}
export function dailyRewardMultiplier(state,now=Date.now()){return vipActive(state,now)?2:1;}
export function marketSaleValue(state,base,now=Date.now()){return Math.floor(base*(vipActive(state,now)?1.05:1)*(state.boosts?.coinsUntil>now?2:1)*(hasImprovement(state,'ledger')?1.1:1)*(1+masterBonus(state,'market')+valleyProjectBonus(state,'barn')));}
// The first sale pays double (the owner, 20 Oct 2026, option 4 of the step 2 study: 21% of new farmers who harvested never sold, and 83% of
// them still had their 500 starting coins, so selling had no reason). A guided farm's first sale at the farm Market, made in guide step 1 or
// 2, pays twice what the Market pays then: once, with no cap (first sales from 1 Oct 2026: median 160 coins, 99% under 940, the most 4,499).
// The guide's step 2 says it and the Market shows the doubled prices with a line of its own; the village market never doubles.
export function firstSaleDouble(state){const guide=state.onboarding;return guidedFarm(state)&&Boolean(guide)&&!guide.rewardClaimed&&guide.completed<=1&&!guide.milestones?.sell;}
// What the farm Market pays for goods worth base at today's prices: marketSaleValue, doubled for the first sale.
export const marketPay=(state,base,now=Date.now())=>(firstSaleDouble(state)?2:1)*marketSaleValue(state,base,now);
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
// 23 Oct 2026 (the owner): 5 diamonds a field, was 10, and Instant harvest 75, was 150 (BOOSTS.crops), now that every harvest gives one
// crop (one-crop): finishing a field is worth half what it was, so it costs half.
export const SINGLE_CROP_COST=5;
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
const BOOST_UNTIL=Object.freeze({xp:'xpUntil',harvest:'harvestUntil',coins:'coinsUntil',farmhand:'farmhandUntil'});
export const BOOSTS=Object.freeze({
 xp:{name:'Double XP',cost:50,duration:1800000,prices:Object.freeze({'30m':50,'1h':90,'1d':300}),art:'double-xp',description:'Earn twice the XP from farm actions.'},
 // Between Double XP and Double earnings: it doubles crops only, not goods or deliveries, and at most one waiting harvest per field.
 harvest:{name:'Double harvest',cost:75,duration:1800000,prices:Object.freeze({'30m':75,'1h':135,'1d':450}),art:'double-harvest',description:'Twice the crops from every harvest.'},
 coins:{name:'Double earnings',cost:100,duration:1800000,prices:Object.freeze({'30m':100,'1h':180,'1d':600}),art:'double-coins',description:'Double coins from sales and deliveries.'},
 // The farmhand (20 Oct 2026, the owner): one more production slot in every building for a day (buildingSlots), the village's too, but
 // not the Factory ("de knecht werkt niet voor de factory": its batches are up to ×20). One length only; buying it again while it runs
 // adds a day after it. What it makes counts like any other batch.
 farmhand:{name:'Farmhand',cost:150,duration:86400000,lengthName:'1 day',art:'farmhand',description:'One more production slot in every building but the Factory for 24 hours.'},
 crops:{name:'Instant harvest',cost:75,art:'seeds',description:'Every growing crop ready to harvest now.'},
 production:{name:'Finish production',cost:200,art:'boost',description:'Every running batch ready now (not the Factory).'},
 upgrade:{name:'Buildings discount',cost:250,art:'hammer',description:'50% off the coins and goods of your next building upgrade. Never expires.'}
});
// The price and running time of one boost: a timed boost for the chosen length, any other boost as it is.
export function boostOffer(id,length='30m'){
 if(!Object.hasOwn(BOOSTS,id))throw new Error('Choose a valid boost.');
 const boost=BOOSTS[id];
 if(!boost.prices)return {cost:boost.cost,duration:boost.duration??0,length:null};
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
// Coins for diamonds (20 Oct 2026, the owner): 1,000 coins for every level of the farm, for 100 diamonds, in Power-ups, as often as the
// farmer likes. It grows with the farm so it is worth the same at every level, and an active player still gets more from Double
// earnings from about level 50 (live, 20 Oct: the best half hour of sales and deliveries is 1,650 coins at 10-14 and 11,500 at 50-89;
// a fixed 50,000 was 4 to 37 times that below level 90). The coins are not earned (no quests, events or Earned).
export const COIN_PACK=Object.freeze({perLevel:1000,cost:100,art:'coin-cart'});
export const coinPackCoins=state=>COIN_PACK.perLevel*levelOf(state);
export function buyCoinPack(state){
 if(state.diamonds<COIN_PACK.cost)throw new Error(`You need ${COIN_PACK.cost} diamonds. Earn more from daily gifts and challenges.`);
 const coins=coinPackCoins(state);
 spendDiamonds(state,COIN_PACK.cost);state.coins+=coins;state.stats.coins_bought=(state.stats.coins_bought??0)+coins;
 return {coins,cost:COIN_PACK.cost};
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
// Natural fertilizer takes FERTILIZER_CUT of the time a growing crop still needs, once per growing cycle (the wiki, the Windmill and the
// tractor's Fertilize job say 35%).
export const FERTILIZER_CUT=.35;
export function fertilizeField(state,id,now=Date.now()){
 if(!Number.isInteger(id)||id<0||id>=state.plots.length)throw new Error('Choose an unlocked field.');
 const plot=state.plots[id];
 if(!plot.crop||plot.readyAt<=now)throw new Error('Choose a crop that is still growing.');
 if(plot.fertilized)throw new Error('This crop has already been fertilized.');
 if(state.inventory.fertilizer<1)throw new Error('Make natural fertilizer at the Windmill first.');
 const saved=Math.floor((plot.readyAt-now)*FERTILIZER_CUT);
 plot.readyAt-=saved;plot.fertilized=true;state.inventory.fertilizer--;state.xp+=5;state.stats.fertilized=(state.stats.fertilized??0)+1;
 return {id,crop:plot.crop,saved,xp:5};
}
const LEGACY_DAILY_POOLS=[
 [{stat:'harvested',target:16,title:'Bring in the harvest',description:'Harvest 16 crops.',reward:45},{stat:'watered',target:8,title:'A little extra care',description:'Water 8 growing crops.',reward:40},{stat:'planted',target:10,title:'A fresh start',description:'Plant 10 crops.',reward:45}],
 [{stat:'produced',target:2,title:'Busy little buildings',description:'Collect 2 production batches.',reward:55},{stat:'made_milk',target:4,title:'Fresh from the barn',description:'Collect 4 milk.',reward:60},{stat:'made_eggs',target:6,title:'The morning basket',description:'Collect 6 eggs.',reward:55}],
 [{stat:'earned',target:120,title:'Market day',description:'Earn 120 coins from sales or deliveries.',reward:55},{stat:'deliveries',target:1,title:'Special delivery',description:'Complete 1 delivery order.',reward:60},{stat:'harvest_wheat',target:6,title:'Golden fields',description:'Harvest 6 wheat.',reward:45}]
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
 [{"stat":"harvested","target":80,"title":"The estate harvest","description":"Harvest 80 crops.","reward":600,"minLevel":78}],
 [{"stat":"made_prizeproduce","target":1,"title":"Show-ready vegetables","description":"Grow 1 prize produce.","reward":650,"minLevel":80,"requiresBuildings":["glasshouse"]}],
 [{"stat":"made_blanket","target":2,"title":"Two warm blankets","description":"Make 2 wool blankets.","reward":700,"minLevel":82,"requiresBuildings":["craftshop"]}]
];
// World II's daily (Oct 2026, the owner's extra): help two villagers, only from level 100. Added last to each pool, so every pool below level
// 100 keeps exactly its entries and order (the day picks eligible[(day+id)%length]). A copy with its own title in the other two pools
// (10 Oct 2026, the main session's choice) makes it come about one day in 7 instead of one in 26.
const VILLAGE_ERRANDS={stat:'village_requests',target:2,description:'Help 2 villagers at the market square.',reward:800,minLevel:100};
const VILLAGE_DAILIES=[[{...VILLAGE_ERRANDS,title:'Market square errands'}],[{...VILLAGE_ERRANDS,title:'Village errands'}],[{...VILLAGE_ERRANDS,title:'Errands for the villagers'}]];
export const DAILY_POOLS=LEGACY_DAILY_POOLS.map((pool,id)=>Object.freeze([...pool,...ORCHARD_DAILIES[id],...PANTRY_DAILIES[id],...MIDGAME_DAILIES[id],...VALLEY_DAILIES[id],...ESTATE_DAILIES[id],...[[{"stat":"activity_greenhouse","target":2,"title":"Seedling care","description":"Finish 2 Greenhouse jobs.","reward":65},{"stat":"activity_paddock","target":2,"title":"Happy herd","description":"Finish 2 Animal paddock jobs.","reward":65},{"stat":"chore_weeds","target":3,"title":"A tidy start","description":"Successfully clear the paths 3 times.","reward":70},{"stat":"tended","target":4,"title":"More than watering","description":"Give 4 growing crops extra care.","reward":65},{"stat":"harvest_lettuce","target":8,"title":"Leafy little harvest","description":"Harvest 8 lettuce.","reward":55},{"stat":"harvest_corn","target":6,"title":"Golden corn","description":"Harvest 6 corn.","reward":65}],[{"stat":"activity_apiary","target":2,"title":"Honey time","description":"Finish 2 Apiary jobs and collect their Honey.","reward":65},{"stat":"activity_workshop","target":2,"title":"Tools of the trade","description":"Finish 2 Tool workshop jobs.","reward":65},{"stat":"made_feed","target":3,"title":"Feed the farm","description":"Collect 3 animal feed from production.","reward":80},{"stat":"parallel_batches","target":2,"title":"Side by side","description":"Start 2 batches while another batch is still running in the same building.","reward":90,"parallel":true},{"stat":"fertilized","target":2,"title":"A soil boost","description":"Use natural fertilizer on 2 growing fields.","reward":80,"minLevel":3},{"stat":"made_flour","target":4,"title":"Flour power","description":"Collect 4 flour from production.","reward":80,"minLevel":3},{"stat":"made_salad","target":1,"title":"Freshly prepared","description":"Collect 1 fresh salad.","reward":90,"minLevel":4}],[{"stat":"activity_rounds","target":1,"title":"Make the rounds","description":"Finish a full farm round by helping at all four stops.","reward":110},{"stat":"activities","target":6,"title":"A hands-on day","description":"Finish 6 hands-on jobs around the farm.","reward":110},{"stat":"chore_troughs","target":2,"title":"Fresh water rounds","description":"Successfully fill the water troughs twice.","reward":110,"chore":"troughs"},{"stat":"chore_sorting","target":1,"title":"Everything sorted","description":"Successfully sort the seed boxes once.","reward":140,"chore":"sorting"},{"stat":"made_bread","target":2,"title":"Warm from the oven","description":"Collect 2 fresh bread.","reward":100,"minLevel":4},{"stat":"passive_earned","target":30,"title":"Roadside trade","description":"Collect 30 coins from the farm stall.","reward":80,"minLevel":3}]][id],...VILLAGE_DAILIES[id]]));
export const ORDER_POOL=Object.freeze([{"title": "The judges’ table", "input": {"prizeproduce": 1, "cherryjam": 1}, "xp": 180, "minLevel": 80}, {"title": "Show day at the inn", "input": {"prizeproduce": 1, "goatcheese": 2}, "xp": 190, "minLevel": 82}, {"title": "Milk for the café", "input": {"goatmilk": 6, "honey": 4}, "xp": 90, "minLevel": 54}, {"title": "The goat farmer’s table", "input": {"goatcheese": 1, "bread": 2}, "xp": 100, "minLevel": 55}, {"title": "Evening candles", "input": {"candles": 2, "beeswax": 3}, "xp": 100, "minLevel": 58}, {"title": "A cosy winter", "input": {"blanket": 1, "candles": 1}, "xp": 160, "minLevel": 60}, {"title": "Cherry season", "input": {"cherryjam": 1, "cherries": 6}, "xp": 110, "minLevel": 67}, {"title": "The pie stand", "input": {"cherrypie": 1, "applepie": 1}, "xp": 120, "minLevel": 68}, {"title": "Soup kitchen", "input": {"squashsoup": 1, "bread": 2}, "xp": 90, "minLevel": 32}, {"title": "The candle maker", "input": {"beeswax": 4, "honey": 4}, "xp": 70, "minLevel": 34}, {"title": "The village knitters", "input": {"wool": 6}, "xp": 70, "minLevel": 37}, {"title": "Glasshouse greens", "input": {"cauliflower": 8, "salad": 2}, "xp": 75, "minLevel": 40}, {"title": "The tailor’s shelves", "input": {"yarn": 4, "wool": 4}, "xp": 95, "minLevel": 43}, {"title": "Fabric for the fair", "input": {"cloth": 1, "yarn": 2}, "xp": 120, "minLevel": 45}, {"title": "Harvest cider", "input": {"cider": 1, "ciderapples": 4}, "xp": 110, "minLevel": 47}, {"title": "The baker next door", "input": {"wheat": 5}, "xp": 15, "minLevel": 1}, {"title": "A leafy lunch", "input": {"lettuce": 4, "corn": 2}, "xp": 20, "minLevel": 1}, {"title": "Sweet little favour", "input": {"honey": 2, "wheat": 4}, "xp": 20, "minLevel": 1}, {"title": "Breakfast at the inn", "input": {"eggs": 3, "milk": 2}, "xp": 25, "minLevel": 1}, {"title": "The paddock pantry", "input": {"feed": 2, "corn": 2}, "xp": 25, "minLevel": 1}, {"title": "Honey on toast", "input": {"honey": 2, "bread": 2}, "xp": 35, "minLevel": 3}, {"title": "A cream tea", "input": {"honey": 3, "milk": 2, "bread": 1}, "xp": 35, "minLevel": 3}, {"title": "The village grocer", "input": {"corn": 3, "lettuce": 2, "cabbage": 1}, "xp": 25, "minLevel": 3}, {"title": "The millers basket", "input": {"grainmeal": 2, "flour": 4}, "xp": 30, "minLevel": 3}, {"title": "For the garden club", "input": {"fertilizer": 2, "lettuce": 4}, "xp": 30, "minLevel": 3}, {"title": "The animal sanctuary", "input": {"feed": 3, "barley": 3}, "xp": 30, "minLevel": 3}, {"title": "A picnic in the park", "input": {"bread": 2, "salad": 1, "honey": 1}, "xp": 40, "minLevel": 4}, {"title": "The cheese board", "input": {"cheese": 2, "bread": 1}, "xp": 35, "minLevel": 4}, {"title": "A farm-fresh lunch", "input": {"salad": 2, "eggs": 3}, "xp": 35, "minLevel": 4}, {"title": "Sunday lunch", "input": {"cabbage": 2, "pumpkin": 2}, "xp": 35, "minLevel": 5}, {"title": "The harvest kitchen", "input": {"vegetables": 1, "flour": 3}, "xp": 45, "minLevel": 5}, {"title": "A golden afternoon", "input": {"pie": 1, "honey": 2, "milk": 2}, "xp": 50, "minLevel": 6}, {"title": "Autumn pantry", "input": {"redcabbage": 2, "cauliflower": 2}, "xp": 40, "minLevel": 6}, {"title": "The village feast", "input": {"bread": 3, "cheese": 2, "vegetables": 1}, "xp": 65, "minLevel": 7}, {"title": "Pantry provisions", "input": {"pickles": 1, "vegetables": 1}, "xp": 55, "minLevel": 7}, {"title": "A chefs finishing touch", "input": {"oil": 1, "salad": 2, "honey": 2}, "xp": 65, "minLevel": 8}, {"title": "Golden harvest hamper", "input": {"sunflower": 2, "oil": 1}, "xp": 60, "minLevel": 8}, {"title": "The autumn festival", "input": {"pie": 2, "pickles": 1, "honey": 3}, "xp": 75, "minLevel": 8}, {"title": "The estate banquet", "input": {"oil": 1, "vegetables": 2, "cheese": 2, "bread": 2}, "xp": 85, "minLevel": 10}, {"title": "The kitchen garden", "input": {"stew": 2, "bread": 2}, "xp": 80, "minLevel": 6, "requiresBuildings": ["kitchen"]}, {"title": "An orchard picnic", "input": {"applejuice": 2, "applepie": 1}, "xp": 110, "minLevel": 8, "requiresBuildings": ["juicepress"]}, {"title": "Breakfast preserves", "input": {"berrypreserves": 2, "bread": 3}, "xp": 120, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"title": "The orchard tea room", "input": {"berrytart": 2, "applepie": 2}, "xp": 160, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"title": "A colourful orchard refreshment", "input": {"orchardjuice": 1, "bread": 2}, "xp": 65, "minLevel": 10, "requiresBuildings": ["juicepress"]}, {"title": "Smoothies for the village", "input": {"berrysmoothie": 1, "bread": 2}, "xp": 68, "minLevel": 10, "requiresBuildings": ["juicepress"]}, {"title": "A honey-sweet breakfast", "input": {"applecompote": 1, "bread": 2}, "xp": 62, "minLevel": 10, "requiresBuildings": ["preserves"]}, {"title": "The pickling pantry", "input": {"applevinegar": 1, "bread": 2}, "xp": 80, "minLevel": 10, "requiresBuildings": ["preserves", "juicepress"]}, {"title": "Beans for the village deli", "input": {"pickledbeans": 1, "bread": 2}, "xp": 100, "minLevel": 10, "requiresBuildings": ["preserves", "juicepress"]}, {"title": "A warming farm supper", "input": {"beangratin": 1, "bread": 2}, "xp": 85, "minLevel": 7, "requiresBuildings": ["kitchen"]}, {"title": "Lunch under the apple trees", "input": {"orchardsalad": 1, "bread": 2}, "xp": 58, "minLevel": 8, "requiresBuildings": []}, {"title": "Cheesecake at the tea room", "input": {"berrycheesecake": 1, "honey": 2}, "xp": 105, "minLevel": 11, "requiresBuildings": []}, {"title": "A gift from the valley", "input": {"harvesthamper": 1, "honey": 2}, "xp": 160, "minLevel": 12, "requiresBuildings": ["juicepress", "preserves"]}]);
// Whether the feature a quest or challenge counts for is open (19 Oct 2026, with featureUnlocked: features follow the level on every farm,
// so an older farm is no longer dealt chores, medals or the stall below their level, and its Quests list hides them too, public/quests-ui.js).
export function questFeatureOpen(state,q){
 const stat=q.stat??'';
 const gate=stat==='fish'||stat.startsWith('fish_')||stat==='caught_whiskers'?'fishing':stat==='heirlooms_found'||stat==='lab_crosses'?'seedlab':stat==='mastery_medals'?'mastery':stat==='projects'?'projects':stat==='silo_upgrades'?'silo':stat==='tractor'?'tractor':stat==='dailies'?'challenges':stat.startsWith('activity')||stat==='activities'?'activities':stat.startsWith('chore')?'chores':stat==='deliveries'?'cart':stat==='passive_earned'?'stall':stat.startsWith('valley_')?'valleymarket':stat==='ranch_focus'?'ranch':stat==='improvements'?'estateworkshop':stat.startsWith('depot_')?'tradedepot':stat.startsWith('fair_')?'grandfair':null;
 if(gate&&!featureUnlocked(state,gate))return false;
 if(stat==='boosts_used'&&!featureUnlocked(state,'boosts'))return false;
 if((stat==='crafted_deliveries'||stat==='honey_deliveries')&&!featureUnlocked(state,'cart'))return false;
 return true;
}
export function availableDaily(state,q){
 if(q.input&&!Object.keys(q.input).every(k=>itemAvailable(state,k)))return false;
 if(guidedFarm(state)){
  const stat=q.stat??'';
  if(stat.startsWith('harvest_')&&!cropUnlocked(state,stat.slice(8)))return false;
  // A "made" goal counts what is collected from a building's batches, so it waits for a recipe that makes the good, not just a way to get it: the
  // paddock's helping hand gives fertilizer from level 3 (8 before 11 Oct 2026), the fertilizer recipe opens at 14 (9 Oct 2026).
  if(stat.startsWith('made_')&&!Object.entries(RECIPES).some(([id,r])=>r.output[stat.slice(5)]&&recipeUnlocked(state,id)))return false;
  if(stat==='produced'&&!Object.keys(RECIPES).some(id=>recipeUnlocked(state,id)))return false;
  if(stat.startsWith('built_')&&!buildingEligible(state,stat.slice(6)))return false;
  if(stat==='varieties'&&q.target>Object.keys(CROPS).filter(k=>cropUnlocked(state,k)).length)return false;
  // Fertilizer is used from the Windmill's window only: from level 3 the paddock's helping hand gives some (11 Oct 2026), and "use
  // fertilizer" quests and challenges wait for the Windmill (level 6), as they did when the hand opened at 8.
  if(stat==='fertilized'&&(!itemAvailable(state,'fertilizer')||!buildingEligible(state,'windmill')))return false;
  // 10 Oct 2026 (balance review): quests for things that are not open yet waited in the list from level 2: the Windmill's, the
  // boosts' (level 10) and the delivery orders' (level 7; honey ones also need honey).
  if(stat.startsWith('windmill_')&&!buildingEligible(state,'windmill'))return false;
  if(stat==='honey_deliveries'&&!itemAvailable(state,'honey'))return false;
 }
 // Quests and challenges for a feature that is still locked wait on every farm (19 Oct 2026, questFeatureOpen).
 if(!questFeatureOpen(state,q))return false;
 if(q.stat==='village_requests'&&!itemAvailable(state,'packedlunch'))return false;   // no packed lunches (Kitchen or Canteen), no villager comes (Oct 2026)
 return levelOf(state)>=(q.minLevel??1)&&(q.requiresBuildings??[]).every(key=>buildingUnlocked(state,key))&&(!q.chore||!choreStatus(state,q.chore).locked)&&(!q.parallel||Object.entries(state.buildings).some(([id,b])=>BUILDINGS[id].type==='production'&&b.level>=2));
}
// The three dailies never count the same thing (10 Oct 2026, review fix): the Village errands sit in all three pools from level 100, so when a
// pool draws a goal an earlier pool already drew today, it draws again by the same rule from its goals that count something else. Below level
// 100 no goal is in two pools, so those draws are exactly as before.
function selectDailyTasks(state,day){
 const picked=new Set();
 return DAILY_POOLS.map((pool,id)=>{const eligible=pool.filter(q=>availableDaily(state,q));if(!eligible.length)eligible.push(LEGACY_DAILY_POOLS[0][id]);let task=eligible[(day+id)%eligible.length];if(picked.has(task.stat)){const other=eligible.filter(q=>!picked.has(q.stat));if(other.length)task=other[(day+id)%other.length];}picked.add(task.stat);return {...task};});
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
  // 7 Oct 2026: a village order 2-3 (was 3-5), a commission 4 + 1 per 4,000 coins of goods + 0-1, at most 10 (was 8 + 1 per 2,000
  // + 0-2, at most 18). An order already on today's board keeps its amount until the board turns over.
  const diamonds=tier==='quick'?1:tier==='village'?2+roll%2:Math.min(10,4+Math.floor(baseValue/4000)+roll%2);
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
 const stars=VALLEY_STARS.filter(k=>itemAvailable(state,k)),others=Object.keys(PRODUCTS).filter(k=>!VALLEY_STARS.includes(k)&&!['feed','fertilizer','honey'].includes(k)&&!worldTwoItem(k)&&itemAvailable(state,k));   // World II's bakes stay out of the farm's orders
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
 watertower:{name:'Water tower',effect:'Watering takes 65% off the time a crop still needs instead of 60%.',art:'water',level:78,coins:420000,materials:{goatcheese:25,blanket:5,stew:80}},
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
export const DEPOT_PREMIUM=1.6,DEPOT_RESTOCK=12*3600000,DEPOT_DIAMONDS=5;   // 10 a trailer until 7 Oct 2026
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
 const goods=Object.keys(PRODUCTS).filter(k=>ITEMS[k].sell>=400&&!worldTwoItem(k)&&itemAvailable(state,k)),kinds=Math.min(4,goods.length),input={};
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
// diamonds. A ribbon in all three classes in one week makes you grand champion, with a bonus of diamonds. The classes follow from
// the week and are kept for the whole week once the farm first sees them.
// 27 Sep 2026: bigger and better paid (was 15,000 / 30,000 / 50,000 at 1.5× with 5/5/10 diamonds and 3 prize produce): about a
// day of fields and a day of production spread over the week, two in the heaviest weeks, for twice the goods' price.
// 7 Oct 2026: 5 / 10 / 15 diamonds a class and 20 for grand champion (was 15 / 25 / 40 and 100).
export const FAIR_PREMIUM=2,FAIR_PRIZE_PRODUCE=6,FAIR_CHAMPION_DIAMONDS=20;
export const FAIR_CLASSES=Object.freeze([
 {name:'Best harvest',stars:1,value:30000,diamonds:5},
 {name:'Finest goods',stars:2,value:90000,diamonds:10},
 {name:'Best in show',stars:3,value:150000,diamonds:15}
]);
function fairClasses(state,week){
 const roll=n=>mixBits(calendarHash(`fair-v1:${week}:${n}`)),pick=(list,n)=>list[roll(n)%list.length];
 const amount=(key,value)=>Math.max(1,Math.round(value/ITEMS[key].sell));
 const crops=Object.keys(CROPS).filter(k=>CROPS[k].sell>=100&&cropUnlocked(state,k)),products=Object.keys(PRODUCTS).filter(k=>!['prizeproduce','feed','fertilizer','honey'].includes(k)&&!worldTwoItem(k)&&ITEMS[k].sell>=200&&itemAvailable(state,k));
 const fine=products.filter(k=>ITEMS[k].sell>=1000),goods=fine.length?fine:products;
 if(!crops.length||!goods.length)return null;   // a farm that makes nothing yet waits for its first classes
 const crop=pick(crops,0),good=pick(goods,1),others=goods.filter(k=>k!==good),show=pick(others.length?others:[good],2);
 const prize=itemAvailable(state,'prizeproduce')?FAIR_PRIZE_PRODUCE:0,rest=FAIR_CLASSES[2].value-prize*ITEMS.prizeproduce.sell;
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
 const champion=state.fair.entered.length===state.fair.classes.length,bonus=champion?FAIR_CHAMPION_DIAMONDS:0;
 if(champion){state.stats.fair_champion=(state.stats.fair_champion??0)+1;state.diamonds+=bonus;state.stats.diamonds_earned+=bonus;}
 return {name:entry.name,stars:entry.stars,coins:entry.coins,xp:entry.xp,diamonds:entry.diamonds,champion,championDiamonds:bonus};
}
export function utcDay(now=Date.now()){return new Date(now).toISOString().slice(0,10);}
export function dayNumber(now=Date.now()){return Math.floor(now/DAY_MS);}
export function seedCost(state,crop){return Math.max(1,Math.ceil(CROPS[crop].cost*(1-siloBonus(state.siloLevel??0).seeds)));}
// ——— After the last building (27 Sep 2026) ———————————————————————————————————————————————————————————————————————————————
// The Grand Valley Fair (level 90) is the last new building, so five things keep the game going without new unlocks: Master points
// (91), the Seed Lab (92), visitors on the road (93), a giant pumpkin at the fair (94) and valley projects (95). All five are for one
// farm on its own; none of them needs other players.

// Master points: every level after 90 gives one, spent on a small lasting bonus. Four branches of ten ranks (level 130 fills them).
export const MASTER_FROM=90;
// The after-90 places stay out of sight (map, Buildings menu, Market) until the farm reaches the fair's level, so they take no room
// before they matter; from 90 they show greyed out until their own level, like every place.
export const ENDGAME_PLACES=Object.freeze(['seedlab','visitors','valleyprojects']);
export const endgameInSight=state=>levelOf(state)>=FEATURE_LEVELS.grandfair;
export const MASTER_BRANCHES=Object.freeze({
 growth:Object.freeze({name:'Green fingers',effect:'Crops grow 1% faster per rank.',per:.01,max:10,art:'seeds'}),
 production:Object.freeze({name:'Busy hands',effect:'Batches take 1% less time per rank.',per:.01,max:10,art:'hammer'}),
 market:Object.freeze({name:'Sharp trader',effect:'The Market pays 1% more per rank.',per:.01,max:10,art:'market'}),
 visitors:Object.freeze({name:'Warm welcome',effect:'Visitors pay 2% more per rank.',per:.02,max:10,art:'visitors'})
});
export const masterPoints=state=>Math.max(0,levelOf(state)-MASTER_FROM);
export const masterRank=(state,branch)=>state.master?.[branch]??0;
export const masterSpent=state=>Object.keys(MASTER_BRANCHES).reduce((sum,b)=>sum+masterRank(state,b),0);
export const masterFree=state=>Math.max(0,masterPoints(state)-masterSpent(state));
export const masterBonus=(state,branch)=>masterRank(state,branch)*MASTER_BRANCHES[branch].per;
export function masterSpend(state,branch){
 if(typeof branch!=='string'||!Object.hasOwn(MASTER_BRANCHES,branch))throw new Error('Choose a Master branch.');
 const b=MASTER_BRANCHES[branch];
 if(masterRank(state,branch)>=b.max)throw new Error(`${b.name} is at its highest rank.`);
 if(masterFree(state)<1)throw new Error('Reach the next level for a new Master point.');
 state.master[branch]=masterRank(state,branch)+1;
 return {branch,name:b.name,rank:state.master[branch],free:masterFree(state)};
}

// The Seed Lab (in the Glasshouse): two test beds. Choose an heirloom that is open at your level and give the parent crops; the
// first cross of a variety takes a day and discovers it (+8 diamonds, +100 more when all 20 are found; 15 and 200 until 7 Oct 2026), every cross after that
// 8 hours. A bed gives 4 heirlooms.
// The whole collection (17 Oct 2026, the owner's pick 3a): all 20 found adds a third test bed for good (LAB_FULL_BEDS), so the collection
// leads somewhere: more heirlooms for the heirloom bakes. The bed comes with the last discovery, and normalizeFarm gives it to a farm that
// found all 20 before.
export const LAB_BEDS=2,LAB_FULL_BEDS=3,LAB_DISCOVER_MS=24*3600000,LAB_GROW_MS=8*3600000,LAB_DISCOVER_DIAMONDS=8,LAB_COMPLETE_DIAMONDS=100;
export const heirloomFound=(state,key)=>Array.isArray(state.lab?.found)&&state.lab.found.includes(key);
export const labComplete=state=>Array.isArray(state.lab?.found)&&state.lab.found.length>=Object.keys(HEIRLOOMS).length;
export const labBeds=state=>labComplete(state)?LAB_FULL_BEDS:LAB_BEDS;
export const heirloomOpen=(state,key)=>featureUnlocked(state,'seedlab')&&levelOf(state)>=HEIRLOOMS[key].level;
// Whether a free test bed can be used now: some heirloom open at your level whose parent crops you have (1 Oct 2026: a free bed
// alone lit the Seed Lab up as ready, even with nothing to cross).
export const labCanCross=state=>Object.entries(HEIRLOOMS).some(([key,h])=>heirloomOpen(state,key)&&Object.entries(h.input).every(([k,n])=>(state.inventory[k]??0)>=n));
export function labCross(state,bed,heirloom,now=Date.now()){
 if(!Number.isInteger(bed)||bed<0||bed>=labBeds(state))throw new Error('Choose a test bed.');
 if(typeof heirloom!=='string'||!Object.hasOwn(HEIRLOOMS,heirloom))throw new Error('Choose an heirloom variety.');
 const h=HEIRLOOMS[heirloom];
 if(!heirloomOpen(state,heirloom))throw new Error(`Reach level ${h.level} to cross ${h.name.toLowerCase()}.`);
 if(state.lab.beds[bed])throw new Error('This test bed is already growing something.');
 const missing=Object.entries(h.input).filter(([k,n])=>state.inventory[k]<n);
 if(missing.length)throw new Error('Missing: '+missing.map(([k,n])=>`${ITEMS[k].name} (${state.inventory[k]}/${n})`).join(', ')+'.');
 for(const [k,n] of Object.entries(h.input))state.inventory[k]-=n;
 const discover=!heirloomFound(state,heirloom);
 state.lab.beds[bed]={heirloom,startedAt:now,readyAt:now+(discover?LAB_DISCOVER_MS:LAB_GROW_MS)};
 return {heirloom,name:h.name,discover,readyAt:state.lab.beds[bed].readyAt};
}
export function labCollect(state,bed,now=Date.now()){
 const b=Number.isInteger(bed)?state.lab.beds[bed]:null;
 if(!b)throw new Error('This test bed is empty.');
 if(now<b.readyAt)throw new Error(`Still growing: ready in ${formatDuration(b.readyAt-now)}.`);
 const h=HEIRLOOMS[b.heirloom],discovered=!heirloomFound(state,b.heirloom);
 state.inventory[b.heirloom]+=LAB_YIELD;state.lab.beds[bed]=null;
 const xp=Math.round(h.sell*LAB_YIELD/40);state.xp+=xp;state.stats.lab_crosses=(state.stats.lab_crosses??0)+1;
 let diamonds=0,complete=false;
 if(discovered){state.lab.found.push(b.heirloom);diamonds+=LAB_DISCOVER_DIAMONDS;complete=state.lab.found.length===Object.keys(HEIRLOOMS).length;if(complete)diamonds+=LAB_COMPLETE_DIAMONDS;}
 if(diamonds){state.diamonds+=diamonds;state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;}
 while(state.lab.beds.length<labBeds(state))state.lab.beds.push(null);   // the whole collection's third bed
 countCollections(state);
 return {heirloom:b.heirloom,name:h.name,count:LAB_YIELD,xp,discovered,diamonds,complete,found:state.lab.found.length,...(complete?{beds:state.lab.beds.length}:{})};
}

// Visitors: someone comes up the road with a rush order: two kinds of goods and, once you have found any, an heirloom. Deliver
// everything within 12 hours. Every visitor served in a row adds 10% to the next order (up to double) and to the pay, which starts
// at 1.8x the goods' normal price, with 3 diamonds (7 Oct 2026; was 5 plus 1 for each in the run, at most 15); one who leaves unserved, or is sent away, ends the run. The next one comes 3 hours later, from
// the moment you are on the farm again. Orders follow a running number, like the trade depot's, so the game and the server agree.
export const VISITORS=Object.freeze([
 Object.freeze({id:'cook',name:'The count’s cook',line:'The count has guests tonight. Can your farm help me out?'}),
 Object.freeze({id:'merchant',name:'A travelling merchant',line:'My wagon leaves at dawn and it is still half empty.'}),
 Object.freeze({id:'innkeeper',name:'The innkeeper',line:'A wedding party took every room. My larder is bare!'}),
 Object.freeze({id:'captain',name:'The ship’s captain',line:'Supplies for a long voyage, and quickly please.'}),
 Object.freeze({id:'organiser',name:'The festival organiser',line:'The harvest festival opens tomorrow. I need the very best.'}),
 Object.freeze({id:'gardener',name:'The royal gardener',line:'The queen asked for something rare from the valley.'})
]);
export const VISITOR_VALUE=40000,VISITOR_STAY=12*3600000,VISITOR_WAIT=3*3600000,VISITOR_STREAK_MAX=10,VISITOR_PREMIUM=1.8,VISITOR_DIAMONDS=3;
export const visitorStreakBonus=streak=>Math.min(streak,VISITOR_STREAK_MAX)*.1;
export function visitorPay(state){return 1+masterBonus(state,'visitors')+valleyProjectBonus(state,'bridge');}
function visitorOrder(state,serial,streak,now){
 const roll=n=>mixBits(calendarHash(`visitor-v1:${serial}:${n}`)),bonus=visitorStreakBonus(streak),target=VISITOR_VALUE*(1+bonus);
// 3 Oct 2026: three of the farm's goods, no heirloom any more (one in every order was more than the Seed Lab's two beds keep up with).
 const goods=Object.keys(PRODUCTS).filter(k=>ITEMS[k].sell>=300&&!worldTwoItem(k)&&itemAvailable(state,k));
 if(goods.length<2)return null;
 const keys=[goods.splice(roll(0)%goods.length,1)[0],goods.splice(roll(1)%goods.length,1)[0]];
 keys.push(goods.length?goods[roll(2)%goods.length]:keys[0]);
 const input={};for(const k of keys)input[k]=(input[k]??0)+Math.max(1,Math.min(200,Math.round(target/keys.length/ITEMS[k].sell)));
 const value=Object.entries(input).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0);
 return {id:serial,visitor:roll(3)%VISITORS.length,input,value,coins:Math.ceil(value*(VISITOR_PREMIUM+bonus)*visitorPay(state)/100)*100,xp:Math.round(value/40),diamonds:VISITOR_DIAMONDS,arrivedAt:now,leavesAt:now+VISITOR_STAY};
}
function refreshVisitors(state,now){
 if(!featureUnlocked(state,'visitors'))return;
 const v=state.visitors;
 if(v.current&&now>=v.current.leavesAt){v.nextAt=v.current.leavesAt+VISITOR_WAIT;v.current=null;v.streak=0;v.missed=(v.missed??0)+1;}
 if(!v.current&&now>=v.nextAt){const order=visitorOrder(state,v.serial+1,v.streak,now);if(order){v.serial++;v.current=order;}}
}
function visitorCurrent(state,id){const c=state.visitors.current;if(!c||c.id!==id)throw new Error('This visitor has gone. Look at the road again.');return c;}
export function visitorServe(state,id,now=Date.now()){
 const c=visitorCurrent(state,id),missing=Object.entries(c.input).filter(([k,n])=>state.inventory[k]<n);
 if(missing.length)throw new Error('Missing: '+missing.map(([k,n])=>`${ITEMS[k].name} (${state.inventory[k]}/${n})`).join(', ')+'.');
 for(const [k,n] of Object.entries(c.input))state.inventory[k]-=n;
 const v=state.visitors;v.streak++;v.best=Math.max(v.best??0,v.streak);v.served=(v.served??0)+1;v.current=null;v.nextAt=now+VISITOR_WAIT;
 state.coins+=c.coins;state.xp+=c.xp;state.diamonds+=c.diamonds;state.stats.earned+=c.coins;state.stats.visitors_served=(state.stats.visitors_served??0)+1;
 state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+c.diamonds;
 return {name:VISITORS[c.visitor].name,coins:c.coins,xp:c.xp,diamonds:c.diamonds,streak:v.streak,nextAt:v.nextAt};
}
export function visitorDecline(state,id,now=Date.now()){
 visitorCurrent(state,id);const v=state.visitors;v.current=null;v.streak=0;v.nextAt=now+VISITOR_WAIT;
 return {nextAt:v.nextAt};
}

// The giant pumpkin (at the fair): one a week. Tend it once every 8 hours: each tending adds 10 kg plus 1 kg for every tending
// before it this week, and 10 kg more when you feed it 10 natural fertilizer. Weigh it in whenever you like; the scale pays by the
// kilo, a new personal record (from 100 kg) adds 25 diamonds. A pumpkin still on the vine on Monday is weighed in by itself.
// 7 Oct 2026: 1 diamond for every 20 kg, at most 20 (was every 10 kg, at most 40); the record bonus stays.
export const GIANT_TEND_MS=8*3600000,GIANT_TEND_KG=10,GIANT_FEED_KG=10,GIANT_FEED=Object.freeze({fertilizer:10}),GIANT_COINS_PER_KG=400,GIANT_RECORD_DIAMONDS=25;
export const GIANT_RECORD_MIN=100;   // a record counts from 100 kg, so a tiny first pumpkin is not one
export const GIANT_KG_PER_DIAMOND=20,GIANT_MAX_DIAMONDS=20;   // named for the texts that show them
export const giantDiamonds=kg=>Math.min(GIANT_MAX_DIAMONDS,Math.floor(kg/GIANT_KG_PER_DIAMOND));
function giantPayout(state,g){
 const kg=g.kg,record=kg>=GIANT_RECORD_MIN&&kg>(g.record??0),coins=kg*GIANT_COINS_PER_KG,diamonds=giantDiamonds(kg)+(record&&kg>0?GIANT_RECORD_DIAMONDS:0),xp=kg*5;
 state.coins+=coins;state.xp+=xp;state.diamonds+=diamonds;state.stats.earned+=coins;state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;
 state.stats.giant_weighed=(state.stats.giant_weighed??0)+1;if(record)g.record=kg;
 g.last={week:g.week,kg,coins,diamonds,xp,record};g.weighed=true;
 return g.last;
}
function refreshGiant(state,now){
 if(!featureUnlocked(state,'giantpumpkin'))return;
 const g=state.giant,week=familyWeek(now);if(g.week===week)return;
 if(g.week!==null&&!g.weighed&&g.kg>0)giantPayout(state,g);
 Object.assign(g,{week,kg:0,tends:0,lastTendAt:0,weighed:false});
}
export function giantTend(state,feed=false,now=Date.now()){
 const g=state.giant;
 if(g.weighed)throw new Error('This week’s pumpkin is weighed in. A new one grows from Monday.');
 if(g.lastTendAt&&now-g.lastTendAt<GIANT_TEND_MS)throw new Error(`Tend it again in ${formatDuration(g.lastTendAt+GIANT_TEND_MS-now)}.`);
 if(feed&&Object.entries(GIANT_FEED).some(([k,n])=>state.inventory[k]<n))throw new Error(`Feeding takes ${GIANT_FEED.fertilizer} natural fertilizer.`);
 if(feed)for(const [k,n] of Object.entries(GIANT_FEED))state.inventory[k]-=n;
 const added=GIANT_TEND_KG+g.tends+(feed?GIANT_FEED_KG:0);g.kg+=added;g.tends++;g.lastTendAt=now;
 return {added,kg:g.kg,fed:!!feed,nextAt:now+GIANT_TEND_MS};
}
export function giantWeigh(state){
 const g=state.giant;
 if(g.weighed)throw new Error('This week’s pumpkin is already weighed in.');
 if(g.kg<=0)throw new Error('Tend your pumpkin first.');
 return giantPayout(state,g);
}

// Valley projects: five works in the valley, three levels each. Hand in the goods a level asks for bit by bit (what you give stays
// given), then pay the coins to finish it; every level adds a lasting bonus. Since 3 Oct 2026 no heirlooms: the Seed Lab's two beds
// make at most 8 every 8 hours, so 30 to 60 of each made a wall; the farm's own goods of the same value stand in their place.
export const VALLEY_PROJECTS=Object.freeze({
 bridge:{name:'Stone bridge',art:'project-bridge',effect:'Visitors pay 5% more per level.',per:.05,levels:[
  {coins:250000,materials:{cloth:40,pickledbeans:40,candles:40}},
  {coins:500000,materials:{blanket:15,cherryjam:50,vegetables:65}},
  {coins:900000,materials:{blanket:30,harvesthamper:40,cherrypie:60,squashsoup:55}}]},
 watermill:{name:'Water mill',art:'project-watermill',effect:'The Windmill and the Feed Mill work 15% faster per level.',per:.15,levels:[
  {coins:250000,materials:{oil:80,flour:400,grainmeal:200}},
  {coins:500000,materials:{oil:150,squashsoup:40,pie:85}},
  {coins:900000,materials:{oil:250,prizeproduce:10,berrytart:50}}]},
 terraces:{name:'Orchard terraces',art:'project-terraces',effect:'Trees, bushes and climbing plants grow back 5% faster per level.',per:.05,levels:[
  {coins:250000,materials:{applepie:60,berrytart:30,cider:40}},
  {coins:500000,materials:{cherrypie:50,orchardjuice:150,applepie:90}},
  {coins:900000,materials:{cherryjam:120,berrycheesecake:80,cider:70,applepie:85}}]},
 canal:{name:'Irrigation canal',art:'project-canal',effect:'Crops grow 3% faster per level.',per:.03,levels:[
  {coins:250000,materials:{vegetables:80,pickles:80,salad:200}},
  {coins:500000,materials:{beangratin:80,squashsoup:40,stew:100}},
  {coins:900000,materials:{harvesthamper:40,pickledbeans:80,vegetables:80,pickles:75}}]},
 barn:{name:'Harvest barn',art:'project-barn',effect:'The Market pays 2% more per level.',per:.02,levels:[
  {coins:250000,materials:{cheese:400,wool:300,goatcheese:40}},
  {coins:500000,materials:{harvesthamper:30,cloth:60,goatcheese:80}},
  {coins:900000,materials:{blanket:25,prizeproduce:15,oil:70,goatcheese:80}}]}
});
export const VALLEY_PROJECT_XP=2000,VALLEY_PROJECT_DIAMONDS=20;   // × the project level: 20 / 40 / 60 (40 / 80 / 120 until 7 Oct 2026)
export const valleyProjectLevel=(state,id)=>state.valleyProjects?.[id]?.level??0;
export const valleyProjectBonus=(state,id)=>valleyProjectLevel(state,id)*VALLEY_PROJECTS[id].per;
function valleyProjectStep(state,id){
 if(typeof id!=='string'||!Object.hasOwn(VALLEY_PROJECTS,id))throw new Error('Choose a valley project.');
 const p=VALLEY_PROJECTS[id],level=valleyProjectLevel(state,id);
 if(level>=p.levels.length)throw new Error(`The ${p.name.toLowerCase()} is finished.`);
 return {p,level,step:p.levels[level],given:state.valleyProjects[id].given};
}
export function valleyProjectGive(state,id,item){
 const {p,step,given}=valleyProjectStep(state,id);
 if(item!==undefined&&(typeof item!=='string'||!Object.hasOwn(step.materials,item)))throw new Error(`The ${p.name.toLowerCase()} does not need that.`);
 const handed={};
 for(const key of item===undefined?Object.keys(step.materials):[item]){const n=Math.min(state.inventory[key],step.materials[key]-(given[key]??0));if(n>0){state.inventory[key]-=n;given[key]=(given[key]??0)+n;handed[key]=n;}}
 const units=Object.values(handed).reduce((sum,n)=>sum+n,0);
 if(!units)throw new Error(item===undefined?'You have none of the goods this project still needs.':`You have no ${ITEMS[item].name.toLowerCase()} to give.`);
 return {handed,units,ready:Object.entries(step.materials).every(([k,n])=>(given[k]??0)>=n)};
}
export function valleyProjectFinish(state,id){
 const {p,level,step,given}=valleyProjectStep(state,id);
 if(Object.entries(step.materials).some(([k,n])=>(given[k]??0)<n))throw new Error('Hand in all the goods first.');
 if(state.coins<step.coins)throw new Error(`You need ${step.coins.toLocaleString('en-US')} coins to finish it.`);
 state.coins-=step.coins;state.valleyProjects[id]={level:level+1,given:{}};
 const xp=VALLEY_PROJECT_XP*(level+1),diamonds=VALLEY_PROJECT_DIAMONDS*(level+1);state.xp+=xp;state.diamonds+=diamonds;
 state.stats.valley_projects=(state.stats.valley_projects??0)+1;state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;
 return {project:id,name:p.name,level:level+1,xp,diamonds};
}

// World II's market square (Oct 2026, the owner's plan for levels 100-200): the Village market's pin opens it. On top, one golden brief
// builds the next village place (coins and village goods, one place at a time); under it villagers ask for goods and pay half again
// their normal price, like the Valley Market's baskets. A board gets its next villager 3 hours after you help or say "Not now".
// Requests follow from the board and a running number (and the farm as it is then), so the game and the server agree on them.
// Requests pay exactly what they show: no VIP, Double earnings or other coin bonus (only the XP boost, like every action).
export const VILLAGE_REQUEST_BOARDS=2,VILLAGE_REQUEST_BOARDS_MAX=4,VILLAGE_THIRD_BOARD=104,VILLAGE_REQUEST_WAIT=3*3600000,VILLAGE_PREMIUM=1.5,VILLAGE_XP_SHARE=50,VILLAGE_LINE_MAX=200,VILLAGE_BUILD_XP=250;
// The market week (Oct 2026, from level 116): the villagers helped between Monday 00:00 and Sunday 24:00 UTC (familyWeek, as the family
// tournament and the fair) count, and the 15th opens the market crate at once: 10 diamonds, once a week. No pop-up, nothing to claim,
// nothing lost when a week falls short. Helps below level 116 do not count.
export const VILLAGE_WEEK_LEVEL=116,VILLAGE_WEEK_TARGET=15,VILLAGE_CRATE_DIAMONDS=10;
// From level 120 a villager asks three kinds of goods (Oct 2026), worth the same in all.
export const VILLAGE_THREE_KINDS=120;
export const villageRequestValue=level=>Math.min(20000,4000+200*Math.max(0,level-WORLD_TWO_LEVEL));
// Two villagers, a third from level 104 and a fourth with the Lookout tower (a landmark, Oct 2026). Not "MAX" for the third: MAX is the
// tower's 4.
export const villageBoards=state=>(levelOf(state)>=VILLAGE_THIRD_BOARD?VILLAGE_REQUEST_BOARDS+1:VILLAGE_REQUEST_BOARDS)+(landmarkDone(state,'lookout')?1:0);
// This week's count, for the market square's bar: a saved count of an older week reads as none yet.
export function villageWeek(state,now=Date.now()){const w=state.village?.week,current=w?.week===familyWeek(now);return {helped:current?w.helped:0,paid:current&&w.paid===true};}
// The farm's late goods a villager may ask for, never more than one in a request. Never asked: master tools (for the farm's master steps),
// heirloom flour (golden wheat from the Seed Lab: a slow crop the village's requests should not lean on) and builder's crates (they are
// for the farm's upgrades; from level 180 a request's share would be worth more than one).
export const VILLAGE_FARM_GOODS=Object.freeze(['cheese','goatcheese','wool','cloth','candles','blanket','cherryjam','cider']);
export const VILLAGE_NEVER_ASKED=Object.freeze(['mastertools','heirloomflour','builderscrate']);
// Who asks at the market square (villagerFor), each with four lines: as many as there can be boards (VILLAGE_REQUEST_BOARDS_MAX, the fourth
// with the Lookout tower), so two cards never read the same (villagerLine). The miller, the skipper, the jeweller and the village elder
// only speak on their golden briefs, the town boat and the landmarks. Always added at the end: a request keeps its villager by its place
// in this list.
export const VILLAGERS=Object.freeze([
 Object.freeze({id:'foreman',name:'The mine foreman',place:'mine',lines:Object.freeze(['My crew has a long shift ahead.','The new tunnel needs supplies.','We dig a little deeper every week.','Night shift starts soon, and we are short.'])}),
 Object.freeze({id:'woodcutter',name:'The head woodcutter',place:'lumbercamp',lines:Object.freeze(['The forest crew is hungry and busy.','We are building a new shed by the lake.','The saws have been running since dawn.','A storm brought half the forest down.'])}),
 Object.freeze({id:'smith',name:'The village smith',place:'smithy',lines:Object.freeze(['The forge is hot and my shelves are empty.','A big order came in from the valley.','Every miner wants a new pickaxe.','The bellows have not rested all day.'])}),
 Object.freeze({id:'miller',name:'The miller',place:'villagemill',lines:Object.freeze([])}),
 Object.freeze({id:'keeper',name:'The market keeper',place:'villagemarket',lines:Object.freeze(['The stalls want something special today.','Travellers keep asking for your goods.','It is market day, and the square is full.','A coach full of travellers just stopped here.'])}),
 // The places of levels 110-150 (Oct 2026). The jeweller's goods never fit a request (they go to the town boat and the landmarks).
 Object.freeze({id:'fieldhand',name:'The field hand',place:'villagefields',lines:Object.freeze(['The rows need tending before the rain.','We are ploughing a new strip by the barns.','The harvest cart is empty again.','Every hand in the fields is hungry.'])}),
 Object.freeze({id:'canteencook',name:'The canteen cook',place:'canteen',lines:Object.freeze(['The miners come in hungry at noon.','My ovens are warm and my shelves are bare.','A long shift needs a good lunch.','The whole crew wants seconds today.'])}),
 Object.freeze({id:'potter',name:'The potter',place:'kiln',lines:Object.freeze(['The kiln is hot, but my yard is empty.','Half the village wants new roofs.','A cart of pots goes to the valley tomorrow.','The clay pit is flooded again.'])}),
 Object.freeze({id:'weaver',name:'The weaver',place:'linenloft',lines:Object.freeze(['My looms are waiting for work.','A bride wants linen for her new home.','The loft is quiet without thread.','The tailor came by with a big order.'])}),
 Object.freeze({id:'soapmaker',name:'The soap maker',place:'soapmaker',lines:Object.freeze(['The whole square smells of lavender.','Wash day is coming for the village.','Visitors keep asking for my soap.','My moulds are empty and my kettle is hot.'])}),
 Object.freeze({id:'skipper',name:'The skipper',place:'pier',lines:Object.freeze([])}),
 Object.freeze({id:'jeweller',name:'The jeweller',place:'jeweller',lines:Object.freeze([])}),
 Object.freeze({id:'elder',name:'The village elder',place:null,lines:Object.freeze([])})
]);
// The golden briefs, in their order (prices: BUILDING_COSTS / buildCost above). A place opens at its own level and after the one before.
// In the order the places open (Oct 2026): the Village Fields (110) come before the Village Windmill (112), the rest after it. There is
// no brief state, so the order moves nobody (no farm had built a place then); each brief's goods come from places before it.
export const VILLAGE_BRIEFS=Object.freeze([
 {place:'mine',goods:{packedlunch:6},title:'The miners’ lunch',villager:0,line:'Feed my miners and we will open the old mine for you.'},
 {place:'lumbercamp',goods:{packedlunch:6},title:'A camp in the forest',villager:1,line:'Pack us lunch for the forest and we will build a camp by the lake.'},
 {place:'smithy',goods:{ironore:20,timber:20},title:'A fire for the forge',villager:2,line:'Bring me ore and logs, and the forge will burn again.'},
 {place:'villagefields',goods:{plank:20,stone:30},title:'Rows by the hay barns',villager:5,line:'Planks for the fences and stone for the paths, and we will plough the old fields.'},
 {place:'villagemill',goods:{plank:30,stone:40},title:'Sails on the hill',villager:3,line:'Planks for the sails and stone for the base, and the windmill will turn.'},
 {place:'canteen',goods:{plank:30,ironbar:10},title:'A canteen for the miners',villager:6,line:'Planks for the tables and iron for the stove, and the miners get pasties, no apples needed.'},
 {place:'kiln',goods:{stone:60,ironbar:20},title:'Fire in the kiln',villager:7,line:'Stone for the kiln and iron for its doors, and I will fire roof tiles for the whole village.'},
 {place:'linenloft',goods:{rooftile:40,plank:40},title:'A loft for the looms',villager:8,line:'Roof tiles to keep it dry and planks for the looms, and I will weave your flax.'},
 {place:'soapmaker',goods:{rooftile:60,linen:20},title:'A sweet-smelling workshop',villager:9,line:'A good roof and some linen, and the village will smell of lavender.'},
 {place:'pier',goods:{plank:120,rooftile:60,ironbar:20},title:'Mend the old pier',villager:10,line:'Planks, tiles and iron for the old pier, and my boat will call at the village again.'},
 {place:'jeweller',goods:{rooftile:80,silverbar:10},title:'A shop on the square',villager:11,line:'Tiles for the roof and silver for my bench, and your rubies will finally shine.'}
].map(b=>Object.freeze({...b,goods:Object.freeze(b.goods)})));
// A villager's request: two kinds of goods worth villageRequestValue(level) at their normal price, paid half again in coins and a 50th of
// it in XP. Only goods the farm can make now: village goods from places it has built (and the Kitchen's packed lunches), and at most one
// of the farm's late goods. One line is something the farm has at least half of in stock, when it has any (players turned away 27 of 30
// visitors who asked for what they did not have). No line is worth more than its share, so the size stays honest.
const villageAsks=state=>Object.keys(VILLAGE_GOODS).filter(k=>!VILLAGE_NEVER_ASKED.includes(k)&&itemAvailable(state,k));
// Who asks: the villager of the newest village place among the request's goods (Oct 2026; ties in the village goods' own order, never the
// order of the keys, which a save changes). Goods the farm's own buildings make too (packed lunches, in the Kitchen) have no place, so
// lunches with a farm good bring the market keeper. At level 130 the goods' order gave the potter 26 of 900 requests; now 229.
const villagePlaceOf=k=>Object.values(BASE_RECIPES).some(r=>r.output[k])?undefined:Object.values(VILLAGE_RECIPES).find(r=>r.output[k])?.building;
const villagerFor=input=>{const place=Object.keys(VILLAGE_GOODS).filter(k=>input[k]).map(villagePlaceOf).filter(Boolean).sort((a,b)=>BUILDING_LEVELS[b]-BUILDING_LEVELS[a])[0];return VILLAGERS.findIndex(v=>v.place===(place??'villagemarket'));};
// From level 120 a villager asks three kinds of goods (Oct 2026): each line is worth what is left divided over the lines still to come.
// With two kinds this is the request of Phase 1, line for line. The pay is half again (1.6 times once the Great Hall stands: villagePremium).
function villageRequest(state,board,serial,taken){
 const roll=n=>mixBits(calendarHash(`village-v1:${board}:${serial}:${n}`)),target=villageRequestValue(levelOf(state)),kinds=levelOf(state)>=VILLAGE_THREE_KINDS?3:2,share=target/kinds;
 const fits=k=>ITEMS[k].sell<=share,village=villageAsks(state).filter(fits),farm=VILLAGE_FARM_GOODS.filter(k=>fits(k)&&itemAvailable(state,k));
 if(!village.length)return null;   // nothing the farm can make for the village yet: the board waits
 const amount=(k,worth)=>Math.max(1,Math.min(VILLAGE_LINE_MAX,Math.round(worth/ITEMS[k].sell)));
 const fresh=list=>{const left=list.filter(k=>!taken.has(k));return left.length?left:list;};   // another board's goods only when nothing else is left
 const stocked=fresh([...village,...farm].filter(k=>(state.inventory[k]??0)>=Math.ceil(amount(k,share)/2)));
 const firstPool=stocked.length?stocked:fresh(village),first=firstPool[roll(0)%firstPool.length],input={[first]:amount(first,share)};
 let rest=target-ITEMS[first].sell*input[first];
 for(let i=1;i<kinds;i++){
  const worth=rest/(kinds-i),hasFarm=Object.keys(input).some(k=>farm.includes(k));
  const pool=fresh((hasFarm?village:[...village,...farm]).filter(k=>!input[k]&&ITEMS[k].sell<=worth));
  if(!pool.length)continue;
  const k=pool[roll(i)%pool.length];input[k]=amount(k,worth);rest-=ITEMS[k].sell*input[k];
 }
 if(Object.keys(input).length===1)input[first]=amount(first,target);
 const value=Object.entries(input).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0);
 return {id:serial,villager:villagerFor(input),input,value,coins:Math.ceil(value*villagePremium(state)),xp:Math.round(value/VILLAGE_XP_SHARE)};
}
// Gives every board whose waiting time is over its next villager, the one that has waited longest first (then board order): each sees the
// goods the other boards already ask for. In that order one pass after two boards fell due fills them as two passes did, one as each fell
// due: a load that is not saved fills a board on the screen, and the server later fills both at once from the saved farm. In board order
// the second board got the first number there, and the villager on the screen swapped. Only the boards the level has (villageBoards); the
// third comes at 104, a fourth with the Lookout tower.
function refreshVillage(state,now){
 if(!worldTwoOpen(state))return;
 const v=state.village;while(v.boards.length<villageBoards(state))v.boards.push({request:null,readyAt:0});
 const due=v.boards.map((board,i)=>({board,i})).filter(({board})=>!board.request&&now>=board.readyAt).sort((a,b)=>a.board.readyAt-b.board.readyAt||a.i-b.i);
 for(const {board,i} of due){
  const taken=new Set(v.boards.flatMap(b=>b.request?Object.keys(b.request.input):[]));
  const request=villageRequest(state,i,v.serial+1,taken);if(request){v.serial++;board.request=request;}
 }
 refreshBoat(state,now);
}
// World II's market square: farms from before start with no boards, an empty market week, no boat and no landmark; anything else in it is
// cleaned up. Only the boards the farm's level has are kept (villageBoards: a third from 104, a fourth with the Lookout tower), so the
// landmarks are read before the boards.
function normalizeVillage(state){
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{},v=obj(state.village),count=n=>Number.isSafeInteger(n)&&n>0?n:0;
 const request=r=>r&&typeof r==='object'&&count(r.id)&&Number.isInteger(r.villager)&&VILLAGERS[r.villager]?.lines.length&&r.input&&typeof r.input==='object'&&!Array.isArray(r.input)&&Object.keys(r.input).length>=1&&Object.keys(r.input).length<=3&&Object.entries(r.input).every(([k,n])=>Object.hasOwn(ITEMS,k)&&count(n))&&[r.value,r.coins,r.xp].every(n=>Number.isSafeInteger(n)&&n>=0)?{id:r.id,villager:r.villager,input:{...r.input},value:r.value,coins:r.coins,xp:r.xp}:null;
 const boards=(Array.isArray(v.boards)?v.boards:[]).slice(0,VILLAGE_REQUEST_BOARDS_MAX).map(b=>({request:request(b?.request),readyAt:count(b?.readyAt)}));
 // The market week: a crate counts as opened only with the villagers it needs.
 const w=obj(v.week),week={week:Number.isSafeInteger(w.week)?w.week:null,helped:count(w.helped),paid:w.paid===true&&count(w.helped)>=VILLAGE_WEEK_TARGET};
 // The landmarks: the longest run of VILLAGE_LANDMARKS' order in the save (they are finished in that order), and the next one's goods,
 // never more than it asks.
 const lm=obj(v.landmarks),saved=Array.isArray(lm.done)?lm.done:[],ids=Object.keys(VILLAGE_LANDMARKS);let n=0;while(n<ids.length&&saved.includes(ids[n]))n++;
 const next=ids[n],g=obj(lm.given),given=next?Object.fromEntries(Object.entries(VILLAGE_LANDMARKS[next].materials).map(([k,need])=>[k,Math.min(need,count(g[k]))]).filter(([,x])=>x>0)):{};
 // The miller's order (17 Oct 2026): the week it was last delivered.
 const miller={week:Number.isSafeInteger(obj(v.miller).week)?v.miller.week:null};
 state.village={serial:Math.max(count(v.serial),...boards.map(b=>b.request?.id??0)),boards:[],week,boat:normalizeBoat(v.boat),landmarks:{done:ids.slice(0,n),given},miller};   // a new request never repeats an id
 state.village.boards=boards.slice(0,villageBoards(state));
}
// A request's goods in a fixed order (village goods first, then the farm's), whatever order a save keeps the keys in, so the market
// square shows the lines the same way every time.
const VILLAGE_LINE_ORDER=Object.freeze([...new Set([...Object.keys(VILLAGE_GOODS),...Object.keys(ITEMS)])]);
export const villageRequestGoods=request=>Object.fromEntries(VILLAGE_LINE_ORDER.filter(k=>request.input[k]>0).map(k=>[k,request.input[k]]));
// A card's line: its villager's line for this request, or the next of theirs when another card on the screen already says that one (said:
// the lines of the cards above it), so the same villager on two or three boards never reads twice the same.
export function villagerLine(request,said=[]){const lines=VILLAGERS[request.villager].lines;return lines.map((_,k)=>lines[(request.id+k)%lines.length]).find(line=>!said.includes(line))??lines[request.id%lines.length];}
// How much more a villager pays than the Village market would for the same goods now, its price of the day and every bonus included
// (Double earnings, VIP, the ledger, the barn): null when the market would pay as much or more, so "+X% vs market" is never untrue.
export function villageRequestExtra(state,request,now=Date.now()){const extra=Math.round((request.coins/Math.max(1,marketSaleValue(state,marketValue(request.input,now),now))-1)*100);return extra>0?extra:null;}
// The refusal when the server's villager is not the one on the screen: the market square loads the farm again when it hears it.
export const VILLAGER_GONE='This villager has moved on. Look at the market square again.';
const villageOpen=state=>{if(!worldTwoOpen(state))throw new Error(`Reach level ${WORLD_TWO_LEVEL} to trade in the village.`);};
function villageBoard(state,board,request){
 villageOpen(state);
 const b=Number.isInteger(board)?state.village.boards[board]:undefined;if(!b)throw new Error('Choose a villager.');
 if(!b.request||b.request.id!==request)throw new Error(VILLAGER_GONE);
 return b;
}
// The goods the farmer was shown: the game and the server each fill a board from the stock of that moment, so one running number can hold
// other goods on each side. Help hands over only what was on screen. Keys in any order: a save reorders them.
const sameGoods=(seen,input)=>Boolean(seen)&&typeof seen==='object'&&!Array.isArray(seen)&&Object.keys(seen).length===Object.keys(input).length&&Object.entries(input).every(([k,n])=>Object.hasOwn(seen,k)&&seen[k]===n);
export function villageDeliver(state,board,request,input,now=Date.now()){
 const b=villageBoard(state,board,request),r=b.request;if(!sameGoods(input,r.input))throw new Error(VILLAGER_GONE);
 const missing=Object.entries(r.input).filter(([k,n])=>(state.inventory[k]??0)<n);
 if(missing.length)throw new Error('Missing: '+missing.map(([k,n])=>`${ITEMS[k].name} (${state.inventory[k]??0}/${n})`).join(', ')+'.');
 let units=0;for(const [k,n] of Object.entries(r.input)){state.inventory[k]-=n;units+=n;}
 // At the Village market, so in its own counts (its quests too), never in the farm Market's sold and sold_* counts.
 state.coins+=r.coins;state.xp+=r.xp;state.stats.earned+=r.coins;
 state.stats.village_requests=(state.stats.village_requests??0)+1;state.stats.village_sold=(state.stats.village_sold??0)+units;state.stats.village_earned=(state.stats.village_earned??0)+r.coins;
 b.request=null;b.readyAt=now+VILLAGE_REQUEST_WAIT;
 // The market week (from level 116): the 15th villager of the week opens the crate in this same Help.
 let crate=0;
 if(levelOf(state)>=VILLAGE_WEEK_LEVEL){const wk=familyWeek(now),w=state.village.week;if(w.week!==wk)Object.assign(w,{week:wk,helped:0,paid:false});w.helped++;
  if(!w.paid&&w.helped>=VILLAGE_WEEK_TARGET){w.paid=true;crate=VILLAGE_CRATE_DIAMONDS;state.diamonds+=crate;state.stats.market_crates=(state.stats.market_crates??0)+1;state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+crate;}}
 return {coins:r.coins,xp:r.xp,villager:VILLAGERS[r.villager].name,readyAt:b.readyAt,crate};
}
// "Not now": the goods the farmer was shown are checked too when the game sends them.
export function villageSkip(state,board,request,input,now=Date.now()){
 const b=villageBoard(state,board,request);if(input!==undefined&&!sameGoods(input,b.request.input))throw new Error(VILLAGER_GONE);
 b.request=null;b.readyAt=now+VILLAGE_REQUEST_WAIT;
 return {readyAt:b.readyAt};
}
// The miller's order (17 Oct 2026, the owner's pick 5b): a farmer baked heirloom bread, and nothing asked for it. From level 115, once a
// week (Monday to Sunday, UTC, as the market week), the miller at the market square asks for 6 golden loaves and 2 heirloom pies and pays
// twice what they are worth (80,000 coins), 10 diamonds and a 50th of their worth in XP, as a villager does. That is about 4 Seed Lab
// crosses a week (3 of golden wheat, 1 of golden apples) of the about 40 two beds can grow. One order a week: nothing to claim, nothing
// lost when a week is missed, no coin bonus (a villager's rule). village.miller.week is the week it was last delivered.
export const MILLER_LEVEL=115,MILLER_ORDER=Object.freeze({goldenloaf:6,heirloompie:2}),MILLER_PREMIUM=2,MILLER_DIAMONDS=10;
export const millerValue=()=>Object.entries(MILLER_ORDER).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0);
export const millerOpen=state=>worldTwoOpen(state)&&levelOf(state)>=MILLER_LEVEL;
export const millerDelivered=(state,now=Date.now())=>state.village?.miller?.week===familyWeek(now);
export function millerDeliver(state,week,now=Date.now()){
 villageOpen(state);
 if(levelOf(state)<MILLER_LEVEL)throw new Error(`Reach level ${MILLER_LEVEL} for the miller’s order.`);
 if(week!==familyWeek(now))throw new Error('A new week has begun. Look at the miller’s order again.');
 if(millerDelivered(state,now))throw new Error('The miller has his bakes for this week. He comes back on Monday.');
 const missing=Object.entries(MILLER_ORDER).filter(([k,n])=>(state.inventory[k]??0)<n);
 if(missing.length)throw new Error('Missing: '+missing.map(([k,n])=>`${ITEMS[k].name} (${state.inventory[k]??0}/${n})`).join(', ')+'.');
 for(const [k,n] of Object.entries(MILLER_ORDER))state.inventory[k]-=n;
 const value=millerValue(),coins=value*MILLER_PREMIUM,xp=Math.round(value/VILLAGE_XP_SHARE);
 state.coins+=coins;state.xp+=xp;state.diamonds+=MILLER_DIAMONDS;state.village.miller={week};
 state.stats.earned+=coins;state.stats.village_earned=(state.stats.village_earned??0)+coins;
 state.stats.miller_orders=(state.stats.miller_orders??0)+1;state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+MILLER_DIAMONDS;
 return {coins,xp,diamonds:MILLER_DIAMONDS};
}
// The golden brief that is open now: the first village place not built yet, in VILLAGE_BRIEFS' order, or null when all are. There is no
// brief state: it follows from what is built, so a farm that built a place before the briefs keeps it and gets the next one.
export function villageBrief(state){
 const brief=VILLAGE_BRIEFS.find(b=>!state.buildings[b.place]?.built);if(!brief)return null;
 const coins=buildingCost(state,brief.place),level=guidedFarm(state)?BUILDING_LEVELS[brief.place]:BUILDINGS[brief.place].minLevel??1,open=buildingEligible(state,brief.place);
 const missing=Object.fromEntries(Object.entries(brief.goods).filter(([k,n])=>(state.inventory[k]??0)<n).map(([k,n])=>[k,n-(state.inventory[k]??0)]));
 return {...brief,coins,level,open,missing,short:Math.max(0,coins-state.coins),ready:open&&!Object.keys(missing).length&&state.coins>=coins};
}
// The place to build right before this one: the last one before it in the briefs' order that is not built yet (null for the open brief's
// own place). So the Smithy says "After the Lumber Camp" while the Mine's brief is open, not "After the Mine", and keeps saying it.
export function villagePlaceBefore(state,place){
 const i=VILLAGE_BRIEFS.findIndex(b=>b.place===place);
 return VILLAGE_BRIEFS.slice(0,Math.max(0,i)).filter(b=>!state.buildings[b.place]?.built).at(-1)?.place??null;
}
export function villageBuild(state,place){
 villageOpen(state);
 const brief=typeof place==='string'?VILLAGE_BRIEFS.find(b=>b.place===place):null;if(!brief)throw new Error('Choose a village place.');
 // The Village Fields are one name in the plural (Oct 2026).
 const name=BUILDINGS[place].name;if(state.buildings[place].built)throw new Error(place==='villagefields'?`The ${name} are already built.`:`The ${name} is already built.`);
 const next=villageBrief(state);if(next.place!==place)throw new Error(`Build the ${BUILDINGS[next.place].name} first: one golden brief at a time.`);
 if(!next.open)throw new Error(buildingUnlockHint(state,place));
 if(state.coins<next.coins)throw new Error(`You need ${next.coins.toLocaleString('en-US')} coins to build the ${name}.`);
 const missing=Object.entries(brief.goods).filter(([k,n])=>(state.inventory[k]??0)<n);
 if(missing.length)throw new Error(`Gather the missing supplies: ${missing.map(([k,n])=>`${n} ${ITEMS[k].name}`).join(', ')}.`);
 state.coins-=next.coins;for(const [k,n] of Object.entries(brief.goods))state.inventory[k]-=n;
 state.buildings[place].built=true;state.stats['built_'+place]=1;state.xp+=VILLAGE_BUILD_XP;
 return {place,name,coins:next.coins,goods:{...brief.goods},xp:VILLAGE_BUILD_XP};
}
// Whether the market square has something to do now: a brief or a landmark ready to build (everything handed in and the coins there) or
// a villager you can help (its pin in the village; the Village button leaves villagers out, game.js).
export function villageSquareReady(state){
 if(!worldTwoOpen(state))return false;
 return Boolean(villageBrief(state)?.ready)||Boolean(villageLandmark(state)?.ready)||(state.village?.boards??[]).some(b=>b.request&&Object.entries(b.request.input).every(([k,n])=>(state.inventory[k]??0)>=n));
}
// The town boat (Oct 2026, the owner's choice 9b): once the Pier is mended (level 144) the boat calls for one cargo at a time, three or
// four of the village's dearer goods, loaded bit by bit like the Trade Depot's trailer (what is loaded stays loaded). A full boat sails at
// once and pays 1.6 times the goods' normal price and a 40th in XP, exactly as shown (no coin boost or VIP, like the villagers' requests),
// and 3 diamonds on the first 14 boats of a week (Monday to Sunday UTC, the market week's week: at most 52 diamonds a week with the crate,
// also with the Stone quay). It is back 12 hours later (6 with the Stone quay), also after a cargo with nothing loaded is turned down. A
// cargo is worth 50,000 at level 144 and 1,000 more a level, up to 106,000 at 200: never more than the Trade Depot's trailer (120,000).
export const BOAT_PREMIUM=1.6,BOAT_DIAMONDS=3,BOAT_DIAMOND_TRIPS=14,BOAT_XP_SHARE=40,BOAT_RETURN=12*3600000,BOAT_QUAY_RETURN=6*3600000;
export const BOAT_VALUE_BASE=50000,BOAT_VALUE_STEP=1000,BOAT_VALUE_MAX=106000;
export const BOAT_GOODS=Object.freeze(['rooftile','linen','lavendersoap','scentedsachet','silvercandlestick','rubyring','saffronbun','silverbar']);
// The refusal when the server's cargo is not the one on the screen: the boat's window loads the farm again when it hears it.
export const BOAT_GONE='The boat’s cargo has changed. Look at the boat again.';
// A village landmark is finished (VILLAGE_LANDMARKS below): the Stone quay brings the boat back sooner. Defined once, here.
export const landmarkDone=(state,id)=>state.village?.landmarks?.done?.includes(id)===true;
export const boatValue=level=>Math.min(BOAT_VALUE_MAX,BOAT_VALUE_BASE+BOAT_VALUE_STEP*Math.max(0,level-BUILDING_LEVELS.pier));
export const boatReturn=state=>landmarkDone(state,'stonequay')?BOAT_QUAY_RETURN:BOAT_RETURN;
// A cargo: three or four (about half each) of BOAT_GOODS the farm can make now, each line an equal share of boatValue at its normal price
// (1 to 200 of a good). It follows from the boat's running number and the farm as it is then, like the depot's contracts.
function boatCargo(state,serial){
 const roll=n=>mixBits(calendarHash(`boat-v1:${serial}:${n}`)),target=boatValue(levelOf(state));
 const goods=BOAT_GOODS.filter(k=>itemAvailable(state,k)),kinds=Math.min(goods.length,3+roll(8)%2),input={};
 if(!kinds)return null;   // nothing the boat takes yet: it waits until the village makes something
 for(let i=0;i<kinds;i++){const key=goods.splice(roll(i)%goods.length,1)[0];input[key]=Math.max(1,Math.min(VILLAGE_LINE_MAX,Math.round(target/kinds/ITEMS[key].sell)));}
 const value=Object.entries(input).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0);
 return {id:serial,input,loaded:Object.fromEntries(Object.keys(input).map(k=>[k,0])),value,coins:Math.ceil(value*BOAT_PREMIUM/100)*100,xp:Math.round(value/BOAT_XP_SHARE),diamonds:BOAT_DIAMONDS};
}
// The next cargo, once the Pier is mended (buildingUnlocked: built and its level reached) and the boat is back; the first one as soon as the
// Pier stands (its brief was the wait).
function refreshBoat(state,now){
 const boat=state.village.boat;
 if(!worldTwoOpen(state)||!buildingUnlocked(state,'pier')||boat.cargo||now<boat.readyAt)return;
 const cargo=boatCargo(state,boat.serial+1);if(cargo){boat.serial++;boat.cargo=cargo;}
}
// The diamonds the next full boat brings: BOAT_DIAMONDS on the first BOAT_DIAMOND_TRIPS boats of this week, none after them until Monday
// (only the Stone quay's 6 hours can send more than 14 a week). For the boat's card; a saved older week counts as none sent yet.
export function boatDiamonds(state,now=Date.now()){const b=state.village?.boat;return b?.week===familyWeek(now)&&b.paid>=BOAT_DIAMOND_TRIPS?0:BOAT_DIAMONDS;}
// One Load all would sail it: what is not loaded yet is all in stock (the Pier's yellow label and the Village button's count).
export function boatReady(state){const c=state.village?.boat?.cargo;return Boolean(c)&&Object.entries(c.input).every(([k,n])=>c.loaded[k]+(state.inventory[k]??0)>=n);}
// The cargo the screen showed, by its number and its goods (10 Oct 2026, as Help at the market square): the game and the server each make
// a cargo from the farm of that moment, so one number can ask other amounts on each side (a level-up in between). Keys in any order.
function boatOf(state,cargo,input,shown=true){
 villageOpen(state);
 if(!buildingUnlocked(state,'pier'))throw new Error('Build the Pier first.');
 const c=state.village.boat.cargo;if(!c||c.id!==cargo||shown&&!sameGoods(input,c.input))throw new Error(BOAT_GONE);
 return c;
}
// Loads one kind of goods (item) or everything the cargo still needs (no item), as far as the barn has it; a full boat sails at once.
export function boatLoad(state,cargo,input,item,now=Date.now()){
 const c=boatOf(state,cargo,input);
 if(item!==undefined&&(typeof item!=='string'||!Object.hasOwn(c.input,item)))throw new Error('The boat does not take that.');
 const loaded={};
 for(const key of item===undefined?Object.keys(c.input):[item]){const n=Math.min(state.inventory[key]??0,c.input[key]-c.loaded[key]);if(n>0){state.inventory[key]-=n;c.loaded[key]+=n;loaded[key]=n;}}
 const units=Object.values(loaded).reduce((sum,n)=>sum+n,0);
 if(!units)throw new Error(item===undefined?'You have none of the goods the boat still needs.':`You have no ${ITEMS[item].name.toLowerCase()} to load.`);
 state.stats.boat_loaded=(state.stats.boat_loaded??0)+units;
 if(Object.keys(c.input).some(k=>c.loaded[k]<c.input[k]))return {loaded,units,sailed:false};
 // At the village's own pier: earned (like the depot), never the farm Market's sold, sold_* or deliveries. The diamonds only on the week's
 // first BOAT_DIAMOND_TRIPS boats (10 Oct 2026, the main session's choice F2): the coins and XP on every one.
 const boat=state.village.boat,week=familyWeek(now);if(boat.week!==week)Object.assign(boat,{week,paid:0});
 const diamonds=boat.paid<BOAT_DIAMOND_TRIPS?c.diamonds:0;if(diamonds)boat.paid++;
 state.coins+=c.coins;state.xp+=c.xp;state.diamonds+=diamonds;state.stats.earned+=c.coins;
 state.stats.boat_trips=(state.stats.boat_trips??0)+1;state.stats.boat_coins=(state.stats.boat_coins??0)+c.coins;
 if(diamonds)state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;
 boat.trips++;boat.cargo=null;boat.readyAt=now+boatReturn(state);
 return {loaded,units,sailed:true,coins:c.coins,xp:c.xp,diamonds,readyAt:boat.readyAt};
}
// "Turn this cargo down": only while nothing is loaded; the boat is back after the same wait. The goods the screen showed are checked
// too when the game sends them, as for "Not now".
export function boatSkip(state,cargo,input,now=Date.now()){
 const c=boatOf(state,cargo,input,input!==undefined);
 if(Object.values(c.loaded).some(n=>n>0))throw new Error('Goods are already on the boat. Finish loading it.');
 const boat=state.village.boat;boat.cargo=null;boat.readyAt=now+boatReturn(state);
 return {readyAt:boat.readyAt};
}
// The boat's saved state, cleaned: a cargo is kept only as the rules make one (its goods from BOAT_GOODS, one to four kinds, never more
// loaded than asked) and always holds today's diamonds; anything else is no cargo. week and paid: the diamond boats sent in that familyWeek
// (at most BOAT_DIAMOND_TRIPS). normalizeVillage calls it.
function normalizeBoat(b){
 const plain=x=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x),count=n=>Number.isSafeInteger(n)&&n>0?n:0;b=plain(b)?b:{};
 const c=b.cargo,keys=plain(c)&&plain(c.input)?Object.keys(c.input):[];
 const ok=count(c?.id)&&keys.length>=1&&keys.length<=4&&keys.every(k=>BOAT_GOODS.includes(k)&&count(c.input[k]))&&plain(c.loaded)&&Object.keys(c.loaded).length===keys.length&&keys.every(k=>Number.isSafeInteger(c.loaded[k])&&c.loaded[k]>=0&&c.loaded[k]<=c.input[k])&&[c.value,c.coins,c.xp].every(n=>Number.isSafeInteger(n)&&n>=0);
 const cargo=ok?{id:c.id,input:Object.fromEntries(keys.map(k=>[k,c.input[k]])),loaded:Object.fromEntries(keys.map(k=>[k,c.loaded[k]])),value:c.value,coins:c.coins,xp:c.xp,diamonds:BOAT_DIAMONDS}:null;
 const week=Number.isSafeInteger(b.week)?b.week:null;
 return {serial:Math.max(count(b.serial),cargo?.id??0),cargo,readyAt:count(b.readyAt),trips:count(b.trips),week,paid:week===null?0:Math.min(BOAT_DIAMOND_TRIPS,count(b.paid))};
}
// The village's landmarks (Oct 2026, the owner's plan for levels 165-200): after the last village place the golden brief builds five
// landmarks, one at a time, in this order. Like a valley project: hand in the goods bit by bit (what you give stays given), then pay the
// coins to finish; each gives 5,000 XP and a bonus that lasts for good. The Great Hall at WORLD_TWO_TOP is the last thing World II opens.
// The Longhouse takes scented sachets, not lavender soap (10 Oct 2026): about 57 sunflowers' worth of beeswax and candles for all five.
export const VILLAGE_LANDMARKS=Object.freeze(Object.fromEntries(Object.entries({
 windpump:{name:'Wind pump',level:165,coins:1500000,materials:{rooftile:600,plank:300,ironbar:60},effect:'Village Fields batches take 25% less time.',villager:5,title:'Water for the fields',line:'A wind pump by the fields, and every row grows faster.',art:'landmark-windpump'},
 longhouse:{name:'Longhouse',level:172,coins:2000000,materials:{linen:300,scentedsachet:200,rooftile:400},effect:'Batches in every village place take 10% less time.',villager:12,title:'A hall for the workers',line:'A longhouse where the workers rest, and every workshop goes faster.',art:'landmark-longhouse'},
 stonequay:{name:'Stone quay',level:185,coins:2500000,materials:{stone:2000,plank:400,scentedsachet:200},effect:'The town boat comes back after 6 hours instead of 12.',villager:10,title:'A quay of stone',line:'A stone quay, and my boat is loaded and back in half the time.',art:'landmark-stonequay'},
 lookout:{name:'Lookout tower',level:192,coins:3000000,materials:{silvercandlestick:20,rubyring:20,saffronbun:150},effect:'A fourth villager comes to the market square.',villager:4,title:'A tower above the square',line:'A lookout tower, and travellers will see the market from afar.',art:'landmark-lookout'},
 greathall:{name:'Great Hall',level:WORLD_TWO_TOP,coins:3000000,materials:{rooftile:100,linen:100,lavendersoap:100,scentedsachet:100,saffronbun:100},effect:'Villagers pay 1.6 times what their goods are worth. The Hall gives 200 diamonds once.',villager:12,title:'The heart of the village',line:'One last hall for the whole village, with a bell for every villager who comes.',art:'landmark-greathall'}
}).map(([k,l])=>[k,Object.freeze({...l,materials:Object.freeze(l.materials)})])));
export const VILLAGE_LANDMARK_XP=5000,VILLAGE_HALL_PREMIUM=1.6,GREAT_HALL_DIAMONDS=200;
export const VILLAGE_LANDMARK_BONUS=Object.freeze({windpump:.25,longhouse:.1});   // less batch time: the Village Fields', every village place's
export const landmarkBonus=(state,id)=>landmarkDone(state,id)?VILLAGE_LANDMARK_BONUS[id]??0:0;
// What a villager pays for a request made now: half again, 1.6 times with the Great Hall. A request already waiting keeps its coins.
export const villagePremium=state=>landmarkDone(state,'greathall')?VILLAGE_HALL_PREMIUM:VILLAGE_PREMIUM;
// What the golden brief's card says once every place and landmark is built: after the Great Hall nothing more opens (the builders'
// "next plans" are retired, Oct 2026).
export const VILLAGE_ALL_BUILT='Every place and landmark in the village is built.';
// The landmark the golden brief builds now: none below level 100, while a village place's brief is open or once all five are finished.
// missing: the goods still to hand in; ready: its level reached, everything handed in and the coins there (the market square's pin lights).
export function villageLandmark(state){
 if(!worldTwoOpen(state)||villageBrief(state))return null;
 const id=Object.keys(VILLAGE_LANDMARKS).find(k=>!landmarkDone(state,k));if(!id)return null;
 const l=VILLAGE_LANDMARKS[id],given=state.village?.landmarks?.given??{},open=levelOf(state)>=l.level;
 const missing=Object.fromEntries(Object.entries(l.materials).filter(([k,n])=>(given[k]??0)<n).map(([k,n])=>[k,n-(given[k]??0)]));
 return {id,...l,given:{...given},open,missing,short:Math.max(0,l.coins-state.coins),ready:open&&!Object.keys(missing).length&&state.coins>=l.coins};
}
// The checks both landmark actions share, in this order: one golden brief at a time, so a landmark waits for the last place and the one
// before it, and its goods are taken only from its level (nothing to hand in early).
function landmarkStep(state,id){
 villageOpen(state);
 if(typeof id!=='string'||!Object.hasOwn(VILLAGE_LANDMARKS,id))throw new Error('Choose a landmark.');
 const l=VILLAGE_LANDMARKS[id];if(landmarkDone(state,id))throw new Error(`The ${l.name} is already finished.`);
 const brief=villageBrief(state);if(brief)throw new Error(`Build the ${BUILDINGS[brief.place].name} first: one golden brief at a time.`);
 const next=villageLandmark(state);if(next.id!==id)throw new Error(`Finish the ${next.name} first: one golden brief at a time.`);
 if(!next.open)throw new Error(`Reach level ${l.level} to build the ${l.name}.`);
 return {l,given:state.village.landmarks.given};
}
// Hands in one kind of goods (item) or everything the landmark still needs (no item), as far as the barn has it; what is given stays given.
export function landmarkGive(state,id,item){
 const {l,given}=landmarkStep(state,id);
 if(item!==undefined&&(typeof item!=='string'||!Object.hasOwn(l.materials,item)))throw new Error(`The ${l.name} does not need that.`);
 const handed={};
 for(const key of item===undefined?Object.keys(l.materials):[item]){const n=Math.min(state.inventory[key]??0,l.materials[key]-(given[key]??0));if(n>0){state.inventory[key]-=n;given[key]=(given[key]??0)+n;handed[key]=n;}}
 const units=Object.values(handed).reduce((sum,n)=>sum+n,0);
 if(!units)throw new Error(item===undefined?'You have none of the goods this landmark still needs.':`You have no ${ITEMS[item].name.toLowerCase()} to give.`);
 return {handed,units,ready:Object.entries(l.materials).every(([k,n])=>(given[k]??0)>=n)};
}
// Pays the coins and finishes it: 5,000 XP, its bonus for good, and the Great Hall's 200 diamonds, which can come only once (done never
// loses an id and a finished landmark is refused). Spent coins count for the events through applyFarmAction, as for the briefs; never
// sold, earned or produced.
export function landmarkFinish(state,id){
 const {l,given}=landmarkStep(state,id);
 if(Object.entries(l.materials).some(([k,n])=>(given[k]??0)<n))throw new Error('Hand in all the goods first.');
 if(state.coins<l.coins)throw new Error(`You need ${l.coins.toLocaleString('en-US')} coins to finish it.`);
 const diamonds=id==='greathall'?GREAT_HALL_DIAMONDS:0;
 state.coins-=l.coins;state.village.landmarks.done.push(id);state.village.landmarks.given={};
 state.xp+=VILLAGE_LANDMARK_XP;state.diamonds+=diamonds;
 state.stats.village_landmarks=(state.stats.village_landmarks??0)+1;if(diamonds)state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;
 return {landmark:id,name:l.name,coins:l.coins,xp:VILLAGE_LANDMARK_XP,diamonds};
}
function normalizeEndgame(state){
 const master=state.master&&typeof state.master==='object'?state.master:{};state.master={};
 for(const [b,x] of Object.entries(MASTER_BRANCHES)){const n=master[b];if(Number.isInteger(n)&&n>0)state.master[b]=Math.min(n,x.max);}
 // The beds the farm has (labBeds: three with the whole collection), read from what it found.
 const lab=state.lab??{},found=[...new Set((Array.isArray(lab.found)?lab.found:[]).filter(k=>Object.hasOwn(HEIRLOOMS,k)))];
 state.lab={beds:Array.from({length:labBeds({lab:{found}})},(_,i)=>{const b=lab.beds?.[i];return b&&Object.hasOwn(HEIRLOOMS,b.heirloom)&&Number.isSafeInteger(b.readyAt)?b:null;}),found};
 state.visitors??={serial:0,streak:0,best:0,served:0,missed:0,current:null,nextAt:0};
 state.giant??={week:null,kg:0,tends:0,lastTendAt:0,weighed:false,record:0,last:null};
 const projects=state.valleyProjects&&typeof state.valleyProjects==='object'?state.valleyProjects:{};state.valleyProjects={};
 for(const [id,p] of Object.entries(VALLEY_PROJECTS)){const x=projects[id]??{};state.valleyProjects[id]={level:Math.max(0,Math.min(p.levels.length,Number.isInteger(x.level)?x.level:0)),given:x.given&&typeof x.given==='object'?{...x.given}:{}};}
}

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
 state.villageQuests=Array.isArray(state.villageQuests)?[...new Set(state.villageQuests.filter(id=>Number.isInteger(id)&&VILLAGE_QUESTS[id]))]:[];   // World II's claimed quests
 state.version=14;state.vipExpiresAt=Number.isSafeInteger(state.vipExpiresAt)?Math.max(0,state.vipExpiresAt):0;state.inventory??={};for(const k of Object.keys(ITEMS))state.inventory[k]??=0;
 state.diamonds=Number.isFinite(state.diamonds)?Math.max(0,Math.floor(state.diamonds)):0;
 state.boosts??={};for(const key of ['xpUntil','harvestUntil','coinsUntil','farmhandUntil','upgradeCredits'])state.boosts[key]=Number.isFinite(state.boosts[key])?Math.max(0,Math.floor(state.boosts[key])):0;
 state.boosts.upgradeCredits=Math.min(1,state.boosts.upgradeCredits);
 state.buildings??={};for(const key of Object.keys(BUILDINGS))state.buildings[key]??={level:1,job:null};
 state.stats??={};migrateProgression(state);migrateFeatureLevels(state);migrateUnlockSpread(state);migrateGradualUnlocks(state);
 for(const key of Object.keys(BUILDINGS))if(buildingCost(state,key))state.buildings[key].built??=false;
 // Keep paid-for legacy flour batches intact when milling moves to the Windmill.
 if(oldVersion<6&&state.buildings.mill.job?.recipe==='flour'){
  state.buildings.mill.job.output??={flour:1};state.buildings.mill.job.xp??=8;
 }
 for(const [key,b] of Object.entries(state.buildings)){
  b.extraJobs??=[];b.batchSequence??=0;
  for(const job of productionJobs(b))if(!job.id)job.id=`${key}-${++b.batchSequence}`;
  // Level 10 is the top since 26 Sep 2026; past it only the levels bought with master tools (World II, b.beyond) count.
  if(BUILDINGS[key]?.type==='production'){const top=beyondMaxBuilding(key)?MAX_BUILDING_LEVEL+Math.min(TOP_BUILDING_LEVEL-MAX_BUILDING_LEVEL,Math.max(0,Math.floor(b.beyond??0))):MAX_BUILDING_LEVEL;if(b.level>top)b.level=top;}
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
 state.discovered??=[];state.siloLevel??=0;delete state.tractorReadyAt;
 state.login??={lastDay:null,streak:0,best:0,visits:0};if(state.login.savedDay!==undefined&&!(typeof state.login.savedDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(state.login.savedDay)))delete state.login.savedDay;state.levelRewards??=[1];
 // The comeback chest (Oct 2026): when the last one was offered, how many were opened, and the one waiting (only farm-api sets it, on a
 // load). Farms from before it start at 0, so they can get one on their next return.
 {const c=state.comeback,p=c?.pending,count=v=>Number.isSafeInteger(v)?Math.max(0,v):0;
  state.comeback={lastAt:count(c?.lastAt),collected:count(c?.collected),pending:p&&Number.isInteger(p.days)&&p.days>=COMEBACK_MIN_DAYS&&p.days<=COMEBACK_MAX_DAYS&&Number.isSafeInteger(p.at)?{days:p.days,at:p.at}:null};}
 // Existing farms keep every regular quest, inventory item and timer. A past daily gift
 // counts so returning players never have to wait a day to finish the introduction.
 state.onboarding??={completed:0,milestones:{gift:state.login.visits>0},rewardClaimed:false};
 state.onboarding.milestones??={};
 state.mastery??={harvests:Object.fromEntries(Object.keys(CROPS).map(k=>[k,state.stats['harvest_'+k]??0])),claimed:[]};
 for(const key of Object.keys(CROPS)){state.mastery.harvests[key]??=0;state.stats['harvest_'+key]??=0;}
 // The medals the old numbers gave (MASTERY_TARGETS_BEFORE_ONE_CROP), once, on the first load with one crop a harvest: kept for good.
 if(!state.mastery.kept||typeof state.mastery.kept!=='object'||Array.isArray(state.mastery.kept))state.mastery.kept=Object.fromEntries(Object.keys(CROPS).map(k=>[k,MASTERY_TARGETS_BEFORE_ONE_CROP.filter(t=>(state.mastery.harvests[k]??0)>=t).length]).filter(([,n])=>n>0));
 else for(const [k,n] of Object.entries(state.mastery.kept))if(!Object.hasOwn(CROPS,k)||!Number.isInteger(n)||n<1||n>MASTERY_TIERS.length)delete state.mastery.kept[k];
 state.stall??={level:1,since:now,bank:0};state.estate??={completed:0,job:null};state.estate.diamondChapters??=[];state.chores??={};state.chorePractice??={};
 state.activities??={jobs:{},cooldowns:{},completed:{},round:[],rounds:0};
 state.ranch??={focus:null,changes:0};state.valley??={serial:0,sold:0,stalls:[]};
 if(!Array.isArray(state.improvements))state.improvements=[];state.depot??={serial:0,shipped:0,contract:null,readyAt:0};state.fair??={week:null,classes:[],entered:[]};
 for(const p of state.plots){p.tended??=false;p.fertilized??=false;p.careAt??=p.plantedAt+Math.max(0,(p.readyAt-p.plantedAt)*(oneCropPlot(p)?CARE_AT:.3));}
 const day=utcDay(now);
 const existingDay=state.daily?.date===day;
 if(!existingDay)state.daily={date:day,baseline:{...state.stats},claimed:[],orders:[],bonusClaimed:false};
 const d=dayNumber(now);
 state.daily.replacements??=0;state.daily.orderRevisions??={};
 state.daily.tasks??=oldVersion<10&&existingDay?LEGACY_DAILY_POOLS.map((pool,id)=>({...pool[(d+id)%pool.length]})):featureUnlocked(state,'challenges')?selectDailyTasks(state,d):[];
 // A challenge drawn today keeps up with its definition (9 Oct 2026: two of them went from 3 jobs to 2): its target, reward and text
 // come from the pool again, found by its counter and title (a unique pair), so the text is the one the languages translate.
 for(const q of state.daily.tasks){const cur=q&&DAILY_POOLS.flat().find(p=>p.stat===q.stat&&p.title===q.title);if(cur)Object.assign(q,{target:cur.target,reward:cur.reward,description:cur.description});}
 state.daily.orderBoard??=oldVersion<10&&existingDay?[0,2,4].map(offset=>orderQuote(LEGACY_ORDER_POOL[(d+offset)%LEGACY_ORDER_POOL.length])):selectDailyOrders(state,d);
 normalizeEndgame(state);normalizeVillage(state);
 normalizeShift(state);settleShift(state,now);payShipBin(state,now);normalizeWarehouse(state);normalizePond(state);normalizeLake(state);normalizePets(state);normalizeFarmer(state);normalizeLayout(state);countCollections(state);
 refreshValley(state,now);refreshDepot(state,now);refreshFair(state,now);refreshVisitors(state,now);refreshGiant(state,now);refreshVillage(state,now);refreshPass(state,now);refreshSeason(state,now);
 currentEndgameDiamonds(state);
 return state;
}
// This week's fair classes, an open trailer and a waiting visitor keep their diamonds in the farm. Since 7 Oct 2026 (fewer diamonds)
// they always hold today's amounts, so one set out before the change pays, and shows, the new amount.
function currentEndgameDiamonds(state){
 if(Array.isArray(state.fair.classes))for(const c of state.fair.classes){const now=FAIR_CLASSES.find(x=>x.name===c?.name);if(now)c.diamonds=now.diamonds;}
 if(state.depot.contract)state.depot.contract.diamonds=DEPOT_DIAMONDS;
 if(state.visitors.current)state.visitors.current.diamonds=VISITOR_DIAMONDS;
 if(state.village.boat.cargo)state.village.boat.cargo.diamonds=BOAT_DIAMONDS;   // the town boat's, too (Oct 2026)
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
 const day=dayNumber(now);
 // The challenges come the moment they open, on every farm (19 Oct 2026: an older farm waits for level 3 too, and drew them only at midnight).
 if(!state.daily.tasks.length&&featureUnlocked(state,'challenges'))state.daily.tasks=selectDailyTasks(state,day);
 if(!guidedFarm(state))return;
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
 let bonus=0;if(state.daily.claimed.length===3&&!state.daily.bonusClaimed){bonus=DAILY_BONUS.coins*dailyRewardMultiplier(state,now);state.daily.bonusClaimed=true;state.coins+=bonus;state.xp+=DAILY_BONUS.xp*dailyRewardMultiplier(state,now);}
 return {coins:q.reward+bonus,diamonds:q.diamonds,xp:q.xp+(bonus?DAILY_BONUS.xp*dailyRewardMultiplier(state,now):0),bonus};
}
// Where the streak stands today: collected already, going on from yesterday, going on over one missed day with the save (once
// in STREAK_SAVE_DAYS days), or starting again at day 1.
export function streakToday(state,now=Date.now()){
 const day=utcDay(now),last=state.login?.lastDay,streak=state.login?.streak??0;
 if(last===day)return {streak,claimed:true,saved:false};
 if(last===utcDay(now-DAY_MS))return {streak:streak+1,claimed:false,saved:false};
 if(last===utcDay(now-2*DAY_MS)&&streak>0&&saveReady(state,now))return {streak:streak+1,claimed:false,saved:true};
 return {streak:1,claimed:false,saved:false};
}
export function saveReady(state,now=Date.now()){const saved=state.login?.savedDay;return !saved||Date.parse(utcDay(now))-Date.parse(saved)>=STREAK_SAVE_DAYS*DAY_MS;}
// The gift for a day of the streak (1, 2 ...): day 7 and on pay day 7's coins and diamonds; the boost follows the day of the week.
// The coins of a streak day at a farm level (before VIP): the day's coins × half the level, never less, in fives.
export function giftCoins(streak,level){return Math.round(DAILY_REWARDS[Math.min(Math.max(1,streak),DAILY_REWARDS.length)-1]*Math.max(1,level/2)/5)*5;}
export function dailyGift(state,streak,now=Date.now()){
 const index=Math.min(Math.max(1,streak),DAILY_REWARDS.length)-1,multiplier=dailyRewardMultiplier(state,now);
 return {coins:giftCoins(streak,levelOf(state))*multiplier,diamonds:DAILY_DIAMONDS[index]*multiplier,xp:10*multiplier,
  boost:DAILY_BOOSTS[(Math.max(1,streak)-1)%7+1]??null,boostMs:DAILY_BOOST_MS*multiplier};   // VIP doubles the gift: an hour
}
export function checkIn(state,now=Date.now()){
 normalizeFarm(state,now);const day=utcDay(now),today=streakToday(state,now);
 if(today.claimed)throw new Error('Your daily gift is already collected.');
 const {coins,diamonds,xp,boost,boostMs}=dailyGift(state,today.streak,now);   // the level before this gift's XP
 state.login.streak=today.streak;if(today.saved)state.login.savedDay=day;
 state.login.lastDay=day;state.login.best=Math.max(state.login.best,state.login.streak);state.login.visits++;
 state.coins+=coins;state.diamonds+=diamonds;state.xp+=xp;
 if(boost)state.boosts[BOOST_UNTIL[boost]]=Math.max(state.boosts[BOOST_UNTIL[boost]]??0,now)+boostMs;
 state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+diamonds;
 // Coming back on a second day: the gift brings 30 minutes of double harvest as well, once (guided farms).
 const returnBoost=guidedFarm(state)&&state.login.visits===2;
 if(returnBoost)state.boosts.harvestUntil=Math.max(state.boosts.harvestUntil??0,now)+RETURN_BOOST_MS;
 return {coins,diamonds,streak:state.login.streak,xp,...(boost?{boost,boostMinutes:boostMs/60000}:{}),...(today.saved?{saved:true}:{}),...(returnBoost?{returnBoost:RETURN_BOOST_MS/60000}:{})};
}
// The comeback chest's coins for the days away (3 to 7) at a farm level, before VIP: like giftCoins, × half the level, in fives.
export function comebackCoins(days,level){return Math.round(COMEBACK_COINS*Math.min(Math.max(days,COMEBACK_MIN_DAYS),COMEBACK_MAX_DAYS)*Math.max(1,level/2)/5)*5;}
// The chest waiting on this farm, or null: worked out at the level and VIP of the moment it is opened, like the daily gift.
export function comebackChest(state,now=Date.now()){
 const p=state.comeback?.pending;if(!p)return null;const m=dailyRewardMultiplier(state,now);
 return {days:p.days,coins:comebackCoins(p.days,levelOf(state))*m,boost:COMEBACK_BOOST,boostMs:DAILY_BOOST_MS*m};
}
// Only farm-api calls this, on a load: `away` is the time since player_farms.updated_at, which only the database sets, so the days
// away never come from the game (3 days away is always a Welcome back too, so that load is saved with the chest). It never stacks
// (one waiting is enough), never expires, and comes at most every 14 days from the last one offered.
export function offerComeback(state,away,now=Date.now()){
 const c=state.comeback;
 if(!c||!Number.isFinite(away)||away<COMEBACK_MIN_DAYS*DAY_MS||c.pending||now-c.lastAt<COMEBACK_EVERY_DAYS*DAY_MS)return null;
 c.pending={days:Math.min(COMEBACK_MAX_DAYS,Math.floor(away/DAY_MS)),at:now};c.lastAt=now;return c.pending;
}
export function collectComeback(state,now=Date.now()){
 const chest=comebackChest(state,now);if(!chest)throw new Error('No comeback chest is waiting.');
 state.coins+=chest.coins;const key=BOOST_UNTIL[chest.boost];state.boosts[key]=Math.max(state.boosts[key]??0,now)+chest.boostMs;
 state.comeback.pending=null;state.comeback.collected++;
 return {coins:chest.coins,days:chest.days,boost:chest.boost,boostMinutes:chest.boostMs/60000};
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
// The Halloween Pass (Oct 2026): 30 tiers, each with a free and a paid reward, from level 10 for both. Lanterns come only from what every
// farm can do a few times a day whatever its level (the daily gift 2, a daily challenge 1, a delivery 1: at most 7-8 a day), so a level-12
// farm keeps up with a level-80 one; counted from the moment the season opens for the farm (or it reaches level 10 during it). Every 2
// lanterns open the next tier and every reward has its own Claim (never all at once, also after a late purchase). The lanterns stand
// still at the end, collecting goes on for a week, then it all hides. One purchase opens the paid row (game/payments.js PASS, the same
// dates: a test keeps them equal); the database writes it into state.passPremium, a list the game never resets. No XP inside, so the
// level pace stays as it is; its coins never count as earned (a farm event's "Earn coins" goal reads stats.earned); the free row holds
// no diamonds, and the paid row's diamonds are the 500 of the €4.99 pack. No decorations or avatars in this first season.
const tierPair=(free,paid)=>Object.freeze({free:Object.freeze(free),paid:Object.freeze(paid)});
export const SEASON_PASS=Object.freeze({id:'halloween-2026',name:'Halloween Pass',level:10,cents:499,
 startsAt:Date.UTC(2026,9,23),endsAt:Date.UTC(2026,10,3),claimUntil:Date.UTC(2026,10,10),perTier:2,
 points:Object.freeze({gift:2,daily:1,delivery:1}),
 // cents: the price the screens show; what Stripe charges is game/payments.js PASS (the same, a test checks).
 // coins: that many × the farm level when collected (in fives); boost: a timed boost of that length; items: into storage; vipDays: VIP time.
 tiers:Object.freeze([
  tierPair({coins:10},{diamonds:50}),
  tierPair({items:{pumpkin:3}},{coins:20}),
  tierPair({boost:'harvest',length:'30m'},{boost:'xp',length:'1h'}),
  tierPair({coins:10},{items:{pie:1}}),
  tierPair({items:{pie:1}},{diamonds:50}),
  tierPair({coins:20},{boost:'harvest',length:'1h'}),
  tierPair({boost:'xp',length:'30m'},{coins:30}),
  tierPair({coins:20},{boost:'coins',length:'1h'}),
  tierPair({items:{pumpkin:3}},{coins:30}),
  tierPair({coins:20},{diamonds:100}),
  tierPair({coins:20},{boost:'xp',length:'1h'}),
  tierPair({boost:'coins',length:'30m'},{coins:40}),
  tierPair({coins:30},{coins:40}),
  tierPair({items:{pie:1}},{boost:'harvest',length:'1h'}),
  tierPair({coins:30},{diamonds:100}),
  tierPair({boost:'harvest',length:'30m'},{boost:'coins',length:'1h'}),
  tierPair({coins:30},{coins:50}),
  tierPair({items:{pumpkin:5}},{items:{pie:2}}),
  tierPair({coins:40},{coins:50}),
  tierPair({boost:'xp',length:'30m'},{vipDays:7}),
  tierPair({coins:40},{coins:60}),
  tierPair({items:{pie:2}},{boost:'coins',length:'1h'}),
  tierPair({coins:40},{items:{pie:2}}),
  tierPair({boost:'coins',length:'30m'},{coins:60}),
  tierPair({coins:50},{diamonds:200}),
  tierPair({items:{pumpkin:5}},{coins:80}),
  tierPair({coins:50},{boost:'xp',length:'1h'}),
  tierPair({boost:'harvest',length:'30m'},{items:{pie:3}}),
  tierPair({coins:60},{coins:100}),
  tierPair({coins:100},{boost:'harvest',length:'1d'})
 ])});
export const PASS_TRACKS=Object.freeze(['free','paid']);
// Where the season stands: 'soon' (a preview from level 10; since Oct 2026 the paid row is already for sale, bought it opens with the
// season, nothing to collect before), 'open' (lanterns count, the paid row still for sale), 'claim' (a week to collect what was reached)
// and 'over' (hidden).
export function passPhase(now=Date.now()){return now<SEASON_PASS.startsAt?'soon':now<SEASON_PASS.endsAt?'open':now<SEASON_PASS.claimUntil?'claim':'over';}
const passCounts=state=>({visits:Number(state.login?.visits)||0,dailies:Number(state.stats?.dailies)||0,deliveries:Number(state.stats?.deliveries)||0});
export function passLanterns(state){
 const pass=state.pass;if(!pass||pass.id!==SEASON_PASS.id)return 0;if(Number.isSafeInteger(pass.final))return pass.final;
 const now=passCounts(state),base=pass.base??{},p=SEASON_PASS.points,since=key=>Math.max(0,now[key]-(base[key]??now[key]));
 return p.gift*since('visits')+p.daily*since('dailies')+p.delivery*since('deliveries');
}
export const passTier=state=>Math.min(SEASON_PASS.tiers.length,Math.floor(passLanterns(state)/SEASON_PASS.perTier));
export const passPremium=state=>Array.isArray(state.passPremium)&&state.passPremium.includes(SEASON_PASS.id);
// Whether the farm sees the pass: the preview and the open season from level 10, the collecting week only with a tier of its own (a farm
// that reached none has nothing to collect, so no button for a week).
export function passVisible(state,now=Date.now()){const phase=passPhase(now);return levelOf(state)>=SEASON_PASS.level&&(phase==='soon'||phase==='open'||phase==='claim'&&passTier(state)>0);}
// Rewards reached and not collected yet (the paid row only once bought): the "!" on the pass button, worked out from the farm (no storage).
export function passWaiting(state,now=Date.now()){
 const phase=passPhase(now),pass=state.pass;if(phase!=='open'&&phase!=='claim'||pass?.id!==SEASON_PASS.id)return 0;
 const tier=passTier(state);
 return (passPremium(state)?PASS_TRACKS:['free']).reduce((n,track)=>n+tier-(pass[track]??[]).filter(t=>t<=tier).length,0);
}
// What the paid row holds in all (its diamonds, VIP days and boosts) and how long the free row's boosts run: the buy box and the wiki.
export function passTotals(){
 const paid=SEASON_PASS.tiers.map(t=>t.paid),free=SEASON_PASS.tiers.map(t=>t.free);
 return {diamonds:paid.reduce((n,r)=>n+(r.diamonds??0),0),vipDays:paid.reduce((n,r)=>n+(r.vipDays??0),0),boosts:paid.filter(r=>r.boost).length,
  freeBoostMinutes:[...new Set(free.filter(r=>r.boost).map(r=>BOOST_DURATIONS[r.length]/60000))]};
}
// One tier's reward for a farm at this level: coins in fives.
export function passReward(reward,level){
 const r={...reward};if(r.coins)r.coins=Math.round(reward.coins*Math.max(1,level)/5)*5;if(r.items)r.items={...reward.items};return r;
}
function refreshPass(state,now){
 if(state.passPremium!==undefined)state.passPremium=Array.isArray(state.passPremium)?[...new Set(state.passPremium.filter(id=>typeof id==='string'))]:[];
 if(state.pass!==undefined&&!(state.pass&&typeof state.pass==='object'&&state.pass.id===SEASON_PASS.id))delete state.pass;   // another season's pass
 if(!state.pass&&passPhase(now)==='open'&&levelOf(state)>=SEASON_PASS.level)state.pass={id:SEASON_PASS.id,base:passCounts(state),free:[],paid:[]};
 const pass=state.pass;if(!pass)return;
 const counts=passCounts(state),base=pass.base&&typeof pass.base==='object'?pass.base:{};
 pass.base=Object.fromEntries(Object.entries(counts).map(([key,n])=>[key,Number.isSafeInteger(base[key])?base[key]:n]));
 const tiers=list=>Array.isArray(list)?[...new Set(list.filter(t=>Number.isInteger(t)&&t>=1&&t<=SEASON_PASS.tiers.length))]:[];
 pass.free=tiers(pass.free);pass.paid=tiers(pass.paid);
 if(pass.final!==undefined&&!Number.isSafeInteger(pass.final))delete pass.final;
 // From the end on the lanterns stand still: every action normalizes the farm first, so this keeps the count from before it.
 if(now>=SEASON_PASS.endsAt&&pass.final===undefined)pass.final=passLanterns(state);
}
export function claimPassTier(state,track,tier,now=Date.now()){
 normalizeFarm(state,now);const phase=passPhase(now),pass=state.pass,name=SEASON_PASS.name;
 if(phase==='soon')throw new Error(`The ${name} is not open yet.`);
 if(phase==='over')throw new Error(`The ${name} has ended.`);
 if(levelOf(state)<SEASON_PASS.level)throw new Error(`The ${name} opens at level ${SEASON_PASS.level}.`);
 if(!PASS_TRACKS.includes(track))throw new Error('Choose a free or a paid reward.');
 if(!Number.isInteger(tier)||tier<1||tier>SEASON_PASS.tiers.length)throw new Error('Choose a tier.');
 if(!pass)throw new Error(`You have no lanterns in the ${name}.`);
 if(track==='paid'&&!passPremium(state))throw new Error('Unlock the paid rewards first.');
 if(pass[track].includes(tier))throw new Error('You already collected this reward.');
 const need=tier*SEASON_PASS.perTier-passLanterns(state);
 if(need>0)throw new Error(`Collect ${need} more lantern${need===1?'':'s'} to reach this tier.`);
 const reward=passReward(SEASON_PASS.tiers[tier-1][track],levelOf(state));
 if(reward.coins)state.coins+=reward.coins;   // never stats.earned (see above)
 if(reward.diamonds)state.diamonds+=reward.diamonds;
 for(const [key,n] of Object.entries(reward.items??{}))state.inventory[key]=(state.inventory[key]??0)+n;
 if(reward.boost){const key=BOOST_UNTIL[reward.boost];state.boosts[key]=Math.max(state.boosts[key]??0,now)+BOOST_DURATIONS[reward.length];}
 // VIP after any VIP still running, and counted like VIP bought (stats.vip_days: the Velvet farmer avatar).
 if(reward.vipDays){state.vipExpiresAt=Math.max(now,state.vipExpiresAt??0)+reward.vipDays*DAY_MS;state.stats.vip_days=(state.stats.vip_days??0)+reward.vipDays;}
 pass[track].push(tier);
 return {track,tier,...reward};
}
// ——— The Season Pass (Autumn 2026 on; plan-farmpas/plan.md, approved 20 Oct 2026) ———————————————————————————————————————————
// One engine for every real season (Autumn, Winter, Spring, Summer), each with its own theme, point name and 100 tiers of a free and a
// paid reward, every reward with its own Claim (never all at once). It runs NEXT TO the Halloween Pass above and every later event pass:
// its progress lives in its own key, state.season (refreshPass never touches it), and a season bought is one more id in the same
// state.passPremium list ('autumn-2026'), written by the database when the store says paid (game/payments.js SEASON_SALE).
// - Points come from what a farm already does (SEASON_POINTS), counted as the change in counters the farm keeps, from the moment the
//   season opens for the farm (or it reaches level 10 during it): up to 250 a day (SEASON_DAY_CAP, the day turning with the daily
//   challenges at 00:00 UTC), plus a weekly goal of +200 on top of the cap, and double weeks where everything counts twice, the cap too.
// - A tier costs a fixed number of points per season: 1.4 × the season's days, rounded to 5 (seasonPerTier), fixed from the start.
// - Tier skip: 100 diamonds a tier, any number of times, one tier per tap. It never pays: no tier holds more than 50 diamonds in its free
//   and paid rewards together, and VIP (which doubles the daily gift's diamonds) only sits on a tier without diamonds (a test checks both).
//   Skipped tiers do not count towards the day's cap or the weekly goal; points already earned towards the next tier stay.
// - After tier 100 every 500 points give a bonus chest of 500 × level coins, for everyone; no diamonds, no skipping.
// - At the end the points stand still; what was reached can be collected for 7 more days.
// - Looks (SEASON_LOOKS): avatars, a frame, badges, titles, chat name colours, a profile background, a float and a rod, a family
//   emblem and tractor paint. What a farmer collects stays theirs (state.looks, a list that only grows); farm-api writes what they wear
//   (player_stats.look, after a check against this list). The float, the rod and the tractor only the farmer sees: state.lookFarm.
// - The season crop (Autumn: cranberries, SEASON_CROPS): planted only from seed packets of the pass, only while the season is open.
// - A refund (the store takes the money back): the database takes the season's id out of passPremium; the next normalize then takes
//   back the paid diamonds collected (as far as the farm still has them) and the paid looks, and the paid row closes (seasonRefund).
export const SEASON_TIERS=100,SEASON_LEVEL=10,SEASON_BUY_LEVEL=20,SEASON_SKIP_COST=100,SEASON_DAY_CAP=250,SEASON_WEEK_BONUS=200,
 SEASON_CHEST_POINTS=500,SEASON_CHEST_COINS=500,SEASON_CLAIM_DAYS=7,SEASON_PREVIEW_DAYS=3,SEASON_MAX_TIER_DIAMONDS=50;
// Points per action. gift: the daily gift; daily: a daily challenge; delivery: a delivery order; event: an hourly or farm event's reward
// collected (stats.events_claimed, supabase/season-pass-engine.sql); quest: a quest claimed (stats.quests_claimed); fish: a fish landed at
// the pond or the lake; hand: a helping-hand job; chore: a chore.
// The iPhone app sells the Season Pass only once this is true: the same switch as game/payments.js APPLE_SELLS_SEASON_PASS, for the page
// (public/season-ui.js shows the free row only there); a test keeps the two equal.
export const APPLE_SELLS_SEASON_PASS=true;   // on since the iPhone app 1.5 (22 Oct 2026)
export const SEASON_POINTS=Object.freeze({gift:30,daily:15,delivery:15,event:15,quest:5,fish:3,hand:3,chore:3});
const whole=v=>Number.isSafeInteger(v)&&v>0?v:0;
export function seasonCounts(state){
 const s=state.stats??{};
 return {gift:whole(state.login?.visits),daily:whole(s.dailies),delivery:whole(s.deliveries),event:whole(s.events_claimed),quest:whole(s.quests_claimed),
  fish:whole(s.fish)+whole(s.lake_fish),hand:whole(s.activities),chore:whole(s.chores)};
}
// What a weekly goal counts. festival: crops harvested, a field of the season crop counting twice (the Harvest festival).
export const SEASON_GOAL_COUNTS=Object.freeze({
 gift:state=>whole(state.login?.visits),dailies:state=>whole(state.stats?.dailies),harvest:state=>whole(state.stats?.harvested),
 festival:state=>whole(state.stats?.harvested)+whole(state.stats?.season_crop_harvests),
 // Winter's Sprout week: the same count (a field of the season crop counting twice), in its own words.
 sprouts:state=>whole(state.stats?.harvested)+whole(state.stats?.season_crop_harvests),goods:state=>whole(state.stats?.produced),
 fish:state=>whole(state.stats?.fish)+whole(state.stats?.lake_fish),hand:state=>whole(state.stats?.activities)});
// Every look of every season: what it is (kind), its name, and its picture or colour. kind 'avatar' ids follow the avatar check of
// player_stats ('season-…'); the avatars themselves are in public/player-avatars.js. emblem: the family emblem's id (FAMILY_EMBLEMS).
// Colours are the game's own (buttons.css), dark enough for the cream chat; the float, rod and paint are colours of the 3D farm.
export const SEASON_LOOK_KINDS=Object.freeze(['avatar','frame','badge','title','color','bg','bobber','rod','emblem','tractor']);
// Worn on the farmer's public card (player_stats.look), and only seen on their own farm (state.lookFarm).
export const LOOK_SLOTS=Object.freeze(['frame','badge','title','color','bg']),LOOK_FARM_SLOTS=Object.freeze(['bobber','rod','tractor']);
export const SEASON_LOOKS=Object.freeze({
 'season-autumn-2026-harvest-chef':{kind:'avatar',name:'Harvest chef',art:'avatar-harvest-chef',season:'autumn-2026'},
 'season-autumn-2026-autumn-harvester':{kind:'avatar',name:'Autumn harvester',art:'avatar-autumn-harvester',season:'autumn-2026'},
 'season-autumn-2026-pumpkin-royal':{kind:'avatar',name:'Pumpkin royal',art:'avatar-pumpkin-royal',season:'autumn-2026'},
 'autumn-2026-frame':{kind:'frame',name:'Autumn wreath',art:'frame-autumn',season:'autumn-2026'},
 'autumn-2026-badge':{kind:'badge',name:'Autumn 2026',art:'season-badge-autumn-2026',season:'autumn-2026'},
 'autumn-2026-golden-pumpkin':{kind:'badge',name:'Golden pumpkin',art:'golden-pumpkin',season:'autumn-2026'},
 'autumn-2026-title-leaf-collector':{kind:'title',name:'Leaf Collector',season:'autumn-2026'},
 'autumn-2026-title-pumpkin-whisperer':{kind:'title',name:'Pumpkin Whisperer',season:'autumn-2026'},
 'autumn-2026-title-autumn-legend':{kind:'title',name:'Autumn Legend',season:'autumn-2026'},
 'autumn-2026-title-harvest-hero':{kind:'title',name:'Harvest Hero',season:'autumn-2026'},
 'autumn-2026-color-pumpkin':{kind:'color',name:'Pumpkin',color:'#9c6214',season:'autumn-2026'},
 'autumn-2026-color-apple-red':{kind:'color',name:'Apple red',color:'#96402f',season:'autumn-2026'},
 'autumn-2026-color-moss-green':{kind:'color',name:'Moss green',color:'#316c3a',season:'autumn-2026'},
 'autumn-2026-bg-orchard':{kind:'bg',name:'Autumn orchard',art:'profile-bg-autumn',season:'autumn-2026'},
 'autumn-2026-float':{kind:'bobber',name:'Autumn float',colors:{top:0xe58a2c,bottom:0xfffdf5,antenna:0x316c3a},season:'autumn-2026'},
 'autumn-2026-golden-rod':{kind:'rod',name:'Golden rod',colors:{pole:0xe3a53c,grip:0xa8741f,reel:0xf2cf74,top:0xe3a53c,bottom:0xf7dc8f},season:'autumn-2026'},
 'autumn-2026-emblem':{kind:'emblem',name:'Harvest shield',art:'emblem-autumn',emblem:'100',season:'autumn-2026'},
 'autumn-2026-tractor':{kind:'tractor',name:'Pumpkin paint',tint:0xe8822a,art:'tractor-paint-autumn',season:'autumn-2026'},
 // Winter 2026 (21 Oct 2026, the owner: "maak winterpass"): snow, cocoa and frost; nothing of Christmas (kept for a Christmas Pass).
 // The colours: the diamond button's ice blue, the main button's pine green and the second button's cocoa brown (buttons.css).
 'season-winter-2026-cocoa-maker':{kind:'avatar',name:'Cocoa maker',art:'avatar-cocoa-maker',season:'winter-2026'},
 'season-winter-2026-snow-farmhand':{kind:'avatar',name:'Snow farmhand',art:'avatar-snow-farmhand',season:'winter-2026'},
 'season-winter-2026-frost-royal':{kind:'avatar',name:'Frost royal',art:'avatar-frost-royal',season:'winter-2026'},
 'winter-2026-frame':{kind:'frame',name:'Winter wreath',art:'frame-winter',season:'winter-2026'},
 'winter-2026-badge':{kind:'badge',name:'Winter 2026',art:'season-badge-winter-2026',season:'winter-2026'},
 'winter-2026-golden-sledge':{kind:'badge',name:'Golden sledge',art:'golden-sledge',season:'winter-2026'},
 'winter-2026-title-snowflake-collector':{kind:'title',name:'Snowflake Collector',season:'winter-2026'},
 'winter-2026-title-sledge-champion':{kind:'title',name:'Sledge Champion',season:'winter-2026'},
 'winter-2026-title-winter-legend':{kind:'title',name:'Winter Legend',season:'winter-2026'},
 'winter-2026-title-frost-hero':{kind:'title',name:'Frost Hero',season:'winter-2026'},
 'winter-2026-color-ice-blue':{kind:'color',name:'Ice blue',color:'#1f5877',season:'winter-2026'},
 'winter-2026-color-pine-green':{kind:'color',name:'Pine green',color:'#2b5e32',season:'winter-2026'},
 'winter-2026-color-cocoa':{kind:'color',name:'Cocoa',color:'#5b4520',season:'winter-2026'},
 'winter-2026-bg-valley':{kind:'bg',name:'Snowy valley',art:'profile-bg-winter',season:'winter-2026'},
 'winter-2026-float':{kind:'bobber',name:'Winter float',colors:{top:0x7cc4e8,bottom:0xfffdf5,antenna:0x2b5e32},season:'winter-2026'},
 'winter-2026-frost-rod':{kind:'rod',name:'Frost rod',colors:{pole:0xcfe3ee,grip:0x1f5877,reel:0xe3f3fd,top:0x9fc4da,bottom:0xfffdf5},season:'winter-2026'},
 'winter-2026-emblem':{kind:'emblem',name:'Snowman shield',art:'emblem-winter',emblem:'101',season:'winter-2026'},
 'winter-2026-tractor':{kind:'tractor',name:'Frost paint',tint:0xcfe3ee,art:'tractor-paint-winter',season:'winter-2026'}
});
export const seasonLook=id=>typeof id==='string'&&Object.hasOwn(SEASON_LOOKS,id)?SEASON_LOOKS[id]:null;
// The family emblems a season gives (an emblem's id is its place in FAMILY_EMBLEMS): never in the picker unless a member of the family
// has it, or the family wears it already (familyEmblemChoices, family_emblem).
export const SEASON_EMBLEMS=Object.freeze(Object.fromEntries(Object.entries(SEASON_LOOKS).filter(([,l])=>l.emblem).map(([id,l])=>[l.emblem,id])));
// A tier's two rewards. A reward is any mix of: coins (that many × the farm level, in fives), diamonds, items (into storage), boost and
// length (a timed boost), vipDays, farmhand (days of the farmhand), cart (coin carts: 1,000 × level coins each, as in Power-ups),
// discount (the Buildings discount voucher), crops (Instant harvest), production (Finish production), seeds ({crop: packets}) and looks.
// purchase: comes with the purchase itself (the paid tier 1 avatar): owned at once, nothing to collect.
// farmer: parts for your own 3D farmer (21 Oct 2026, item 8; game/farmer-parts.js FARMER_PASS_PARTS): kept in state.farmerParts, a
// list that only grows (a refund takes the paid ones back), owned through the pass in My farmer. No tier of Autumn 2026 has one;
// Winter 2026 has five.
const utc=(month,day,year=2026)=>Date.UTC(year,month-1,day);
// Autumn 2026 (plan §7): its start is the first 00:00 UTC after the owner's go (startsAt null: not scheduled, nothing shows). It ends
// with Monday 21 December (endsAt, 22 Dec 00:00 UTC) and its rewards can be collected until 28 December. The weeks keep their dates; a
// week before the start falls away, and the goal of the week the start falls in is halved when the start is a Friday or Saturday.
const AUTUMN_2026=Object.freeze({id:'autumn-2026',name:'Autumn',title:'Autumn 2026',point:'leaf',points:'leaves',
 art:'season-pass-autumn',pointArt:'season-point-autumn',banner:'season-pass-banner-autumn',crop:'cranberries',
 startsAt:utc(10,21),endsAt:utc(12,22),claimUntil:utc(12,29),
 weeks:Object.freeze([
  {from:utc(11,1),name:'Falling leaves',art:'season-point-autumn',goal:{kind:'gift',target:5}},
  {from:utc(11,8),name:'Apple picking',art:'apples',goal:{kind:'dailies',target:10}},
  {from:utc(11,15),name:'Pumpkin week',art:'giant-small',goal:{kind:'harvest',target:300}},
  {from:utc(11,22),name:'Harvest festival',art:'cranberries',double:true,goal:{kind:'festival',target:200}},
  {from:utc(11,29),name:'Cider and compote',art:'cider',goal:{kind:'goods',target:30}},
  {from:utc(12,6),name:'First frost',art:'fish-trout',goal:{kind:'fish',target:25}},
  {from:utc(12,13),name:'Last harvest',art:'helping-hand',goal:{kind:'hand',target:40}},
  {from:utc(12,20),name:'Final days',art:'season-point-autumn',double:true,goal:null}
 ].map(w=>Object.freeze(w))),
 tiers:Object.freeze([
  tierPair({looks:['autumn-2026-title-leaf-collector'],coins:60},{looks:['season-autumn-2026-harvest-chef'],purchase:true}),
  tierPair({items:{pumpkin:5}},{boost:'harvest',length:'1h'}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({boost:'harvest',length:'30m'},{items:{apples:16}}),
  tierPair({diamonds:20},{looks:['autumn-2026-color-pumpkin'],farmhand:1}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({seeds:{cranberries:2}},{boost:'xp',length:'1h'}),
  tierPair({coins:60},{seeds:{cranberries:3}}),
  tierPair({boost:'xp',length:'30m'},{items:{applejuice:2}}),
  tierPair({coins:120},{diamonds:50}),
  tierPair({coins:60},{cart:1}),
  tierPair({looks:['autumn-2026-float']},{vipDays:7}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({boost:'coins',length:'30m'},{items:{applepie:2}}),
  tierPair({diamonds:20},{farmhand:1}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({items:{cider:1}},{boost:'harvest',length:'1h'}),
  tierPair({coins:60},{seeds:{cranberries:3}}),
  tierPair({coins:60},{items:{applecompote:4}}),
  tierPair({coins:120},{looks:['autumn-2026-title-pumpkin-whisperer'],diamonds:50}),
  tierPair({coins:60},{cart:1}),
  tierPair({items:{applecompote:2}},{boost:'xp',length:'1h'}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({boost:'harvest',length:'30m'},{items:{squashsoup:2}}),
  tierPair({looks:['season-autumn-2026-autumn-harvester'],diamonds:20},{looks:['autumn-2026-frame'],farmhand:1}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({items:{squashsoup:1}},{boost:'coins',length:'1h'}),
  tierPair({coins:60},{seeds:{cranberries:3}}),
  tierPair({coins:60},{items:{harvesthamper:2}}),
  tierPair({cart:1},{diamonds:50}),
  tierPair({coins:60},{cart:1}),
  tierPair({items:{harvesthamper:1}},{boost:'harvest',length:'1h'}),
  tierPair({seeds:{cranberries:2}},{diamonds:50}),
  tierPair({boost:'xp',length:'30m'},{items:{pie:2}}),
  tierPair({diamonds:20},{looks:['autumn-2026-emblem']}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({items:{pie:1}},{boost:'harvest',length:'1d'}),
  tierPair({coins:60},{seeds:{cranberries:3}}),
  tierPair({coins:60},{items:{pumpkin:10}}),
  tierPair({seeds:{cranberries:3},coins:200},{diamonds:50}),
  tierPair({coins:100},{cart:1}),
  tierPair({items:{applevinegar:1}},{vipDays:7}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({boost:'coins',length:'30m'},{discount:1}),
  tierPair({diamonds:20},{farmhand:1}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({items:{apples:8}},{boost:'harvest',length:'1h'}),
  tierPair({coins:100},{seeds:{cranberries:3}}),
  tierPair({coins:100},{items:{applejuice:2}}),
  tierPair({looks:['autumn-2026-badge'],farmhand:1},{looks:['autumn-2026-bg-orchard'],diamonds:50}),
  tierPair({coins:100},{cart:1}),
  tierPair({items:{pumpkin:5}},{boost:'xp',length:'1h'}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({boost:'harvest',length:'30m'},{items:{applepie:2}}),
  tierPair({diamonds:20},{crops:1}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({seeds:{cranberries:3}},{boost:'coins',length:'1h'}),
  tierPair({coins:100},{seeds:{cranberries:3}}),
  tierPair({boost:'xp',length:'30m'},{items:{applecompote:4}}),
  tierPair({coins:200},{looks:['autumn-2026-color-apple-red'],diamonds:50}),
  tierPair({coins:100},{cart:1}),
  tierPair({items:{applepie:1}},{boost:'harvest',length:'1h'}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({boost:'coins',length:'30m'},{items:{squashsoup:2}}),
  tierPair({diamonds:20},{looks:['autumn-2026-golden-rod'],farmhand:1}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({items:{cider:1}},{boost:'coins',length:'1d'}),
  tierPair({coins:100},{seeds:{cranberries:3}}),
  tierPair({coins:100},{items:{harvesthamper:2}}),
  tierPair({cart:1},{diamonds:50}),
  tierPair({coins:150},{cart:1}),
  tierPair({items:{applecompote:2}},{vipDays:7}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({boost:'harvest',length:'30m'},{items:{pie:2}}),
  tierPair({looks:['autumn-2026-color-moss-green'],diamonds:20},{looks:['autumn-2026-tractor'],discount:1}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({items:{squashsoup:1}},{boost:'harvest',length:'1h'}),
  tierPair({coins:150},{seeds:{cranberries:3}}),
  tierPair({coins:150},{items:{pumpkin:10}}),
  tierPair({coins:300},{diamonds:50}),
  tierPair({coins:150},{cart:1}),
  tierPair({items:{harvesthamper:1}},{boost:'xp',length:'1h'}),
  tierPair({seeds:{cranberries:3}},{diamonds:50}),
  tierPair({boost:'xp',length:'30m'},{items:{apples:16}}),
  tierPair({diamonds:20},{production:1}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({items:{pie:1}},{boost:'coins',length:'1h'}),
  tierPair({coins:150},{seeds:{cranberries:3}}),
  tierPair({coins:150},{items:{applejuice:2}}),
  tierPair({coins:300},{looks:['autumn-2026-title-autumn-legend'],diamonds:50}),
  tierPair({coins:150},{cart:1}),
  tierPair({items:{applevinegar:1}},{boost:'harvest',length:'1h'}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({boost:'coins',length:'30m'},{items:{applepie:2}}),
  tierPair({diamonds:20},{farmhand:1}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({items:{apples:8}},{boost:'xp',length:'1d'}),
  tierPair({coins:150},{seeds:{cranberries:3}}),
  tierPair({coins:150},{items:{applecompote:4}}),
  tierPair({looks:['autumn-2026-title-harvest-hero'],coins:300},{looks:['season-autumn-2026-pumpkin-royal','autumn-2026-golden-pumpkin'],diamonds:50})
 ])
});
// Winter 2026 (21 Oct 2026, the owner: "maak winterpass en zet hem alvast helemaal onder herfst pass dat die eraan komt, je kan hem al
// kopen, start na 22 dec"): the next season, from 22 December 00:00 UTC (the moment Autumn ends) to 20 March 2027 (endsAt 21 March
// 00:00 UTC, the astronomical spring), its rewards to collect until 27 March. Its points are snowflakes, its crop Brussels sprouts.
// - The pre-sale: on sale from saleFrom while Autumn runs, once per farmer, from level 20 (game/payments.js SEASON_SALE has the same
//   dates; a test keeps them equal). Bought, the season's id is in passPremium at once, and with it the Cocoa maker (the paid tier 1
//   avatar, seasonLooksOwned); nothing else counts or opens before 22 December. The window shows it below Autumn (seasonComing).
// - The same shape as Autumn (its tiers mirror Autumn's; a test checks the totals): 1,500 paid and 200 free diamonds, the same VIP,
//   farmhand, boosts, carts and seed packets, winter goods, and five parts for your own farmer (farmer, game/farmer-parts.js
//   FARMER_PASS_PARTS): free the black beanie (tier 10) and the blue cuffed gloves (62); paid the ski goggles (29), the long beige coat
//   (49) and the penguin suit (79). Nothing of Christmas: that is kept for a Christmas Pass.
// - 89 days: a tier is 125 snowflakes (1.4 × 89, rounded to 5). Double days (everything and the cap twice): New Year, 31 December and
//   1 January (doubles), and the last two days, 19 and 20 March (a week of its own, as Autumn's).
const WINTER_2026=Object.freeze({id:'winter-2026',name:'Winter',title:'Winter 2026',passName:'Winter Season Pass',starts:'Starts 22 December',
 teaser:'Three avatars, a golden sledge, a winter wreath, a penguin suit for your farmer and Brussels sprouts to grow.',point:'snowflake',points:'snowflakes',
 art:'season-pass-winter',pointArt:'season-point-winter',banner:'season-pass-banner-winter',crop:'sprouts',
 saleFrom:utc(10,21),startsAt:utc(12,22),endsAt:utc(3,21,2027),claimUntil:utc(3,28,2027),
 doubles:Object.freeze([Object.freeze({from:utc(12,31),to:utc(1,2,2027),name:'New Year'})]),
 weeks:Object.freeze([
  {from:utc(12,22),name:'First snow',art:'season-point-winter',goal:{kind:'gift',target:5}},
  {from:utc(12,29),name:'New Year week',art:'candles',goal:{kind:'dailies',target:10}},
  {from:utc(1,5,2027),name:'Frosty fields',art:'sprouts',goal:{kind:'harvest',target:300}},
  {from:utc(1,12,2027),name:'Warm kitchen',art:'stew',goal:{kind:'goods',target:30}},
  {from:utc(1,19,2027),name:'Ice fishing',art:'fish-trout',goal:{kind:'fish',target:25}},
  {from:utc(1,26,2027),name:'Snow shovels',art:'helping-hand',goal:{kind:'hand',target:40}},
  {from:utc(2,2,2027),name:'Sprout week',art:'sprouts',goal:{kind:'sprouts',target:200}},
  {from:utc(2,9,2027),name:'Cosy evenings',art:'wool',goal:{kind:'dailies',target:10}},
  {from:utc(2,16,2027),name:'Winter market',art:'cheese',goal:{kind:'goods',target:30}},
  {from:utc(2,23,2027),name:'Frozen pond',art:'fish-trout',goal:{kind:'fish',target:25}},
  {from:utc(3,2,2027),name:'Woodpile',art:'chores',goal:{kind:'hand',target:40}},
  {from:utc(3,9,2027),name:'First thaw',art:'bread',goal:{kind:'harvest',target:300}},
  {from:utc(3,16,2027),name:'Last snow',art:'milk',goal:{kind:'gift',target:3}},
  {from:utc(3,19,2027),name:'Final days',art:'season-point-winter',double:true,goal:null}
 ].map(w=>Object.freeze(w))),
 tiers:Object.freeze([
  tierPair({looks:['winter-2026-title-snowflake-collector'],coins:60},{looks:['season-winter-2026-cocoa-maker'],purchase:true}),
  tierPair({items:{wool:6}},{boost:'harvest',length:'1h'}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({boost:'harvest',length:'30m'},{items:{milk:16}}),
  tierPair({diamonds:20},{looks:['winter-2026-color-ice-blue'],farmhand:1}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({seeds:{sprouts:2}},{boost:'xp',length:'1h'}),
  tierPair({coins:60},{seeds:{sprouts:3}}),
  tierPair({boost:'xp',length:'30m'},{items:{cheese:6}}),
  tierPair({farmer:['hat_006'],coins:60},{diamonds:50}),
  tierPair({coins:60},{cart:1}),
  tierPair({looks:['winter-2026-float']},{vipDays:7}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({boost:'coins',length:'30m'},{items:{bread:7}}),
  tierPair({diamonds:20},{farmhand:1}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({items:{candles:1}},{boost:'harvest',length:'1h'}),
  tierPair({coins:60},{seeds:{sprouts:3}}),
  tierPair({coins:60},{items:{candles:2}}),
  tierPair({coins:120},{looks:['winter-2026-title-sledge-champion'],diamonds:50}),
  tierPair({coins:60},{cart:1}),
  tierPair({items:{yarn:3}},{boost:'xp',length:'1h'}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({boost:'harvest',length:'30m'},{items:{stew:5}}),
  tierPair({looks:['season-winter-2026-snow-farmhand'],diamonds:20},{looks:['winter-2026-frame'],farmhand:1}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({items:{stew:2}},{boost:'coins',length:'1h'}),
  tierPair({coins:60},{seeds:{sprouts:3}}),
  tierPair({coins:60},{farmer:['glasses_013']}),
  tierPair({cart:1},{diamonds:50}),
  tierPair({coins:60},{cart:1}),
  tierPair({items:{cherryjam:2}},{boost:'harvest',length:'1h'}),
  tierPair({seeds:{sprouts:2}},{diamonds:50}),
  tierPair({boost:'xp',length:'30m'},{items:{berrypreserves:3}}),
  tierPair({diamonds:20},{looks:['winter-2026-emblem']}),
  tierPair({coins:60},{diamonds:50}),
  tierPair({items:{berrypreserves:1}},{boost:'harvest',length:'1d'}),
  tierPair({coins:60},{seeds:{sprouts:3}}),
  tierPair({coins:60},{items:{wool:13}}),
  tierPair({seeds:{sprouts:3},coins:200},{diamonds:50}),
  tierPair({coins:100},{cart:1}),
  tierPair({items:{goatcheese:1}},{vipDays:7}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({boost:'coins',length:'30m'},{discount:1}),
  tierPair({diamonds:20},{farmhand:1}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({items:{milk:8}},{boost:'harvest',length:'1h'}),
  tierPair({coins:100},{seeds:{sprouts:3}}),
  tierPair({coins:100},{farmer:['outwear_021']}),
  tierPair({looks:['winter-2026-badge'],farmhand:1},{looks:['winter-2026-bg-valley'],diamonds:50}),
  tierPair({coins:100},{cart:1}),
  tierPair({items:{wool:6}},{boost:'xp',length:'1h'}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({boost:'harvest',length:'30m'},{items:{bread:7}}),
  tierPair({diamonds:20},{crops:1}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({seeds:{sprouts:3}},{boost:'coins',length:'1h'}),
  tierPair({coins:100},{seeds:{sprouts:3}}),
  tierPair({boost:'xp',length:'30m'},{items:{candles:2}}),
  tierPair({coins:200},{looks:['winter-2026-color-pine-green'],diamonds:50}),
  tierPair({coins:100},{cart:1}),
  tierPair({farmer:['gloves_011']},{boost:'harvest',length:'1h'}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({boost:'coins',length:'30m'},{items:{stew:5}}),
  tierPair({diamonds:20},{looks:['winter-2026-frost-rod'],farmhand:1}),
  tierPair({coins:100},{diamonds:50}),
  tierPair({items:{candles:1}},{boost:'coins',length:'1d'}),
  tierPair({coins:100},{seeds:{sprouts:3}}),
  tierPair({coins:100},{items:{cherryjam:4}}),
  tierPair({cart:1},{diamonds:50}),
  tierPair({coins:150},{cart:1}),
  tierPair({items:{yarn:3}},{vipDays:7}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({boost:'harvest',length:'30m'},{items:{berrypreserves:3}}),
  tierPair({looks:['winter-2026-color-cocoa'],diamonds:20},{looks:['winter-2026-tractor'],discount:1}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({items:{stew:2}},{boost:'harvest',length:'1h'}),
  tierPair({coins:150},{seeds:{sprouts:3}}),
  tierPair({coins:150},{farmer:['costume_2']}),
  tierPair({coins:300},{diamonds:50}),
  tierPair({coins:150},{cart:1}),
  tierPair({items:{cherryjam:2}},{boost:'xp',length:'1h'}),
  tierPair({seeds:{sprouts:3}},{diamonds:50}),
  tierPair({boost:'xp',length:'30m'},{items:{milk:16}}),
  tierPair({diamonds:20},{production:1}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({items:{berrypreserves:1}},{boost:'coins',length:'1h'}),
  tierPair({coins:150},{seeds:{sprouts:3}}),
  tierPair({coins:150},{items:{cheese:6}}),
  tierPair({coins:300},{looks:['winter-2026-title-winter-legend'],diamonds:50}),
  tierPair({coins:150},{cart:1}),
  tierPair({items:{goatcheese:1}},{boost:'harvest',length:'1h'}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({boost:'coins',length:'30m'},{items:{bread:7}}),
  tierPair({diamonds:20},{farmhand:1}),
  tierPair({coins:150},{diamonds:50}),
  tierPair({items:{milk:8}},{boost:'xp',length:'1d'}),
  tierPair({coins:150},{seeds:{sprouts:3}}),
  tierPair({coins:150},{items:{candles:2}}),
  tierPair({looks:['winter-2026-title-frost-hero'],coins:300},{looks:['season-winter-2026-frost-royal','winter-2026-golden-sledge'],diamonds:50})
 ])
});
const SEASON_LIST=Object.freeze([AUTUMN_2026,WINTER_2026]);
export const SEASON_IDS=Object.freeze(SEASON_LIST.map(s=>s.id));
// The passes the admin can give from a farmer's Edit (22 Oct 2026, the owner: "dat ik ook Seizoenspas of Halloween pas kan geven"): the
// same as buying one, its id in passPremium (supabase/functions/farm-api/admin-service.js), shown in the "Donation!" window by name.
// Each by its season's name (the owner, 22 Oct 2026: Autumn's as "Autumn Season Pass", next to "Winter Season Pass").
const GIFT_PASS_NAMES={'autumn-2026':'Autumn Season Pass'};
export const GIFT_PASSES=Object.freeze([{id:SEASON_PASS.id,name:SEASON_PASS.name,art:'giant-small'},
 ...SEASON_LIST.map(s=>({id:s.id,name:s.passName??GIFT_PASS_NAMES[s.id]??'Season Pass',art:s.art}))].map(p=>Object.freeze(p)));
export const giftPass=id=>GIFT_PASSES.find(p=>p.id===id)??null;
// 1.4 × the season's days (from its start to its end), rounded to 5: 65 for a start on 6 November.
export const seasonPerTier=(startsAt,endsAt)=>Math.max(5,Math.round(1.4*Math.round((endsAt-startsAt)/DAY_MS)/5)*5);
// A season's start can only be set in this file (the owner's go). scheduleSeason is for the tests and the local harness only: it puts
// a start on a season in this copy of the rules, never in a farm or the database. null: as if not scheduled; undefined: the shipped start.
const scheduled=new Map();
export function scheduleSeason(id,startsAt){if(!SEASON_IDS.includes(id))throw new Error('Unknown season.');if(startsAt===undefined)scheduled.delete(id);else scheduled.set(id,startsAt);cache.delete(id);}
const cache=new Map();
export function seasonById(id){
 if(cache.has(id))return cache.get(id);
 const s=SEASON_LIST.find(x=>x.id===id);if(!s)return null;
 const startsAt=scheduled.has(id)?scheduled.get(id):s.startsAt;
 const out=Object.freeze({...s,startsAt,perTier:startsAt==null?0:seasonPerTier(startsAt,s.endsAt)});cache.set(id,out);return out;
}
// 'off' (not scheduled, or more than 3 days away), 'soon' (a preview of the tiers, nothing to collect or buy), 'open', 'claim' (7 days
// to collect what was reached) and 'over'.
export function seasonPhase(season,now=Date.now()){
 if(!season||season.startsAt==null||now<season.startsAt-SEASON_PREVIEW_DAYS*DAY_MS)return 'off';
 return now<season.startsAt?'soon':now<season.endsAt?'open':now<season.claimUntil?'claim':'over';
}
// The season a farm sees now: the open one first, else one coming soon or in its collecting week.
export function currentSeason(now=Date.now()){
 const seasons=SEASON_IDS.map(seasonById);
 return seasons.find(s=>seasonPhase(s,now)==='open')??seasons.find(s=>['soon','claim'].includes(seasonPhase(s,now)))??null;
}
export const seasonPremium=(state,id)=>Array.isArray(state.passPremium)&&state.passPremium.includes(id);
// The next season in its pre-sale (Winter 2026 while Autumn runs, 21 Oct 2026): one whose start is still to come and whose sale has
// begun (saleFrom), and that is not the season the window shows now. Its tiers are not open: it can only be bought, and is shown below.
export function seasonUpcoming(now=Date.now()){
 const shown=currentSeason(now)?.id;
 return SEASON_IDS.map(seasonById).find(s=>s.id!==shown&&s.startsAt!=null&&s.saleFrom!=null&&now>=s.saleFrom&&now<s.startsAt)??null;
}
// What the window's card for that season shows: the season, whether this farm bought it (the Cocoa maker is theirs then), and whether
// this farm may buy it (from level 20). null: no season in its pre-sale, or the farm below level 10 (the window is not open to it).
export function seasonComing(state,now=Date.now()){
 const season=seasonUpcoming(now);if(!season||levelOf(state)<SEASON_LEVEL)return null;
 return {season,premium:seasonPremium(state,season.id),canBuy:levelOf(state)>=SEASON_BUY_LEVEL,startsIn:season.startsAt-now};
}
// Which week of the season a moment is in (-1: before its first week), and that week's goal for this season (halved, rounded up, in the
// week of a start on a Friday or Saturday).
// Whether everything counts double at this moment: a double week, or one of the season's double days (doubles: Winter's New Year).
export function seasonDouble(season,now){
 const w=seasonWeekIndex(season,now);
 return w>=0&&season.weeks[w].double===true||(season.doubles??[]).some(d=>now>=d.from&&now<d.to);
}
export function seasonWeekIndex(season,now){let i=-1;season.weeks.forEach((w,k)=>{if(now>=w.from)i=k;});return now<season.endsAt?i:-1;}
export function seasonWeekTarget(season,index){
 const w=season.weeks[index];if(!w?.goal)return 0;
 const to=season.weeks[index+1]?.from??season.endsAt,start=season.startsAt;
 return start!=null&&start>w.from&&start<to&&new Date(start).getUTCDay()>=5?Math.ceil(w.goal.target/2):w.goal.target;
}
// One step of the count, worked out without changing the farm: the season's own entry (state.season) with what happened since the last
// step added. The UI shows this (seasonView), and every normalize stores it (refreshSeason), so a gift's 30 leaves show at once.
export function seasonTally(season,entry,state,now){
 const e={...entry,base:{...entry.base},week:entry.week?{...entry.week}:null},counts=seasonCounts(state);
 if(now>=season.startsAt&&now<season.endsAt){
  const day=utcDay(now);if(e.day!==day){e.day=day;e.today=0;}
  const w=seasonWeekIndex(season,now),double=seasonDouble(season,now),cap=SEASON_DAY_CAP*(double?2:1);
  let gain=0;for(const [key,points] of Object.entries(SEASON_POINTS))gain+=points*Math.max(0,counts[key]-(Number.isSafeInteger(e.base[key])?e.base[key]:counts[key]));
  const add=Math.max(0,Math.min(gain*(double?2:1),cap-e.today));e.today+=add;e.points+=add;
  if(w>=0){
   const goal=season.weeks[w].goal,count=goal?SEASON_GOAL_COUNTS[goal.kind](state):0;
   if(!e.week||e.week.n!==w)e.week={n:w,base:count,done:false};
   if(goal&&!e.week.done&&count-e.week.base>=seasonWeekTarget(season,w)){e.week.done=true;e.points+=SEASON_WEEK_BONUS;}
  }
 }
 e.base=counts;return e;
}
export function seasonTier(season,entry){return entry&&season?.perTier?Math.min(SEASON_TIERS,Math.floor(entry.points/season.perTier)+entry.skips):0;}
// Bonus chests reached (after tier 100: every 500 points beyond it).
export function seasonChestsReached(season,entry){
 if(!entry||!season?.perTier||Math.floor(entry.points/season.perTier)+entry.skips<SEASON_TIERS)return 0;
 return Math.floor(Math.max(0,entry.points-(SEASON_TIERS-entry.skips)*season.perTier)/SEASON_CHEST_POINTS);
}
// One tier's reward for a farm at this level: coins in fives (as the Halloween Pass's passReward), a cart as its coins.
export function seasonReward(reward,level){
 const r={...reward},lv=Math.max(1,level);if(r.coins)r.coins=Math.round(reward.coins*lv/5)*5;
 if(r.items)r.items={...reward.items};if(r.seeds)r.seeds={...reward.seeds};if(r.looks)r.looks=[...reward.looks];if(r.farmer)r.farmer=[...reward.farmer];
 if(r.cart)r.cartCoins=r.cart*COIN_PACK.perLevel*lv;
 return r;
}
// Every look a farm owns: what it collected, and what came with a season it bought (the paid tier 1 avatar).
export function seasonLooksOwned(state){
 const own=new Set(Array.isArray(state.looks)?state.looks.filter(id=>typeof id==='string'):[]);
 for(const id of SEASON_IDS)if(seasonPremium(state,id))for(const look of seasonById(id).tiers[0].paid.looks??[])own.add(look);
 return [...own];
}
export const ownsLook=(state,id)=>seasonLooksOwned(state).includes(id);
// Where every look comes from: its season, tier and row (the locked text "Season Pass Autumn 2026, tier 25").
export const SEASON_LOOK_SOURCE=Object.freeze(Object.fromEntries(SEASON_LIST.flatMap(s=>s.tiers.flatMap((t,i)=>['free','paid'].flatMap(track=>(t[track].looks??[]).map(id=>[id,Object.freeze({season:s.id,tier:i+1,track})]))))));
const freshEntry=(season,state)=>({id:season.id,base:seasonCounts(state),day:null,today:0,points:0,skips:0,week:null,free:[],paid:[],chests:0});
function cleanEntry(entry,season){
 if(!entry||typeof entry!=='object'||!seasonById(entry.id))return null;
 const n=v=>Number.isSafeInteger(v)&&v>=0?v:0,tiers=list=>Array.isArray(list)?[...new Set(list.filter(t=>Number.isInteger(t)&&t>=1&&t<=SEASON_TIERS))]:[];
 const base=entry.base&&typeof entry.base==='object'?Object.fromEntries(Object.entries(entry.base).filter(([k,v])=>Object.hasOwn(SEASON_POINTS,k)&&Number.isSafeInteger(v)&&v>=0)):{};
 const week=entry.week&&Number.isInteger(entry.week.n)&&entry.week.n>=0?{n:entry.week.n,base:n(entry.week.base),done:entry.week.done===true}:null;
 return {id:entry.id,base,day:typeof entry.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(entry.day)?entry.day:null,today:n(entry.today),points:n(entry.points),
  skips:Math.min(SEASON_TIERS,n(entry.skips)),week,free:tiers(entry.free),paid:tiers(entry.paid),chests:n(entry.chests),...(entry.refunded===true?{refunded:true}:{})};
}
// A refund: the id left passPremium while paid rewards were collected. The paid diamonds go back as far as the farm still has them (the
// diamonds a farmer spent on skips came from elsewhere and stay spent), the paid looks go, and the paid row is closed again.
function seasonRefund(state,season,entry){
 if(!entry||!entry.paid.length||seasonPremium(state,season.id))return;
 let diamonds=0;const gone=new Set(season.tiers[0].paid.looks??[]),parts=new Set();
 for(const t of entry.paid){const r=season.tiers[t-1].paid;diamonds+=r.diamonds??0;for(const id of r.looks??[])gone.add(id);for(const id of r.farmer??[])parts.add(id);}
 takeFarmerParts(state,parts);
 state.diamonds=Math.max(0,state.diamonds-diamonds);
 if(Array.isArray(state.looks))state.looks=state.looks.filter(id=>!gone.has(id));
 if(state.lookFarm)for(const slot of LOOK_FARM_SLOTS)if(gone.has(state.lookFarm[slot]))delete state.lookFarm[slot];
 entry.paid=[];entry.refunded=true;
}
// Farmer parts from a pass (item 8): given (a list that only grows, each once) and, on a refund, taken back; worn ones come off then
// (farmerOf leaves out what the farm no longer owns, and farmer_wear checks it).
export function giveFarmerParts(state,ids){state.farmerParts=[...new Set([...farmerPassParts(state),...ids.filter(id=>typeof id==='string')])];}
export function takeFarmerParts(state,ids){if(!ids.size||!Array.isArray(state.farmerParts))return;state.farmerParts=state.farmerParts.filter(id=>!ids.has(id));}
function refreshSeason(state,now){
 if(state.farmerParts!==undefined)state.farmerParts=farmerPassParts(state);
 // The looks a farm owns (only grows), what it wears on its own farm (only what it owns), and its seed packets.
 if(state.looks!==undefined)state.looks=Array.isArray(state.looks)?[...new Set(state.looks.filter(seasonLook))]:[];
 if(state.seasonSeeds!==undefined)state.seasonSeeds=Object.fromEntries(Object.entries(state.seasonSeeds&&typeof state.seasonSeeds==='object'?state.seasonSeeds:{}).filter(([k,v])=>Object.hasOwn(SEASON_CROPS,k)&&Number.isSafeInteger(v)&&v>0));
 let entry=cleanEntry(state.season),prev=cleanEntry(state.seasonPrev);
 const season=currentSeason(now);
 // A new season while the last one is still in its collecting week: the last one moves to state.seasonPrev (the "Last season" strip).
 if(season&&entry&&entry.id!==season.id){const old=seasonById(entry.id);prev=seasonPhase(old,now)==='claim'?entry:null;entry=null;}
 if(entry&&seasonPhase(seasonById(entry.id),now)==='over')entry=null;
 if(prev&&seasonPhase(seasonById(prev.id),now)!=='claim')prev=null;
 if(!entry&&season&&seasonPhase(season,now)==='open'&&levelOf(state)>=SEASON_LEVEL)entry=freshEntry(season,state);
 if(entry){const s=seasonById(entry.id);entry=seasonTally(s,entry,state,now);seasonRefund(state,s,entry);state.season=entry;}else delete state.season;
 if(prev){seasonRefund(state,seasonById(prev.id),prev);state.seasonPrev=prev;}else delete state.seasonPrev;
 if(state.lookFarm!==undefined){
  const own=seasonLooksOwned(state),farm=state.lookFarm&&typeof state.lookFarm==='object'?state.lookFarm:{};
  state.lookFarm=Object.fromEntries(LOOK_FARM_SLOTS.filter(slot=>own.includes(farm[slot])&&seasonLook(farm[slot]).kind===slot).map(slot=>[slot,farm[slot]]));
 }
}
// Everything the Season Pass window shows, worked out from the farm (no storage): the season, its phase, the count with what happened
// since the last save, the tier, what is waiting, this week's card.
export function seasonView(state,now=Date.now()){
 const season=currentSeason(now);if(!season)return null;
 const phase=seasonPhase(season,now),stored=cleanEntry(state.season),own=stored?.id===season.id?stored:null;
 const entry=own?seasonTally(season,own,state,now):null,tier=seasonTier(season,entry),premium=seasonPremium(state,season.id);
 const w=seasonWeekIndex(season,now),week=w>=0?season.weeks[w]:null,double=phase==='open'&&seasonDouble(season,now),doubleDay=double&&week?.double!==true?(season.doubles??[]).find(d=>now>=d.from&&now<d.to)??null:null;
 const earned=entry?Math.floor(entry.points/season.perTier)+entry.skips:0,inTier=entry&&tier<SEASON_TIERS?entry.points%season.perTier:0;
 const chests=seasonChestsReached(season,entry),beyond=entry&&earned>=SEASON_TIERS?Math.max(0,entry.points-(SEASON_TIERS-entry.skips)*season.perTier):0;
 const open=phase==='open'||phase==='claim';
 const waiting=!entry||!open?0:['free',...(premium?['paid']:[])].reduce((n,track)=>n+season.tiers.slice(0,tier).filter((t,i)=>!t[track].purchase&&!entry[track].includes(i+1)).length,0)+Math.max(0,chests-entry.chests);
 const prevEntry=cleanEntry(state.seasonPrev),prevSeason=prevEntry?seasonById(prevEntry.id):null;
 const prevWaiting=prevEntry&&seasonPhase(prevSeason,now)==='claim'?['free',...(seasonPremium(state,prevSeason.id)?['paid']:[])].reduce((n,track)=>n+prevSeason.tiers.slice(0,seasonTier(prevSeason,prevEntry)).filter((t,i)=>!t[track].purchase&&!prevEntry[track].includes(i+1)).length,0):0;
 return {season,phase,entry,tier,premium,points:entry?.points??0,today:entry?.today??0,cap:SEASON_DAY_CAP*(double?2:1),double,
  perTier:season.perTier,inTier,toNext:tier<SEASON_TIERS&&entry?season.perTier-inTier:0,chests,chestsClaimed:entry?.chests??0,toChest:SEASON_CHEST_POINTS-beyond%SEASON_CHEST_POINTS,
  week,doubleDay,weekIndex:w,weekTarget:w>=0?seasonWeekTarget(season,w):0,weekCount:entry?.week&&week?.goal?Math.max(0,SEASON_GOAL_COUNTS[week.goal.kind](state)-entry.week.base):0,weekDone:entry?.week?.done===true,
  waiting:waiting+prevWaiting,prev:prevEntry?{season:prevSeason,entry:prevEntry,waiting:prevWaiting,tier:seasonTier(prevSeason,prevEntry)}:null,
  visible:levelOf(state)>=SEASON_LEVEL&&(phase==='soon'||phase==='open'||phase==='claim'&&(tier>0||prevWaiting>0))};
}
// What the paid row holds in all and the shop's price of what can be bought (the value line: no euro beside diamonds).
export function seasonTotals(season){
 const paid=season.tiers.map(t=>t.paid),free=season.tiers.map(t=>t.free),sum=(list,key)=>list.reduce((n,r)=>n+(r[key]??0),0);
 const boostWorth=r=>r.boost?BOOSTS[r.boost].prices[r.length]:0;
 const looks=list=>list.flatMap(r=>r.looks??[]);
 const shop=sum(paid,'diamonds')+paid.reduce((n,r)=>n+boostWorth(r),0)+sum(paid,'vipDays')/7*VIP_PLANS.week.cost+sum(paid,'farmhand')*BOOSTS.farmhand.cost
  +sum(paid,'cart')*COIN_PACK.cost+sum(paid,'discount')*BOOSTS.upgrade.cost+sum(paid,'crops')*BOOSTS.crops.cost+sum(paid,'production')*BOOSTS.production.cost;
 return {diamonds:sum(paid,'diamonds'),freeDiamonds:sum(free,'diamonds'),vipDays:sum(paid,'vipDays'),farmhandDays:sum(paid,'farmhand'),boosts:paid.filter(r=>r.boost).length,
  avatars:looks(paid).filter(id=>SEASON_LOOKS[id].kind==='avatar').length,otherLooks:looks(paid).filter(id=>SEASON_LOOKS[id].kind!=='avatar').length,
  farmerParts:paid.reduce((n,r)=>n+(r.farmer?.length??0),0),shop};
}
const seasonEntryFor=(state,id)=>state.season?.id===id?state.season:state.seasonPrev?.id===id?state.seasonPrev:null;
// What stands in the way of a reward that does something now: Instant harvest needs a growing crop, Finish production a running batch,
// the Buildings discount no voucher waiting yet (one at a time, as in the shop).
function seasonRewardProblem(state,reward,now){
 if(reward.crops&&!state.plots.some(p=>p.crop&&p.readyAt>now))return 'Plant something first: Instant harvest makes every growing crop ready.';
 if(reward.production&&!Object.entries(state.buildings).some(([key,b])=>key!=='factory'&&productionJobs(b).some(j=>j.readyAt>now)))return 'Start a batch first: Finish production makes every running batch ready.';
 if(reward.discount&&state.boosts.upgradeCredits>0)return 'Use your Buildings discount first: you can hold one at a time.';
 return '';
}
export function claimSeasonTier(state,track,tier,now=Date.now(),id){
 normalizeFarm(state,now);
 const season=seasonById(id??state.season?.id??currentSeason(now)?.id??''),entry=season&&seasonEntryFor(state,season.id),phase=seasonPhase(season,now);
 if(!season||phase==='off'||phase==='soon')throw new Error('The Season Pass is not open yet.');
 if(phase==='over')throw new Error('This season has ended.');
 if(levelOf(state)<SEASON_LEVEL)throw new Error(`The Season Pass opens at level ${SEASON_LEVEL}.`);
 if(!['free','paid'].includes(track))throw new Error('Choose a free or a paid reward.');
 if(!Number.isInteger(tier)||tier<1||tier>SEASON_TIERS)throw new Error('Choose a tier.');
 if(!entry)throw new Error('Collect some points in the Season Pass first.');
 if(track==='paid'&&!seasonPremium(state,season.id))throw new Error('Unlock the paid rewards first.');
 const raw=season.tiers[tier-1][track];
 if(raw.purchase)throw new Error('This came with your Season Pass. It is yours already.');
 if(entry[track].includes(tier))throw new Error('You already collected this reward.');
 if(tier>seasonTier(season,entry))throw new Error(`Reach tier ${tier} first.`);
 const level=levelOf(state),r=seasonReward(raw,level),problem=seasonRewardProblem(state,r,now);if(problem)throw new Error(problem);
 if(r.coins)state.coins+=r.coins;   // never stats.earned, as the Halloween Pass
 if(r.diamonds)state.diamonds+=r.diamonds;
 for(const [key,n] of Object.entries(r.items??{}))state.inventory[key]=(state.inventory[key]??0)+n;
 if(r.boost){const key=BOOST_UNTIL[r.boost];state.boosts[key]=Math.max(state.boosts[key]??0,now)+BOOST_DURATIONS[r.length];}
 if(r.vipDays){state.vipExpiresAt=Math.max(now,state.vipExpiresAt??0)+r.vipDays*DAY_MS;state.stats.vip_days=(state.stats.vip_days??0)+r.vipDays;}
 if(r.farmhand)state.boosts.farmhandUntil=Math.max(now,state.boosts.farmhandUntil??0)+r.farmhand*BOOSTS.farmhand.duration;
 if(r.cart)state.coins+=r.cartCoins;
 if(r.discount)state.boosts.upgradeCredits=1;
 let affected=0;
 if(r.crops)for(const p of state.plots)if(p.crop&&p.readyAt>now){p.readyAt=now;affected++;}
 if(r.production)for(const [key,b] of Object.entries(state.buildings))if(key!=='factory')for(const job of productionJobs(b))if(job.readyAt>now){job.readyAt=now;affected++;}
 if(r.seeds){state.seasonSeeds=state.seasonSeeds&&typeof state.seasonSeeds==='object'?state.seasonSeeds:{};for(const [crop,n] of Object.entries(r.seeds))state.seasonSeeds[crop]=(state.seasonSeeds[crop]??0)+n;}
 if(r.looks){state.looks=Array.isArray(state.looks)?state.looks:[];for(const look of r.looks)if(!state.looks.includes(look))state.looks.push(look);}
 if(r.farmer)giveFarmerParts(state,r.farmer);
 entry[track].push(tier);
 return {season:season.id,track,tier,...r,...(affected?{affected}:{})};
}
// Tier skip: 100 diamonds, one tier per tap, any number of times, until tier 100 (game/payments.js has nothing to do with it).
export function skipSeasonTier(state,expectedCost,now=Date.now()){
 normalizeFarm(state,now);
 const season=currentSeason(now),entry=season&&state.season?.id===season.id?state.season:null;
 if(!season||seasonPhase(season,now)!=='open')throw new Error('Tiers can only be skipped while the season runs.');
 if(levelOf(state)<SEASON_LEVEL)throw new Error(`The Season Pass opens at level ${SEASON_LEVEL}.`);
 if(!entry)throw new Error('Collect some points in the Season Pass first.');
 const tier=seasonTier(season,entry);
 if(tier>=SEASON_TIERS)throw new Error(`You reached tier ${SEASON_TIERS}. Bonus chests come from points only.`);
 if(expectedCost!==undefined&&expectedCost!==SEASON_SKIP_COST)throw new Error(PRICES_CHANGED);
 if(state.diamonds<SEASON_SKIP_COST)throw new Error(shortOfDiamonds(SEASON_SKIP_COST));
 spendDiamonds(state,SEASON_SKIP_COST);entry.skips++;state.stats.season_skips=(state.stats.season_skips??0)+1;
 return {season:season.id,tier:seasonTier(season,entry),cost:SEASON_SKIP_COST};
}
// A bonus chest after tier 100: 500 × level coins (in fives), one at a time, while the season runs and in its collecting week (id: the
// last season's, from its strip, once the next one runs).
export function claimSeasonChest(state,now=Date.now(),id){
 normalizeFarm(state,now);
 const season=id?seasonById(id):currentSeason(now),entry=season?seasonEntryFor(state,season.id):null,phase=seasonPhase(season,now);
 if(!entry||(phase!=='open'&&phase!=='claim'))throw new Error('There is no bonus chest to open.');
 if(seasonChestsReached(season,entry)<=entry.chests)throw new Error(`Every ${SEASON_CHEST_POINTS} points after tier ${SEASON_TIERS} open a bonus chest.`);
 const coins=Math.round(SEASON_CHEST_COINS*Math.max(1,levelOf(state))/5)*5;
 state.coins+=coins;entry.chests++;
 return {season:season.id,chest:entry.chests,coins};
}
// Wear a look on the farm itself (the float, the rod, the tractor paint), or none (id null): only one the farm owns.
export function wearFarmLook(state,slot,id){
 if(!LOOK_FARM_SLOTS.includes(slot))throw new Error('Choose a look.');
 state.lookFarm=state.lookFarm&&typeof state.lookFarm==='object'?state.lookFarm:{};
 if(id==null){delete state.lookFarm[slot];return {slot,id:null};}
 const look=seasonLook(id);if(!look||look.kind!==slot)throw new Error('Choose a look.');
 if(!ownsLook(state,id))throw new Error('Collect this look in the Season Pass first.');
 state.lookFarm[slot]=id;return {slot,id};
}
// The season crop: one packet plants one field, only while its season runs; what grows then is harvested as usual.
export function seasonCropOpen(crop,now=Date.now()){return SEASON_IDS.some(id=>{const s=seasonById(id);return s.crop===crop&&seasonPhase(s,now)==='open';});}
export const seasonSeedsOf=(state,crop)=>whole(state.seasonSeeds?.[crop]);
function seasonPlantProblem(state,crop,now){
 if(levelOf(state)<SEASON_LEVEL)return `Reach level ${SEASON_LEVEL} to plant this crop.`;
 if(!seasonCropOpen(crop,now))return 'This crop only grows in its season. Your seed packets keep until then.';
 if(seasonSeedsOf(state,crop)<1)return 'You have no seed packets for this crop. They come from the Season Pass.';
 return '';
}
// A worn look as stored (player_stats.look), cleaned for showing: only known looks in their own slot.
export function wornLook(look){
 if(!look||typeof look!=='object'||Array.isArray(look))return {};
 return Object.fromEntries(LOOK_SLOTS.filter(slot=>seasonLook(look[slot])?.kind===slot).map(slot=>[slot,look[slot]]));
}
// The season badges a farm collected, oldest season first (the "Seasons" row on a profile).
export const seasonBadges=looks=>Object.keys(SEASON_LOOKS).filter(id=>SEASON_LOOKS[id].kind==='badge'&&Array.isArray(looks)&&looks.includes(id));
// Look a plain look up for the UI and the server: its kind, name and where it comes from.
export function lookInfo(id){const look=seasonLook(id);return look?{id,...look,source:SEASON_LOOK_SOURCE[id]??null}:null;}
// What a farmer may wear on their public card (farm-api, before it writes player_stats.look): every slot an owned look of that kind,
// or nothing. Anything else throws.
export function checkWornLook(state,worn){
 if(!worn||typeof worn!=='object'||Array.isArray(worn))throw new Error('Choose a look.');
 const own=seasonLooksOwned(state),out={};
 for(const [slot,id] of Object.entries(worn)){
  if(!LOOK_SLOTS.includes(slot))throw new Error('Choose a look.');
  if(id==null)continue;
  const look=seasonLook(id);if(!look||look.kind!==slot)throw new Error('Choose a look.');
  if(!own.includes(id))throw new Error('Collect this look in the Season Pass first.');
  out[slot]=id;
 }
 return out;
}
// Every level pays at least one diamond, so no level-up is ever empty-handed; from level 20 on it grows with every ten levels
// (7 Oct 2026; it was one for every five levels, from level 10).
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
// Since 28 Sep 2026 the sender chooses fixed coins (at most 1,000) or coins per level (at most 50, supabase/staff-gift-per-level.sql):
// per level, the farmer gets them times their level when the gift arrives, so late farms get a gift that still counts.
export const STAFF_GIFT_COINS=1000,STAFF_GIFT_COINS_PER_LEVEL=50;
// A gift's message in the farmer's own language (22 Oct 2026, the owner: "kan dit in verschillende talen"): a message that is exactly
// one of these is a game text with translations (i18n/catalog.json), shown translated in the "Donation!" window (public/game.js) and
// under Notifications (src/chat-ui.js giftBody); any other message stays as the staff typed it.
export const GIFT_MESSAGES=Object.freeze(['To help you upgrade your Warehouse!']);
export const giftMessageText=(message,translate)=>GIFT_MESSAGES.includes(message)?(translate(message)??message):message;
export function receiveDonations(state,rows){
 state.donations??=[];const got=[],level=levelOf(state);
 for(const row of rows??[]){
  if(typeof row?.id!=='string'||state.donations.includes(row.id))continue;
  const typed=Math.max(0,Math.floor(Number(row.coins)||0));
  const coins=row.per_level===true?Math.min(STAFF_GIFT_COINS_PER_LEVEL,typed)*level:Math.min(STAFF_GIFT_COINS,typed),diamonds=Math.max(0,Math.min(50,Math.floor(Number(row.diamonds)||0)));
  state.donations.push(row.id);state.coins+=coins;state.diamonds+=diamonds;
  got.push({coins,diamonds,message:typeof row.message==='string'&&row.message?row.message.slice(0,120):null});
 }
 state.donations=state.donations.slice(-50);
 return got;
}
export function levelReward(level){return {coins:10*level,diamonds:Math.max(1,Math.floor(level/10))};}
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
// The tractor's fuel: a fixed start per job plus a little per field (planting pays the seeds on top) (the wiki reads these). No rest since
// 4 Oct 2026 (it rested 15 seconds after each job): swiping over the fields is free and has no wait either.
// Per field (17 Oct 2026, the owner: "duurder naarmate je langere 'duurdere' crop selecteert"; it was 2 for every crop): 5% of what the
// field's crop usually sells for (its normal market price, not today's), at least 2, in whole coins. Plant pays for the crop it plants,
// Water, Extra care and Harvest for the crop on each field. Wheat, lettuce and corn stay at 2; the tractor's four jobs take about 6-9%
// of a long crop's profit (sunflower 19 a field). The night shift and Full care are paid in diamonds and burn no fuel.
export const TRACTOR_FUEL_BASE=12,TRACTOR_FUEL_PER_FIELD=2,TRACTOR_FUEL_SHARE=.05;
export const fieldFuel=crop=>Object.hasOwn(CROPS,crop??'')?Math.max(TRACTOR_FUEL_PER_FIELD,Math.round(reducedMarketPrice(CROPS[crop].sell)*TRACTOR_FUEL_SHARE)):TRACTOR_FUEL_PER_FIELD;
export function tractorQuote(state,mode,crop='corn',now=Date.now(),ids){
 // tend (4 Oct 2026): extra care for every crop whose care moment has come, as by hand.
 // fertilize (21 Oct 2026): natural fertilizer on every growing crop that has none yet this cycle, the longest wait first (see below).
 if(mode==='fertilize')return fertilizeQuote(state,now,ids);
 const eligible=state.plots.filter(p=>mode==='plant'?!p.crop:mode==='water'?canWater(p,now):mode==='tend'?fieldTapAction(p,now,'tend')==='tend':p.crop&&p.readyAt<=now);
 const count=mode==='plant'?Math.min(eligible.length,Math.max(0,Math.floor((state.coins-TRACTOR_FUEL_BASE)/(seedCost(state,crop)+fieldFuel(crop))))):eligible.length;
 const worked=eligible.slice(0,count);
 const fuel=count?TRACTOR_FUEL_BASE+worked.reduce((sum,p)=>sum+fieldFuel(mode==='plant'?crop:p.crop),0):0,seeds=mode==='plant'?count*seedCost(state,crop):0;
 return {count,fuel,seeds,total:fuel+seeds,ids:worked.map(p=>p.id)};
}
// The tractor's Fertilize job (21 Oct 2026, the owner, after players kept asking how to fertilize a field: "2+4"). It does what the
// Windmill's "Give a field a head start" does by hand (fertilizeField: 1 natural fertilizer a field, 35% off the time left, once per
// growing cycle, 5 XP and stats.fertilized, so it counts for the same quests, challenges and events), on every growing crop that has
// none yet. With less fertilizer in storage than such fields it does as many as there is fertilizer for, the longest time left first
// (the most time saved). Fuel as Water: TRACTOR_FUEL_BASE a job + each field's crop fuel (fieldFuel). No diamonds. fields: every field it
// could do; count: the ones it will do; fertilizer: what it uses (= count).
// ids (24 Oct 2026, the owner: "Laat bij tractor kiezen welk veld je wilt fertilizen"): the fields the farmer picked. Only those that can
// still take fertilizer count; more picked than there is fertilizer for is refused (the window never lets that happen). Without ids
// (the tile's own line, and an older page) it picks the longest waits first, as before.
export const fertilizeChoices=(state,now=Date.now())=>state.plots.filter(p=>p.crop&&p.readyAt>now&&!p.fertilized).sort((a,b)=>(b.readyAt-a.readyAt)||(a.id-b.id));
export function fertilizeQuote(state,now=Date.now(),ids){
 const eligible=fertilizeChoices(state,now),have=Math.max(0,Math.floor(state.inventory?.fertilizer??0));
 if(ids!==undefined){
  if(!Array.isArray(ids)||ids.length>state.plots.length||!ids.every(Number.isInteger))throw new Error('Choose the fields to fertilize.');
  const picked=new Set(ids),chosen=eligible.filter(p=>picked.has(p.id));
  if(chosen.length>have)throw new Error(have===1?'You have 1 natural fertilizer.':`You have ${have} natural fertilizer.`);
  const fuel=chosen.length?TRACTOR_FUEL_BASE+chosen.reduce((sum,p)=>sum+fieldFuel(p.crop),0):0;
  return {count:chosen.length,fuel,seeds:0,total:fuel,ids:chosen.map(p=>p.id),fields:eligible.length,fertilizer:chosen.length};
 }
 const count=Math.min(eligible.length,have),worked=eligible.slice(0,count);
 const fuel=count?TRACTOR_FUEL_BASE+worked.reduce((sum,p)=>sum+fieldFuel(p.crop),0):0;
 return {count,fuel,seeds:0,total:fuel,ids:worked.map(p=>p.id),fields:eligible.length,fertilizer:count};
}
// expectedCost (17 Oct 2026): the price the tile showed. Never more is charged; a farm that changed in between asks to look again. An
// older page sends none and pays the rules' price.
// ids: the fields picked for Fertilize (fertilizeQuote); the other jobs ignore them.
export function useTractor(state,mode,crop='corn',now=Date.now(),expectedCost,ids){
 if(!['plant','water','harvest','tend','fertilize'].includes(mode))throw new Error('Choose a tractor task.');if(!Object.hasOwn(CROPS,crop))throw new Error('Choose a crop.');
 if(mode==='plant'&&!cropUnlocked(state,crop))throw new Error(cropUnlockHint(state,crop));
 // The Warehouse (22 Oct 2026): the Harvest job waits while it is full (once it runs it harvests every ripe field, also over the line).
 if(mode==='harvest')assertWarehouseRoom(state);
 const quote=tractorQuote(state,mode,crop,now,mode==='fertilize'?ids:undefined);
 if(expectedCost!==undefined&&(!Number.isSafeInteger(expectedCost)||quote.total>expectedCost))throw new Error('The price has changed. Review the current price.');
 if(!quote.count)throw new Error(mode==='plant'?'No empty fields you can afford to plant, including fuel.':mode==='water'?'No growing crops need water.':mode==='tend'?'No crops are ready for extra care yet.':mode==='fertilize'?(quote.fields?(ids!==undefined&&state.inventory?.fertilizer>=1?'Choose the fields to fertilize.':'Make natural fertilizer at the Windmill first.'):'No growing crops need fertilizer.'):'No crops are ready to harvest.');
 if(state.coins<quote.total)throw new Error(`You need ${quote.fuel} coins for tractor fuel. Working by hand is free.`);
 state.coins-=quote.fuel;
 if(mode==='fertilize'){
  const xp=quote.ids.reduce((sum,id)=>sum+fertilizeField(state,id,now).xp,0);
  state.stats.tractor++;return {count:quote.count,mode,cost:quote.total,fuel:quote.fuel,fertilizer:quote.fertilizer,fields:quote.fields,xp};
 }
 for(const id of quote.ids)actOnPlot(state,id,mode,crop,now);
 state.stats.tractor++;return {count:quote.count,mode,cost:quote.total,fuel:quote.fuel};
}
// The tractor's diamond work (4 Oct 2026). It counts for no challenges, events or leaderboards: it never raises the harvest, water,
// care or plant counters (only its own), gives no XP, and farm-api saves it as no event action (NO_EVENT_ACTIONS), so not even
// the diamonds it costs move an event's "Spend diamonds" goal. Quests that count diamonds spent do count them, as every spend.
// A fish (11 Oct 2026) counts for nothing else either: no event, no Family Chest, no challenge (its coins are not stats.earned). A fish
// at the village lake (12 Oct 2026) counts for the village events since 20 Oct 2026 (their "Catch lake fish" goal), and still for no
// challenge and no Family Chest: a cast moves no stat a farm event or the chest counts (earned, coins spent, harvests, batches...).
// A pat of a pet (20 Oct 2026) neither: its coins, crops, planks and XP are a small find, never a goal's progress.
// Dressing your own farmer (21 Oct 2026, farmer_wear) counts for nothing at all: no coins, no XP, no stat.
// Moving things on your farm, and storing or placing a stored tree or tile (24 Oct 2026, game/farm-map.js), count for nothing either.
export const NO_EVENT_ACTIONS=Object.freeze(new Set(['tractor_care','tractor_shift','fish','pet_pat','farmer_wear','layout_move','layout_store','layout_place']));
// Full care: water and extra care for every growing crop at once, also outside their moments (water is meant for the start, care
// opens at CARE_AT of the growing time), so each ripens much sooner (a crop planted before one crop a harvest still gets its old 3 crops
// and double XP). Per growing crop that still misses
// either: FULL_CARE_COST diamonds.
export const FULL_CARE_COST=2;
export function fullCareQuote(state,now=Date.now()){
 const ids=state.plots.filter(p=>p.crop&&p.readyAt>now&&(!p.watered||!p.tended)).map(p=>p.id);
 return {ids,count:ids.length,cost:ids.length*FULL_CARE_COST};
}
export function fullCare(state,expectedCost,now=Date.now()){
 const quote=fullCareQuote(state,now);
 if(!quote.count)throw new Error('No growing crops need water or care.');
 if(expectedCost!==quote.cost)throw new Error('Your fields have changed. Review the price.');
 if(state.diamonds<quote.cost)throw new Error(`You need ${quote.cost} diamonds.`);
 spendDiamonds(state,quote.cost);
 for(const id of quote.ids){
  const p=state.plots[id];
  if(!p.watered)waterPlot(state,p,now);
  if(!p.tended)carePlot(p,now);
 }
 state.stats.full_care=(state.stats.full_care??0)+quote.count;
 return {count:quote.count,cost:quote.cost};
}
// The night shift: for 8 hours the tractor does a round every hour (at the start and then on the hour after it, 9 rounds), also
// while the farmer is away: it harvests every ripe field, plants the chosen crop on every empty one (the seeds are paid in coins;
// it stops planting when they run out), waters what can be watered and gives care where care is open. Its harvests go to the barn
// with their usual size, but give no XP and count nowhere (see above). One a day (the UTC day it starts). The rounds are worked out
// from the clock when the farm is next loaded or acted on (settleShift in normalizeFarm), each at its own time, so the result never
// depends on when that happens.
// The price follows what the shift brings in with the chosen crop (the owner's call: a crop that ripens in minutes is harvested every
// round, one that takes 8 hours once): the shift is worked out ahead on a copy of the farm with every field empty, coins enough for
// the seeds and no timed boosts, so only the crop, the number of fields, the farm's lasting growth bonuses and today's market price
// set it (4 Oct 2026 review: from the farm as it was, emptying the coins or filling the fields with slow crops just before starting
// made it a quarter of the price, and crops already on the fields were charged for). Every SHIFT_COINS_PER_DIAMOND coins of crops
// (minus the seeds) cost a diamond, at least SHIFT_MIN_PER_FIELD per field.
export const SHIFT_MS=8*3600000,SHIFT_ROUND_MS=3600000,SHIFT_ROUNDS=SHIFT_MS/SHIFT_ROUND_MS,SHIFT_COINS_PER_DIAMOND=250,SHIFT_MIN_PER_FIELD=1;
export const shiftHarvests=shift=>(shift?.log?.rounds??[]).reduce((sum,n)=>sum+n,0);
const newShift=(crop,now)=>({day:utcDay(now),startedAt:now,endsAt:now+SHIFT_MS,crop,done:0,log:{rounds:[],items:{},planted:0,watered:0,tended:0}});
// What a shift with this crop brings in on these fields: on a copy with every field empty, coins enough and no timed boosts.
export function shiftForecast(state,crop,now=Date.now()){
 const empty={crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0};
 const coins=1e12,copy={...state,coins,boosts:{...state.boosts,harvestUntil:0,xpUntil:0,coinsUntil:0},plots:state.plots.map(p=>({...p,...empty})),inventory:{...state.inventory},stats:{...state.stats},tractorShift:newShift(crop,now)};
 settleShift(copy,now+SHIFT_MS);
 const items=copy.tractorShift.log.items,seeds=coins-copy.coins,harvests=shiftHarvests(copy.tractorShift);
 const crops=Object.entries(items).reduce((sum,[item,n])=>sum+marketQuote(item,now).price*n,0);
 return {value:Math.max(0,crops-seeds),crops,seeds,harvests,items,tooSlow:!harvests,perField:state.plots.length?Math.round(harvests/state.plots.length):0};
}
export function nightShiftQuote(state,crop='corn',now=Date.now()){
 const shift=state.tractorShift??null,running=Boolean(shift)&&now<shift.endsAt,doneToday=Boolean(shift)&&!running&&shift.day===utcDay(now);
 const fields=state.plots.length,forecast=Object.hasOwn(CROPS,crop)&&cropUnlocked(state,crop)?shiftForecast(state,crop,now):null;
 const cost=forecast?Math.max(fields*SHIFT_MIN_PER_FIELD,Math.ceil(forecast.value/SHIFT_COINS_PER_DIAMOND)):0;
 // low: a crop the shift harvests that brings in less than the lowest price, so the lowest price sets it (wheat, lettuce). Not a
 // crop that grows longer than the shift or keeps giving after it (berries, pole beans): those bring in their worth later.
 const low=Boolean(forecast&&!forecast.tooSlow&&!CROPS[crop].perennial&&forecast.value<fields*SHIFT_MIN_PER_FIELD*SHIFT_COINS_PER_DIAMOND);
 return {cost,fields,running,doneToday,shift,forecast,perField:forecast?.perField??0,low};
}
// What to know before starting (6 Oct 2026, the owner's choice after the first shifts: three farmers paid for one while every field
// was full of slower crops, so it planted nothing, and wheat brought in less than the lowest price): how many fields stay full until
// after the shift, so the tractor never plants there. Worked out on a copy of the farm as it is now with coins enough (the shift's
// own water and care counted). Only a warning: the price stays as it is.
export function shiftFieldsTaken(state,crop,now=Date.now()){
 if(!Object.hasOwn(CROPS,crop)||!cropUnlocked(state,crop))return 0;
 const copy={...state,coins:1e12,plots:state.plots.map(p=>({...p})),inventory:{...state.inventory},stats:{...state.stats},tractorShift:newShift(crop,now)};
 settleShift(copy,now+SHIFT_MS);
 return copy.plots.filter(p=>!(p.crop===crop&&p.plantedAt>=now)).length;
}
// expectedCost is the price the farmer was shown: never more is charged (the forecast can come out a little lower on the server's clock).
export function startNightShift(state,crop,expectedCost,now=Date.now()){
 if(typeof crop!=='string'||!Object.hasOwn(CROPS,crop))throw new Error('Choose a crop.');
 if(!cropUnlocked(state,crop))throw new Error(cropUnlockHint(state,crop));
 const quote=nightShiftQuote(state,crop,now);
 if(quote.running)throw new Error('The night shift is already running.');
 if(quote.doneToday)throw new Error('One night shift a day: the next one can start tomorrow.');
 // The Warehouse (22 Oct 2026): a shift harvests, so it cannot start while the Warehouse is full; one that runs goes on to its end.
 assertWarehouseRoom(state);
 if(!Number.isSafeInteger(expectedCost)||expectedCost<quote.cost)throw new Error('The price has changed. Review the current price.');
 if(state.diamonds<quote.cost)throw new Error(`You need ${quote.cost} diamonds.`);
 spendDiamonds(state,quote.cost);
 state.stats.tractor_shifts=(state.stats.tractor_shifts??0)+1;
 state.tractorShift=newShift(crop,now);
 settleShift(state,now);   // the first round, right away
 return {cost:quote.cost,crop,endsAt:state.tractorShift.endsAt,harvests:shiftHarvests(state.tractorShift),planted:state.tractorShift.log.planted};
}
// One round of the night shift at time t: the same work as by hand at that moment, counted only in the shift's own log.
function shiftRound(state,shift,t){
 let harvests=0;
 for(const p of state.plots){
  if(p.crop&&p.readyAt<=t){
   const crop=p.crop,quantity=harvestQuantity(state,p,t);
   state.inventory[crop]=(state.inventory[crop]??0)+quantity;shift.log.items[crop]=(shift.log.items[crop]??0)+quantity;harvests++;
   if(CROPS[crop].perennial){const duration=cropDuration(state,crop,true,t);Object.assign(p,{plantedAt:t,readyAt:t+duration,careAt:t+careDelay(state,duration,t),watered:false,tended:false,fertilized:false,harvestCycles:(p.harvestCycles??0)+1,oneCrop:true});}
   else Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0});
  }
  if(!p.crop&&cropUnlocked(state,shift.crop)&&state.coins>=seedCost(state,shift.crop)){
   state.coins-=seedCost(state,shift.crop);
   const duration=cropDuration(state,shift.crop,false,t);
   Object.assign(p,{crop:shift.crop,harvestCycles:0,plantedAt:t,readyAt:t+duration,careAt:t+careDelay(state,duration,t),watered:false,tended:false,fertilized:false,oneCrop:true});
   shift.log.planted++;
  }
  if(canWater(p,t)){waterPlot(state,p,t);shift.log.watered++;}
  if(p.crop&&!p.tended&&t>=(p.careAt??p.plantedAt)&&t<p.readyAt){carePlot(p,t);shift.log.tended++;}
 }
 shift.log.rounds.push(harvests);
 state.stats.shift_harvests=(state.stats.shift_harvests??0)+harvests;
}
export function settleShift(state,now=Date.now()){
 const shift=state.tractorShift;if(!shift)return;
 while(shift.done<=SHIFT_ROUNDS){const t=shift.startedAt+shift.done*SHIFT_ROUND_MS;if(t>now)break;shiftRound(state,shift,t);shift.done++;}
}
// A saved night shift as the rules expect it, or none.
function normalizeShift(state){
 const s=state.tractorShift;if(s===undefined)return;
 const ok=s&&typeof s==='object'&&typeof s.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.day)&&Number.isSafeInteger(s.startedAt)&&s.endsAt===s.startedAt+SHIFT_MS
  &&typeof s.crop==='string'&&Object.hasOwn(CROPS,s.crop)&&Number.isInteger(s.done)&&s.done>=0&&s.done<=SHIFT_ROUNDS+1&&s.log&&typeof s.log==='object';
 if(!ok){delete state.tractorShift;return;}
 const count=v=>Number.isSafeInteger(v)?Math.max(0,v):0;
 s.log={rounds:(Array.isArray(s.log.rounds)?s.log.rounds:[]).slice(0,SHIFT_ROUNDS+1).map(count),items:Object.fromEntries(Object.entries(s.log.items&&typeof s.log.items==='object'?s.log.items:{}).filter(([k])=>Object.hasOwn(CROPS,k)).map(([k,v])=>[k,count(v)])),
  planted:count(s.log.planted),watered:count(s.log.watered),tended:count(s.log.tended)};
}
// The shipping bin (24 Oct 2026, the owner picked it from the lessons of a well-loved farming game: "Doe 1&2"). From SHIP_BIN_LEVEL a
// farmer can put crops and goods in the bin at today's price and SHIP_BIN_BONUS on top; the bin is paid at 00:00 UTC, on the farm's next
// load on a later day (normalizeFarm, payShipBin), so a day ends with something to come back for. What goes in leaves the Warehouse
// at once. The bin holds shipBinRoom places (more with the farm's level) and can be emptied back into the Warehouse until it is paid,
// for the price it was put in at. Village goods stay at the Village market. It counts nowhere (no sold or earned counters, so no quest,
// challenge, event, chest or board), only its own: stats.bin_shipped and stats.bin_earned.
// Saved as state.shipBin = {day, items:{key:n}, coins} (the price locked in, bonus included) and, once paid, state.shipPaid =
// {day, coins, count} for the morning's line.
export const SHIP_BIN_BONUS=.1,SHIP_BIN_ROOM_MAX=500;
export const shipBinRoom=state=>Math.min(SHIP_BIN_ROOM_MAX,20+5*levelOf(state));
export const shipBinCount=state=>Object.values(state.shipBin?.items??{}).reduce((n,v)=>n+(Number.isInteger(v)&&v>0?v:0),0);
export const shipBinItem=key=>Object.hasOwn(ITEMS,key)&&!villageGood(key);
// What count of `key` would bring in the bin now, bonus included (whole coins).
export const shipBinValue=(state,key,count,now=Date.now())=>Math.floor(marketSaleValue(state,count*marketQuote(key,now).price,now)*(1+SHIP_BIN_BONUS));
export function shipBinAdd(state,key,count,now=Date.now()){
 if(!featureUnlocked(state,'shipbin'))throw new Error(featureUnlockHint('shipbin'));
 if(!shipBinItem(key))throw new Error('Choose a crop or good for the shipping bin.');
 if(!Number.isSafeInteger(count)||count<1)throw new Error('Choose how many to put in the bin.');
 if(count>sellableStock(state,key,now))throw new Error(`You have ${sellableStock(state,key,now)} ${ITEMS[key].name.toLowerCase()} to put in.`);
 const room=shipBinRoom(state)-shipBinCount(state);if(count>room)throw new Error(room?`The bin has room for ${room} more.`:'The shipping bin is full. It is paid at 00:00 UTC.');
 const coins=shipBinValue(state,key,count,now),day=utcDay(now);
 state.shipBin??={day,items:{},coins:0};state.shipBin.day=day;
 state.inventory[key]-=count;state.shipBin.items[key]=(state.shipBin.items[key]??0)+count;state.shipBin.coins+=coins;
 return {item:key,count,coins,total:state.shipBin.coins,room:shipBinRoom(state)-shipBinCount(state)};
}
// Back into the Warehouse, all of one item, for what it was put in at (its share of the locked price).
export function shipBinTake(state,key,now=Date.now()){
 const n=state.shipBin?.items?.[key]??0;if(!n)throw new Error('That is not in the shipping bin.');
 const all=shipBinCount(state),back=Math.floor(state.shipBin.coins*n/all);
 state.inventory[key]=(state.inventory[key]??0)+n;delete state.shipBin.items[key];state.shipBin.coins-=back;
 if(!shipBinCount(state))delete state.shipBin;
 return {item:key,count:n};
}
export function payShipBin(state,now=Date.now()){
 const bin=state.shipBin;if(!bin)return null;
 if(typeof bin.day!=='string'||!bin.items||typeof bin.items!=='object'||!Number.isSafeInteger(bin.coins)||bin.coins<0){delete state.shipBin;return null;}
 const today=utcDay(now);if(bin.day>=today)return null;
 const count=shipBinCount(state);state.coins+=bin.coins;
 state.stats.bin_shipped=(state.stats.bin_shipped??0)+count;state.stats.bin_earned=(state.stats.bin_earned??0)+bin.coins;
 state.shipPaid={day:today,coins:bin.coins,count};delete state.shipBin;
 return state.shipPaid;
}
// The neighbours (24 Oct 2026, the owner: "Doe 1&2" and "zorg dat je met 2 ook storytelling meeneemt"; the plan he approved: "Deze
// opzet is goed"). Four people of the valley, each with their own story told in five letters (public/neighbours.js). Bring one of
// their two favourites once a UTC day and their friendship grows; at NEIGHBOUR_HEARTS gifts in all a new heart opens, with a letter and
// its reward (coins by the farm's level, diamonds at hearts 2, 4 and 5, and at heart 5 a decoration for your farm in Your things). Each
// opens at the level of their first favourite you can make (Hank with sunflowers). A gift counts nowhere but its own stats.
// Saved as state.neighbours = {key: {gifts, day}}: the gifts given and the UTC day of the last one.
export const NEIGHBOURS=Object.freeze({
 rosie:Object.freeze({name:'Rosie',role:'The baker',likes:Object.freeze({wheat:30,bread:1}),decor:'cart'}),
 mei:Object.freeze({name:'Mei',role:'The flower grower',likes:Object.freeze({lettuce:15,berries:3}),decor:'flowerbed'}),
 otto:Object.freeze({name:'Otto',role:'The carpenter',likes:Object.freeze({corn:8,cheese:1}),decor:'firewood'}),
 hank:Object.freeze({name:'Hank',role:'The beekeeper',likes:Object.freeze({sunflower:1,honey:10}),decor:'bench'})
});
export const NEIGHBOUR_HEARTS=Object.freeze([1,3,6,10,15]);   // gifts in all for hearts 1 to 5
export const NEIGHBOUR_REWARDS=Object.freeze([{coinsPerLevel:20},{coinsPerLevel:40,diamonds:3},{coinsPerLevel:60},{coinsPerLevel:80,diamonds:5},{diamonds:10,decor:true}]);
const itemLevel=key=>CROPS[key]?(CROP_LEVELS[key]??CROPS[key].minLevel??1):Math.min(...Object.entries(RECIPES).filter(([,r])=>r.output?.[key]&&r.building!=='factory').map(([id])=>RECIPE_LEVELS[id]??RECIPES[id].minLevel??1),Infinity);
export const neighbourLevel=key=>Math.max(NEIGHBOURS_LEVEL,Math.min(...Object.keys(NEIGHBOURS[key].likes).map(itemLevel)));
export const neighbourOpen=(state,key)=>Object.hasOwn(NEIGHBOURS,key)&&featureUnlocked(state,'neighbours')&&levelOf(state)>=neighbourLevel(key);
const neighbourOf=(state,key)=>{const n=state.neighbours?.[key];return {gifts:Number.isInteger(n?.gifts)&&n.gifts>0?Math.min(n.gifts,NEIGHBOUR_HEARTS.at(-1)):0,day:typeof n?.day==='string'?n.day:''};};
export const neighbourHearts=(state,key)=>{const g=neighbourOf(state,key).gifts;return NEIGHBOUR_HEARTS.filter(n=>g>=n).length;};
// What the next heart takes and gives, and whether today's gift is still to come: {hearts, gifts, nextAt, giftedToday, done}.
export function neighbourStatus(state,key,now=Date.now()){
 const n=neighbourOf(state,key),hearts=neighbourHearts(state,key),done=hearts>=NEIGHBOUR_HEARTS.length;
 return {hearts,gifts:n.gifts,nextAt:done?null:NEIGHBOUR_HEARTS[hearts],giftedToday:n.day===utcDay(now),done};
}
export function neighbourReward(state,heart){
 const r=NEIGHBOUR_REWARDS[heart-1];return {coins:(r.coinsPerLevel??0)*levelOf(state),diamonds:r.diamonds??0,decor:!!r.decor};
}
export function giveNeighbour(state,key,item,now=Date.now()){
 if(!Object.hasOwn(NEIGHBOURS,key))throw new Error('Choose a neighbour.');
 if(!featureUnlocked(state,'neighbours'))throw new Error(featureUnlockHint('neighbours'));
 if(!neighbourOpen(state,key))throw new Error(`Reach level ${neighbourLevel(key)} to meet ${NEIGHBOURS[key].name}.`);
 const who=NEIGHBOURS[key],count=who.likes[item];if(!count)throw new Error(`${who.name} would love something else.`);
 const status=neighbourStatus(state,key,now);
 if(status.done)throw new Error(`You and ${who.name} are the best of friends already.`);
 if(status.giftedToday)throw new Error(`${who.name} has had a gift today. Come back tomorrow.`);
 if((state.inventory[item]??0)<count)throw new Error(`You need ${count} ${ITEMS[item].name.toLowerCase()}.`);
 state.inventory[item]-=count;
 const gifts=status.gifts+1;state.neighbours={...(state.neighbours??{}),[key]:{gifts,day:utcDay(now)}};
 state.stats.neighbour_gifts=(state.stats.neighbour_gifts??0)+1;
 const heart=NEIGHBOUR_HEARTS.indexOf(gifts)+1;
 if(!heart)return {neighbour:key,gifts,hearts:status.hearts};
 const reward=neighbourReward(state,heart);state.coins+=reward.coins;if(reward.diamonds)state.diamonds+=reward.diamonds;
 const decor=reward.decor?giftDecor(state,who.decor,1):null;
 return {neighbour:key,gifts,hearts:heart,heart,coins:reward.coins,diamonds:reward.diamonds,...(decor?{decor:who.decor}:{})};
}
// The Warehouse (22 Oct 2026, the owner's plan: plan-warehouse/voorstel.md with his choices). Everything a farm keeps in storage takes one
// place a piece: crops, goods, village goods, heirlooms and season crops (every key of ITEMS in state.inventory). Coins, diamonds, seed
// packets, boosts, fish, looks and pets are no items and take no place. The rule, as the screen says it: when the Warehouse is full,
// bringing things in waits (a ripe crop stays on its field, a finished batch waits in its building); nothing is ever lost, and selling and
// using goods always work, so the Market is the way out.
// - What waits while it is full: a harvest by hand ('field' harvest), a sweep's harvest ('fields': it stops at full, the fields harvested
//   so far stay harvested), 'collect' and 'collect_all' (also the village's places and the Village Fields), the Seed Lab's 'lab_collect',
//   and starting the tractor jobs that bring crops in (its Harvest job and the night shift). The check is made once, before the action:
//   one action may go over the line (a harvest with Double harvest, a Factory batch of 20, a collect-all), so a field or batch is never split.
// - What always arrives, also above the line: rewards (quests, challenges, the passes, level rewards, events, family orders), purchases,
//   family and admin gifts, chores, a helping hand, pets, the village carts and a night shift already running (settleShift).
// - Capacity (option C, the tight one; 24 Oct 2026, the owner picked option 2: level 1 holds 750 and every step adds at least 300 places, same prices): levels 1-10 with coins only, then levels 11-15 from farm level 108/120/140/160/180 with coins and
//   the master steps' tools, planks and stone (as the farm's buildings past 10). The Buildings discount voucher halves an upgrade.
// - Saved as state.warehouse = {level}, not in BUILDINGS (old pages throw on a building key they do not know). A farm without one (every
//   farm from before, and a new one) starts on the lowest level that holds its stock and a quarter more, as high as its farm level
//   allows: nobody loses anything, and a farm that holds more than even that keeps it all but brings nothing in before it sells.
export const WAREHOUSE_CAPACITY=Object.freeze([750,1050,1350,1650,1950,2250,2550,2850,3150,3450,3850,4250,4650,5150,5650]);
export const WAREHOUSE_MAX_LEVEL=10,WAREHOUSE_TOP_LEVEL=WAREHOUSE_CAPACITY.length,WAREHOUSE_START_ROOM=1.25,WAREHOUSE_NEAR_FULL=.9,WAREHOUSE_XP=15;
// What the upgrade TO each level costs: index 0 is the upgrade to level 2.
export const WAREHOUSE_COSTS=Object.freeze([20000,48000,80000,140000,220000,340000,520000,800000,1200000]);
// Levels 11-15: the farm level each needs, its coins and the master steps' goods (MASTER_UPGRADES).
export const WAREHOUSE_MASTER=Object.freeze([3000000,4000000,5200000,6800000,8800000].map((coins,i)=>Object.freeze({level:MASTER_UPGRADES[i].level,coins,materials:MASTER_UPGRADES[i].materials})));
export const storedCount=state=>Object.keys(ITEMS).reduce((sum,key)=>{const n=state.inventory?.[key];return sum+(Number.isFinite(n)&&n>0?Math.floor(n):0);},0);
const warehouseLevelOf=state=>{const n=state.warehouse?.level;return Number.isInteger(n)?Math.max(1,Math.min(WAREHOUSE_TOP_LEVEL,n)):1;};
export const warehouseLevel=warehouseLevelOf;
export const warehouseCapacity=(state,level=warehouseLevelOf(state))=>WAREHOUSE_CAPACITY[Math.max(1,Math.min(WAREHOUSE_TOP_LEVEL,level))-1];
export const warehouseFull=state=>storedCount(state)>=warehouseCapacity(state);
export const warehouseNearFull=state=>storedCount(state)>=Math.ceil(warehouseCapacity(state)*WAREHOUSE_NEAR_FULL);
// The highest level this farm's level allows: 10, and one more at each master step's farm level.
export const warehouseTopFor=state=>WAREHOUSE_MAX_LEVEL+WAREHOUSE_MASTER.filter(step=>levelOf(state)>=step.level).length;
// The level a farm starts on: 1 for every farm (22 Oct 2026, the owner: "zet iedereen op lvl 1"; the first release started each farm on
// the lowest level that held its stock and a quarter more). A farm with more than level 1 holds keeps it all, but sells before it brings in.
export function warehouseStartLevel(state){return 1;}
export function warehouseFullText(state){return `Warehouse full (${storedCount(state)} / ${warehouseCapacity(state)}). Sell or use something to bring in more.`;}
function assertWarehouseRoom(state){if(warehouseFull(state))throw new Error(warehouseFullText(state));}
// The next upgrade: {level (the one it reaches), capacity, coins, materials, farmLevel (needed), voucher}, or null at the top.
export function warehouseUpgrade(state){
 const level=warehouseLevelOf(state);if(level>=WAREHOUSE_TOP_LEVEL)return null;
 const voucher=state.boosts?.upgradeCredits>0,half=n=>voucher?Math.ceil(n/2):n,master=level>=WAREHOUSE_MAX_LEVEL?WAREHOUSE_MASTER[level-WAREHOUSE_MAX_LEVEL]:null;
 return {level:level+1,capacity:WAREHOUSE_CAPACITY[level],added:WAREHOUSE_CAPACITY[level]-WAREHOUSE_CAPACITY[level-1],coins:half(master?master.coins:WAREHOUSE_COSTS[level-1]),
  materials:Object.fromEntries(Object.entries(master?.materials??{}).map(([k,n])=>[k,half(n)])),farmLevel:master?.level??1,voucher};
}
// expectedCost: the coins the card showed (an older page sends none). Never more is charged; a price that changed asks to look again.
export function upgradeWarehouse(state,expectedCost){
 const next=warehouseUpgrade(state);
 if(!next)throw new Error('Your Warehouse is fully upgraded.');
 if(expectedCost!==undefined&&expectedCost!==next.coins)throw new Error('The price has changed. Look at the upgrade again.');
 if(levelOf(state)<next.farmLevel)throw new Error(`Reach level ${next.farmLevel} to upgrade your Warehouse to level ${next.level}.`);
 if(state.coins<next.coins)throw new Error(`You need ${next.coins} coins for this upgrade.`);
 const missing=Object.entries(next.materials).filter(([key,n])=>(state.inventory[key]??0)<n);
 if(missing.length)throw new Error(`Make the goods first: ${missing.map(([key,n])=>`${n} ${ITEMS[key].name}`).join(', ')}.`);
 state.coins-=next.coins;for(const [key,n] of Object.entries(next.materials))state.inventory[key]-=n;
 state.warehouse={level:next.level};
 state.stats.upgrades++;state.stats.warehouse_upgrades=(state.stats.warehouse_upgrades??0)+1;state.xp+=WAREHOUSE_XP;
 if(next.voucher)state.boosts.upgradeCredits--;
 return {level:next.level,capacity:next.capacity,cost:next.coins,materials:next.materials};
}
// A saved Warehouse as the rules expect it; a farm without one starts on its level (above).
function normalizeWarehouse(state){
 const level=state.warehouse?.level;
 state.warehouse={level:Number.isInteger(level)&&level>=1?Math.min(WAREHOUSE_TOP_LEVEL,level):warehouseStartLevel(state)};
}
export function upgradeSilo(state){
 if(state.siloLevel>=5)throw new Error('Your silo research is complete.');const cost=SILO_COSTS[state.siloLevel];if(state.coins<cost)throw new Error(`You need ${cost} coins for this research.`);
 state.coins-=cost;state.siloLevel++;state.stats.silo_upgrades=(state.stats.silo_upgrades??0)+1;state.xp+=20;return {level:state.siloLevel,cost};
}
// The Fishing pond (11 Oct 2026, part C, with the owner's answers): a game for the waits, at the farm's own pond from level 4.
// - Casts: 5 at the start, then a new one every 20 minutes, up to 5 waiting (77 a day at most, so no other cap). A cast is used only when
//   a fish is landed or let go: one that slips off or is missed stays in the pond for the next try, so it costs time, never a cast.
// - Every fish, its kind and its weight, is fixed in advance: the first three always (a Minnow, a Perch, a Carp), then from the farm's
//   own seed (rookieUntil, written once by the server when the farm was made) and the fish's number. So the screen shows the fish the
//   server pays, the server only checks the casts, the number and the pace, and the most a cheat can get is what a good farmer gets: a
//   perfect catch (the fish never left the green) adds a fifth to the coins, and that is the only thing the server takes on trust.
// - Pay: coins by kind, weight and level, and 2 to 20 XP; the first of each kind pays three times its coins and 10 XP more. "Today's
//   fish", one of the five common kinds (by the UTC day, with the daily tasks), pays double. Old Whiskers, the pond's legend, is rare,
//   but fish 120 is him for a farm that never landed him (and 240, and so on, should he be let go).
// - The fish book keeps the heaviest of each kind; all 8 pay 25 diamonds, once. No items and no diamonds per fish; nothing reaches the
//   Market, orders or offers. Every catch is a line in the farm's log (player-log.js).
// - Page two (11 Oct 2026, the owner's call): from level 20, 8 more kinds swim in the same pond and fill a second page of the book;
//   all 16 kinds pay 50 diamonds more, once (75 in all). Below level 20 nothing changes: the same 8 kinds, as often as before. Today's
//   fish stays one of page one's five common kinds at every level (the review: a day's fish that changed at the farm's first fish at level
//   20 could not be understood, and a rare kind never pays double).
export const POND_START_CASTS=5,POND_MAX_CASTS=5,POND_REFILL_MS=20*60000,POND_MIN_GAP_MS=3500,POND_PERFECT=.2,POND_DAY_FACTOR=2,POND_NEW_FISH_COINS=2,POND_NEW_FISH_XP=10,POND_LEGEND_BY=120,POND_BOOK_DIAMONDS=25;
export const POND_PAGE_TWO_LEVEL=20,POND_BOOK2_DIAMONDS=50,POND_STURGEON_BY=60;
// A full fish book at the pond: a new cast every 15 minutes there (waterRefill, 17 Oct 2026).
export const POND_BOOK_REFILL_MS=15*60000;
// chance (%) below level 20, chance20 (%) from level 20, weight (kg, from-to), coins and XP, and the reel (pond-reel.js): the strike
// window (s), the green zone (% of the bar), how fast the fish moves (bar/s), how fast the catch fills in the green and drains outside
// it (%/s), and how it fights. page: the page of the fish book. The reel's values were tuned on 11 Oct 2026 with simulated players (a
// quick one, a casual one, a slow one and one who never presses): the plan's first values let every player land the three small kinds and
// almost nobody a Golden carp or Old Whiskers. Now a slow player lands nearly every common fish and most rare ones within three tries, and
// doing nothing lands no big fish. To be tuned further with the owner. Page two's kinds were tuned the same way (tests/fishing-ui.test.mjs).
// From level 20 the 16 kinds share the pond: each of the first 8 comes less often, and a cast pays on average what it paid before
// (coins within 1%, XP a little less; tests/fishing-page-two.test.mjs), so page two is something to collect, not a raise.
export const FISH=Object.freeze(Object.fromEntries(Object.entries({
 minnow:{name:'Minnow',page:1,chance:30,chance20:23.3,kg:[.05,.2],coins:4,xp:2,strike:1.2,zone:36,speed:20,fill:28,drain:12,fight:'drift'},
 perch:{name:'Perch',page:1,chance:22,chance20:12,kg:[.2,.9],coins:6,xp:3,strike:1,zone:32,speed:30,fill:22,drain:12,fight:'hops'},
 roach:{name:'Roach',page:1,chance:18,chance20:10,kg:[.3,1.2],coins:7,xp:3,strike:1,zone:32,speed:30,fill:22,drain:12,fight:'steady'},
 carp:{name:'Carp',page:1,chance:14,chance20:7,kg:[1.5,6],coins:12,xp:5,strike:.9,zone:28,speed:32,fill:17,drain:13,fight:'pulls'},
 tench:{name:'Tench',page:1,chance:9,chance20:5,kg:[1,3.5],coins:12,xp:5,strike:.9,zone:28,speed:30,fill:17,drain:13,fight:'stopgo'},
 pike:{name:'Pike',page:1,chance:5,chance20:2.5,kg:[2,8],coins:20,xp:8,strike:.7,zone:24,speed:45,fill:15,drain:13,fight:'darts'},
 goldencarp:{name:'Golden carp',page:1,chance:1.8,chance20:1.3,kg:[1,4],coins:40,xp:12,strike:.65,zone:24,speed:42,fill:14,drain:13,fight:'erratic'},
 whiskers:{name:'Old Whiskers',page:1,chance:.2,chance20:.2,kg:[9,15],coins:120,xp:20,strike:.6,zone:22,speed:36,fill:11,drain:11,fight:'phases'},
 rudd:{name:'Rudd',page:2,chance:0,chance20:12,kg:[.1,.8],coins:5,xp:2,strike:1.1,zone:32,speed:28,fill:24,drain:12,fight:'hops'},
 bream:{name:'Bream',page:2,chance:0,chance20:9,kg:[.4,3.5],coins:7,xp:3,strike:1,zone:30,speed:26,fill:20,drain:12,fight:'steady'},
 eel:{name:'Eel',page:2,chance:0,chance20:4.5,kg:[.3,2.5],coins:10,xp:4,strike:.8,zone:28,speed:34,fill:17,drain:13,fight:'erratic'},
 trout:{name:'Rainbow trout',page:2,chance:0,chance20:4,kg:[.4,3],coins:11,xp:4,strike:.8,zone:28,speed:38,fill:17,drain:13,fight:'darts'},
 barbel:{name:'Barbel',page:2,chance:0,chance20:4,kg:[1,5],coins:11,xp:4,strike:.85,zone:28,speed:32,fill:16,drain:13,fight:'pulls'},
 zander:{name:'Zander',page:2,chance:0,chance20:2.5,kg:[1,7],coins:18,xp:7,strike:.7,zone:24,speed:40,fill:15,drain:13,fight:'stopgo'},
 koi:{name:'Koi',page:2,chance:0,chance20:2.5,kg:[1,5],coins:32,xp:10,strike:.65,zone:24,speed:40,fill:14,drain:13,fight:'erratic'},
 sturgeon:{name:'Sturgeon',page:2,chance:0,chance20:.2,kg:[10,25],coins:120,xp:20,strike:.6,zone:22,speed:34,fill:11,drain:11,fight:'phases'}
}).map(([key,f])=>[key,Object.freeze({...f,kg:Object.freeze(f.kg)})])));
// The fish book's two pages, in the book's order (the commonest first).
export const FISH_PAGES=Object.freeze([1,2].map(page=>Object.freeze(Object.keys(FISH).filter(key=>FISH[key].page===page))));
export const POND_FIRST_FISH=Object.freeze([['minnow',.11],['perch',.42],['carp',2.35]]);
const POND_COMMON=Object.freeze(['minnow','perch','roach','carp','tench']);
export const todaysFish=(now=Date.now())=>POND_COMMON[dayNumber(now)%POND_COMMON.length];
// The village lake (12 Oct 2026, part D, with the owner's answers): World II's fishing, from the rowboat in the middle of the village
// lake, from level 100. The pond's game and rules with the lake's own casts (5, then one every 20 minutes, up to 5: 77 a day on top of the
// pond's 77), its own 20 kinds on two pages, its own book (35 diamonds for page one, 65 more for all 20) and much higher coins: the same
// coin rule on bases about 7.6 times the pond's, so a cast is about 4 minutes of a steady farmer's income at every level (about 1,019
// coins at level 100, the pond 134). XP is small and flat (about 6 to 7 a cast): it must not grow with the level, or World II's pace
// moves. Page two (from level 120) moves a cast's average base by +1.4%: something to collect, not a raise. Old Granite, page one's
// legend, is certain by lake fish 120 (Old Whiskers' rule); the Glacier Ghost, page two's, within the first 60 lake fish from level 120
// (the sturgeon's rule, with its tie rule). Kept apart from FISH on purpose: six places count that table, and the pond's whole book
// would ask for 36 kinds. No lake quests or leaderboard yet (after a week of data), but the lake counts on its own from day one
// (stats.lake_fish, lake_fish_coins, lake_fish_perfect, lake_fish_released), so they can come without touching saves.
// The reel's values start from the pond fish of the same rarity and were tuned on 12 Oct 2026 with the pond's simulated players
// (tests/lake-balance.test.mjs): a slow player lands nearly every common and most rare lake fish within three tries, doing nothing lands
// no big one, and the big ones (Huchen, Lake trout, Salmon, Marble trout and both legends) pull a little longer.
export const LAKE_PAGE_TWO_LEVEL=120,LAKE_BOOK_DIAMONDS=35,LAKE_BOOK2_DIAMONDS=65,LAKE_LEGEND_BY=120,LAKE_GHOST_BY=60;
// chance (%) at levels 100 to 119, chance120 (%) from level 120; the rest as in FISH.
export const LAKE_FISH=Object.freeze(Object.fromEntries(Object.entries({
 bleak:{name:'Bleak',page:1,chance:24,chance120:12,kg:[.03,.12],coins:30,xp:4,strike:1.2,zone:36,speed:22,fill:28,drain:12,fight:'drift'},
 chub:{name:'Chub',page:1,chance:18,chance120:9.5,kg:[.5,4],coins:45,xp:5,strike:1,zone:32,speed:30,fill:22,drain:12,fight:'steady'},
 whitefish:{name:'Whitefish',page:1,chance:15,chance120:8,kg:[.5,4],coins:50,xp:5,strike:1,zone:32,speed:30,fill:22,drain:12,fight:'hops'},
 nase:{name:'Nase',page:1,chance:13,chance120:7,kg:[.4,2.5],coins:60,xp:6,strike:.95,zone:30,speed:30,fill:20,drain:12,fight:'steady'},
 grayling:{name:'Grayling',page:1,chance:11,chance120:6,kg:[.3,2.5],coins:65,xp:6,strike:.95,zone:30,speed:32,fill:20,drain:12,fight:'hops'},
 browntrout:{name:'Brown trout',page:1,chance:9,chance120:5,kg:[.5,8],coins:90,xp:8,strike:.9,zone:28,speed:32,fill:17,drain:13,fight:'pulls'},
 char:{name:'Arctic char',page:1,chance:5.3,chance120:3.3,kg:[.5,6],coins:120,xp:10,strike:.75,zone:26,speed:40,fill:15,drain:13,fight:'darts'},
 burbot:{name:'Burbot',page:1,chance:2.5,chance120:1.6,kg:[1,12],coins:220,xp:15,strike:.7,zone:26,speed:34,fill:15,drain:13,fight:'stopgo'},
 huchen:{name:'Huchen',page:1,chance:2,chance120:1.3,kg:[5,35],coins:360,xp:20,strike:.65,zone:24,speed:40,fill:11,drain:12,fight:'pulls'},
 oldgranite:{name:'Old Granite',page:1,chance:.2,chance120:.2,kg:[25,45],coins:1100,xp:40,strike:.6,zone:22,speed:36,fill:10,drain:10,fight:'phases'},
 bullhead:{name:'Bullhead',page:2,chance:0,chance120:10,kg:[.02,.15],coins:25,xp:4,strike:1.1,zone:34,speed:22,fill:26,drain:12,fight:'drift'},
 vendace:{name:'Vendace',page:2,chance:0,chance120:9,kg:[.05,.4],coins:35,xp:5,strike:1.05,zone:32,speed:28,fill:24,drain:12,fight:'hops'},
 ide:{name:'Ide',page:2,chance:0,chance120:8,kg:[.5,3.5],coins:45,xp:6,strike:1,zone:30,speed:28,fill:20,drain:12,fight:'steady'},
 goldenorfe:{name:'Golden orfe',page:2,chance:0,chance120:5,kg:[.4,3],coins:60,xp:8,strike:.9,zone:28,speed:32,fill:18,drain:13,fight:'stopgo'},
 brooktrout:{name:'Brook trout',page:2,chance:0,chance120:5,kg:[.3,3],coins:65,xp:8,strike:.85,zone:28,speed:36,fill:17,drain:13,fight:'darts'},
 laketrout:{name:'Lake trout',page:2,chance:0,chance120:3.2,kg:[2,20],coins:100,xp:12,strike:.8,zone:28,speed:32,fill:15,drain:12,fight:'pulls'},
 salmon:{name:'Salmon',page:2,chance:0,chance120:2.4,kg:[3,25],coins:130,xp:14,strike:.75,zone:26,speed:40,fill:13,drain:12,fight:'pulls'},
 goldentrout:{name:'Golden trout',page:2,chance:0,chance120:1.8,kg:[.3,2.5],coins:200,xp:18,strike:.65,zone:24,speed:40,fill:14,drain:13,fight:'erratic'},
 marbletrout:{name:'Marble trout',page:2,chance:0,chance120:1.5,kg:[3,22],coins:350,xp:25,strike:.62,zone:24,speed:36,fill:12,drain:12,fight:'pulls'},
 glacierghost:{name:'Glacier Ghost',page:2,chance:0,chance120:.2,kg:[30,60],coins:1100,xp:40,strike:.6,zone:22,speed:34,fill:10,drain:10,fight:'phases'}
}).map(([key,f])=>[key,Object.freeze({...f,kg:Object.freeze(f.kg)})])));
export const LAKE_FISH_PAGES=Object.freeze([1,2].map(page=>Object.freeze(Object.keys(LAKE_FISH).filter(key=>LAKE_FISH[key].page===page))));
// The first three lake fish: a Bleak, a Chub and a Brown trout (the first real fight). Today's fish is one of page one's five common
// kinds at every level, by the UTC day like the pond's.
export const LAKE_FIRST_FISH=Object.freeze([['bleak',.07],['chub',1.35],['browntrout',2.1]]);
const LAKE_COMMON=Object.freeze(['bleak','chub','whitefish','nase','grayling']);
export const lakeTodaysFish=(now=Date.now())=>LAKE_COMMON[dayNumber(now)%LAKE_COMMON.length];
export const lakeOpen=state=>LAKE_OPEN&&levelOf(state)>=LAKE_LEVEL;
// All 36 kinds in one list, for what shows any fish (the pictures, the reel, the 3D fish, the log). No lake kind has a farm kind's name.
export const ALL_FISH=Object.freeze({...FISH,...LAKE_FISH});
// The two waters (12 Oct 2026): what the steps below need to know of one. key: its save key (state.pond, state.lake, both top level);
// action: its farm action; fish, pages, first, common, today: its kinds, the book's pages, the first three fish, Today's five and
// Today's fish; salt: its seed's salt (so lake fish 7 is not pond fish 7; the same farm seed); late: the chance from page two on;
// legend, legendBy, giant, giantBy: the legends' rules; page2Level, book, book2: page two and the book's diamonds; open, closed: its gate
// and the refusal; changed: another tab's refusal; stats: its counters. The pond's names (pondFish, landFish, ...) stay as wrappers with
// exactly the results they had (tests/lake.test.mjs compares every pond fish with fe636fc).
export const POND_WATER=Object.freeze({key:'pond',action:'fish',fullRefill:POND_BOOK_REFILL_MS,fish:FISH,pages:FISH_PAGES,first:POND_FIRST_FISH,common:POND_COMMON,today:todaysFish,salt:'pond',late:'chance20',
 legend:'whiskers',legendBy:POND_LEGEND_BY,giant:'sturgeon',giantBy:POND_STURGEON_BY,page2Level:POND_PAGE_TWO_LEVEL,book:POND_BOOK_DIAMONDS,book2:POND_BOOK2_DIAMONDS,
 open:state=>featureUnlocked(state,'fishing'),closed:()=>POND_OPEN?featureUnlockHint('fishing'):'The fishing pond is not open yet.',changed:'Your pond changed in another tab.',
 stats:Object.freeze({fish:'fish',coins:'fish_coins',perfect:'fish_perfect',released:'fish_released'})});
export const LAKE_WATER=Object.freeze({key:'lake',action:'lake_fish',fish:LAKE_FISH,pages:LAKE_FISH_PAGES,first:LAKE_FIRST_FISH,common:LAKE_COMMON,today:lakeTodaysFish,salt:'lake',late:'chance120',
 legend:'oldgranite',legendBy:LAKE_LEGEND_BY,giant:'glacierghost',giantBy:LAKE_GHOST_BY,page2Level:LAKE_PAGE_TWO_LEVEL,book:LAKE_BOOK_DIAMONDS,book2:LAKE_BOOK2_DIAMONDS,
 open:lakeOpen,closed:()=>LAKE_OPEN?`Reach level ${LAKE_LEVEL} to fish at the village lake.`:'The village lake is not open yet.',changed:'Your lake changed in another tab.',
 stats:Object.freeze({fish:'lake_fish',coins:'lake_fish_coins',perfect:'lake_fish_perfect',released:'lake_fish_released'})});
export const WATERS=Object.freeze({pond:POND_WATER,lake:LAKE_WATER});
// Fish number n swims in the water of all its kinds once the farm has said so: the farm's first fish there at the water's page-two level
// or later marks the spot (page2At, its number; it is still one of page one itself), every fish after it may be any kind. So a site that
// knows page two and a farm-api that does not yet (or the other way round) never disagree about a fish.
export const waterPageTwo=(water,state,n=state?.[water.key]?.n??0)=>Number.isSafeInteger(state?.[water.key]?.page2At)&&n>state[water.key].page2At;
// The farm's own fish sequence per water (mulberry32 over the farm's seed, the water's salt and the fish's number): the same in the
// browser and in farm-api. Old farms without a seed share one sequence per water, as they did on the pond (harmless).
function waterRandom(water,state,n){
 let a=(calendarHash(`${water.salt}:${Number.isSafeInteger(state.rookieUntil)?state.rookieUntil:0}`)^Math.imul(n+1,0x9E3779B1))>>>0;
 return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
// Page two's giant (the sturgeon, the Glacier Ghost) is very rare, but a farm's 60th fish there from page two's level is the giant if it
// never landed one (and the 120th, and so on, should it be let go). Fish 120, 240, ... are page one's legend's own (Old Whiskers, Old
// Granite): when the 60th falls on one of them, the 59th is the giant instead.
function giantDue(water,state,n){
 const w=state[water.key];
 if(!waterPageTwo(water,state,n)||w?.best?.[water.giant]>0)return false;
 const k=n-w.page2At+1;   // the fish's count from page two's level: the first fish there is 1
 return k%water.giantBy===0&&(n+1)%water.legendBy!==0||k%water.giantBy===water.giantBy-1&&(n+2)%water.legendBy===0;
}
// Fish number n (from 0) of a water: its kind, its weight and where that weight sits between the kind's lightest and heaviest (0 to 1).
// Weights lean light (u^1.6), so a new record stays possible for a long time. Before page two the kinds by `chance`, from it by the
// water's late chance (the same random numbers, another column).
export function waterFish(water,state,n){
 const table=water.fish,fish=(species,kg)=>{const [lo,hi]=table[species].kg;return {species,kg,share:Math.min(1,Math.max(0,(kg-lo)/(hi-lo)))};};
 if(n<water.first.length)return fish(...water.first[n]);
 const random=waterRandom(water,state,n),roll=random()*100,u=random(),two=waterPageTwo(water,state,n);
 let species=water.legend;
 if(!(state[water.key]?.best?.[water.legend]>0)&&(n+1)%water.legendBy===0)species=water.legend;
 else if(giantDue(water,state,n))species=water.giant;
 else{let sum=0;for(const [key,f] of Object.entries(table)){sum+=two?f[water.late]:f.chance;if(roll<sum){species=key;break;}}}
 const [lo,hi]=table[species].kg;return fish(species,Math.round((lo+(hi-lo)*u**1.6)*100)/100);
}
// How many casts wait at a water, and when the next one comes (0 when it is full). A farm that never fished there has it full.
export function waterCasts(water,state,now=Date.now()){
 const p=state[water.key];if(!p)return {casts:POND_START_CASTS,nextAt:0};
 const ms=waterRefill(water,state),gained=Math.max(0,Math.floor((now-p.castsAt)/ms)),casts=Math.min(POND_MAX_CASTS,p.casts+gained);
 return {casts,nextAt:casts>=POND_MAX_CASTS?0:p.castsAt+(gained+1)*ms};
}
// The minutes to a new cast: 20, and 15 at the farm's pond once its whole fish book is caught (17 Oct 2026, the owner's pick 4a: the full
// book gives something that lasts). The lake keeps 20 (fullRefill only on the pond: a lake cast is worth about 4 minutes of income, and
// 96 a day would be more than a quarter of a day's coins). The time already counted towards the next cast stays counted.
export const waterRefill=(water,state)=>water.fullRefill&&waterBook2Done(water,state)?water.fullRefill:POND_REFILL_MS;
// Spending from a full water starts the 20 minutes from now; otherwise the time already counted towards the next cast is kept.
function spendCast(p,now,ms){
 const gained=Math.max(0,Math.floor((now-p.castsAt)/ms)),had=Math.min(POND_MAX_CASTS,p.casts+gained);
 p.castsAt=had>=POND_MAX_CASTS?now:p.castsAt+gained*ms;p.casts=had-1;
}
export function waterCoins(water,state,fish,perfect,now=Date.now()){
 const f=water.fish[fish.species];
 return Math.round(f.coins*(.8+.4*fish.share)*(1+levelOf(state)/8)*(water.today(now)===fish.species?POND_DAY_FACTOR:1)*(perfect?1+POND_PERFECT:1));
}
// Page one and the whole book of a water.
export const waterBookDone=(water,state)=>water.pages[0].every(key=>state[water.key]?.best?.[key]>0);
export const waterBook2Done=(water,state)=>Object.keys(water.fish).every(key=>state[water.key]?.best?.[key]>0);
// The book's second page shows from page two's level; below it nothing of page two is seen.
export const waterPageTwoOpen=(water,state)=>water.open(state)&&levelOf(state)>=water.page2Level;
// One fish at a water: n is the number the screen fished (the water's own count: another tab may have fished meanwhile), landed whether
// it came in or was let go, perfect whether it stayed in the green all the way. The client sends no amount: everything paid comes from
// here, and the kind and weight from the farm's seed and the number.
export function castWater(water,state,n,landed,perfect,now=Date.now()){
 if(!water.open(state))throw new Error(water.closed());
 if(typeof landed!=='boolean'||typeof perfect!=='boolean')throw new Error('Choose whether you landed the fish.');
 if(waterCasts(water,state,now).casts<1)throw new Error(`No casts left. A new cast comes every ${waterRefill(water,state)/60000} minutes.`);
 if(!Number.isInteger(n)||n!==(state[water.key]?.n??0))throw new Error(water.changed);
 // Two fish may come close together (a slow connection can deliver them so); a third within POND_MIN_GAP_MS of the first cannot.
 if(state[water.key]&&now-state[water.key].prevAt<POND_MIN_GAP_MS)throw new Error('Give the line a moment.');
 const fish=waterFish(water,state,n),p=state[water.key]??={firstAt:now,n:0,casts:POND_START_CASTS,castsAt:now,lastAt:0,prevAt:0,best:{}},stat=water.stats;
 // The farm's first fish there at page two's level or later (this one, still of page one) marks where page two starts (waterPageTwo).
 if(p.page2At===undefined&&levelOf(state)>=water.page2Level)p.page2At=n;
 spendCast(p,now,waterRefill(water,state));p.n=n+1;p.prevAt=p.lastAt;p.lastAt=now;
 if(!landed){state.stats[stat.released]=(state.stats[stat.released]??0)+1;return {released:true,n,casts:waterCasts(water,state,now)};}
 const first=!(p.best[fish.species]>0),record=!first&&fish.kg>p.best[fish.species],today=water.today(now)===fish.species;
 const base=waterCoins(water,state,fish,perfect,now),coins=base+(first?POND_NEW_FISH_COINS*base:0),xp=water.fish[fish.species].xp+(first?POND_NEW_FISH_XP:0);
 if(first||record)p.best[fish.species]=fish.kg;
 if(first)countCollections(state);
 state.coins+=coins;state.xp+=xp;
 state.stats[stat.fish]=(state.stats[stat.fish]??0)+1;state.stats[stat.coins]=(state.stats[stat.coins]??0)+coins;if(perfect)state.stats[stat.perfect]=(state.stats[stat.perfect]??0)+1;
 // The book's diamonds count as diamonds earned, like every other diamond from play (11 Oct 2026, the review). Page one's for its kinds,
 // then the whole book's (book2: this fish completed the whole book; both at once when its last kind was page one's).
 let diamonds=0;const pay=amount=>{diamonds+=amount;state.diamonds+=amount;state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+amount;};
 if(!p.bookPaid&&waterBookDone(water,state)){p.bookPaid=true;pay(water.book);}
 let book2=false;if(!p.book2Paid&&waterBook2Done(water,state)){p.book2Paid=book2=true;pay(water.book2);}
 return {n,species:fish.species,kg:fish.kg,coins,xp,first,record,perfect,today,diamonds,...(book2?{book2}:{}),casts:waterCasts(water,state,now)};
}
// A saved water as the rules expect it (never made here: a farm that never fished there keeps its shape). Numbers are whole and in range,
// the book holds only the water's own kinds with a real weight; the count and the book survive anything else being wrong. page2At, where
// page two starts, is the number of a fish already cast, or it goes (the next fish at page two's level writes it again).
function normalizeWater(water,state){
 const p=state[water.key];if(p===undefined)return;
 if(!p||typeof p!=='object'||Array.isArray(p)){delete state[water.key];return;}
 const count=(v,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)?Math.min(max,Math.max(0,v)):0;
 for(const key of ['n','castsAt','firstAt','lastAt','prevAt'])p[key]=count(p[key]);p.casts=count(p.casts,POND_MAX_CASTS);
 p.best=Object.fromEntries(Object.entries(p.best&&typeof p.best==='object'&&!Array.isArray(p.best)?p.best:{}).filter(([key,kg])=>Object.hasOwn(water.fish,key)&&Number.isFinite(kg)&&kg>0).map(([key,kg])=>[key,Math.round(kg*100)/100]));
 for(const key of ['bookPaid','book2Paid'])if(p[key]!==undefined&&p[key]!==true)delete p[key];
 if(p.page2At!==undefined&&!(Number.isSafeInteger(p.page2At)&&p.page2At>=0&&p.page2At<p.n))delete p.page2At;
}
// The Fishing pond's own names, as they were (11 Oct 2026): one line each over the shared steps, with exactly the same results.
export const pondPageTwo=(state,n=state?.pond?.n??0)=>waterPageTwo(POND_WATER,state,n);
export const pondFish=(state,n)=>waterFish(POND_WATER,state,n);
export const pondCasts=(state,now=Date.now())=>waterCasts(POND_WATER,state,now);
export const fishCoins=(state,fish,perfect,now=Date.now())=>waterCoins(POND_WATER,state,fish,perfect,now);
// Page one (the 8 kinds, 25 diamonds) and the whole book (all 16 kinds, 50 diamonds more).
export const pondBookDone=state=>waterBookDone(POND_WATER,state);
export const pondBook2Done=state=>waterBook2Done(POND_WATER,state);
// The book's second page shows from level 20 (pond-ui.js); below it nothing of page two is seen.
export const pondPageTwoOpen=state=>waterPageTwoOpen(POND_WATER,state);
export const landFish=(state,n,landed,perfect,now=Date.now())=>castWater(POND_WATER,state,n,landed,perfect,now);
const normalizePond=state=>normalizeWater(POND_WATER,state);
// The village lake's (12 Oct 2026), the same way.
export const lakePageTwo=(state,n=state?.lake?.n??0)=>waterPageTwo(LAKE_WATER,state,n);
export const lakeFish=(state,n)=>waterFish(LAKE_WATER,state,n);
export const lakeCasts=(state,now=Date.now())=>waterCasts(LAKE_WATER,state,now);
export const lakeFishCoins=(state,fish,perfect,now=Date.now())=>waterCoins(LAKE_WATER,state,fish,perfect,now);
export const lakeBookDone=state=>waterBookDone(LAKE_WATER,state);
export const lakeBook2Done=state=>waterBook2Done(LAKE_WATER,state);
export const lakePageTwoOpen=state=>waterPageTwoOpen(LAKE_WATER,state);
export const landLakeFish=(state,n,landed,perfect,now=Date.now())=>castWater(LAKE_WATER,state,n,landed,perfect,now);
const normalizeLake=state=>normalizeWater(LAKE_WATER,state);
// The collections as counts, for the quests (17 Oct 2026): the kinds in each fish book and its legend, and the heirlooms found. They follow
// from the farm itself (pond.best, lake.best, lab.found), so a farm that had them before the quests came can claim them at once, and they
// never go down (a book and the Seed Lab never lose a kind).
function countCollections(state){
 const kinds=water=>Object.keys(state[water.key]?.best??{}).filter(key=>Object.hasOwn(water.fish,key)).length;
 state.stats.fish_kinds=kinds(POND_WATER);state.stats.caught_whiskers=state.pond?.best?.whiskers>0?1:0;
 state.stats.lake_fish_kinds=kinds(LAKE_WATER);state.stats.caught_oldgranite=state.lake?.best?.oldgranite>0?1:0;
 state.stats.heirlooms_found=Array.isArray(state.lab?.found)?state.lab.found.length:0;
}
// The Starter Pack (a welcome offer, see game/payments.js) opens at level 14 (until 5 Oct 2026 also where diamond boosts unlocked): a pack of diamonds is only a shop in the
// way until there is something to spend them on. Then it is there for 7 days. Only the server writes the moment. A farm that is already past
// that level when this is first seen had its moment long ago (unlockedAt 0: never offered again); a farm below it gets its moment on the way up.
// Diamond boosts (and the diamond shop) open at level 10 since 5 Oct 2026; the Starter Pack stays at 14, so farmers who are 10 to 13
// now still get it when they reach 14.
export const STARTER_LEVEL=14;
function stampStarterOffer(state,levelBefore,now){
 if(state.starterOffer!==undefined||levelOf(state)<STARTER_LEVEL)return;
 state.starterOffer={unlockedAt:levelBefore<STARTER_LEVEL?now:0};
}
// The Village tab of the diamond shop (20 Oct 2026, the owner's choices 1A, 2 all five, 3 yes, 4 defaults): time and goods for World II,
// each from its own level; no feature gate (like the market square, each checks its own level). Carts and Landmark supplies are not
// boosts (no boosts_used); the three time-skips count as boosts like finishing one batch or crop (the owner, 20 Oct 2026). Every buy
// counts diamonds_spent through spendDiamonds, so "Spend diamonds" event goals count it. Prices: about 3 diamonds a slot-hour at place
// level 5; a cart's goods at their normal price are worth well under the coin pack per diamond (resold at the Village market on a top
// day with Double earnings they can beat it by a little: the owner kept 40 and 20, 20 Oct 2026). The carts and Landmark supplies always
// ask first; the three time-skips are one tap (public/village-shop-ui.js).
export const PRICES_CHANGED='Prices have changed. Reload the game to see current prices.';
export const VILLAGER_CALLS_PER_DAY=3,LANDMARK_COINS_PER_DIAMOND=500;
export const VILLAGE_SHOP=Object.freeze(Object.fromEntries(Object.entries({   // the tab sorts the cards by price (cheap to dear, the Farmhand in at 150); at the same price, this order
 villager:{name:'Next villager now',level:WORLD_TWO_LEVEL,cost:10,art:'bell'},
 casts:{name:'Five casts now',level:LAKE_LEVEL,cost:10,art:'villagelake'},
 tilecart:{name:'Roof tile cart',level:BUILDING_LEVELS.kiln,cost:20,art:'rooftile',goods:{rooftile:40}},
 boat:{name:'Boat back now',level:BUILDING_LEVELS.pier,cost:30,art:'pier'},
 supplycart:{name:'Supply cart',level:BUILDING_LEVELS.smithy,cost:40,art:'supply-cart',goods:{plank:40,ironbar:10}},
 landmark:{name:'Landmark supplies',level:VILLAGE_LANDMARKS.windpump.level,cost:null,art:null}
}).map(([k,item])=>[k,Object.freeze({...item,...(item.goods?{goods:Object.freeze(item.goods)}:{})})])));
// Villagers called today (state.daily, so it resets at 00:00 UTC by itself; never under state.village: normalizeVillage rebuilds it).
export function villagerCallsUsed(state,now=Date.now()){const d=state.daily,n=d?.villagersCalled;return d?.date===utcDay(now)&&Number.isSafeInteger(n)&&n>0?n:0;}
export const villagerCallsLeft=(state,now=Date.now())=>Math.max(0,VILLAGER_CALLS_PER_DAY-villagerCallsUsed(state,now));
// Goods at their normal price (ITEMS sell), and what a whole landmark's goods cost as Landmark supplies (the wiki's example).
const goodsValue=goods=>Object.entries(goods).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0);
export const landmarkFullCost=id=>Math.ceil(goodsValue(VILLAGE_LANDMARKS[id].materials)/LANDMARK_COINS_PER_DIAMOND);
// The next landmark's missing goods (what is still to hand in after `given`, never the barn) and their price: the value at the goods'
// normal price, added up first and rounded up once. Also before its level or while a brief is open, so the tab can say so.
export function landmarkSuppliesQuote(state){
 if(!worldTwoOpen(state))return null;
 const id=Object.keys(VILLAGE_LANDMARKS).find(k=>!landmarkDone(state,k));if(!id)return null;
 const l=VILLAGE_LANDMARKS[id],given=state.village?.landmarks?.given??{};
 const goods=Object.fromEntries(Object.entries(l.materials).filter(([k,n])=>(given[k]??0)<n).map(([k,n])=>[k,n-(given[k]??0)]));
 const value=goodsValue(goods);
 return {id,name:l.name,art:l.art,level:l.level,coins:l.coins,goods,value,cost:Math.ceil(value/LANDMARK_COINS_PER_DIAMOND)};
}
// One card of the Village tab (and the small diamond button at a wait), in the shape of boostStatus. reason: a short chip with no full
// stop, and the button is off; until and wait ('villager', 'boat' or 'cast'): the countdown chip. board: the villager board it calls (the
// given one, otherwise the waiting board with the latest readyAt: it saves the most). To stay cheap it never makes a villager or a cargo:
// the rare "nothing to ask or carry" is refused by the server without a charge.
export function villageShopStatus(state,id,now=Date.now(),board){
 const item=VILLAGE_SHOP[id];
 const s={id,name:item.name,art:item.art,shown:worldTwoOpen(state)&&levelOf(state)>=item.level,cost:item.cost,reason:'',until:0,wait:null,left:null,board:null,landmark:null,landmarkName:null,coins:null,goods:item.goods?{...item.goods}:null,canBuy:false};
 if(id==='villager'){
  const boards=state.village?.boards??[],waiting=i=>Boolean(boards[i])&&!boards[i].request&&boards[i].readyAt>now;
  let i=Number.isInteger(board)?board:null;
  if(i===null)boards.forEach((b,k)=>{if(waiting(k)&&(i===null||b.readyAt>boards[i].readyAt))i=k;});
  s.board=i;s.left=villagerCallsLeft(state,now);
  if(i!==null&&waiting(i)){s.until=boards[i].readyAt;s.wait='villager';}
  s.reason=!s.left?'None left today':s.wait?'':'No board is waiting';
 }
 if(id==='casts'){const c=waterCasts(LAKE_WATER,state,now);if(c.casts>0)s.reason=`Casts waiting: ${c.casts}`;if(c.nextAt>now){s.until=c.nextAt;s.wait='cast';}}
 if(id==='boat'){
  const boat=state.village?.boat;
  s.reason=!buildingUnlocked(state,'pier')?'Build the Pier first':boat?.cargo?'The boat is at the pier':!(boat?.readyAt>now)?'Waiting for goods it can carry':'';
  if(boat&&!boat.cargo&&boat.readyAt>now){s.until=boat.readyAt;s.wait='boat';}
 }
 if(id==='landmark'){
  const q=landmarkSuppliesQuote(state);
  if(!q)s.shown=false;
  else{Object.assign(s,{cost:q.cost,goods:q.goods,landmark:q.id,landmarkName:q.name,coins:q.coins,art:q.art});
   s.reason=villageBrief(state)?'Build every village place first':levelOf(state)<q.level?`Opens at level ${q.level}`:!q.cost?'Everything is handed in':'';}
 }
 s.canBuy=s.shown&&!s.reason&&state.diamonds>=s.cost;
 return s;
}
// The action for what the screen showed: its price, and its goods where it has them (a stale screen gets PRICES_CHANGED, never another charge).
export function villageShopAction(s){
 if(s.id==='supplycart'||s.id==='tilecart')return {type:'village_cart',cart:s.id,expectedCost:s.cost,expectedGoods:{...s.goods}};
 if(s.id==='boat')return {type:'boat_now',expectedCost:s.cost};
 if(s.id==='villager')return {type:'villager_now',board:s.board,expectedCost:s.cost};
 if(s.id==='casts')return {type:'lake_casts',expectedCost:s.cost};
 return {type:'landmark_supplies',landmark:s.landmark,expectedCost:s.cost,expectedGoods:{...s.goods}};
}
const shortOfDiamonds=cost=>`You need ${cost} diamonds. Earn more from daily gifts and challenges.`;
// The Supply cart and the Roof tile cart: goods into the barn, from the Smithy's and the Kiln's own levels. No cap; never made_*, produced
// or earned (sold later at the Village market they count there, as any village good does).
export function villageCart(state,cart,expectedCost,expectedGoods){
 villageOpen(state);
 if(cart!=='supplycart'&&cart!=='tilecart')throw new Error('Choose a cart.');
 const c=VILLAGE_SHOP[cart];
 if(levelOf(state)<c.level)throw new Error(`Reach level ${c.level} for the ${c.name}.`);
 if(expectedCost!==c.cost||!sameGoods(expectedGoods,c.goods))throw new Error(PRICES_CHANGED);
 if(state.diamonds<c.cost)throw new Error(shortOfDiamonds(c.cost));
 spendDiamonds(state,c.cost);for(const [k,n] of Object.entries(c.goods))state.inventory[k]=(state.inventory[k]??0)+n;
 state.stats.village_carts=(state.stats.village_carts??0)+1;
 return {cart,goods:{...c.goods},cost:c.cost};
}
// Boat back now: the boat is back at the pier at once, with the cargo it would have brought (the next running number). Made before the
// charge, so a boat with nothing to carry costs nothing. trips, week and paid stay as they are: the week's diamond trips still count.
export function boatNow(state,expectedCost,now=Date.now()){
 villageOpen(state);
 if(!buildingUnlocked(state,'pier'))throw new Error('Build the Pier first.');
 const boat=state.village.boat,waits='The boat comes as soon as the village makes goods it can carry.',cost=VILLAGE_SHOP.boat.cost;
 if(boat.cargo)throw new Error('The boat is at the pier.');
 if(!(boat.readyAt>now))throw new Error(waits);
 if(expectedCost!==cost)throw new Error(PRICES_CHANGED);
 const cargo=boatCargo(state,boat.serial+1);if(!cargo)throw new Error(waits);
 if(state.diamonds<cost)throw new Error(shortOfDiamonds(cost));
 spendDiamonds(state,cost);boat.serial++;boat.cargo=cargo;boat.readyAt=now;
 state.stats.boat_calls=(state.stats.boat_calls??0)+1;state.stats.boosts_used=(state.stats.boosts_used??0)+1;
 return {cargo,cost};
}
// Next villager now: an empty board that waits gets its next villager at once, VILLAGER_CALLS_PER_DAY a day (UTC). Not a Help: it never
// counts village_requests, the market week or the daily challenge.
export function villagerNow(state,board,expectedCost,now=Date.now()){
 villageOpen(state);
 const v=state.village,b=Number.isInteger(board)?v.boards[board]:undefined;if(!b)throw new Error('Choose a villager.');
 if(b.request)throw new Error('A villager is already waiting there.');
 const taken=new Set(v.boards.flatMap(x=>x.request?Object.keys(x.request.input):[]));
 const request=b.readyAt>now?villageRequest(state,board,v.serial+1,taken):null;
 if(!request)throw new Error('Pack lunches in the Farm Kitchen and a villager will come.');
 const used=villagerCallsUsed(state,now),cost=VILLAGE_SHOP.villager.cost;
 if(used>=VILLAGER_CALLS_PER_DAY)throw new Error(`You can call ${VILLAGER_CALLS_PER_DAY} villagers a day. More tomorrow.`);
 if(expectedCost!==cost)throw new Error(PRICES_CHANGED);
 if(state.diamonds<cost)throw new Error(shortOfDiamonds(cost));
 spendDiamonds(state,cost);v.serial++;b.request=request;b.readyAt=now;state.daily.villagersCalled=used+1;
 state.stats.villager_calls=(state.stats.villager_calls??0)+1;state.stats.boosts_used=(state.stats.boosts_used??0)+1;
 return {board,request,villager:VILLAGERS[request.villager].name,cost,left:VILLAGER_CALLS_PER_DAY-used-1};
}
// Five casts now: only with no cast left at the lake (the count of now, never the saved one: a save holds casts 0 after every cast).
// The fish order and the gap between casts stay as they are; the farm pond is not touched.
export function lakeCastsNow(state,expectedCost,now=Date.now()){
 if(!lakeOpen(state))throw new Error(LAKE_WATER.closed());
 if(waterCasts(LAKE_WATER,state,now).casts>0)throw new Error('You still have casts. Fish them first.');
 const cost=VILLAGE_SHOP.casts.cost;
 if(expectedCost!==cost)throw new Error(PRICES_CHANGED);
 if(state.diamonds<cost)throw new Error(shortOfDiamonds(cost));
 spendDiamonds(state,cost);state.lake.casts=POND_MAX_CASTS;state.lake.castsAt=now;
 state.stats.lake_refills=(state.stats.lake_refills??0)+1;state.stats.boosts_used=(state.stats.boosts_used??0)+1;
 return {casts:waterCasts(LAKE_WATER,state,now),cost};
}
// Landmark supplies: everything the open landmark still needs, handed in at once (the whole landmark only, never the barn's goods). It
// does not finish it: paying its coins stays its own tap.
export function landmarkSupplies(state,id,expectedCost,expectedGoods){
 const {l,given}=landmarkStep(state,id),q=landmarkSuppliesQuote(state);
 if(!(q?.cost>0))throw new Error('Everything is handed in. Pay the coins to finish it.');
 if(expectedCost!==q.cost||!sameGoods(expectedGoods,q.goods))throw new Error(PRICES_CHANGED);
 if(state.diamonds<q.cost)throw new Error(shortOfDiamonds(q.cost));
 spendDiamonds(state,q.cost);let units=0;for(const [k,n] of Object.entries(q.goods)){given[k]=(given[k]??0)+n;units+=n;}
 state.stats.landmark_supplies=(state.stats.landmark_supplies??0)+1;
 return {landmark:id,name:l.name,handed:{...q.goods},units,cost:q.cost,ready:state.coins>=l.coins};
}
// The farm's pets (20 Oct 2026, the owner: "doe wel iets leuks"): Rex the dog and Mimi the cat by the Farmhouse, from the start, and Fawn
// the deer in the village, from World II (level 100). Each can be patted once an hour (PET_REST_MS, on the server's clock) for a small find
// and PET_XP: Rex finds PET_DOG_COINS_PER_LEVEL coins for every farm level (about 3 minutes of a steady farmer's income at level 20 and 4 at
// level 100, as much as a lake cast there; 20 a level was twice that, more than the helping hand's whole round of 250 coins an hour from
// level 13), Mimi brings PET_CAT_CROPS of one crop the farm grows (the server picks it), and Fawn PET_DEER_PLANKS planks (World II's
// slowest good, so only 2). A pat counts for no event, challenge or Family Chest (NO_EVENT_ACTIONS; its coins are not stats.earned), only
// for stats.pets_patted. The last pat of each pet is kept in state.pets ({dog,cat,deer}: its time); a farm that never patted one has no
// pets key, and older rules keep the key as it is (normalizeFarm keeps keys it does not know).
export const PET_REST_MS=3600000,PET_XP=5,PET_DOG_COINS_PER_LEVEL=10,PET_CAT_CROPS=3,PET_DEER_PLANKS=2;
export const PETS=Object.freeze({dog:Object.freeze({name:'Rex',world:1}),cat:Object.freeze({name:'Mimi',world:1}),deer:Object.freeze({name:'Fawn',world:2})});
export const petOpen=(state,pet)=>Object.hasOwn(PETS,pet)&&(PETS[pet].world!==2||worldTwoOpen(state));
// How long until a pet can be patted again (0: it can be patted).
export function petRest(state,pet,now=Date.now()){const at=state.pets?.[pet];return Number.isSafeInteger(at)&&at>0?Math.max(0,at+PET_REST_MS-now):0;}
export const petRestText=(pet,ms)=>`Pat ${PETS[pet].name} again in ${Math.max(1,Math.ceil(ms/60000))} min.`;
export const petDogCoins=state=>PET_DOG_COINS_PER_LEVEL*levelOf(state);
function patPet(state,pet,now,random){
 if(!Object.hasOwn(PETS,pet))throw new Error('Choose a pet.');
 if(!petOpen(state,pet))throw new Error(`Reach level ${WORLD_TWO_LEVEL} to travel to the village.`);
 const rest=petRest(state,pet,now);if(rest>0)throw new Error(petRestText(pet,rest));
 const found={pet,name:PETS[pet].name,coins:0,item:null,count:0,xp:PET_XP};
 if(pet==='dog'){found.coins=petDogCoins(state);state.coins+=found.coins;}
 else if(pet==='cat'){const crops=Object.keys(CROPS).filter(k=>cropUnlocked(state,k));found.item=crops[Math.min(crops.length-1,Math.floor(random()*crops.length))]??'wheat';found.count=PET_CAT_CROPS;}
 else{found.item='plank';found.count=PET_DEER_PLANKS;}
 if(found.item)state.inventory[found.item]=(state.inventory[found.item]??0)+found.count;
 state.xp+=PET_XP;state.pets={...state.pets,[pet]:now};
 state.stats.pets_patted=(state.stats.pets_patted??0)+1;
 return found;
}
// A saved state.pets as the rules expect it: only the three pets, each with a real time. Never made here (see above).
function normalizePets(state){
 const p=state.pets;if(p===undefined)return;
 if(!p||typeof p!=='object'||Array.isArray(p)){delete state.pets;return;}
 state.pets=Object.fromEntries(Object.keys(PETS).filter(k=>Number.isSafeInteger(p[k])&&p[k]>0).map(k=>[k,p[k]]));
}
// Your own farmer (21 Oct 2026, the owner: "Doe alle 3"): what they wear is kept in state.farmer, one part id per slot (game/farmer-parts.js).
// A farm that never dressed its farmer has no farmer key and shows the default farmer (farmerOf); older rules keep the key as it is
// (normalizeFarm keeps keys it does not know). Only farmer_wear writes it, after the same check the page makes: known parts that go
// together, only parts My farmer offers, and of the earned ones (nearly all but the skin tones and the basics) only those whose own goal
// this farm reached, read from its own counters and its level (farmerOwned). Nothing is paid, counted or given (NO_EVENT_ACTIONS).
function wearFarmer(state,config){
 const check=validFarmerConfig(config,{owned:farmerOwned(state,{level:levelOf(state)}),offered:true});
 if(!check.ok)throw new Error(/not earned/.test(check.error)?'Earn this first to wear it.':'Choose a farmer.');
 state.farmer=cleanFarmer(config);
 return {farmer:{...state.farmer}};
}
// A saved state.farmer as the rules expect it: a plain object of slots and part ids that go together. Never made here.
function normalizeFarmer(state){
 const f=state.farmer;if(f===undefined)return;
 if(!f||typeof f!=='object'||Array.isArray(f)||!validFarmerConfig(cleanFarmer(f)).ok){delete state.farmer;return;}
 state.farmer=cleanFarmer(f);
}
// Visiting a farm (24 Oct 2026, the owner: "Zorg ook dat je andermans boerderij kan visiten"): what another farmer gets to see, read-only.
// The farm as it stands (its fields and crops, buildings, its own layout, farmer, pets and looks) on a fresh farm's defaults: never its
// coins, diamonds, stock, purchases, invite, sign-in days or first-look notes. farm-api's farm_visit sends it.
export const VISIT_KEYS=Object.freeze(['version','xp','xpOffset','xpCurve','progression','plots','buildings','layout','activities','stall','ranch','giant',
 'pond','lake','farmer','pets','lookFarm','looks','season','warehouse','valley','valleyProjects','estate','depot','fair','visitors','master','lab','mastery',
 'stats','siloLevel','village','improvements','discovered','vipExpiresAt']);
export function visitView(source,now=Date.now()){
 const view=createFarm(now);
 for(const key of VISIT_KEYS)if(source?.[key]!==undefined)view[key]=structuredClone(source[key]);
 // The guide as far as it got (a guide that is not done keeps the screen calm), without the first look's notes.
 if(source?.onboarding){view.onboarding=structuredClone(source.onboarding);delete view.onboarding.firstLook;}
 // Its family's name and emblem fly on the Family Hall; nothing else of the family.
 const f=source?.family;view.family={familyId:f?.familyId??null,unclaimedCount:0,...(f?.familyId&&f.name?{name:f.name,emblem:f.emblem,level:f.level}:{})};
 normalizeFarm(view,now);view.coins=0;view.diamonds=0;
 return view;
}
export function applyFarmAction(state,action,now=Date.now(),random=secureChoreRandom){
 normalizeFarm(state,now);if(!action||typeof action!=='object')throw new Error('Choose a farm action.');
 const beforeXP=state.xp,beforeCoins=state.coins,beforeLevel=levelOf(state);
 const beginnerBefore={harvested:state.stats.harvested,wheat:state.stats.harvest_wheat??0,watered:state.stats.watered,tended:state.stats.tended};
 const result=dispatchFarmAction(state,action,now,random);
 if(action.look)recordFirstLook(state,action.look,now);
 // Coins spent (seeds, buildings, upgrades, fields, research…), for the farm events' "Spend coins" goal (26 Sep 2026).
 const spent=beforeCoins-state.coins;if(spent>0&&!NO_EVENT_ACTIONS.has(action.type))state.stats.coins_spent=(state.stats.coins_spent??0)+spent;
 recordBeginnerAction(state,action,result,beginnerBefore);
 const earnedXP=state.xp-beforeXP;
 if(state.boosts.xpUntil>now&&earnedXP>0){state.xp+=earnedXP;result.xp=(result.xp??earnedXP)+earnedXP;}
 if(state.boosts.coinsUntil>now&&['delivery','depot_load'].includes(action.type)){
  const bonus=state.coins-beforeCoins;if(bonus>0){state.coins+=bonus;state.stats.earned+=bonus;result.coins+=bonus;}
 }
 // After the boosts, so an action's own XP stays its own: the guide step's XP is shown by itself.
 const guideSteps=advanceBeginner(state,now);if(guideSteps.length)result.guide=guideSteps;
 const reward=grantLevelRewards(state,beforeLevel+1);
 if(reward.levels.length)result.levelReward=reward;
 stampStarterOffer(state,beforeLevel,now);
 refreshProgressionDaily(state,now);
 return result;
}
function dispatchFarmAction(state,action,now,random){
 const gates={buy_vip:'boosts',buy_coins:'boosts',daily:'challenges',finish_batch:'boosts',replace_order:'cart',activity_start:'activities',activity_work:'activities',chore:'chores',stall_collect:'stall',stall_upgrade:'stall',mastery:'mastery',project_start:'projects',project_collect:'projects',tractor:'tractor',tractor_care:'tractor',tractor_shift:'tractor',silo_upgrade:'silo',delivery:'cart',buy_boost:'boosts',finish_crop:'boosts',valley_sell:'valleymarket',valley_skip:'valleymarket',ranch_focus:'ranch',improve:'estateworkshop',master_spend:'master',lab_cross:'seedlab',lab_collect:'seedlab',visitor_serve:'visitors',visitor_decline:'visitors',giant_tend:'giantpumpkin',giant_weigh:'giantpumpkin',vproject_give:'valleyprojects',vproject_finish:'valleyprojects',depot_load:'tradedepot',depot_skip:'tradedepot',fair_enter:'grandfair'};
 const gate=gates[action.type];if(gate&&!featureUnlocked(state,gate))throw new Error(featureUnlockHint(gate));
 switch(action.type){
  case 'buy_vip':return buyVip(state,action.plan,action.expectedCost,action.expectedExpiresAt,now);
  case 'construct':return constructBuilding(state,action.building);
  case 'clear_planting':return clearPlanting(state,action.id,action.expectedPlantedAt);
  case 'clear_plantings':return clearPlantings(state,action.fields);
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
  case 'buy_coins':{
   // The coins follow the level: a level gained since the shop was drawn changes them, so the farmer sees the new amount first.
   if(action.expectedCost!==COIN_PACK.cost||action.expectedCoins!==coinPackCoins(state))throw new Error(PRICES_CHANGED);
   return buyCoinPack(state);
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
  // The Warehouse (22 Oct 2026): a harvest by hand, a collect and the Seed Lab's collect wait while it is full (assertWarehouseRoom).
  case 'field':if(action.action==='harvest')assertWarehouseRoom(state);return actOnPlot(state,action.id,action.action,action.crop??'corn',now);
  case 'fields':return workFields(state,action.action,action.ids,now,action.crop??'corn');
  case 'sell':return sellCrops(state,action.item??'all',now,action.day,action.category,action.quantity);
  case 'produce':return startProduction(state,action.recipe,now,action.count,random);
  case 'collect':assertWarehouseRoom(state);return collectProduction(state,action.building,now,action.jobId);
  case 'collect_all':assertWarehouseRoom(state);return collectAllProduction(state,action.building,now);
  case 'upgrade':return upgradeBuilding(state,action.building,action.currency,action.expectedCost,action.expectedLevel,action.crates);
  case 'expand':return expandFarm(state);
  case 'quest':return claimQuest(state,action.id);
  case 'village_quest':return claimVillageQuest(state,action.id);
  case 'beginner_claim':return claimBeginnerQuest(state,action.id,now);
  // Only carries the first-look markers (action.look, recordFirstLook) when no other action took them along.
  case 'first_look':return {};
  case 'daily':return claimDaily(state,action.id,action.day,now);
  case 'checkin':return checkIn(state,now);
  case 'comeback':return collectComeback(state,now);
  case 'pass_claim':return claimPassTier(state,action.track,action.tier,now);
  case 'season_claim':return claimSeasonTier(state,action.track,action.tier,now,action.season);
  case 'season_skip':return skipSeasonTier(state,action.expectedCost,now);
  case 'season_chest':return claimSeasonChest(state,now,action.season);
  case 'season_look':return wearFarmLook(state,action.slot,action.id??null);
  case 'delivery':return deliverOrder(state,action.id,action.day,now,action.revision);
  case 'level_rewards':return claimLevelRewards(state);
  case 'tractor':return useTractor(state,action.mode,action.crop,now,action.expectedCost,action.ids);
  case 'tractor_care':return fullCare(state,action.expectedCost,now);
  case 'tractor_shift':return startNightShift(state,action.crop,action.expectedCost,now);
  case 'silo_upgrade':return upgradeSilo(state);
  // The Warehouse's upgrade (22 Oct 2026): no feature gate, every farm has its Warehouse from the start.
  case 'warehouse_upgrade':return upgradeWarehouse(state,action.expectedCost);
  case 'bin_add':return shipBinAdd(state,action.item,action.count,now);
  case 'bin_take':return shipBinTake(state,action.item,now);
  case 'neighbour_gift':return giveNeighbour(state,action.neighbour,action.item,now);
  case 'valley_sell':return valleySell(state,action.stall,action.basket,now);
  case 'valley_skip':return valleySkip(state,action.stall,action.basket,now);
  // World II's market square (Oct 2026): no feature gate, the level check is their own (nothing of it may show below level 100).
  case 'village_deliver':return villageDeliver(state,action.board,action.request,action.input,now);
  case 'village_skip':return villageSkip(state,action.board,action.request,action.input,now);
  case 'miller_deliver':return millerDeliver(state,action.week,now);
  case 'village_build':return villageBuild(state,action.place);
  // The town boat at the Pier (from level 144) carries the cargo the screen showed; the landmarks (165-200) come from the golden brief.
  case 'boat_load':return boatLoad(state,action.cargo,action.input,action.item,now);
  case 'boat_skip':return boatSkip(state,action.cargo,action.input,now);
  case 'landmark_give':return landmarkGive(state,action.landmark,action.item);
  case 'landmark_finish':return landmarkFinish(state,action.landmark);
  // The Village tab of the diamond shop (20 Oct 2026): no feature gate, each checks its own level (as the market square).
  case 'village_cart':return villageCart(state,action.cart,action.expectedCost,action.expectedGoods);
  case 'boat_now':return boatNow(state,action.expectedCost,now);
  case 'villager_now':return villagerNow(state,action.board,action.expectedCost,now);
  case 'lake_casts':return lakeCastsNow(state,action.expectedCost,now);
  case 'landmark_supplies':return landmarkSupplies(state,action.landmark,action.expectedCost,action.expectedGoods);
  case 'ranch_focus':return setRanchFocus(state,action.focus,action.expectedCost);
  case 'improve':return buildImprovement(state,action.improvement);
  case 'depot_load':return depotLoad(state,action.contract,action.item,now);
  case 'depot_skip':return depotSkip(state,action.contract,now);
  case 'fair_enter':return fairEnter(state,action.entry,action.week,now);
  case 'master_spend':return masterSpend(state,action.branch);
  case 'lab_cross':return labCross(state,action.bed,action.heirloom,now);
  case 'lab_collect':assertWarehouseRoom(state);return labCollect(state,action.bed,now);
  case 'visitor_serve':return visitorServe(state,action.visitor,now);
  case 'visitor_decline':return visitorDecline(state,action.visitor,now);
  case 'giant_tend':return giantTend(state,action.feed===true,now);
  case 'giant_weigh':return giantWeigh(state);
  case 'vproject_give':return valleyProjectGive(state,action.project,action.item);
  case 'vproject_finish':return valleyProjectFinish(state,action.project);
  // The Fishing pond (11 Oct 2026): its own gate (closed until POND_OPEN, then level 4).
  case 'fish':return landFish(state,action.n,action.landed,action.perfect,now);
  // The village lake (12 Oct 2026): its own action, never 'fish' with a field more (an older farm-api would ignore the field and pay a pond
  // fish), its own gate (closed until LAKE_OPEN, then level 100).
  case 'lake_fish':return landLakeFish(state,action.n,action.landed,action.perfect,now);
  // A pat of the farm's dog or cat, or the village's deer (20 Oct 2026): no feature gate, the deer checks World II itself.
  case 'pet_pat':return patPet(state,action.pet,now,random);
  // Your own farmer's clothes (21 Oct 2026): no feature gate, every farm has its farmer.
  case 'farmer_wear':return wearFarmer(state,action.farmer);
  // Your own farm layout (24 Oct 2026, game/farm-map.js): moving, clearing land, buying and storing trees and path tiles.
  case 'layout_move':return moveThing(state,action.id,action.x,action.z,levelOf(state),action.turn);
  case 'layout_clear':return clearObstacle(state,action.id,levelOf(state));
  case 'layout_buy':return placeDecor(state,action.kind,action.x,action.z,levelOf(state),{turn:action.turn??0});
  case 'layout_place':return placeDecor(state,action.kind,action.x,action.z,levelOf(state),{fromStore:true,turn:action.turn??0});
  case 'layout_store':return storeDecor(state,action.id);
  case 'layout_purchase':return purchaseDecor(state,action.kind,action.count??1);
  case 'layout_draw':return editDrawn(state,{kind:action.kind,add:action.add,remove:action.remove},levelOf(state));
  default:throw new Error('Unknown farm action.');
 }
}

// Silo research opens at level 26 (the unlock spread, 25 Sep 2026). 27 Sep 2026: the first three steps cost 140, 240 and 380 from the
// days it opened early, so 30% quicker crops cost 760 coins at level 26; then 2,000, 4,000 and 8,000, rising to the 15,000 and 65,000 of the
// last two. 23 Oct 2026 (the owner: "dat mensen sneller de game voelen door lagere wachttijd", option 2): it opens at level 5, with Barley
// and field 12, and the first three steps cost 500, 1,500 and 4,000. Farmers on level 5 have about 1,330 coins (the median, live): the
// first step (crops 10% quicker, seeds 5% cheaper) right away, the second about level 7 to 8, the third (30% quicker) about level 10 to
// 12; the last two stay 15,000 and 65,000. Level 26 keeps something new (the unlock spread: every level from 11 to 48): Apple & Berry
// Juice moves there from 23, which still opens berries and the Berry Smoothie (one of the early game's, by 25). A farm keeps every step it already has.
export const SILO_COSTS=[500,1500,4000,15000,65000];
// Crop medals ask twice the harvests since one crop a harvest (22 Oct 2026, the owner: "verdubbel de doelen, ook de medailles"): 25 / 100 /
// 300 / 1,000 became 50 / 200 / 600 / 2,000. A medal a farm had reached with the old numbers is never taken away: state.mastery.kept holds,
// per crop, how many tiers the old numbers gave when the farm first loaded with this rule; those tiers stay reached (collected or not), and
// the next tier counts the farm's harvests against its new number.
export const MASTERY_TIERS=[{name:'Bronze',target:50,coins:100,xp:25},{name:'Silver',target:200,coins:350,xp:60},{name:'Gold',target:600,coins:1200,xp:150},{name:'Platinum',target:2000,coins:4000,xp:400}];
export const MASTERY_TARGETS_BEFORE_ONE_CROP=Object.freeze([25,100,300,1000]);
const masteryKept=(state,crop)=>Math.max(0,Math.min(MASTERY_TIERS.length,state.mastery?.kept?.[crop]??0));
export const masteryReached=(state,crop,id)=>id<masteryKept(state,crop)||(state.mastery?.harvests?.[crop]??0)>=MASTERY_TIERS[id].target;
// Chores pay XP straight (a helping-hand job's worth for the quickest, more for the longer ones) and rest 15 minutes to three hours: few,
// worthwhile clicks instead of one every minute, so an autoclicker gains little. Each chore done raises its bonus-find chance by
// CHORE_PRACTICE_STEP; at the chore's maximum it is mastered and the next unlocks.
// The rests are three times what they were until 9 Oct 2026 (5 minutes to an hour; the owner's call, with the helping hand's): chores pay
// the same XP at level 15 as at level 90, and a farmer who kept the game open could do them all the time, up to about 2,100 XP an hour,
// several levels an hour early on. A farmer who comes back a few times a day finds every chore ready, as before.
export const CHORE_PRACTICE_STEP=4;
export const CHORES=Object.freeze({
 weeds:{name:'Clear the paths',description:'Pull weeds along the farm paths.',icon:'shovel',coins:90,xp:45,cooldown:900000,baseChance:60,maxChance:100,bonus:{item:'wheat',count:2}},
 troughs:{name:'Fill the water troughs',description:'Fresh water for the animals.',icon:'droplets',coins:133,xp:70,cooldown:1800000,baseChance:40,maxChance:80,requires:'weeds',bonus:{item:'lettuce',count:2}},
 sorting:{name:'Sort the seed boxes',description:'Get tomorrow’s planting ready.',icon:'package-open',coins:225,xp:110,cooldown:3600000,baseChance:35,maxChance:60,requires:'troughs',bonus:{item:'corn',count:2}},
 fences:{name:'Mend the orchard fence',description:'Repair loose rails and keep the orchard safe.',icon:'fence',coins:360,xp:150,cooldown:5400000,baseChance:30,maxChance:70,requires:'sorting',bonus:{item:'apples',count:1}},
 irrigation:{name:'Restore the irrigation',description:'Clear the channels and bring water to the far fields.',icon:'waves',coins:594,xp:200,cooldown:8100000,baseChance:25,maxChance:65,requires:'fences',bonus:{item:'cauliflower',count:1}},
 harvestfair:{name:'Prepare the harvest fair',description:'Arrange a prize-worthy display of the farm’s best goods.',icon:'party-popper',coins:800,xp:260,cooldown:10800000,baseChance:20,maxChance:60,requires:'irrigation',bonus:{item:'pumpkin',count:1}}
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
// Half since 7 Oct 2026 (was 10/20/35/50/75/100/125/150/175/200, 940 in all; now 470). A chapter paid before keeps what it paid.
export const CHAPTER_DIAMONDS=Object.freeze([5,10,18,25,37,50,63,75,87,100]);
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
export function masteryStatus(state,crop){return MASTERY_TIERS.map((tier,id)=>({...tier,id,progress:masteryReached(state,crop,id)?tier.target:Math.min(tier.target,state.mastery.harvests[crop]??0),claimed:state.mastery.claimed.includes(`${crop}:${id}`)}));}
// The medals earned and not collected yet, as 'crop:tier' (Oct 2026: they light the yellow "!" on Medals, public/medal-notice.js names a
// new one). Only crops the Medals list shows (it lists the crops the farm has opened), so the "!" never points at a medal nobody can tap.
export function medalsWaiting(state){const claimed=new Set(state.mastery?.claimed??[]);return Object.keys(CROPS).filter(crop=>cropUnlocked(state,crop)).flatMap(crop=>MASTERY_TIERS.map((tier,id)=>masteryReached(state,crop,id)&&!claimed.has(`${crop}:${id}`)?`${crop}:${id}`:'')).filter(Boolean);}
export function claimMastery(state,crop,tier){
 if(!Object.hasOwn(CROPS,crop)||!Number.isInteger(tier)||!MASTERY_TIERS[tier])throw new Error('Choose a crop medal.');
 const goal=masteryStatus(state,crop)[tier];if(goal.claimed)throw new Error('This medal is already collected.');if(goal.progress<goal.target)throw new Error('Keep harvesting this crop to earn its medal.');
 state.mastery.claimed.push(`${crop}:${tier}`);state.stats.mastery_medals++;state.coins+=goal.coins;state.xp+=goal.xp;return {crop,tier,coins:goal.coins,xp:goal.xp};
}
// What each finished estate chapter adds to the stall, in coins an hour (26 Sep 2026, was 6 for every chapter): about a month of the
// stall pays back the chapter's coins (45,000 for chapter 4 -> +60 an hour); the XP and diamonds come on top.
export const CHAPTER_STALL_INCOME=Object.freeze([10,20,30,60,180,500,900,1400,2200,3400]);
export const chapterIncome=completed=>CHAPTER_STALL_INCOME.slice(0,Math.max(0,Math.min(CHAPTER_STALL_INCOME.length,Math.floor(Number(completed)||0)))).reduce((sum,n)=>sum+n,0);
// One stall level on its own (the wiki's table): coins an hour before estate chapters, how many hours it holds, and the next upgrade.
export const STALL_MAX_LEVEL=8;
export function stallLevel(level){return {rate:36+(level-1)*18,capacityHours:24+Math.min(24,(level-1)*4),upgradeCost:level>=STALL_MAX_LEVEL?null:Math.round(800*2.4**(level-1))};}
export function stallStatus(state,now=Date.now()){
 const level=state.stall.level,own=stallLevel(level),rate=own.rate+chapterIncome(state.estate.completed),capacityHours=own.capacityHours,capacity=rate*capacityHours;
 const balance=Math.min(capacity,Math.max(0,state.stall.bank)+Math.max(0,now-state.stall.since)/3600000*rate);
 return {level,rate,capacityHours,capacity,balance,available:Math.floor(balance+1e-8),upgradeCost:own.upgradeCost};
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
 if(state.mastery.claimed.length<project.medals)throw new Error(`Earn ${project.medals} crop medals for this project.`);
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
 const project=currentProject(state);settleStall(state,now);state.estate.completed++;state.estate.job=null;state.stats.projects++;state.xp+=project.xp;const reward=grantChapterRewards(state);return {name:project.name,xp:project.xp,income:CHAPTER_STALL_INCOME[state.estate.completed-1]??0,diamonds:reward.diamonds,chapters:reward.chapters,completed:state.estate.completed};
}

// Small hands-on jobs run alongside crops and production. Only server time and
// persisted progress determine rewards; the client submits a station and tile.
// task: what a tile that needs work says to a screen reader ("Water dry seedling"), one text, so it is translated whole (6 Oct 2026).
// A stop rests an hour after its job (9 Oct 2026, the owner's call; it was 15 minutes; the daily challenges for one stop ask for it twice,
// so two visits an hour apart, and farm events ask at most two rounds, public/event-goals.js): a round pays 240 XP at every level, so a
// farmer who kept the game open earned about 960 XP an hour here alone, two or three levels an hour between levels 8 and 15, and a
// quarter of all XP between levels 5 and 30. A farmer who comes back a few times a day finds all four stops ready, as before.
// These are the full amounts, from level 10; below it a stop rests less and pays less in step (11 Oct 2026, handShare below).
export const ACTIVE_STATIONS=Object.freeze({
 greenhouse:{name:'Greenhouse',icon:'sprout',model:'greenhouse_003',coins:0,xp:42,cooldown:3600000,item:'lettuce',itemCount:3,instruction:'Water the three dry seedlings.',target:'Dry seedling',other:'Healthy seedling',verb:'Water',task:'Water dry seedling',targetIcon:'droplets',otherIcon:'sprout'},
 apiary:{name:'Apiary',icon:'flower-2',model:'apiary_001',coins:0,xp:48,cooldown:3600000,item:'honey',itemCount:3,instruction:'Collect the three capped honey frames. Leave the bees at work.',target:'Capped honey',other:'Bees at work',verb:'Collect',task:'Collect capped honey',targetIcon:'hexagon',otherIcon:'flower-2'},
 paddock:{name:'Animal paddock',icon:'heart',model:'horse_002',coins:0,xp:42,cooldown:3600000,item:'fertilizer',instruction:'Refill the three empty water bowls.',target:'Empty bowl',other:'Full bowl',verb:'Fill',task:'Fill empty bowl',targetIcon:'droplet',otherIcon:'waves'},
 workshop:{name:'Tool workshop',icon:'wrench',model:'lawn_mower_001',coins:0,xp:48,cooldown:3600000,item:'feed',instruction:'Repair the three worn tools. The others are ready to use.',target:'Worn tool',other:'Ready tool',verb:'Repair',task:'Repair worn tool',targetIcon:'wrench',otherIcon:'check'}
});
export const ACTIVITY_ROUND_REWARD=Object.freeze({coins:250,xp:60});
// The hand grows with the farm (11 Oct 2026, the owner's call): it opens at level 3, and until level 10 a stop rests 6 minutes for every
// farm level (18 minutes at level 3, 54 at level 9) and its XP and the round bonus are a tenth of the full amount for every level (30% at
// level 3). So it pays at most 240 XP and 250 coins an hour at every level, as from level 8 before, and a new farmer finds the stops ready
// again within half an hour. The goods stay the same. From level 10 everything is as before; older (legacy) farms keep the full amounts.
// The level is the one the farm has when the job finishes, before its XP; a stop that is already resting keeps its time.
export const HAND_FULL_LEVEL=10,HAND_REST_PER_LEVEL=360000;
export function handShare(state){return guidedFarm(state)?Math.min(1,Math.max(1,levelOf(state))/HAND_FULL_LEVEL):1;}
export function activityRoundReward(state){const share=handShare(state);return {coins:Math.round(ACTIVITY_ROUND_REWARD.coins*share),xp:Math.round(ACTIVITY_ROUND_REWARD.xp*share)};}
export function activityTargets(station,cycle){
 const offset=(Object.keys(ACTIVE_STATIONS).indexOf(station)+cycle)%6;
 return [0,2,3].map(i=>(i+offset)%6);
}
export function activityStatus(state,station,now=Date.now()){
 if(!Object.hasOwn(ACTIVE_STATIONS,station))throw new Error('Choose a farm activity.');
 const a=state.activities??{jobs:{},cooldowns:{},completed:{},round:[],rounds:0},stop=ACTIVE_STATIONS[station],share=handShare(state);
 const grown=share<1?{xp:Math.round(stop.xp*share),cooldown:Math.min(stop.cooldown,HAND_REST_PER_LEVEL*Math.max(1,levelOf(state)))}:{};
 return {...stop,...grown,share,station,job:a.jobs[station]??null,remaining:Math.max(0,(a.cooldowns[station]??0)-now),completed:a.completed[station]??0,inRound:a.round.includes(station)};
}
// The three taps of a job follow each other at once (13 Oct 2026, the owner's call): no 0.6-second wait between them any more (the job's
// nextAt; it paced nothing, a job pays once and the stop's rest is the pace, and it kept the tiles grey about a second after every tap).
// The first tap can now come before the server's answer to the start, with the start time this device showed (its clock, a moment off):
// a tap is for the job that started within HAND_TAP_SLACK of it. A stop rests at least 18 minutes after a job (level 3), so a tap from
// an earlier job is still refused. An older job in a save may still carry nextAt; nothing reads it.
export const HAND_TAP_SLACK=300000;
function startActivity(state,station,now){
 const s=activityStatus(state,station,now);
 if(s.job)throw new Error('This job is already in progress.');
 if(s.remaining)throw new Error(`This job returns in ${formatDuration(s.remaining)}.`);
 const job={startedAt:now,targets:activityTargets(station,s.completed),done:[]};
 state.activities.jobs[station]=job;return {station,startedAt:now};
}
function workActivity(state,action,now){
 const s=activityStatus(state,action.station,now),job=s.job,bonus=activityRoundReward(state);
 if(!job||!Number.isFinite(action.startedAt)||Math.abs(action.startedAt-job.startedAt)>HAND_TAP_SLACK)throw new Error('Open the current job and try again.');
 if(!Number.isInteger(action.target)||!job.targets.includes(action.target))throw new Error(s.instruction);
 if(job.done.includes(action.target))throw new Error('That part of the job is already done.');
 job.done.push(action.target);
 if(job.done.length<3)return {station:action.station,finished:false,progress:job.done.length};
 const a=state.activities;delete a.jobs[action.station];a.cooldowns[action.station]=now+s.cooldown;
 a.completed[action.station]=(a.completed[action.station]??0)+1;
 if(!a.round.includes(action.station))a.round.push(action.station);
 const roundComplete=Object.keys(ACTIVE_STATIONS).every(key=>a.round.includes(key));
 const coins=s.coins+(roundComplete?bonus.coins:0),xp=s.xp+(roundComplete?bonus.xp:0);
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
// 7 Oct 2026, half the diamonds: the tournament's first prize starts at 50 and grows 12.5 a family up to 2,500 (100, 25 and 5,000
// before), so the pool is 50 for one family, 100 for two, 150 for three and 25 more a family, up to 5,000 (still from 197 families);
// the Family Order pays a farmer 1 diamond plus 1 from 10,000 points, at most 2 (3), at most 12 a week (25), and shares 2
// completion diamonds (4).
export const FAMILY_CONFIG=Object.freeze({MAX_MEMBERS:10,MIN_CONTRIB_POINTS:500,JOIN_COOLDOWN_MS:48*3600000,RENAME_COOLDOWN_MS:7*DAY_MS,ATTEMPTS_PER_HOUR:10,TOURNAMENT_FIRST_MIN:50,TOURNAMENT_FIRST_MAX:2500,TOURNAMENT_PER_EXTRA_FAMILY:12.5,ORDER_PLAYER_WEEK_DIAMOND_CAP:12,TOURNAMENT_MIN_POINTS:1,ORDER_COIN_MULTIPLIER:1.25,ORDER_XP_PER_VALUE:1/100,ORDER_DIAMOND_BASE:1,ORDER_DIAMOND_MAX:2,ORDER_COMPLETION_DIAMONDS:2,REWARD_WEEKS:8,ORDER_MIN_VALUE_PER_MEMBER:16000,ORDER_MAX_VALUE_PER_MEMBER:30000,RANK_WEIGHTS:[1,.6,.4],TOURNAMENT_SHARES:[25,17,13,10,8,7,6,5,5,4]});
export const FAMILY_EMBLEMS=Object.freeze(['wheat','corn','sunflower','apples','berries','honey','bread','milk','eggs','tractor','farm','trophy','family-bee','family-oak','family-barn','pumpkin','greenbeans','cheese','applejuice','berrypreserves','harvesthamper','family-fox','family-owl','family-windmill','family-horseshoe',
 // 27 Sep 2026: 35 more (60 in all), from the crops and goods added since. Always added at the end: an emblem's id is its place in this list.
 'lettuce','barley','cabbage','cauliflower','redcabbage','squash','polebeans','ciderapples','cherries','flour','pie','pickles','oil','stew','applepie','berrytart','orchardjuice','squashsoup','beeswax','wool','yarn','cloth','cider','goatmilk','goatcheese','candles','blanket','cherryjam','cherrypie','prizeproduce','truffles','vegetables','silo','cart','berrysmoothie',
 // 7 Oct 2026: 33 real family emblems (ids 60-92), painted like the bee and the fox, so the picker offers a round 40.
 'family-rooster','family-sheep','family-cow','family-piglet','family-bunny','family-hedgehog','family-duckling','family-goat','family-horse','family-squirrel','family-robin','family-frog','family-turtle','family-ladybug','family-butterfly','family-watering-can','family-lantern','family-key','family-shield-crest','family-moon','family-rainbow','family-mushroom-cottage','family-water-well','family-scarecrow','family-ginger-cat','family-sheepdog','family-snail','family-dragonfly','family-swan','family-fawn','family-badger','family-sun','family-raincloud',
 // 7 Oct 2026: 7 more game icons (ids 93-99), from the game's own goods that were no emblem yet, so the picker offers 60 game icons
 // after the 40 family emblems.
 'salad','beangratin','applecompote','applevinegar','pickledbeans','truffleomelette','berrycheesecake',
 // The Season Pass's emblems (Oct 2026, ids 100 on; SEASON_EMBLEMS): only for a family where a member collected one.
 'emblem-autumn','emblem-winter'].map((icon,i)=>({id:String(i),icon,color:['#6b8e50','#c39538','#b57851','#517c83','#8b6a95','#a66c71'][i%6]})));
// The emblem picker (7 Oct 2026) offers all 100: first the 40 real family emblems (family-…), animals first, then things; then the
// 60 game icons (the 53 old crop and goods emblems and the 7 new ones), crops first, then goods, then the farm's own things. Every
// family can pick any of them, also one it had before. A new family starts with the first one.
export const FAMILY_EMBLEM_ORDER=Object.freeze([
 'family-rooster','family-duckling','family-cow','family-piglet','family-sheep','family-goat','family-horse','family-sheepdog','family-ginger-cat','family-bunny',
 'family-fox','family-owl','family-hedgehog','family-squirrel','family-badger','family-fawn','family-robin','family-swan','family-frog','family-turtle','family-snail',
 'family-bee','family-ladybug','family-butterfly','family-dragonfly',
 'family-barn','family-windmill','family-water-well','family-mushroom-cottage','family-scarecrow','family-watering-can','family-lantern','family-horseshoe','family-key','family-shield-crest',
 'family-oak','family-sun','family-rainbow','family-raincloud','family-moon']);
export const FAMILY_GAME_EMBLEM_ORDER=Object.freeze([
 'wheat','corn','barley','sunflower','lettuce','cabbage','redcabbage','cauliflower','pumpkin','squash','greenbeans','polebeans','apples','ciderapples','cherries','berries','truffles','prizeproduce',
 'eggs','milk','cheese','goatmilk','goatcheese','honey',
 'flour','bread','pie','applepie','cherrypie','berrytart','berrycheesecake',
 'salad','stew','squashsoup','beangratin','truffleomelette',
 'berrypreserves','applevinegar','cherryjam','applecompote','pickles','pickledbeans','oil',   // the vinegar apart from the oil: the two bottles look alike
 'applejuice','orchardjuice','berrysmoothie','cider',
 'beeswax','candles','wool','yarn','cloth','blanket',
 'vegetables','harvesthamper',
 'farm','tractor','silo','cart','trophy']);
export const familyEmblemReal=e=>!!e?.icon?.startsWith('family-');
// owned: the season emblems this family may pick (a member has it, or the family wears it already); the others never show.
export function familyEmblemChoices(owned=[]){
 const row=(order,list)=>{const place=e=>{const i=order.indexOf(e.icon);return i<0?order.length+Number(e.id):i;};return list.sort((a,b)=>place(a)-place(b));};   // one missing from its order goes last in its part
 const season=FAMILY_EMBLEMS.filter(e=>Object.hasOwn(SEASON_EMBLEMS,e.id)&&owned.includes(e.id));
 return [...season,...row(FAMILY_EMBLEM_ORDER,FAMILY_EMBLEMS.filter(e=>familyEmblemReal(e)&&!Object.hasOwn(SEASON_EMBLEMS,e.id))),...row(FAMILY_GAME_EMBLEM_ORDER,FAMILY_EMBLEMS.filter(e=>!familyEmblemReal(e)&&!Object.hasOwn(SEASON_EMBLEMS,e.id)))];
}
export const FAMILY_EMBLEM_DEFAULT=familyEmblemChoices()[0].id;
export const familyEmblemValid=id=>typeof id==='string'&&/^(0|[1-9]\d*)$/.test(id)&&Number(id)<FAMILY_EMBLEMS.length;   // ids 0-100
// A season emblem: "If someone in your family has this emblem, your leader can pick it." Once picked it stays, also when that member
// leaves. owned: the season emblems the family's members collected (farm-api reads them from their farms, family-service.js).
export const familyEmblemAllowed=(id,{current=null,owned=[]}={})=>familyEmblemValid(id)&&(!Object.hasOwn(SEASON_EMBLEMS,id)||id===current||owned.includes(id));
export function familyUnlocked(state,minLevel=FAMILY_MIN_LEVEL){return levelOf(state)>=minLevel;}
export function familyUnlockHint(minLevel=FAMILY_MIN_LEVEL){return `Reach level ${minLevel} to unlock Farm Family.`;}
export function familyWeek(now=Date.now()){return Math.floor((now-4*DAY_MS)/(7*DAY_MS));}
export function familyWeekStart(week){return 4*DAY_MS+week*7*DAY_MS;}
// The Family Chest (27 Sep 2026): one chest a week for the whole family, filled by what every member does on their own farm. A
// database trigger counts it after each farm action (family-chest.sql, with the same points): a harvest 1 point, a collected batch
// 2, a delivery 10, a chore 3, a helping-hand job 2. At each of four tiers every member with at least FAMILY_CHEST_MIN points that
// week gets diamonds and coins that grow with their own level. A new chest every Monday. A bigger, busier family fills it further:
// a keen farmer alone reaches the wooden chest, a family of five the silver one, and gold takes a full family.
// 7 Oct 2026: 2 / 3 / 6 / 12 diamonds a tier (was 3 / 6 / 12 / 25), with the same family-level bonus.
// One crop a harvest (22 Oct 2026, the owner: "verdubbel de doelen"): farmers harvest about twice as often, so two harvests make a point
// (harvested: 0.5; the trigger counts whole halves: supabase/one-crop.sql, floor(new/2) - floor(old/2)).
export const FAMILY_CHEST_POINTS=Object.freeze({harvested:.5,produced:2,deliveries:10,chores:3,activities:2});
export const FAMILY_CHEST_TIERS=Object.freeze([
 Object.freeze({id:'wood',name:'Wooden chest',points:1500,diamonds:2,coinsPerLevel:20}),
 Object.freeze({id:'iron',name:'Iron chest',points:5000,diamonds:3,coinsPerLevel:50}),
 Object.freeze({id:'silver',name:'Silver chest',points:12000,diamonds:6,coinsPerLevel:100}),
 Object.freeze({id:'gold',name:'Golden chest',points:25000,diamonds:12,coinsPerLevel:200})
]);
export const FAMILY_CHEST_MIN=300;
export const familyChestTiers=points=>FAMILY_CHEST_TIERS.filter(t=>points>=t.points).length;
// Family level: every chest tier a family opens (in any week) is a step up. Each level above 1 adds FAMILY_LEVEL_BONUS to the
// rewards of the chest and of the weekly Family Order for every member.
export const FAMILY_LEVEL_STEPS=Object.freeze([0,3,8,15,24,35,48,63,80,100]);   // tiers opened for level 1, 2 ... 10
export const FAMILY_LEVEL_BONUS=.1;
export function familyLevelFrom(tiers){let level=1;FAMILY_LEVEL_STEPS.forEach((need,i)=>{if(tiers>=need)level=i+1;});return level;}
export function familyStanding(c,familyId){
 const tiers=(c.chests??[]).filter(r=>r.family_id===familyId).reduce((n,r)=>n+familyChestTiers(Number(r.points)||0),0),level=familyLevelFrom(tiers);
 return {tiers,level,next:FAMILY_LEVEL_STEPS[level]??null,bonus:(level-1)*FAMILY_LEVEL_BONUS};
}
// Hourly events (20 Oct 2026, the owner): a new event every hour, 55 minutes of play and 5 minutes to hand out the prizes, one goal.
// Diamonds: 8 / 5 / 3 for the first three to finish in a league, 1 for every other finisher (the owner changed the first place from 10
// to 8 the same day), and 3 more each when 3 or more of one Farm family finish. Coins (the owner, later on 20 Oct 2026; the first
// hourly events paid none): a quarter of the 6-hour events' coins, (50 + 500 / 250 / 125 for the first three, 25 for every other
// finisher) × the league's coins (EVENT_LEAGUES), so a Sprout finisher gets 75 and the first in the Village Legends 11,000; the family
// bonus adds a flat 500 coins, no league factor, as the old 200 was. Every hourly event carries these in its own rewards
// (harvest_event_schedule, written from here by scripts/hourly-coins-sql.mjs into supabase/hourly-coins.sql), so settle, farm-api
// and the screens read an event's prizes from the event. podium, finisher and the family keys stay as the first hourly events had
// them, so an older screen or farm-api still reads the diamonds; the coins are in coins and the three new keys.
// The old keys stay for the checks and the diamond_pool statistic.
export const HOUR_EVENT_REWARDS=Object.freeze({coins:50,diamondMin:1,diamondMax:1,participantStep:25,poolCap:50,podium:Object.freeze([8,5,3]),finisher:1,familyFinishers:3,familyDiamonds:3,
 podiumCoins:Object.freeze([500,250,125]),finisherCoins:25,familyCoins:500});
// The prizes of one event. An event with podium is an hourly one: its diamonds, and coins = (coins + the place's podiumCoins or
// finisherCoins) × the league, as harvest_event_settle pays them; an hourly event from before the coins (coins 0, no podiumCoins,
// 20 Oct 2026) pays none. One without podium (every 6-hour event, until 20 Oct 2026) keeps the rules it was made with: the event's
// coins plus 2000 / 1000 / 500 / 100 podium coins (× the league), 25 / 15 / 10 / 3 diamonds, and +200 coins and +3 diamonds for the
// family bonus (supabase/event-podium-2026-10-08.sql, world-two-leagues-b.sql). paysCoins: whether any place wins coins.
export function eventPrizes(rewards){
 const r=rewards&&typeof rewards==='object'?rewards:{};
 if(Array.isArray(r.podium)){
  const whole=(v,fallback)=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):fallback;
  const coins=whole(r.coins,0),podiumCoins=Array.isArray(r.podiumCoins)?r.podiumCoins:[];
  const prize={hour:true,coins,podium:[0,1,2].map(i=>({coins:whole(podiumCoins[i],0),diamonds:whole(r.podium[i],HOUR_EVENT_REWARDS.podium[i])})),finisher:{coins:whole(r.finisherCoins,0),diamonds:whole(r.finisher,HOUR_EVENT_REWARDS.finisher)},
   family:{finishers:whole(r.familyFinishers,HOUR_EVENT_REWARDS.familyFinishers),coins:whole(r.familyCoins,0),diamonds:whole(r.familyDiamonds,HOUR_EVENT_REWARDS.familyDiamonds)}};
  return {...prize,paysCoins:[...prize.podium,prize.finisher].some(p=>coins+p.coins>0)};
 }
 return {hour:false,coins:Number(r.coins)||0,podium:[{coins:2000,diamonds:25},{coins:1000,diamonds:15},{coins:500,diamonds:10}],finisher:{coins:100,diamonds:3},family:{finishers:3,coins:200,diamonds:3},paysCoins:true};
}
// A family event bonus (harvest_event_settle): when this many members of one family finish the same event, each of them gets this on
// top of their own prize: 500 coins and 3 diamonds (the owner, 20 Oct 2026; 200 coins before the hourly events, none in the first
// hourly ones; 5 diamonds before 7 Oct 2026). The coins are flat: the same in every league.
export const FAMILY_EVENT_BONUS=Object.freeze({finishers:HOUR_EVENT_REWARDS.familyFinishers,coins:HOUR_EVENT_REWARDS.familyCoins,diamonds:HOUR_EVENT_REWARDS.familyDiamonds});
// Event leagues (1 Oct 2026; World 2 leagues 20 Oct 2026, the owner): every farmer races against farmers of about their level, with
// a top 10 and a podium of its own per league. Diamonds are the same in every league (eventPrizes); coins are × the league's number:
// 1 to 5 on the farm, 8 for the Valley Legends (90-99), and 10 to 20 for the six village leagues from level 100, whose goals are in the
// village (public/event-goals.js VILLAGE_KINDS); the first hourly events of 20 Oct 2026 paid no coins. Your league is set when you
// join an event, your first action that counts, and you finish that event in that league, also when you level up during it
// (20 Oct 2026, the owner; live_event_players.league, supabase/league-at-join.sql). A row from before has none and gets the league of
// the level when the event ends (harvest_event_settle). Indices 0-5 never change: settled rows keep them.
export const EVENT_LEAGUES=Object.freeze([
 {id:'sprout',name:'Sprout League',from:15},{id:'meadow',name:'Meadow League',from:30},{id:'orchard',name:'Orchard League',from:45},
 {id:'harvest',name:'Harvest League',from:60},{id:'estate',name:'Estate League',from:75},{id:'legends',name:'Valley Legends',from:90,coins:8},
 {id:'cobble',name:'Cobble League',from:100,coins:10,world:2},{id:'timber',name:'Timber League',from:121,coins:12,world:2},
 {id:'linen',name:'Linen League',from:141,coins:14,world:2},{id:'silver',name:'Silver League',from:161,coins:16,world:2},
 {id:'ruby',name:'Ruby League',from:181,coins:18,world:2},{id:'village',name:'Village Legends',from:201,coins:20,world:2}
].map((l,i,all)=>Object.freeze({world:1,...l,index:i,to:all[i+1]?all[i+1].from-1:null,coins:l.coins??i+1})));
export const eventLeague=level=>EVENT_LEAGUES.reduce((found,l)=>Number(level)>=l.from?l:found,EVENT_LEAGUES[0]);
// An event only has the leagues it was made with (20 Oct 2026): one made before the village leagues (6 entries, or none at all)
// keeps a farmer of 100+ in the Valley Legends, with the Legends' goals and coins. The database does the same
// (harvest_event_league_for), so screen, standings and settlement always agree. A farmer who first counted in an event below
// level 100 (live_event_players.world 1) finishes that event in the Valley Legends, also after reaching 100 during it.
// (filter(...).length-1 rather than findLastIndex, which older phone browsers lack.)
const LAST_FARM_LEAGUE=EVENT_LEAGUES.filter(l=>l.world===1).length-1;
export const eventLeagueCount=event=>Array.isArray(event?.leagues)&&event.leagues.length?Math.min(event.leagues.length,EVENT_LEAGUES.length):LAST_FARM_LEAGUE+1;
export const eventLeagueIn=(event,index)=>EVENT_LEAGUES[Math.max(0,Math.min(Math.floor(Number(index))||0,eventLeagueCount(event)-1))];
export const eventLeagueFor=(event,level,world=null)=>eventLeagueIn(event,Number(world)===1?Math.min(eventLeague(level).index,LAST_FARM_LEAGUE):eventLeague(level).index);
// A farmer's league in an event (20 Oct 2026, the owner): the one stored on their row when they joined (live_event_players.league),
// kept to the end; without one (not joined yet, or a row from before) the league of their level now, as eventLeagueFor. Joining below
// level 100 stores a farm league, so a farmer who reaches 100 during the event still finishes it in the Valley Legends.
export const eventLeagueOf=(event,row,level)=>Number.isInteger(row?.league)?eventLeagueIn(event,row.league):eventLeagueFor(event,level,row?.world);
// A farmer counts as active in a family list when they did something on their farm in the last three days.
const FAMILY_ACTIVE_MS=3*DAY_MS;
// The weekly Family Order is the same for every family: four crops or goods drawn at random from everything in the game
// (every crop and good, whatever a family can make yet), so there is always a reason to unlock more and to share. The
// amounts follow the value: about 20,000 coins of goods per member, at most 150 of one thing per member, cheap things
// first so the rest of the value moves to the dearer lines; four cheap draws swap the last for a dearer good, and a week
// never asks for two of the dearest goods.
// Exported (Oct 2026) for the wiki and the Family window: "every full line pays a quarter" holds while an order has four lines.
export const FAMILY_ORDER_VALUE=20000,FAMILY_ORDER_MAX_COUNT=150,FAMILY_ORDER_LINES=4;
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
 const pool=Object.keys(ITEMS).filter(k=>ITEMS[k].sell>0&&!ITEMS[k].heirloom&&!worldTwoItem(k)&&!seasonItem(k)&&(FAMILY_ORDER_FROM_WEEK[k]??0)<=week),picked=[];let draw=0;
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
 // The prize pool is what first, second and third won together until 1 Oct 2026 (RANK_WEIGHTS: 100%, 60% and 40% of first prize,
 // so 50 diamonds for one family, 100 for two, 150 for three, then 25 more a family; twice that until 7 Oct 2026). The top ten families share it now, by
 // TOURNAMENT_SHARES (25% for first down to 4% for tenth); fewer than ten share the whole pool in the same proportions. What
 // rounding leaves goes to the top places, so the pool is always paid out in full.
 const total=Math.round(firstPrize*config.RANK_WEIGHTS.slice(0,Math.max(1,Math.min(qualifying.length,config.RANK_WEIGHTS.length))).reduce((n,w)=>n+w,0));
 const places=Math.min(qualifying.length,config.TOURNAMENT_SHARES.length),weight=config.TOURNAMENT_SHARES.slice(0,places).reduce((n,s)=>n+s,0);
 const budgets=config.TOURNAMENT_SHARES.slice(0,places).map(s=>Math.floor(total*s/weight));
 for(let left=total-budgets.reduce((n,b)=>n+b,0),i=0;left>0&&places;left--,i=(i+1)%places)budgets[i]++;
 const prizes=qualifying.map((f,i)=>{
  const budget=budgets[i]??0;
  // At least 1 diamond each when there is enough for everyone who delivered; a small prize goes to the biggest deliveries first.
  const shares=familyShares(budget,f.active,config.TOURNAMENT_FIRST_MAX,budget>=f.active.length?1:0);
  return {family_id:f.family_id,rank:i+1,diamonds:Object.values(shares).reduce((n,d)=>n+d,0),shares};
 });
 // Before anyone enters, show the whole pool.
 const pool=qualifying.length?prizes.reduce((n,p)=>n+p.diamonds,0):total;
 return {pool,total,firstPrize,activePlayers,entries,qualifying,prizes};
}
export function emptyFamilyContext(){return {revision:0,families:[],members:[],invitations:[],requests:[],orders:[],contributions:[],results:[],rewards:[],attempts:[],weeks:[],players:[],chests:[],chestPlayers:[],receipt:null};}
const familyMember=(c,p)=>c.members.find(m=>m.player_id===p);
const familyCurrent=(c,p)=>{const m=familyMember(c,p);return m&&!m.left_at&&m.family_id?c.families.find(f=>f.id===m.family_id&&!f.deleted_at):null;};
const familyMembers=(c,id)=>c.members.filter(m=>m.family_id===id&&!m.left_at);
function addFamilyReward(c,p,week,kind,coins,xp,diamonds,now,config){
 if(c.rewards.some(r=>r.player_id===p&&r.week===week&&r.kind===kind))return;
 const allocated=c.rewards.filter(r=>r.player_id===p&&r.week===week&&r.kind===kind).reduce((n,r)=>n+r.diamonds,0);
 const cap=kind==='tournament'?config.TOURNAMENT_FIRST_MAX:kind.startsWith('chest-')?Infinity:config.ORDER_PLAYER_WEEK_DIAMOND_CAP;
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
  // An unfinished order pays for its full lines now, once, as the week is settled (5 Oct 2026).
  for(const order of c.orders.filter(o=>o.week===week))payPartialFamilyOrder(c,order,now,config);
  c.weeks.push({week,settled_at:now,pool:board.pool});settled.push(week);
 }
 return settled;
}
// What the Family Order pays one member for their order points. A whole order pays a coin for every point (the Market's payout ×
// ORDER_COIN_MULTIPLIER), 1 XP per 100 points and 1 diamond plus 1 for every 10,000 points, up to 2 (3 until 7 Oct 2026), all with the family level's
// extra. An order with only some lines full pays that part of it (5 Oct 2026, the owner's choice): full of lines, so a quarter a
// line, rounded down. The payouts and the window's preview both use this, so the preview is what is paid.
const familyOrderDiamonds=(points,config)=>Math.min(config.ORDER_DIAMOND_MAX,config.ORDER_DIAMOND_BASE+Math.floor(points/10000));
export function familyOrderPay(points,extra=1,full=1,lines=1,config=FAMILY_CONFIG){
 if(!(full>0)||!(lines>0))return {coins:0,xp:0,diamonds:0};
 const part=value=>full>=lines?value:value*full/lines,own=Math.floor(familyOrderDiamonds(points,config)*extra);
 // Diamonds for an order that is not whole (the owner, 5 Oct 2026): at least 1 for every full line, rounded down they were nearly
 // always 0, but never more than the farmer's own diamonds for the whole order, so finishing it always pays the most.
 const diamonds=full>=lines?own:Math.min(own,Math.max(full,Math.floor(part(own))));
 return {coins:Math.floor(part(points*MARKET_PAYOUT_MULTIPLIER*config.ORDER_COIN_MULTIPLIER*extra)),xp:Math.floor(part(points*config.ORDER_XP_PER_VALUE*extra)),diamonds};
}
const familyOrderFullLines=order=>Object.entries(order?.lines??{}).filter(([k,n])=>(order.filled?.[k]??0)>=n).length;
// An order that is not whole when its week ends (5 Oct 2026; it paid nothing, and 1 of 18 orders was finished in the week before):
// everyone with MIN_CONTRIB_POINTS order points gets the share of their whole-order coins, XP and own diamonds that its full lines
// make. The completion diamonds stay for a whole order; an order without a full line pays nothing. Paid with the same kind, expiry and family-level
// bonus as a whole order, and only once: a whole order has paid already, and addFamilyReward never pays a kind twice in a week.
function payPartialFamilyOrder(c,order,now,config){
 const lines=Object.keys(order.lines).length,full=familyOrderFullLines(order);
 if(order.completed_at||!full)return;
 if(full>=lines){completeFamilyOrder(c,order,now,config);return;}   // never happens: the last delivery completes the order
 const extra=1+familyStanding(c,order.family_id).bonus;
 for(const m of c.contributions.filter(x=>x.family_id===order.family_id&&x.week===order.week&&x.order_points>=config.MIN_CONTRIB_POINTS)){
  const pay=familyOrderPay(m.order_points,extra,full,lines,config);addFamilyReward(c,m.player_id,order.week,'order',pay.coins,pay.xp,pay.diamonds,now,config);
 }
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
 const bonus=familyShares(config.ORDER_COMPLETION_DIAMONDS,eligible,Infinity,0),extra=1+familyStanding(c,order.family_id).bonus;
 // A whole order pays everything at once (familyOrderPay), and the member's diamonds with their share of the completion diamonds.
 for(const m of eligible){const pay=familyOrderPay(m.order_points,extra,1,1,config);addFamilyReward(c,m.player_id,order.week,'order',pay.coins,pay.xp,Math.floor((familyOrderDiamonds(m.order_points,config)+(bonus[m.player_id]??0))*extra),now,config);}
 return true;
}
// Every member with enough points gets each tier the chest has reached, this week or last week (a farmer who opens the family
// on Monday still gets last week's). Coins follow the member's own level; the family level adds its bonus to both.
function grantFamilyChest(c,familyId,week,now,config){
 const extra=1+familyStanding(c,familyId).bonus;
 for(const w of [week-1,week]){
  const points=Number((c.chests??[]).find(r=>r.family_id===familyId&&r.week===w)?.points)||0,reached=FAMILY_CHEST_TIERS.slice(0,familyChestTiers(points));
  if(!reached.length)continue;
  for(const m of (c.chestPlayers??[]).filter(r=>r.family_id===familyId&&r.week===w&&(Number(r.points)||0)>=FAMILY_CHEST_MIN)){
   const level=c.players.find(p=>p.player_id===m.player_id)?.level??1;
   for(const t of reached)addFamilyReward(c,m.player_id,w,`chest-${t.id}`,t.coinsPerLevel*level*extra,0,Math.floor(t.diamonds*extra),now,config);
  }
 }
}
function familyCode(c,random){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let attempt=0;attempt<30;attempt++){const code=Array.from({length:6},()=>alphabet[Math.floor(random()*alphabet.length)]).join('');if(!c.families.some(f=>f.invite_code===code&&!f.deleted_at))return code;}throw new Error('Please try creating the invite code again.');}
export const FAMILY_INVITATION_LIFETIME=7*DAY_MS;
// Who can join a family (26 Sep 2026; was only open or invite-only): anyone at once, by a request the leader answers, only by
// invitation, or nobody new. A family saved before this has no join_mode yet: its is_open still says open or invite-only.
export const FAMILY_JOIN_MODES=Object.freeze({open:'Open',request:'Request to join',invite:'Invite only',closed:'Closed'});
// Family ranks (27 Sep 2026). The leader appoints them. Up to two co-leaders may do all a leader does, except change ranks, hand over
// the leadership and remove the leader or a co-leader. Honorary is a title only, with no extra rights.
export const FAMILY_RANKS=Object.freeze({leader:'Leader',coleader:'Co-leader',honorary:'Honorary',member:'Member'});
export const FAMILY_MAX_COLEADERS=2;
export const familyManager=role=>role==='leader'||role==='coleader';
export const FAMILY_REQUEST_LIFETIME=3*DAY_MS;
export const familyJoinMode=f=>Object.hasOwn(FAMILY_JOIN_MODES,f?.join_mode??'')?f.join_mode:f?.is_open?'open':'invite';
// A minimum level for an open family or one taking requests (1 Oct 2026): farmers below it cannot join or ask. An invitation
// still works for anyone from level 10. No minimum (null) is the level Farm Families open at.
export const FAMILY_MIN_LEVELS=Object.freeze([FAMILY_MIN_LEVEL,15,20,25,30,40,50,60,75,100]);
export const familyMinLevel=f=>Math.max(FAMILY_MIN_LEVEL,Number(f?.min_level)||0);
// Away too long (17 Oct 2026, the owner; the family stays at most 10): a member who has not played for the family's number of days
// leaves the family automatically, 7, 14, 30, 60 or 90 days, 30 for every family until its leader or a co-leader picks another in
// Family settings. Never the leader (no automatic handover, the owner); co-leaders and honorary members leave like members (a
// co-leader only has rights, an honorary member only a title). "Played" is the game's own last played, player_stats.last_active_at:
// every saved farm action and every return after 30 minutes or more stamps it (an admin gift does not: admin-service.js puts it
// back), the member list's online dot and the list of families' "active" read it, and so does the admin. Counted from when they
// joined if that is later (a request accepted while they were away). The database does it every hour (supabase/family-idle-leave.sql, harvest_family_idle_leave, the same rule as
// familyIdleLeaves): like a normal leave for the family (the seat frees, this week's points stay), without a wait, no chat card and
// no push, written down on their member row (left_reason 'idle', left_family, left_days) so Welcome back offers "Join again".
export const FAMILY_IDLE_DAYS=Object.freeze([7,14,30,60,90]);
export const FAMILY_IDLE_DEFAULT=30;
export const familyIdleDays=f=>FAMILY_IDLE_DAYS.includes(Number(f?.idle_days))?Number(f.idle_days):FAMILY_IDLE_DEFAULT;
// Whole days since a member last played (or joined, if later): 0 on the day itself. The member list says "5 days away" from 1.
export function familyDaysAway(lastActiveAt,joinedAt,now){
 const seen=Math.max(Date.parse(lastActiveAt??'')||0,Number(joinedAt)||0);
 return seen?Math.max(0,Math.floor((now-seen)/DAY_MS)):0;
}
export const familyIdleLeaves=(member,family,lastActiveAt,now)=>!!member&&!member.left_at&&!!member.family_id&&member.role!=='leader'&&familyDaysAway(lastActiveAt,member.joined_at,now)>=familyIdleDays(family);
// Join again (17 Oct 2026, the owner): a farmer who left a family that way can go back into it as a member, whatever its join mode or
// minimum level (they were a member) and without a wait, while it is still there, has room and has not removed them; until they join
// any family. Welcome back (farm-api's load) and the Family window offer it; family_rejoin checks the same.
const LEFT_NONE=Object.freeze({left_reason:null,left_family:null,left_days:null});
export function familyRejoinOffer(c,player,now,config=FAMILY_CONFIG){
 const me=familyMember(c,player);if(me?.left_reason!=='idle'||!me.left_family||familyCurrent(c,player))return null;
 const f=c.families.find(x=>x.id===me.left_family&&!x.deleted_at);
 if(!f||familyMembers(c,f.id).length>=config.MAX_MEMBERS||me.blocked_family===f.id&&(me.cooldown_until??0)>now)return null;
 return {familyId:f.id,name:f.name,emblem:f.emblem,days:Number(me.left_days)||0};
}
// Share in chat (20 Oct 2026, a farmer via the owner: "Ik wil kunnen linken naar mijn family in de chat, dat ziet er cool uit"; option 1):
// the leader or a co-leader posts the family's card in the global chat, with its emblem, name, family level and farmers, and a View or
// Join button. Only they, as only they invite farmers and choose who can join; once a day per family, whoever shared it (the owner,
// 20 Oct 2026: once every 24 hours; it was once an hour). farm-api (family-service.js handleFamilyShare) and supabase/family-share.sql
// with supabase/family-share-24h.sql (harvest_family_share, families.shared_at) keep the same rule; the database builds the card from
// the family itself, never from what the page sends. The wait reads "You can share again in 18h 12m." (formatDuration).
export const FAMILY_SHARE_GAP_MS=86400000;
export const familyShareWait=(sharedAt,now)=>Math.max(0,(Number(sharedAt)||0)+FAMILY_SHARE_GAP_MS-now);
// family: the Family window's own family ({manager, sharedAt}). can, or why not in one plain sentence.
export function familyShareState(family,now){
 if(!family)return {can:false,reason:'Join a family first.'};
 if(!family.manager)return {can:false,reason:'Your leader or a co-leader can share the family in chat.'};
 const wait=familyShareWait(family.sharedAt,now);
 return wait>0?{can:false,wait,reason:`You can share again in ${formatDuration(wait)}.`}:{can:true,wait:0,reason:''};
}
// The family cards in the chat, live (20 Oct 2026, the owner: "als je iemand verwijdert moet dit wel realtime updaten 10 / 10 boeren",
// "ook na bericht plaatsen"): what each shared family is now, for farm-api's family_cards (family-service.js handleFamilyCards), so a
// card shows 9 / 10 farmers a moment after a farmer was removed. Only what the family list shows to anyone (its name, emblem, level,
// farmers, who can join and from which level), in the card's own keys (supabase/family-share.sql writes them so); a family that is
// gone, or never was, is {family, gone:true}. viewer: the farmer asking, for the card's Join or View (familyShareButton): their own
// family now, and the family that removed them while it is closed to them. Nothing of anyone else.
export const FAMILY_CARDS_MAX=20;
export function familyCards(c,ids,player,now,config=FAMILY_CONFIG){
 const cards=[...new Set((Array.isArray(ids)?ids:[]).filter(id=>typeof id==='string'&&id))].slice(0,FAMILY_CARDS_MAX).map(id=>{
  const f=c.families.find(x=>x.id===id&&!x.deleted_at);if(!f)return {family:id,gone:true};
  return {family:f.id,name:f.name,emblem:f.emblem,level:familyStanding(c,f.id).level,members:familyMembers(c,f.id).length,max:config.MAX_MEMBERS,mode:familyJoinMode(f),minLevel:familyMinLevel(f)};
 });
 const me=familyMember(c,player);
 return {cards,viewer:{familyId:familyCurrent(c,player)?.id??null,blocked:me?.blocked_family&&(me.cooldown_until??0)>now?{family:me.blocked_family,until:me.cooldown_until}:null}};
}
// A request ends when it runs out, when the family goes or stops taking requests, or when the farmer has found a family.
function refreshFamilyRequests(c,now){
 c.requests??=[];
 for(const request of c.requests){
  if(request.status!=='pending')continue;
  const family=c.families.find(f=>f.id===request.family_id&&!f.deleted_at);
  if(request.expires_at<=now){request.status='expired';request.resolved_at=now;}
  else if(!family||familyJoinMode(family)!=='request'||familyCurrent(c,request.player_id)){request.status='cancelled';request.resolved_at=now;}
 }
}
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
 refreshFamilyInvitations(c,now);refreshFamilyRequests(c,now);
 const uuid=options.uuid??(()=>crypto.randomUUID()),random=options.random??secureChoreRandom;
 let member=familyMember(c,player),family=familyCurrent(c,player),result={};
 const type=action?.type??'family_read';
 const needFamily=()=>{if(!family)throw new Error('Join a family first.');};
 const leader=()=>{needFamily();if(member.role!=='leader')throw new Error('Only the family leader can do this.');};
 const manager=()=>{needFamily();if(!familyManager(member.role))throw new Error('Only the family leader or a co-leader can do this.');};
 const validName=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _'-]{2,19}$/.test(value.trim());
 // Leaving or being removed never keeps a farmer from other families (2 Oct 2026; there was a 48-hour wait for every family). Only the
 // family that removed them stays closed to them for JOIN_COOLDOWN_MS: blocked_family and cooldown_until on their member row.
 const blockedFrom=(m,familyId)=>!!familyId&&m?.blocked_family===familyId&&(m?.cooldown_until??0)>now;
 const blockedFor=m=>formatDuration(m.cooldown_until-now);
 // Joining elsewhere keeps the block on the family that removed them, until it runs out.
 const keepBlock=m=>m?.blocked_family&&(m.cooldown_until??0)>now?{cooldown_until:m.cooldown_until,blocked_family:m.blocked_family}:{cooldown_until:null,blocked_family:null};
 const joinable=(familyId=null)=>{if(family)throw new Error('Leave your current family first.');if(blockedFrom(member,familyId))throw new Error(`This family removed you. You can join it again in ${blockedFor(member)}.`);};
 if(['family_create','family_join','family_invite','family_accept_invite','family_request','family_rejoin'].includes(type)){
  let rate=c.attempts.find(a=>a.player_id===player);if(!rate){rate={player_id:player,window_at:now,count:0};c.attempts.push(rate);}
  if(now-rate.window_at>=3600000){rate.window_at=now;rate.count=0;}
  if(rate.count>=config.ATTEMPTS_PER_HOUR)return {context:c,result:{error:'Too many attempts. Try again later.'},settled,failed:true};
  rate.count++;
 }
 try{
  if(type==='family_create'){
   joinable();if(!validName(action.name))throw new Error('Use 3–20 letters, numbers, spaces, apostrophes, underscores or hyphens.');
   const name=action.name.trim();if(c.families.some(f=>!f.deleted_at&&f.name.toLowerCase()===name.toLowerCase()))throw new Error('That family name is taken.');
   if(!familyEmblemAllowed(action.emblem,{owned:SEASON_EMBLEMS[action.emblem]&&ownsLook(state,SEASON_EMBLEMS[action.emblem])?[action.emblem]:[]}))throw new Error('Choose a family emblem.');
   // idle_days only once the database has it (17 Oct 2026): harvest_family_context returns every family as a whole row, so with none
   // of them carrying it supabase/family-idle-leave.sql has not run, and the new family would show a choice that is never saved.
   const idleKnown=!c.families.length||c.families.some(f=>Object.hasOwn(f,'idle_days'));
   family={id:uuid(),name,emblem:action.emblem,invite_code:familyCode(c,random),is_open:true,join_mode:'open',min_level:null,...(idleKnown?{idle_days:FAMILY_IDLE_DEFAULT}:{}),created_at:now,renamed_at:null,deleted_at:null};c.families.push(family);   // open from the start (27 Sep 2026; was invite only, and most families stayed a family of one)
   const next={id:member?.id??uuid(),player_id:player,family_id:family.id,role:'leader',joined_at:now,left_at:null,...keepBlock(member),...LEFT_NONE};if(member)Object.assign(member,next);else c.members.push(next);member=next;
   result={message:'Your Farm Family is ready. Anyone can join it; you can change that in Family settings.'};
  }else if(type==='family_join'){
   joinable(action.familyId);
   if(action.code)throw new Error('Invite codes have been replaced. Ask the family leader or a co-leader to invite your player name.');
   const found=c.families.find(f=>f.id===action.familyId&&familyJoinMode(f)==='open'&&!f.deleted_at);
   if(!found||familyMembers(c,found.id).length>=config.MAX_MEMBERS)throw new Error('This family is unavailable or full.');
   if(levelOf(state)<familyMinLevel(found))throw new Error(`This family is for farmers from level ${familyMinLevel(found)}.`);
   const next={id:member?.id??uuid(),player_id:player,family_id:found.id,role:'member',joined_at:now,left_at:null,...keepBlock(member),...LEFT_NONE};if(member)Object.assign(member,next);else c.members.push(next);member=next;family=found;result={message:'Welcome to your Farm Family.'};
  }else if(type==='family_rejoin'){
   // Join again (17 Oct 2026, the owner): back into the family they left by being away too long, as a member, whatever its join mode
   // or minimum level, without a wait (familyRejoinOffer: it is still there, has room and has not removed them).
   joinable(action.familyId);const offer=familyRejoinOffer(c,player,now,config);
   if(!offer||offer.familyId!==action.familyId)throw new Error('This family is unavailable or full.');
   const found=c.families.find(f=>f.id===offer.familyId);
   Object.assign(member,{family_id:found.id,role:'member',joined_at:now,left_at:null,...keepBlock(member),...LEFT_NONE});family=found;result={message:`Welcome back to ${found.name}!`};
  }else if(type==='family_invite'){
   manager();
   if(familyJoinMode(family)==='closed')throw new Error('Your family is closed to new farmers. Change who can join in Family settings first.');
   const target=c.players.find(p=>p.player_id===action.playerId);
   if(!target||target.player_id===player)throw new Error('Choose another farmer.');
   if(target.level<minLevel)throw new Error(`This farmer needs level ${minLevel} to join a family.`);
   if(familyMembers(c,family.id).length>=config.MAX_MEMBERS)throw new Error('Your family is full.');
   if(familyCurrent(c,target.player_id))throw new Error('This farmer already belongs to a family.');
   const invited=familyMember(c,target.player_id);if(blockedFrom(invited,family.id))throw new Error(`Your family removed this farmer. You can invite them again in ${blockedFor(invited)}.`);
   if(c.invitations.some(i=>i.recipient_id===target.player_id&&i.status==='pending'))throw new Error('This farmer already has a pending invitation. They must accept or decline it first.');
   c.invitations.push({id:uuid(),family_id:family.id,recipient_id:target.player_id,invited_by:player,created_at:now,expires_at:now+FAMILY_INVITATION_LIFETIME,status:'pending',resolved_at:null});
   result={message:`Invitation sent to ${target.username}.`};
  }else if(type==='family_accept_invite'){
   joinable();
   const invite=c.invitations.find(i=>i.id===action.invitationId&&i.recipient_id===player&&i.status==='pending');
   if(!invite)throw new Error('This invitation is no longer available.');
   const found=c.families.find(f=>f.id===invite.family_id&&!f.deleted_at);
   if(!found||familyMembers(c,found.id).length>=config.MAX_MEMBERS)throw new Error('This family is unavailable or full.');
   if(familyJoinMode(found)==='closed')throw new Error('This family is closed to new farmers.');
   joinable(found.id);
   const next={id:member?.id??uuid(),player_id:player,family_id:found.id,role:'member',joined_at:now,left_at:null,...keepBlock(member),...LEFT_NONE};if(member)Object.assign(member,next);else c.members.push(next);member=next;family=found;
   invite.status='accepted';invite.resolved_at=now;result={message:`Welcome to ${found.name}!`};
  }else if(type==='family_decline_invite'){
   const invite=c.invitations.find(i=>i.id===action.invitationId&&i.recipient_id===player&&i.status==='pending');
   if(!invite)throw new Error('This invitation is no longer available.');
   invite.status='declined';invite.resolved_at=now;result={message:'Invitation declined.'};
  }else if(type==='family_cancel_invite'){
   manager();const invite=c.invitations.find(i=>i.id===action.invitationId&&i.family_id===family.id&&i.status==='pending');
   if(!invite)throw new Error('This invitation is no longer pending.');
   invite.status='cancelled';invite.resolved_at=now;result={message:'Invitation cancelled.'};
  }else if(['family_leave','family_kick'].includes(type)){
   needFamily();if(type==='family_kick')manager();const target=type==='family_leave'?member:c.members.find(m=>m.id===action.memberId&&m.family_id===family.id&&!m.left_at);
   if(!target||type==='family_kick'&&target.player_id===player)throw new Error('Choose another family member.');
   if(type==='family_kick'&&member.role==='coleader'&&familyManager(target.role))throw new Error('A co-leader cannot remove the leader or the other co-leader.');
   // Leaving never waits (2 Oct 2026); a farmer who is removed can join any other family at once, only not this one for a while.
   const kicked=type==='family_kick';
   const wasLeader=target.role==='leader';target.family_id=null;target.left_at=now;target.cooldown_until=kicked?now+config.JOIN_COOLDOWN_MS:null;target.blocked_family=kicked?family.id:null;target.role='member';
   const remaining=familyMembers(c,family.id).sort((a,b)=>a.joined_at-b.joined_at||a.id.localeCompare(b.id));if(!remaining.length)family.deleted_at=now;else if(wasLeader)(remaining.find(m=>m.role==='coleader')??remaining[0]).role='leader';   // a co-leader first
   result={message:kicked?`Member removed. They can join another family right away, but not this one for ${Math.round(config.JOIN_COOLDOWN_MS/3600000)} hours.`:'You left your family. You can join another family right away.'};
  }else if(type==='family_promote'){
   leader();const target=c.members.find(m=>m.id===action.memberId&&m.family_id===family.id&&!m.left_at&&m.player_id!==player);if(!target)throw new Error('Choose another family member.');member.role='member';target.role='leader';result={message:'Family leadership transferred.'};
  }else if(type==='family_rank'){
   leader();const target=c.members.find(m=>m.id===action.memberId&&m.family_id===family.id&&!m.left_at&&m.player_id!==player);if(!target)throw new Error('Choose another family member.');
   if(!['coleader','honorary','member'].includes(action.rank))throw new Error('Choose a rank.');
   if(action.rank==='coleader'&&target.role!=='coleader'&&familyMembers(c,family.id).filter(m=>m.role==='coleader').length>=FAMILY_MAX_COLEADERS)throw new Error(`A family has at most ${FAMILY_MAX_COLEADERS} co-leaders.`);
   target.role=action.rank;const name=c.players.find(p=>p.player_id===target.player_id)?.username??'This farmer';
   result={message:`${name} is now ${({coleader:'a co-leader',honorary:'an honorary member',member:'a member'})[action.rank]}.`};
  }else if(type==='family_rename'){
   manager();if(family.renamed_at&&now-family.renamed_at<config.RENAME_COOLDOWN_MS)throw new Error('You can rename your family once every seven days.');if(!validName(action.name))throw new Error('Use a valid 3–20 character family name.');const name=action.name.trim();if(c.families.some(f=>f.id!==family.id&&!f.deleted_at&&f.name.toLowerCase()===name.toLowerCase()))throw new Error('That family name is taken.');family.name=name;family.renamed_at=now;result={message:'Family renamed.'};
  }else if(type==='family_emblem'){
   manager();if(!familyEmblemValid(action.emblem))throw new Error('Choose a family emblem.');
   if(!familyEmblemAllowed(action.emblem,{current:family.emblem,owned:[...(options.seasonEmblems??[]),...(SEASON_EMBLEMS[action.emblem]&&ownsLook(state,SEASON_EMBLEMS[action.emblem])?[action.emblem]:[])]}))throw new Error('Someone in your family needs this emblem from the Season Pass first.');
   family.emblem=action.emblem;result={message:'Family emblem updated.'};
  }else if(type==='family_open'){
   manager();if(typeof action.open!=='boolean')throw new Error('Choose open or invite-only.');family.is_open=action.open;family.join_mode=action.open?'open':'invite';refreshFamilyRequests(c,now);result={message:action.open?'Your family is open to new members.':'Your family is invite-only.'};
  }else if(type==='family_join_mode'){
   manager();if(!Object.hasOwn(FAMILY_JOIN_MODES,action.mode??''))throw new Error('Choose who can join.');
   family.join_mode=action.mode;family.is_open=action.mode==='open';refreshFamilyRequests(c,now);
   result={message:{open:'Anyone can now join your family.',request:'Farmers can now ask to join. You decide.',invite:'Farmers can now join only by invitation.',closed:'Your family is now closed to new farmers.'}[action.mode]};
  }else if(type==='family_min_level'){
   manager();const level=Number(action.level);if(!FAMILY_MIN_LEVELS.includes(level))throw new Error('Choose a minimum level.');
   family.min_level=level>FAMILY_MIN_LEVEL?level:null;
   result={message:`Farmers from level ${level} can now join.`};
  }else if(type==='family_shirt'){
   // The family shirt (21 Oct 2026, the owner: "Doe alles behalve 9", item 6): the leader or a co-leader picks its cut (or none). Not
   // before supabase/family-shirt.sql has run (no shirt on the family): the database would drop it without a word.
   manager();if(!Object.hasOwn(family,'shirt'))throw new Error('The family shirt is not open yet.');
   const shirt=action.shirt??null;if(shirt!==null&&!FAMILY_SHIRTS.includes(shirt))throw new Error('Choose a family shirt.');
   family.shirt=shirt;result={message:shirt?'Family shirt chosen. Members can wear it in My farmer.':'Your family has no shirt now.'};
  }else if(type==='family_idle_days'){
   // Away too long (17 Oct 2026, the owner): after how many days without playing a member leaves; the leader or a co-leader picks.
   // Not before supabase/family-idle-leave.sql has run (no idle_days on the family): the database would drop it without a word.
   manager();if(!Object.hasOwn(family,'idle_days'))throw new Error('Choose after how many days.');
   const days=Number(action.days);if(!FAMILY_IDLE_DAYS.includes(days))throw new Error('Choose after how many days.');
   family.idle_days=days;result={message:`Members who don't play for ${days} days now leave the family automatically.`};
  }else if(type==='family_request'){
   joinable(action.familyId);
   const found=c.families.find(f=>f.id===action.familyId&&!f.deleted_at);
   if(!found||familyJoinMode(found)!=='request')throw new Error('This family does not take requests right now.');
   if(familyMembers(c,found.id).length>=config.MAX_MEMBERS)throw new Error('This family is full.');
   if(levelOf(state)<familyMinLevel(found))throw new Error(`This family is for farmers from level ${familyMinLevel(found)}.`);
   const mine=c.requests.find(r=>r.player_id===player&&r.status==='pending');
   if(mine)throw new Error(mine.family_id===found.id?'You already asked to join this family.':`You already asked to join ${c.families.find(f=>f.id===mine.family_id)?.name??'another family'}. Cancel that request first.`);
   c.requests.push({id:uuid(),family_id:found.id,player_id:player,status:'pending',created_at:now,expires_at:now+FAMILY_REQUEST_LIFETIME,resolved_at:null,resolved_by:null});
   result={message:`Request sent to ${found.name}. Their leader or a co-leader can accept it within 3 days.`,requestedFamily:found.id};
  }else if(type==='family_request_cancel'){
   const request=c.requests.find(r=>r.id===action.requestId&&r.player_id===player&&r.status==='pending');
   if(!request)throw new Error('This request is no longer open.');
   request.status='cancelled';request.resolved_at=now;result={message:'Request cancelled.'};
  }else if(type==='family_request_accept'||type==='family_request_decline'){
   manager();const request=c.requests.find(r=>r.id===action.requestId&&r.family_id===family.id&&r.status==='pending');
   if(!request)throw new Error('This request is no longer open.');
   const name=c.players.find(p=>p.player_id===request.player_id)?.username??'This farmer';
   if(type==='family_request_accept'){
    if(familyMembers(c,family.id).length>=config.MAX_MEMBERS)throw new Error('Your family is full.');
    if(familyCurrent(c,request.player_id))throw new Error(`${name} already belongs to a family.`);
    const joiner=familyMember(c,request.player_id);if(blockedFrom(joiner,family.id))throw new Error(`Your family removed ${name}. You can let them in again in ${blockedFor(joiner)}.`);
    const next={id:joiner?.id??uuid(),player_id:request.player_id,family_id:family.id,role:'member',joined_at:now,left_at:null,...keepBlock(joiner),...LEFT_NONE};if(joiner)Object.assign(joiner,next);else c.members.push(next);
    request.status='accepted';result={message:`${name} joined your family.`,accepted:request.player_id};
   }else{request.status='declined';result={message:'Request declined.',declined:request.player_id};}
   request.resolved_at=now;request.resolved_by=player;

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
   // A delivery that fills a line says what that line is worth now (5 Oct 2026: every full line pays a quarter of the rewards).
   const complete=completeFamilyOrder(c,order,now,config),lineFull=type==='family_contribute'&&action.count===needed;
   result={points,completed:complete,message:complete?'Family Order complete! Your rewards are ready.':lineFull?`${action.count} ${ITEMS[action.item].name} contributed. That line is full: every full line pays a quarter of the rewards.`:`${action.count} ${ITEMS[action.item].name} contributed. Thank you!`};
  }else if(type==='family_claim'){
   const reward=c.rewards.find(r=>r.id===action.rewardId&&r.player_id===player);if(!reward||reward.expires_at<=now)throw new Error('This reward is unavailable or has expired.');if(reward.claimed_at)throw new Error('This reward has already been claimed.');
   reward.claimed_at=now;state.coins+=reward.coins;state.xp+=reward.xp;state.diamonds+=reward.diamonds;state.stats.diamonds_earned=(state.stats.diamonds_earned??0)+reward.diamonds;
   const levelReward=grantLevelRewards(state);refreshProgressionDaily(state,now);result={coins:reward.coins,xp:reward.xp,diamonds:reward.diamonds,levelReward,message:`Family rewards: +${reward.coins} coins · +${reward.xp} XP · +${reward.diamonds} diamonds.`};
  }else if(type!=='family_read')throw new Error('Choose a valid family action.');
 }catch(error){if(['family_create','family_join','family_invite','family_accept_invite','family_request','family_rejoin'].includes(type))return {context:c,result:{error:error.message},settled,failed:true};throw error;}
 refreshFamilyInvitations(c,now);
 family=familyCurrent(c,player);if(family){ensureFamilyOrder(c,family,week,now,config);grantFamilyChest(c,family.id,week,now,config);}
 // The farm shows a family flag by the Family Hall (game.js): the name, emblem and level travel with the farm.
 state.family={familyId:family?.id??null,unclaimedCount:c.rewards.filter(r=>r.player_id===player&&!r.claimed_at&&r.expires_at>now).length,...(family?{name:family.name,emblem:family.emblem,level:familyStanding(c,family.id).level}:{})};
 return {context:c,result,settled,failed:false};
}
// Top farmer of the week (27 Sep 2026): the member who brought the most points into the Family Chest this week wears a crown in
// the member list and on the family profile until the week ends (Monday, 00:00 UTC). Nobody before the first chest point.
export function familyTopFarmer(c,familyId,week){
 const current=new Set(familyMembers(c,familyId).map(m=>m.player_id));
 const best=(c.chestPlayers??[]).filter(r=>r.family_id===familyId&&r.week===week&&current.has(r.player_id)&&Number(r.points)>0)
  .sort((a,b)=>Number(b.points)-Number(a.points)||String(a.player_id).localeCompare(String(b.player_id)))[0];
 return best?.player_id??null;
}
export function familyPublicView(c,player,state,now,config=FAMILY_CONFIG){
 const week=familyWeek(now),family=familyCurrent(c,player),me=familyMember(c,player),board=familyTournament(c,week,config);
 const current=c.contributions.find(r=>r.player_id===player&&r.week===week),order=family?c.orders.find(o=>o.family_id===family.id&&o.week===week):null;
 const contributionLocked=!!current&&current.family_id!==family?.id;
 const yourPrize=board.prizes.find(p=>p.family_id===family?.id);
 // Your family's place for the Tournament tab: its points and how far the family above is ahead. Since Oct 2026 also how far it is
 // ahead of the family below (any family that takes part, also below tenth, which the top-ten list does not show) and of how many.
 const place=board.qualifying.findIndex(f=>f.family_id===family?.id),above=place>0?board.qualifying[place-1]:null;
 const rewards=c.rewards.filter(r=>r.player_id===player&&!r.claimed_at&&r.expires_at>now).map(({id,week,kind,coins,xp,diamonds,expires_at})=>({id,week,kind,coins,xp,diamonds,expiresAt:expires_at}));
 const topFarmer=family?familyTopFarmer(c,family.id,week):null;
 // The Stats tab (Oct 2026): each member's week in three parts, chest points (what fills the Family Chest and wins the crown) and
 // the two halves of their tournament points, order deliveries and tournament goods (points = order + goods). This week's rows are
 // looked up once, not searched per member: contributions are kept for every week.
 const weekRows=new Map(family?c.contributions.filter(r=>r.family_id===family.id&&r.week===week).map(r=>[r.player_id,r]):[]);
 const chestRows=new Map(family?(c.chestPlayers??[]).filter(r=>r.family_id===family.id&&r.week===week).map(r=>[r.player_id,Number(r.points)||0]):[]);
 // daysAway (17 Oct 2026, the owner): whole days since a member last played, "5 days away" in the list from 1; only the days, never
 // the time itself (as online is only a yes or no).
 const members=family?familyMembers(c,family.id).map(m=>{const p=c.players.find(p=>p.player_id===m.player_id),row=weekRows.get(m.player_id);return {id:m.id,playerId:m.player_id,username:p?.username??'Farmer',avatarId:p?.avatar_id??'default',look:wornLook(p?.look),level:p?.level??1,vipExpiresAt:Date.parse(p?.vip_expires_at)||0,online:p?.online===true,points:row?.points??0,orderPoints:row?.order_points??0,extraPoints:row?.extra_points??0,chestPoints:chestRows.get(m.player_id)??0,role:m.role,top:m.player_id===topFarmer,isSelf:m.player_id===player,daysAway:familyDaysAway(p?.last_active_at,m.joined_at,now)};}):[];
 // Your family's own last weeks (Oct 2026, the Stats tab): its settled results, newest first, at most eight, each with how many
 // families were ranked that week ("#4 of 14"). Ranks in a week run 1, 2, 3 … without gaps (unique per week), so fewer rows than
 // the lowest place means a row is missing: then the number is unknown (null) rather than wrong.
 const ownResults=family?c.results.filter(r=>r.family_id===family.id).sort((a,b)=>b.week-a.week).slice(0,8):[],ranked=new Map(ownResults.map(r=>[r.week,{rows:0,last:0}]));
 if(ranked.size)for(const r of c.results){const w=ranked.get(r.week);if(w){w.rows++;w.last=Math.max(w.last,r.rank);}}
 const history=ownResults.map(r=>{const w=ranked.get(r.week);return {week:r.week,rank:r.rank,points:r.points,diamonds:r.diamonds_pool,activeMembers:r.active_members,families:w.rows>=w.last?w.rows:null};});
 // The farmer's own last week (Oct 2026): their tournament points, the place of the family they delivered for (or whose chest they
 // filled), and their chest points (the context holds chest points for this week and last week only). Null when they did neither.
 const lastRow=c.contributions.find(r=>r.player_id===player&&r.week===week-1),lastChest=(c.chestPlayers??[]).filter(r=>r.player_id===player&&r.week===week-1);
 const lastChestPoints=lastChest.reduce((n,r)=>n+(Number(r.points)||0),0),lastFamily=lastRow?.family_id??[...lastChest].sort((a,b)=>(Number(b.points)||0)-(Number(a.points)||0))[0]?.family_id;
 const lastWeek=lastRow||lastChestPoints>0?{week:week-1,points:lastRow?.points??0,rank:c.results.find(r=>r.week===week-1&&r.family_id===lastFamily)?.rank??null,chestPoints:lastChestPoints}:null;
 const card=f=>{const list=familyMembers(c,f.id),members=list.length,active=list.filter(m=>now-Date.parse(c.players.find(p=>p.player_id===m.player_id)?.last_active_at??0)<FAMILY_ACTIVE_MS).length;return {id:f.id,name:f.name,emblem:f.emblem,members,active,level:familyStanding(c,f.id).level,mode:familyJoinMode(f),minLevel:familyMinLevel(f),full:members>=config.MAX_MEMBERS};};
 c.requests??=[];const liveRequest=r=>r.status==='pending'&&r.expires_at>now&&c.families.some(f=>f.id===r.family_id&&!f.deleted_at&&familyJoinMode(f)==='request');
 const mine=c.requests.find(r=>r.player_id===player&&liveRequest(r)&&!family);
 const MODE_ORDER={open:0,request:1,invite:2,closed:3};
 const pending=(c.invitations??[]).filter(i=>i.status==='pending'&&i.expires_at>now&&c.families.some(f=>f.id===i.family_id&&!f.deleted_at)&&!familyCurrent(c,i.recipient_id));
 const incoming=pending.find(i=>i.recipient_id===player);
 const invitedFamily=incoming?c.families.find(f=>f.id===incoming.family_id):null;
 const invitation=incoming?{id:incoming.id,family:card(invitedFamily),invitedBy:c.players.find(p=>p.player_id===incoming.invited_by)?.username??'Family leader',expiresAt:incoming.expires_at,canAccept:!family&&!(me?.blocked_family===invitedFamily.id&&(me?.cooldown_until??0)>now)&&familyMembers(c,invitedFamily.id).length<config.MAX_MEMBERS}:null;
 const sentInvitations=family&&familyManager(me?.role)?pending.filter(i=>i.family_id===family.id).map(i=>({id:i.id,recipientId:i.recipient_id,username:c.players.find(p=>p.player_id===i.recipient_id)?.username??'Farmer',expiresAt:i.expires_at})):[];

 // Every family for a farmer without one (who can join, and how), open ones first; the farmer's own request; a leader's requests.
 // Families you can join (open or taking requests, with room) first, the busiest of them on top (27 Sep 2026).
 const joinableCard=f=>!f.full&&(f.mode==='open'||f.mode==='request')&&levelOf(state)>=f.minLevel;
 const families=family?[]:c.families.filter(f=>!f.deleted_at).map(card).sort((a,b)=>Number(joinableCard(b))-Number(joinableCard(a))||b.active-a.active||b.level-a.level||MODE_ORDER[a.mode]-MODE_ORDER[b.mode]||b.members-a.members||a.name.localeCompare(b.name)).slice(0,60);
 const myRequest=mine?{id:mine.id,family:card(c.families.find(f=>f.id===mine.family_id)),expiresAt:mine.expires_at}:null;
 const joinRequests=family&&familyManager(me?.role)?c.requests.filter(r=>r.family_id===family.id&&liveRequest(r)&&!familyCurrent(c,r.player_id)).sort((a,b)=>a.created_at-b.created_at).map(r=>{const p=c.players.find(p=>p.player_id===r.player_id);return {id:r.id,playerId:r.player_id,username:p?.username??'Farmer',level:p?.level??1,avatarId:p?.avatar_id??'default',createdAt:r.created_at,expiresAt:r.expires_at};}):[];
 // The Family Chest this week (points, the four tiers and what each gives you), the family level, and whether you are its only member
 // (the Family screen then suggests finding a busier family).
 const standing=family?familyStanding(c,family.id):null,extra=1+(standing?.bonus??0),myLevel=levelOf(state);
 const chestPoints=family?Number(c.chests?.find(r=>r.family_id===family.id&&r.week===week)?.points)||0:0,myChest=chestRows.get(player)??0;
 const chest=family?{points:chestPoints,mine:myChest,minPoints:FAMILY_CHEST_MIN,tiers:FAMILY_CHEST_TIERS.map(t=>({id:t.id,name:t.name,points:t.points,reached:chestPoints>=t.points,diamonds:Math.floor(t.diamonds*extra),coins:Math.floor(t.coinsPerLevel*myLevel*extra)}))}:null;
 const alone=!!family&&familyMembers(c,family.id).length===1&&now-(me?.joined_at??now)>=FAMILY_ACTIVE_MS;
 // What the Family Order pays you so far, worked out as completeFamilyOrder pays it (Oct 2026: the family-level bonus was left out,
 // so a family at level 2 or higher saw less than it got). The bonus is that of the family you deliver for this week. The shared
 // completion diamonds get it too; the payout rounds your diamonds and your share of them together, so it can be one more.
 // Since 5 Oct 2026 an unfinished order pays for its full lines when the week ends (familyOrderPay). coins, xp and diamonds stay
 // what the whole order gives for your points so far; fullLines of lines are full in the order you deliver for, and now is what the
 // week's end would pay you today: nothing below MIN_CONTRIB_POINTS or without a full line, everything when the order is whole.
 const orderPoints=current?.order_points??0,orderExtra=current&&current.family_id!==family?.id?1+familyStanding(c,current.family_id).bonus:extra;
 const payOrder=current?c.orders.find(o=>o.family_id===current.family_id&&o.week===week):order,orderLines=Object.keys(payOrder?.lines??{}).length,fullLines=familyOrderFullLines(payOrder);
 const rewardPreview={...familyOrderPay(orderPoints,orderExtra,1,1,config),completionBonus:Math.floor(config.ORDER_COMPLETION_DIAMONDS*orderExtra),fullLines,lines:orderLines,
  now:familyOrderPay(orderPoints,orderExtra,orderPoints>=config.MIN_CONTRIB_POINTS?fullLines:0,orderLines,config)};
 // idleDays is null until supabase/family-idle-leave.sql has run (no idle_days on the family yet): the window then says nothing of the
 // rule, which nothing carries out yet. rejoin: Join again, for a farmer without a family (familyRejoinOffer).
 return {chest,standing,alone,invitation,sentInvitations,families,myRequest,joinRequests,seasonEmblems:family?[...new Set([...(Array.isArray(c.seasonEmblems)?c.seasonEmblems:[]),...(Object.hasOwn(SEASON_EMBLEMS,family.emblem)?[family.emblem]:[])])]:[],rejoin:family?null:familyRejoinOffer(c,player,now,config),week,endsAt:familyWeekStart(week+1),serverNow:now,config:{minLevel:FAMILY_MIN_LEVEL,maxMembers:config.MAX_MEMBERS,minPoints:config.MIN_CONTRIB_POINTS,diamondCap:config.TOURNAMENT_FIRST_MAX+config.ORDER_PLAYER_WEEK_DIAMOND_CAP,orderDiamondCap:config.ORDER_PLAYER_WEEK_DIAMOND_CAP},family:family?{...card(family),open:familyJoinMode(family)==='open',leader:me.role==='leader',manager:familyManager(me.role),role:me.role,renameAt:(family.renamed_at??0)+config.RENAME_COOLDOWN_MS,sharedAt:Number(family.shared_at)||0,idleDays:Object.hasOwn(family,'idle_days')?familyIdleDays(family):null,shirt:Object.hasOwn(family,'shirt')?(FAMILY_SHIRTS.includes(family.shirt)?family.shirt:null):undefined}:null,// The one family that removed this farmer, while it is closed to them (2 Oct 2026; there was one wait for every family).
  blocked:me?.blocked_family&&(me.cooldown_until??0)>now?{family:me.blocked_family,until:me.cooldown_until}:null,openFamilies:c.families.filter(f=>!f.deleted_at&&familyJoinMode(f)==='open'&&familyMembers(c,f.id).length<config.MAX_MEMBERS).slice(0,30).map(card),members,order:order?{lines:order.lines,filled:order.filled,completed:!!order.completed_at,value:order.value,memberCount:order.member_count}:null,yourPoints:current?.points??0,yourOrderPoints:current?.order_points??0,extraUsed:current?.extra_points??0,contributionLocked,rewards,rewardPreview,lastWeek,tournament:{pool:board.pool,minimumPool:config.TOURNAMENT_FIRST_MIN,firstPrize:board.firstPrize,firstPrizeMin:config.TOURNAMENT_FIRST_MIN,firstPrizeMax:config.TOURNAMENT_FIRST_MAX,perExtraFamily:config.TOURNAMENT_PER_EXTRA_FAMILY,activePlayers:board.activePlayers,activeFamilies:board.qualifying.length,yourRank:yourPrize?.rank??null,yourDiamonds:yourPrize?.shares[player]??0,familyDiamonds:yourPrize?.diamonds??0,entered:!!yourPrize&&Object.hasOwn(yourPrize.shares,player),placePrizes:config.TOURNAMENT_SHARES.map(share=>Math.floor(Math.max(board.total,board.firstPrize*2)*share/100)),placeShares:config.TOURNAMENT_SHARES,poolSteps:[1,2,3].map(n=>Math.round((config.TOURNAMENT_FIRST_MIN+(n-1)*config.TOURNAMENT_PER_EXTRA_FAMILY)*config.RANK_WEIGHTS.slice(0,n).reduce((a,w)=>a+w,0))),poolPerFamily:config.TOURNAMENT_PER_EXTRA_FAMILY*2,poolMax:config.TOURNAMENT_FIRST_MAX*2,familiesForMax:Math.ceil((config.TOURNAMENT_FIRST_MAX-config.TOURNAMENT_FIRST_MIN)/config.TOURNAMENT_PER_EXTRA_FAMILY)+1,familyPoints:place>=0?board.qualifying[place].points:0,pointsBehind:above?above.points-board.qualifying[place].points:0,pointsAhead:place>=0&&place+1<board.qualifying.length?board.qualifying[place].points-board.qualifying[place+1].points:null,rankOf:board.qualifying.length,history,top:board.qualifying.slice(0,10).map((f,i)=>({familyId:f.family_id,name:f.name,emblem:f.emblem,points:f.points,activeMembers:f.active_members,qualified:true,diamonds:board.prizes[i].diamonds})),past:c.results.filter(r=>r.week>=week-4&&r.week<week).sort((a,b)=>b.week-a.week||a.rank-b.rank).map(r=>({week:r.week,familyId:r.family_id,name:r.name,rank:r.rank,points:r.points,activeMembers:r.active_members,diamonds:r.diamonds_pool}))}};
}
// A family's profile (27 Sep 2026): opened from a farmer's profile, the list of families, your own family and the tournament. Its
// members with their levels, its level and how far to the next, and how it has done: tournaments won and on the podium, chest tiers
// opened, Family Orders completed, and this week so far. Only what the family list, the tournament and farmer profiles show anyway.
const RANK_ORDER={leader:0,coleader:1,honorary:2,member:3};
export function familyProfile(c,familyId,player,state,now,config=FAMILY_CONFIG){
 const f=c.families.find(x=>x.id===familyId&&!x.deleted_at);if(!f)return null;
 const week=familyWeek(now),list=familyMembers(c,f.id),standing=familyStanding(c,f.id),board=familyTournament(c,week,config),top=familyTopFarmer(c,f.id,week);
 const members=list.map(m=>{const p=c.players.find(p=>p.player_id===m.player_id);return {playerId:m.player_id,username:p?.username??'Farmer',avatarId:p?.avatar_id??'default',level:p?.level??1,role:m.role,leader:m.role==='leader',top:m.player_id===top,online:!!p?.online,vipExpiresAt:Date.parse(p?.vip_expires_at)||0};})
  .sort((a,b)=>RANK_ORDER[a.role]-RANK_ORDER[b.role]||b.level-a.level||a.username.localeCompare(b.username));
 const results=c.results.filter(r=>r.family_id===f.id).sort((a,b)=>b.week-a.week),place=board.qualifying.findIndex(x=>x.family_id===f.id);
 const chestPoints=Number((c.chests??[]).find(r=>r.family_id===f.id&&r.week===week)?.points)||0;
 const mine=familyCurrent(c,player),me=familyMember(c,player);
 const request=(c.requests??[]).find(r=>r.player_id===player&&r.status==='pending'&&r.expires_at>now&&!mine);
 return {id:f.id,name:f.name,emblem:f.emblem,mode:familyJoinMode(f),minLevel:familyMinLevel(f),createdAt:Date.parse(f.created_at)||null,members,maxMembers:config.MAX_MEMBERS,full:members.length>=config.MAX_MEMBERS,
  online:members.filter(m=>m.online).length,standing,
  stats:{wins:results.filter(r=>r.rank===1).length,podiums:results.filter(r=>r.rank<=3).length,tournaments:results.length,bestRank:results.length?Math.min(...results.map(r=>r.rank)):null,
   chestTiers:standing.tiers,orders:c.orders.filter(o=>o.family_id===f.id&&o.completed_at).length},
  thisWeek:{chestPoints,chestTiers:familyChestTiers(chestPoints),points:board.entries.find(x=>x.family_id===f.id)?.points??0,rank:place>=0?place+1:null},
  recent:results.slice(0,5).map(r=>({week:r.week,rank:r.rank,points:r.points})),
  // What you can do here: nothing extra in your own family; otherwise join or ask, as in the list of families.
  viewer:{member:mine?.id===f.id,inFamily:!!mine,unlocked:familyUnlocked(state),level:levelOf(state),cooldown:me?.blocked_family===f.id&&(me?.cooldown_until??0)>now,requestId:request?.family_id===f.id?request.id:null,requestElsewhere:!!request&&request.family_id!==f.id}};
}
// The admin view (3 Oct 2026): an admin account plays nothing (farm-api locks every action), so its farm is not its real one but this
// showcase: level 999, every building built and at its top level, all 40 fields growing (watered, cared for, not ripe yet), every
// production slot busy, everything up to and including the endgame finished, nothing waiting to be collected or claimed. farm-api
// builds it fresh on every load of an admin account and stores nothing; it is made from `now` alone, so a refresh a minute later looks
// the same. family: the admin's real family (the 3D flag and the Family window), copied as it is.
export const SHOWCASE_LEVEL=999;
const SHOWCASE_CROPS=Object.freeze([...['wheat','corn','sunflower','barley','redcabbage','pumpkin','cauliflower','greenbeans','berries'].flatMap(c=>[c,c,c,c]),'apples','cherries','ciderapples','cherries']);   // ten rows of four, the orchard last; no pole beans (heavy to draw)
export function createShowcaseFarm(now=Date.now(),{family=null}={}){
 const s=createFarm(now),HOUR=3600000;
 Object.assign(s,{showcase:true,xp:xpForLevel(SHOWCASE_LEVEL)+Math.floor((xpForLevel(SHOWCASE_LEVEL+1)-xpForLevel(SHOWCASE_LEVEL))/2),xpOffset:0,xpCurve:XP_CURVE,coins:0,diamonds:0,rookieUntil:0,keep:{},vipExpiresAt:0});
 if(family&&typeof family==='object')s.family=structuredClone(family);
 s.inventory=Object.fromEntries(Object.keys(ITEMS).map(k=>[k,250]));s.discovered=Object.keys(CROPS);
 s.onboarding={completed:BEGINNER_QUESTS.length,milestones:Object.fromEntries(BEGINNER_QUESTS.map(q=>[q.id,true])),rewardClaimed:true};
 s.levelRewards=Array.from({length:SHOWCASE_LEVEL},(_,i)=>i+1);
 // 29 of 30 days grown: full size and green, never ripe while it is looked at (no "ready" labels, a tap only says when).
 s.plots=SHOWCASE_CROPS.map((crop,id)=>({id,crop,plantedAt:now-29*DAY_MS,readyAt:now+DAY_MS,careAt:now-29*DAY_MS,watered:true,tended:true,fertilized:true,...(CROPS[crop].perennial?{harvestCycles:3}:{})}));
 for(const [key,b] of Object.entries(BUILDINGS)){
  const own=s.buildings[key];own.built=true;own.job=null;own.extraJobs=[];own.batchSequence=0;
  if(b.type!=='production')continue;
  if(beyondMaxBuilding(key)){own.level=TOP_BUILDING_LEVEL;own.beyond=TOP_BUILDING_LEVEL-MAX_BUILDING_LEVEL;}else own.level=MAX_BUILDING_LEVEL;
  // Every slot busy for hours (smoke, a turning windmill), its first recipe; nothing ready to collect.
  const recipe=Object.keys(RECIPES).filter(id=>RECIPES[id].building===key).sort((a,c)=>(RECIPE_LEVELS[a]??0)-(RECIPE_LEVELS[c]??0)||a.localeCompare(c))[0];if(!recipe)continue;
  const jobs=Array.from({length:productionSlots(own.level,key)},(_,i)=>({id:`${key}-${i+1}`,recipe,startedAt:now-HOUR,readyAt:now+(8+i)*HOUR,output:{...RECIPES[recipe].output},xp:RECIPES[recipe].xp}));
  own.job=jobs.shift()??null;own.extraJobs=jobs;own.batchSequence=jobs.length+1;
 }
 s.buildings.farmhouse.level=1+MAX_PLOTS-12;
 s.siloLevel=SILO_COSTS.length;s.stall={level:STALL_MAX_LEVEL,since:now,bank:0};
 s.estate={completed:PROJECTS.length,job:null,diamondChapters:PROJECTS.map((_,i)=>i)};s.improvements=Object.keys(IMPROVEMENTS);
 s.master=Object.fromEntries(Object.entries(MASTER_BRANCHES).map(([k,b])=>[k,b.max]));s.lab={beds:[null,null],found:Object.keys(HEIRLOOMS)};
 s.valleyProjects=Object.fromEntries(Object.entries(VALLEY_PROJECTS).map(([k,p])=>[k,{level:p.levels.length,given:{}}]));
 s.giant={week:familyWeek(now),kg:320,tends:24,lastTendAt:now,weighed:false,record:480,last:null};s.ranch={focus:'dairy',changes:1};
 s.chorePractice=Object.fromEntries(Object.keys(CHORES).map(k=>[k,50]));s.chores=Object.fromEntries(Object.keys(CHORES).map(k=>[k,now+DAY_MS]));
 s.claimed=QUESTS.map((_,i)=>i);s.villageQuests=VILLAGE_QUESTS.map((_,i)=>i);
 s.mastery={harvests:Object.fromEntries(Object.keys(CROPS).map(k=>[k,1000])),claimed:Object.keys(CROPS).flatMap(k=>MASTERY_TIERS.map((_,t)=>`${k}:${t}`))};
 for(const k of Object.keys(ITEMS))s.stats[(CROPS[k]?'harvest_':'made_')+k]=1000;
 Object.assign(s.stats,{harvested:25000,planted:25000,watered:20000,tended:15000,produced:12000,earned:50000000,expansions:MAX_PLOTS-12,upgrades:300,deliveries:2000,sold:40000,dailies:600,chores:900,mastery_medals:Object.keys(CROPS).length*MASTERY_TIERS.length,projects:PROJECTS.length});
 s.login={lastDay:utcDay(now),streak:30,best:60,visits:200};s.comeback={lastAt:now,collected:0,pending:null};
 // World II (Oct 2026): every landmark finished and the town boat away for a month. Set before the farm is normalized, so the Lookout
 // tower's fourth villager is there when every board is emptied below.
 s.village={serial:0,boards:[],landmarks:{done:Object.keys(VILLAGE_LANDMARKS),given:{}},boat:{serial:0,cargo:null,readyAt:now+30*DAY_MS,trips:0}};s.stats.village_landmarks=Object.keys(VILLAGE_LANDMARKS).length;
 delete s.daily;normalizeFarm(s,now);refreshProgressionDaily(s,now);
 // Today's tasks and orders done, the helping hands resting: no "!" anywhere.
 s.daily.claimed=s.daily.tasks.map((_,i)=>i);s.daily.orders=s.daily.orderBoard.map((_,i)=>i);s.daily.bonusClaimed=true;
 s.activities.cooldowns=Object.fromEntries(Object.keys(ACTIVE_STATIONS).map(k=>[k,now+DAY_MS]));
 // No visitor on the road for a month: serving one is play (3 Oct 2026). src/admin-view.js reloads the showcase every hour anyway.
 s.visitors.current=null;s.visitors.nextAt=now+30*DAY_MS;
 // No villager at the market square for a month either; every place is built, so there is no golden brief.
 for(const b of s.village.boards){b.request=null;b.readyAt=now+30*DAY_MS;}
 return s;
}
