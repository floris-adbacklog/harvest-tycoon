// Purchases in the Android app through Google Play (Oct 2026, the app 1.1; android-app PlayBilling.java, contract in public/android.js).
// The page around the game asks the app by going to playprices:// playbuy:// playpending:// (one address at a time, as for push:
// a WebView drops an address that follows another too quickly), and the app answers with window.harvestPlay({...}). The app only
// talks to Google Play: diamond-checkout checks every purchase with Google before the farm gets anything (src/main.js).
import {playPricesLink,playBuyLink,PLAY_LINKS} from '../public/android.js';
import {PLAY_PRODUCT,PLAY_TOKEN,UUID} from '../game/payments.js';

const TYPES=new Set(['prices','purchase','cancelled','error','pending']);
const STATES=new Set(['purchased','pending','unknown']);
const REASONS=new Set(['unavailable','not_found','owned','invalid','busy','error']);
// One purchase as the app reports it, checked: anything unexpected is left out.
function readPurchase(raw){
 const id=v=>typeof v==='string'&&UUID.test(v)?v:null;
 if(typeof raw?.product!=='string'||!PLAY_PRODUCT.test(raw.product)||typeof raw?.token!=='string'||!PLAY_TOKEN.test(raw.token))return null;
 return Object.freeze({product:raw.product,token:raw.token,state:STATES.has(raw.state)?raw.state:'unknown',account:id(raw.account),purchase:id(raw.purchase),
  order:typeof raw.order==='string'&&raw.order.length<=100?raw.order:null});
}
// What the app says, checked (the app is ours, but the page reads nothing it does not expect).
export function readPlay(raw){
 if(!raw||!TYPES.has(raw.type))return null;
 const product=typeof raw.product==='string'&&PLAY_PRODUCT.test(raw.product)?raw.product:null;
 if(raw.type==='prices'){
  const prices={};
  for(const [id,p] of Object.entries(raw.prices&&typeof raw.prices==='object'?raw.prices:{})){
   if(!PLAY_PRODUCT.test(id)||typeof p?.price!=='string'||!p.price||p.price.length>40||/[<>]/.test(p.price))continue;
   prices[id]=Object.freeze({price:p.price,micros:Number.isSafeInteger(p.micros)&&p.micros>0?p.micros:null,currency:/^[A-Z]{3}$/.test(p.currency??'')?p.currency:null});
  }
  return {type:'prices',prices};
 }
 if(raw.type==='purchase'){const purchase=readPurchase(raw);return purchase?{type:'purchase',...purchase}:null;}
 if(raw.type==='pending')return {type:'pending',purchases:(Array.isArray(raw.purchases)?raw.purchases:[]).slice(0,50).map(readPurchase).filter(Boolean)};
 if(raw.type==='cancelled')return {type:'cancelled',product};
 return {type:'error',product,reason:REASONS.has(raw.reason)?raw.reason:'error'};
}
// The words for the app's errors, in the shop's own error line.
export const PLAY_ERRORS=Object.freeze({
 unavailable:'Google Play is not available right now. Check your connection and try again.',
 not_found:'This pack is not available in Google Play yet.',
 owned:'You still have an unfinished purchase of this pack. It is being added to your farm.',
 busy:'A purchase is already open.',
 invalid:'Google Play could not start the purchase. Please try again.',
 error:'Google Play could not start the purchase. Please try again.'
});
// The store of one page: installed once (window.harvestPlay), any number of listeners.
export function createPlayStore(win=globalThis.window,{gapMs=350,answerMs=10000,sheetMs=20*60000,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const listeners=new Set();
 win.harvestPlay=raw=>{const message=readPlay(raw);if(!message)return;for(const listen of [...listeners]){try{listen(message);}catch{}}};
 let chain=Promise.resolve(),last=-Infinity;
 const go=link=>{chain=chain.then(async()=>{const wait=last+gapMs-now();if(wait>0)await sleep(wait);try{win.location.href=link;}catch{}last=now();});return chain;};
 // The first answer that match() accepts (it returns something other than undefined), or null after ms.
 const answer=(match,ms)=>new Promise(resolve=>{
  let timer;const listen=message=>{const found=match(message);if(found===undefined)return;listeners.delete(listen);clearTimeout(timer);resolve(found);};
  listeners.add(listen);timer=setTimeout(()=>{listeners.delete(listen);resolve(null);},ms);
 });
 let buying=null;
 return {
  // The products' prices in the farmer's currency: {product:{price,micros,currency}}; {} when Google Play does not answer.
  async prices(ids){const reply=answer(m=>m.type==='prices'?m.prices:undefined,answerMs);await go(playPricesLink(ids));return (await reply)??{};},
  // Google's purchase sheet: {kind:'purchase',...} when it was bought (or is on its way: state 'pending'), {kind:'cancelled'}, {kind:'error',
  // reason}; null when the app never answered. One at a time.
  async buy({product,account,purchase}){
   if(buying)return {kind:'error',reason:'busy'};
   buying=purchase;
   try{
    const reply=answer(m=>m.type==='purchase'&&m.purchase===purchase?{kind:'purchase',...m}:m.type==='cancelled'&&(!m.product||m.product===product)?{kind:'cancelled'}
     :m.type==='error'&&(!m.product||m.product===product)?{kind:'error',reason:m.reason}:undefined,sheetMs);
    await go(playBuyLink({product,account,purchase}));
    return await reply;
   }finally{buying=null;}
  },
  // The purchases Google still holds for this phone (bought, not consumed yet): [] when Google Play does not answer.
  async pending(){const reply=answer(m=>m.type==='pending'?m.purchases:undefined,answerMs);await go(PLAY_LINKS.pending);return (await reply)??[];},
  // A purchase that arrives without a sheet of ours waiting for it (a payment that was pending, finished while the game is open).
  onPurchase(listen){const own=message=>{if(message.type==='purchase'&&message.purchase!==buying)listen(message);};listeners.add(own);return()=>listeners.delete(own);}
 };
}
