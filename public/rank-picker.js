// The leaderboard's "Rank by" choice: seven main boards as chips, and one "By crop" chip that opens a row of crop chips.
// It replaces a 19-item native dropdown. The chosen board is still kept in a hidden field, so the rest of the leaderboard code is unchanged.
export const RANK_ART=Object.freeze({level:'xp',currency:'coins',harvested_crops:'harvest',goods_produced:'bread',items_sold:'market',badges:'trophy',deliveries:'cart'});
const cropArt=key=>key.replace(/^harvested_/,'');
const isCrop=(categories,key)=>categories[key]?.group==='crops';
const chip=(art,key,label,extra='')=>`<button type="button" class="rank-chip ${extra}" data-rank="${key}" aria-pressed="false">${art}<span>${label}</span></button>`;

export function rankPickerMarkup(categories,art){
 const entries=Object.entries(categories),crops=entries.filter(([key])=>isCrop(categories,key));
 return `<div class="rank-chips" role="group" aria-labelledby="rank-label">${entries.filter(([key])=>!isCrop(categories,key)).map(([key,c])=>chip(art(RANK_ART[key]??'trophy'),key,c.heading)).join('')}<button type="button" class="rank-chip" data-rank-crops aria-pressed="false" aria-expanded="false" aria-controls="rank-crops">${art('wheat')}<span>By crop</span><span class="rank-caret" aria-hidden="true"></span></button></div><div class="rank-crops" id="rank-crops" role="group" aria-label="Choose a crop" hidden>${crops.map(([key,c])=>chip(art(cropArt(key)),key,c.heading,'rank-chip-small')).join('')}</div>`;
}

// What a tap does. `state` is {category, lastCrop, open}; `tap` is {rank: 'level'} for a chip or {crops: true} for the "By crop" chip.
// The crop row can be opened and closed on its own: closing it keeps the crop board you were looking at.
export function nextRank(categories,state,tap){
 let {category,lastCrop}=state,open=state.open??isCrop(categories,category);
 if(tap.crops){
  if(isCrop(categories,category))open=!open;          // "By crop" is a toggle once a crop board is showing
  else{category=lastCrop;open=true;}
 }else if(Object.hasOwn(categories,tap.rank)){category=tap.rank;open=isCrop(categories,category);}
 if(isCrop(categories,category))lastCrop=category;
 return {category,lastCrop,open,showCrops:open,changed:category!==state.category};
}

// Wires the chips inside `root` to the hidden field and reports real changes.
export function bindRankPicker(root,{categories,field,onChange}){
 let state={category:field.value||'level',lastCrop:'harvested_wheat',open:isCrop(categories,field.value||'level')};
 const paint=()=>{
  for(const button of root.querySelectorAll('[data-rank]'))button.setAttribute('aria-pressed',String(button.dataset.rank===state.category));
  const cropsChip=root.querySelector('[data-rank-crops]');
  cropsChip.setAttribute('aria-pressed',String(isCrop(categories,state.category)));cropsChip.setAttribute('aria-expanded',String(state.open));
  root.querySelector('#rank-crops').hidden=!state.open;
 };
 root.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-rank],[data-rank-crops]');if(!button)return;
  const next=nextRank(categories,state,button.hasAttribute('data-rank-crops')?{crops:true}:{rank:button.dataset.rank});
  state={category:next.category,lastCrop:next.lastCrop,open:next.open};field.value=next.category;paint();
  // On a phone the chips scroll sideways: keep the chosen one in view.
  root.querySelector(`[data-rank="${next.category}"]`)?.scrollIntoView?.({inline:'center',block:'nearest',behavior:'smooth'});
  if(next.changed)onChange(next.category);
 });
 paint();
 return {select(key){state=nextRank(categories,state,{rank:key});field.value=state.category;paint();}};
}
