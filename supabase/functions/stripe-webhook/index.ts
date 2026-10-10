import Stripe from 'npm:stripe@22.4.0';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {validatePaidSession,UUID} from './payments.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 const secret=Deno.env.get('STRIPE_WEBHOOK_SECRET')?.trim(),key=Deno.env.get('STRIPE_SECRET_KEY')?.trim();
 if(!secret||!key)return reply({error:'Webhook configuration is incomplete.'},503);
 const signature=req.headers.get('stripe-signature');if(!signature)return reply({error:'Signature required.'},400);
 const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
 const raw=await req.text();if(raw.length>1048576)return reply({error:'Payload too large.'},413);
 let event;try{event=await stripe.webhooks.constructEventAsync(raw,signature,secret,300,Stripe.createSubtleCryptoProvider());}catch{return reply({error:'Invalid signature.'},400);}
 // A Stripe page that ended unpaid (10 Oct 2026): expired after its 24 hours, or a bank payment that failed afterwards. Its purchase becomes
 // 'expired', so the admin panel tells it from a page still open, and a Starter Pack, offer or pass can be started again. Only the pending
 // Stripe row this page belongs to: never a paid row, and never one that moved to Google Play or the App Store (whose sheet may be paying).
 if(event.type==='checkout.session.expired'||event.type==='checkout.session.async_payment_failed'){
  const ended=event.data.object;
  if(ended.metadata?.app!=='harvest-tycoon'||!UUID.test(ended.metadata?.purchase_id??''))return reply({received:true,ignored:true});
  // A page ended before its time was ended by diamond-checkout itself, when the farmer moved the purchase to an app store: that move
  // looks after the row, which may still be on its way there.
  if(event.type==='checkout.session.expired'&&Number(ended.expires_at)*1000>Date.now()+60000)return reply({received:true,ignored:true});
  const done=await admin.from('harvest_purchases').update({status:'expired'}).eq('id',ended.metadata.purchase_id).eq('stripe_session_id',ended.id).eq('store','stripe').eq('status','pending');
  if(done.error){console.error('Ending a checkout failed',event.id,done.error.code);return reply({error:'Checkout could not be ended yet. Retry this event.'},500);}
  return reply({received:true,ended:true});
 }
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return reply({received:true});
 const session=event.data.object;
 if(session.metadata?.app!=='harvest-tycoon')return reply({received:true,ignored:true});
 if(session.payment_status!=='paid')return reply({received:true,pending:true});
 try{
  const id=session.metadata.purchase_id;if(!UUID.test(id??''))return reply({error:'Invalid purchase reference.'},400);
  const found=await admin.from('harvest_purchases').select('*').eq('id',id).maybeSingle();if(found.error)throw found.error;if(!found.data)throw new Error('Unknown purchase');
  const items=await stripe.checkout.sessions.listLineItems(session.id,{limit:2});
  const payment=validatePaidSession(session,found.data,items);
  if(event.livemode!==session.livemode)throw new Error('Event mode mismatch');
  const credited=await admin.rpc('harvest_credit_purchase',{p_purchase:id,p_session:session.id,p_payment:payment,p_event:event.id,p_livemode:event.livemode});
  if(credited.error)throw credited.error;return reply({received:true,...credited.data});
 }catch(e){console.error('Payment fulfillment failed',event.id,e?.code??e?.name);return reply({error:'Payment could not be recorded yet. Retry this event.'},500);}
});
