import test from 'node:test';
import assert from 'node:assert/strict';
import {PAYMENT_PACKS,paymentPack,checkoutPack,validatePaidSession,livePaymentConfiguration} from '../game/payments.js';
test('live checkout accepts only a live server key and webhook secret and preserves the off switch',()=>{
 const key=['rk','live','fixture'].join('_'),secret=['whsec','fixture'].join('_');
 assert.deepEqual(livePaymentConfiguration(key,secret),{mode:'live',configured:true,enabled:true});
 assert.equal(livePaymentConfiguration(key,secret,'false').enabled,false);
 assert.equal(livePaymentConfiguration(key,secret,' FALSE ').enabled,false);
 assert.equal(livePaymentConfiguration(key,'','true').enabled,false);
 assert.equal(livePaymentConfiguration('',secret,'true').enabled,false);
 assert.equal(livePaymentConfiguration(['rk','test','fixture'].join('_'),secret,'true').enabled,false);
});
function fixture(){const pack=PAYMENT_PACKS['150'];return {
 purchase:{id:'purchase',player_id:'player',pack:'150',diamonds:150,amount_cents:199,price_id:pack.price,livemode:true,stripe_session_id:'cs_1'},
 session:{id:'cs_1',payment_status:'paid',status:'complete',mode:'payment',livemode:true,client_reference_id:'player',metadata:{purchase_id:'purchase',player_id:'player',app:'harvest-tycoon'},currency:'eur',amount_total:199,amount_subtotal:199,payment_intent:'pi_1'},
 items:{has_more:false,data:[{quantity:1,price:{id:pack.price}}]}
};}
test('paid checkout matches an authoritative purchase',()=>{const f=fixture();assert.equal(validatePaidSession(f.session,f.purchase,f.items),'pi_1');});
test('paid packs use the four verified price tiers in ascending order',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(PAYMENT_PACKS).filter(([id])=>id!=='starter').map(([id,p])=>[id,[p.diamonds,p.cents]])),{'150':[150,199],'500':[500,499],'1250':[1250,999],'3500':[3500,2499]});
});
test('pack selection does not allow arbitrary prices or inherited keys',()=>{for(const id of ['__proto__','constructor','1',50,null])assert.throws(()=>paymentPack(id));});
test('old checkout receipts remain valid while cached shop IDs select the latest pack',()=>{
 const pack=paymentPack('50'),f=fixture();f.purchase={...f.purchase,pack:'50',diamonds:50,price_id:pack.price};f.items.data[0].price.id=pack.price;
 assert.equal(validatePaidSession(f.session,f.purchase,f.items),'pi_1');assert.deepEqual(checkoutPack('50'),{id:'150',...PAYMENT_PACKS['150']});
});
for(const [field,value] of Object.entries({payment_status:'unpaid',status:'open',mode:'subscription',livemode:false,client_reference_id:'other',currency:'usd',amount_total:1,amount_subtotal:1,id:'cs_other',payment_intent:null}))test(`rejects invalid ${field}`,()=>{const f=fixture();f.session[field]=value;assert.throws(()=>validatePaidSession(f.session,f.purchase,f.items));});
test('rejects another player or purchase in metadata',()=>{for(const field of ['purchase_id','player_id','app']){const f=fixture();f.session.metadata[field]='other';assert.throws(()=>validatePaidSession(f.session,f.purchase,f.items));}});
test('rejects changed item, quantity, extra items or tampered diamond amount',()=>{for(const mutate of [f=>f.items.data[0].quantity=2,f=>f.items.data[0].price.id='price_other',f=>f.items.has_more=true,f=>f.items.data.push(f.items.data[0]),f=>f.purchase.diamonds=2000]){const f=fixture();mutate(f);assert.throws(()=>validatePaidSession(f.session,f.purchase,f.items));}});
