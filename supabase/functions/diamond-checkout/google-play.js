// Google Play's server API for the Android app's purchases (Oct 2026, the Google Play Developer API, "androidpublisher"). The Edge
// Functions sign in as the service account whose JSON key is the secret GOOGLE_PLAY_SERVICE_ACCOUNT (set by the owner, never in the
// repo or a log) and check a purchase, consume it once it is on the farm, and list the purchases Google refunded. Copied into
// diamond-checkout and play-voided by scripts/sync-game.mjs.
const API='https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const TOKEN_URL='https://oauth2.googleapis.com/token';
const SCOPE='https://www.googleapis.com/auth/androidpublisher';

// The service account from the secret, or null when it is missing or not a service account key.
export function serviceAccount(raw){
 try{const a=JSON.parse(String(raw??''));return typeof a?.client_email==='string'&&typeof a?.private_key==='string'&&a.private_key.includes('PRIVATE KEY')?a:null;}catch{return null;}
}
const base64url=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const encode=value=>base64url(new TextEncoder().encode(JSON.stringify(value)));
// The signed request for an access token (a JWT, RS256 with the account's private key), valid for an hour.
export async function signedAssertion(account,now=Date.now()){
 const iat=Math.floor(now/1000),input=`${encode({alg:'RS256',typ:'JWT'})}.${encode({iss:account.client_email,scope:SCOPE,aud:TOKEN_URL,iat,exp:iat+3600})}`;
 const pem=account.private_key.replace(/-----[^-]+-----/g,'').replace(/\s+/g,''),der=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const signature=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(input)));
 return `${input}.${base64url(signature)}`;
}
// An access token, kept until a minute before it runs out (one per function instance).
let kept=null;
export async function accessToken(account,{fetch:get=fetch,now=Date.now()}={}){
 if(kept&&kept.email===account.client_email&&kept.until>now+60000)return kept.token;
 const r=await get(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:await signedAssertion(account,now)}).toString()});
 const data=await r.json().catch(()=>null);
 if(!r.ok||typeof data?.access_token!=='string'){const e=new Error('Google Play sign-in failed.');e.status=r.status;throw e;}
 kept={email:account.client_email,token:data.access_token,until:now+Math.max(60,Number(data.expires_in)||3600)*1000};
 return kept.token;
}
export const forgetAccessToken=()=>{kept=null;};
async function call(account,path,{method='GET',fetch:get=fetch,now}={}){
 const token=await accessToken(account,{fetch:get,now});
 const r=await get(`${API}/${path}`,{method,headers:{Authorization:`Bearer ${token}`}});
 const text=await r.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}
 if(!r.ok){const e=new Error(`Google Play answered ${r.status}.`);e.status=r.status;e.reason=data?.error?.errors?.[0]?.reason??data?.error?.status??null;throw e;}
 return data??{};
}
const tokenPath=(pkg,product,token)=>`${encodeURIComponent(pkg)}/purchases/products/${encodeURIComponent(product)}/tokens/${encodeURIComponent(token)}`;
// purchases.products.get: purchaseState (0 bought, 1 cancelled, 2 pending), consumptionState, orderId, purchaseType (only for a test,
// promo or reward), quantity and the account and profile ids the app passed (the farmer's and the purchase row's ids).
export const getPurchase=(account,pkg,product,token,options)=>call(account,tokenPath(pkg,product,token),options);
// purchases.products.consume: the purchase is used up, so the same pack can be bought again (it also acknowledges it).
export const consumePurchase=(account,pkg,product,token,options)=>call(account,`${tokenPath(pkg,product,token)}:consume`,{...options,method:'POST'});
// purchases.voidedpurchases.list: purchases refunded, charged back or cancelled since `since` (Google keeps 30 days), every page.
export async function voidedPurchases(account,pkg,{since,fetch:get=fetch,now=Date.now(),pages=20}={}){
 const start=Math.max(Number(since)||0,now-30*86400000+60000),found=[];let page='';
 for(let i=0;i<pages;i++){
  const query=new URLSearchParams({startTime:String(Math.floor(start)),maxResults:'1000',...(page?{token:page}:{})});
  const data=await call(account,`${encodeURIComponent(pkg)}/purchases/voidedpurchases?${query}`,{fetch:get,now});
  found.push(...(Array.isArray(data.voidedPurchases)?data.voidedPurchases:[]));
  page=data.tokenPagination?.nextPageToken??'';if(!page)break;
 }
 return found;
}
