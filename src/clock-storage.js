// A device whose clock is wrong (31 Oct 2026, a farmer on an Android 10 phone: "the game keeps asking me to sign in again"). supabase-js
// keeps the sign-in's end (expires_at) in the server's time and compares it with this device's clock. A clock some hours ahead takes every
// fresh sign-in as already over: it renewed it every 3 seconds (1,636 times in 2 hours), one renewal that failed on a weak connection
// threw the sign-in away, the next farm request went without it and farm-api answered 401: "Your session has ended". A clock behind keeps
// a sign-in the server has already ended.
// This storage sits between supabase-js and localStorage. Each new sign-in says when the server made it (iat): the device's clock minus
// that is how far it is off, plus the trip, so the smallest of the last few is kept. On reading, expires_at is the sign-in's real end (exp)
// moved by that much, in this device's time; on writing, it is the real end. A clock off by less than CLOCK_SLACK changes nothing.
export const CLOCK_KEY='harvest-tycoon:clock';
export const CLOCK_SLACK=60000;
const KEEP=5;
const claimsOf=token=>{
 try{const part=String(token).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')))??{};}
 catch{return {};}
};
const parse=raw=>{try{return raw==null?null:JSON.parse(raw);}catch{return null;}};
const signIn=value=>value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.access_token==='string'?value:null;
// How far this device's clock is ahead of the server's, in ms (behind: below 0); 0 while it is within CLOCK_SLACK or not yet known.
export function clockOffset(store=globalThis.localStorage){
 let seen;try{seen=parse(store?.getItem(CLOCK_KEY));}catch{seen=null;}
 const offs=Array.isArray(seen)?seen.filter(Number.isFinite):[];
 if(!offs.length)return 0;
 const off=Math.min(...offs);
 return Math.abs(off)<CLOCK_SLACK?0:off;
}
export function clockStorage(store=globalThis.localStorage,now=()=>Date.now()){
 const note=off=>{
  try{const seen=parse(store.getItem(CLOCK_KEY));store.setItem(CLOCK_KEY,JSON.stringify([...(Array.isArray(seen)?seen.filter(Number.isFinite):[]),off].slice(-KEEP)));}catch{}
 };
 return {
  getItem(key){
   const raw=store.getItem(key),value=signIn(parse(raw));
   const exp=value&&Number(claimsOf(value.access_token).exp);
   if(!Number.isFinite(exp))return raw;
   return JSON.stringify({...value,expires_at:exp+Math.round(clockOffset(store)/1000)});
  },
  setItem(key,raw){
   const value=signIn(parse(raw));
   if(!value){store.setItem(key,raw);return;}
   const {exp,iat}=claimsOf(value.access_token);
   if(Number.isFinite(iat)&&signIn(parse(store.getItem(key)))?.access_token!==value.access_token)note(now()-iat*1000);
   store.setItem(key,Number.isFinite(exp)?JSON.stringify({...value,expires_at:exp}):raw);
  },
  removeItem(key){store.removeItem(key);},
 };
}
