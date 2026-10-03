// Push notifications in our Android app (Oct 2026), through OneSignal's REST API: the same reminders and messages as the browser's push,
// for the farmers who turned them on in the app (supabase/app-push.sql, app_push_players). The app links each phone to its farmer
// (OneSignal.login with the player id), so a notification is addressed to player ids: include_aliases.external_id.
// No key (the secret ONESIGNAL_REST_API_KEY is not set yet): nothing is sent and nothing fails. Nothing here throws: a refused or failed
// call is logged and counts as not delivered, so the hourly job tries that reminder again next hour, as with a browser's push.
// Pure apart from fetch (passed in), so every request can be tested.
export const ONESIGNAL_APP_ID='1d8ca7c0-fca0-48a9-b55e-e87b85802fad';   // public: the app has it too
export const ONESIGNAL_URL='https://api.onesignal.com/notifications?c=push';
export const ONESIGNAL_BATCH=2000;    // farmers per call (OneSignal takes up to 20,000)
export const APP_PUSH_TTL=3600;       // as the browser's push: a reminder that could not arrive within the hour is not shown later
const SITE='https://www.harvesttycoon.com',HOSTS=Object.freeze(['www.harvesttycoon.com','harvesttycoon.com']);
// The app's notification categories in Android's settings (android-app AppPush.java; the ids are part of the contract, never rename them):
// messages = a private message, the Crew or a purchase notice; ready = crops & goods ready; daily = the daily gift, the streak and the
// comeback chest (rules.js picks ready or daily). Each request names one as existing_android_channel_id; without a known one OneSignal
// uses its own default category.
export const APP_PUSH_CHANNELS=Object.freeze(['messages','ready','daily']);

// Where tapping it goes, as a full address on our website (the app opens it in itself, never in a browser): the same path as the
// browser's push; anything not on harvesttycoon.com goes to the home page.
export function appLink(path,base=SITE){
 try{
  const root=HOSTS.includes(new URL(base).hostname)?base:SITE,url=new URL(String(path??'/'),root);
  return url.protocol==='https:'&&HOSTS.includes(url.hostname)?url.href:`${SITE}/`;
 }catch{return `${SITE}/`;}
}
// OneSignal's collapse_id (a newer notification replaces an older one with the same id, as the browser's tag does) is kept short.
export function collapseId(tag){
 const text=String(tag??'');if(text.length<=64)return text;
 let h=0x811c9dc5;for(const ch of text){h^=ch.codePointAt(0);h=Math.imul(h,0x01000193)>>>0;}
 return `${text.slice(0,55)}-${h.toString(36)}`;
}
// The same name always gives the same key (a name-based UUID, version 5, in the app's own namespace), so a call that is made again
// (the same farmers, the same reminder, the same hour) is sent once: OneSignal keeps idempotency keys for 30 days.
export async function idempotencyKey(name){
 const space=Uint8Array.from(ONESIGNAL_APP_ID.replace(/-/g,'').match(/../g),h=>parseInt(h,16));
 const text=new TextEncoder().encode(String(name)),bytes=new Uint8Array(space.length+text.length);bytes.set(space);bytes.set(text,space.length);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-1',bytes)).slice(0,16);
 hash[6]=(hash[6]&0x0f)|0x50;hash[8]=(hash[8]&0x3f)|0x80;
 const hex=[...hash].map(b=>b.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
// One request. The words are already in the farmers' own game language (texts.js; a call only holds farmers with the same words): they
// go in OneSignal's "en", the text a phone shows when no other language is given, so the phone's own language never replaces the
// language the farmer plays in. data.url is what the app opens on a tap; no url field, which would open a browser. channel: one of
// APP_PUSH_CHANNELS.
export function notificationRequest({ids,title,body,url,tag,key,channel},base=SITE){
 return {app_id:ONESIGNAL_APP_ID,target_channel:'push',include_aliases:{external_id:[...ids]},
  headings:{en:String(title??'Harvest Tycoon')},contents:{en:String(body??'')},data:{url:appLink(url,base)},
  ...(APP_PUSH_CHANNELS.includes(channel)?{existing_android_channel_id:channel}:{}),
  idempotency_key:key,ttl:APP_PUSH_TTL,...(tag?{collapse_id:collapseId(tag)}:{})};
}

export function createOneSignal({apiKey='',fetchImpl=globalThis.fetch,base=SITE,log=()=>{}}={}){
 const enabled=Boolean(apiKey)&&typeof fetchImpl==='function';
 // The farmers OneSignal took. A refusal, an error or "not subscribed" for all of them: none. Farmers it names as not reachable
 // (errors.invalid_aliases: signed out, or the app is gone): not them. The key itself is never logged.
 async function call(request){
  const ids=request.include_aliases.external_id;
  try{
   const response=await fetchImpl(ONESIGNAL_URL,{method:'POST',headers:{Authorization:`Key ${apiKey}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(request)});
   const data=await response.json().catch(()=>null);
   if(!response.ok){log(`app push refused: ${response.status} ${JSON.stringify(data?.errors??'').slice(0,200)}`);return [];}
   if(!data?.id){log(`app push reached nobody of ${ids.length}: ${JSON.stringify(data?.errors??'').slice(0,200)}`);return [];}
   const missed=new Set((Array.isArray(data.errors?.invalid_aliases?.external_id)?data.errors.invalid_aliases.external_id:[]).map(String));
   if(missed.size)log(`app push: ${missed.size} of ${ids.length} not reachable`);
   return ids.filter(id=>!missed.has(id));
  }catch(error){log(`app push failed: ${error?.message??error}`);return [];}
 }
 return {
  enabled,
  // One notification for many farmers, in calls of at most ONESIGNAL_BATCH. key: what makes it this notification (the reminder and
  // its hour, a message's id); each call's idempotency key adds its farmers. channel: the app's category (APP_PUSH_CHANNELS).
  // Returns the set of player ids OneSignal took.
  async send({ids,title,body,url,tag,key,channel}){
   const reached=new Set();if(!enabled)return reached;
   const unique=[...new Set((ids??[]).filter(id=>id!=null&&id!=='').map(String))].sort();
   for(let i=0;i<unique.length;i+=ONESIGNAL_BATCH){
    const part=unique.slice(i,i+ONESIGNAL_BATCH);
    const request=notificationRequest({ids:part,title,body,url,tag,channel,key:await idempotencyKey(`${key}|${part.join(',')}`)},base);
    for(const id of await call(request))reached.add(id);
   }
   return reached;
  }
 };
}

// The hourly reminders (job.js): farmers with the same words, link and category share calls. items: [{player, push}] with push as
// planPlayer made it ({title, body, tag, url, channel}: 'daily' or 'ready'). Returns the set of player ids OneSignal took.
export async function sendReminders(client,items,now=Date.now()){
 const reached=new Set();if(!client?.enabled)return reached;
 const groups=new Map(),hour=new Date(now).toISOString().slice(0,13);
 for(const {player,push} of items??[]){
  const group=JSON.stringify([push.title,push.body,push.url,push.tag,push.channel]);
  if(!groups.has(group))groups.set(group,{push,ids:[]});groups.get(group).ids.push(player);
 }
 for(const {push,ids} of groups.values()){
  const sent=await client.send({ids,title:push.title,body:push.body,url:push.url,tag:push.tag,channel:push.channel,key:`reminder|${hour}|${push.title}|${push.body}|${push.url}|${push.channel??''}`});
  for(const id of sent)reached.add(id);
 }
 return reached;
}
