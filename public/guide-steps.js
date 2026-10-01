import {productionJobs} from './farm-state.js';
import {onScreen} from './coach.js';
// What "Show me" points at for each beginner step (public/coach.js draws it). Every way in is the one a farmer uses themselves:
// the bottom bar on a phone (Farm, Buildings, Market, Quests, More) and the side buttons on a computer; Today and the chores sit in
// More on a phone. A building or a chore spot on the map is pointed at on the map when it is on the screen.
export function guideSteps(target,{state,now,doc=globalThis.document,win=globalThis}){
 const $=sel=>doc.querySelector(sel),shown=sel=>{const el=$(sel);return el&&onScreen(el,win)?el:null;};
 // The first one that can be seen (a phone and a computer show different Sell all buttons).
 const inDialog=(id,sel)=>[...doc.querySelectorAll(`#${id}[open] ${sel}`)].find(el=>onScreen(el,win)||el.getClientRects().length>0&&getComputedStyle(el).display!=='none'&&!el.closest('[hidden]'))??null;
 // A tab in a window: passed straight on once the button it leads to is already there.
 const tab=(dialog,tabSel,next,text)=>({find:()=>{if(!doc.querySelector(`#${dialog}[open]`))return null;if(inDialog(dialog,next))return {skip:true};const el=inDialog(dialog,tabSel);return el&&{el,text};}});
 // Through the More menu on a phone, or straight to the button where there is one.
 const via=(buttonId,text,tile,tileText)=>shown(`#${buttonId}`)?[{find:()=>shown(`#${buttonId}`),text}]
  :[{find:()=>shown('#more-button'),text:'Tap More.'},{find:()=>inDialog('more-dialog',tile),text:tileText}];
 // A building: on the map when its label is on the screen, otherwise Buildings and its card in the list.
 const building=(key,mapText,listText)=>shown(`.building-label[data-building="${key}"]`)?[{find:()=>shown(`.building-label[data-building="${key}"]`),text:mapText}]
  :[{find:()=>shown('#buildings-button'),text:'Tap Buildings.'},{find:()=>doc.querySelector(`dialog[open] .building-card[data-open-building="${key}"]`),text:listText}];
 const sell=(tabKey,item,text,tabText)=>[{find:()=>shown('#market-button'),text:'Tap Market to open it.'},
  tab('market-dialog',`[data-market-tab="${tabKey}"]`,`[data-sell-item-all="${item}"]`,tabText),
  {find:()=>inDialog('market-dialog',`[data-sell-item-all="${item}"]`),text}];
 if(target==='market')return sell('crops','corn','Sell your corn here.','Open Crops.');
 if(target==='eggs'&&(state.inventory.eggs??0)>0)return sell('goods','eggs','Sell your eggs here.','Open Farm goods.');
 const ready=Object.keys(state.buildings).find(k=>productionJobs(state.buildings[k]).some(j=>j.readyAt<=now));
 if(target==='collect'||target==='eggs'&&ready==='coop'){
  const key=ready??Object.keys(state.buildings).find(k=>state.buildings[k].job)??'coop';
  return [...building(key,'Tap this building.','Open this building.'),{find:()=>doc.querySelector('dialog[open] [data-collect-job]')??doc.querySelector('dialog[open] #collect-all-batches'),text:'Collect your batch here.'}];
 }
 if(target==='produce'||target==='eggs')return [...building('coop','Tap the Chicken Coop.','Open the Chicken Coop.'),{find:()=>doc.querySelector('dialog[open] .start-recipe[data-recipe="eggs"]'),text:'Start a batch here.'}];
 if(target==='today')return [...via('today-button','Tap Today for your daily gift.','[data-menu-action="today-button"]','Tap Daily rewards.'),{find:()=>doc.querySelector('dialog[open] #checkin-gift'),text:'Collect your gift here.'}];
 if(target==='chores'){
  const label='.utility-label[data-utility="chores"]:not(.locked)',tile='[data-menu-utility="chores"]:not(.locked):not(:disabled)';
  const spot=shown(label)?[{find:()=>shown(label),text:'Tap the shovel for Farm chores.'}]
   :shown('#more-button')?[{find:()=>shown('#more-button'),text:'Tap More.'},{find:()=>inDialog('more-dialog',tile),text:'Tap Farm chores.'}]:null;
  return spot&&[...spot,{find:()=>doc.querySelector('dialog[open] [data-chore]:not(:disabled)'),text:'Start a chore here.'}];
 }
 return null;
}
