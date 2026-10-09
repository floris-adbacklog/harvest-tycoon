// The goals of farm events per league (1 Oct 2026). Every event draws 3 of 5 groups (fields, crops, buildings, market, helpers)
// and an easy, medium or hard size, the same for everyone; each league then draws its own kind of goal in each of those groups,
// one its farmers can do from the league's first level, with numbers to match. The Sprout League keeps the goals every event had
// before leagues. scripts/event-goals-sql.mjs turns this file into harvest_event_pick (supabase/live-event-league-goals.sql), so
// the database draws exactly these. Every goal counts a farm stat (state.stats in farm-state.js) that only goes up during play.

// Each kind of goal: two titles with their line for the event card (the first goal of an event names it).
export const EVENT_GOAL_TITLES=Object.freeze({
 harvested:[['Harvest rush','Bring in the harvest together with farmers across the valley.'],['Full barns','Field after field brought in, and every barn a little fuller.']],
 planted:[['Sowing season','Fresh seed in every furrow, as fast as you can plant.'],['Fresh furrows','Plant field after field before the rest of the valley.']],
 watered:[['Green thumbs','Give your fields some extra love with water.'],['Rain dance','No field goes thirsty today.']],
 tended:[['Tender care','A little care makes every harvest bigger.'],['Walk the rows','Look after every crop, row by row.']],
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
 sold_cheese:[['Cheese market','Bring your cheese to the market stalls.'],['Say cheese, sell cheese','The village wants cheese. Sell it at the market.']]
});

// Every kind of goal once: its group (0 fields, 1 crops, 2 buildings, 3 market, 4 helpers), the league it joins in, its easy,
// medium and hard numbers there, and how much they grow in each league above (1 Oct 2026). A league draws from every kind open to
// it, so the leagues higher up have more kinds of goal, all with bigger numbers. Growth from the events of 22 Sep–1 Oct 2026:
// about half of the farmers who play finish a medium goal; the leagues above do chores, batches and care without trying, sell
// less at the market and fertilize little, so those grow slowly; diamonds spent stay the same everywhere.
const KINDS=[
 // Fields
 ['harvested',0,0,[25,40,60],1.15],['planted',0,0,[25,40,60],1.15],['watered',0,0,[12,20,30],1.15],['tended',0,0,[8,12,18],1.18],['fertilized',0,0,[3,5,8],1.12],
 // Crops
 ['harvest_wheat',1,0,[60,100,150],1.15],['harvest_corn',1,0,[25,40,60],1.15],['harvest_lettuce',1,0,[30,45,70],1.15],['harvest_barley',1,0,[15,25,40],1.15],
 ['harvest_greenbeans',1,0,[8,12,18],1.15],['harvest_cabbage',1,0,[6,10,15],1.15],['harvest_cauliflower',1,0,[6,10,15],1.15],
 ['glasshouse_batches',1,2,[2,4,6],1.2],
 // Buildings
 ['made_eggs',2,0,[24,36,54],1.15],['made_feed',2,0,[20,30,45],1.15],['made_milk',2,0,[12,20,30],1.15],['made_cheese',2,0,[3,5,8],1.15],['made_flour',2,0,[16,32,56],1.15],
 ['produced',2,0,[5,8,12],1.25],['made_grainmeal',2,0,[6,12,18],1.15],['made_bread',2,0,[4,8,12],1.15],['parallel_batches',2,0,[5,10,15],1.15],
 // Pickles join from the Meadow League (9 Oct 2026, found in review): red cabbage and the pickle recipe both open at level 15, and the
 // cabbage alone grows 12 hours, so a farmer who has just reached 15 could not make one within the 5 hours of an event.
 ['made_salad',2,0,[4,8,12],1.15],['made_vegetables',2,0,[2,4,6],1.15],['made_pickles',2,1,[1,2,3],1.15],['made_fertilizer',2,0,[6,9,15],1.15],
 ['made_oil',2,1,[1,2,3],1.15],['made_beangratin',2,1,[1,2,3],1.15],['made_applepie',2,1,[1,2,3],1.15],['made_berrysmoothie',2,1,[2,4,6],1.15],['made_applecompote',2,1,[2,3,5],1.15],
 ['made_pickledbeans',2,1,[1,2,3],1.15],['made_orchardsalad',2,1,[3,6,9],1.15],['made_truffleomelette',2,1,[2,4,6],1.15],
 ['made_berrycheesecake',2,2,[1,2,3],1.15],
 ['made_pie',2,1,[2,4,6],1.15],['made_stew',2,1,[2,4,6],1.15],['made_applejuice',2,1,[2,3,5],1.15],['made_orchardjuice',2,1,[3,6,9],1.15],['made_berrypreserves',2,1,[2,3,5],1.15],['made_truffles',2,1,[6,10,14],1.15],
 ['made_honey',2,2,[8,12,20],1.15],['made_wool',2,2,[6,10,16],1.15],['made_yarn',2,2,[4,8,12],1.15],['made_cloth',2,2,[1,2,3],1.2],['made_squashsoup',2,2,[1,2,3],1.15],
 ['made_goatmilk',2,3,[8,12,20],1.15],['made_goatcheese',2,3,[2,3,5],1.2],['made_candles',2,3,[2,4,6],1.2],['made_cider',2,3,[1,2,3],1.2],
 ['made_cherryjam',2,4,[1,2,3],1.2],
 // Market
 ['sold',3,0,[60,100,150],1.1],['earned',3,0,[700,1200,1800],1.6],['coins_spent',3,0,[500,800,1200],1.8],['diamonds_spent',3,0,[10,20,40],1],['sold_wheat',3,0,[40,70,100],1.1],
 ['sold_eggs',3,0,[20,30,45],1.1],['sold_cheese',3,1,[3,5,8],1.1],
 ['valley_baskets',3,4,[1,2,3],1.3],
 // Helping out
 // A helping-hand stop rests an hour since 9 Oct 2026 (15 minutes before), so jobs and rounds are capped by the clock, not by the farm:
 // every league asks the Sprout League's numbers, at most 8 jobs or 2 rounds, two visits an hour apart (until then up to 16 jobs and 4
 // rounds higher up, four visits an hour apart). Chores keep growing: a farm high up has every chore open, ten within the hour.
 ['chores',4,0,[2,3,4],1.2],['activities',4,0,[3,5,8],1],['upgrades',4,0,[1,2,3],1.1],['activity_rounds',4,0,[1,1,2],1],
 ['tractor',4,1,[3,5,8],1.15]
];
// Round numbers in the leagues above a kind's own (whole below 20, then to 5, 10 and 100; never 0, easy ≤ medium ≤ hard).
const nice=x=>x<20?Math.max(1,Math.round(x)):x<100?Math.round(x/5)*5:x<1000?Math.round(x/10)*10:Math.round(x/100)*100;
export const EVENT_GOAL_POOLS=Object.freeze([0,1,2,3,4,5].map(league=>Object.freeze([0,1,2,3,4].map(group=>Object.freeze(
 KINDS.filter(k=>k[1]===group&&k[2]<=league).map(([stat,,from,targets,grow])=>Object.freeze({stat,targets:Object.freeze(league===from?targets:targets.map(t=>nice(t*grow**(league-from))).map((t,i,all)=>Math.max(t,i?all[i-1]:0)))}))
)))));
