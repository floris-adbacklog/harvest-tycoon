// Every item has one explicit image. Square sprite cells cannot reveal neighbouring art.
const sheets=[
 {file:'crops-v2.webp',columns:3,keys:['wheat','lettuce','corn','barley','cabbage','cauliflower','pumpkin','redcabbage','sunflower']},
 {file:'goods-v2.webp',columns:4,keys:['grainmeal','flour','feed','fertilizer','salad','pickles','oil','milk','eggs','cheese','bread','pie','vegetables','tractor','silo','cart']},
 {file:'interface-v2.webp',columns:4,keys:['farm','estate','buildings','market','gift','quests','boost','trophy','coins','diamonds','seeds','water','harvest','care','hammer','xp']}
];
const pictures={'family-sharing':'family-sharing','live-events':'live-events',vip:'vip','familyhall-model':'familyhall-model',lock:'lock','family-weekly-order':'family-weekly-order','family-members':'family-members','family-tournament':'family-tournament','family-management':'family-management',familyhall:'familyhall','helping-hand':'helping-hand','collect-all':'collect-all','instant-harvest':'instant-harvest','double-harvest':'double-harvest','invite-friends':'invite-friends',farmhouse:'farmhouse',mill:'mill',dairy:'dairy',coop:'coop',bakery:'bakery',packing:'packing',windmill:'windmill',stall:'stall',chores:'chores',honey:'honey'};
for(const key of ['rank-gold','rank-silver','rank-bronze','family-bee','family-oak','family-barn','family-fox','family-owl','family-windmill','family-horseshoe'])pictures[key]=key;
// Individual painted illustrations keep each chore recognisable at mobile sizes.
for(const id of ['weeds','troughs','sorting','fences','irrigation','harvestfair'])pictures[`chore-${id}`]=`chore-${id}`;
for(const id of ['greenhouse','apiary','paddock','workshop'])pictures[`activity-${id}`]=`activity-${id}`;
for(const id of ['apples','berries','greenbeans','applejuice','applepie','berrypreserves','berrytart','stew','juicepress','preserves','kitchen','factory'])pictures[id]=id;
for(const id of ["orchardjuice", "berrysmoothie", "applecompote", "applevinegar", "pickledbeans", "beangratin", "orchardsalad", "berrycheesecake", "harvesthamper"])pictures[id]=id;
// The midgame expansion: painted crop and goods icons (WebP) and renders of the four new buildings' models (PNG).
const MIDGAME_ITEM_ART=['squash','polebeans','ciderapples','squashsoup','beeswax','wool','yarn','cloth','cider'];
for(const id of [...MIDGAME_ITEM_ART,'beeyard','sheepbarn','glasshouse','weaving'])pictures[id]=id;
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
// The chat (header button, Notifications tab) and the Settings headings: painted, WebP.
for(const id of ['chat','bell','sound','cookie','letter','send','admin','guide','settings'])pictures[id]=id;
// Painted-style vector illustrations for the few interface items that had no artwork yet.
const svgArt=new Set(['streak','reminders','farmapp','hourglass']);
for(const id of svgArt)pictures[id]=id;
const spriteEntries=Object.fromEntries(sheets.flatMap(sheet=>sheet.keys.map((key,index)=>[key,{...sheet,index}])));
const symbolMap={'lock-keyhole':'lock',lock:'lock',salad:'salad',amphora:'pickles',milk:'milk',egg:'eggs',sandwich:'cheese',croissant:'bread','cake-slice':'pie','package-check':'vegetables','package-open':'feed',droplet:'oil',gem:'diamonds',coins:'coins',star:'xp',droplets:'water',scissors:'harvest',shovel:'care',leaf:'care',gift:'gift','clipboard-check':'quests',trophy:'trophy',medal:'trophy',sparkles:'boost',sprout:'seeds',hammer:'hammer',wheat:'wheat',house:'farm',factory:'buildings',landmark:'estate',store:'market',tractor:'tractor',warehouse:'silo',truck:'cart',wind:'windmill','shopping-basket':'vegetables','land-plot':'seeds','circle-fading-arrow-up':'hammer',flag:'quests','circle-help':'guide','volume-2':'sound',settings:'settings',bell:'bell',smartphone:'farmapp',shield:'admin',flame:'streak'};
export const ART_KEYS=Object.freeze([...Object.keys(spriteEntries),...Object.keys(pictures)]);
// The second batch re-encoded to WebP (every picture of 40 KB or more that was still a PNG; the PNGs stay on disk): same pixel size,
// 64-79% smaller, no visible difference side by side at 2x. The small building pictures (farmhouse, mill, ...) stay PNG.
const LARGE_PICTURES=['familyhall-model','helping-hand','windmill','family-fox','family-owl','family-windmill','chore-weeds','chore-fences','activity-paddock','activity-workshop','greenbeans','juicepress','preserves','kitchen','berrysmoothie','applevinegar','beangratin','beeyard','sheepbarn','glasshouse','weaving','goatshed','craftshop'];
// Renders of the valley places, shown only in the Buildings list (economy-ui.js).
const PLACE_RENDERS=['valleymarket','ranch','estateworkshop','tradedepot','grandfair'].map(key=>`place-${key}`);
// These pictures were re-encoded to WebP (level-up.webp is a separate hardcoded path in progression-ui.js, not routed through art()) (75-86% smaller, no visible difference at this size); every other picture is still a plain PNG.
const webpPictures=new Set(['live-events','family-sharing','double-harvest','invite-friends','vip','honey','rank-gold','family-bee','family-barn','rank-bronze','family-weekly-order','family-oak','rank-silver','family-members','familyhall','lock','family-tournament','family-management','berries','berrytart','berrypreserves','chore-harvestfair','pickledbeans','apples','applepie','applejuice','harvesthamper','berrycheesecake','stew','orchardsalad','orchardjuice','family-horseshoe','applecompote','chore-sorting','chore-irrigation','collect-all','activity-greenhouse','activity-apiary','instant-harvest','chore-troughs',...MIDGAME_ITEM_ART,...VALLEY_ITEM_ART,'valleymarket',...ESTATE_ITEM_ART,'estateworkshop','tradedepot','grandfair',...LARGE_PICTURES,...PLACE_RENDERS,'truffles','truffleomelette','chat','bell','sound','cookie','letter','send','admin','guide','settings']);
// A picture by its file name, for the screens that show one without art() (the Buildings list and a building's page).
export const pictureFile=name=>`/assets/icons/${name}.${webpPictures.has(name)?'webp':'png'}`;
export function art(key,extra=''){
 const entry=spriteEntries[key];
 if(entry){
  const {file,columns,index}=entry,x=index%columns/(columns-1)*100,y=Math.floor(index/columns)/(columns-1)*100;
  return `<span class="game-art game-art-sprite ${extra}" data-art="${key}" aria-hidden="true" style="--art-sheet:url('/assets/icons/${file}');--art-size:${columns*100}%;--art-position:${x}% ${y}%"></span>`;
 }
 if(pictures[key])return `<img class="game-art ${extra}" data-art="${key}" src="/assets/icons/${pictures[key]}.${svgArt.has(key)?'svg':webpPictures.has(key)?'webp':'png'}" alt="" draggable="false">`;
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
