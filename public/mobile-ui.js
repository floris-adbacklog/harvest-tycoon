import {refreshArt} from './visual-icons.js';
export const mobileLayout=matchMedia('(max-width: 900px), (max-height: 550px) and (pointer: coarse)');

export function createMobileUI({openUtility,resetView}){
 const $=id=>document.getElementById(id),menu=$('more-dialog');
 $('more-button').onclick=()=>{
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  menu.showModal();menu.scrollTop=0;refreshArt();
 };
 menu.querySelectorAll('[data-menu-action]').forEach(button=>button.onclick=()=>{
  const action=button.dataset.menuAction;
  menu.close();$(action)?.click();
 });
 menu.querySelectorAll('[data-menu-utility]').forEach(button=>button.onclick=()=>{menu.close();openUtility(button.dataset.menuUtility);});
 function badges(){
  const gift=$('today-dot'),quests=$('task-dot'),batches=$('production-count');
  // A waiting event reward also lights the More dot, since Events lives in that menu on phones.
  $('more-dot').hidden=gift.hidden&&($('events-dot')?.hidden??true);
  $('tasks-button').setAttribute('aria-label',quests.hidden?'Open quests':'Open quests, rewards ready');
  $('buildings-button').setAttribute('aria-label',batches.hidden?'Open buildings':`Open buildings, ${batches.textContent} batches ready`);
 }
 mobileLayout.addEventListener('change',resetView);
 // Primary navigation stays selected while its sheet is open, then returns to Farm.
 const sections={'tasks-dialog':'tasks-button','buildings-dialog':'buildings-button','building-dialog':'buildings-button','market-dialog':'market-button','more-dialog':'more-button'};
 const observer=new MutationObserver(()=>{
  const current=document.querySelector('dialog[open]'),active=current?(sections[current.id]??'more-button'):'farm-button';
  document.querySelectorAll('.side-tool').forEach(button=>{
   button.classList.toggle('active',button.id===active);
   if(button.id===active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
 });
 document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
 return {refresh:badges};
}
