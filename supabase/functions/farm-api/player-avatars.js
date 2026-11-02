// Public cosmetic choices: 20 painted farmers (the first is everyone's default), 20 that open at levels 10, 20 … 100 and 120 … 300 (`level`), and
// achievement avatars earned with a goal (AVATAR_GOALS). avatar-service.js refuses one that is not open yet; the picker shows it grey
// with a lock. Keep IDs stable; accounts store only the ID (player_stats.avatar_id has a CHECK on the list, see the player_avatars
// migrations).
export const PLAYER_AVATARS=Object.freeze([
  {
    "id": "default",
    "name": "Original farmer",
    "src": "/assets/farmer-avatar.webp"
  },
  {
    "id": "orchard-grower",
    "name": "Orchard grower",
    "src": "/assets/avatars/orchard-grower.webp"
  },
  {
    "id": "berry-gardener",
    "name": "Berry gardener",
    "src": "/assets/avatars/berry-gardener.webp"
  },
  {
    "id": "sunflower-grower",
    "name": "Sunflower grower",
    "src": "/assets/avatars/sunflower-grower.webp"
  },
  {
    "id": "village-gardener",
    "name": "Village gardener",
    "src": "/assets/avatars/village-gardener.webp"
  },
  {
    "id": "old-hand",
    "name": "Old hand",
    "src": "/assets/avatars/old-hand.webp"
  },
  {
    "id": "greenhouse-grower",
    "name": "Greenhouse grower",
    "src": "/assets/avatars/greenhouse-grower.webp"
  },
  {
    "id": "market-gardener",
    "name": "Market gardener",
    "src": "/assets/avatars/market-gardener.webp"
  },
  {
    "id": "dairy-farmer",
    "name": "Dairy farmer",
    "src": "/assets/avatars/dairy-farmer.webp"
  },
  {
    "id": "apple-picker",
    "name": "Apple picker",
    "src": "/assets/avatars/apple-picker.webp"
  },
  {
    "id": "herb-gardener",
    "name": "Herb gardener",
    "src": "/assets/avatars/herb-gardener.webp"
  },
  {
    "id": "barn-builder",
    "name": "Barn builder",
    "src": "/assets/avatars/barn-builder.webp"
  },
  {
    "id": "flower-grower",
    "name": "Flower grower",
    "src": "/assets/avatars/flower-grower.webp"
  },
  {
    "id": "valley-grower",
    "name": "Valley grower",
    "src": "/assets/avatars/valley-grower.webp"
  },
  {
    "id": "orchard-veteran",
    "name": "Orchard veteran",
    "src": "/assets/avatars/orchard-veteran.webp"
  },
  {
    "id": "farm-mechanic",
    "name": "Farm mechanic",
    "src": "/assets/avatars/farm-mechanic.webp"
  },
  {
    "id": "pond-keeper",
    "name": "Pond keeper",
    "src": "/assets/avatars/pond-keeper.webp"
  },
  {
    "id": "ranch-hand",
    "name": "Ranch hand",
    "src": "/assets/avatars/ranch-hand.webp"
  },
  {
    "id": "cheese-maker",
    "name": "Cheese maker",
    "src": "/assets/avatars/cheese-maker.webp"
  },
  {
    "id": "flower-tender",
    "name": "Flower tender",
    "src": "/assets/avatars/flower-tender.webp"
  },
  {
    "id": "family-farmer",
    "name": "Family farmer",
    "src": "/assets/avatars/family-farmer.webp",
    "level": 10
  },
  {
    "id": "tractor-driver",
    "name": "Tractor driver",
    "src": "/assets/avatars/tractor-driver.webp",
    "level": 20
  },
  {
    "id": "truffle-hunter",
    "name": "Truffle hunter",
    "src": "/assets/avatars/truffle-hunter.webp",
    "level": 30
  },
  {
    "id": "beekeeper",
    "name": "Beekeeper",
    "src": "/assets/avatars/beekeeper.webp",
    "level": 40
  },
  {
    "id": "estate-manager",
    "name": "Estate manager",
    "src": "/assets/avatars/estate-manager.webp",
    "level": 50
  },
  {
    "id": "master-weaver",
    "name": "Master weaver",
    "src": "/assets/avatars/master-weaver.webp",
    "level": 60
  },
  {
    "id": "ranch-owner",
    "name": "Ranch owner",
    "src": "/assets/avatars/ranch-owner.webp",
    "level": 70
  },
  {
    "id": "prize-grower",
    "name": "Prize grower",
    "src": "/assets/avatars/prize-grower.webp",
    "level": 80
  },
  {
    "id": "fair-host",
    "name": "Fair host",
    "src": "/assets/avatars/fair-host.webp",
    "level": 90
  },
  {
    "id": "valley-legend",
    "name": "Valley legend",
    "src": "/assets/avatars/valley-legend.webp",
    "level": 100
  },
  {
    "id": "village-mayor",
    "name": "Village mayor",
    "src": "/assets/avatars/village-mayor.webp",
    "level": 120
  },
  {
    "id": "stonemason",
    "name": "Stonemason",
    "src": "/assets/avatars/stonemason.webp",
    "level": 140
  },
  {
    "id": "silversmith",
    "name": "Silversmith",
    "src": "/assets/avatars/silversmith.webp",
    "level": 160
  },
  {
    "id": "mine-foreman",
    "name": "Mine foreman",
    "src": "/assets/avatars/mine-foreman.webp",
    "level": 180
  },
  {
    "id": "harbour-pilot",
    "name": "Harbour pilot",
    "src": "/assets/avatars/harbour-pilot.webp",
    "level": 200
  },
  {
    "id": "rope-maker",
    "name": "Rope maker",
    "src": "/assets/avatars/rope-maker.webp",
    "level": 220
  },
  {
    "id": "galley-cook",
    "name": "Galley cook",
    "src": "/assets/avatars/galley-cook.webp",
    "level": 240
  },
  {
    "id": "cooper",
    "name": "Cooper",
    "src": "/assets/avatars/cooper.webp",
    "level": 260
  },
  {
    "id": "harbour-master",
    "name": "Harbour master",
    "src": "/assets/avatars/harbour-master.webp",
    "level": 280
  },
  {
    "id": "valley-admiral",
    "name": "Valley admiral",
    "src": "/assets/avatars/valley-admiral.webp",
    "level": 300
  },
  {
    "id": "gem-collector",
    "name": "Gem collector",
    "src": "/assets/avatars/gem-collector.webp"
  },
  {
    "id": "velvet-farmer",
    "name": "Velvet farmer",
    "src": "/assets/avatars/velvet-farmer.webp"
  },
  {
    "id": "crop-master",
    "name": "Crop master",
    "src": "/assets/avatars/crop-master.webp"
  },
  {
    "id": "early-riser",
    "name": "Early riser",
    "src": "/assets/avatars/early-riser.webp"
  },
  {
    "id": "event-champion",
    "name": "Event champion",
    "src": "/assets/avatars/event-champion.webp"
  },
  {
    "id": "grand-champion",
    "name": "Grand champion",
    "src": "/assets/avatars/grand-champion.webp"
  },
  {
    "id": "good-neighbor",
    "name": "Good neighbor",
    "src": "/assets/avatars/good-neighbor.webp"
  },
  {
    "id": "seed-keeper",
    "name": "Seed keeper",
    "src": "/assets/avatars/seed-keeper.webp"
  },
  {
    "id": "coin-baron",
    "name": "Coin baron",
    "src": "/assets/avatars/coin-baron.webp"
  },
  {
    "id": "valley-regular",
    "name": "Valley regular",
    "src": "/assets/avatars/valley-regular.webp"
  },
  {
    "id": "lantern-keeper",
    "name": "Lantern keeper",
    "src": "/assets/avatars/lantern-keeper.webp"
  },
  {
    "id": "golden-harvester",
    "name": "Golden harvester",
    "src": "/assets/avatars/golden-harvester.webp"
  },
  {
    "id": "royal-baker",
    "name": "Royal baker",
    "src": "/assets/avatars/royal-baker.webp"
  },
  {
    "id": "egg-merchant",
    "name": "Egg merchant",
    "src": "/assets/avatars/egg-merchant.webp"
  },
  {
    "id": "tractor-ace",
    "name": "Tractor ace",
    "src": "/assets/avatars/tractor-ace.webp"
  },
  {
    "id": "moonlight-farmer",
    "name": "Moonlight farmer",
    "src": "/assets/avatars/moonlight-farmer.webp"
  },
  {
    "id": "pet-whisperer",
    "name": "Pet whisperer",
    "src": "/assets/avatars/pet-whisperer.webp"
  },
  {
    "id": "seal-friend",
    "name": "Seal friend",
    "src": "/assets/avatars/seal-friend.webp"
  },
  {
    "id": "master-angler",
    "name": "Master angler",
    "src": "/assets/avatars/master-angler.webp"
  },
  {
    "id": "heirloom-breeder",
    "name": "Heirloom breeder",
    "src": "/assets/avatars/heirloom-breeder.webp"
  },
  {
    "id": "gift-giver",
    "name": "Gift giver",
    "src": "/assets/avatars/gift-giver.webp"
  },
  {
    "id": "shipping-clerk",
    "name": "Shipping clerk",
    "src": "/assets/avatars/shipping-clerk.webp"
  },
  {
    "id": "fair-star",
    "name": "Fair star",
    "src": "/assets/avatars/fair-star.webp"
  },
  {
    "id": "giant-grower",
    "name": "Giant grower",
    "src": "/assets/avatars/giant-grower.webp"
  },
  {
    "id": "sea-captain",
    "name": "Sea captain",
    "src": "/assets/avatars/sea-captain.webp"
  },
  {
    "id": "water-bearer",
    "name": "Water bearer",
    "src": "/assets/avatars/water-bearer.webp"
  },
  {
    "id": "caretaker",
    "name": "Caretaker",
    "src": "/assets/avatars/caretaker.webp"
  },
  {
    "id": "chore-champion",
    "name": "Chore champion",
    "src": "/assets/avatars/chore-champion.webp"
  },
  {
    "id": "delivery-driver",
    "name": "Delivery driver",
    "src": "/assets/avatars/delivery-driver.webp"
  },
  {
    "id": "miller",
    "name": "Miller",
    "src": "/assets/avatars/miller.webp"
  },
  {
    "id": "glasshouse-gardener",
    "name": "Glasshouse gardener",
    "src": "/assets/avatars/glasshouse-gardener.webp"
  }
].map(Object.freeze));
// Season avatars (the Season Pass, Oct 2026 on; game/farm-state.js SEASON_LOOKS): three a season, earned only in its pass (one free,
// two paid). Not in the 41 above: the picker shows a season's avatars while its season runs and the ones a farmer owns afterwards.
// player_stats.avatar_id takes any 'season-…' id (supabase/season-pass-engine.sql), so a new season needs no SQL for them.
export const SEASON_AVATARS=Object.freeze([
 {id:'season-autumn-2026-harvest-chef',name:'Harvest chef',src:'/assets/avatars/avatar-harvest-chef.webp',season:'autumn-2026',paid:true,purchase:true},
 {id:'season-autumn-2026-autumn-harvester',name:'Autumn harvester',src:'/assets/avatars/avatar-autumn-harvester.webp',season:'autumn-2026'},
 {id:'season-autumn-2026-pumpkin-royal',name:'Pumpkin royal',src:'/assets/avatars/avatar-pumpkin-royal.webp',season:'autumn-2026',paid:true},
 // Winter 2026 (21 Oct 2026): the Cocoa maker comes with the purchase, also in the pre-sale before 22 December.
 {id:'season-winter-2026-cocoa-maker',name:'Cocoa maker',src:'/assets/avatars/avatar-cocoa-maker.webp',season:'winter-2026',paid:true,purchase:true},
 {id:'season-winter-2026-snow-farmhand',name:'Snow farmhand',src:'/assets/avatars/avatar-snow-farmhand.webp',season:'winter-2026'},
 {id:'season-winter-2026-frost-royal',name:'Frost royal',src:'/assets/avatars/avatar-frost-royal.webp',season:'winter-2026',paid:true}
].map(Object.freeze));
export const seasonAvatar=id=>SEASON_AVATARS.find(a=>a.id===id)??null;
export const DEFAULT_AVATAR='default';
// The admin's own face (Tony, the maker of the game, 27 Sep 2026): everyone sees it beside the admin's name, but it is never offered
// to other farmers (their picker lists only PLAYER_AVATARS, still 40) and avatar-service.js lets only the admin account save it.
export const OWNER_AVATAR=Object.freeze({id:'owner',name:'Tony, the maker',src:'/assets/avatars/owner.webp'});
// The second admin's face (Gerard, the owner's brother, 3 Oct 2026): the same rules as Tony's. Every admin may pick either; no other
// farmer is offered them (their picker keeps the 40 and its x/40).
export const GERARD_AVATAR=Object.freeze({id:'gerard',name:'Gerard, the owner',src:'/assets/avatars/gerard.webp'});
export const OWNER_AVATARS=Object.freeze([OWNER_AVATAR,GERARD_AVATAR]);
export const isOwnerAvatar=id=>OWNER_AVATARS.some(avatar=>avatar.id===id);
const byId=new Map([...PLAYER_AVATARS,...SEASON_AVATARS,...OWNER_AVATARS].map(avatar=>[avatar.id,avatar]));
const publicIds=new Set([...PLAYER_AVATARS,...SEASON_AVATARS].map(avatar=>avatar.id));
export const isPlayerAvatar=id=>typeof id==='string'&&publicIds.has(id);
export const playerAvatar=id=>byId.get(id)??byId.get(DEFAULT_AVATAR);
// The level an avatar opens at: 1 for the 20 everyone has.
export const avatarLevel=id=>playerAvatar(id).level??1;
export const avatarUnlocked=(id,level)=>Number(level)>=avatarLevel(id);

// What earns each achievement avatar, read from the farm itself: `farm` is {state, events}, the farm's own state (farm-state.js keeps
// these numbers on the server) and player_stats.events_finished. Every number only goes up, so a goal once reached stays reached.
// diamonds_spent and vip_days are counted from 25 Sep 2026. A crop medal of tier 3 is Platinum, the highest (MASTERY_TIERS); there are
// 64 medals, 4 for each of the 16 crops (tests/player-avatars.test.mjs checks both against the rules).
export const AVATAR_GOALS=Object.freeze({
 'gem-collector':{text:'Spend 1,000 diamonds',target:1000,count:f=>f.state?.stats?.diamonds_spent},
 'velvet-farmer':{text:'Be VIP for 90 days in total',target:90,count:f=>f.state?.stats?.vip_days},
 'crop-master':{text:'Earn a Platinum crop medal',target:1,count:f=>(f.state?.mastery?.claimed??[]).filter(medal=>String(medal).endsWith(':3')).length},
 'early-riser':{text:'Log in 30 days in a row',target:30,count:f=>f.state?.login?.best},
 'event-champion':{text:'Finish 25 events',target:25,count:f=>f.events},
 'grand-champion':{text:'Become grand champion of the fair',target:1,count:f=>f.state?.stats?.fair_champion},
 'good-neighbor':{text:'Have 3 invited friends reach level 10',target:3,count:f=>f.state?.inviteRewards?.length},
 'seed-keeper':{text:'Earn all 64 crop medals',target:64,count:f=>f.state?.stats?.mastery_medals},
 'coin-baron':{text:'Earn 5,000,000 coins',target:5000000,count:f=>f.state?.stats?.earned},
 'valley-regular':{text:'Play on 100 days',target:100,count:f=>f.state?.login?.visits},
 // 30 Oct 2026 (the owner's 30 new avatars): ten more level avatars, every 20 levels from 120 to 300, and twenty goals, each read
 // from a counter the farm keeps already (state.stats; lake_fish_kinds: the lake's 20 kinds, World II).
 'golden-harvester':{text:'Harvest 50,000 crops',target:50000,count:f=>f.state?.stats?.harvested},
 'royal-baker':{text:'Bake 1,000 loaves of bread',target:1000,count:f=>f.state?.stats?.bread},
 'egg-merchant':{text:'Sell 2,500 eggs',target:2500,count:f=>f.state?.stats?.sold_eggs},
 'tractor-ace':{text:'Do 1,000 tractor jobs',target:1000,count:f=>f.state?.stats?.tractor},
 'moonlight-farmer':{text:'Run 25 tractor night shifts',target:25,count:f=>f.state?.stats?.tractor_shifts},
 'pet-whisperer':{text:'Pat your pets 500 times',target:500,count:f=>f.state?.stats?.pets_patted},
 'seal-friend':{text:'Pat the seal 100 times',target:100,count:f=>f.state?.stats?.seal_pats},
 'master-angler':{text:'Catch all 20 fish of the lake',target:20,count:f=>f.state?.stats?.lake_fish_kinds},
 'heirloom-breeder':{text:'Make 100 crosses in the Seed Lab',target:100,count:f=>f.state?.stats?.lab_crosses},
 'gift-giver':{text:'Give your neighbours 50 gifts',target:50,count:f=>f.state?.stats?.neighbour_gifts},
 'shipping-clerk':{text:'Ship 5,000 goods in the shipping bin',target:5000,count:f=>f.state?.stats?.bin_shipped},
 'fair-star':{text:'Win 25 stars at the fair',target:25,count:f=>f.state?.stats?.fair_stars},
 'giant-grower':{text:'Weigh 10 giant pumpkins',target:10,count:f=>f.state?.stats?.giant_weighed},
 'sea-captain':{text:'Send 100 ships',target:100,count:f=>f.state?.stats?.ships_sent},
 'water-bearer':{text:'Water crops 20,000 times',target:20000,count:f=>f.state?.stats?.watered},
 'caretaker':{text:'Care for crops 10,000 times',target:10000,count:f=>f.state?.stats?.tended},
 'chore-champion':{text:'Finish 500 chores',target:500,count:f=>f.state?.stats?.chores},
 'delivery-driver':{text:'Make 100 deliveries',target:100,count:f=>f.state?.stats?.deliveries},
 'miller':{text:'Finish 1,000 Windmill batches',target:1000,count:f=>f.state?.stats?.windmill_batches},
 'glasshouse-gardener':{text:'Finish 500 Glasshouse batches',target:500,count:f=>f.state?.stats?.glasshouse_batches},
 // The paid Halloween Pass (4 Oct 2026): the Lantern keeper is yours the moment the pass is bought, also before the season starts. The
 // farm keeps the passes it bought (state.passPremium, game/farm-state.js SEASON_PASS.id 'halloween-2026'; a test keeps the two equal).
 'lantern-keeper':{text:'Get the Halloween Pass',target:1,pass:'halloween-2026',count:f=>Array.isArray(f.state?.passPremium)&&f.state.passPremium.includes('halloween-2026')?1:0},
 // The Season Pass's avatars: collected in the pass (state.looks); the paid tier 1 one is yours the moment the season is bought
 // (state.passPremium holds the season's id). season: which season; pass: only for sale where payments are (a paid one).
 ...Object.fromEntries(SEASON_AVATARS.map(a=>[a.id,{text:'Collect it in the Season Pass',target:1,season:a.season,...(a.paid?{pass:a.season}:{}),
  count:f=>(Array.isArray(f.state?.looks)&&f.state.looks.includes(a.id))||(a.purchase&&Array.isArray(f.state?.passPremium)&&f.state.passPremium.includes(a.season))?1:0}]))
});
export const avatarGoal=id=>Object.hasOwn(AVATAR_GOALS,id)?AVATAR_GOALS[id]:null;
export const goalCount=(id,farm)=>{const goal=avatarGoal(id);return goal?Math.max(0,Math.floor(Number(goal.count(farm??{}))||0)):0;};
// Whether a farmer may use an avatar: `farm` is {level, state, events}.
export function avatarOpen(id,farm={}){const goal=avatarGoal(id);return goal?goalCount(id,farm)>=goal.target:avatarUnlocked(id,farm.level??1);}
export const avatarImage=id=>`<img class="player-avatar-thumb" src="${playerAvatar(id).src}" alt="" width="48" height="48" loading="lazy" decoding="async" draggable="false">`;
