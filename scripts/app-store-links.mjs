// The App Store badges (7 Oct 2026, the iPhone app in review). Every one is Apple's own picture in a link marked data-app-store-link: in
// the website's footers to the app page (/app, /es/app, ...; on the app page itself to its iPhone part), and on the app page in the
// iPhone part without an address, behind data-app-store="off". Once APP_STORE_URL (public/game-links.js) holds the app's App Store
// address, the deploy runs this over every page: each badge links there (in a new tab, as Google Play's badge does) and the app page
// shows the App Store instead of the Home Screen steps. null leaves the badges as they are.
// What a page says about the iPhone app (8 Oct 2026): the words that are true while Apple reviews it sit between <!--app-store:soon-->
// and <!--/app-store:soon-->, the words for once it is in the App Store between <!--app-store:live--> and <!--/app-store:live--> (both
// translated like any text: scripts/build-languages.mjs leaves the comments alone). The deploy keeps only the true ones, so the pages'
// own words never promise an App Store app before there is one, nor say "coming soon" after. Only that wording switches: the footers'
// App Store badges stay as they are (the owner's design) and link to the app page until there is an App Store address.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
// Apple's product page, without the country (apps.apple.com/nl/app/... → apps.apple.com/app/...): every visitor then lands in their own
// country's store. Anything else is a mistake and stops the deploy.
export function appStoreAddress(url){
 const m=/^https:\/\/apps\.apple\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?app\/((?:[a-z0-9%-]+\/)?id\d{6,12})(?:[?#][^\s"'<>]*)?$/i.exec(String(url??'').trim());
 if(!m)throw new Error(`App Store: ${JSON.stringify(url)} is not an App Store app address (https://apps.apple.com/app/<name>/id<number>)`);
 return `https://apps.apple.com/app/${m[1]}`;
}
const BADGE=/<a ([^>]*?)\s*data-app-store-link([^>]*)>/g;
const WORDING=state=>new RegExp(`<!--app-store:${state}-->([\\s\\S]*?)<!--/app-store:${state}-->`,'g');
export const appStoreWording=(html,live)=>html.replace(WORDING(live?'soon':'live'),'').replace(WORDING(live?'live':'soon'),(all,words)=>words);
export function withAppStore(html,url){
 if(url==null)return appStoreWording(html,false);
 const href=appStoreAddress(url);
 return appStoreWording(html,true).replace(BADGE,(tag,before,after)=>{
  const rest=`${before} ${after}`.replace(/\s(?:href|target|rel)="[^"]*"/g,'').replace(/\s+/g,' ').trim();
  return `<a ${rest} href="${href}" target="_blank" rel="noopener" data-app-store-link>`;
 }).replaceAll('data-app-store="off"','data-app-store="on"');
}
// Every page of the build (folders included), also while the address is null (the wording); returns how many pages it changed. A set
// address with no badge anywhere stops the deploy.
export function applyAppStore(dir,url){
 let changed=0;
 const walk=folder=>{for(const entry of readdirSync(folder,{withFileTypes:true})){
  const path=join(folder,entry.name);
  if(entry.isDirectory())walk(path);
  else if(entry.name.endsWith('.html')){const html=readFileSync(path,'utf8'),next=withAppStore(html,url);if(next!==html){writeFileSync(path,next);changed++;}}
 }};
 walk(dir);
 if(url!=null&&!changed)throw new Error('App Store: APP_STORE_URL is set, but no page has an App Store badge');
 return changed;
}
