// Kongregate's server API (docs.kongregate.com/reference/server-api-*), only ever called from our server with the game's secret API key
// (Supabase secret KONGREGATE_API_KEY), never from the game. One file for both Edge Functions that talk to Kongregate, copied into each by
// scripts/sync-game.mjs (15 Oct 2026): kongregate-auth checks a player's sign-in with it (Oct 2026), diamond-checkout checks a Kreds
// purchase with it (kong_claim, 15 Oct 2026). Every call goes through `fetchImpl` passed in, so tests run all of it. No imports: Deno and
// Node alike.
// Kongregate answers a problem as HTTP 200 with {success:false, error, error_description} (seen live with a dummy key, 15 Oct 2026), or as
// the status itself: success is always checked. A no (a wrong token, key or id) throws KongregateRefused; Kongregate unreachable, a server
// error or too many requests throws an error with transient=true ("try again"). At most 5 seconds a call.
export const API='https://api.kongregate.com/api';
export const AUTH_URL=`${API}/authenticate.json`;
export const USER_ITEMS_URL=`${API}/user_items.json`;
export const USE_ITEM_URL=`${API}/use_item.json`;
export const ITEMS_URL=`${API}/items.json`;
// The same words as kongregate-auth's MESSAGES.token (the game translates them).
export const REFUSED_TEXT='Your Kongregate sign-in could not be checked. Please reload the game.';

// Kongregate's user id: a whole number above 0, as their API gives it (int32), sent as a number or as digits. 0 is a guest, who gets
// no account (the game shows a guest the Register page and never asks).
export function kongId(value){
 const text=typeof value==='number'&&Number.isSafeInteger(value)?String(value):typeof value==='string'?value.trim():'';
 return /^[1-9]\d{0,9}$/.test(text)&&Number(text)<=2147483647?text:null;
}
// The game auth token as Kongregate hands it to the game: visible characters, no spaces. Never stored or logged.
export const kongToken=value=>typeof value==='string'&&/^[\x21-\x7e]{1,256}$/.test(value)?value:null;
// An item instance's id (the one bought, not the item's own id): a whole number above 0.
export const kongItemId=value=>Number.isSafeInteger(value)&&value>0?value:typeof value==='string'&&/^[1-9]\d{0,14}$/.test(value)?Number(value):null;

// Kongregate said no: a wrong or old token, or a user id that is not the token's own (someone changed the id in the address).
export class KongregateRefused extends Error{constructor(reason){super(REFUSED_TEXT);this.reason=reason;}}

async function ask(url,init,{fetchImpl,timeoutMs}){
 let response;
 try{response=await fetchImpl(url,{...init,headers:{Accept:'application/json',...init.headers},signal:AbortSignal.timeout(timeoutMs)});}
 catch{throw Object.assign(new Error('Kongregate could not be reached.'),{transient:true});}
 let data=null;try{data=await response.json();}catch{}
 return {status:response.status,data:data&&typeof data==='object'&&!Array.isArray(data)?data:null};
}
const ok=({status,data})=>status>=200&&status<300&&data?.success===true;
// A no or "try again", from an answer that is not a yes.
function failure({status,data},reason){
 const code=data?.success===false?Number(data.error)||status:status;
 const refused=code>=400&&code<500&&code!==408&&code!==429;
 if(refused||(data?.success===false&&!(code>=500)))return new KongregateRefused(reason??(code===403||code===401?'credentials':`status ${code}`));
 return Object.assign(new Error(`Kongregate answered ${status}`),{transient:true});
}

// Asks Kongregate whose token this is. The docs disagree in two places, so both ways are understood:
// - the request: the reference defines user_id, game_auth_token and api_key as query parameters (asked that way); its examples send
//   them as a JSON body instead, so an answer that says they are missing ("required parameters") is asked once more with a body;
// - the answer: a refusal comes as {success:false, error:403} with status 200, or as the status itself (403, 401, 400).
// Gives {userId, username} (Kongregate's, never the game's), throws KongregateRefused for a no and an error with transient=true when
// Kongregate cannot be reached or answers with something else (a server error, too many requests). At most 5 seconds a call.
export async function verifyKongregate({userId,token,apiKey,fetchImpl=globalThis.fetch,timeoutMs=5000}){
 const how={fetchImpl,timeoutMs};
 const missing=answer=>answer.data?.success===false&&(Number(answer.data.error)||answer.status)===400&&/required/i.test(String(answer.data.error_description??''));
 let answer=await ask(`${AUTH_URL}?${new URLSearchParams({user_id:userId,game_auth_token:token,api_key:apiKey})}`,{method:'GET'},how);
 if(missing(answer))answer=await ask(AUTH_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:Number(userId),game_auth_token:token,api_key:apiKey})},how);
 if(ok(answer)){
  if(String(answer.data.user_id??'')!==userId)throw new KongregateRefused('user');
  return {userId,username:typeof answer.data.username==='string'?answer.data.username:''};
 }
 throw failure(answer,missing(answer)?'request':undefined);
}

// What a Kongregate user owns of this game's items (user_items.json): only instances with uses left (or unlimited ones), each
// {id (the instance), identifier, data (what the game attached at purchase, or null), remaining (null: unlimited)}. Kongregate's docs:
// ask after every purchase and at every start, so nothing paid for is ever left uncredited.
export async function kongUserItems({userId,apiKey,fetchImpl=globalThis.fetch,timeoutMs=5000}){
 const answer=await ask(`${USER_ITEMS_URL}?${new URLSearchParams({api_key:apiKey,user_id:userId})}`,{method:'GET'},{fetchImpl,timeoutMs});
 if(!ok(answer)||!Array.isArray(answer.data.items))throw failure(answer);
 return answer.data.items.filter(item=>item&&typeof item==='object'&&kongItemId(item.id)&&typeof item.identifier==='string')
  .map(item=>({id:kongItemId(item.id),identifier:item.identifier,data:typeof item.data==='string'?item.data:null,remaining:Number.isSafeInteger(item.remaining_uses)?item.remaining_uses:null}));
}

// Uses one item instance up at Kongregate (use_item.json), once the farm has what it gave: a POST with a JSON body, as the reference
// defines it (Kongregate answered GET, a form and JSON alike in a live check, 15 Oct 2026). Gives the usage record's id (Kongregate's
// proof, under Item Usage Records), or null when it gave none.
export async function kongUseItem({userId,token,apiKey,id,fetchImpl=globalThis.fetch,timeoutMs=5000}){
 const answer=await ask(USE_ITEM_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:apiKey,user_id:Number(userId),game_auth_token:token,id:Number(id)})},{fetchImpl,timeoutMs});
 if(!ok(answer))throw failure(answer);
 return {usage:kongItemId(answer.data.usage_record_id)};
}

// The prices the owner set in Kongregate's Manage Items (items.json), {identifier: Kreds}: only kept beside a purchase, for the books.
export async function kongItemPrices({apiKey,fetchImpl=globalThis.fetch,timeoutMs=5000}){
 const answer=await ask(`${ITEMS_URL}?${new URLSearchParams({api_key:apiKey})}`,{method:'GET'},{fetchImpl,timeoutMs});
 if(!ok(answer)||!Array.isArray(answer.data.items))throw failure(answer);
 return Object.fromEntries(answer.data.items.filter(item=>typeof item?.identifier==='string'&&Number.isSafeInteger(item.price)).map(item=>[item.identifier,item.price]));
}
