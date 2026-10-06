import {refreshArt} from './visual-icons.js';
import {settingsLink,settingsSlug} from './game-links.js';
import {WIKI_COPY_ICON} from './wiki-link.js';

// Settings as a short list (30 Sep 2026): your account stays on top; below it one row per part (Avatar, Email address, Sound, Chat,
// Reminders, Farm app, Language, Privacy) that opens only that part, with a way back to the list. The parts themselves are
// unchanged, so the code that fills or hides them keeps working; a hidden part simply has no row.
// A link opens one part at once (4 Oct 2026, /settings/<part>, the chat's "Settings › Farm app" chip): openAt(id) before the dialog
// opens. A part that is not there for this farmer (hidden, or put aside by the page's CSS: CrazyGames, our apps) opens the list with a
// short note instead.
// The parts android.css and portal.css put aside (display:none!important): the Farm app in our apps; Email address, Reminders and the
// Farm app on CrazyGames. A test checks these against the CSS.
export const AWAY='html[data-app=android] #app-settings,html[data-portal] :is(#email-settings,#notify-settings,#app-settings)';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function createSettingsNav(dialog,{doc=globalThis.document,win=globalThis.window}={}){
 if(!dialog)return null;
 const parts=()=>[...dialog.querySelectorAll('#avatar-settings,.settings-section')];
 // The heading's words, without the staff's Copy link button (below) in it.
 const titleOf=part=>[...(part.querySelector('h3')?.childNodes??[])].filter(n=>!n.classList?.contains('settings-copy')).map(n=>n.textContent).join('').trim();
 // Its picture, never the Copy link button's chain (the Avatar heading has none of its own; 4 Oct 2026 review).
 const iconOf=part=>{const i=[...part.querySelectorAll('h3 [data-game-art],h3 [data-lucide],h3 .game-art,h3 svg')].find(n=>!n.closest('.settings-copy'));const key=i?.getAttribute('data-game-art')??i?.getAttribute('data-art');const lucide=i?.getAttribute('data-lucide');
  return key?`<i data-game-art="${esc(key)}"></i>`:lucide&&i.tagName!=='svg'?`<i data-lucide="${esc(lucide)}"></i>`:i?.tagName==='svg'?i.outerHTML:part.id==='avatar-settings'&&part.querySelector('#avatar-preview')?`<img class="settings-row-avatar" src="${esc(part.querySelector('#avatar-preview').getAttribute('src'))}" alt="">`:'';};
 const nav=doc.createElement('nav');nav.className='settings-nav';nav.setAttribute('aria-label','Settings');
 const back=doc.createElement('button');back.type='button';back.className='back-button settings-back';back.hidden=true;back.innerHTML='<i data-lucide="chevron-left" data-line-icon></i>All settings';
 const note=doc.createElement('p');note.className='settings-nav-note';note.setAttribute('role','status');note.hidden=true;note.textContent='That part of Settings is not available here.';
 let open=null,next=null;
 // Not there for this farmer: hidden, or put aside by the page's CSS (AWAY), so it has no row and a link to it gets the note.
 const away=p=>p.hidden||p.matches(AWAY)||!titleOf(p);
 function list(){
  // The row that has the focus keeps it when the list is drawn again (4 Oct 2026 review: keyboard and screen-reader users lost their place).
  const focused=nav.contains(doc.activeElement)?doc.activeElement.closest?.('[data-settings-open]')?.dataset.settingsOpen:null;
  nav.innerHTML=parts().filter(p=>!away(p)).map(p=>`<button type="button" class="settings-row" data-settings-open="${esc(p.id)}">${iconOf(p)}<span>${esc(titleOf(p))}</span><i data-lucide="chevron-right" data-line-icon></i></button>`).join('');
  refreshArt();try{win?.lucide?.createIcons?.();}catch{}
  if(focused)nav.querySelector(`[data-settings-open="${esc(focused)}"]`)?.focus({preventScroll:true});
 }
 function show(id){
  open=id;note.hidden=true;dialog.classList.toggle('settings-one',Boolean(id));
  for(const p of parts())p.classList.toggle('is-open',p.id===id);
  back.hidden=!id;nav.hidden=Boolean(id);if(!id)list();
  dialog.scrollTop=0;
 }
 // One part from a link: the part itself when this farmer has it, else the list and the note.
 function reveal(id){
  const part=parts().find(p=>p.id===id),here=Boolean(part)&&!away(part);
  show(here?id:null);
  if(here&&win?.getComputedStyle?.(part).display!=='none')return;
  if(open)show(null);
  note.hidden=false;
 }
 const openAt=id=>{next=id||null;};
 nav.addEventListener('click',event=>{const row=event.target.closest('[data-settings-open]');if(row)show(row.dataset.settingsOpen);});
 // Back on the list, the focus goes to the row of the part just left (it read open after show(null) cleared it, so found nothing).
 back.addEventListener('click',()=>{const left=open;show(null);nav.querySelector(`[data-settings-open="${esc(left)}"]`)?.focus({preventScroll:true});});
 const anchor=dialog.querySelector('#avatar-settings')??parts()[0];anchor?.before(back,note,nav);
 // Every time Settings opens it starts on the list (or the part a link asked for); a part that shows or hides later updates the list.
 new MutationObserver(()=>{if(!dialog.open)return;const id=next;next=null;if(id)reveal(id);else show(null);}).observe(dialog,{attributes:true,attributeFilter:['open']});
 // Only a part that really shows or hides: setting hidden to what it already is (install-ui.js does on every refresh) changes nothing.
 new MutationObserver(records=>{if(!open&&records.some(r=>(r.oldValue!==null)!==r.target.hasAttribute('hidden')))list();}).observe(dialog,{subtree:true,attributes:true,attributeFilter:['hidden'],attributeOldValue:true});
 show(null);
 return {show,list,openAt,reveal};
}
// Copy link in Settings, for the staff only (4 Oct 2026): beside each part's heading a small button that copies that part's address
// (public/game-links.js, https://www.harvesttycoon.com/settings/<part>), to paste in the chat or a message. src/game-cloud.js adds them
// for an admin or a moderator, never on CrazyGames; farmers never get them. The wiki's picture; the button says "Copied." itself.
export function addSettingsCopyLinks(dialog,{doc=globalThis.document,win=globalThis.window}={}){
 if(!dialog||dialog.dataset.copyLinks)return false;
 dialog.dataset.copyLinks='on';
 // Again every time Settings opens: a part that draws its heading anew (the avatar) gets its button back.
 const add=()=>{for(const part of dialog.querySelectorAll('#avatar-settings,.settings-section')){
  const slug=settingsSlug(part.id),head=part.querySelector('h3');if(!slug||!head||head.querySelector('.settings-copy'))continue;
  head.insertAdjacentHTML('beforeend',`<button type="button" class="settings-copy" data-settings-copy="${settingsLink(slug)}" title="Copy link" aria-label="Copy link">${WIKI_COPY_ICON}<span class="settings-copied" aria-live="polite"></span></button>`);
 }};
 add();new MutationObserver(add).observe(dialog,{attributes:true,attributeFilter:['open']});
 dialog.addEventListener('click',event=>{
  const button=event.target.closest('[data-settings-copy]');if(!button)return;
  event.preventDefault();event.stopPropagation();
  void copyGameLink(button,button.dataset.settingsCopy,{doc,win});
 });
 return true;
}
// Copies a game link from a staff button (Settings, Feedback): "Copied." in the button's own status for a moment; where no clipboard is
// allowed, the address shows, selected, to copy by hand.
export async function copyGameLink(button,url,{doc=globalThis.document,win=globalThis.window}={}){
 const say=button.querySelector('[aria-live]');clearTimeout(button.copyTimer);
 let done=false;
 for(const w of [win?.parent,win]){try{if(w?.navigator?.clipboard?.writeText){await w.navigator.clipboard.writeText(url);done=true;break;}}catch{}}
 if(!done){const field=doc.createElement('input');field.className='settings-copy-field';field.readOnly=true;field.value=url;field.setAttribute('aria-label','Copy link');(button.closest('h2,h3')??button).after(field);field.select();field.addEventListener('blur',()=>field.remove(),{once:true});return false;}
 if(say)say.textContent='Copied.';button.classList.add('is-copied');
 button.copyTimer=setTimeout(()=>{if(say)say.textContent='';button.classList.remove('is-copied');},1800);
 return true;
}
// Copy link beside Feedback's title (6 Oct 2026), for the staff only: its link (public/game-links.js FEEDBACK_LINK) to paste in the chat,
// News or a pop-up. The window draws itself anew each time (public/feedback-ui.js), so this only marks it; it shows the button.
export function addFeedbackCopyLink(dialog){if(!dialog)return false;dialog.dataset.copyLink='on';return true;}
