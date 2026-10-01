// The partner programme (supabase/partners.sql, 1 Oct 2026), apart from Invite a friend: ?ref=CODE is remembered on this device for
// 30 days (not when this browser already played: then it is not a new farmer's first visit), goes along with the sign-up and with
// the first farm load (for Google and Facebook sign-in), and leaves the address bar at once. The server links only a brand-new farm.
export const REF_KEY='harvest-tycoon:partner-ref',REF_KEEP=30*86400000;
const REF_CODE=/^[A-Z0-9]{4,12}$/;
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
