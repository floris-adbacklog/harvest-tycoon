// Server-owned catalogue. Amounts are euro cents, never supplied by the browser.
export const PAYMENT_PACKS=Object.freeze({
 '150':{diamonds:150,cents:199,price:'price_1UH4KQ04FdNTUSp4MBiogXx1'},
 '500':{diamonds:500,cents:499,price:'price_1UI5oE04FdNTUSp4F2BP95IK'},
 '1250':{diamonds:1250,cents:999,price:'price_1UH5Gv04FdNTUSp4kabIfp0Y'},
 '3500':{diamonds:3500,cents:2499,price:'price_1UH5HL04FdNTUSp41DLz2C1B'},
 // 27 Sep 2026: 500 diamonds instead of 300, as many as the €4.99 pack, so the value line is plain (src/starter-pack-ui.js).
 starter:{diamonds:500,coins:10000,cents:299,product:'prod_VHfWRMcedF9ShZ',price:'price_1UH6BG04FdNTUSp4Mg5Zl4pD'}
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
// The special offer (29 Sep 2026): the admin puts together diamonds, coins and/or VIP time worth €49.99 at the shop's own prices,
// sold once per farmer for €4.99 (90% off), one offer at a time. Worth: a diamond as in the €4.99 pack (500 for €4.99), coins at 200
// for a diamond (the admin's rate; coins are never sold), VIP at its price in diamonds (VIP_PLANS in farm-state.js). The server
// takes the contents from the offer itself, never from the browser, and the "worth" line is always this sum.
export const OFFER=Object.freeze({cents:499,valueCents:4999,price:'price_1UL3qr04FdNTUSp41m7H0DCp',coinsPerDiamond:200,
 diamondCents:499/500,vipDiamonds:Object.freeze({7:500,30:1500,60:3000,90:4500}),target:5000,maxDiamonds:20000,maxCoins:10000000});
// What an offer is worth, in euro cents at the shop's prices.
export function offerValueCents({diamonds=0,coins=0,vipDays=0}={}){
 return Math.round((Number(diamonds)+Number(coins)/OFFER.coinsPerDiamond+(OFFER.vipDiamonds[vipDays]??0))*OFFER.diamondCents);
}
// VIP of 60 or 90 days (30 Sep 2026) is two or three of the shop's 30-day plan.
// A valid offer: whole amounts, VIP of 7, 30, 60 or 90 days or none, something in it, and worth €49.99 (within 2%, so round numbers fit).
export function offerProblem({diamonds=0,coins=0,vipDays=0}={}){
 if(![diamonds,coins,vipDays].every(Number.isInteger))return 'Use whole numbers.';
 if(diamonds<0||diamonds>OFFER.maxDiamonds||coins<0||coins>OFFER.maxCoins||!Object.hasOwn(OFFER.vipDiamonds,vipDays)&&vipDays!==0)return 'Choose amounts within the limits.';
 if(!diamonds&&!coins&&!vipDays)return 'Put something in the offer.';
 const value=offerValueCents({diamonds,coins,vipDays});
 if(Math.abs(value-OFFER.valueCents)>OFFER.valueCents*0.02)return `The offer must be worth €49.99; it is worth €${(value/100).toFixed(2)}.`;
 return null;
}
// The amounts that make €49.99 for the kinds chosen: VIP takes its share, diamonds and coins split the rest evenly.
export function offerFill({diamonds=false,coins=false,vipDays=0}={}){
 const rest=OFFER.target-(OFFER.vipDiamonds[vipDays]??0);
 if(!diamonds&&!coins)return {diamonds:0,coins:0,vipDays};
 const d=diamonds?(coins?Math.round(rest/2/50)*50:rest):0;
 return {diamonds:d,coins:coins?(rest-d)*OFFER.coinsPerDiamond:0,vipDays};
}
// The Halloween Pass (Oct 2026): the paid row of the season pass (game/farm-state.js SEASON_PASS), €4.99, once per farmer per pass, from
// level 10. The dates are the game's own (a test keeps the two equal). Nothing is credited at once: the purchase writes the pass into the
// farm (state.passPremium, supabase/season-pass.sql) and every paid reward is collected in the game. The Stripe product 'Halloween Pass'
// since 2 Oct 2026 (checkout checks that its price is a one-time €4.99); without a price, checkout says it is not available.
export const PASS=Object.freeze({id:'halloween-2026',name:'Halloween Pass',cents:499,price:'price_1ULzBo04FdNTUSp4ncaXGr2m',product:'prod_VMidVtFUFBIZTw',
 startsAt:Date.UTC(2026,9,23),endsAt:Date.UTC(2026,10,3),level:10});
// On sale already before the season opens (the pre-sale, Oct 2026: bought during the preview, it opens with the season), until it ends.
export const passOnSale=(now=Date.now())=>now<PASS.endsAt;
// Why a farmer cannot start a pass checkout, or null (diamond-checkout): the season over, no Stripe price, below its level, or bought.
export function passCheckoutProblem({level=1,owned=false,now=Date.now(),price=PASS.price}={}){
 if(!passOnSale(now))return {error:`The ${PASS.name} has ended.`,status:409};
 if(!price)return {error:`The ${PASS.name} is not available yet.`,status:503};
 if(!(level>=PASS.level))return {error:`The ${PASS.name} opens at level ${PASS.level}.`,status:409};
 if(owned)return {error:`You already have the ${PASS.name}.`,status:409};
 return null;
}
const RECEIPT_PACKS=Object.freeze({...LEGACY_PAYMENT_PACKS,...PAYMENT_PACKS,offer:Object.freeze({cents:OFFER.cents,price:OFFER.price,offer:true}),
 pass:Object.freeze({cents:PASS.cents,price:PASS.price,diamonds:0,pass:true})});
const CHECKOUT_PACK_ALIASES=Object.freeze({'50':'150','100':'150','300':'1250','600':'1250','1000':'3500','2000':'3500'});
// A Starter Pack checkout opened before 27 Sep 2026 held 300 diamonds; paid later, it still counts, and credits the 300 it showed.
export const STARTER_DIAMONDS_BEFORE=300;
export const STARTER_WINDOW=7*24*60*60*1000;
// This deployed storefront is live. Keep an explicit emergency off switch.
export function livePaymentConfiguration(key,webhookSecret,enabledFlag){
 const configured=/^[rs]k_live_/.test((key??'').trim())&&Boolean((webhookSecret??'').trim());
 return {mode:'live',configured,enabled:configured&&String(enabledFlag??'').trim().toLowerCase()!=='false'};
}
// The welcome offer opens when the farm reaches the level where diamond boosts unlock (STARTER_LEVEL, 14; the server stamps that moment in
// the farm, farm-state.js) and lasts 7 days. No moment (a farm below that level, or one that was past it long before this rule: 0) means no offer.
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
 // A special offer's contents come from the offer, written into the purchase by the checkout: they must still make a valid offer.
 if(pack.offer&&(typeof purchase.offer_id!=='string'||!UUID.test(purchase.offer_id)||offerProblem({diamonds:purchase.diamonds,coins:purchase.coins??0,vipDays:purchase.vip_days??0})))throw new Error('Offer mismatch.');
 // A pass carries no diamonds or coins of its own, only the pass it opens.
 if(pack.pass&&(purchase.pass_id!==PASS.id||purchase.diamonds!==0||(purchase.coins??0)!==0))throw new Error('Pass mismatch.');
 if(session.payment_status!=='paid'||session.status!=='complete')throw new Error('Payment is not complete.');
 if(session.mode!=='payment'||session.livemode!==purchase.livemode)throw new Error('Payment mode mismatch.');
 // A purchase of a deleted account (3 Oct 2026, supabase/delete-account.sql) has no farmer left to compare: the checkout and purchase id
 // still tie them, and harvest_credit_purchase records the payment for a refund without crediting anything.
 const owner=purchase.player_id===null&&purchase.account_deleted_at?session.client_reference_id:purchase.player_id;
 if(session.id!==purchase.stripe_session_id||session.client_reference_id!==owner||session.metadata?.purchase_id!==purchase.id||session.metadata?.player_id!==owner||session.metadata?.app!=='harvest-tycoon')throw new Error('Purchase ownership mismatch.');
 if(session.currency!=='eur'||session.amount_total!==purchase.amount_cents||session.amount_subtotal!==purchase.amount_cents||purchase.amount_cents!==pack.cents||!pack.offer&&purchase.diamonds!==pack.diamonds&&!(purchase.pack==='starter'&&purchase.diamonds===STARTER_DIAMONDS_BEFORE))throw new Error('Payment amount mismatch.');
 if(!pack.offer&&(purchase.coins??0)!==(pack.coins??0))throw new Error('Coin reward mismatch.');
 if(purchase.price_id!==pack.price||items.has_more||items.data?.length!==1||items.data[0].quantity!==1||items.data[0].price?.id!==purchase.price_id)throw new Error('Payment items mismatch.');
 if(typeof session.payment_intent!=='string'||!session.payment_intent.startsWith('pi_'))throw new Error('Missing payment reference.');
 return session.payment_intent;
}
// Google Play (Oct 2026): the Android app (1.1 on) sells the same packs through Google Play, each a one-time product of its own in Play
// Console at the same euro price (Google converts it for other countries and keeps 15%). A Play purchase is the same row as a Stripe
// checkout (store 'google_play', price_id = the product), so the admin panel, the partners' 25% and account deletion count it as one.
// The server checks every purchase with Google (diamond-checkout play_confirm, game/google-play.js) before crediting it, then consumes it.
export const PLAY_PACKAGE='com.harvesttycoon.app';
export const PLAY_PRODUCTS=Object.freeze({'150':'diamonds_150','500':'diamonds_500','1250':'diamonds_1250','3500':'diamonds_3500',
 starter:'starter_pack',offer:'special_offer',pass:'halloween_pass_2026'});
export const PLAY_PRODUCT=/^[a-z0-9][a-z0-9_.]{0,39}$/;
export const PLAY_TOKEN=/^[A-Za-z0-9._-]{20,1024}$/;
export const playProduct=pack=>typeof pack==='string'&&Object.hasOwn(PLAY_PRODUCTS,pack)?PLAY_PRODUCTS[pack]:null;
// What Google says about a purchase (purchases.products.get) against its row: state 'purchased' (credit it), 'pending' (a payment still
// on its way, such as cash at a shop) or 'cancelled'; test: a licence tester's test purchase, a promo code or a reward, no money, so it is
// recorded as test_paid and credits nothing (as a Stripe test payment). Anything that does not belong to this row and farmer throws.
export function checkPlayPurchase(google,purchase,{product,player}){
 if(!google||google.kind!=='androidpublisher#productPurchase')throw new Error('Unknown Google Play purchase.');
 if(!purchase||playProduct(purchase.pack)!==product)throw new Error('Product mismatch.');
 if(typeof player!=='string'||google.obfuscatedExternalAccountId!==player||purchase.player_id!==player)throw new Error('Purchase ownership mismatch.');
 if(google.obfuscatedExternalProfileId!==purchase.id)throw new Error('Purchase reference mismatch.');
 if((google.quantity??1)!==1)throw new Error('Quantity mismatch.');
 const pack=paymentPack(purchase.pack);
 if(pack.offer&&(typeof purchase.offer_id!=='string'||!UUID.test(purchase.offer_id)||offerProblem({diamonds:purchase.diamonds,coins:purchase.coins??0,vipDays:purchase.vip_days??0})))throw new Error('Offer mismatch.');
 if(pack.pass&&(purchase.pass_id!==PASS.id||purchase.diamonds!==0||(purchase.coins??0)!==0))throw new Error('Pass mismatch.');
 if(purchase.amount_cents!==pack.cents||!pack.offer&&purchase.diamonds!==pack.diamonds||!pack.offer&&(purchase.coins??0)!==(pack.coins??0))throw new Error('Payment amount mismatch.');
 const state=google.purchaseState===0?'purchased':google.purchaseState===2?'pending':'cancelled';
 return {state,test:google.purchaseType!=null,order:typeof google.orderId==='string'&&google.orderId?google.orderId.slice(0,100):null};
}
