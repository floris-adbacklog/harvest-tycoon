import {KONG_PRODUCTS,UUID} from '../game/payments.js';
import {isGuest} from './kongregate-link.js';
// Kreds, Kongregate's own currency (15 Oct 2026, the owner: built now, switched on once Kongregate allows the game its Virtual Goods API;
// src/kongregate-page.js SELLS_KREDS). On Kongregate the shop sells the website's packs as Kongregate's own items (Manage Items:
// consumables of 1 use, the Google Play product ids as identifiers, game/payments.js KONG_PRODUCTS) at the prices the owner sets there.
// The game only ever shows Kongregate's own prices (kongregate.mtx.requestItemList), and an item Kongregate gives no price is not for
// sale, as in the apps. A purchase: diamond-checkout makes the pending row (create, store 'kongregate'), Kongregate's purchase window
// sells the item with that row's id as its data, and whatever the window says, our server then credits what the player owns at
// Kongregate (kong_claim: Kongregate's own inventory, each item once, then used up there). The same claim runs when the farm opens
// (src/game-cloud.js, bridge.playRecover) and while the purchase window checks (status), so a purchase whose page was closed halfway
// still arrives (Kongregate's checklist: "The game checks for uncredited purchases on start-up"). The result shows in the window a Stripe
// payment returns to (bridge.purchaseDone, src/payment-ui.js). No trackers here.
export const KREDS_TEXT=Object.freeze({
 guest:'Register or sign in on Kongregate to buy with Kreds.',
 busy:'A purchase is already open.',
 failed:'Checkout is unavailable. Please try again later.'
});
// Kongregate's prices are kept 10 minutes (as the apps' store prices, src/main.js); the claim when the farm opens and while a purchase
// window checks at most every 10 seconds for the same Kongregate user (15 Oct 2026 review: a trip to the Village and back opens the farm
// again; diamond-checkout allows one claim in 5 seconds, game/payments.js KONG_CLAIM_LIMIT). The claim after a purchase window always runs.
export const PRICES_KEPT=600000,CLAIM_GAP=10000;
// {pack: {price:'50 Kreds', kreds:50}} for every pack Kongregate prices (a whole number of Kreds, 1 or more); others are not for sale.
export function kredsPrices(found){
 return Object.fromEntries(Object.entries(KONG_PRODUCTS).filter(([,id])=>Number.isSafeInteger(found?.[id])&&found[id]>=1).map(([pack,id])=>[pack,{price:`${found[id]} Kreds`,kreds:found[id]}]));
}
// The catalogue the shop reads, with Kongregate's prices in it: open with at least one price; a Starter Pack, offer or pass without one
// is not for sale (as src/main.js storeCatalog).
export function kredsCatalog(data,prices){
 return {...data,enabled:Boolean(data?.enabled)&&Object.keys(prices).length>0,prices,
  starter:prices.starter||!data?.starter?data?.starter:{...data.starter,eligible:false},offer:prices.offer?data?.offer??null:null,
  pass:data?.pass&&!prices.pass?{...data.pass,ready:false}:data?.pass,season:data?.season&&!prices.season?{...data.season,ready:false}:data?.season??null};
}

// The shop of this page: link (src/kongregate-link.js), pay (diamond-checkout, src/supabase.js paymentRequest), current: the Kongregate
// user whose farm is open. attach(bridge,{alive,user}) gives an open farm its payments, checkout and recovery.
export function createKredsShop({link,pay,current=()=>null,now=()=>Date.now(),uuid=()=>crypto.randomUUID()}){
 let found=null,busy=false,chain=Promise.resolve(),claimed={user:'',at:-Infinity};
 // Asked for this Kongregate user less than 10 seconds ago: not again (another user, after a log-in change: at once).
 const recent=()=>claimed.user===link.user()?.id&&now()-claimed.at<CLAIM_GAP;
 async function prices(){
  if(found&&now()-found.at<PRICES_KEPT)return found.items;
  const items=await link.items();if(Object.keys(items).length)found={at:now(),items};return items;
 }
 function attach(bridge,{alive=()=>true,user}={}){
  const gone=()=>{if(!alive())throw new Error('Your session has ended.');};
  const ask=async body=>{gone();const data=await pay({...body,store:'kongregate'});gone();return data;};
  // One claim at a time; each asks our server what Kongregate holds now.
  const run=async()=>{
   const who=link.user();if(isGuest(who)||who.id!==current())return {credited:[],waiting:0};
   claimed={user:who.id,at:now()};
   const data=await ask({operation:'kong_claim',kong_user_id:who.id,game_auth_token:who.token});
   return {credited:(Array.isArray(data?.credited)?data.credited:[]).filter(id=>typeof id==='string'&&UUID.test(id)),waiting:Number(data?.waiting)||0};
  };
  const claim=()=>chain=chain.then(run,run);
  bridge.kreds=true;
  bridge.payments=async body=>{
   if(body?.operation==='catalog'){const [data,items]=await Promise.all([ask(body),prices().catch(()=>({}))]);gone();return kredsCatalog(data,kredsPrices(items));}
   // The purchase window checks: what Kongregate holds is credited first (at most every 10 seconds).
   if(body?.operation==='status'&&!recent())await claim().catch(()=>{});
   return ask(body);
  };
  // When the farm opens (src/game-cloud.js): everything bought and not credited yet, each in the usual result window.
  bridge.playRecover=async()=>{if(recent())return;const {credited}=await claim();for(const id of credited)bridge.purchaseDone?.(id);};
  // A purchase: Kongregate's window for this pack, one at a time; the shop's button stays busy until the window closes.
  bridge.checkout=async(pack,_requestId,offerId)=>{
   if(busy)throw new Error(KREDS_TEXT.busy);
   const who=link.user();
   // Kongregate's guests cannot buy (their docs): Kongregate's own sign-in window instead. The farm itself never opens for a guest.
   if(isGuest(who)){link.register();throw new Error(KREDS_TEXT.guest);}
   // Another Kongregate user than the farm's (switched a moment ago): the page opens their farm by itself (src/kongregate-page.js).
   if(who.id!==current())throw new Error(KREDS_TEXT.failed);
   busy=true;
   try{
    const made=await bridge.payments({operation:'create',pack,requestId:uuid(),...(offerId?{offerId}:{})});
    if(!UUID.test(made?.purchaseId??'')||made.store!=='kongregate'||made.product!==KONG_PRODUCTS[pack]||made.account!==user?.id)throw new Error(KREDS_TEXT.failed);
    const result=await link.purchase(made.product,made.purchaseId);
    gone();
    // Whatever the window said: what Kongregate holds now is credited (a "no" may still have been paid, a "yes" is checked).
    let credited=[];try{({credited}=await claim());}catch{}
    for(const id of credited)bridge.purchaseDone?.(id);
    // Paid but not credited yet: its window waits for it, and each check asks again.
    if(result.success&&!credited.length)bridge.purchaseDone?.(made.purchaseId);
    return {store:'kongregate',id:made.purchaseId,status:result.success||credited.includes(made.purchaseId)?'purchased':'cancelled'};
   }
   finally{busy=false;}
  };
 }
 return {attach};
}
