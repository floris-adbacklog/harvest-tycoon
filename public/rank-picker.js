// The leaderboard's "Rank by" choice: the main boards as chips, and a "By crop" and a "By good" chip that each open a row of boards.
// It replaces a 19-item native dropdown. The chosen board is still kept in a hidden field, so the rest of the leaderboard code is unchanged.
export const RANK_ART=Object.freeze({level:'xp',currency:'coins',harvested_crops:'harvest',goods_produced:'bread',items_sold:'market',badges:'trophy',deliveries:'cart',events_finished:'live-events',best_streak:'streak',farm_fields:'estate',chores_done:'chores',helping_rounds:'helping-hand',estate_projects:'farmhouse'});
// A crop board shows the crop, a good's board the good.
export const rankArtKey=key=>RANK_ART[key]??(key.startsWith('harvested_')?key.slice(10):key.startsWith('made_')?key.slice(5):'trophy');
// "By crop" and "By good": each chip opens its own row of boards and remembers the last one you looked at there.
const GROUPS=Object.freeze({
 crops:{toggle:'data-rank-crops',row:'rank-crops',label:'By crop',art:'wheat',label2:'Choose a crop',first:'harvested_wheat'},
 goods:{toggle:'data-rank-goods',row:'rank-goods',label:'By good',art:'bread',label2:'Choose a good',first:'made_bread'}
});
const groupOf=(categories,key)=>categories[key]?.group??null;
const chip=(art,key,label,extra='')=>`<button type="button" class="rank-chip ${extra}" data-rank="${key}" aria-pressed="false">${art}<span>${label}</span></button>`;

export function rankPickerMarkup(categories,art){
 const entries=Object.entries(categories),groups=Object.entries(GROUPS).filter(([g])=>entries.some(([,c])=>c.group===g));
 return `<div class="rank-chips" role="group" aria-labelledby="rank-label">${entries.filter(([,c])=>!c.group).map(([key,c])=>chip(art(RANK_ART[key]??'trophy'),key,c.heading)).join('')}`
  +groups.map(([,g])=>`<button type="button" class="rank-chip" ${g.toggle} aria-pressed="false" aria-expanded="false" aria-controls="${g.row}">${art(g.art)}<span>${g.label}</span><span class="rank-caret" aria-hidden="true"></span></button>`).join('')+'</div>'
  +groups.map(([name,g])=>`<div class="rank-crops" id="${g.row}" role="group" aria-label="${g.label2}" hidden>${entries.filter(([,c])=>c.group===name).map(([key,c])=>chip(art(rankArtKey(key)),key,c.heading,'rank-chip-small')).join('')}</div>`).join('');
}

// What a tap does. `state` is {category, lastCrop, lastGood, open} (open: the row showing, 'crops', 'goods' or none); `tap` is
// {rank: 'level'} for a chip, {crops: true} for "By crop" or {group: 'goods'} for "By good". A row can be opened and closed on its own:
// closing it keeps the board you were looking at.
export function nextRank(categories,state,tap){
 let {category}=state;const last={crops:state.lastCrop??GROUPS.crops.first,goods:state.lastGood??GROUPS.goods.first};
 let open=state.open===undefined||state.open===true?groupOf(categories,category):state.open||null;
 const group=tap.crops?'crops':Object.hasOwn(GROUPS,tap.group??'')?tap.group:null;
 if(group){
  if(groupOf(categories,category)===group)open=open===group?null:group;   // the chip is a toggle once one of its boards shows
  else if(Object.hasOwn(categories,last[group])){category=last[group];open=group;}
 }else if(Object.hasOwn(categories,tap.rank)){category=tap.rank;open=groupOf(categories,category);}
 const now=groupOf(categories,category);if(now)last[now]=category;
 return {category,lastCrop:last.crops,lastGood:last.goods,open,showCrops:open==='crops',showGoods:open==='goods',changed:category!==state.category};
}

// Wires the chips inside `root` to the hidden field and reports real changes.
export function bindRankPicker(root,{categories,field,onChange}){
 let state={category:field.value||'level',lastCrop:GROUPS.crops.first,lastGood:GROUPS.goods.first,open:groupOf(categories,field.value||'level')};
 const paint=()=>{
  for(const button of root.querySelectorAll('[data-rank]'))button.setAttribute('aria-pressed',String(button.dataset.rank===state.category));
  for(const [name,g] of Object.entries(GROUPS)){
   const toggle=root.querySelector(`[${g.toggle}]`),row=root.querySelector(`#${g.row}`);
   toggle?.setAttribute('aria-pressed',String(groupOf(categories,state.category)===name));toggle?.setAttribute('aria-expanded',String(state.open===name));
   if(row)row.hidden=state.open!==name;
  }
 };
 root.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-rank],[data-rank-crops],[data-rank-goods]');if(!button)return;
  const tap=button.hasAttribute('data-rank-crops')?{crops:true}:button.hasAttribute('data-rank-goods')?{group:'goods'}:{rank:button.dataset.rank};
  const next=nextRank(categories,state,tap);
  state={category:next.category,lastCrop:next.lastCrop,lastGood:next.lastGood,open:next.open};field.value=next.category;paint();
  // On a phone the chips scroll sideways: keep the chosen one in view.
  root.querySelector(`[data-rank="${next.category}"]`)?.scrollIntoView?.({inline:'center',block:'nearest',behavior:'smooth'});
  if(next.changed)onChange(next.category);
 });
 paint();
 return {select(key){state=nextRank(categories,state,{rank:key});field.value=state.category;paint();}};
}
