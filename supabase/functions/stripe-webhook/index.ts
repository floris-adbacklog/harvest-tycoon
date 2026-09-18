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
