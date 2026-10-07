// The App Store badges (7 Oct 2026, the iPhone app in review). Every one is Apple's own picture in a link marked data-app-store-link: in
// the website's footers to the app page (/app, /es/app, ...; on the app page itself to its iPhone part), and on the app page in the
// iPhone part without an address, behind data-app-store="off". Once APP_STORE_URL (public/game-links.js) holds the app's App Store
// address, the deploy runs this over every page: each badge links there (in a new tab, as Google Play's badge does) and the app page
// shows the App Store instead of the Home Screen steps. null leaves the pages as they are.
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
export function withAppStore(html,url){
 if(url==null)return html;
 const href=appStoreAddress(url);
 return html.replace(BADGE,(tag,before,after)=>{
  const rest=`${before} ${after}`.replace(/\s(?:href|target|rel)="[^"]*"/g,'').replace(/\s+/g,' ').trim();
  return `<a ${rest} href="${href}" target="_blank" rel="noopener" data-app-store-link>`;
 }).replaceAll('data-app-store="off"','data-app-store="on"');
}
// Every page of the build (folders included); returns how many pages it changed. A set address with no badge anywhere stops the deploy.
export function applyAppStore(dir,url){
 if(url==null)return 0;
 let changed=0;
 const walk=folder=>{for(const entry of readdirSync(folder,{withFileTypes:true})){
  const path=join(folder,entry.name);
  if(entry.isDirectory())walk(path);
  else if(entry.name.endsWith('.html')){const html=readFileSync(path,'utf8'),next=withAppStore(html,url);if(next!==html){writeFileSync(path,next);changed++;}}
 }};
 walk(dir);
 if(!changed)throw new Error('App Store: APP_STORE_URL is set, but no page has an App Store badge');
 return changed;
}
