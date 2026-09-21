// Family emblem chooser, also used for the farmer avatar: one row of tiles that pages with arrows, instead of a wall of big
// squares. The tiles stay a normal radio group (the forms read the "emblem" or "avatar" field as before); the arrows and the
// name of the picked tile are extras.
const chevron=direction=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${direction<0?'M15 5l-7 7 7 7':'M9 5l7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function emblemPickerMarkup({emblems,checkedId,legend,nameOf,tile,esc,field='emblem',noun='emblem',extraClass=''}){
 const picked=Math.max(0,emblems.findIndex(e=>e.id===checkedId));
 const tiles=emblems.map((e,i)=>`<label title="${esc(nameOf(e))}"><input type="radio" name="${field}" value="${e.id}"${i===picked?' checked':''} aria-label="${esc(nameOf(e))} ${noun}" data-name="${esc(nameOf(e))}">${tile(e.id)}</label>`).join('');
 return `<fieldset class="emblem-picker${extraClass?` ${extraClass}`:''}" data-emblem-picker><legend>${legend}</legend><div class="emblem-picker-row"><button type="button" class="emblem-arrow" data-emblem-step="-1" aria-label="Show earlier ${noun}s">${chevron(-1)}</button><div class="family-emblems">${tiles}</div><button type="button" class="emblem-arrow" data-emblem-step="1" aria-label="Show more ${noun}s">${chevron(1)}</button></div><p class="emblem-picked" aria-live="polite"><strong>${esc(nameOf(emblems[picked]))}</strong><span>${picked+1} of ${emblems.length}</span></p></fieldset>`;
}

// Where the arrows scroll to: a row's worth, keeping one tile of the previous view for context.
export function pageStep(rowWidth,tileWidth,direction){return direction*Math.max(rowWidth-tileWidth,rowWidth*.6);}

export function bindEmblemPickers(root,win=globalThis){
 for(const picker of root.querySelectorAll('[data-emblem-picker]')){
  const row=picker.querySelector('.family-emblems'),radios=[...picker.querySelectorAll('input[type="radio"]')];
  const [earlier,more]=['-1','1'].map(step=>picker.querySelector(`[data-emblem-step="${step}"]`));
  const name=picker.querySelector('.emblem-picked strong'),place=picker.querySelector('.emblem-picked span');
  const arrows=()=>{earlier.disabled=row.scrollLeft<=1;more.disabled=row.scrollLeft>=row.scrollWidth-row.clientWidth-1;};
  const picked=()=>{const i=radios.findIndex(radio=>radio.checked);if(i<0)return;name.textContent=radios[i].dataset.name;place.textContent=`${i+1} of ${radios.length}`;};
  // scrollTo, not scrollBy: with scroll snapping, some browsers drop a relative smooth scroll that starts at the end of the row.
  const go=direction=>{
   const left=Math.min(Math.max(row.scrollLeft+pageStep(row.clientWidth,radios[0]?.parentElement.offsetWidth??0,direction),0),row.scrollWidth-row.clientWidth);
   try{row.scrollTo({left,behavior:'smooth'});}catch{row.scrollLeft=left;}
  };
  earlier.onclick=()=>go(-1);more.onclick=()=>go(1);
  row.addEventListener('scroll',arrows,{passive:true});
  picker.addEventListener('change',picked);
  // Start with the chosen tile in the middle of the row, without scrolling the dialog itself. A row inside a closed dialog has
  // no size yet, so that happens the first time it gets one.
  let centred=false;
  const centre=()=>{
   if(centred||!row.clientWidth)return;
   const chosen=radios.find(radio=>radio.checked)?.parentElement;
   if(chosen)row.scrollLeft=chosen.offsetLeft-(row.clientWidth-chosen.offsetWidth)/2;
   centred=true;
  };
  centre();arrows();picked();
  if(typeof win.ResizeObserver==='function'){const watch=new win.ResizeObserver(()=>{if(!row.isConnected)watch.disconnect();else{centre();arrows();}});watch.observe(row);}
 }
}
