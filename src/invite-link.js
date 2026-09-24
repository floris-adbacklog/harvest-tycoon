// Invite a friend on the sign-in page. ?invite=CODE is remembered on this device for 30 days (not when this browser already
// played: then it is not a new farmer's first visit), goes along with the sign-up (so a confirmation link opened on another
// device still counts) and with the first farm load (for Google and Facebook sign-in), and leaves the address bar at once.
// The server decides whether it counts: only for a brand-new farm, and never for your own code.
export const INVITE_KEY='harvest-tycoon:invite',INVITE_KEEP=30*86400000;
const CODE=/^[A-Z0-9]{4,12}$/;
export function takeInviteFromUrl({location,history,storage,known}){
 if(!location?.href)return null;
 const url=new URL(location.href),raw=url.searchParams.get('invite');if(raw===null)return null;
 url.searchParams.delete('invite');try{history.replaceState(history.state,'',url.pathname+url.search+url.hash);}catch{}
 const code=raw.trim().toUpperCase();if(!CODE.test(code)||known)return null;
 try{storage.setItem(INVITE_KEY,JSON.stringify({code,at:Date.now()}));}catch{}
 return code;
}
export function pendingInvite(storage,now=Date.now()){
 try{const saved=JSON.parse(storage.getItem(INVITE_KEY)??'null');return saved&&CODE.test(saved.code)&&now-saved.at<INVITE_KEEP?saved.code:null;}catch{return null;}
}
export function clearInvite(storage){try{storage.removeItem(INVITE_KEY);}catch{}}
// The player name behind a code, from the public player-counts function (null when unknown or unreachable).
export async function inviterName(functionsUrl,code,fetchImpl=globalThis.fetch){
 if(!functionsUrl||!code||typeof fetchImpl!=='function')return null;
 try{const response=await fetchImpl(`${functionsUrl}/player-counts?invite=${encodeURIComponent(code)}`);if(!response.ok)return null;const data=await response.json();return typeof data?.inviter==='string'?data.inviter:null;}catch{return null;}
}
// "Tony invited you" on the sign-up card, with what it brings and that Tony sees your player name and level.
export function inviteBannerText(name,reward=150,level=10){return {title:`${name} invited you to Harvest Tycoon`,body:`Reach level ${level} and you both get ${reward} diamonds. ${name} will see your player name and level.`};}
