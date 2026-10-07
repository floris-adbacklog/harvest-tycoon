// Links to the game's own pages besides the wiki (4 Oct 2026): the app page and a part of Settings, the other links the chat lets
// through (supabase/chat-game-links.sql; at most 2 links in one message, wiki links included).
//   https://www.harvesttycoon.com/app                 Harvest Tycoon on your phone (public/app.html)
//   https://www.harvesttycoon.com/settings/<part>     the home page opens the game's Settings at that part (vercel.json → ?open=settings)
//   https://www.harvesttycoon.com/feedback            the home page opens the game's Feedback window (6 Oct 2026, ?open=feedback)
// A part is one of SETTINGS_PARTS: its slug in the address, the id of its section in the game (public/farm.html, settings-nav.js) and
// its title there, so a chip shows the way to it ("Settings › Farm app") and a farmer learns where to find it. Only these slugs; any
// other address is no link of ours. No imports, so the page around the game, the chat and the tests can all use it.
export const SITE='https://www.harvesttycoon.com';
export const APP_LINK=`${SITE}/app`;
// The iPhone app's App Store page (7 Oct 2026): null while Apple reviews it, and the App Store badges in the website's footers link to
// the app page (/app, /es/app, ...), where an iPhone gets the Home Screen steps. Once Apple has approved it, its address goes here (App
// Store Connect, the app's "View on App Store"; any country's address will do) and the deploy points every App Store badge there and
// shows the App Store on the app page (scripts/app-store-links.mjs).
export const APP_STORE_URL=null;
// The app page in a language (scripts/build-languages.mjs writes /es/app, ...; the chat's chip opens the farmer's own, 4 Oct 2026).
export const appPath=code=>!code||code==='en'?'/app':`/${code}/app`;
export const SETTINGS_PARTS=Object.freeze({
 avatar:{id:'avatar-settings',title:'Avatar'},
 email:{id:'email-settings',title:'Email address'},
 sound:{id:'sound-settings',title:'Sound'},
 chat:{id:'chat-settings',title:'Chat'},
 reminders:{id:'notify-settings',title:'Reminders'},
 'farm-app':{id:'app-settings',title:'Farm app'},
 language:{id:'language-settings',title:'Language'},
 privacy:{id:'privacy-settings',title:'Privacy'}
});
export const SETTINGS_SLUGS=Object.freeze(Object.keys(SETTINGS_PARTS));
export const settingsLink=slug=>`${SITE}/settings/${slug}`;
export const FEEDBACK_LINK=`${SITE}/feedback`;
export const settingsPart=slug=>Object.hasOwn(SETTINGS_PARTS,String(slug))?SETTINGS_PARTS[slug]:null;
// The slug of a Settings part by its section id (Copy link in Settings), or null.
export const settingsSlug=id=>SETTINGS_SLUGS.find(slug=>SETTINGS_PARTS[slug].id===id)??null;
// {app:true}, {settings:slug} or {feedback:true} for a link to the app page, a Settings part or the Feedback window, else null. The wiki's own rule (public/wiki-link.js
// parseWikiLink): only our site (with or without www; typed without https:// too), no port or login; a query (?fbclid=…) is left
// out; no #spot (the database counts none), a trailing slash is fine. Like the database (4 Oct 2026 review): http:// and capitals too
// (HARVESTTYCOON.COM/SETTINGS/PRIVACY); safe, as a chip opens APP_LINK or Settings by its slug, never the address typed.
export function parseGameLink(url){
 const text=String(url??'').trim();if(!text||text.length>300||/\s/.test(text))return null;
 let link;try{link=new URL(/^[a-z][a-z0-9+.-]*:/i.test(text)?text:`https://${text}`);}catch{return null;}
 if(!/^https?:$/.test(link.protocol)||!/^(www\.)?harvesttycoon\.com$/.test(link.hostname)||link.port||link.username||link.password||link.hash)return null;
 const path=link.pathname.toLowerCase();
 if(/^\/app\/?$/.test(path))return {app:true};
 if(/^\/feedback\/?$/.test(path))return {feedback:true};
 const [,slug]=path.match(/^\/settings\/([a-z-]+)\/?$/)??[];
 return settingsPart(slug)?{settings:slug}:null;
}
// Every such link in a text (a chat message), in order: {url, index, app}, {url, index, settings} or {url, index, feedback}. Like wikiLinksIn: a link starts a
// word, never the tail of another address; a group, not a lookbehind (older iPhones).
export function gameLinksIn(text){
 const found=[];
 for(const m of String(text??'').matchAll(/(^|[^\p{L}\p{N}_.@/:%?#=&+~-])((?:https?:\/\/)?(?:www\.)?harvesttycoon\.com\/(?:app|settings\/|feedback)[^\s<>"']*)/giu)){const url=m[2].replace(/[.,!?;:)]+$/,''),hit=parseGameLink(url);if(hit)found.push({url,index:m.index+m[1].length,...hit});}
 return found;
}
