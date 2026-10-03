// Public cosmetic choices: 20 painted farmers (the first is everyone's default), 10 that open at levels 10, 20 … 100 (`level`), and
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
  }
].map(Object.freeze));
export const DEFAULT_AVATAR='default';
// The admin's own face (Tony, the maker of the game, 27 Sep 2026): everyone sees it beside the admin's name, but it is never offered
// to other farmers (their picker lists only PLAYER_AVATARS, still 40) and avatar-service.js lets only the admin account save it.
export const OWNER_AVATAR=Object.freeze({id:'owner',name:'Tony, the maker',src:'/assets/avatars/owner.webp'});
// The second admin's face (Gerard, the owner's brother, 3 Oct 2026): the same rules as Tony's. Every admin may pick either; no other
// farmer is offered them (their picker keeps the 40 and its x/40).
export const GERARD_AVATAR=Object.freeze({id:'gerard',name:'Gerard, the owner',src:'/assets/avatars/gerard.webp'});
export const OWNER_AVATARS=Object.freeze([OWNER_AVATAR,GERARD_AVATAR]);
export const isOwnerAvatar=id=>OWNER_AVATARS.some(avatar=>avatar.id===id);
const byId=new Map([...PLAYER_AVATARS,...OWNER_AVATARS].map(avatar=>[avatar.id,avatar]));
const publicIds=new Set(PLAYER_AVATARS.map(avatar=>avatar.id));
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
 // The paid Halloween Pass (4 Oct 2026): the Lantern keeper is yours the moment the pass is bought, also before the season starts. The
 // farm keeps the passes it bought (state.passPremium, game/farm-state.js SEASON_PASS.id 'halloween-2026'; a test keeps the two equal).
 'lantern-keeper':{text:'Get the Halloween Pass',target:1,pass:'halloween-2026',count:f=>Array.isArray(f.state?.passPremium)&&f.state.passPremium.includes('halloween-2026')?1:0}
});
export const avatarGoal=id=>Object.hasOwn(AVATAR_GOALS,id)?AVATAR_GOALS[id]:null;
export const goalCount=(id,farm)=>{const goal=avatarGoal(id);return goal?Math.max(0,Math.floor(Number(goal.count(farm??{}))||0)):0;};
// Whether a farmer may use an avatar: `farm` is {level, state, events}.
export function avatarOpen(id,farm={}){const goal=avatarGoal(id);return goal?goalCount(id,farm)>=goal.target:avatarUnlocked(id,farm.level??1);}
export const avatarImage=id=>`<img class="player-avatar-thumb" src="${playerAvatar(id).src}" alt="" width="48" height="48" loading="lazy" decoding="async" draggable="false">`;
