// Every item has one explicit image. Square sprite cells cannot reveal neighbouring art.
const sheets=[
 {file:'crops-v2.png',columns:3,keys:['wheat','lettuce','corn','barley','cabbage','cauliflower','pumpkin','redcabbage','sunflower']},
 {file:'goods-v2.png',columns:4,keys:['grainmeal','flour','feed','fertilizer','salad','pickles','oil','milk','eggs','cheese','bread','pie','vegetables','tractor','silo','cart']},
 {file:'interface-v2.png',columns:4,keys:['farm','estate','buildings','market','gift','quests','boost','trophy','coins','diamonds','seeds','water','harvest','care','hammer','xp']}
];
const pictures={farmhouse:'farmhouse',mill:'mill',dairy:'dairy',coop:'coop',bakery:'bakery',packing:'packing',windmill:'windmill',stall:'stall',chores:'chores',honey:'honey'};
const spriteEntries=Object.fromEntries(sheets.flatMap(sheet=>sheet.keys.map((key,index)=>[key,{...sheet,index}])));
const symbolMap={salad:'salad',amphora:'pickles',milk:'milk',egg:'eggs',sandwich:'cheese',croissant:'bread','cake-slice':'pie','package-check':'vegetables','package-open':'feed',droplet:'oil',gem:'diamonds',coins:'coins',star:'xp',droplets:'water',scissors:'harvest',shovel:'care',leaf:'care',gift:'gift','clipboard-check':'quests',trophy:'trophy',medal:'trophy',sparkles:'boost',sprout:'seeds',hammer:'hammer',wheat:'wheat',house:'farm',factory:'buildings',landmark:'estate',store:'market',tractor:'tractor',warehouse:'silo',truck:'cart',wind:'windmill','shopping-basket':'vegetables','land-plot':'seeds','circle-fading-arrow-up':'hammer',flag:'quests'};
export const ART_KEYS=Object.freeze([...Object.keys(spriteEntries),...Object.keys(pictures)]);
export function art(key,extra=''){
 const entry=spriteEntries[key];
 if(entry){
  const {file,columns,index}=entry,x=index%columns/(columns-1)*100,y=Math.floor(index/columns)/(columns-1)*100;
  return `<span class="game-art game-art-sprite ${extra}" data-art="${key}" aria-hidden="true" style="--art-sheet:url('/assets/icons/${file}');--art-size:${columns*100}%;--art-position:${x}% ${y}%"></span>`;
 }
 if(pictures[key])return `<img class="game-art ${extra}" data-art="${key}" src="/assets/icons/${pictures[key]}.png" alt="" draggable="false">`;
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
