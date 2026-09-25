import Stripe from 'npm:stripe@22.4.0';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {PAYMENT_PACKS,checkoutPack,UUID,starterEligibility,livePaymentConfiguration} from './payments.js';
const origin='https://www.harvesttycoon.com';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
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
  const existingStarter=body.operation==='catalog'||body.pack==='starter'?await admin.from('harvest_purchases').select('*').eq('player_id',user.id).eq('pack','starter').eq('livemode',live).neq('status','expired').maybeSingle():null;
  if(existingStarter?.error)throw existingStarter.error;
  // The offer opens when the farm reaches level 14, where diamond boosts unlock: the server wrote that moment into the farm (farm-state.js stampStarterOffer).
  const offerRow=body.operation==='catalog'||body.pack==='starter'?await admin.from('player_farms').select('offer:state->starterOffer').eq('player_id',user.id).maybeSingle():null;
  if(offerRow?.error)throw offerRow.error;
  const starter=starterEligibility(offerRow?.data?.offer?.unlockedAt,['credited','test_paid'].includes(existingStarter?.data?.status));
  if(body.operation==='catalog')return reply({enabled,mode,serverNow:Date.now(),starter,packs:Object.entries(PAYMENT_PACKS).map(([id,p])=>({id,diamonds:p.diamonds,coins:p.coins??0,cents:p.cents,currency:'eur'}))});
  if(body.operation==='status'){
   if(!UUID.test(body.purchaseId??''))return reply({error:'Invalid purchase.'},400);
   const r=await admin.from('harvest_purchases').select('id,pack,coins,diamonds,status,livemode').eq('id',body.purchaseId).eq('player_id',user.id).maybeSingle();if(r.error)throw r.error;if(!r.data)return reply({error:'Purchase not found for this account.'},404);return reply(r.data);
  }
  if(body.operation!=='create')return reply({error:'Unknown request.'},400);
  if(!enabled)return reply({error:'Diamond purchases are not available yet.'},503);
  let pack;try{pack=checkoutPack(body.pack);}catch{return reply({error:'Choose a diamond pack.'},400);}
  const packId=pack.id;
  if(!UUID.test(body.requestId??''))return reply({error:'Invalid purchase request.'},400);
  if(packId==='starter'&&!starter.eligible)return reply({error:starter.claimed?'You have already received the Starter Pack.':'The Starter Pack opens when you reach level 14 and is then available for 7 days.'},409);
  const farm=await admin.from('player_farms').select('player_id').eq('player_id',user.id).maybeSingle();if(farm.error)throw farm.error;if(!farm.data)return reply({error:'Open your farm before buying diamonds.'},409);
  const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
  const priceId=pack.price;
  if(!priceId)return reply({error:'This pack has not been configured.'},503);
  const price=await stripe.prices.retrieve(priceId);
  if(!price.active||price.livemode!==live||price.currency!=='eur'||price.unit_amount!==pack.cents||price.type!=='one_time'||(live&&pack.product&&price.product!==pack.product))return reply({error:'This pack needs a pricing configuration update.'},503);
  const insert=await admin.from('harvest_purchases').insert({id:body.requestId,player_id:user.id,pack:packId,diamonds:pack.diamonds,coins:pack.coins??0,amount_cents:pack.cents,price_id:priceId,livemode:live,starter_expires_at:packId==='starter'?new Date(starter.expiresAt).toISOString():null});
  if(insert.error&&insert.error.code!=='23505')throw insert.error;
  let query=admin.from('harvest_purchases').select('*').eq('player_id',user.id);
  query=packId==='starter'?query.eq('pack','starter').eq('livemode',live).neq('status','expired'):query.eq('id',body.requestId);
  const found=await query.single();if(found.error)throw found.error;
  const p=found.data;if(p.pack!==packId||p.price_id!==priceId||p.livemode!==live)return reply({error:'Start a new purchase request.'},409);
  if(p.pack==='starter'&&Date.parse(p.created_at)>=starter.expiresAt)return reply({error:'The Starter Pack offer has ended.'},409);
  if(p.status!=='pending')return reply({error:'This purchase has already been processed.'},409);
  if(Date.now()-Date.parse(p.created_at)>23*3600000&&!p.stripe_session_id)return reply({error:'This checkout request needs review. Please contact support before retrying.'},409);
  const metadata={app:'harvest-tycoon',purchase_id:p.id,player_id:user.id};
  const session=p.stripe_session_id?await stripe.checkout.sessions.retrieve(p.stripe_session_id):await stripe.checkout.sessions.create({
   mode:'payment',line_items:[{price:priceId,quantity:1}],client_reference_id:user.id,metadata,
   payment_intent_data:{metadata},adaptive_pricing:{enabled:false},
   integration_identifier:'harvest_tycoon_xqbnrjka',
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
