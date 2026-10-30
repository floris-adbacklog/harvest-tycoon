import {HEIRLOOMS,FAMILY_EMBLEMS} from './farm-state.js';
import {LANGUAGES} from './languages.js';
// Every item has one explicit image. Square sprite cells cannot reveal neighbouring art.
const sheets=[
 {file:'crops-v2.webp?v=20261025',columns:3,keys:['wheat','lettuce','corn','barley','cabbage','cauliflower','pumpkin','redcabbage','sunflower']},
 {file:'goods-v2.webp',columns:4,keys:['grainmeal','flour','feed','fertilizer','salad','pickles','oil','milk','eggs','cheese','bread','pie','vegetables','tractor','silo','cart']},
 // ?v=: the sheet's address changes when a picture in it changes, so a browser that keeps the sheet a day gets the new one at once
 // (18 Oct 2026: the Care glove lost its leaf).
 {file:'interface-v2.webp?v=20261018',columns:4,keys:['farm','estate','buildings','market','gift','quests','boost','trophy','coins','diamonds','seeds','water','harvest','care','hammer','xp']}
];
const pictures={farmhand:'farmhand','coin-cart':'coin-cart','family-sharing':'family-sharing','live-events':'live-events',vip:'vip','familyhall-model':'familyhall-model',lock:'lock','family-weekly-order':'family-weekly-order','family-members':'family-members','family-tournament':'family-tournament','family-management':'family-management',familyhall:'familyhall','helping-hand':'helping-hand','collect-all':'collect-all','instant-harvest':'instant-harvest','double-harvest':'double-harvest','invite-friends':'invite-friends',farmhouse:'farmhouse',mill:'mill',dairy:'dairy',coop:'coop',bakery:'bakery',packing:'packing',windmill:'windmill',stall:'stall',chores:'chores',honey:'honey'};
for(const key of ['rank-gold','rank-silver','rank-bronze','family-bee','family-oak','family-barn','family-fox','family-owl','family-windmill','family-horseshoe'])pictures[key]=key;
// Individual painted illustrations keep each chore recognisable at mobile sizes.
for(const id of ['weeds','troughs','sorting','fences','irrigation','harvestfair'])pictures[`chore-${id}`]=`chore-${id}`;
for(const id of ['greenhouse','apiary','paddock','workshop'])pictures[`activity-${id}`]=`activity-${id}`;
for(const id of ['apples','berries','greenbeans','applejuice','applepie','berrypreserves','berrytart','stew','juicepress','preserves','kitchen','factory'])pictures[id]=id;
for(const id of ["orchardjuice", "berrysmoothie", "applecompote", "applevinegar", "pickledbeans", "beangratin", "orchardsalad", "berrycheesecake", "harvesthamper"])pictures[id]=id;
// The midgame expansion: painted crop and goods icons (WebP) and renders of the four new buildings' models (PNG).
const MIDGAME_ITEM_ART=['squash','polebeans','ciderapples','squashsoup','beeswax','wool','yarn','cloth','cider'];
for(const id of [...MIDGAME_ITEM_ART,'beeyard','sheepbarn','glasshouse','weaving'])pictures[id]=id;
// The Warehouse (22 Oct 2026): a render of its barn (the Sheep Barn's old red barn) with crates by the doors, WebP; the Sheep Barn's
// picture is a render of its new barn (the Goat Shed's, with the Sheep Barn's own slate-blue roof) with two of its sheep since the same day.
pictures.warehouse='warehouse';
// Wave 2: the new goods and cherries (WebP), the Valley Market and the Ranch (painted, WebP), renders of the two new buildings (PNG).
const VALLEY_ITEM_ART=['cherries','goatmilk','goatcheese','candles','blanket','cherryjam','cherrypie','valley-market','ranch'];
for(const id of [...VALLEY_ITEM_ART,'goatshed','craftshop'])pictures[id]=id;
pictures.valleymarket='valley-market';
// Wave 3: prize produce and the three new places (painted, WebP).
const ESTATE_ITEM_ART=['prizeproduce','estate-workshop','trade-depot','grand-fair'];
for(const id of ESTATE_ITEM_ART)pictures[id]=id;
Object.assign(pictures,{estateworkshop:'estate-workshop',tradedepot:'trade-depot',grandfair:'grand-fair'});
// The Pig Farm: truffles and the truffle omelette (painted, WebP) and a render of the building's model (PNG).
for(const id of ['truffles','truffleomelette','pigfarm'])pictures[id]=id;
// The Donkey Stable (27 Oct 2026, level 64): a render of its barn in its own colours with a donkey and hay (512 px, like the Goat Shed's),
// its four goods painted by the owner (256 px), and the donkey with its cart (a render, 512 px, its window's picture), all WebP.
export const DONKEY_ART=Object.freeze(['donkeystable','donkeymilk','donkeymilksoap','donkeycheese','bathbasket','donkeycart']);
for(const id of DONKEY_ART)pictures[id]=id;
// The chat (header button, Notifications tab) and the Settings headings: painted, WebP.
for(const id of ['chat','bell','sound','cookie','letter','send','admin','guide','settings','alert','block','graphics'])pictures[id]=id;
// The farm log on a profile (src/player-profiles.js), 26 Sep 2026.
pictures.log='log';
// The Double XP and Double earnings boosts (26 Sep 2026, painted like double-harvest): the shop and the active-boost pill.
pictures['double-xp']='double-xp';pictures['double-coins']='double-coins';
// The four diamond packs in the shop, smallest to largest, and the VIP farmer above the VIP plans (painted, WebP).
const PACK_ART=['pack-nest','pack-sack','pack-chest','pack-gold','vip-farmer'];
for(const id of PACK_ART)pictures[id]=id;
// Painted-style vector illustrations for the few interface items that had no artwork yet.
const svgArt=new Set(['streak','reminders','hourglass']);
for(const id of svgArt)pictures[id]=id;
const spriteEntries=Object.fromEntries(sheets.flatMap(sheet=>sheet.keys.map((key,index)=>[key,{...sheet,index}])));
const symbolMap={'lock-keyhole':'lock',lock:'lock',salad:'salad',amphora:'pickles',milk:'milk',egg:'eggs',sandwich:'cheese',croissant:'bread','cake-slice':'pie','package-check':'vegetables','package-open':'feed',droplet:'oil',gem:'diamonds',coins:'coins',star:'xp',droplets:'water',scissors:'harvest',shovel:'care',leaf:'care',gift:'gift','clipboard-check':'quests',trophy:'trophy',medal:'medal-gold',sparkles:'boost',sprout:'seeds',hammer:'hammer',wheat:'wheat',house:'farm',factory:'buildings',landmark:'estate',store:'market',tractor:'tractor',warehouse:'silo',truck:'cart',wind:'windmill','shopping-basket':'vegetables','land-plot':'seeds','circle-fading-arrow-up':'hammer',flag:'quests','circle-help':'guide','volume-2':'sound',settings:'settings',bell:'bell',smartphone:'farmapp',shield:'admin',flame:'streak'};
// After level 90 (27 Sep 2026), painted by the user: the 20 heirlooms of the Seed Lab, the visitors, the valley projects, the giant
// pumpkin and a picture for each of the five activities (all WebP, marked below).
const ENDGAME_PICTURES=['visitor-cook','visitor-merchant','visitor-innkeeper','visitor-captain','visitor-organiser','visitor-gardener','project-bridge','project-watermill','project-terraces','project-canal','project-barn','giant-small','giant-big','giant-prize','giant-scale','endgame-master-star','endgame-seed-lab','endgame-visitors'];
for(const key of Object.keys(HEIRLOOMS))pictures[key]=`heirloom-${key}`;
for(const key of ENDGAME_PICTURES)pictures[key]=key;
Object.assign(pictures,{master:'endgame-master-star',seedlab:'endgame-seed-lab',visitors:'endgame-visitors',giantpumpkin:'giant-prize',valleyprojects:'project-watermill'});
// World II, The Village (30 Sep 2026): renders of its places, built from the Village pack's own models like the farm's buildings, and
// its goods painted by the user (all WebP), the badge on the travel button and the closed bridge that shows at level 90 to 99.
// The levels 100-200 of Oct 2026 add the 13 later goods (painted, 256 px) and renders of the seven later places and the five landmarks
// (512 px, scripts/render-village-pictures.py), all WebP.
const VILLAGE_ART=['mine','lumbercamp','smithy','villagemill','villagemarket','farmroad','packedlunch','stone','ironore','timber','plank','ironbar','pickaxe',
 'silverore','silverbar','mastertools','heirloomflour','gemstone','goldenloaf','heirloompie','village-badge','village-bridge',
 'potatoes','clay','rooftile','flax','linen','builderscrate','lavender','lavendersoap','scentedsachet','silvercandlestick','rubyring','saffron','saffronbun','villagefields','canteen','kiln','linenloft','soapmaker','pier','jeweller','landmark-windpump','landmark-longhouse','landmark-stonequay','landmark-lookout','landmark-greathall',
 'villager-miller',   // the miller of the market square's weekly order (17 Oct 2026, painted by the owner, 256 px)
 'supply-cart'];   // the Supply cart of the diamond shop's Village tab (20 Oct 2026, made and approved by the owner, 256 px)
for(const key of VILLAGE_ART)pictures[key]=key;
// The hand tools of a sweep (Oct 2026, painted by the owner, WebP): the sickle, the watering can, the seed bag and the gardening gloves
// for care, as the cursor over a field and in the hand during a sweep (public/sweep-tools.js).
const TOOL_PICTURES=['tool-sickle','tool-can','tool-seeds','tool-gloves'];
for(const key of TOOL_PICTURES)pictures[key]=key;
// A helping hand's job tiles (22 Oct 2026, painted by the owner, WebP, 256 px): one picture for each state of a stop's job, the one that
// waits for its job and the one that is fine or done (public/activities-ui.js TILE_ART).
export const JOB_PICTURES=Object.freeze(['seedling-dry','seedling-healthy','honeyframe-full','honeyframe-busy','bowl-empty','bowl-full','tool-worn','tool-fixed']);
for(const key of JOB_PICTURES)pictures[key]=key;
// The Fishing pond (11 Oct 2026, painted by the owner, WebP, 256 px on a clear ground): the eight fish of the fish book (fish-minnow …
// fish-whiskers; a fish not caught yet is its own shadow, by CSS) and the rod on its basket for the pond's pin, menus and level card.
// Page two's eight (11 Oct 2026, painted by the owner the same way): the fish that swim in the pond from level 20.
export const FISH_PICTURES=Object.freeze(['fish-minnow','fish-perch','fish-roach','fish-carp','fish-tench','fish-pike','fish-goldencarp','fish-whiskers','fishingpond',
 'fish-rudd','fish-bream','fish-eel','fish-trout','fish-barbel','fish-zander','fish-koi','fish-sturgeon']);
for(const key of FISH_PICTURES)pictures[key]=key;
// The village lake (12 Oct 2026, plan D, WebP, 256 px on a clear ground like the pond's): its 20 fish, page one then page two, and the
// rowboat on the lake for its pin, the More tile, the Buildings card and the level card. Stand-ins until the owner's own come (STAND-INS.txt).
export const LAKE_PICTURES=Object.freeze(['fish-bleak','fish-chub','fish-whitefish','fish-nase','fish-grayling','fish-browntrout','fish-char','fish-burbot','fish-huchen','fish-oldgranite',
 'fish-bullhead','fish-vendace','fish-ide','fish-goldenorfe','fish-brooktrout','fish-laketrout','fish-salmon','fish-goldentrout','fish-marbletrout','fish-glacierghost','villagelake']);
for(const key of LAKE_PICTURES)pictures[key]=key;
// Feedback & bugs (30 Sep 2026, painted by the user, WebP): the mailbox on its button and in the More menu.
// The shipping bin and the neighbours' friendship heart (24 Oct 2026), painted for them (WebP, below).
pictures['shipping-bin']='shipping-bin';pictures['friendship-heart']='friendship-heart';
pictures.feedback='feedback';
export const ART_KEYS=Object.freeze([...Object.keys(spriteEntries),...Object.keys(pictures)]);
// The second batch re-encoded to WebP (every picture of 40 KB or more that was still a PNG; the PNGs stay on disk): same pixel size,
// 64-79% smaller, no visible difference side by side at 2x. The small building pictures (farmhouse, mill, ...) stay PNG.
const LARGE_PICTURES=['familyhall-model','helping-hand','windmill','family-fox','family-owl','family-windmill','chore-weeds','chore-fences','activity-paddock','activity-workshop','greenbeans','juicepress','preserves','kitchen','berrysmoothie','applevinegar','beangratin','beeyard','sheepbarn','glasshouse','weaving','goatshed','craftshop'];
// Renders of the valley places, shown only in the Buildings list (economy-ui.js).
const PLACE_RENDERS=['valleymarket','ranch','estateworkshop','tradedepot','grandfair'].map(key=>`place-${key}`);
// These pictures were re-encoded to WebP (level-up.webp is a separate hardcoded path in progression-ui.js, not routed through art()) (75-86% smaller, no visible difference at this size); every other picture is still a plain PNG.
const webpPictures=new Set(['live-events','family-sharing','farmhand','coin-cart','double-harvest','double-xp','double-coins','invite-friends','vip','honey','rank-gold','family-bee','family-barn','rank-bronze','family-weekly-order','family-oak','rank-silver','family-members','familyhall','lock','family-tournament','family-management','berries','berrytart','berrypreserves','chore-harvestfair','pickledbeans','apples','applepie','applejuice','harvesthamper','berrycheesecake','stew','orchardsalad','orchardjuice','family-horseshoe','applecompote','chore-sorting','chore-irrigation','collect-all','activity-greenhouse','activity-apiary','instant-harvest','chore-troughs',...MIDGAME_ITEM_ART,...VALLEY_ITEM_ART,'valleymarket',...ESTATE_ITEM_ART,'estateworkshop','tradedepot','grandfair',...LARGE_PICTURES,...PLACE_RENDERS,'truffles','truffleomelette','chat','bell','sound','cookie','letter','send','admin','guide','settings','alert','block','graphics',...PACK_ART,'log']);
// The Family Chest in its four tiers, and open (27 Sep 2026, painted, WebP).
for(const key of ['family-chest-wood','family-chest-iron','family-chest-silver','family-chest-gold','family-chest-open']){pictures[key]=key;webpPictures.add(key);}
// Your own farm layout (24 Oct 2026, painted for the owner): Move things, Rotate, Clear, Store, drawing and erasing a path, the land that
// opens later and Visit farm.
for(const key of ['shipping-bin','friendship-heart'])webpPictures.add(key);
// World III, the harbour (27 Oct 2026, the owner's ChatGPT pictures): its badge, the harbour master and the first harbour goods.
for(const key of ['harbour-badge','harbour-master','harbour-crate','seal-pet','rope','barrel','shipsbiscuits','sailcloth','provisions','anchor','fishingnet','anchorchain','shipwrighttools']){pictures[key]=key;webpPictures.add(key);}   // shipwright tools: 30 Oct 2026, the owner's ChatGPT picture
// The harbour's pins: the harbour master on the office, the seal, and each place's picture (27 Oct 2026, the owner's ChatGPT pictures,
// 512 px; plan-wereld-3/chatgpt/extra-plekken and plekken-8-10).
Object.assign(pictures,{harbouroffice:'harbour-master',harbourseal:'seal-pet',ropewalk:'ropewalk',cooperage:'cooperage',galley:'galley',harbourforge:'harbourforge',chandlery:'chandlery',paintshop:'paintshop',instruments:'instruments',
 shiplantern:'shiplantern',shiptar:'shiptar',shippaint:'shippaint',figurehead:'figurehead',compass:'compass',shipsbell:'shipsbell',harbourwarehouse:'harbourwarehouse',
 cannery:'cannery',tradinghouse:'tradinghouse',boatyard:'boatyard',tinnedstew:'tinnedstew',tinnedfruit:'tinnedfruit',spicecrate:'spicecrate',perfumecrate:'perfumecrate',oars:'oars',rowboat:'rowboat'});   // places 8-10 and their goods: the owner's ChatGPT pictures too (chatgpt/plekken-8-10), as the first seven places now   // the owner's ChatGPT pictures (27 Oct 2026, chatgpt/extra-plekken): places 512 px, goods 256 px
pictures.villageboat='farmroad';pictures.harbourboat='farmroad';   // every way to another world in the village and the harbour: the same signpost as the road to the farm (28 Oct 2026, the owner)
pictures.harbourroad='harbour-badge';   // on the farm, the road to the harbour: its badge
for(const key of ['harbouroffice','harbourseal','villageboat','harbourboat','harbourroad','ropewalk','cooperage','galley','harbourforge','chandlery','paintshop','instruments','shiplantern','shiptar','shippaint','figurehead','compass','shipsbell','harbourwarehouse','cannery','tradinghouse','boatyard','tinnedstew','tinnedfruit','spicecrate','perfumecrate','oars','rowboat'])webpPictures.add(key);
for(const key of ['layout-move','layout-rotate','layout-clear','layout-store','path-draw','path-erase','land-locked','visit-farm']){pictures[key]=key;webpPictures.add(key);}
// What you can build on your farm (24 Oct 2026, painted for the owner), one picture per Build tile.
for(const kind of ['fence','flowers','grass','oak','pine','birch','shrub','path','bench','flowerbed','haybale','barrels','cart','firewood']){pictures[`decor-${kind}`]=`decor-${kind}`;webpPictures.add(`decor-${kind}`);}
for(const key of [...Object.keys(HEIRLOOMS),...ENDGAME_PICTURES,'master','seedlab','visitors','giantpumpkin','valleyprojects'])webpPictures.add(key);   // looked up by the short name
for(const key of VILLAGE_ART)webpPictures.add(key);
webpPictures.add('feedback');
webpPictures.add('warehouse');
for(const key of TOOL_PICTURES)webpPictures.add(key);
for(const key of JOB_PICTURES)webpPictures.add(key);
for(const key of DONKEY_ART)webpPictures.add(key);
// The farm app (30 Sep 2026, painted by the user): a golden phone with the barn, for installing the game and the admin's devices.
pictures.farmapp='farmapp';webpPictures.add('farmapp');
// The four crop medals (6 Oct 2026, painted, WebP): bronze, silver, gold and platinum, one to three stars and a diamond so the tier reads
// at icon size too. Medals everywhere (the Medals tab, the harvest chip, the toast, profiles, the leaderboard) use them.
export const MEDAL_ART=Object.freeze(['medal-bronze','medal-silver','medal-gold','medal-platinum']);   // by tier: 0 bronze … 3 platinum
for(const key of MEDAL_ART){pictures[key]=key;webpPictures.add(key);}
// The tractor's diamond work (4 Oct 2026, painted by the user, WebP): Full care and the night shift, on the tractor card and in the wiki.
for(const key of ['tractor-full-care','tractor-night-shift']){pictures[key]=key;webpPictures.add(key);}
// The Fishing pond's pictures are WebP (FISH_PICTURES, above).
for(const key of FISH_PICTURES)webpPictures.add(key);
for(const key of LAKE_PICTURES)webpPictures.add(key);
// Family rank badges (27 Sep 2026), painted by the user; public/family-profile.js shows each one that is here beside the rank's name.
for(const key of ['family-rank-leader','family-rank-coleader','family-rank-honorary','family-rank-member','family-rank-top']){pictures[key]=key;webpPictures.add(key);}
// The real family emblems (7 Oct 2026: 33 more, painted in the family style): every family-… emblem in the list, as WebP. A picture
// is trimmed to the painting and centred on 256 px, 242 px at its longest side, like family-fox.webp (WebP quality 88, alpha 95).
for(const {icon} of FAMILY_EMBLEMS)if(icon.startsWith('family-')){pictures[icon]=icon;webpPictures.add(icon);}
// A flag for every language in Settings (29 Sep 2026, painted, WebP): flag-en, flag-es, ...
for(const {code} of LANGUAGES){pictures[`flag-${code}`]=`flag-${code}`;webpPictures.add(`flag-${code}`);}
// My farmer (21 Oct 2026): the default farmer in the straw hat, drawn by scripts/build-farmer-pictures.mjs from the game's own farmer.
pictures['my-farmer']='my-farmer';webpPictures.add('my-farmer');
// A picture by its file name, for the screens that show one without art() (the Buildings list and a building's page).
// The Season Pass (Oct 2026): its pictures, painted by the owner, WebP. Icons (256 px) in /assets/icons/; the badge, the frame (512 px,
// see-through in the middle), the profile background (1024 × 640) and the window's banner (1536 × 512) in /assets/season/.
const pictureFolder=Object.create(null);
// tractor-paint-autumn: the tractor's own icon with its body in the Pumpkin paint (rendered from the game's tractor picture, no new art).
for(const key of ['season-pass-autumn','season-point-autumn','cranberries','cranberries-seeds','golden-pumpkin','emblem-autumn','tractor-paint-autumn']){pictures[key]=key;webpPictures.add(key);}
for(const key of ['season-badge-autumn-2026','frame-autumn','profile-bg-autumn','season-pass-banner-autumn']){pictures[key]=key;webpPictures.add(key);pictureFolder[key]='season';}
// Winter 2026 (21 Oct 2026, the owner's 13 pictures, processed like Autumn's). tractor-paint-winter: the tractor icon in the Frost paint.
// The season crop's item key is 'sprouts'; its pictures are brussels-sprouts and brussels-sprouts-seeds.
for(const key of ['season-pass-winter','season-point-winter','golden-sledge','emblem-winter','tractor-paint-winter']){pictures[key]=key;webpPictures.add(key);}
pictures.sprouts='brussels-sprouts';pictures['sprouts-seeds']='brussels-sprouts-seeds';webpPictures.add('sprouts');webpPictures.add('sprouts-seeds');
for(const key of ['season-badge-winter-2026','frame-winter','profile-bg-winter','season-pass-banner-winter']){pictures[key]=key;webpPictures.add(key);pictureFolder[key]='season';}
const folder=key=>pictureFolder[key]??'icons';
// A picture that changed under the same name gets a version (/assets/ is kept a day and then served stale for a week while it is
// checked), so a returning farmer sees the new one at once: the Sheep Barn's slate-blue roof (22 Oct 2026; that morning's render of
// its new barn still showed the old green-roofed barn to farmers whose browser had kept the picture).
const PICTURE_VERSIONS=Object.freeze({sheepbarn:'20261022',blackbarley:'20261026'});
const stamp=key=>PICTURE_VERSIONS[key]?`?v=${PICTURE_VERSIONS[key]}`:'';
export const pictureFile=name=>`/assets/${folder(name)}/${name}.${webpPictures.has(name)?'webp':'png'}${stamp(name)}`;
// Where a picture lives, for drawing it on a canvas (the family flag, game.js): a file, and for a sprite its cell in the sheet.
export function artSource(key){
 const e=spriteEntries[key];
 if(e)return {src:`/assets/icons/${e.file}`,columns:e.columns,index:e.index};
 if(pictures[key])return {src:`/assets/${folder(key)}/${pictures[key]}.${svgArt.has(key)?'svg':webpPictures.has(key)?'webp':'png'}${stamp(key)}`,columns:1,index:0};
 return null;
}
export function art(key,extra=''){
 const entry=spriteEntries[key];
 if(entry){
  const {file,columns,index}=entry,x=index%columns/(columns-1)*100,y=Math.floor(index/columns)/(columns-1)*100;
  return `<span class="game-art game-art-sprite ${extra}" data-art="${key}" aria-hidden="true" style="--art-sheet:url('/assets/icons/${file}');--art-size:${columns*100}%;--art-position:${x}% ${y}%"></span>`;
 }
 // loading="lazy" (6 Oct 2026): a picture loads once it is shown, not before. The game's windows are built at the start, so about 80
 // pictures (2.5 MB) of closed windows used to load before the farm could be played.
 if(pictures[key])return `<img class="game-art ${extra}" data-art="${key}" src="/assets/${folder(key)}/${pictures[key]}.${svgArt.has(key)?'svg':webpPictures.has(key)?'webp':'png'}${stamp(key)}" alt="" draggable="false" loading="lazy" decoding="async">`;
 return '';
}
export function refreshArt(){
 document.querySelectorAll('[data-game-art],[data-lucide],.tiny-coin:not(.game-art)').forEach(el=>{
  if(el.hasAttribute('data-line-icon'))return;
  const key=el.getAttribute('data-game-art')??(el.classList.contains('tiny-coin')?'coins':symbolMap[el.getAttribute('data-lucide')]);if(!key)return;
  const template=document.createElement('template');template.innerHTML=art(key);const picture=template.content.firstElementChild;
  if(!picture)return;for(const cls of el.classList)if(cls!=='lucide'&&!cls.startsWith('lucide-'))picture.classList.add(cls);
  if(el.hasAttribute('title'))picture.setAttribute('title',el.getAttribute('title'));
  el.replaceWith(picture);
 });
 // Lucide keeps data-lucide on the <svg> it draws, so createIcons() would redraw every icon on every call (twice a second from the
 // game loop). Only call it when a new icon is still waiting to be drawn.
 if(document.querySelectorAll('[data-lucide]:not(svg)').length)window.lucide?.createIcons();
}
