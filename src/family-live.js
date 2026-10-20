// The family cards in the chat, live (20 Oct 2026, the owner: "als je iemand verwijdert moet dit wel realtime updaten 10 / 10 boeren",
// and "ook na bericht plaatsen"): a shared family's card shows what the family is now, not what it was when it was shared. Every card
// on screen goes in one request to farm-api (family_cards, family-service.js handleFamilyCards, at most FAMILY_CARDS_MAX ids), which
// answers what each family is now (or that it is gone) and the farmer's own family, for Join or View. Edge Function calls cost money,
// so it asks only while the chat is open on Global with a card in it and the tab is in view (src/chat-ui.js decides that), and:
// - when the chat opens or Global is chosen again, or a new card or a card not seen yet comes in: at most every FAMILY_LIVE_SOON;
// - while the chat stays open: once a minute (FAMILY_LIVE_EVERY);
// - after a join, leave or removal in the farmer's own family, which the game knows (changed()): at once.
// What the card was shared with (its meta) stays until the first answer, and whenever there is none: a farm-api from before
// family_cards answers "Unknown request." (400), and then it waits FAMILY_LIVE_OLD_API before asking again; any other failure a minute.
import {FAMILY_CARDS_MAX} from '../public/farm-state.js';

export const FAMILY_LIVE_EVERY=60000,FAMILY_LIVE_SOON=10000,FAMILY_LIVE_OLD_API=600000;
// The families of the cards on screen, newest first, each once, at most FAMILY_CARDS_MAX: a card hidden because its sharer is blocked
// is not on screen.
export function familyCardIds(messages,blocked=new Set()){
 const ids=[];
 for(const m of messages??[]){
  if(m?.kind!=='family_share'||blocked.has(m.sender))continue;
  const id=String(m.meta?.family??'');if(id&&!ids.includes(id))ids.push(id);
  if(ids.length>=FAMILY_CARDS_MAX)break;
 }
 return ids;
}
// request(ids): farm-api's answer ({familyCards:{cards,viewer}}). onChange: something on the cards changed, so draw them again.
export function createFamilyLive({request,clock=()=>Date.now(),onChange=()=>{}}){
 const cards=new Map();let viewer=null,at=0,pause=0,busy=false,again=null;
 // reason: 'open' (the chat opened, Global again, a new card), 'tick' (the minute), 'changed' (the farmer's own family changed).
 async function refresh(list,{reason='tick'}={}){
  const ids=[...new Set((list??[]).map(String).filter(Boolean))].slice(0,FAMILY_CARDS_MAX);if(!ids.length)return false;
  if(busy){if(reason==='changed')again=ids;return false;}
  const now=clock();if(reason!=='changed'&&now<pause)return false;
  const wait=reason==='changed'?0:reason==='open'||ids.some(id=>!cards.has(id))?FAMILY_LIVE_SOON:FAMILY_LIVE_EVERY;
  if(now-at<wait)return false;
  busy=true;at=now;
  try{
   const answer=(await request(ids))?.familyCards;
   if(!answer||!Array.isArray(answer.cards))return false;
   let changed=false;
   for(const card of answer.cards){
    const id=String(card?.family??'');if(!id)continue;
    if(JSON.stringify(cards.get(id))!==JSON.stringify(card)){cards.set(id,card);changed=true;}
   }
   if(answer.viewer&&JSON.stringify(viewer)!==JSON.stringify(answer.viewer)){viewer=answer.viewer;changed=true;}
   if(changed)onChange();
   return true;
  }catch(error){pause=clock()+(error?.status===400?FAMILY_LIVE_OLD_API:FAMILY_LIVE_EVERY);return false;}
  finally{busy=false;if(again){const next=again;again=null;void refresh(next,{reason:'changed'});}}
 }
 return {
  refresh,
  // A join, leave or removal the farmer did themselves: who they are to the families is unknown until the next answer, which may come
  // at once.
  changed(){viewer=null;at=0;pause=0;},
  card:id=>cards.get(String(id??''))??null,
  get viewer(){return viewer;}
 };
}
