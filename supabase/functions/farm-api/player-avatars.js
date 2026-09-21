// Public cosmetic choices. Keep IDs stable; accounts store only the ID (player_stats.avatar_id has a CHECK on the list, see the player_avatars migrations).
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
    "id": "field-keeper",
    "name": "Field keeper",
    "src": "/assets/avatars/field-keeper.webp"
  },
  {
    "id": "berry-gardener",
    "name": "Berry gardener",
    "src": "/assets/avatars/berry-gardener.webp"
  },
  {
    "id": "mill-worker",
    "name": "Mill worker",
    "src": "/assets/avatars/mill-worker.webp"
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
    "id": "beekeeper",
    "name": "Beekeeper",
    "src": "/assets/avatars/beekeeper.webp"
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
    "id": "meadow-keeper",
    "name": "Meadow keeper",
    "src": "/assets/avatars/meadow-keeper.webp"
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
    "id": "harvest-helper",
    "name": "Harvest helper",
    "src": "/assets/avatars/harvest-helper.webp"
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
  }
].map(Object.freeze));
export const DEFAULT_AVATAR='default';
const byId=new Map(PLAYER_AVATARS.map(avatar=>[avatar.id,avatar]));
export const isPlayerAvatar=id=>typeof id==='string'&&byId.has(id);
export const playerAvatar=id=>byId.get(id)??byId.get(DEFAULT_AVATAR);
export const avatarImage=id=>`<img class="player-avatar-thumb" src="${playerAvatar(id).src}" alt="" width="48" height="48" loading="lazy" decoding="async" draggable="false">`;
