// Public cosmetic choices: 20 painted farmers (the first is everyone's default), then 10 that open at levels 10, 20 … 100 (`level`;
// avatar-service.js refuses one below it, the picker shows it grey with a lock). Keep IDs stable; accounts store only the ID
// (player_stats.avatar_id has a CHECK on the list, see the player_avatars migrations).
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
  }
].map(Object.freeze));
export const DEFAULT_AVATAR='default';
const byId=new Map(PLAYER_AVATARS.map(avatar=>[avatar.id,avatar]));
export const isPlayerAvatar=id=>typeof id==='string'&&byId.has(id);
export const playerAvatar=id=>byId.get(id)??byId.get(DEFAULT_AVATAR);
// The level an avatar opens at: 1 for the 20 everyone has.
export const avatarLevel=id=>playerAvatar(id).level??1;
export const avatarUnlocked=(id,level)=>Number(level)>=avatarLevel(id);
export const avatarImage=id=>`<img class="player-avatar-thumb" src="${playerAvatar(id).src}" alt="" width="48" height="48" loading="lazy" decoding="async" draggable="false">`;
