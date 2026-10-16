import {androidApp,appSignIn} from '../public/android.js';
// Sign in with Google, Facebook, Apple or Discord (10 Oct 2026, the owner's choice). The buttons only appear for providers that are switched on
// in Supabase (Authentication → Providers), so nothing half-working shows up before that is set up.
export const SOCIAL_PROVIDERS=Object.freeze({google:'Google',facebook:'Facebook',apple:'Apple',discord:'Discord'});
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
const EMBEDDED=/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Barcelona|musical_ly|trill_|BytedanceWebview|Snapchat|LinkedInApp|; wv\)/i;
export const embeddedBrowser=(userAgent=globalThis.navigator?.userAgent??'')=>EMBEDDED.test(userAgent);
// In our own apps (Oct 2026, public/android.js) neither works inside the app's browser: Google refuses every WebView and Facebook no
// longer signs anyone in from a browser built into an app. There only the email address and password are offered: the Android apps
// and the iPhone app before 1.3.
// Every sign-in in the iPhone app from 1.3 (16 Oct 2026, the owner; " AppSignIn/1", public/android.js appSignIn): the same buttons and
// rules as in Safari, because the app signs in with the iPhone's own sheets instead of its browser: Apple through Apple's own sheet,
// Google, Facebook and Discord through the system's secure sign-in sheet (src/app-sign-in.js). One exception, for Apple (below). Only
// on iOS 17.4 and later (the sheet's https return to www needs it): below that the app 1.3 sends no token and stays email-only.
// Discord (10 Oct 2026, the owner): never inside an app's own browser, and not for a visit from an ad (Meta, TikTok or Google's click id,
// or the ad's utm_source or a paid utm_medium, src/source-link.js; Meta's own links say fb, ig or an, ChatGPT's chatgpt): those newcomers
// get Google, Facebook and email, without a button that only distracts.
// Apple (10 Oct 2026, the owner): only on an iPhone, iPad or Mac, where the Apple Account is already there (an iPad says "Macintosh"),
// and like Discord never inside an app's own browser and not for a visit from an ad. In our apps only in the iPhone app from 1.3, and
// there always, also after an ad (16 Oct 2026, the lead; App Review guideline 4.8: an app that offers a sign-in through another company
// must offer Sign in with Apple next to it): an ad visit hides only Discord there, and an app page that cannot show Apple (Apple
// switched off in Supabase) shows no other button either, only email and password (withApple).
// Apple's secret in Supabase (Authentication, Providers, Apple) is valid for 6 months: made 10 Oct 2026, so make a new one before 10 Apr 2027
// (~/Harvest Tycoon/discord/inloggen-apple-stappen.md), or every Apple sign-in fails.
export const adVisit=source=>Boolean(source?.fb||source?.tt||source?.g||/facebook|instagram|meta|tiktok|google|chatgpt|openai|^(fb|ig|an)$/i.test(String(source?.utm_source??''))||
 /^(paid|cpc|ppc|paid_?social|paidsocial)$/i.test(String(source?.utm_medium??'')));
export const appleDevice=(userAgent=globalThis.navigator?.userAgent??'')=>/iPhone|iPad|iPod|Macintosh/i.test(userAgent);
// In our app no button without Apple's (guideline 4.8, above): the website keeps whatever its rules leave.
const withApple=(app,shown)=>app&&!shown.includes('apple')?[]:shown;
// app: our app (the Android apps and the iPhone app); nativeSignIn: it is the iPhone app 1.3 or later, which signs in itself (so in the
// filter app means that app: the others returned [] before it).
export const usableProviders=(list,userAgent,app=androidApp(),{fromAd=false,nativeSignIn=appSignIn()}={})=>app&&!nativeSignIn?[]:withApple(app,list.filter(provider=>
 (provider!=='apple'||appleDevice(userAgent))&&(embeddedBrowser(userAgent)?provider==='facebook':!(fromAd&&(provider==='discord'||provider==='apple'&&!app)))));

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
