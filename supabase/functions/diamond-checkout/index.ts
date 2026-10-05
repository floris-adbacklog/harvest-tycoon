import Stripe from 'npm:stripe@22.4.0';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {PAYMENT_PACKS,checkoutPack,UUID,starterEligibility,livePaymentConfiguration,OFFER,offerProblem,PASS,passOnSale,passCheckoutProblem,PLAY_PACKAGE,PLAY_PRODUCT,PLAY_TOKEN,playProduct,checkPlayPurchase,APPLE_BUNDLE,APPLE_JWS,APPLE_JWS_MAX,appleProduct,checkApplePurchase} from './payments.js';
import {serviceAccount,getPurchase,consumePurchase} from './google-play.js';
import {verifyAppleJws} from './app-store.js';
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
const purchaseReply=(p:any)=>({id:p.id,pack:p.pack,coins:p.coins,diamonds:p.diamonds,status:p.status,livemode:p.livemode,vipDays:p.vip_days??0,serverNow:Date.now()});
// The special offer running now for this farmer (supabase/special-offer.sql): one at a time, from its level (14 or higher). A
// problem reading it only hides the offer, so the Starter Pack and the diamond packs keep working.
async function currentOffer(player:string){
 const now=new Date().toISOString();
 // The three look-ups at once (30 Sep 2026: one after the other they made the catalogue ~150 ms slower).
 const [found,stats,bought]=await Promise.all([
  admin.from('harvest_offers').select('*').is('stopped_at',null).lte('starts_at',now).gt('ends_at',now).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  admin.from('player_stats').select('level').eq('player_id',player).maybeSingle(),
  admin.from('harvest_purchases').select('offer_id').eq('player_id',player).eq('pack','offer').in('status',['credited','test_paid'])]);
 if(found.error){console.error('Offer unavailable',found.error.code);return null;}const o=found.data;if(!o)return null;
 if(stats.error)throw stats.error;if(bought.error)throw bought.error;
 if((stats.data?.level??1)<o.min_level)return null;
 return {id:o.id,diamonds:o.diamonds,coins:o.coins,vipDays:o.vip_days,audience:o.audience,endsAt:Date.parse(o.ends_at),cents:OFFER.cents,valueCents:OFFER.valueCents,bought:(bought.data??[]).some(b=>b.offer_id===o.id)};
}
// A purchase in an app about to start (the app's create, Google Play or, since Oct 2026, the App Store): the same pending row as a
// Stripe checkout, with the store's product as its price. Google's purchase sheet gets the farmer's id and this row's; Apple's gets this
// row's id (appAccountToken). A Starter Pack, offer or pass already started (one row per farmer, a unique index each) is reused; one that
// was a Stripe checkout or the other app's purchase moves to this store, a Stripe page ended first.
async function appCreate(store:'google_play'|'app_store',player:string,pack:any,requestId:string,starter:any){
 const product=(store==='app_store'?appleProduct:playProduct)(pack.id);if(!product)throw new Error('No product in this store.');
 const insert=await admin.from('harvest_purchases').insert({id:requestId,player_id:player,pack:pack.id,diamonds:pack.diamonds,coins:pack.coins??0,amount_cents:pack.cents,price_id:product,livemode:true,store,
  starter_expires_at:pack.id==='starter'?new Date(starter.expiresAt).toISOString():null,...(pack.id==='offer'?{offer_id:pack.offerId,vip_days:pack.vipDays}:{}),...(pack.id==='pass'?{pass_id:pack.passId}:{})});
 if(insert.error&&insert.error.code!=='23505')throw insert.error;
 let query=admin.from('harvest_purchases').select('*').eq('player_id',player);
 query=pack.id==='starter'?query.eq('pack','starter').eq('livemode',true).neq('status','expired'):pack.id==='offer'?query.eq('pack','offer').eq('offer_id',pack.offerId).neq('status','expired'):pack.id==='pass'?query.eq('pack','pass').eq('pass_id',pack.passId).neq('status','expired'):query.eq('id',requestId);
 const found=await query.single();if(found.error)throw found.error;
 let p=found.data;
 if(p.status!=='pending')return {error:'This purchase has already been processed.'};
 if(p.pack==='starter'&&Date.parse(p.created_at)>=starter.expiresAt)return {error:'The Starter Pack offer has ended.'};
 if(p.store!==store){
  if(p.stripe_session_id){
   const key=(Deno.env.get('STRIPE_SECRET_KEY')??'').trim();if(!key)throw new Error('Stripe is not configured.');
   const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
   const session=await stripe.checkout.sessions.retrieve(p.stripe_session_id);
   if(session.status==='complete')return {error:'This purchase has already been processed.'};
   if(session.status==='open')await stripe.checkout.sessions.expire(session.id);
  }
  const moved=await admin.from('harvest_purchases').update({store,price_id:product}).eq('id',p.id).eq('status','pending').select('*').single();if(moved.error)throw moved.error;p=moved.data;
 }
 if(p.pack!==pack.id||p.price_id!==product||pack.id==='offer'&&p.offer_id!==pack.offerId||pack.id==='pass'&&p.pass_id!==pack.passId)return {error:'Start a new purchase request.'};
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
  // when its store is, whatever Stripe says.
  const play=body.store==='google_play',apple=body.store==='app_store',enabled=play?playEnabled:apple?appleEnabled:stripeEnabled;
  // The offer opens when the farm reaches level 14 (STARTER_LEVEL): the server wrote that moment into the farm (farm-state.js stampStarterOffer).
  // The special offer running now (game/payments.js OFFER), for a farm at its level: what is in it, until when, and whether this
  // farmer already bought it. Only in the catalogue and for an offer checkout, so other requests make no extra queries.
  // The Starter Pack's and the special offer's look-ups run at the same time.
  const [existingStarter,offerRow,special]=await Promise.all([
   body.operation==='catalog'||body.pack==='starter'?admin.from('harvest_purchases').select('*').eq('player_id',user.id).eq('pack','starter').eq('livemode',live).neq('status','expired').maybeSingle():null,
   body.operation==='catalog'||body.pack==='starter'?admin.from('player_farms').select('offer:state->starterOffer').eq('player_id',user.id).maybeSingle():null,
   body.operation==='catalog'||body.pack==='offer'?currentOffer(user.id):null]);
  if(existingStarter?.error)throw existingStarter.error;
  if(offerRow?.error)throw offerRow.error;
  const starter=starterEligibility(offerRow?.data?.offer?.unlockedAt,['credited','test_paid'].includes(existingStarter?.data?.status));
  // The Halloween Pass (Oct 2026): its dates and price from the catalogue itself, no look-up (whether this farm bought it is in the farm,
  // state.passPremium); ready: for sale now, with a Stripe price, from the preview (the pre-sale) until the season ends.
  const pass={id:PASS.id,cents:PASS.cents,startsAt:PASS.startsAt,endsAt:PASS.endsAt,level:PASS.level,ready:Boolean(PASS.price)&&passOnSale()};
  if(body.operation==='catalog')return reply({enabled,mode,store:play?'google_play':apple?'app_store':'stripe',serverNow:Date.now(),starter,offer:special,pass,packs:Object.entries(PAYMENT_PACKS).map(([id,p])=>({id,diamonds:p.diamonds,coins:p.coins??0,cents:p.cents,currency:'eur'}))});
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
  if(body.operation!=='create')return reply({error:'Unknown request.'},400);
  // A CrazyGames account (Oct 2026, crazygames-auth) never pays through Stripe, Google Play or the App Store: CrazyGames allows purchases
  // only through its own shop. The game there shows no purchase; this holds whatever a page asks (its page runs on www.harvesttycoon.com,
  // so CORS lets it in).
  if(user.app_metadata?.portal==='crazygames')return reply({error:'Purchases are not available on CrazyGames.'},403);
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
  }else{try{pack=checkoutPack(body.pack);}catch{return reply({error:'Choose a diamond pack.'},400);}}
  const packId=pack.id;
  if(!UUID.test(body.requestId??''))return reply({error:'Invalid purchase request.'},400);
  if(packId==='starter'&&!starter.eligible)return reply({error:starter.claimed?'You have already received the Starter Pack.':'The Starter Pack opens when you reach level 14 and is then available for 7 days.'},409);
  const farm=await admin.from('player_farms').select('player_id').eq('player_id',user.id).maybeSingle();if(farm.error)throw farm.error;if(!farm.data)return reply({error:'Open your farm before buying diamonds.'},409);
  if(play||apple){const r=await appCreate(play?'google_play':'app_store',user.id,pack,body.requestId,starter);return reply(r,'error' in r?409:200);}
  const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
  const priceId=pack.price;
  if(!priceId)return reply({error:'This pack has not been configured.'},503);
  const price=await stripe.prices.retrieve(priceId);
  if(!price.active||price.livemode!==live||price.currency!=='eur'||price.unit_amount!==pack.cents||price.type!=='one_time'||(live&&pack.product&&price.product!==pack.product))return reply({error:'This pack needs a pricing configuration update.'},503);
  const insert=await admin.from('harvest_purchases').insert({id:body.requestId,player_id:user.id,pack:packId,diamonds:pack.diamonds,coins:pack.coins??0,amount_cents:pack.cents,price_id:priceId,livemode:live,starter_expires_at:packId==='starter'?new Date(starter.expiresAt).toISOString():null,...(packId==='offer'?{offer_id:pack.offerId,vip_days:pack.vipDays}:{}),...(packId==='pass'?{pass_id:pack.passId}:{})});
  if(insert.error&&insert.error.code!=='23505')throw insert.error;
  let query=admin.from('harvest_purchases').select('*').eq('player_id',user.id);
  // The Starter Pack, a special offer and a pass: one checkout per farmer (a unique index each), so a second tab or tap reuses it.
  query=packId==='starter'?query.eq('pack','starter').eq('livemode',live).neq('status','expired'):packId==='offer'?query.eq('pack','offer').eq('offer_id',pack.offerId).neq('status','expired'):packId==='pass'?query.eq('pack','pass').eq('pass_id',pack.passId).neq('status','expired'):query.eq('id',body.requestId);
  const found=await query.single();if(found.error)throw found.error;
  let p=found.data;
  // The same Starter Pack, offer or pass started in the Android or iPhone app and never paid there: the website takes the row back for Stripe.
  if((p.store==='google_play'||p.store==='app_store')&&p.status==='pending'&&p.pack===packId){
   const back=await admin.from('harvest_purchases').update({store:'stripe',price_id:priceId}).eq('id',p.id).eq('status','pending').select('*').single();if(back.error)throw back.error;p=back.data;
  }
  if(p.pack!==packId||p.price_id!==priceId||p.livemode!==live||packId==='offer'&&p.offer_id!==pack.offerId||packId==='pass'&&p.pass_id!==pack.passId)return reply({error:'Start a new purchase request.'},409);
  if(p.pack==='starter'&&Date.parse(p.created_at)>=starter.expiresAt)return reply({error:'The Starter Pack offer has ended.'},409);
  if(p.status!=='pending')return reply({error:'This purchase has already been processed.'},409);
  if(Date.now()-Date.parse(p.created_at)>23*3600000&&!p.stripe_session_id)return reply({error:'This checkout request needs review. Please contact support before retrying.'},409);
  const metadata={app:'harvest-tycoon',purchase_id:p.id,player_id:user.id};
  const session=p.stripe_session_id?await stripe.checkout.sessions.retrieve(p.stripe_session_id):await stripe.checkout.sessions.create({
   mode:'payment',line_items:[{price:priceId,quantity:1}],client_reference_id:user.id,metadata,
   // Adaptive Pricing (27 Sep 2026): a farmer abroad sees and pays the euro price in their own currency (₹, $, zł …), converted by
   // Stripe, which also opens local methods such as UPI and BLIK. The session and the payment still show euros (the local amount is
   // in presentment_details), so the webhook's check on the exact euro amount stays as it is.
   payment_intent_data:{metadata},adaptive_pricing:{enabled:true},
   integration_identifier:'harvest_tycoon_xqbnrjka',
   // The payment page looks like the game (27 Sep 2026), for this session only: the Stripe account (Millstone) also sells other
   // things, so its own name and branding stay as they are everywhere else. The name only changes the top of the page.
   branding_settings:{display_name:'Harvest Tycoon',icon:{type:'url',url:`${origin}/assets/pwa/icon-512.png`},button_color:'#2f5d3a',border_style:'rounded'},
   success_url:`${origin}/play.html?purchase=${p.id}`,cancel_url:`${origin}/play.html?purchase=${p.id}&checkout=cancelled`
  },{idempotencyKey:`harvest-${live?'live':'test'}-${p.id}`});
  if(session.status==='expired'){
   const expired=await admin.from('harvest_purchases').update({status:'expired'}).eq('id',p.id).eq('status','pending');if(expired.error)throw expired.error;
   return reply({error:'This checkout expired. Close the shop and try again.'},409);
  }
  if(!session.url||session.status!=='open')return reply({error:'This checkout has ended. If you paid, your rewards will arrive after confirmation.'},409);
  const saved=await admin.from('harvest_purchases').update({stripe_session_id:session.id}).eq('id',p.id).eq('player_id',user.id);if(saved.error)throw saved.error;
  return reply({url:session.url,purchaseId:p.id});
 }catch(e){console.error('Checkout failed',e?.code??e?.name,e?.status??'',e?.reason??'');return reply({error:'Checkout is unavailable. Please try again later.'},503);}
});
