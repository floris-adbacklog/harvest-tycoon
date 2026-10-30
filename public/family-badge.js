import {emblemMarkup} from './family-emblem-art.js';
import {art} from './visual-icons.js';
// The family badge beside a farmer's name outside the chat (29 Oct 2026, the owner: "Zet de family badge ook bij leaderboard en
// andere waar profielnaam en vip badge en admin/moderator badge etc voorkomt"): the leaderboard and the event standings. The family's
// emblem, its name on hover; a tap opens its profile (public/family-profile.js), not the farmer's. Read with the chat's
// chat_families (supabase/chat-families.sql, src/chat-client.js families: at most 100 farmers a call), kept for a minute per farmer.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const known=new Map(),askedAt=new Map(),FRESH_MS=60000;
const chatFamilies=()=>{try{return globalThis.parent?.harvestBridge?.chat?.families??null;}catch{return null;}};
// Reads the families of these farmers (those not read in the last minute). True when a badge changed, so the list draws again.
export async function loadFamilies(ids,{lookup=chatFamilies(),now=Date.now()}={}){
 const wanted=[...new Set(ids)].filter(id=>id&&!(askedAt.has(id)&&now-askedAt.get(id)<FRESH_MS));if(!wanted.length||!lookup)return false;
 for(const id of wanted)askedAt.set(id,now);
 let changed=false;
 for(let i=0;i<wanted.length;i+=100){
  let found;try{found=await lookup(wanted.slice(i,i+100));}catch{found=null;}
  if(!found){for(const id of wanted.slice(i))askedAt.delete(id);return changed;}   // before the SQL ran, or a failed read: no badge, ask again later
  for(const [id,f] of found){if(JSON.stringify(known.get(id)??null)!==JSON.stringify(f??null))changed=true;known.set(id,f??null);}
 }
 return changed;
}
// The badge for a farmer whose family is known, else nothing. Inside the row's own button (the name opens the farmer's profile), so it
// is a span; the click below opens the family instead.
export function familyBadge(playerId){
 const f=known.get(playerId);if(!f)return '';
 return `<span class="name-family" data-family-view="${esc(f.id)}" translate="no" title="${esc(f.name)}" role="img" aria-label="${esc(f.name)}">${emblemMarkup(f.emblem)}</span>`;
}
// One tap rule for every badge: caught before the row's own button, it opens the family's profile.
if(typeof document!=='undefined')document.addEventListener('click',event=>{
 const badge=event.target?.closest?.('.name-family[data-family-view]');if(!badge)return;
 event.preventDefault();event.stopPropagation();globalThis.harvestFamilyProfile?.open(badge.dataset.familyView);
},true);
