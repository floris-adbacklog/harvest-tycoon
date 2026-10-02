import Stripe from 'npm:stripe@22.4.0';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {PAYMENT_PACKS,checkoutPack,UUID,starterEligibility,livePaymentConfiguration,OFFER,offerProblem,PASS,passOnSale,passCheckoutProblem} from './payments.js';
const origin='https://www.harvesttycoon.com';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
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
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return reply({error:'Please sign in.'},401);
  const {data:{user},error}=await admin.auth.getUser(token);if(error||!user||user.is_anonymous)return reply({error:'Please sign in.'},401);
  const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  if(!claims.session_id)return reply({error:'Please sign in again.'},401);
  const active=await admin.rpc('harvest_session_active',{p_player:user.id,p_session:claims.session_id});if(active.error)throw active.error;if(!active.data)return reply({error:'Please sign in again.'},401);
  const raw=await req.text();if(raw.length>2048)return reply({error:'Request too large.'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
  const key=(Deno.env.get('STRIPE_SECRET_KEY')??'').trim();
  const {mode,enabled}=livePaymentConfiguration(key,Deno.env.get('STRIPE_WEBHOOK_SECRET'),Deno.env.get('PAYMENTS_ENABLED'));
  const live=true;
  // The offer opens when the farm reaches level 14, where diamond boosts unlock: the server wrote that moment into the farm (farm-state.js stampStarterOffer).
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
  if(body.operation==='catalog')return reply({enabled,mode,serverNow:Date.now(),starter,offer:special,pass,packs:Object.entries(PAYMENT_PACKS).map(([id,p])=>({id,diamonds:p.diamonds,coins:p.coins??0,cents:p.cents,currency:'eur'}))});
  if(body.operation==='status'){
   if(!UUID.test(body.purchaseId??''))return reply({error:'Invalid purchase.'},400);
   const r=await admin.from('harvest_purchases').select('*').eq('id',body.purchaseId).eq('player_id',user.id).maybeSingle();if(r.error)throw r.error;if(!r.data)return reply({error:'Purchase not found for this account.'},404);
   // serverNow: a pass bought before its season says when it starts, by this clock (src/payment-ui.js, Oct 2026).
   const {id,pack,coins,diamonds,status,livemode,vip_days}=r.data;return reply({id,pack,coins,diamonds,status,livemode,vipDays:vip_days??0,serverNow:Date.now()});
  }
  if(body.operation!=='create')return reply({error:'Unknown request.'},400);
  if(!enabled)return reply({error:'Diamond purchases are not available yet.'},503);
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
  const p=found.data;if(p.pack!==packId||p.price_id!==priceId||p.livemode!==live||packId==='offer'&&p.offer_id!==pack.offerId||packId==='pass'&&p.pass_id!==pack.passId)return reply({error:'Start a new purchase request.'},409);
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
 }catch(e){console.error('Checkout failed',e?.code??e?.name);return reply({error:'Checkout is unavailable. Please try again later.'},503);}
});
