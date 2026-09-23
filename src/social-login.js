// Sign in with Google or Facebook. The buttons only appear for providers that are switched on in Supabase
// (Authentication → Providers), so nothing half-working shows up before that is set up.
export const SOCIAL_PROVIDERS=Object.freeze({google:'Google',facebook:'Facebook'});
// Remembers, for this tab only, which provider a sign-in was started with, so the page it returns to can explain a
// cancelled or failed attempt instead of saying that an email link expired.
export const OAUTH_KEY='harvest-tycoon:oauth';

// Supabase's public auth settings say which external providers are on: {external:{google:true,facebook:false,...}}.
export async function enabledProviders({url,key,fetchImpl=globalThis.fetch}){
 if(!url||!key||!fetchImpl)return [];
 try{
  const response=await fetchImpl(`${url.replace(/\/$/,'')}/auth/v1/settings`,{headers:{apikey:key}});
  if(!response.ok)return [];
  const settings=await response.json();
  return Object.keys(SOCIAL_PROVIDERS).filter(provider=>settings?.external?.[provider]===true);
 }catch{return [];}
}

// Google refuses to sign anyone in from a browser built into another app ("disallowed_useragent"): the Facebook,
// Instagram, Messenger, Threads, TikTok, Snapchat and LinkedIn apps, and Android web views in general. Visitors from
// Meta ads arrive in exactly those browsers, so there the Google button is left out; Facebook and email still work.
// Only named app markers are used: an iPhone home-screen app also lacks the "Safari" word but can use Google fine.
const EMBEDDED=/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Barcelona|musical_ly|BytedanceWebview|Snapchat|LinkedInApp|; wv\)/i;
export const embeddedBrowser=(userAgent=globalThis.navigator?.userAgent??'')=>EMBEDDED.test(userAgent);
export const usableProviders=(list,userAgent)=>embeddedBrowser(userAgent)?list.filter(provider=>provider!=='google'):list;

export const providerName=provider=>SOCIAL_PROVIDERS[provider]??'that service';

// Could not even leave for Google or Facebook (a network problem, or the provider was switched off meanwhile).
export function oauthStartError(error,provider){
 const name=providerName(provider),text=String(error?.message??'');
 if(/provider is not enabled|unsupported provider/i.test(text))return {reason:'provider_disabled',message:`Signing in with ${name} is not available right now. Please use your email address.`};
 if(/failed to fetch|networkerror|load failed|network request failed/i.test(text))return {reason:'network',message:'We could not reach the server. Check your connection and try again.'};
 return {reason:'oauth_start',message:`We could not open ${name}. Please try again, or use your email address.`};
}

// Came back from Google or Facebook with an error: cancelled, refused, or something went wrong on the way.
export function oauthReturnMessage(provider){
 return `Signing in with ${providerName(provider)} did not work. Please try again, or use your email address.`;
}
