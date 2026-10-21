import Stripe from 'npm:stripe@22.4.0';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {PAYMENT_PACKS,checkoutPack,UUID,starterEligibility,livePaymentConfiguration,OFFER,offerProblem,offerShownCents,PASS,passOnSale,passCheckoutProblem,SEASON_SALE,seasonOnSale,seasonsOnSale,seasonForCheckout,seasonSale,seasonCheckoutProblem,seasonStoreProblem,offerPausedForSeason,offerValueCents,PLAY_PACKAGE,PLAY_PRODUCT,PLAY_TOKEN,playProduct,checkPlayPurchase,APPLE_BUNDLE,APPLE_JWS,APPLE_JWS_MAX,appleProduct,checkApplePurchase,APPLE_SELLS_OFFER,kongProduct,kongPaymentsEnabled,kongTestUsers,kongKreds,kongPlan,checkKongPurchase,KONG_CLAIM_LIMIT} from './payments.js';
import {serviceAccount,getPurchase,consumePurchase} from './google-play.js';
import {verifyAppleJws} from './app-store.js';
import {kongId,kongToken,KongregateRefused,REFUSED_TEXT,verifyKongregate,kongUserItems,kongUseItem,kongItemPrices} from './kongregate-api.js';
import {checkoutEmail,checkoutLocale,seasonCheckoutText} from './checkout-session.js';
const origin='https://www.harvesttycoon.com';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
// Google Play (Oct 2026, the Android app 1.1): on when the owner has set the service account's key (GOOGLE_PLAY_SERVICE_ACCOUNT), with
// PLAY_PAYMENTS_ENABLED=false as the emergency off switch, as PAYMENTS_ENABLED is for Stripe.
const playAccount=serviceAccount(Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT'));
const playEnabled=Boolean(playAccount)&&String(Deno.env.get('PLAY_PAYMENTS_ENABLED')??'').trim().toLowerCase()!=='false';
// The App Store (Oct 2026, the iPhone app 1.1): Apple's signed purchases are checked here without any key of ours (game/app-store.js),
// so it is on unless the owner sets APPLE_PAYMENTS_ENABLED=false, the emergency off switch. Like PLAY_PAYMENTS_ENABLED it stops new
// purchases (catalog and create); apple_confirm still credits what a farmer has paid already.
const appleEnabled=String(Deno.env.get('APPLE_PAYMENTS_ENABLED')??'').trim().toLowerCase()!=='false';
// Kreds on Kongregate (15 Oct 2026, the owner: built now, on once Kongregate allows the game its Virtual Goods API): off unless the owner
// sets KONG_PAYMENTS_ENABLED to exactly 'true'. While it is off a Kongregate account gets the same 403 as before Kreds, for every store.
// KONGREGATE_TEST_USERS: Kongregate user ids (commas between) whose purchases are tests (the developer account buys for 0 Kreds).
const kongEnabled=kongPaymentsEnabled(Deno.env.get('KONG_PAYMENTS_ENABLED'));
// passId: a pass or season purchase's own pass (21 Oct 2026: the result window says when a season bought in its pre-sale starts).
const purchaseReply=(p:any)=>({id:p.id,pack:p.pack,coins:p.coins,diamonds:p.diamonds,status:p.status,livemode:p.livemode,vipDays:p.vip_days??0,passId:p.pass_id??null,serverNow:Date.now()});
// The special offer running now for this farmer (supabase/special-offer.sql): one at a time, from its level (10 or higher since 13 Oct
// 2026, supabase/offer-level-10.sql). A problem reading it only hides the offer, so the Starter Pack and the diamond packs keep working.
async function currentOffer(player:string){
 // The first week of a season has no offer (game/payments.js offerPausedForSeason): no look-up at all then.
 if(offerPausedForSeason())return null;
 const now=new Date().toISOString();
 // The three look-ups at once (30 Sep 2026: one after the other they made the catalogue ~150 ms slower).
 const [found,stats,bought]=await Promise.all([
  admin.from('harvest_offers').select('*').is('stopped_at',null).lte('starts_at',now).gt('ends_at',now).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  admin.from('player_stats').select('level').eq('player_id',player).maybeSingle(),
  admin.from('harvest_purchases').select('offer_id').eq('player_id',player).eq('pack','offer').in('status',['credited','test_paid'])]);
 if(found.error){console.error('Offer unavailable',found.error.code);return null;}const o=found.data;if(!o)return null;
 if(stats.error)throw stats.error;if(bought.error)throw bought.error;
 if((stats.data?.level??1)<o.min_level)return null;
 // valueCents: the round worth of the discount the contents were made at (21 Oct 2026: the admin picks 33%, 50% or 90% off,
 // game/payments.js OFFER.discounts and offerShownCents: €50, €10 or €7.50), so the window's "Worth" and its discount follow it.
 return {id:o.id,diamonds:o.diamonds,coins:o.coins,vipDays:o.vip_days,audience:o.audience,endsAt:Date.parse(o.ends_at),cents:OFFER.cents,valueCents:offerShownCents({diamonds:o.diamonds,coins:o.coins,vipDays:o.vip_days}),bought:(bought.data??[]).some(b=>b.offer_id===o.id)};
}
// A purchase in an app about to start (the app's create, Google Play or, since Oct 2026, the App Store): the same pending row as a
// Stripe checkout, with the store's product as its price. Google's purchase sheet gets the farmer's id and this row's; Apple's gets this
// row's id (appAccountToken). A Starter Pack, offer or pass already started (one row per farmer, a unique index each) is reused; one that
// was a Stripe checkout or the other app's purchase moves to this store, a Stripe page ended first. Kongregate's Kreds (15 Oct 2026) the
// same way: the page gives this row's id to Kongregate's purchase window as the item's data.
async function appCreate(store:'google_play'|'app_store'|'kongregate',player:string,pack:any,requestId:string,starter:any){
 const product=(store==='app_store'?appleProduct:store==='kongregate'?kongProduct:playProduct)(pack.id);if(!product)throw new Error('No product in this store.');
 const insert=await admin.from('harvest_purchases').insert({id:requestId,player_id:player,pack:pack.id,diamonds:pack.diamonds,coins:pack.coins??0,amount_cents:pack.cents,price_id:product,livemode:true,store,
  starter_expires_at:pack.id==='starter'?new Date(starter.expiresAt).toISOString():null,...(pack.id==='offer'?{offer_id:pack.offerId,vip_days:pack.vipDays}:{}),...(pack.id==='pass'||pack.id==='season'?{pass_id:pack.passId}:{})});
 if(insert.error&&insert.error.code!=='23505')throw insert.error;
 let query=admin.from('harvest_purchases').select('*').eq('player_id',player);
 query=pack.id==='starter'?query.eq('pack','starter').eq('livemode',true).neq('status','expired'):pack.id==='offer'?query.eq('pack','offer').eq('offer_id',pack.offerId).neq('status','expired'):pack.id==='pass'||pack.id==='season'?query.eq('pack',pack.id).eq('pass_id',pack.passId).neq('status','expired'):query.eq('id',requestId);
 const found=await query.single();if(found.error)throw found.error;
 let p=found.data;
 if(p.status!=='pending')return {error:'This purchase has already been processed.'};
 if(p.pack==='starter'&&Date.parse(p.created_at)>=starter.expiresAt)return {error:'The Starter Pack offer has ended.'};
 if(p.store!==store){
  // A Kongregate row (Kreds, 15 Oct 2026) never moves to another store, nor another store's row to Kongregate (its accounts buy nothing else).
  if(p.store==='kongregate'||store==='kongregate')return {error:'Start a new purchase request.'};
  if(p.stripe_session_id){
   const key=(Deno.env.get('STRIPE_SECRET_KEY')??'').trim();if(!key)throw new Error('Stripe is not configured.');
   const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
   const session=await stripe.checkout.sessions.retrieve(p.stripe_session_id);
   if(session.status==='complete')return {error:'This purchase has already been processed.'};
   if(session.status==='open')await stripe.checkout.sessions.expire(session.id);
  }
  const moved=await admin.from('harvest_purchases').update({store,price_id:product}).eq('id',p.id).eq('status','pending').select('*').single();if(moved.error)throw moved.error;p=moved.data;
 }
 if(p.pack!==pack.id||p.price_id!==product||pack.id==='offer'&&p.offer_id!==pack.offerId||(pack.id==='pass'||pack.id==='season')&&p.pass_id!==pack.passId)return {error:'Start a new purchase request.'};
 return {purchaseId:p.id,product,account:player,store};
}
// An App Store purchase (Oct 2026, the iPhone app 1.1): the app hands over the transaction exactly as Apple signed it (StoreKit's
// jwsRepresentation) and the server checks Apple's signature itself (game/app-store.js), never trusting the app. Then it must be this
// app's consumable, bought with one of this farmer's purchase rows as its appAccountToken (another farmer's: 403), for the same pack and
// amounts (game/payments.js checkApplePurchase). finish tells the page whether the app may now finish the transaction at Apple
// (appstorefinish://): only when the farm has it (credited now, or before: duplicate) or Apple took the money back (revoked: nothing is
// credited, a pending row expires, a credited one is taken back). Anything else stays unfinished, and StoreKit gives it to the app again
// at every start, so a paid purchase is never lost. The sandbox (App Review, TestFlight) is credited too, as livemode false.
async function appleConfirm(player:string,body:any){
 const no=(error:string,status:number)=>reply({error,finish:false},status);
 if(typeof body.product!=='string'||!PLAY_PRODUCT.test(body.product)||typeof body.transaction!=='string'||body.transaction.length>APPLE_JWS_MAX||!APPLE_JWS.test(body.transaction))return no('Invalid purchase.',400);
 let apple;
 try{apple=await verifyAppleJws(body.transaction);}
 catch(e){console.error('App Store purchase not signed by Apple',String(e?.message??'').slice(0,120));return no('This purchase was not signed by the App Store.',400);}
 const id=String(apple.appAccountToken??'').toLowerCase();
 if(apple.bundleId!==APPLE_BUNDLE||!UUID.test(id))return no('This purchase was not made in Harvest Tycoon.',409);
 const row=await admin.from('harvest_purchases').select('*').eq('id',id).eq('player_id',player).maybeSingle();if(row.error)throw row.error;
 if(!row.data)return no('This purchase belongs to another farmer.',403);
 let checked;
 try{checked=checkApplePurchase(apple,row.data,{product:body.product,player});}
 catch(e){console.error('App Store purchase mismatch',id,e?.message);return no('This purchase could not be matched. Please contact support.',409);}
 const p=row.data,answer=(data:any,duplicate:boolean)=>reply({...purchaseReply(data),duplicate,finish:true,transaction:checked.transaction});
 if(checked.state==='revoked'){
  if(p.status==='pending'){const ended=await admin.from('harvest_purchases').update({status:'expired'}).eq('id',id).eq('status','pending');if(ended.error)throw ended.error;return answer({...p,status:'expired'},false);}
  if(p.apple_transaction_id!==checked.transaction||!['credited','test_paid'].includes(p.status))return answer(p,false);
  // Credited before and refunded since (the notification missed or still on its way): taken back now, safe to repeat.
  const back=await admin.rpc('harvest_revoke_apple_purchases',{p_items:[{transaction:checked.transaction,revokedAt:new Date(Number(apple.revocationDate)||Date.now()).toISOString()}]});if(back.error)throw back.error;
  const after=await admin.from('harvest_purchases').select('*').eq('id',id).single();if(after.error)throw after.error;
  return answer(after.data,false);
 }
 // A row that another transaction paid, or that was paid another way (Stripe, Google Play): this payment is not this row's to credit.
 if(p.apple_transaction_id?p.apple_transaction_id!==checked.transaction:!['pending','expired'].includes(p.status)){console.error('App Store purchase for a row paid otherwise',id);return no('This purchase could not be matched. Please contact support.',409);}
 const credited=await admin.rpc('harvest_credit_apple_purchase',{p_purchase:id,p_transaction:checked.transaction,p_original:checked.original,p_test:checked.test});if(credited.error)throw credited.error;
 const after=await admin.from('harvest_purchases').select('*').eq('id',id).single();if(after.error)throw after.error;
 // duplicate: confirmed before (the app sent it again), so the game does not show the window a second time
 return answer(after.data,Boolean(credited.data?.duplicate));
}
// Kreds on Kongregate (15 Oct 2026): what a Kongregate player owns at Kongregate is credited here, and only here. The page asks after
// every purchase window (whatever it said), when the farm opens and while its purchase window checks (Kongregate's checklist: the game
// checks for uncredited purchases on start-up), with the player's Kongregate user id and game auth token. That user must be this
// farmer's (kongregate_accounts) and the token theirs (Kongregate's authenticate.json); their items come from Kongregate's server
// (user_items.json), never from the page. Each item instance is credited once (kong_item_id is unique; game/payments.js kongPlan picks
// its row), then used up at Kongregate (use_item.json), keeping the usage record's id; one credited before is only used up again.
// Kongregate's own test accounts (KONGREGATE_TEST_USERS) are credited as livemode false. Answers {credited: [purchase ids], waiting: n}.
async function kongClaim(user:any,body:any){
 const kongUser=kongId(body.kong_user_id),token=kongToken(body.game_auth_token);
 if(!kongUser||!token)return reply({error:'Invalid request.'},400);
 const apiKey=(Deno.env.get('KONGREGATE_API_KEY')??'').trim();
 if(!apiKey){console.error('KONGREGATE_API_KEY is not set.');return reply({error:'Purchases with Kreds are not available yet.'},503);}
 // Our side first (15 Oct 2026 review): this Kongregate user must be this farmer's, and their page may ask at most once in 5 seconds and
 // 120 times an hour (game/payments.js KONG_CLAIM_LIMIT), both in one step (supabase/kongregate-kreds.sql harvest_kong_claim_slot).
 // Only then is Kongregate asked, so nobody can make our server call Kongregate with the game's key over and over, or for another user.
 const slot=await admin.rpc('harvest_kong_claim_slot',{p_user:Number(kongUser),p_player:user.id,p_gap_ms:KONG_CLAIM_LIMIT.gapMs,p_max:KONG_CLAIM_LIMIT.perHour});if(slot.error)throw slot.error;
 if(slot.data==='other')return reply({error:'This Kongregate account plays another farm.'},403);
 if(slot.data!=='ok')return reply({error:'Too many checks. Please try again in a moment.'},429);
 // Whether the token is theirs and what they own (both Kongregate), at the same time: one round trip.
 const settle=(p:Promise<any>)=>p.then(value=>({value}),error=>({error}));
 const [auth,owned]=await Promise.all([settle(verifyKongregate({userId:kongUser,token,apiKey})),settle(kongUserItems({userId:kongUser,apiKey}))]);
 for(const asked of [auth,owned])if(asked.error){
  if(asked.error.transient)return reply({error:'Kongregate could not be reached. Please try again.'},503);
  if(asked===auth&&asked.error instanceof KongregateRefused){console.error('Kongregate refused a purchase check:',asked.error.reason);return reply({error:REFUSED_TEXT},401);}
  // The inventory refused: the game's API key is not Kongregate's (it answers 'Required: game_id').
  console.error('Kongregate refused the inventory:',asked.error.reason??asked.error.name);return reply({error:'Purchases with Kreds are not available yet.'},503);
 }
 // Only this game's items (game/payments.js KONG_PRODUCTS); nothing of ours there: nothing to do.
 const ids=kongPlan(owned.value,{player:user.id}).map(step=>step.instance.id);
 if(!ids.length)return reply({credited:[],waiting:0});
 // The rows that hold these instances already, this farmer's open Kongregate rows, and Kongregate's prices (for the books, and what is
 // for sale at all).
 const [claimed,open,prices]=await Promise.all([admin.from('harvest_purchases').select('*').in('kong_item_id',ids),
  admin.from('harvest_purchases').select('*').eq('player_id',user.id).eq('store','kongregate').eq('status','pending').is('kong_item_id',null).order('created_at',{ascending:true}),
  settle(kongItemPrices({apiKey}))]);
 if(claimed.error)throw claimed.error;if(open.error)throw open.error;
 const test=kongTestUsers(Deno.env.get('KONGREGATE_TEST_USERS')).has(kongUser),credited:string[]=[];let waiting=0;
 for(const step of kongPlan(owned.value,{player:user.id,claimed:claimed.data??[],rows:open.data??[]})){
  const item=step.instance.id,kreds=kongKreds(prices.value?.[step.instance.identifier]);
  // Not for sale at Kongregate (no price of 1 Kred or more in Manage Items; 15 Oct 2026 review): an item left unpriced, or one Kongregate
  // put there itself (a promotion), is never credited as a purchase; it stays there, logged. Without the price list (Kongregate did not
  // answer it) a paid item is credited as before, so a hiccup there never holds one back. One credited before is still used up.
  if(step.kind!=='use'&&prices.value&&!kreds){console.error('Kongregate item without a price',item,step.instance.identifier);waiting++;continue;}
  try{
   if(step.kind==='leave'){console.error('Kongregate item without a purchase row',item,step.instance.identifier);waiting++;continue;}
   if(step.kind==='credit'){
    try{checkKongPurchase(step.row,{product:step.instance.identifier,player:user.id});}
    catch(e){console.error('Kongregate purchase mismatch',step.row.id,e?.message);waiting++;continue;}
    const done=await admin.rpc('harvest_credit_kong_purchase',{p_purchase:step.row.id,p_item:item,p_user:Number(kongUser),p_kreds:kreds,p_product:step.instance.identifier,p_test:test});if(done.error)throw done.error;
    if(!done.data?.duplicate)credited.push(step.row.id);
   }
   if(step.kind==='new'){
    const made=await admin.rpc('harvest_credit_kong_pack',{p_player:user.id,p_pack:step.pack,p_item:item,p_user:Number(kongUser),p_kreds:kreds,p_test:test});if(made.error)throw made.error;
    if(!made.data?.duplicate&&UUID.test(made.data?.id??''))credited.push(made.data.id);
   }
  }catch(e){console.error('Kongregate item not credited',item,e?.code??e?.name,String(e?.message??'').slice(0,80));waiting++;continue;}
  // The farm has it (now or before): used up at Kongregate. A failure here is tried again at the next claim (the instance stays).
  try{
   const used=await kongUseItem({userId:kongUser,token,apiKey,id:item});
   if(used.usage){const saved=await admin.from('harvest_purchases').update({kong_usage_id:used.usage}).eq('kong_item_id',item);if(saved.error)throw saved.error;}
  }catch(e){console.error('Kongregate item not used up',item,e?.reason??e?.code??e?.name);}
 }
 return reply({credited,waiting});
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return reply({error:'Please sign in.'},401);
  const {data:{user},error}=await admin.auth.getUser(token);if(error||!user||user.is_anonymous)return reply({error:'Please sign in.'},401);
  const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  if(!claims.session_id)return reply({error:'Please sign in again.'},401);
  const active=await admin.rpc('harvest_session_active',{p_player:user.id,p_session:claims.session_id});if(active.error)throw active.error;if(!active.data)return reply({error:'Please sign in again.'},401);
  // 2 KB is plenty for every request but Apple's signed purchase (apple_confirm), which may be up to APPLE_JWS_MAX.
  const raw=await req.text();if(raw.length>APPLE_JWS_MAX+1024)return reply({error:'Request too large.'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
  if(raw.length>2048&&body?.operation!=='apple_confirm')return reply({error:'Request too large.'},413);
  const key=(Deno.env.get('STRIPE_SECRET_KEY')??'').trim();
  const {mode,enabled:stripeEnabled}=livePaymentConfiguration(key,Deno.env.get('STRIPE_WEBHOOK_SECRET'),Deno.env.get('PAYMENTS_ENABLED'));
  const live=true;
  // The Android app asks with store 'google_play' (src/play-store.js), the iPhone app (1.1, Oct 2026) with 'app_store': its shop is open
  // when its store is, whatever Stripe says. The page on Kongregate asks with 'kongregate' (Kreds, 15 Oct 2026): open only for a
  // Kongregate account, and only when KONG_PAYMENTS_ENABLED is on.
  const play=body.store==='google_play',apple=body.store==='app_store',kong=body.store==='kongregate',kongAccount=user.app_metadata?.portal==='kongregate';
  const enabled=play?playEnabled:apple?appleEnabled:kong?kongEnabled&&kongAccount:stripeEnabled;
  // The offer opens when the farm reaches level 14 (STARTER_LEVEL): the server wrote that moment into the farm (farm-state.js stampStarterOffer).
  // The special offer running now (game/payments.js OFFER), for a farm at its level: what is in it, until when, and whether this
  // farmer already bought it. Only in the catalogue and for an offer checkout, so other requests make no extra queries.
  // Never in the iPhone app while Apple does not sell special_offer (APPLE_SELLS_OFFER, 13 Oct 2026): its catalogue has no offer and
  // its offer checkout is refused ('This offer has ended.'), whatever level the offer opens at.
  // The Starter Pack's and the special offer's look-ups run at the same time.
  const [existingStarter,offerRow,special]=await Promise.all([
   body.operation==='catalog'||body.pack==='starter'?admin.from('harvest_purchases').select('*').eq('player_id',user.id).eq('pack','starter').eq('livemode',live).neq('status','expired').maybeSingle():null,
   body.operation==='catalog'||body.pack==='starter'?admin.from('player_farms').select('offer:state->starterOffer').eq('player_id',user.id).maybeSingle():null,
   (body.operation==='catalog'||body.pack==='offer')&&(!apple||APPLE_SELLS_OFFER)?currentOffer(user.id):null]);
  if(existingStarter?.error)throw existingStarter.error;
  if(offerRow?.error)throw offerRow.error;
  const starter=starterEligibility(offerRow?.data?.offer?.unlockedAt,['credited','test_paid'].includes(existingStarter?.data?.status));
  // The Halloween Pass (Oct 2026): its dates and price from the catalogue itself, no look-up (whether this farm bought it is in the farm,
  // state.passPremium); ready: for sale now, with a Stripe price, from the preview (the pre-sale) until the season ends.
  const pass={id:PASS.id,cents:PASS.cents,startsAt:PASS.startsAt,endsAt:PASS.endsAt,level:PASS.level,ready:Boolean(PASS.price)&&passOnSale()};
  // The Season Pass (Oct 2026): the season on sale now, from the catalogue itself (whether this farm has it is in the farm,
  // state.passPremium). ready: open and priced; never in the iPhone app while Apple does not sell it (APPLE_SELLS_SEASON_PASS).
  // seasons (21 Oct 2026, the pre-sale): every season on sale now, the open one and one bought ahead of its start (Winter 2026 while
  // Autumn runs), each with its own start; season stays the open one for pages from before.
  const onSale=seasonOnSale(),seasonReady=Boolean(SEASON_SALE.price)&&!seasonStoreProblem(apple?'app_store':'other');
  const season=onSale?{id:onSale.id,cents:SEASON_SALE.cents,level:SEASON_SALE.level,endsAt:onSale.endsAt,ready:seasonReady}:null;
  const seasons=seasonsOnSale().map(s=>({id:s.id,cents:SEASON_SALE.cents,level:SEASON_SALE.level,startsAt:s.startsAt,endsAt:s.endsAt,ready:seasonReady}));
  if(body.operation==='catalog')return reply({enabled,mode,store:play?'google_play':apple?'app_store':kong?'kongregate':'stripe',serverNow:Date.now(),starter,offer:special,pass,season,seasons,packs:Object.entries(PAYMENT_PACKS).map(([id,p])=>({id,diamonds:p.diamonds,coins:p.coins??0,cents:p.cents,currency:'eur'}))});
  if(body.operation==='status'){
   if(!UUID.test(body.purchaseId??''))return reply({error:'Invalid purchase.'},400);
   const r=await admin.from('harvest_purchases').select('*').eq('id',body.purchaseId).eq('player_id',user.id).maybeSingle();if(r.error)throw r.error;if(!r.data)return reply({error:'Purchase not found for this account.'},404);
   // serverNow: a pass bought before its season says when it starts, by this clock (src/payment-ui.js, Oct 2026).
   return reply(purchaseReply(r.data));
  }
  // A Google Play purchase (Oct 2026): the app hands over Google's token, the server asks Google itself (never trusting the app), and
  // credits it only when Google says it is paid, for this farmer and this purchase row (the ids the app gave Google's purchase sheet).
  // Then it consumes it, so the pack can be bought again; a purchase never confirmed is refunded by Google after 3 days. A test
  // purchase (licence testers) is recorded as test_paid and credits nothing. Safe to repeat: the app sends every unconsumed purchase
  // again at the next start (playpending://).
  if(body.operation==='play_confirm'){
   if(!playAccount)return reply({error:'Purchases through Google Play are not available yet.'},503);
   if(typeof body.product!=='string'||!PLAY_PRODUCT.test(body.product)||typeof body.token!=='string'||!PLAY_TOKEN.test(body.token))return reply({error:'Invalid purchase.'},400);
   let google;
   try{google=await getPurchase(playAccount,PLAY_PACKAGE,body.product,body.token);}
   catch(e){if([400,404,410].includes(e?.status))return reply({error:'Google Play does not know this purchase.'},404);throw e;}
   if(google.obfuscatedExternalAccountId!==user.id)return reply({error:'This purchase belongs to another farmer.'},403);
   const id=google.obfuscatedExternalProfileId;if(!UUID.test(id??''))return reply({error:'This purchase was not made in Harvest Tycoon.'},409);
   const row=await admin.from('harvest_purchases').select('*').eq('id',id).eq('player_id',user.id).maybeSingle();if(row.error)throw row.error;
   if(!row.data)return reply({error:'Purchase not found for this account.'},404);
   let checked;
   try{checked=checkPlayPurchase(google,row.data,{product:body.product,player:user.id});}
   catch(e){console.error('Play purchase mismatch',id,e?.message);return reply({error:'This purchase could not be matched. Please contact support.'},409);}
   if(checked.state==='pending')return reply({...purchaseReply(row.data),status:'pending'});
   if(checked.state==='cancelled'){
    const ended=await admin.from('harvest_purchases').update({status:'expired'}).eq('id',id).eq('status','pending');if(ended.error)throw ended.error;
    return reply({...purchaseReply(row.data),status:row.data.status==='pending'?'expired':row.data.status});
   }
   const credited=await admin.rpc('harvest_credit_play_purchase',{p_purchase:id,p_token:body.token,p_order:checked.order,p_test:checked.test});if(credited.error)throw credited.error;
   if(google.consumptionState!==1){try{await consumePurchase(playAccount,PLAY_PACKAGE,body.product,body.token);}catch(e){console.error('Play consume failed',id,e?.status);}}
   const after=await admin.from('harvest_purchases').select('*').eq('id',id).single();if(after.error)throw after.error;
   // duplicate: confirmed before (the app sent it again), so the game does not show the window a second time
   return reply({...purchaseReply(after.data),duplicate:Boolean(credited.data?.duplicate)});
  }
  if(body.operation==='apple_confirm'){
   try{return await appleConfirm(user.id,body);}
   catch(e){console.error('App Store confirm failed',e?.code??e?.name,String(e?.message??'').slice(0,80));return reply({error:'Checkout is unavailable. Please try again later.',finish:false},503);}
  }
  if(body.operation==='kong_claim'){
   if(!kongAccount||!kong||!kongEnabled)return reply({error:'Purchases are not available on Kongregate.'},403);
   try{return await kongClaim(user,body);}
   catch(e){console.error('Kongregate claim failed',e?.code??e?.name,String(e?.message??'').slice(0,80));return reply({error:'Checkout is unavailable. Please try again later.'},503);}
  }
  if(body.operation!=='create')return reply({error:'Unknown request.'},400);
  // A CrazyGames account (Oct 2026, crazygames-auth) never pays through Stripe, Google Play or the App Store: CrazyGames allows purchases
  // only through its own shop. The game there shows no purchase; this holds whatever a page asks (its page runs on www.harvesttycoon.com,
  // so CORS lets it in).
  if(user.app_metadata?.portal==='crazygames')return reply({error:'Purchases are not available on CrazyGames.'},403);
  // The same for a Kongregate account (Oct 2026, kongregate-auth): Kongregate allows only its own Kreds (store 'kongregate', 15 Oct 2026),
  // and those only while KONG_PAYMENTS_ENABLED is on.
  if(kongAccount&&!(kong&&kongEnabled))return reply({error:'Purchases are not available on Kongregate.'},403);
  // And for a Discord account (Oct 2026, discord-auth): nothing is sold in the Activity (Discord's Developer Policy would ask for its
  // own purchases at no higher price), and a Discord account cannot buy on the website either.
  if(user.app_metadata?.portal==='discord')return reply({error:'Purchases are not available on Discord.'},403);
  // Kreds only ever for a Kongregate account.
  if(kong&&!kongAccount)return reply({error:'Purchases with Kreds are only on Kongregate.'},403);
  if(!enabled)return reply({error:play?'Purchases through Google Play are not available yet.':apple?'Purchases through the App Store are not available yet.':'Diamond purchases are not available yet.'},503);
  let pack;
  if(body.pack==='offer'){
   if(!special||special.id!==body.offerId)return reply({error:'This offer has ended.'},409);
   if(special.bought)return reply({error:'You have already bought this offer.'},409);
   if(offerProblem({diamonds:special.diamonds,coins:special.coins,vipDays:special.vipDays}))return reply({error:'This offer has ended.'},409);
   pack={id:'offer',cents:OFFER.cents,price:OFFER.price,diamonds:special.diamonds,coins:special.coins,vipDays:special.vipDays,offerId:special.id};
  }else if(body.pack==='pass'){
   // From the preview on (the pre-sale, Oct 2026) until the season ends, from its level, once per farmer per pass (a unique index too,
   // supabase/season-pass.sql): game/payments.js passCheckoutProblem, which the tests run.
   const [level,owned]=await Promise.all([admin.from('player_stats').select('level').eq('player_id',user.id).maybeSingle(),
    admin.from('harvest_purchases').select('id').eq('player_id',user.id).eq('pack','pass').eq('pass_id',PASS.id).in('status',['credited','test_paid']).limit(1)]);
   if(level.error)throw level.error;if(owned.error)throw owned.error;
   const problem=passCheckoutProblem({level:level.data?.level??1,owned:Boolean(owned.data?.length)});
   if(problem)return reply({error:problem.error},problem.status);
   pack={id:'pass',cents:PASS.cents,price:PASS.price,product:PASS.product,diamonds:0,coins:0,passId:PASS.id};
  }else if(body.pack==='season'){
   // The Season Pass (Oct 2026): the season open now, from level 20, once per farmer per season (a unique index too,
   // supabase/season-pass-engine.sql): game/payments.js seasonCheckoutProblem, which the tests run. Owned: a paid row for this season,
   // or the season already in the farm's passPremium. Not in the iPhone app (APPLE_SELLS_SEASON_PASS).
   // The pre-sale (21 Oct 2026): the page names the season it buys (body.season); only one on sale now (seasonForCheckout), and its id
   // goes into the row (pass_id), so Winter bought while Autumn runs is credited to Winter. No name: the season open now, as before.
   const notHere=seasonStoreProblem(apple?'app_store':play?'google_play':kong?'kongregate':'stripe');if(notHere)return reply({error:notHere.error},notHere.status);
   if(body.season!=null&&typeof body.season!=='string')return reply({error:'Choose a season.'},400);
   const open=seasonForCheckout(body.season??null);
   if(!open)return reply({error:'The Season Pass is not on sale right now.'},409);
   const [level,owned,farmPasses]=await Promise.all([admin.from('player_stats').select('level').eq('player_id',user.id).maybeSingle(),
    admin.from('harvest_purchases').select('id').eq('player_id',user.id).eq('pack','season').eq('pass_id',open.id).in('status',['credited','test_paid']).limit(1),
    admin.from('player_farms').select('passes:state->passPremium').eq('player_id',user.id).maybeSingle()]);
   if(level.error)throw level.error;if(owned.error)throw owned.error;if(farmPasses.error)throw farmPasses.error;
   const inFarm=Array.isArray(farmPasses.data?.passes)&&farmPasses.data.passes.includes(open.id);
   const problem=seasonCheckoutProblem({level:level.data?.level??1,owned:Boolean(owned.data?.length)||inFarm,season:open.id});
   if(problem)return reply({error:problem.error},problem.status);
   pack={id:'season',cents:SEASON_SALE.cents,price:SEASON_SALE.price,product:SEASON_SALE.product,diamonds:0,coins:0,passId:open.id};
  }else{try{pack=checkoutPack(body.pack);}catch{return reply({error:'Choose a diamond pack.'},400);}}
  const packId=pack.id;
  if(!UUID.test(body.requestId??''))return reply({error:'Invalid purchase request.'},400);
  if(packId==='starter'&&!starter.eligible)return reply({error:starter.claimed?'You have already received the Starter Pack.':'The Starter Pack opens when you reach level 14 and is then available for 7 days.'},409);
  const farm=await admin.from('player_farms').select('player_id').eq('player_id',user.id).maybeSingle();if(farm.error)throw farm.error;if(!farm.data)return reply({error:'Open your farm before buying diamonds.'},409);
  if(play||apple||kong){const r=await appCreate(play?'google_play':apple?'app_store':'kongregate',user.id,pack,body.requestId,starter);return reply(r,'error' in r?409:200);}
  const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
  const priceId=pack.price;
  if(!priceId)return reply({error:'This pack has not been configured.'},503);
  const price=await stripe.prices.retrieve(priceId);
  if(!price.active||price.livemode!==live||price.currency!=='eur'||price.unit_amount!==pack.cents||price.type!=='one_time'||(live&&pack.product&&price.product!==pack.product))return reply({error:'This pack needs a pricing configuration update.'},503);
  const newRow=(id:string)=>({id,player_id:user.id,pack:packId,diamonds:pack.diamonds,coins:pack.coins??0,amount_cents:pack.cents,price_id:priceId,livemode:live,starter_expires_at:packId==='starter'?new Date(starter.expiresAt).toISOString():null,...(packId==='offer'?{offer_id:pack.offerId,vip_days:pack.vipDays}:{}),...(packId==='pass'||packId==='season'?{pass_id:pack.passId}:{})});
  const insert=await admin.from('harvest_purchases').insert(newRow(body.requestId));
  if(insert.error&&insert.error.code!=='23505')throw insert.error;
  let query=admin.from('harvest_purchases').select('*').eq('player_id',user.id);
  // The Starter Pack, a special offer and a pass: one checkout per farmer (a unique index each), so a second tab or tap reuses it.
  query=packId==='starter'?query.eq('pack','starter').eq('livemode',live).neq('status','expired'):packId==='offer'?query.eq('pack','offer').eq('offer_id',pack.offerId).neq('status','expired'):packId==='pass'||packId==='season'?query.eq('pack',packId).eq('pass_id',pack.passId).neq('status','expired'):query.eq('id',body.requestId);
  const found=await query.single();if(found.error)throw found.error;
  let p=found.data;
  // The same Starter Pack, offer or pass started in the Android or iPhone app and never paid there: the website takes the row back for Stripe.
  // movedBack: its app store's sheet may still be paying for this row (a cash payment, or the app closed before it confirmed), so it never
  // gets a fresh row in the same tap below, and after 23 hours it is still refused (10 Oct 2026 review: else it could be paid twice).
  let movedBack=false;
  if((p.store==='google_play'||p.store==='app_store')&&p.status==='pending'&&p.pack===packId){
   const back=await admin.from('harvest_purchases').update({store:'stripe',price_id:priceId}).eq('id',p.id).eq('status','pending').select('*').single();if(back.error)throw back.error;p=back.data;
   movedBack=true;
  }
  if(p.pack!==packId||p.price_id!==priceId||p.livemode!==live||packId==='offer'&&p.offer_id!==pack.offerId||(packId==='pass'||packId==='season')&&p.pass_id!==pack.passId)return reply({error:'Start a new purchase request.'},409);
  if(p.pack==='starter'&&Date.parse(p.created_at)>=starter.expiresAt)return reply({error:'The Starter Pack offer has ended.'},409);
  if(p.status!=='pending')return reply({error:'This purchase has already been processed.'},409);
  if(Date.now()-Date.parse(p.created_at)>23*3600000&&!p.stripe_session_id)return reply({error:'This checkout request needs review. Please contact support before retrying.'},409);
  const openPage=(row:any)=>stripe.checkout.sessions.create({
   mode:'payment',line_items:[{price:priceId,quantity:1}],client_reference_id:user.id,metadata:{app:'harvest-tycoon',purchase_id:row.id,player_id:user.id},
   // A Season Pass page says which season it is for, and when one bought ahead starts (21 Oct 2026, checkout-session.js).
   ...(packId==='season'&&seasonCheckoutText(seasonSale(row.pass_id),body.language)?{custom_text:{submit:{message:seasonCheckoutText(seasonSale(row.pass_id),body.language)}}}:{}),
   // 10 Oct 2026: the account's confirmed address is filled in, and the page speaks the game's language (checkout-session.js).
   customer_email:checkoutEmail(user),locale:checkoutLocale(body.language),
   // Adaptive Pricing (27 Sep 2026): a farmer abroad sees and pays the euro price in their own currency (₹, $, zł …), converted by
   // Stripe, which also opens local methods such as UPI and BLIK. The session and the payment still show euros (the local amount is
   // in presentment_details), so the webhook's check on the exact euro amount stays as it is.
   payment_intent_data:{metadata:{app:'harvest-tycoon',purchase_id:row.id,player_id:user.id}},adaptive_pricing:{enabled:true},
   integration_identifier:'harvest_tycoon_xqbnrjka',
   // The payment page looks like the game (27 Sep 2026), for this session only: the Stripe account (Millstone) also sells other
   // things, so its own name and branding stay as they are everywhere else. The name only changes the top of the page.
   branding_settings:{display_name:'Harvest Tycoon',icon:{type:'url',url:`${origin}/assets/pwa/icon-512.png`},button_color:'#2f5d3a',border_style:'rounded'},
   success_url:`${origin}/play.html?purchase=${row.id}`,cancel_url:`${origin}/play.html?purchase=${row.id}&checkout=cancelled`
  },{idempotencyKey:`harvest-${live?'live':'test'}-${row.id}`});
  let session=p.stripe_session_id?await stripe.checkout.sessions.retrieve(p.stripe_session_id):await openPage(p);
  // A Stripe page lasts 24 hours. A farmer who comes back later (a Starter Pack, offer or pass reuses its row) gets a new row and a new
  // page at once (10 Oct 2026); before, the first tap only said 'This checkout expired' and the second tap worked. A row just taken back from
  // an app store keeps the old answer (movedBack above).
  if(session.status==='expired'){
   const expired=await admin.from('harvest_purchases').update({status:'expired'}).eq('id',p.id).eq('status','pending');if(expired.error)throw expired.error;
   if(movedBack)return reply({error:'This checkout expired. Close the shop and try again.'},409);
   const fresh=await admin.from('harvest_purchases').insert(newRow(crypto.randomUUID())).select('*').single();if(fresh.error)throw fresh.error;
   p=fresh.data;session=await openPage(p);
  }
  if(!session.url||session.status!=='open')return reply({error:'This checkout has ended. If you paid, your rewards will arrive after confirmation.'},409);
  const saved=await admin.from('harvest_purchases').update({stripe_session_id:session.id}).eq('id',p.id).eq('player_id',user.id);if(saved.error)throw saved.error;
  return reply({url:session.url,purchaseId:p.id});
 }catch(e){console.error('Checkout failed',e?.code??e?.name,e?.status??'',e?.reason??'');return reply({error:'Checkout is unavailable. Please try again later.'},503);}
});
