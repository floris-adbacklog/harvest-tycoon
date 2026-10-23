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
// The special offer (29 Sep 2026): the admin puts together diamonds, coins and/or VIP time at the shop's own prices, sold once per
// farmer for €4.99, one offer at a time. Worth: a diamond as in the €4.99 pack (500 for €4.99), coins at 500 for a diamond
// (coinsPerDiamond; never sold for money on their own), VIP at its price in diamonds (VIP_PLANS in farm-state.js). The server takes the
// contents from the offer itself, never from the browser, and the "worth" line is always this sum.
// How much is in it (21 Oct 2026, the owner: "kiezen uit 33%, 50% of 90% korting"): the price stays €4.99 (the same store product
// everywhere), the admin picks the discount and the contents follow it: worth €49.99 at 90% (as before), €9.98 at 50%, €7.45 at 33%
// (OFFER.discounts: valueCents is the worth checked, target the diamonds the Admin panel fills to). Nothing stores the discount: an
// offer is valid when its worth is within 2% of one of the three (the bands never overlap), the same rule in SQL offer_post
// (supabase/offer-discount.sql), and the screens show the round worth of that discount (offerShownCents: €50, €10, €7.50), so the discount follows from that.
// The admin picks the level it opens at per offer: level 10 at the earliest (minLevel, 13 Oct 2026; level 14 before, as the shop and
// boosts open at 10 since 5 Oct), 14 unless the admin picks another (defaultLevel), up to 200 (supabase/offer-level-10.sql). The
// Starter Pack keeps its own level 14 (STARTER_LEVEL).
// coinsPerDiamond: 500 since 20 Oct 2026 (the owner: "1 diamond = 500 coins"); it was 200 (coinsPerDiamondBefore). No offer was running
// when it changed, but a purchase begun earlier can still be paid: paidOfferProblem takes either rate. supabase/offer-coins-500.sql sets
// the same rate in offer_post. (The coin pack in Power-ups has its own rule, game/farm-state.js COIN_PACK.)
export const OFFER=Object.freeze({cents:499,valueCents:4999,price:'price_1UL3qr04FdNTUSp41m7H0DCp',coinsPerDiamond:500,coinsPerDiamondBefore:200,
 diamondCents:499/500,vipDiamonds:Object.freeze({7:500,30:1500,60:3000,90:4500}),target:5000,maxDiamonds:20000,maxCoins:10000000,
 minLevel:10,defaultLevel:14,maxLevel:200,
 discounts:Object.freeze({90:Object.freeze({valueCents:4999,target:5000,shownCents:5000}),50:Object.freeze({valueCents:998,target:1000,shownCents:1000}),33:Object.freeze({valueCents:745,target:750,shownCents:750})}),
 defaultDiscount:90});
// The discounts, largest first (90, 50, 33).
export const OFFER_DISCOUNTS=Object.freeze(Object.keys(OFFER.discounts).map(Number).sort((a,b)=>b-a));
// What an offer is worth, in euro cents at the shop's prices.
export function offerValueCents({diamonds=0,coins=0,vipDays=0}={},coinsPerDiamond=OFFER.coinsPerDiamond){
 return Math.round((Number(diamonds)+Number(coins)/coinsPerDiamond+(OFFER.vipDiamonds[vipDays]??0))*OFFER.diamondCents);
}
// The discount an offer of this worth was made at (90, 50 or 33), or null when it is worth none of them (within 2%).
export const offerDiscountOf=value=>OFFER_DISCOUNTS.find(d=>Math.abs(value-OFFER.discounts[d].valueCents)<=OFFER.discounts[d].valueCents*0.02)??null;
// The worth players see (21 Oct 2026, the owner: "Doe toch ronde getallen", "dus €50, €10 of €7.50"): the round worth of the discount
// the offer was made at (shownCents: €50, €10 or €7.50), not the sum of its contents (5,000 diamonds add up to €49.90); the sum when it
// fits none of them. The discount on the window still comes out at 90%, 50% and 33% (€4.99 against those).
export function offerShownCents(contents){const value=offerValueCents(contents),d=offerDiscountOf(value);return d==null?value:OFFER.discounts[d].shownCents;}
const offerWorths=()=>OFFER_DISCOUNTS.slice().reverse().map(d=>`€${(OFFER.discounts[d].valueCents/100).toFixed(2)}`);
// VIP of 60 or 90 days (30 Sep 2026) is two or three of the shop's 30-day plan.
// A valid offer: whole amounts, VIP of 7, 30, 60 or 90 days or none, something in it, and worth €7.45, €9.98 or €49.99 (within 2%, so
// round numbers fit).
export function offerProblem({diamonds=0,coins=0,vipDays=0}={},coinsPerDiamond=OFFER.coinsPerDiamond){
 if(![diamonds,coins,vipDays].every(Number.isInteger))return 'Use whole numbers.';
 if(diamonds<0||diamonds>OFFER.maxDiamonds||coins<0||coins>OFFER.maxCoins||!Object.hasOwn(OFFER.vipDiamonds,vipDays)&&vipDays!==0)return 'Choose amounts within the limits.';
 if(!diamonds&&!coins&&!vipDays)return 'Put something in the offer.';
 const value=offerValueCents({diamonds,coins,vipDays},coinsPerDiamond);
 if(offerDiscountOf(value)==null){const w=offerWorths();return `The offer must be worth ${w.slice(0,-1).join(', ')} or ${w.at(-1)}; it is worth €${(value/100).toFixed(2)}.`;}
 return null;
}
// A paid offer (a checkout, a Google Play or Kongregate purchase) may come from an offer made at 200 coins a diamond, before 20 Oct 2026:
// a farmer who paid for it later still gets it. Its contents come from the offer row, never from the browser.
export const paidOfferProblem=purchase=>{const contents={diamonds:purchase.diamonds,coins:purchase.coins??0,vipDays:purchase.vip_days??0};
 return offerProblem(contents)&&offerProblem(contents,OFFER.coinsPerDiamondBefore);};
// The VIP lengths that fit an offer at this discount: VIP worth less than the whole offer, so diamonds or coins fill the rest (at 33% and
// 50% only 7 days; 30 days alone is already worth €14.97).
export const offerVipFits=(vipDays,discount=OFFER.defaultDiscount)=>!vipDays||(OFFER.vipDiamonds[vipDays]??Infinity)<(OFFER.discounts[discount]??OFFER.discounts[OFFER.defaultDiscount]).target;
// The amounts that make the worth of the discount chosen for the kinds chosen: VIP takes its share, diamonds and coins split the rest
// evenly. VIP that does not fit the discount (offerVipFits) leaves both at 0, which is no valid offer.
export function offerFill({diamonds=false,coins=false,vipDays=0,discount=OFFER.defaultDiscount}={}){
 const target=(OFFER.discounts[discount]??OFFER.discounts[OFFER.defaultDiscount]).target;
 const rest=target-(OFFER.vipDiamonds[vipDays]??0);
 if(!diamonds&&!coins||rest<=0)return {diamonds:0,coins:0,vipDays};
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
// The Season Pass (Oct 2026 on; plan-farmpas/plan.md §8): the paid row of the season that runs, €19.99 once per season, never a
// subscription. One product in every store, made once by the owner (Stripe 'Season Pass', Google Play and Kongregate 'season_pass'); the
// server ties each purchase to the season running at checkout (pack 'season', pass_id the season's id: 'autumn-2026'), so nothing changes
// in a store from one season to the next. On sale while the season is open (not in its preview or collecting week), from level 20 (the
// free row opens at 10). A second purchase in the same season is refused before checkout (seasonCheckoutProblem, the catalogue says
// owned) and by a unique index (supabase/season-pass-engine.sql). Crediting adds the season's id to state.passPremium; the rewards are
// collected in the game (game/farm-state.js claimSeasonTier). The dates are the game's (SEASONS in farm-state.js; a test keeps them equal):
// startsAt null until the owner says go. CrazyGames and Discord sell nothing (only the free row); the iPhone app does not sell it either
// (APPLE_SELLS_SEASON_PASS, below): the owner made no App Store product (20 Oct 2026).
// The pre-sale (21 Oct 2026, the owner: "zet hem alvast helemaal onder herfst pass dat die eraan komt, je kan hem al kopen, start na
// 22 dec"): a season with saleFrom is on sale from then until its end, also before its start (Winter 2026 while Autumn runs). The
// checkout then names the season it is for (body.season: its id), and the purchase row keeps that id (pass_id), so a Winter purchase
// always credits Winter and an Autumn one Autumn (supabase/season-pass-engine.sql harvest_season_target). A checkout without a season
// (a page from before the pre-sale) buys the season open now, as before.
export const SEASON_SALE=Object.freeze({name:'Season Pass',cents:1999,level:20,product:'prod_VTg71Dn0njkTPI',price:'price_1USilO04FdNTUSp4FI12JA9l',
 seasons:Object.freeze([Object.freeze({id:'autumn-2026',name:'Autumn 2026',startsAt:Date.UTC(2026,9,21),endsAt:Date.UTC(2026,11,22),claimUntil:Date.UTC(2026,11,29)}),
  Object.freeze({id:'winter-2026',name:'Winter 2026',saleFrom:Date.UTC(2026,9,21),startsAt:Date.UTC(2026,11,22),endsAt:Date.UTC(2027,2,21),claimUntil:Date.UTC(2027,2,28)})])});
export const seasonSale=id=>SEASON_SALE.seasons.find(s=>s.id===id)??null;
// The season on sale now (open: its start reached, its end not), or null.
export const seasonOnSale=(now=Date.now(),seasons=SEASON_SALE.seasons)=>seasons.find(s=>s.startsAt!=null&&now>=s.startsAt&&now<s.endsAt)??null;
// Every season on sale now: the open one, and one in its pre-sale (from saleFrom until its start).
export const seasonsOnSale=(now=Date.now(),seasons=SEASON_SALE.seasons)=>seasons.filter(s=>s.startsAt!=null&&now>=(s.saleFrom??s.startsAt)&&now<s.endsAt);
// The season a checkout buys: the one it names, when that one is on sale now; without a name the season open now. null: none.
export const seasonForCheckout=(id,now=Date.now(),seasons=SEASON_SALE.seasons)=>id==null?seasonOnSale(now,seasons):typeof id==='string'?seasonsOnSale(now,seasons).find(s=>s.id===id)??null:null;
// Why a farmer cannot start a Season Pass checkout, or null (diamond-checkout). season: the id the checkout names (none: the open one).
export function seasonCheckoutProblem({level=1,owned=false,now=Date.now(),price=SEASON_SALE.price,seasons=SEASON_SALE.seasons,season}={}){
 if(!seasonForCheckout(season,now,seasons))return {error:'The Season Pass is not on sale right now.',status:409};
 if(!price)return {error:'The Season Pass is not available yet.',status:503};
 if(!(level>=SEASON_SALE.level))return {error:`The Season Pass is for sale from level ${SEASON_SALE.level}.`,status:409};
 if(owned)return {error:'You already have the Season Pass for this season.',status:409};
 return null;
}
// No special offer in the first 7 days of a season (plan §6.4): the pass sells on its own first; the Starter Pack runs as always.
// 22 Oct 2026, the owner: no pause any more (a 50% offer posted the day after Autumn opened showed nowhere; he chose to let offers run
// alongside the passes). Kept at 0 so it can come back by setting the days here.
export const SEASON_OFFER_PAUSE=0;
export const offerPausedForSeason=(now=Date.now(),seasons=SEASON_SALE.seasons)=>seasons.some(s=>s.startsAt!=null&&now>=s.startsAt&&now<s.startsAt+SEASON_OFFER_PAUSE);
// A season purchase holds no diamonds or coins of its own, only a season the game knows.
const seasonMismatch=purchase=>!seasonSale(purchase.pass_id)||purchase.diamonds!==0||(purchase.coins??0)!==0;
const RECEIPT_PACKS=Object.freeze({...LEGACY_PAYMENT_PACKS,...PAYMENT_PACKS,offer:Object.freeze({cents:OFFER.cents,price:OFFER.price,offer:true}),
 pass:Object.freeze({cents:PASS.cents,price:PASS.price,diamonds:0,pass:true}),
 season:Object.freeze({cents:SEASON_SALE.cents,price:SEASON_SALE.price,diamonds:0,season:true})});
const CHECKOUT_PACK_ALIASES=Object.freeze({'50':'150','100':'150','300':'1250','600':'1250','1000':'3500','2000':'3500'});
// A Starter Pack checkout opened before 27 Sep 2026 held 300 diamonds; paid later, it still counts, and credits the 300 it showed.
export const STARTER_DIAMONDS_BEFORE=300;
export const STARTER_WINDOW=7*24*60*60*1000;
// This deployed storefront is live. Keep an explicit emergency off switch.
export function livePaymentConfiguration(key,webhookSecret,enabledFlag){
 const configured=/^[rs]k_live_/.test((key??'').trim())&&Boolean((webhookSecret??'').trim());
 return {mode:'live',configured,enabled:configured&&String(enabledFlag??'').trim().toLowerCase()!=='false'};
}
// The welcome offer opens when the farm reaches level 14 (STARTER_LEVEL; the server stamps that moment in
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
 if(pack.offer&&(typeof purchase.offer_id!=='string'||!UUID.test(purchase.offer_id)||paidOfferProblem(purchase)))throw new Error('Offer mismatch.');
 // A pass carries no diamonds or coins of its own, only the pass it opens.
 if(pack.pass&&(purchase.pass_id!==PASS.id||purchase.diamonds!==0||(purchase.coins??0)!==0))throw new Error('Pass mismatch.');
 if(pack.season&&seasonMismatch(purchase))throw new Error('Pass mismatch.');
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
 starter:'starter_pack',offer:'special_offer',pass:'halloween_pass_2026',season:'season_pass'});
export const PLAY_PRODUCT=/^[a-z0-9][a-z0-9_.]{0,39}$/;
export const PLAY_TOKEN=/^[A-Za-z0-9._-]{20,1024}$/;
export const playProduct=pack=>typeof pack==='string'&&Object.hasOwn(PLAY_PRODUCTS,pack)?PLAY_PRODUCTS[pack]:null;
// The App Store (Oct 2026, the iPhone app 1.1, ios-app HarvestApp.swift HarvestStore): the same packs as consumables in App Store
// Connect, with the same product ids as Google Play, at the same euro price (Apple converts it for other storefronts and keeps 15%, the
// Small Business Program). A purchase is the same row again (store 'app_store', price_id = the product, apple_transaction_id = Apple's
// transaction id). The app gives StoreKit this row's id as the purchase's appAccountToken; diamond-checkout apple_confirm checks Apple's
// signed transaction (game/app-store.js, no key needed) before crediting it, and only then does the app finish it.
export const APPLE_BUNDLE='com.harvesttycoon.app';
export const APPLE_PRODUCTS=PLAY_PRODUCTS;
// The Season Pass in the iPhone app (20 Oct 2026, the owner): built, switched off. While APPLE_SELLS_SEASON_PASS is false the app shows
// the free row only (no buy button: src/main.js asks the App Store for no season_pass price), appleProduct gives no product for it, so
// checkApplePurchase never credits one, and diamond-checkout refuses an App Store checkout for it (seasonStoreProblem). Set it to true
// (site and diamond-checkout) once season_pass is an approved consumable in App Store Connect: then StoreKit sells it like the Halloween
// Pass, apple_confirm checks Apple's signed transaction, the purchase is credited to the season it was bought in
// (supabase/season-pass-engine.sql) and a refund comes back through app-store-notify.
// 22 Oct 2026, the owner: on, with the iPhone app 1.5 (season_pass goes to App Review with it).
export const APPLE_SELLS_SEASON_PASS=true;
// Why a Season Pass checkout cannot start in this store, or null.
export const seasonStoreProblem=(store,sellsSeason=APPLE_SELLS_SEASON_PASS)=>store==='app_store'&&!sellsSeason?{error:'The Season Pass is not sold in the iPhone app.',status:409}:null;
// The special offer in the iPhone app (13 Oct 2026): not yet. The app 1.1 went to App Review with the diamond packs and the Halloween
// Pass; starter_pack and special_offer follow as in-app purchases once it is approved. App Review buys in Apple's sandbox, which also
// prices an in-app purchase that is only Ready to Submit, so the App Store's price is no proof that Apple sells it. While this is false
// the iPhone app is never shown a special offer (diamond-checkout gives it none and refuses its checkout; src/main.js shows none), also
// an offer from level 10, the level of App Review's demo account. Set it to true (site and diamond-checkout) when special_offer goes to
// Apple's review as an in-app purchase. The Starter Pack (level 14) is not affected.
// 22 Oct 2026, the owner ("Doe 1"): on, with the iPhone app 1.5 (special_offer goes to App Review with it).
export const APPLE_SELLS_OFFER=true;
// Kreds on Kongregate (15 Oct 2026, the owner: built now, switched on once Kongregate allows the game its Virtual Goods API). The same
// packs as Kongregate's own items (its developer portal, Manage Items: consumables of 1 use) with the Google Play product ids as their
// identifiers, at prices in Kreds the owner sets there; the game shows only Kongregate's own prices (src/kongregate-kreds.js). A purchase
// is the same row again (store 'kongregate', price_id = the identifier, amount_cents the euro list price so every check and the admin's
// list stay as they are; kong_item_id = Kongregate's item instance, kreds = its price; supabase/kongregate-kreds.sql). diamond-checkout
// kong_claim credits what the player owns at Kongregate (user_items.json), each instance once, and then uses it up there (use_item.json).
export const KONG_PRODUCTS=PLAY_PRODUCTS;
export const kongProduct=pack=>playProduct(pack);
// The pack an identifier sells, or null.
export const kongPack=identifier=>typeof identifier==='string'?Object.keys(KONG_PRODUCTS).find(pack=>KONG_PRODUCTS[pack]===identifier)??null:null;
// Off until Kongregate says yes: diamond-checkout sells Kreds only when KONG_PAYMENTS_ENABLED is exactly 'true'.
export const kongPaymentsEnabled=flag=>String(flag??'').trim()==='true';
// Kongregate's test accounts (KONGREGATE_TEST_USERS, user ids with commas between): the developer account buys for 0 Kreds, so its
// purchases are credited as livemode false (no revenue, no partner share), as Apple's sandbox.
export const kongTestUsers=text=>new Set(String(text??'').split(',').map(id=>id.trim()).filter(id=>/^[1-9]\d{0,9}$/.test(id)));
// How often a farmer's page may make diamond-checkout ask Kongregate for its purchases (kong_claim, 15 Oct 2026 review): once in 5
// seconds and 120 times an hour per Kongregate account, checked with the account's own row before Kongregate is asked
// (supabase/kongregate-kreds.sql harvest_kong_claim_slot), as kongregate-auth limits its sign-in checks. The page asks at most every
// 10 seconds by itself (src/kongregate-kreds.js CLAIM_GAP); a purchase window open a minute asks about 6 times.
export const KONG_CLAIM_LIMIT=Object.freeze({gapMs:5000,perHour:120});
// A price in Kreds worth keeping beside a purchase (supabase/kongregate-kreds.sql: 1 to 100,000), else null.
export const kongKreds=value=>Number.isSafeInteger(value)&&value>=1&&value<=100000?value:null;
// What to do with each item a Kongregate player owns (diamond-checkout kong_claim), lowest instance first:
// - 'use': credited before (a row has this instance): only used up at Kongregate again, never credited twice;
// - 'credit': this farmer's own pending Kongregate row for the same product: the one named in the instance's data (the row id the page
//   gave Kongregate's purchase window), else the oldest one (a special offer or pass: the newest);
// - 'new': no row left for a diamond pack (bought outside our window, or the data changed by a browser plugin): a new row for it;
// - 'leave': no row left for a Starter Pack, special offer or pass (its contents come from its row): not credited, not used up, logged.
// instances: Kongregate's (game/kongregate-api.js kongUserItems); claimed: rows that hold one of these instances; rows: this farmer's
// pending Kongregate rows without one, oldest first. Another farmer's row, or a row of another product, is never taken.
export function kongPlan(instances,{player,claimed=[],rows=[]}){
 const taken=new Set(),plan=[],seen=new Map();
 for(const i of instances??[])if(kongPack(i?.identifier)&&Number.isSafeInteger(i.id)&&i.id>0&&!seen.has(i.id))seen.set(i.id,i);
 for(const instance of [...seen.values()].sort((a,b)=>a.id-b.id)){
  const pack=kongPack(instance.identifier),done=claimed.find(r=>Number(r?.kong_item_id)===instance.id);
  if(done){plan.push({kind:'use',instance,pack,row:done});continue;}
  const fits=r=>Boolean(r)&&r.player_id===player&&r.store==='kongregate'&&r.status==='pending'&&r.kong_item_id==null&&r.pack===pack&&r.price_id===instance.identifier&&!taken.has(r.id);
  const data=typeof instance.data==='string'?instance.data.trim().toLowerCase():'';
  // No row named: a diamond pack's oldest; a special offer's or pass's newest (15 Oct 2026 review: an older one may be an offer that has
  // ended, the newest is the one most likely on sale now), so paid Kreds always find a row of theirs.
  const row=(UUID.test(data)?rows.find(r=>r?.id===data&&fits(r)):null)??(pack==='offer'||pack==='pass'||pack==='season'?rows.findLast(fits):rows.find(fits));
  if(row){taken.add(row.id);plan.push({kind:'credit',instance,pack,row});}
  else plan.push({kind:/^\d+$/.test(pack)?'new':'leave',instance,pack});
 }
 return plan;
}
// A row about to be credited for a Kongregate item: this farmer's Kongregate row for that product, with the contents and amounts of
// its pack (the same checks as Google Play's and Apple's). Anything else throws.
export function checkKongPurchase(purchase,{product,player}){
 if(!purchase||typeof product!=='string'||kongProduct(purchase.pack)!==product||purchase.price_id!==product)throw new Error('Product mismatch.');
 if(typeof player!=='string'||purchase.player_id!==player||purchase.store!=='kongregate')throw new Error('Purchase ownership mismatch.');
 const pack=paymentPack(purchase.pack);
 if(pack.offer&&(typeof purchase.offer_id!=='string'||!UUID.test(purchase.offer_id)||paidOfferProblem(purchase)))throw new Error('Offer mismatch.');
 if(pack.pass&&(purchase.pass_id!==PASS.id||purchase.diamonds!==0||(purchase.coins??0)!==0))throw new Error('Pass mismatch.');
 if(pack.season&&seasonMismatch(purchase))throw new Error('Pass mismatch.');
 if(purchase.amount_cents!==pack.cents||!pack.offer&&purchase.diamonds!==pack.diamonds||!pack.offer&&(purchase.coins??0)!==(pack.coins??0))throw new Error('Payment amount mismatch.');
 return {product};
}
export const APPLE_TRANSACTION=/^[0-9]{1,20}$/;
export const APPLE_JWS=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
export const APPLE_JWS_MAX=16000;
// What the App Store sells for a pack (the same ids as Google Play), or null: the Season Pass only once APPLE_SELLS_SEASON_PASS is on.
export const appleProduct=(pack,sellsSeason=APPLE_SELLS_SEASON_PASS)=>pack==='season'&&!sellsSeason?null:playProduct(pack);
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
 if(pack.offer&&(typeof purchase.offer_id!=='string'||!UUID.test(purchase.offer_id)||paidOfferProblem(purchase)))throw new Error('Offer mismatch.');
 if(pack.pass&&(purchase.pass_id!==PASS.id||purchase.diamonds!==0||(purchase.coins??0)!==0))throw new Error('Pass mismatch.');
 if(pack.season&&seasonMismatch(purchase))throw new Error('Pass mismatch.');
 if(purchase.amount_cents!==pack.cents||!pack.offer&&purchase.diamonds!==pack.diamonds||!pack.offer&&(purchase.coins??0)!==(pack.coins??0))throw new Error('Payment amount mismatch.');
 const state=google.purchaseState===0?'purchased':google.purchaseState===2?'pending':'cancelled';
 return {state,test:google.purchaseType!=null,order:typeof google.orderId==='string'&&google.orderId?google.orderId.slice(0,100):null};
}
// What Apple signed about a purchase (StoreKit's transaction, checked by game/app-store.js verifyAppleJws) against its row: state
// 'purchased' (credit it) or 'revoked' (Apple took the money back: credit nothing); test: the sandbox (App Review, TestFlight and sandbox
// testers), credited all the same so App Review sees the diamonds, but recorded as livemode false (no revenue, no partner share). Xcode's
// own test purchases are not signed by Apple and never get this far. The app gave StoreKit this row's id as the appAccountToken (Apple
// may write the UUID in capitals). Anything that is not this app's consumable, for this row and this farmer, throws. player null: a
// deleted account's row (app-store-notify only, which has no farmer to compare), recorded by harvest_credit_apple_purchase without
// giving anything, as Stripe's harvest_credit_purchase does.
export function checkApplePurchase(apple,purchase,{product,player}){
 if(!apple||typeof apple!=='object'||apple.bundleId!==APPLE_BUNDLE)throw new Error('Unknown App Store purchase.');
 if(typeof apple.transactionId!=='string'||!APPLE_TRANSACTION.test(apple.transactionId)||apple.originalTransactionId!=null&&(typeof apple.originalTransactionId!=='string'||!APPLE_TRANSACTION.test(apple.originalTransactionId)))throw new Error('Unknown App Store purchase.');
 if(apple.environment!=='Production'&&apple.environment!=='Sandbox')throw new Error('Environment mismatch.');
 if(apple.type!=='Consumable')throw new Error('Product type mismatch.');
 if(!purchase||typeof product!=='string'||apple.productId!==product||appleProduct(purchase.pack)!==product)throw new Error('Product mismatch.');
 const deleted=purchase.player_id===null&&Boolean(purchase.account_deleted_at);
 if(deleted?player!==null:typeof player!=='string'||purchase.player_id!==player)throw new Error('Purchase ownership mismatch.');
 if(typeof apple.appAccountToken!=='string'||typeof purchase.id!=='string'||apple.appAccountToken.toLowerCase()!==purchase.id.toLowerCase())throw new Error('Purchase reference mismatch.');
 if(apple.quantity!==1)throw new Error('Quantity mismatch.');
 const pack=paymentPack(purchase.pack);
 if(pack.offer&&(typeof purchase.offer_id!=='string'||!UUID.test(purchase.offer_id)||paidOfferProblem(purchase)))throw new Error('Offer mismatch.');
 if(pack.pass&&(purchase.pass_id!==PASS.id||purchase.diamonds!==0||(purchase.coins??0)!==0))throw new Error('Pass mismatch.');
 if(pack.season&&seasonMismatch(purchase))throw new Error('Pass mismatch.');
 if(purchase.amount_cents!==pack.cents||!pack.offer&&purchase.diamonds!==pack.diamonds||!pack.offer&&(purchase.coins??0)!==(pack.coins??0))throw new Error('Payment amount mismatch.');
 return {state:apple.revocationDate!=null?'revoked':'purchased',test:apple.environment==='Sandbox',transaction:apple.transactionId,original:apple.originalTransactionId??apple.transactionId};
}
// Checkout recovery (23 Oct 2026, the owner: options 1, 2, 4 and 5). The farmer's latest website (Stripe) purchase that was started but
// not paid: pending or expired, created in the last UNFINISHED_HOURS, and nothing credited (in any store) since it was started. The
// catalogue of diamond-checkout carries it (unfinished), so the game's reminder card (src/checkout-reminder-ui.js) works on every device;
// supabase/checkout-reminder.sql picks the same rows for the one reminder email. rows: this farmer's purchases of the last day, in any
// order. Answers {id, pack, createdAt, offerId, passId, diamonds} or null. A test checkout (livemode false) is never one.
export const UNFINISHED_HOURS=24;
export function unfinishedCheckout(rows,now=Date.now()){
 const since=now-UNFINISHED_HOURS*3600000,at=r=>Date.parse(r?.created_at);
 const recent=(Array.isArray(rows)?rows:[]).filter(r=>Number.isFinite(at(r))&&at(r)>=since&&at(r)<=now+60000).sort((a,b)=>at(b)-at(a));
 const open=recent.find(r=>(r.store??'stripe')==='stripe'&&['pending','expired'].includes(r.status)&&r.livemode!==false);
 if(!open)return null;
 if(recent.some(r=>['credited','test_paid'].includes(r.status)&&at(r)>=at(open)))return null;
 return {id:open.id,pack:open.pack,createdAt:at(open),offerId:open.offer_id??null,passId:open.pass_id??null,diamonds:open.diamonds??0};
}
