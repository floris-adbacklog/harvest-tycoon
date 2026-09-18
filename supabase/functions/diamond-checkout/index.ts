import Stripe from 'npm:stripe@22.4.0';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {PAYMENT_PACKS,paymentPack,UUID} from './payments.js';
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
  const key=Deno.env.get('STRIPE_SECRET_KEY')??'',mode=Deno.env.get('STRIPE_MODE')??'test',live=mode==='live';
  const configured=['live','test'].includes(mode)&&new RegExp(`^[rs]k_${mode}_`).test(key)&&!!Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const enabled=configured&&Deno.env.get('PAYMENTS_ENABLED')==='true';
  if(body.operation==='catalog')return reply({enabled,mode,packs:Object.entries(PAYMENT_PACKS).map(([id,p])=>({id,diamonds:p.diamonds,cents:p.cents,currency:'eur'}))});
  if(body.operation==='status'){
   if(!UUID.test(body.purchaseId??''))return reply({error:'Invalid purchase.'},400);
   const r=await admin.from('harvest_purchases').select('id,diamonds,status,livemode').eq('id',body.purchaseId).eq('player_id',user.id).maybeSingle();if(r.error)throw r.error;if(!r.data)return reply({error:'Purchase not found for this account.'},404);return reply(r.data);
  }
  if(body.operation!=='create')return reply({error:'Unknown request.'},400);
  if(!enabled)return reply({error:'Diamond purchases are not available yet.'},503);
  let pack;try{pack=paymentPack(body.pack);}catch{return reply({error:'Choose a diamond pack.'},400);}
  if(!UUID.test(body.requestId??''))return reply({error:'Invalid purchase request.'},400);
  const farm=await admin.from('player_farms').select('player_id').eq('player_id',user.id).maybeSingle();if(farm.error)throw farm.error;if(!farm.data)return reply({error:'Open your farm before buying diamonds.'},409);
  const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
  const priceId=live?pack.price:Deno.env.get(`STRIPE_TEST_PRICE_${body.pack}`);
  if(!priceId)return reply({error:'This test pack has not been configured.'},503);
  const price=await stripe.prices.retrieve(priceId);
  if(!price.active||price.livemode!==live||price.currency!=='eur'||price.unit_amount!==pack.cents||price.type!=='one_time')return reply({error:'This pack needs a pricing configuration update.'},503);
  const insert=await admin.from('harvest_purchases').insert({id:body.requestId,player_id:user.id,pack:body.pack,diamonds:pack.diamonds,amount_cents:pack.cents,price_id:priceId,livemode:live});
  if(insert.error&&insert.error.code!=='23505')throw insert.error;
  const found=await admin.from('harvest_purchases').select('*').eq('id',body.requestId).eq('player_id',user.id).single();if(found.error)throw found.error;
  const p=found.data;if(p.pack!==body.pack||p.price_id!==priceId||p.livemode!==live)return reply({error:'Start a new purchase request.'},409);
  if(p.status!=='pending')return reply({error:'This purchase has already been processed.'},409);
  if(Date.now()-Date.parse(p.created_at)>1800000)return reply({error:'This checkout request expired. Close the shop and try again.'},409);
  const metadata={app:'harvest-tycoon',purchase_id:p.id,player_id:user.id};
  const session=p.stripe_session_id?await stripe.checkout.sessions.retrieve(p.stripe_session_id):await stripe.checkout.sessions.create({
   mode:'payment',line_items:[{price:priceId,quantity:1}],client_reference_id:user.id,metadata,
   payment_intent_data:{metadata},adaptive_pricing:{enabled:false},
   integration_identifier:'harvest_tycoon_xqbnrjka',
   success_url:`${origin}/play.html?purchase=${p.id}`,cancel_url:`${origin}/play.html?purchase=${p.id}&checkout=cancelled`
  },{idempotencyKey:`harvest-${live?'live':'test'}-${p.id}`});
  if(!session.url||session.status!=='open')return reply({error:'This checkout has ended. Close the shop and try again.'},409);
  const saved=await admin.from('harvest_purchases').update({stripe_session_id:session.id}).eq('id',p.id).eq('player_id',user.id);if(saved.error)throw saved.error;
  return reply({url:session.url,purchaseId:p.id});
 }catch(e){console.error('Checkout failed',e?.code??e?.name);return reply({error:'Checkout is unavailable. Please try again later.'},503);}
});
