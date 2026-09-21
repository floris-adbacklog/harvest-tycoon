// Events for Google Tag Manager (dataLayer). Only anonymous facts are ever pushed:
// never an email address, player name or account id.
export function pushEvent(name,params={},win=globalThis.window){
 if(!win)return;
 (win.dataLayer=win.dataLayer||[]).push({event:name,...params});
}

// Supabase answers an address that is already registered with a user that has no identities (and no
// error), so that sign-up forms cannot be used to find out who has an account. That is not a new
// registration and must not be counted as one.
export function isNewRegistration(data){
 const identities=data?.user?.identities;
 return !Array.isArray(identities)||identities.length>0;
}

export function deviceType(win=globalThis.window){
 const width=win?.innerWidth??0;
 return width&&width<768?'mobile':width&&width<1100?'tablet':'desktop';
}

// Funnel steps of the sign-in / sign-up card ("auth_view", "auth_submit", "auth_error", ...). Only a
// fixed set of short, lowercase parameters is ever sent, so an email address, player name or raw error
// message cannot end up in the dataLayer by accident.
const AUTH_PARAMS=['mode','field','reason','method','after_signup'];
export function trackAuth(step,params={},win=globalThis.window){
 const clean={device:deviceType(win)};
 for(const key of AUTH_PARAMS){
  const value=params[key];
  if(typeof value==='boolean'||(typeof value==='string'&&/^[a-z0-9_]{1,32}$/.test(value)))clean[key]=value;
 }
 pushEvent(`auth_${step}`,clean,win);
}

// "sign_up" is the recommended GA4 event name for a new account. With email confirmation switched
// on, the account exists but the player still has to confirm it, which the flag tells apart.
export function trackSignUp({confirmationRequired=false}={},win){
 pushEvent('sign_up',{method:'email',email_confirmation_required:!!confirmationRequired},win);
}

const COMMERCE_EVENTS=new Set(['diamond_shop_view','diamond_pack_started','diamond_pack_completed','diamond_action_completed','vip_purchase_started','vip_purchase_completed','vip_extended','vip_expired']);
const COMMERCE_VALUES={pack:new Set(['50','100','150','300','500','600','1000','1250','2000','3500','starter']),plan:new Set(['week','month']),action:new Set(['finish_crop','finish_batch','xp','coins','crops','production','upgrade','replace_order'])};
export function trackCommerce(event,params={},win=globalThis.window){
 if(!COMMERCE_EVENTS.has(event))return;
 const clean={device:deviceType(win)};
 for(const [key,values] of Object.entries(COMMERCE_VALUES))if(values.has(params[key]))clean[key]=params[key];
 for(const key of ['cost','diamonds'])if(Number.isSafeInteger(params[key])&&params[key]>=0&&params[key]<=10000)clean[key]=params[key];
 pushEvent(event,clean,win);
}
