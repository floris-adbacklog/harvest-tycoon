// Server-owned catalogue. Amounts are euro cents, never supplied by the browser.
export const PAYMENT_PACKS=Object.freeze({
 '50':{diamonds:50,cents:199,price:'price_1UH4KQ04FdNTUSp4MBiogXx1'},
 '300':{diamonds:300,cents:999,price:'price_1UH5Gv04FdNTUSp4kabIfp0Y'},
 '1000':{diamonds:1000,cents:2499,price:'price_1UH5HL04FdNTUSp41DLz2C1B'},
 starter:{diamonds:300,coins:10000,cents:299,product:'prod_VHfWRMcedF9ShZ',price:'price_1UH6BG04FdNTUSp4Mg5Zl4pD'}
});
export const STARTER_WINDOW=72*60*60*1000;
export function starterEligibility(createdAt,claimed=false,now=Date.now()){
 const start=Date.parse(createdAt),expiresAt=start+STARTER_WINDOW;
 return {eligible:Number.isFinite(start)&&now>=start&&now<expiresAt&&!claimed,expiresAt:Number.isFinite(expiresAt)?expiresAt:0,claimed};
}
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function paymentPack(id){if(typeof id!=='string'||!Object.hasOwn(PAYMENT_PACKS,id))throw new Error('Choose a diamond pack.');return PAYMENT_PACKS[id];}
export function validatePaidSession(session,purchase,items){
 const pack=paymentPack(purchase.pack);
 if(session.payment_status!=='paid'||session.status!=='complete')throw new Error('Payment is not complete.');
 if(session.mode!=='payment'||session.livemode!==purchase.livemode)throw new Error('Payment mode mismatch.');
 if(session.id!==purchase.stripe_session_id||session.client_reference_id!==purchase.player_id||session.metadata?.purchase_id!==purchase.id||session.metadata?.player_id!==purchase.player_id||session.metadata?.app!=='harvest-tycoon')throw new Error('Purchase ownership mismatch.');
 if(session.currency!=='eur'||session.amount_total!==purchase.amount_cents||session.amount_subtotal!==purchase.amount_cents||purchase.amount_cents!==pack.cents||purchase.diamonds!==pack.diamonds)throw new Error('Payment amount mismatch.');
 if((purchase.coins??0)!==(pack.coins??0))throw new Error('Coin reward mismatch.');
 if(items.has_more||items.data?.length!==1||items.data[0].quantity!==1||items.data[0].price?.id!==purchase.price_id)throw new Error('Payment items mismatch.');
 if(typeof session.payment_intent!=='string'||!session.payment_intent.startsWith('pi_'))throw new Error('Missing payment reference.');
 return session.payment_intent;
}
