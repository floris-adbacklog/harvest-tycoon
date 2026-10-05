// Purchases in the iPhone app through the App Store (Oct 2026, the app 1.1; ios-app HarvestApp.swift HarvestStore, contract in
// public/android.js). The twin of src/play-store.js: the page around the game asks the app by going to appstoreprices:// appstorebuy://
// appstorepending:// appstorefinish:// (one address at a time: a WebView drops an address that follows another too quickly), and the app
// answers with window.harvestAppStore({...}). The app only talks to the App Store (StoreKit 2): diamond-checkout checks Apple's signed
// transaction before the farm gets anything (src/main.js). Unlike Google Play, where the server consumes a purchase, only the app can
// finish one, and it does so only when the page asks (finish), after the server credited it; until then the App Store hands it back at
// every start, so nothing paid is lost on the way.
import {appStorePricesLink,appStoreBuyLink,appStoreFinishLink,APP_STORE_LINKS} from '../public/android.js';
import {PLAY_PRODUCT,APPLE_JWS,APPLE_JWS_MAX,APPLE_TRANSACTION,UUID} from '../game/payments.js';

const TYPES=new Set(['prices','purchase','deferred','cancelled','error','pending','finished']);
const REASONS=new Set(['unavailable','not_found','invalid','busy','error']);
// The same product ids as Google Play (game/payments.js APPLE_PRODUCTS), so the same rule. StoreKit writes UUIDs in capitals; ours are small.
const productOf=v=>typeof v==='string'&&PLAY_PRODUCT.test(v)?v:null;
const idOf=v=>typeof v==='string'&&UUID.test(v)?v.toLowerCase():null;
// One purchase as the app reports it, checked: anything unexpected is left out. token: Apple's signed transaction (a JWS, a few KB), the
// one thing diamond-checkout believes; order: Apple's transaction id, which finish needs; account: the farmer it was bought for (null
// after the app was installed again: the server decides); purchase: our purchase row (StoreKit's appAccountToken).
function readPurchase(raw){
 if(!productOf(raw?.product)||typeof raw.token!=='string'||raw.token.length>APPLE_JWS_MAX||!APPLE_JWS.test(raw.token)||typeof raw.order!=='string'||!APPLE_TRANSACTION.test(raw.order))return null;
 return Object.freeze({product:raw.product,token:raw.token,order:raw.order,state:raw.state==='purchased'?'purchased':'unknown',account:idOf(raw.account),purchase:idOf(raw.purchase)});
}
// What the app says, checked (the app is ours, but the page reads nothing it does not expect).
export function readAppStore(raw){
 if(!raw||!TYPES.has(raw.type))return null;
 const product=productOf(raw.product);
 if(raw.type==='prices'){
  const prices={};
  for(const [id,p] of Object.entries(raw.prices&&typeof raw.prices==='object'?raw.prices:{})){
   if(!productOf(id)||typeof p?.price!=='string'||!p.price||p.price.length>40||/[<>]/.test(p.price))continue;
   prices[id]=Object.freeze({price:p.price,micros:Number.isSafeInteger(p.micros)&&p.micros>0?p.micros:null,currency:/^[A-Z]{3}$/.test(p.currency??'')?p.currency:null});
  }
  return {type:'prices',prices};
 }
 if(raw.type==='purchase'){const purchase=readPurchase(raw);return purchase?{type:'purchase',...purchase}:null;}
 if(raw.type==='pending')return {type:'pending',purchases:(Array.isArray(raw.purchases)?raw.purchases:[]).slice(0,50).map(readPurchase).filter(Boolean)};
 // Waiting for a parent's yes (Ask to Buy) or the bank: no transaction yet; the approved one comes later as a purchase.
 if(raw.type==='deferred')return {type:'deferred',product,purchase:idOf(raw.purchase)};
 if(raw.type==='finished')return typeof raw.transaction==='string'&&APPLE_TRANSACTION.test(raw.transaction)?{type:'finished',transaction:raw.transaction,ok:raw.ok===true}:null;
 if(raw.type==='cancelled')return {type:'cancelled',product};
 return {type:'error',product,reason:REASONS.has(raw.reason)?raw.reason:'error'};
}
// The words for the app's errors, in the shop's own error line (as src/play-store.js PLAY_ERRORS, naming the App Store).
export const APP_STORE_ERRORS=Object.freeze({
 unavailable:'The App Store is not available right now. Check your connection and try again.',
 not_found:'This pack is not available in the App Store yet.',
 busy:'A purchase is already open.',
 invalid:'The App Store could not start the purchase. Please try again.',
 error:'The App Store could not start the purchase. Please try again.'
});
// The store of one page: installed once (window.harvestAppStore), any number of listeners.
export function createAppStore(win=globalThis.window,{gapMs=350,answerMs=10000,sheetMs=20*60000,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const listeners=new Set();
 win.harvestAppStore=raw=>{const message=readAppStore(raw);if(!message)return;for(const listen of [...listeners]){try{listen(message);}catch{}}};
 let chain=Promise.resolve(),last=-Infinity;
 const go=link=>{chain=chain.then(async()=>{const wait=last+gapMs-now();if(wait>0)await sleep(wait);try{win.location.href=link;}catch{}last=now();});return chain;};
 // The first answer that match() accepts (it returns something other than undefined), or null after ms.
 const answer=(match,ms)=>new Promise(resolve=>{
  let timer;const listen=message=>{const found=match(message);if(found===undefined)return;listeners.delete(listen);clearTimeout(timer);resolve(found);};
  listeners.add(listen);timer=setTimeout(()=>{listeners.delete(listen);resolve(null);},ms);
 });
 let buying=null,buyingProduct=null;
 return {
  // The products' prices in the farmer's currency: {product:{price,micros,currency}}; {} when the App Store does not answer.
  async prices(ids){const reply=answer(m=>m.type==='prices'?m.prices:undefined,answerMs);await go(appStorePricesLink(ids));return (await reply)??{};},
  // The App Store's purchase sheet: {kind:'purchase',...} when it was bought, or {kind:'purchase',state:'pending'} when it waits for a
  // parent's yes or the bank (deferred); {kind:'cancelled'}, {kind:'error',reason}; null when the app never answered. One at a time.
  async buy({product,account,purchase}){
   if(buying)return {kind:'error',reason:'busy'};
   buying=purchase;buyingProduct=product;
   try{
    // The same product's purchase also answers the sheet: an unfinished one of this product comes back from Apple as the result of buying
    // it again (it then carries its own, older purchase row), so the sheet ends with it instead of waiting 20 minutes.
    const reply=answer(m=>m.type==='purchase'&&(m.purchase===purchase||m.product===product)?{kind:'purchase',...m}
     :m.type==='deferred'&&(m.purchase===purchase||!m.purchase&&(!m.product||m.product===product))?{kind:'purchase',product,state:'pending',account,purchase}
     :m.type==='cancelled'&&(!m.product||m.product===product)?{kind:'cancelled'}
     :m.type==='error'&&(!m.product||m.product===product)?{kind:'error',reason:m.reason}:undefined,sheetMs);
    await go(appStoreBuyLink({product,account,purchase}));
    return await reply;
   }finally{buying=null;buyingProduct=null;}
  },
  // The purchases the App Store still holds for this phone (paid, not finished yet): [] when the App Store does not answer.
  async pending(){const reply=answer(m=>m.type==='pending'?m.purchases:undefined,answerMs);await go(APP_STORE_LINKS.pending);return (await reply)??[];},
  // Done with a purchase (only after diamond-checkout said finish): true or false as the app says, null when it never answered. One the
  // app did not finish comes back at the next start, and the server knows it was credited already.
  async finish(transaction){
   if(typeof transaction!=='string'||!APPLE_TRANSACTION.test(transaction))return false;
   const reply=answer(m=>m.type==='finished'&&m.transaction===transaction?m.ok:undefined,answerMs);await go(appStoreFinishLink(transaction));return await reply;
  },
  // A purchase that arrives without a sheet of ours waiting for it (Ask to Buy approved, or one the App Store hands back at the start).
  onPurchase(listen){const own=message=>{if(message.type==='purchase'&&message.purchase!==buying&&message.product!==buyingProduct)listen(message);};listeners.add(own);return()=>listeners.delete(own);}
 };
}
