// The goals of events per league (1 Oct 2026). Every event draws 3 of 5 groups (on the farm: fields, crops, buildings, market,
// helpers) and an easy, medium or hard size, the same for everyone; each league then draws its own kind of goal in each of those
// groups, one its farmers can do from the league's first level, with numbers to match. The Sprout League keeps the goals every event
// had before leagues. The six village leagues from level 100 (20 Oct 2026, the owner) draw from VILLAGE_KINDS only, with the same five
// group numbers but goals in the village. scripts/event-goals-sql.mjs turns this file into harvest_event_pick (supabase/
// live-event-league-goals.sql, and supabase/world-two-leagues-b.sql for the live switch), so the database draws exactly these. Every
// goal counts a farm stat (state.stats in farm-state.js) that only goes up during play.
import {EVENT_LEAGUES} from './farm-state.js';

// Each kind of goal: two titles with their line for the event card (the first goal of an event names it).
export const EVENT_GOAL_TITLES=Object.freeze({
 harvested:[['Harvest rush','Bring in the harvest together with farmers across the valley.'],['Full barns','Field after field brought in, and every barn a little fuller.']],
 planted:[['Sowing season','Fresh seed in every furrow, as fast as you can plant.'],['Fresh furrows','Plant field after field before the rest of the valley.']],
 watered:[['Green thumbs','Give your fields some extra love with water.'],['Rain dance','No field goes thirsty today.']],
 tended:[['Tender care','A little care brings every harvest in sooner.'],['Walk the rows','Look after every crop, row by row.']],
 fertilized:[['Rich soil','Fertilize your fields for a faster harvest.'],['Growing strong','A little fertilizer, a lot of growth.']],
 harvest_wheat:[['The wheat race','Every farm grows wheat. Bring in yours before the rest of the valley does.'],['Golden fields','Wheat, wheat and more wheat.']],
 harvest_corn:[['Corn country','Fill the barns with golden corn.'],['Cob and kernel','Corn for the mill, the market and the hens.']],
 harvest_lettuce:[['Salad days','Crisp lettuce for every kitchen in the village.'],['Leafy greens','Quick lettuce, round after round.']],
 harvest_barley:[['Amber waves','Fields of barley swaying in the valley wind.'],['Barley bound','A sturdy crop for feed and flour.']],
 harvest_greenbeans:[['Bean feast','Green beans by the basketful.'],['Tall and green','Green beans for the market stalls.']],
 harvest_cabbage:[['Cabbage patch','Big round cabbages for the village.'],['Head start','Heads of cabbage, row after row.']],
 harvest_cauliflower:[['Cauliflower crown','Plant early: white cauliflower for the whole valley.'],['Snow-white heads','A slow crop worth the wait.']],
 made_eggs:[['The egg hunt','Keep the hens fed and the baskets full.'],['Full nests','Every nest a little fuller.']],
 made_feed:[['Feed the flock','The Feed Mill turns and the animals eat well.'],['Mill day','Grind corn and barley into good animal feed.']],
 made_milk:[['Milk run','Fresh milk from the Dairy Barn.'],['Happy cows','Keep the cows fed and the pails full.']],
 made_cheese:[['Cheese board','Turn fresh milk into farmhouse cheese.'],['Say cheese','The Dairy Barn’s finest, wheel after wheel.']],
 made_flour:[['Flour power','Keep the Windmill turning and the flour sacks full.'],['Mill and grind','Grain in, flour out, all day long.']],
 produced:[['Busy kitchens','Keep your buildings humming and collect fresh batches.'],['Workshop rush','Batch after batch from every building.']],
 made_grainmeal:[['Grind it out','Wheat and barley into grain meal at the Windmill.'],['Sails turning','The Windmill never stops today.']],
 made_bread:[['Fresh from the oven','Warm bread from the Bakery for the whole village.'],['Bread and butter','Flour and milk into golden loaves.']],
 parallel_batches:[['Full steam ahead','Start batches while others are still running.'],['Many hands','Keep every slot of your buildings busy.']],
 sold:[['Market day','Fill the stalls and sell, sell, sell.'],['Open stalls','The market is busy. Bring everything you can.']],
 earned:[['Coin harvest','Earn coins at the market, with orders and with chores.'],['Golden profits','A good day to fill the coin purse.']],
 coins_spent:[['Big spenders','Seeds, upgrades and new buildings: invest in your farm.'],['Shopping spree','Put your coins to work on the farm.']],
 diamonds_spent:[['Diamond day','Spend diamonds on boosts or on finishing fields and batches.'],['Sparkle and shine','Let your diamonds do some of the work today.']],
 sold_wheat:[['Wheat market','The village bakers are buying. Sell your wheat at the market.'],['Grain traders','Bring your wheat to the market stalls.']],
 chores:[['Helping hands','Lend a hand around the farm.'],['Odd jobs','The little jobs that keep a farm running.']],
 activities:[['A helping hand','Help at the greenhouse, the apiary, the paddock and the workshop.'],['Around the farm','Lend a hand at every stop on the farm.']],
 upgrades:[['Builders’ day','Make your buildings better and faster.'],['Hammer time','Upgrade the buildings that work hardest for you.']],
 activity_rounds:[['Grand tour','Help at all four stops for the round bonus.'],['All around','The greenhouse, the apiary, the paddock and the workshop, in one round.']],
 // The kinds of goal the higher leagues add (1 Oct 2026).
 glasshouse_batches:[['Under glass','Warm beds in the Glasshouse, crate after crate.'],['Glasshouse harvest','Keep every bed under glass busy.']],
 made_pie:[['Pie day','Fresh pies from the Bakery for the whole valley.'],['Golden crusts','The ovens stay warm all day.']],
 made_stew:[['Stew pot','Slow-cooked stew from the Farm Kitchen.'],['Supper time','Hearty bowls for hungry farmers.']],
 made_applejuice:[['Pressing day','Apples into juice at the Juice Press.'],['Sweet and fresh','Bottle after bottle of apple juice.']],
 made_orchardjuice:[['Orchard blend','The orchard’s best, pressed and bottled.'],['Juice bar','Keep the Juice Press busy all day.']],
 made_berrypreserves:[['Preserve the summer','Berries into jars at the Preserves Workshop.'],['Jars on the shelf','Sweet preserves for the winter.']],
 made_truffles:[['Truffle hunt','Let the pigs find truffles at the Pig Farm.'],['Clever noses','Truffles, deep in the soil.']],
 made_honey:[['Honey harvest','Busy bees and golden honey at the Bee Yard.'],['Sweet gold','Jar after jar of honey.']],
 made_wool:[['Shearing day','Soft wool from the Sheep Barn.'],['Woolly flock','A good day for the shears.']],
 made_yarn:[['Spin it','Wool into yarn at the Weaving Shed.'],['Round and round','The spinning wheel never stops.']],
 made_cloth:[['Fine cloth','Weave yarn into fine cloth.'],['The loom','Thread by thread, roll by roll.']],
 made_squashsoup:[['Soup kitchen','Warm squash soup for the valley.'],['Bowls of gold','Squash soup from the Farm Kitchen.']],
 made_goatmilk:[['Goat milk run','Fresh milk from the Goat Shed.'],['Curious goats','Keep the goats happy and the pails full.']],
 made_goatcheese:[['Goat cheese board','Goat milk into fine cheese.'],['Cheese cellar','Wheel after wheel of goat cheese.']],
 made_candles:[['Candlelight','Pour beeswax candles at the Craft Workshop.'],['Warm glow','A candle for every window in the valley.']],
 made_cider:[['Cider press','Cider apples into sparkling cider.'],['Bubbles','Sparkling cider for the fair.']],
 made_cherryjam:[['Cherry time','Cherries into jam at the Preserves Workshop.'],['Red jars','Cherry jam for the finest tables.']],
 valley_baskets:[['Valley market day','Fill the customers’ baskets at the Valley Market.'],['Full baskets','The valley’s best, basket by basket.']],
 made_salad:[['Salad bar','Fresh salads from the Packing Shed.'],['Green and crisp','A salad for every lunch box.']],
 made_vegetables:[['Veggie boxes','Pack your vegetables for a better price.'],['Box it up','Crate after crate from the Packing Shed.']],
 made_pickles:[['Pickle jars','Red cabbage into crisp pickles.'],['In a jar','Pickles for the winter shelves.']],
 made_fertilizer:[['Good soil','Natural fertilizer from the Windmill.'],['Feed the fields','Fertilizer for every field on the farm.']],
 sold_eggs:[['Egg market','Bring your eggs to the market stalls.'],['Fresh eggs for sale','The village wants eggs. Sell them at the market.']],
 made_oil:[['Golden oil','Press sunflower seeds into golden oil.'],['Sunflower press','Oil from the Feed Mill, bottle by bottle.']],
 made_beangratin:[['Gratin night','Green bean gratin from the Farm Kitchen.'],['Oven warm','A crisp gratin for every table.']],
 made_applepie:[['Apple pie day','Apples and flour into warm apple pie.'],['Pie in the oven','The smell of apple pie across the valley.']],
 made_berrysmoothie:[['Smoothie stand','Berries into smoothies at the Juice Press.'],['Berry blend','A cold smoothie for every farmer.']],
 made_applecompote:[['Compote pot','Honey and apples into sweet compote.'],['Sweet apples','Jars of honey apple compote.']],
 made_pickledbeans:[['Bean jars','Green beans into pickled beans.'],['Snap and crunch','Pickled beans for the shelves.']],
 made_orchardsalad:[['Orchard salad','Fruit and greens from the Packing Shed.'],['Fresh from the trees','A colourful salad from the orchard.']],
 made_truffleomelette:[['Truffle breakfast','Truffles and eggs into a fine omelette.'],['Chef’s special','The Farm Kitchen’s finest breakfast.']],
 made_berrycheesecake:[['Cheesecake day','Berries and cheese into a creamy cheesecake.'],['Sweet slices','A cheesecake for every celebration.']],
 tractor:[['Tractor day','Let the tractor work the fields.'],['Full throttle','Rows and rows, done in one go.']],
 sold_cheese:[['Cheese market','Bring your cheese to the market stalls.'],['Say cheese, sell cheese','The village wants cheese. Sell it at the market.']],
 // The village leagues' goals (20 Oct 2026); upgrades keeps its own titles.
 made_stone:[['Quarry day','Dig stone, cart after cart, at the Mine.'],['Rock solid','Good stone for paths, walls and kilns.']],
 made_ironore:[['Iron rush','Send your miners down for iron ore.'],['Ore cart','Cart after cart of iron ore from the Mine.']],
 made_timber:[['Woodcutters’ day','Chop logs at the Lumber Camp.'],['Into the woods','Fresh logs from the forest by the lake.']],
 made_clay:[['Muddy boots','Dig clay from the pit for the Potter’s Kiln.'],['Clay day','Wet clay by the cartload, ready for the kiln.']],
 made_packedlunch:[['Lunch is packed','Hungry miners and woodcutters are waiting.'],['Lunch break','A packed lunch for every worker in the village.']],
 made_potatoes:[['Potato patch','Potatoes from the Village Fields, row after row.'],['Spud season','Dig up potatoes for the canteen’s pasties.']],
 made_flax:[['Blue flax fields','Sow flax in the Village Fields for the looms.'],['Flax harvest','Tall flax for the Linen Loft.']],
 made_lavender:[['Lavender hills','Purple rows in the Village Fields.'],['Sweet scent','Lavender for soap, sachets and a fresh village.']],
 village_batches:[['Busy village','Keep every place in the village working.'],['Village at work','Collect batch after batch in every village place.']],
 made_plank:[['Saw and sawdust','Logs into planks at the Lumber Camp.'],['Plank by plank','Fresh planks for every new building in the village.']],
 made_ironbar:[['Hot iron','Smelt iron bars at the Smithy.'],['Strike while it’s hot','Ore and logs into iron bars at the forge.']],
 made_pickaxe:[['Pick it up','Forge pickaxes for the miners.'],['New tools','Sharp pickaxes for the deep tunnels.']],
 made_rooftile:[['Roof over our heads','Fire roof tiles at the Potter’s Kiln.'],['Red rooftops','Tile after tile for the village roofs.']],
 made_linen:[['White as linen','Weave flax into linen at the Linen Loft.'],['Loom day','The looms clatter from morning till night.']],
 made_builderscrate:[['Crated and ready','Builder’s crates from the Lumber Camp for the farm’s upgrades.'],['Packed for building','Planks, tiles and iron, all in one sturdy crate.']],
 made_lavendersoap:[['Wash day','Lavender soap from the Soap Maker.'],['Soap bubbles','Bar after bar of sweet lavender soap.']],
 made_scentedsachet:[['Sweet sachets','Lavender and linen sewn into scented sachets.'],['Fresh as lavender','A sachet for every drawer in the village.']],
 made_silvercandlestick:[['Silver shine','Silver bars and candles into fine candlesticks.'],['Polished silver','Candlesticks fit for the town’s finest tables.']],
 made_rubyring:[['Ruby red','Set rubies in silver at the Jeweller.'],['A ring of red','Rubies from deep in the Mine, set in silver.']],
 village_requests:[['Helping the village','Bring the villagers the goods they ask for.'],['A busy square','Villagers are waiting at the market square with their requests.']],
 // The harbour (27 Oct 2026): World III's goals, from the Quay League.
 ship_loads:[['Load the ships','Bring goods to the ships at the quay.'],['All hands on deck','The ships are waiting for their cargo.']],
 ships_sent:[['Ships away','Fill a ship and send it off.'],['Fair winds','Load a ship to the brim and wave it goodbye.']],
 made_rope:[['Rope by the yard','Twist rope in the Ropewalk.'],['Knots and coils','Flax and linen become strong rope.']],
 made_barrel:[['Barrels by the dozen','Make barrels in the Cooperage.'],['Hoops and staves','Planks and iron become sturdy barrels.']],
 made_sailcloth:[['Canvas for the wind','Weave sailcloth in the Ropewalk.'],['Full sails','Linen and rope become sailcloth.']],
 made_fishingnet:[['Cast a wide net','Tie fishing nets in the Ropewalk.'],['Nets for the fleet','Rope and linen become fishing nets.']],
 harbour_batches:[['Busy harbour','Collect batches in the harbour.'],['Work on the quays','Keep the harbour’s places busy.']],
 made_shipsbiscuits:[['Ship’s biscuits','Bake ship’s biscuits in the Galley.'],['Food for the voyage','Bread and cheese become ship’s biscuits.']],
 made_provisions:[['Well stocked','Pack provisions crates in the Galley.'],['Ready to sail','Barrels, biscuits and cheese for a long voyage.']],
 made_anchor:[['Drop anchor','Forge anchors in the Harbour forge.'],['Iron and rope','Iron bars and rope become anchors.']],
 made_anchorchain:[['Heavy links','Forge anchor chains in the Harbour forge.'],['Chain by chain','Iron and silver become anchor chains.']],
 harbour_sold:[['Harbour trade','Sell harbour goods in the harbour.'],['Good business','The harbour’s buyers want your goods.']],
 seal_pats:[['A friend on the quay','Pat the harbour seal.'],['Whiskers and flippers','The harbour seal loves a pat.']],
 harbour_upgrades:[['Bigger places','Upgrade the harbour’s places.'],['Shipshape','Make the harbour’s places better and faster.']],
 lake_fish:[['Gone fishing','Row out on the village lake and cast your line.'],['Lake day','Catch fish from the rowboat on the village lake.']]
});

// Every kind of goal once: its group (0 fields, 1 crops, 2 buildings, 3 market, 4 helpers), the league it joins in, its easy,
// medium and hard numbers there, and how much they grow in each league above (1 Oct 2026). A league draws from every kind open to
// it, so the leagues higher up have more kinds of goal, all with bigger numbers. Growth from the events of 22 Sep–1 Oct 2026:
// about half of the farmers who play finish a medium goal; the leagues above do chores, batches and care without trying, sell
// less at the market and fertilize little, so those grow slowly; diamonds spent stay the same everywhere.
// 10 Oct 2026 (the owner's pick from the balance review, live data 1-9 Oct): goals that almost nobody could finish now fit.
// - Helping hand: a medium goal is one visit to all four stops (4 jobs), since a stop rests an hour.
// - The Meadow League (30-44) drew goals for buildings a third to half of its farmers do not have yet (Juice Press, Preserves
//   Workshop, Pig Farm, Bee Yard): those events had 0 finishers of 39 joiners, against 12% for other Meadow events. Those 8 goal
//   kinds join from the Orchard League (45), and yarn and cloth from the Harvest League (60) (3 of 23 farmers at 45-59 have a
//   Weaving Shed).
// - Sprout (15-29): vegetable boxes join from the Meadow League (2 of 48 joiners made them: the boxes need cauliflower, a 4-hour
//   crop); cauliflower, fertilizer and diamonds spent ask less (4 of 40, 1 of 17 and 2 of 45 finished them); the medium diamonds
//   goal is one 10-diamond finish.
const KINDS=[
 // Fields
 ['harvested',0,0,[25,40,60],1.15],['planted',0,0,[25,40,60],1.15],['watered',0,0,[12,20,30],1.15],['tended',0,0,[8,12,18],1.18],['fertilized',0,0,[2,3,5],1.12],
 // Crops
 ['harvest_wheat',1,0,[60,100,150],1.15],['harvest_corn',1,0,[25,40,60],1.15],['harvest_lettuce',1,0,[30,45,70],1.15],['harvest_barley',1,0,[15,25,40],1.15],
 ['harvest_greenbeans',1,0,[8,12,18],1.15],['harvest_cabbage',1,0,[6,10,15],1.15],['harvest_cauliflower',1,0,[4,6,10],1.15],
 ['glasshouse_batches',1,2,[2,4,6],1.2],
 // Buildings
 ['made_eggs',2,0,[24,36,54],1.15],['made_feed',2,0,[20,30,45],1.15],['made_milk',2,0,[12,20,30],1.15],['made_cheese',2,0,[3,5,8],1.15],['made_flour',2,0,[16,32,56],1.15],
 ['produced',2,0,[5,8,12],1.25],['made_grainmeal',2,0,[6,12,18],1.15],['made_bread',2,0,[4,8,12],1.15],['parallel_batches',2,0,[5,10,15],1.15],
 // Pickles join from the Meadow League (9 Oct 2026, found in review): red cabbage and the pickle recipe both open at level 15, and the
 // cabbage alone grows 12 hours, so a farmer who has just reached 15 could not make one within the 5 hours of an event.
 ['made_salad',2,0,[4,8,12],1.15],['made_vegetables',2,1,[1,2,3],1.15],['made_pickles',2,1,[1,2,3],1.15],['made_fertilizer',2,0,[6,9,15],1.15],
 ['made_oil',2,1,[1,2,3],1.15],['made_beangratin',2,1,[1,2,3],1.15],['made_applepie',2,1,[1,2,3],1.15],['made_berrysmoothie',2,2,[2,4,6],1.15],['made_applecompote',2,2,[2,3,5],1.15],
 ['made_pickledbeans',2,2,[1,2,3],1.15],['made_orchardsalad',2,1,[3,6,9],1.15],['made_truffleomelette',2,2,[2,4,6],1.15],
 ['made_berrycheesecake',2,2,[1,2,3],1.15],
 ['made_pie',2,1,[2,4,6],1.15],['made_stew',2,1,[2,4,6],1.15],['made_applejuice',2,2,[2,3,5],1.15],['made_orchardjuice',2,2,[3,6,9],1.15],['made_berrypreserves',2,2,[2,3,5],1.15],['made_truffles',2,2,[6,10,14],1.15],
 ['made_honey',2,2,[8,12,20],1.15],['made_wool',2,2,[6,10,16],1.15],['made_yarn',2,3,[4,8,12],1.15],['made_cloth',2,3,[1,2,3],1.2],['made_squashsoup',2,2,[1,2,3],1.15],
 ['made_goatmilk',2,3,[8,12,20],1.15],['made_goatcheese',2,3,[2,3,5],1.2],['made_candles',2,3,[2,4,6],1.2],['made_cider',2,3,[1,2,3],1.2],
 ['made_cherryjam',2,4,[1,2,3],1.2],
 // Market
 ['sold',3,0,[60,100,150],1.1],['earned',3,0,[700,1200,1800],1.6],['coins_spent',3,0,[500,800,1200],1.8],['diamonds_spent',3,0,[10,10,20],1],['sold_wheat',3,0,[40,70,100],1.1],
 ['sold_eggs',3,0,[20,30,45],1.1],['sold_cheese',3,1,[3,5,8],1.1],
 ['valley_baskets',3,4,[1,2,3],1.3],
 // Helping out
 // A helping-hand stop rests an hour since 9 Oct 2026 (15 minutes before), so jobs and rounds are capped by the clock, not by the farm:
 // every league asks the Sprout League's numbers, at most 8 jobs or 2 rounds, two visits an hour apart (until then up to 16 jobs and 4
 // rounds higher up, four visits an hour apart). Chores keep growing: a farm high up has every chore open, ten within the hour.
 ['chores',4,0,[2,3,4],1.2],['activities',4,0,[3,4,8],1],['upgrades',4,0,[1,2,3],1.1],['activity_rounds',4,0,[1,1,2],1],
 ['tractor',4,1,[3,5,8],1.15]
];
// Village goals (20 Oct 2026, the owner): the leagues from level 100 draw from these only, never from KINDS. Same five group numbers,
// another meaning: 0 mine and forest, 1 fields and kitchens, 2 workshops, 3 market square, 4 around the village. Every league has
// at least one kind in every group (harvest_event_pick divides by the group's size). The league a kind joins in is the absolute
// league index (6 the Cobble League ... 11 the Village Legends). Left out: saffron (a 6-hour crop), heirloom flour and its bakes
// (golden wheat from 8-hour Seed Lab crosses), boat trips (the boat is away 12 hours, so every other event could not be finished;
// harvest_event_progress already counts them, so they come back with one line here: ['boat_trips',4,9,[1,1,1],1]), silver ore and
// bars, rubies and master tools (kept simple). Iron bars and pickaxes join from the Timber League: the Smithy opens at 102.
const VILLAGE_KINDS=[
 // Mine and forest
 ['made_stone',0,6,[12,20,32],1.35],['made_ironore',0,6,[15,25,40],1.35],['made_timber',0,6,[18,30,48],1.35],['made_clay',0,7,[24,40,64],1.25],
 // Fields and kitchens
 ['made_packedlunch',1,6,[12,24,36],1.2],['made_potatoes',1,7,[30,60,100],1.25],['made_flax',1,8,[40,80,120],1.25],['made_lavender',1,8,[45,75,150],1.2],
 // Workshops
 ['village_batches',2,6,[5,8,14],1.6],['made_plank',2,6,[4,8,12],1.35],['made_ironbar',2,7,[4,8,12],1.25],['made_pickaxe',2,7,[8,16,24],1.25],['made_rooftile',2,7,[8,16,24],1.25],
 ['made_linen',2,8,[8,16,24],1.3],['made_builderscrate',2,8,[1,2,4],1.2],['made_lavendersoap',2,8,[8,16,24],1.3],['made_scentedsachet',2,8,[8,16,24],1.3],
 ['made_silvercandlestick',2,9,[1,2,4],1.25],['made_rubyring',2,9,[1,2,3],1.25],
 // Market square
 ['village_requests',3,6,[1,2,3],1.1],
 // Around the village
 ['lake_fish',4,6,[5,10,15],1],['upgrades',4,6,[1,2,3],1.1]
];
// Harbour goals (27 Oct 2026, the owner: "maak ook events voor wereld III met nieuwe leagues"): the five harbour leagues from level 221
// (absolute league index 12 the Quay League ... 16 the Harbour Legends) draw from these only. Groups: 0 ships and quays, 1 ropewalk and
// cooperage, 2 galley and forge, 3 the harbour's market, 4 around the harbour. A good joins in the first league its place's recipe is
// open in (sailcloth 222 and provisions 224 from the Crane League, the fishing net 250 from the Anchor League, the chain 262 from the
// Flagship League). They count once World III's v1 counts them (ship loads, harbour batches, harbour sales, seal pats).
const HARBOUR_KINDS=[
 // Ships and quays
 ['ship_loads',0,12,[4,8,12],1.2],['ships_sent',0,12,[1,1,2],1.1],
 // Ropewalk and cooperage
 ['made_rope',1,12,[8,16,24],1.25],['made_barrel',1,12,[9,18,27],1.25],['made_sailcloth',1,13,[2,4,6],1.2],['made_fishingnet',1,14,[1,2,4],1.2],
 // Galley and forge
 ['harbour_batches',2,12,[5,8,14],1.5],['made_shipsbiscuits',2,12,[12,24,36],1.25],['made_provisions',2,13,[1,2,3],1.2],['made_anchor',2,13,[1,2,3],1.2],['made_anchorchain',2,15,[1,2,3],1.2],
 // The harbour's market
 ['harbour_sold',3,12,[5,10,20],1.2],
 // Around the harbour
 ['seal_pats',4,12,[1,2,3],1],['harbour_upgrades',4,12,[1,2,3],1.1]   // the harbour's own upgrades (28 Oct 2026): upgrades is the farm's and the village's
];
const WORLD_KINDS={1:KINDS,2:VILLAGE_KINDS,3:HARBOUR_KINDS};
// The names of the five groups per world, for the wiki (20 Oct 2026).
export const EVENT_GOAL_GROUPS=Object.freeze({1:['Fields','Crops','Buildings','Market','Helping out'],2:['Mine and forest','Fields and kitchens','Workshops','Market square','Around the village'],3:['Ships and quays','Ropewalk and cooperage','Galley and forge','Harbour market','Around the harbour']});
// Round numbers in the leagues above a kind's own (whole below 20, then to 5, 10 and 100; never 0, easy ≤ medium ≤ hard).
const nice=x=>x<20?Math.max(1,Math.round(x)):x<100?Math.round(x/5)*5:x<1000?Math.round(x/10)*10:Math.round(x/100)*100;
// One pool per league (farm-state.js EVENT_LEAGUES): the farm leagues from KINDS, the village leagues from VILLAGE_KINDS.
export const EVENT_GOAL_POOLS=Object.freeze(EVENT_LEAGUES.map(({index:league,world})=>Object.freeze([0,1,2,3,4].map(group=>Object.freeze(
 WORLD_KINDS[world].filter(k=>k[1]===group&&k[2]<=league).map(([stat,,from,targets,grow])=>Object.freeze({stat,targets:Object.freeze(league===from?targets:targets.map(t=>nice(t*grow**(league-from))).map((t,i,all)=>Math.max(t,i?all[i-1]:0)))}))
)))));
// Hourly events (20 Oct 2026, the owner): one goal an hour, a fifth of the league's medium 5-hour goal, rounded as above, at most 3
// lake fish (a cast rests 15 minutes). harvest_event_pick (scripts/hourly-events-sql.mjs) draws from these. Left out: what takes an
// hour or more (a crop or the fastest non-Factory batch at the league's first level), what the owner never wants (Valley Market
// baskets, boat trips, diamonds spent), single-product sales most farmers had at 0, and three goods whose input needs a step of an
// hour or more that fewer than half of the league's farmers hold (orchard salad, pickaxe, linen; spec-uur-events.md §2.5.1).
export const HOUR_SHARE=5,LAKE_FISH_PER_HOUR=3;
export const HOUR_LEFT_OUT=Object.freeze(Object.fromEntries([
 // A crop of an hour or more.
 'harvest_greenbeans','harvest_cabbage','harvest_cauliflower',
 // The fastest non-Factory batch at the league's first level takes an hour or more.
 'glasshouse_batches','made_vegetables','made_pickles','made_oil','made_beangratin','made_applepie','made_pie','made_stew','made_applejuice',
 'made_orchardjuice','made_berrypreserves','made_berrysmoothie','made_applecompote','made_pickledbeans','made_truffleomelette','made_berrycheesecake',
 'made_truffles','made_honey','made_wool','made_yarn','made_cloth','made_squashsoup','made_goatcheese','made_candles','made_cider','made_cherryjam',
 'made_flax','made_lavender','made_ironbar','made_builderscrate','made_lavendersoap','made_scentedsachet','made_silvercandlestick','made_rubyring',
 // The harbour (27 Oct 2026): its batches of 1.5 hours or more, and a whole ship (the next one docks 8-12 hours later).
 'made_sailcloth','made_provisions','made_anchor','made_fishingnet','made_anchorchain','ships_sent',
 // The owner: never.
 'valley_baskets','boat_trips','diamonds_spent',
 // Single-product sales most farmers had at 0.
 'sold_wheat','sold_cheese','sold_eggs',
 // An input needs a step of an hour or more, and fewer than half of the league's farmers hold it.
 'made_orchardsalad','made_pickaxe','made_linen'
].map(stat=>[stat,true])));
// One crop a harvest (22 Oct 2026, the owner: "verdubbel de doelen"): water and care make a crop ripen sooner instead of giving more,
// so farmers harvest about twice as often, and an hour's "Harvest crops" goal asks twice as many (HARVEST_GOAL_FACTOR). What
// harvest_event_pick drew before it (the pools and the care line as they ran from 20 Oct 2026) stays below as *_BEFORE_ONE_CROP: the
// switches that ran then (supabase/hourly-events.sql and the files after it) are generated from those, byte for byte.
export const HARVEST_GOAL_FACTOR=2;
const hourPools=factor=>Object.freeze(EVENT_GOAL_POOLS.map(league=>Object.freeze(league.map(group=>Object.freeze(
 group.filter(g=>!HOUR_LEFT_OUT[g.stat]).map(({stat,targets})=>Object.freeze({stat,target:Math.min(stat==='lake_fish'?LAKE_FISH_PER_HOUR:Infinity,nice(targets[1]/HOUR_SHARE))*(stat==='harvested'?factor:1)})))))));
export const EVENT_HOUR_POOLS=hourPools(HARVEST_GOAL_FACTOR),EVENT_HOUR_POOLS_BEFORE_ONE_CROP=hourPools(1);
export const EVENT_GOAL_TITLES_BEFORE_ONE_CROP=Object.freeze({...EVENT_GOAL_TITLES,tended:[['Tender care','A little care makes every harvest bigger.'],['Walk the rows','Look after every crop, row by row.']]});
