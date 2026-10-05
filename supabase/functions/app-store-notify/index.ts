import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {verifyAppleJws} from './app-store.js';
import {APPLE_BUNDLE,APPLE_TRANSACTION,UUID,checkApplePurchase} from './payments.js';
// App Store Server Notifications V2 (Oct 2026, the iPhone app 1.1): App Store Connect's Production and Sandbox URL both point here, and
// Apple posts whatever happens to a purchase. The notification and the transaction inside it are each checked as Apple signed them
// (game/app-store.js, the same check as diamond-checkout's apple_confirm), so no key is needed and nobody else can post one that counts:
// deployed with --no-verify-jwt, as play-voided (Apple sends no Authorization header).
// ONE_TIME_CHARGE: a second way to credit, for a purchase the app could not confirm (closed, no network); the row is the one named by
// the appAccountToken, and crediting is safe to repeat (harvest_credit_apple_purchase), so a notification Apple sends twice is harmless.
// REFUND: what the purchase gave is taken back (harvest_revoke_apple_purchases, status 'refunded': no revenue, no partner share), also
// safe to repeat. REFUND_REVERSED is only logged for now (rare; the owner can give the diamonds back by hand). CONSUMPTION_REQUEST (we
// share no consumption data), TEST and everything else: 200, nothing done. Apple retries a notification that did not get a 2xx for days
// (production only), so a bad signature (401) or a database error (500) gets another chance; what will never work (another app, a
// purchase that does not match its row) gets 200 and a line in the log.
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
// A notification is about 18 KB (the signed transaction rides inside it, with its own certificates).
const NOTIFICATION_MAX=65536;
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 let note,tx=null;
 try{
  const raw=await req.text();if(raw.length>NOTIFICATION_MAX)return reply({error:'Request too large.'},413);
  note=await verifyAppleJws(JSON.parse(raw)?.signedPayload);
  if(note.data?.signedTransactionInfo!=null)tx=await verifyAppleJws(note.data.signedTransactionInfo);
 }catch(e){console.error('App Store notification not verified',String(e?.message??'').slice(0,120));return reply({error:'Not signed by the App Store.'},401);}
 const type=String(note.notificationType??'');
 // The app sits in data (in appData, summary or externalPurchaseToken for kinds that do not concern a purchase).
 const bundle=note.data?.bundleId??note.appData?.bundleId??note.summary?.bundleId??note.externalPurchaseToken?.bundleId;
 if(bundle!==APPLE_BUNDLE||tx&&tx.bundleId!==APPLE_BUNDLE){console.error('App Store notification for another app',type);return reply({ignored:'another app'});}
 try{
  if(type==='ONE_TIME_CHARGE'&&tx){
   const id=String(tx.appAccountToken??'').toLowerCase();
   if(!UUID.test(id)){console.error('App Store purchase without a purchase row',tx.transactionId);return reply({ignored:'no purchase row'});}
   const row=await admin.from('harvest_purchases').select('*').eq('id',id).maybeSingle();if(row.error)throw row.error;
   if(!row.data){console.error('App Store purchase for an unknown row',id);return reply({ignored:'unknown purchase'});}
   // No farmer signed in here: the row's own (null for a deleted account, which is recorded without giving anything).
   let checked;
   try{checked=checkApplePurchase(tx,row.data,{product:tx.productId,player:row.data.player_id});}
   catch(e){console.error('App Store purchase mismatch',id,e?.message);return reply({ignored:'mismatch'});}
   if(checked.state==='revoked')return reply({ignored:'revoked'});
   const p=row.data;
   if(p.apple_transaction_id?p.apple_transaction_id!==checked.transaction:!['pending','expired'].includes(p.status)){console.error('App Store purchase for a row paid otherwise',id);return reply({ignored:'paid otherwise'});}
   const credited=await admin.rpc('harvest_credit_apple_purchase',{p_purchase:id,p_transaction:checked.transaction,p_original:checked.original,p_test:checked.test});if(credited.error)throw credited.error;
   return reply({credited:true,duplicate:Boolean(credited.data?.duplicate)});
  }
  if(type==='REFUND'&&tx){
   if(typeof tx.transactionId!=='string'||!APPLE_TRANSACTION.test(tx.transactionId))return reply({ignored:'no transaction'});
   const done=await admin.rpc('harvest_revoke_apple_purchases',{p_items:[{transaction:tx.transactionId,revokedAt:new Date(Number(tx.revocationDate)||Date.now()).toISOString()}]});if(done.error)throw done.error;
   return reply({...done.data});
  }
  if(type==='REFUND_REVERSED')console.error('App Store refund reversed (nothing given back automatically)',tx?.transactionId,String(tx?.appAccountToken??'').toLowerCase());
  return reply({ok:true});
 }catch(e){console.error('App Store notification failed',type,e?.code??e?.name,String(e?.message??'').slice(0,80));return reply({error:'Not processed.'},500);}
});
