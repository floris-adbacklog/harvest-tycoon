// The partner programme (supabase/partners.sql, 1 Oct 2026), apart from Invite a friend: ?ref=CODE is remembered on this device for
// 30 days (not when this browser already played: then it is not a new farmer's first visit), goes along with the sign-up and with
// the first farm load (for Google and Facebook sign-in), and leaves the address bar at once. The server links only a brand-new farm.
export const REF_KEY='harvest-tycoon:partner-ref',REF_KEEP=30*86400000;
// 4 to 20 (24 Oct 2026): a partner's alias puts their name in the link (?ref=WARRIOROFLIGHT777, supabase/partner-signup-bonus.sql).
const REF_CODE=/^[A-Z0-9]{4,20}$/;
export function takeRefFromUrl({location,history,storage,known}){
 if(!location?.href)return null;
 const url=new URL(location.href),raw=url.searchParams.get('ref');if(raw===null)return null;
 url.searchParams.delete('ref');try{history.replaceState(history.state,'',url.pathname+url.search+url.hash);}catch{}
 const code=raw.trim().toUpperCase();if(!REF_CODE.test(code)||known)return null;
 try{storage.setItem(REF_KEY,JSON.stringify({code,at:Date.now()}));}catch{}
 return code;
}
export function pendingRef(storage,now=Date.now()){
 try{const saved=JSON.parse(storage.getItem(REF_KEY)??'null');return saved&&REF_CODE.test(saved.code)&&now-saved.at<REF_KEEP?saved.code:null;}catch{return null;}
}
export function clearRef(storage){try{storage.removeItem(REF_KEY);}catch{}}
// The partner behind a link, for the sign-up card (player-counts ?ref=CODE): {label, diamonds} or null. Only a partner the admin gave a
// label shows; the diamonds are what a new farm gets on top (0: none).
export async function partnerWelcome(functionsUrl,code,fetchImpl=globalThis.fetch){
 if(!functionsUrl||!code||typeof fetchImpl!=='function')return null;
 try{const response=await fetchImpl(`${functionsUrl}/player-counts?ref=${encodeURIComponent(code)}`);if(!response.ok)return null;const p=(await response.json())?.partner;
  return p&&typeof p.label==='string'&&p.label?{label:p.label,diamonds:Number.isInteger(p.diamonds)&&p.diamonds>0?p.diamonds:0}:null;}catch{return null;}
}
export function partnerBannerText({label,diamonds}){return {title:`You're joining via ${label}`,body:diamonds?`Sign up and your farm starts with ${diamonds} extra diamonds.`:`Sign up and start your own farm.`};}
