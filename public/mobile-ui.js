import {refreshArt} from './visual-icons.js';
export const mobileLayout=matchMedia('(max-width: 900px), (max-height: 550px) and (pointer: coarse)');

export function createMobileUI({openUtility,resetView}){
 const $=id=>document.getElementById(id),menu=$('more-dialog');
 // The menu in groups (farm.html): a heading hides when everything under it is still locked; locked tiles wait, folded, under one
 // "Coming later" row at the bottom (progression-ui.js greys them and moves them there).
 const grid=menu.querySelector('.mobile-menu-grid'),later=grid.querySelector('[data-menu-later]');
 function arrange(){
  let heading=null;const open=new Map();
  for(const el of grid.children){if(el.matches('[data-section-heading]')){heading=el;open.set(el,false);}else if(heading&&el.tagName==='BUTTON'&&!el.hidden&&!el.classList.contains('locked')&&!el.matches('[data-menu-later]'))open.set(heading,true);}
  for(const [el,any] of open)el.hidden=!any;
  const locked=grid.querySelectorAll('button.locked:not([hidden])').length;
  later.hidden=!locked;later.querySelector('[data-later-count]').textContent=locked;
  if(!locked)grid.classList.remove('show-later');later.setAttribute('aria-expanded',String(grid.classList.contains('show-later')));
 }
 later.onclick=()=>{grid.classList.toggle('show-later');arrange();};
 $('more-button').onclick=()=>{
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  grid.classList.remove('show-later');badges();arrange();
  menu.showModal();menu.scrollTop=0;refreshArt();
 };
 menu.querySelectorAll('[data-menu-action]').forEach(button=>button.onclick=()=>{
  const action=button.dataset.menuAction;
  menu.close();$(action)?.click();
 });
 menu.querySelectorAll('[data-menu-utility]').forEach(button=>button.onclick=()=>{menu.close();openUtility(button.dataset.menuUtility);});
 function badges(){
  const gift=$('today-dot'),quests=$('task-dot'),batches=$('production-count');
  // The same "!" on the tiles as on the side tools, so a waiting reward stands out in the menu too.
  menu.querySelector('[data-menu-action="today-button"]')?.classList.toggle('has-dot',!gift.hidden);
  menu.querySelector('[data-menu-action="events-button"]')?.classList.toggle('has-dot',!($('events-dot')?.hidden??true));
  // Farm Family and the chat: on phones the header keeps only coins and diamonds, so both live here (under Friends) and follow their
  // header buttons. The chat tile carries the same unread count as the desktop chat button, as a pill.
  const family=$('family-button'),familyTile=menu.querySelector('[data-menu-action="family-button"]');
  if(family&&familyTile){familyTile.hidden=family.hidden;familyTile.classList.toggle('has-dot',!family.hidden&&!($('family-dot')?.hidden??true));}
  const familyWaiting=mobileLayout.matches&&familyTile?.classList.contains('has-dot');
  const chat=$('chat-button'),chatDot=$('chat-dot'),chatTile=$('chat-menu-entry'),chatPill=$('chat-menu-pill');
  if(chat&&chatTile){chatTile.hidden=chat.hidden;chatPill.hidden=chat.hidden||(chatDot?.hidden??true);chatPill.textContent=chatDot?.textContent??'';chatTile.setAttribute('aria-label',chat.getAttribute('aria-label')??'Open chat');}
  const chatWaiting=mobileLayout.matches&&Boolean(chatPill&&!chatPill.hidden);
  // A waiting event reward, a stall worth emptying (growth-ui.js) or something in the family also lights the More dot, since they
  // live in that menu on phones.
  $('more-dot').hidden=gift.hidden&&($('events-dot')?.hidden??true)&&!menu.querySelector('[data-menu-utility="stall"]')?.classList.contains('has-dot')&&!familyWaiting&&!chatWaiting;
  $('tasks-button').setAttribute('aria-label',quests.hidden?'Open quests':'Open quests, rewards ready');
  $('buildings-button').setAttribute('aria-label',batches.hidden?'Open buildings':`Open buildings, ${batches.textContent} batches ready`);
 }
 mobileLayout.addEventListener('change',resetView);
 // Primary navigation stays selected while its sheet is open, then returns to Farm.
 const sections={'tasks-dialog':'tasks-button','buildings-dialog':'buildings-button','building-dialog':'buildings-button','market-dialog':'market-button','more-dialog':'more-button','chat-dialog':''};
 const observer=new MutationObserver(()=>{
  const current=document.querySelector('dialog[open]'),active=current?(sections[current.id]??'more-button'):'farm-button';
  document.querySelectorAll('.side-tool').forEach(button=>{
   button.classList.toggle('active',button.id===active);
   if(button.id===active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
 });
 document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
 // The chat counts on its own (src/chat-ui.js, live messages): its tile and the More dot follow its button and its dot.
 const chatWatch=new MutationObserver(()=>{badges();if(menu.open)arrange();});
 for(const id of ['chat-button','chat-dot'])if($(id))chatWatch.observe($(id),{attributes:true,attributeFilter:['hidden','aria-label'],childList:true,characterData:true,subtree:true});
 return {refresh:badges};
}
