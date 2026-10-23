// How a farmer on the website can pay (23 Oct 2026, the owner's options 1, 2 and 4 after the checkout drop-off: 114 website checkouts
// started in 21 days, 13 paid; Google Play in the Android app 34%). The rules only, no screen: src/pay-choice-ui.js draws them, and
// src/main.js (bridge.checkout) and src/checkout-reminder-ui.js ask them.
//  1. An Android phone in a normal browser or the installed web app gets a choice right after Buy: Pay by card (Stripe, the default)
//     or Pay with Google Play, which opens our app's page on Google Play (phone credit, gift cards and local wallets; the same account
//     in the app). Card payments rarely work in many of the countries those players come from.
//  4. Where Stripe cannot take payments at all (STRIPE_BLOCKED below), no Stripe page is started: one short line says so, with Google
//     Play on Android and the App Store on an iPhone. Diamonds earned in the game keep working.
// Never in our apps (they sell through their own store) and never on a portal (CrazyGames, Kongregate, Discord): there nothing here
// applies (payWays answers null). The country is the one of the device's time zone, as the admin's country (no IP address is ever used).
import {ZONE_COUNTRY} from '../supabase/functions/farm-api/time-zones.js';
import {PAYMENT_PACKS,PASS,SEASON_SALE} from '../game/payments.js';

// Where Stripe takes no payments (checked 23 Oct 2026 against Stripe's "Prohibited and restricted businesses": Cuba, Iran, North
// Korea, Syria and the Crimea, Donetsk and Luhansk regions are sanctioned; Russia and Belarus: cards issued there do not work abroad
// and Stripe takes no payments from there). Countries as the time zones give them (supabase/functions/farm-api/time-zones.js); Crimea
// by its own time zone (Europe/Simferopol, which that list counts as Ukraine). Donetsk and Luhansk have no time zone of their own, so
// they cannot be told apart from the rest of Ukraine and stay as they are. One list: add or remove a country here only.
export const STRIPE_BLOCKED=Object.freeze({countries:Object.freeze(['CU','IR','KP','SY','RU','BY']),zones:Object.freeze(['Europe/Simferopol'])});
export const deviceTimeZone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||null;}catch{return null;}};
export const zoneCountry=zone=>typeof zone==='string'&&Object.hasOwn(ZONE_COUNTRY,zone)?ZONE_COUNTRY[zone]:null;
// True where card payment cannot work: the device's time zone is in one of those countries (or is Crimea's).
export function cardBlocked(timeZone,blocked=STRIPE_BLOCKED){
 if(typeof timeZone!=='string')return false;
 return blocked.zones.includes(timeZone)||blocked.countries.includes(zoneCountry(timeZone));
}
// The phone, from the browser's user agent: 'android', 'iphone' (an iPhone or iPad that says so) or 'other' (a computer, an iPad that
// says Macintosh). Only for which store to point at; nothing is hidden by it.
export function deviceKind(ua){
 const text=String(ua??'');
 if(/Android/i.test(text))return 'android';
 if(/iPhone|iPad|iPod/.test(text))return 'iphone';
 return 'other';
}
// The ways to pay on this page: {card, play, appStore, blocked}, or null inside our apps or on a portal (nothing changes there).
//  card      the Stripe page may open (not in a blocked country)
//  play      Pay with Google Play is offered (an Android phone)
//  appStore  the App Store is offered (an iPhone, only where card payment cannot work)
export function payWays({ua,timeZone,app=false,portal=false}={}){
 if(app||portal)return null;
 const kind=deviceKind(ua),blocked=cardBlocked(timeZone);
 return {card:!blocked,play:kind==='android',appStore:kind==='iphone'&&blocked,blocked};
}
// Whether Buy first shows the small choice sheet (src/pay-choice-ui.js): with a second way to pay, or where card payment cannot work.
// Everywhere else Buy goes straight to the card page, as before.
export const askFirst=ways=>Boolean(ways)&&(ways.play||!ways.card);
// Other ways besides the card (the reminder's "Other ways to pay").
export const otherWays=ways=>Boolean(ways)&&(ways.play||ways.appStore);

// Our Android app's page on Google Play, with where the tap came from (source: 'shop', 'reminder'), so Google Play Console's
// acquisition report shows it (utm_source, utm_medium web). The app opens with the same account: sign in with the same email.
export const PLAY_APP_ID='com.harvesttycoon.app';
export const playStoreLink=(source='shop')=>`https://play.google.com/store/apps/details?id=${PLAY_APP_ID}&referrer=${encodeURIComponent(`utm_source=${source==='reminder'?'reminder':'shop'}&utm_medium=web&utm_campaign=checkout`)}`;
// The iPhone app (public/game-links.js APP_STORE_URL), the same: Apple only reads its own campaign token (ct).
export const appStoreLink=(url,source='shop')=>`${url}${url.includes('?')?'&':'?'}ct=${source==='reminder'?'reminder':'shop'}`;

// A pack's name as the shop writes it: "500 diamonds", "Starter Pack", "Special offer", "Halloween Pass", "Season Pass".
export function packName(pack){
 if(pack==='starter')return 'Starter Pack';
 if(pack==='offer')return 'Special offer';
 if(pack==='pass')return PASS.name;
 if(pack==='season')return SEASON_SALE.name;
 const diamonds=PAYMENT_PACKS[pack]?.diamonds;
 return diamonds?`${diamonds.toLocaleString('en-US')} diamonds`:'Diamonds';
}

// Option 2: the reminder card. The catalogue's unfinished purchase (game/payments.js unfinishedCheckout) shows once per purchase on
// this device (shown), at least REMIND_AFTER after it was started (not over the "Checkout closed" window of the same visit), and only
// while that pack can still be bought here: a diamond pack while the shop sells; the Starter Pack while it runs; the special offer while
// the same offer runs and was not bought; the Halloween Pass and a Season Pass while that pass is on sale. Answers what Try again
// starts ({id, pack, offerId, season}) or null. No discount and no bonus: the owner does not want to teach waiting for one.
export const REMIND_AFTER=10*60*1000;
export function reminderFor(catalog,{now=Date.now(),shown=()=>false}={}){
 const u=catalog?.unfinished;
 if(!catalog?.enabled||!u||typeof u.id!=='string'||typeof u.pack!=='string'||shown(u.id))return null;
 const at=Number(u.createdAt);if(!Number.isFinite(at)||now-at<REMIND_AFTER)return null;
 const base={id:u.id,pack:u.pack,offerId:null,season:null};
 if(u.pack==='starter'){const s=catalog.starter;return s?.eligible&&!s.claimed&&Number(s.expiresAt)>now?base:null;}
 if(u.pack==='offer'){const o=catalog.offer;return o&&o.id===u.offerId&&!o.bought&&Number(o.endsAt)>now?{...base,offerId:o.id}:null;}
 if(u.pack==='pass')return catalog.pass?.ready&&catalog.pass.id===u.passId?base:null;
 if(u.pack==='season'){const s=(catalog.seasons??[]).find(x=>x.id===u.passId);return s?.ready?{...base,season:s.id}:null;}
 return (catalog.packs??[]).some(p=>p.id===u.pack)?base:null;
}
export const reminderKey=id=>`harvest-checkout-reminder:${id}`;
