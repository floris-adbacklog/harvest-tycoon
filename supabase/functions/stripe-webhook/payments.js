// Server-owned catalogue. Amounts are euro cents, never supplied by the browser.
export const PAYMENT_PACKS=Object.freeze({
 '150':{diamonds:150,cents:199,price:'price_1UH4KQ04FdNTUSp4MBiogXx1'},
 '500':{diamonds:500,cents:499,price:'price_1UI5oE04FdNTUSp4F2BP95IK'},
 '1250':{diamonds:1250,cents:999,price:'price_1UH5Gv04FdNTUSp4kabIfp0Y'},
 '3500':{diamonds:3500,cents:2499,price:'price_1UH5HL04FdNTUSp41DLz2C1B'},
 starter:{diamonds:300,coins:10000,cents:299,product:'prod_VHfWRMcedF9ShZ',price:'price_1UH6BG04FdNTUSp4Mg5Zl4pD'}
});
// Keep validating checkouts that were opened before the doubled packs went live.
// These packs are receipt-only and are never returned by the catalogue endpoint.
const LEGACY_PAYMENT_PACKS=Object.freeze({
 '100':{diamonds:100,cents:199,price:'price_1UH4KQ04FdNTUSp4MBiogXx1'},
 '600':{diamonds:600,cents:999,price:'price_1UH5Gv04FdNTUSp4kabIfp0Y'},
 '2000':{diamonds:2000,cents:2499,price:'price_1UH5HL04FdNTUSp41DLz2C1B'},
 '50':{diamonds:50,cents:199,price:'price_1UH4KQ04FdNTUSp4MBiogXx1'},
 '300':{diamonds:300,cents:999,price:'price_1UH5Gv04FdNTUSp4kabIfp0Y'},
 '1000':{diamonds:1000,cents:2499,price:'price_1UH5HL04FdNTUSp41DLz2C1B'}
});
const RECEIPT_PACKS=Object.freeze({...LEGACY_PAYMENT_PACKS,...PAYMENT_PACKS});
const CHECKOUT_PACK_ALIASES=Object.freeze({'50':'150','100':'150','300':'1250','600':'1250','1000':'3500','2000':'3500'});
export const STARTER_WINDOW=72*60*60*1000;
// This deployed storefront is live. Keep an explicit emergency off switch.
export function livePaymentConfiguration(key,webhookSecret,enabledFlag){
 const configured=/^[rs]k_live_/.test((key??'').trim())&&Boolean((webhookSecret??'').trim());
 return {mode:'live',configured,enabled:configured&&String(enabledFlag??'').trim().toLowerCase()!=='false'};
}
// The welcome offer opens when the farm reaches the level where diamond boosts unlock (STARTER_LEVEL, 14; the server stamps that moment in
// the farm, farm-state.js) and lasts 72 hours. No moment (a farm below that level, or one that was past it long before this rule: 0) means no offer.
export function starterEligibility(openedAt,claimed=false,now=Date.now()){
 const start=typeof openedAt==='number'?openedAt:Date.parse(openedAt),expiresAt=start+STARTER_WINDOW,opened=Number.isFinite(start)&&start>0;
 return {eligible:opened&&now>=start&&now<expiresAt&&!claimed,expiresAt:opened?expiresAt:0,claimed};
}
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function paymentPack(id){if(typeof id!=='string'||!Object.hasOwn(RECEIPT_PACKS,id))throw new Error('Choose a diamond pack.');return RECEIPT_PACKS[id];}
export function checkoutPack(id){
 if(typeof id!=='string')throw new Error('Choose a diamond pack.');
 const activeId=Object.hasOwn(CHECKOUT_PACK_ALIASES,id)?CHECKOUT_PACK_ALIASES[id]:id;
 if(typeof activeId!=='string'||!Object.hasOwn(PAYMENT_PACKS,activeId))throw new Error('Choose a diamond pack.');
 return {id:activeId,...PAYMENT_PACKS[activeId]};
}
export function validatePaidSession(session,purchase,items){
 const pack=paymentPack(purchase.pack);
 if(session.payment_status!=='paid'||session.status!=='complete')throw new Error('Payment is not complete.');
 if(session.mode!=='payment'||session.livemode!==purchase.livemode)throw new Error('Payment mode mismatch.');
 if(session.id!==purchase.stripe_session_id||session.client_reference_id!==purchase.player_id||session.metadata?.purchase_id!==purchase.id||session.metadata?.player_id!==purchase.player_id||session.metadata?.app!=='harvest-tycoon')throw new Error('Purchase ownership mismatch.');
 if(session.currency!=='eur'||session.amount_total!==purchase.amount_cents||session.amount_subtotal!==purchase.amount_cents||purchase.amount_cents!==pack.cents||purchase.diamonds!==pack.diamonds)throw new Error('Payment amount mismatch.');
 if((purchase.coins??0)!==(pack.coins??0))throw new Error('Coin reward mismatch.');
 if(purchase.price_id!==pack.price||items.has_more||items.data?.length!==1||items.data[0].quantity!==1||items.data[0].price?.id!==purchase.price_id)throw new Error('Payment items mismatch.');
 if(typeof session.payment_intent!=='string'||!session.payment_intent.startsWith('pi_'))throw new Error('Missing payment reference.');
 return session.payment_intent;
}
