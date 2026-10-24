// The phone's event rail (18 Oct 2026, the window shell; the owner's question b, answered yes the same day): a short column of HUD buttons
// at the right-hand edge of the farm, under the top bar, for what is on for a while. The Special offer's tile (src/offer-ui.js makes it)
// is there while the offer runs; Today, Events and the Halloween Pass are there as round buttons only while something waits for the farmer
// there, by the same signal as their own badge: #today-dot (today's gift, a challenge to claim or an order to deliver, retention-ui.js),
// #events-dot (a reward to collect or a running event you have not joined or opened yet, live-events-ui.js) and #pass-dot (a reward to claim, pass-ui.js).
// All three stay in More as well. On a phone (mobileLayout) the buttons themselves move into #event-rail, on a computer back to where they
// were (nothing changes there), so every selector and handler that knows them keeps working. Nothing here ever throws.
// One button for them all (23 Oct 2026, the owner: the farm too busy, "Doe 2"): while two or more show in the rail, the rail is one round
// button instead, with the first one's picture, a second disc under it and how many there are; it opens a short list of them, each with
// its picture and name, and a tap there opens that one through its own button. One alone shows as before; a computer has no rail.
import {mobileLayout} from './mobile-ui.js';
export const RAIL_IDS=Object.freeze(['offer-button','today-button','events-button','pass-button','season-button']);
// The buttons that show in the rail only while their badge shows (a button the page hides itself, Events before its level or the pass
// out of season, stays hidden).
export const WAIT_DOTS=Object.freeze({'today-button':'today-dot','events-button':'events-dot','pass-button':'pass-dot','season-button':'season-dot'});
const homes=new Map();
// is-waiting on a button while its badge shows (hud.css shows it in the rail only then).
export function markWaiting(doc=globalThis.document){
 try{
  for(const [id,dot] of Object.entries(WAIT_DOTS)){
   const button=doc.getElementById(id),badge=doc.getElementById(dot);
   if(button)button.classList.toggle('is-waiting',Boolean(badge&&!badge.hidden));
  }
 }catch{}
}
// The rail's buttons that show (in the rail's order): the offer's tile while it runs, the others while they wait and the page shows them.
// A calm start (beginner-ui.js, beginner.css) shows only Today in the rail, from its step: no one button for the rest.
export function railShown(doc=globalThis.document){
 try{
  const calm=Boolean(doc.documentElement?.classList?.contains('calm-start'));
  return RAIL_IDS.map(id=>doc.getElementById(id)).filter(b=>b&&!b.hidden&&(b.id==='offer-button'||b.classList.contains('is-waiting'))&&(!calm||b.id==='today-button'));
 }catch{return [];}
}
const picture=button=>button.querySelector('img,.game-art,svg')?.cloneNode(true)??null;
// A button's name as the farmer reads it: its own words (Today, Events, the offer's name), or its title (the passes).
// (Children read one by one, not with a :has selector: the older web views of compat.js would throw on that.)
// A plain span with words: not a badge (#pass-dot …, with an id) and not a picture (.game-art).
const nameOf=button=>{const own=[...button.children].find(c=>c.tagName==='B'||c.tagName==='SPAN'&&!c.children.length&&!c.id&&!c.classList.contains('game-art'));return (own?.textContent||button.getAttribute('title')||button.getAttribute('aria-label')||'').trim();};
let stackButton=null,stackPanel=null,stackKey='';
function closeStack(){
 if(stackPanel&&!stackPanel.hidden)stackPanel.hidden=true;
 if(stackButton&&stackButton.getAttribute('aria-expanded')!=='false')stackButton.setAttribute('aria-expanded','false');
}
function drawRows(shown){
 stackPanel.replaceChildren(...shown.map(button=>{
  const row=document.createElement('button');row.type='button';row.dataset.for=button.id;
  const art=picture(button),name=document.createElement('span');name.textContent=nameOf(button);
  if(art)row.append(art);row.append(name);
  row.addEventListener('click',()=>{closeStack();button.click();});
  return row;
 }));
}
function makeStack(rail){
 stackButton=document.createElement('button');stackButton.type='button';stackButton.id='rail-stack';stackButton.hidden=true;
 stackButton.setAttribute('aria-haspopup','true');stackButton.setAttribute('aria-expanded','false');stackButton.setAttribute('aria-controls','rail-panel');
 stackPanel=document.createElement('div');stackPanel.id='rail-panel';stackPanel.hidden=true;
 stackButton.addEventListener('click',()=>{
  const open=stackPanel.hidden;
  if(open)drawRows(railShown());
  stackPanel.hidden=!open;stackButton.setAttribute('aria-expanded',String(open));
 });
 // A tap anywhere else, or Escape, closes the list (the tap still does what it does there).
 document.addEventListener('pointerdown',e=>{if(!stackPanel.hidden&&!stackPanel.contains(e.target)&&!stackButton.contains(e.target))closeStack();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeStack();});
 rail.prepend(stackButton,stackPanel);
}
export function stackRail(){
 try{
  const rail=document.getElementById('event-rail');if(!rail)return;
  const shown=mobileLayout.matches?railShown():[],on=shown.length>=2;
  if(!stackButton){if(!on)return;makeStack(rail);}
  if(rail.classList.contains('is-stacked')!==on)rail.classList.toggle('is-stacked',on);
  if(stackButton.hidden!==!on)stackButton.hidden=!on;
  if(!on){closeStack();stackKey='';return;}
  const key=shown.map(b=>b.id).join(',');
  if(key!==stackKey){
   stackKey=key;
   const art=picture(shown[0]),count=document.createElement('em');count.textContent=String(shown.length);
   stackButton.replaceChildren(...(art?[art]:[]),count);
   stackButton.setAttribute('aria-label',shown.map(nameOf).filter(Boolean).join(', '));
   if(!stackPanel.hidden)drawRows(shown);
  }
 }catch{}
}
function place(){
 try{
  const rail=document.getElementById('event-rail');if(!rail)return;
  for(const id of RAIL_IDS){
   const node=document.getElementById(id);if(!node)continue;
   if(mobileLayout.matches){
    if(node.parentElement===rail)continue;
    if(!homes.has(id))homes.set(id,{parent:node.parentElement,next:node.nextSibling});
    rail.append(node);
   }else if(node.parentElement===rail){
    const home=homes.get(id);
    if(home?.parent?.isConnected)home.parent.insertBefore(node,home.next?.parentNode===home.parent?home.next:null);else document.body.append(node);
   }
  }
 }catch{}
}
export function startEventRail(){
 place();markWaiting();stackRail();
 try{mobileLayout.addEventListener('change',()=>{place();stackRail();});}catch{}
 // The calm start beginning or ending (<html>'s class) changes what the rail may show.
 try{if(typeof MutationObserver==='function')new MutationObserver(()=>stackRail()).observe(document.documentElement,{attributes:true,attributeFilter:['class']});}catch{}
 try{
  if(typeof MutationObserver==='function'){
   // The offer's tile is made by the cloud script, after the farm page: it is placed as soon as it is there.
   const watch=new MutationObserver(()=>{if(!mobileLayout.matches||RAIL_IDS.every(id=>{const n=document.getElementById(id);return !n||n.parentElement?.id==='event-rail';}))return;place();});
   watch.observe(document.body,{childList:true});
   // A badge that shows or hides takes its button into the rail or out of it.
   const badges=new MutationObserver(()=>{markWaiting();stackRail();});
   for(const dot of Object.values(WAIT_DOTS)){const el=document.getElementById(dot);if(el)badges.observe(el,{attributes:true,attributeFilter:['hidden']});}
   // A button that comes into the rail, or shows or hides there (the offer's tile, a pass in or out of season): the one button follows.
   const rail=document.getElementById('event-rail');
   if(rail)new MutationObserver(records=>{if(records.some(r=>r.target!==rail&&r.target!==stackButton&&!stackButton?.contains(r.target)&&!stackPanel?.contains(r.target)||r.type==='childList'&&r.target===rail))stackRail();}).observe(rail,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
  }
 }catch{}
}
if(typeof document!=='undefined'&&document.body)startEventRail();
