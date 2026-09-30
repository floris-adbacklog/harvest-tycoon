import {refreshArt} from './visual-icons.js';

// Settings as a short list (30 Sep 2026): your account stays on top; below it one row per part (Avatar, Email address, Sound, Chat,
// Reminders, Farm app, Language, Privacy) that opens only that part, with a way back to the list. The parts themselves are
// unchanged, so the code that fills or hides them keeps working; a hidden part simply has no row.
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function createSettingsNav(dialog,{doc=globalThis.document,win=globalThis.window}={}){
 if(!dialog)return null;
 const parts=()=>[...dialog.querySelectorAll('#avatar-settings,.settings-section')];
 const titleOf=part=>part.querySelector('h3')?.textContent.trim()??'';
 const iconOf=part=>{const i=part.querySelector('h3 [data-game-art],h3 [data-lucide],h3 .game-art,h3 svg');const key=i?.getAttribute('data-game-art')??i?.getAttribute('data-art');const lucide=i?.getAttribute('data-lucide');
  return key?`<i data-game-art="${esc(key)}"></i>`:lucide&&i.tagName!=='svg'?`<i data-lucide="${esc(lucide)}"></i>`:i?.tagName==='svg'?i.outerHTML:part.id==='avatar-settings'&&part.querySelector('#avatar-preview')?`<img class="settings-row-avatar" src="${esc(part.querySelector('#avatar-preview').getAttribute('src'))}" alt="">`:'';};
 const nav=doc.createElement('nav');nav.className='settings-nav';nav.setAttribute('aria-label','Settings');
 const back=doc.createElement('button');back.type='button';back.className='back-button settings-back';back.hidden=true;back.innerHTML='<i data-lucide="chevron-left" data-line-icon></i>All settings';
 let open=null;
 function list(){
  nav.innerHTML=parts().filter(p=>!p.hidden&&titleOf(p)).map(p=>`<button type="button" class="settings-row" data-settings-open="${esc(p.id)}">${iconOf(p)}<span>${esc(titleOf(p))}</span><i data-lucide="chevron-right" data-line-icon></i></button>`).join('');
  refreshArt();try{win?.lucide?.createIcons?.();}catch{}
 }
 function show(id){
  open=id;dialog.classList.toggle('settings-one',Boolean(id));
  for(const p of parts())p.classList.toggle('is-open',p.id===id);
  back.hidden=!id;nav.hidden=Boolean(id);if(!id)list();
  dialog.scrollTop=0;
 }
 nav.addEventListener('click',event=>{const row=event.target.closest('[data-settings-open]');if(row)show(row.dataset.settingsOpen);});
 back.addEventListener('click',()=>{show(null);nav.querySelector(`[data-settings-open="${open}"]`)?.focus({preventScroll:true});});
 const anchor=dialog.querySelector('#avatar-settings')??parts()[0];anchor?.before(back,nav);
 // Every time Settings opens it starts on the list; a part that shows or hides later updates the list.
 new MutationObserver(()=>{if(dialog.open)show(null);}).observe(dialog,{attributes:true,attributeFilter:['open']});
 new MutationObserver(()=>{if(!open)list();}).observe(dialog,{subtree:true,attributes:true,attributeFilter:['hidden']});
 show(null);
 return {show,list};
}
