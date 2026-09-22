// Every item has one explicit image. Square sprite cells cannot reveal neighbouring art.
const sheets=[
 {file:'crops-v2.webp',columns:3,keys:['wheat','lettuce','corn','barley','cabbage','cauliflower','pumpkin','redcabbage','sunflower']},
 {file:'goods-v2.webp',columns:4,keys:['grainmeal','flour','feed','fertilizer','salad','pickles','oil','milk','eggs','cheese','bread','pie','vegetables','tractor','silo','cart']},
 {file:'interface-v2.webp',columns:4,keys:['farm','estate','buildings','market','gift','quests','boost','trophy','coins','diamonds','seeds','water','harvest','care','hammer','xp']}
];
const pictures={vip:'vip','familyhall-model':'familyhall-model',lock:'lock','family-weekly-order':'family-weekly-order','family-members':'family-members','family-tournament':'family-tournament','family-management':'family-management',familyhall:'familyhall','helping-hand':'helping-hand','collect-all':'collect-all','instant-harvest':'instant-harvest',farmhouse:'farmhouse',mill:'mill',dairy:'dairy',coop:'coop',bakery:'bakery',packing:'packing',windmill:'windmill',stall:'stall',chores:'chores',honey:'honey'};
for(const key of ['rank-gold','rank-silver','rank-bronze','family-bee','family-oak','family-barn','family-fox','family-owl','family-windmill','family-horseshoe'])pictures[key]=key;
// Individual painted illustrations keep each chore recognisable at mobile sizes.
for(const id of ['weeds','troughs','sorting','fences','irrigation','harvestfair'])pictures[`chore-${id}`]=`chore-${id}`;
for(const id of ['greenhouse','apiary','paddock','workshop'])pictures[`activity-${id}`]=`activity-${id}`;
for(const id of ['apples','berries','greenbeans','applejuice','applepie','berrypreserves','berrytart','stew','juicepress','preserves','kitchen','factory'])pictures[id]=id;
for(const id of ["orchardjuice", "berrysmoothie", "applecompote", "applevinegar", "pickledbeans", "beangratin", "orchardsalad", "berrycheesecake", "harvesthamper"])pictures[id]=id;
// Painted-style vector illustrations for the few interface items that had no artwork yet.
const svgArt=new Set(['guide','sound','streak','settings','reminders','farmapp','hourglass']);
for(const id of svgArt)pictures[id]=id;
const spriteEntries=Object.fromEntries(sheets.flatMap(sheet=>sheet.keys.map((key,index)=>[key,{...sheet,index}])));
const symbolMap={'lock-keyhole':'lock',lock:'lock',salad:'salad',amphora:'pickles',milk:'milk',egg:'eggs',sandwich:'cheese',croissant:'bread','cake-slice':'pie','package-check':'vegetables','package-open':'feed',droplet:'oil',gem:'diamonds',coins:'coins',star:'xp',droplets:'water',scissors:'harvest',shovel:'care',leaf:'care',gift:'gift','clipboard-check':'quests',trophy:'trophy',medal:'trophy',sparkles:'boost',sprout:'seeds',hammer:'hammer',wheat:'wheat',house:'farm',factory:'buildings',landmark:'estate',store:'market',tractor:'tractor',warehouse:'silo',truck:'cart',wind:'windmill','shopping-basket':'vegetables','land-plot':'seeds','circle-fading-arrow-up':'hammer',flag:'quests','circle-help':'guide','volume-2':'sound',settings:'settings',bell:'reminders',smartphone:'farmapp',flame:'streak'};
export const ART_KEYS=Object.freeze([...Object.keys(spriteEntries),...Object.keys(pictures)]);
export function art(key,extra=''){
 const entry=spriteEntries[key];
 if(entry){
  const {file,columns,index}=entry,x=index%columns/(columns-1)*100,y=Math.floor(index/columns)/(columns-1)*100;
  return `<span class="game-art game-art-sprite ${extra}" data-art="${key}" aria-hidden="true" style="--art-sheet:url('/assets/icons/${file}');--art-size:${columns*100}%;--art-position:${x}% ${y}%"></span>`;
 }
 // These pictures were re-encoded to WebP (level-up.webp is a separate hardcoded path in progression-ui.js, not routed through art()) (75-86% smaller, no visible difference at this size); every other picture is still a plain PNG.
 const webpPictures=new Set(['vip','honey','rank-gold','family-bee','family-barn','rank-bronze','family-weekly-order','family-oak','rank-silver','family-members','familyhall','lock','family-tournament','family-management','berries','berrytart','berrypreserves','chore-harvestfair','pickledbeans','apples','applepie','applejuice','harvesthamper','berrycheesecake','stew','orchardsalad','orchardjuice','family-horseshoe','applecompote','chore-sorting','chore-irrigation','collect-all','activity-greenhouse','activity-apiary','instant-harvest','chore-troughs']);
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
 window.lucide?.createIcons();
}
