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
const COMMERCE_VALUES={pack:new Set(['50','100','150','300','500','600','1000','1250','2000','3500','starter','offer']),plan:new Set(['week','month']),length:new Set(['30m','1h','1d']),action:new Set(['finish_crop','finish_batch','xp','harvest','coins','crops','production','upgrade','replace_order'])};
export function trackCommerce(event,params={},win=globalThis.window){
 if(!COMMERCE_EVENTS.has(event))return;
 const clean={device:deviceType(win)};
 for(const [key,values] of Object.entries(COMMERCE_VALUES))if(values.has(params[key]))clean[key]=params[key];
 for(const key of ['cost','diamonds','amount_cents'])if(Number.isSafeInteger(params[key])&&params[key]>=0&&params[key]<=10000)clean[key]=params[key];
 // A price paid is in euro cents (30 Sep 2026: for the ChatGPT Ads pixel's order_created in Tag Manager).
 if('amount_cents' in clean)clean.currency='EUR';
 pushEvent(event,clean,win);
 // The standard name ad pixels read by themselves (30 Sep 2026, TikTok through Tag Manager): a pack paid for is a "purchase", in
 // GA4's ecommerce shape with its price in euros, never with who bought it. The ecommerce of an earlier push is cleared first.
 if(event==='diamond_pack_completed'&&'amount_cents' in clean&&win){
  const value=clean.amount_cents/100;
  (win.dataLayer=win.dataLayer||[]).push({ecommerce:null});
  pushEvent('purchase',{ecommerce:{value,currency:'EUR',items:[{item_id:`diamonds_${clean.pack??'pack'}`,item_name:'Diamonds',price:value,quantity:1}]}},win);
 }
}

// Pacing events from inside the game (how far new farmers get, and where they stop). Only numbers and a few fixed
// words are accepted, so nothing personal can be sent along.
const GAME_EVENTS=new Set(['game_session','level_up','guide_step','guide_complete','reminder_prompt','connection_problem','connection_recovered']);
const GUIDE_STEPS=new Set(['harvest','sell','plant','water','produce','gift','chore','sell_egg','tend','wheat','collect']);
const PROMPT_ACTIONS=new Set(['shown','accepted','dismissed','failed']);
// Which reminder the question offered (28 Sep 2026): push on the device, or the daily email where push cannot work.
const PROMPT_CHANNELS=new Set(['push','email']);
// Connection problems: how it failed (a fixed word, never an error message) and whether it stayed a small "Reconnecting…" or became the pause screen.
const CONNECTION_REASONS=new Set(['offline','timeout','network','server','other']);
const CONNECTION_STAGES=new Set(['reconnecting','paused']);
// Invite a friend: the screen opened, the link shared or copied, a sign-up that came with a code. Never a name or code.
const INVITE_EVENTS=new Set(['invite_open','invite_share','invite_copy','invite_signup']);
export function trackInvite(event,win=globalThis.window){if(INVITE_EVENTS.has(event))pushEvent(event,{device:deviceType(win)},win);}
export function trackGame(event,params={},win=globalThis.window){
 if(!GAME_EVENTS.has(event))return;
 const clean={device:deviceType(win)};
 if(Number.isSafeInteger(params.level)&&params.level>=1&&params.level<=500)clean.level=params.level;
 if(Number.isSafeInteger(params.index)&&params.index>=0&&params.index<=9)clean.index=params.index;
 if(GUIDE_STEPS.has(params.step))clean.step=params.step;
 if(PROMPT_ACTIONS.has(params.action))clean.action=params.action;
 if(PROMPT_CHANNELS.has(params.channel))clean.channel=params.channel;
 if(typeof params.returning==='boolean')clean.returning=params.returning;
 if(CONNECTION_REASONS.has(params.reason))clean.reason=params.reason;
 if(CONNECTION_STAGES.has(params.stage))clean.stage=params.stage;
 pushEvent(event,clean,win);
 // Level 5 is a real player (the goal of the ad campaigns): also GA4's standard "generate_lead", which ad pixels read by themselves.
 if(event==='level_up'&&clean.level===5)pushEvent('generate_lead',{level:5},win);
}
