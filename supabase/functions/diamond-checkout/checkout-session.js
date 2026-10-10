// What the Stripe payment page knows of the farmer before it opens (10 Oct 2026): fewer things to type, so fewer farmers give up there.
// Plain functions without imports, so tests/checkout-fixes.test.mjs runs them as they are deployed.

// The account's own address, already filled in on Stripe's page (Stripe's Link then knows a returning payer at once). Only an address
// Google, Facebook or Apple checked: Stripe locks the field, and an email sign-up is confirmed without a mail, so it may hold a typo
// (gmail.con); there the farmer types the address as before. Not an Apple relay address either, which drops mail from senders Apple
// does not know.
const CHECKED_BY=new Set(['google','facebook','apple']);
export function checkoutEmail(user){
 const email=typeof user?.email==='string'?user.email.trim():'';
 if(!CHECKED_BY.has(user?.app_metadata?.provider)||!user?.email_confirmed_at||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return undefined;
 if(/@privaterelay\.appleid\.com$/i.test(email))return undefined;
 return email;
}

// The game's language for Stripe's page (the page sends <html lang>, public/i18n.js). Stripe has no Ukrainian, Hindi or Arabic page, and
// the game's Portuguese is Brazilian. English is no choice: it is also what the game falls back to for a browser in a language it does
// not speak (Polish, Romanian, Thai …), and Stripe speaks many of those. So English, anything else, or nothing (an older page) is 'auto':
// Stripe follows the browser, as before.
const STRIPE_LOCALES=Object.freeze({cs:'cs',de:'de',es:'es',fr:'fr',id:'id',hu:'hu',nl:'nl',pt:'pt-BR',tr:'tr',ru:'ru',ja:'ja',zh:'zh'});
export function checkoutLocale(language){
 const code=typeof language==='string'?language.trim().slice(0,2).toLowerCase():'';
 return Object.hasOwn(STRIPE_LOCALES,code)?STRIPE_LOCALES[code]:'auto';
}
