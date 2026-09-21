import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {installState,startPwa} from '../src/pwa.js';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const png=path=>{const b=readFileSync(new URL(path,root));assert.equal(b.subarray(1,4).toString(),'PNG',path);return {w:b.readUInt32BE(16),h:b.readUInt32BE(20)};};

test('the install block offers what fits the device',()=>{
 assert.equal(installState({standalone:true,promptReady:true}).kind,'installed');
 assert.equal(installState({promptReady:true}).kind,'prompt');
 assert.equal(installState({ios:true}).kind,'ios','iPhones have no prompt: show the Share steps');
 assert.equal(installState({}).kind,'manual');
 assert.equal(installState({serviceWorker:false}).kind,'unsupported');assert.equal(installState({secure:false}).kind,'unsupported');
});
function fakeWindow({standalone=false,userAgent='Mozilla/5.0 (Linux; Android 14)',readyState='complete'}={}){
 const handlers={},registered=[];
 const win={navigator:{userAgent,serviceWorker:{register:async(url,options)=>{registered.push({url,options});}}},document:{readyState},isSecureContext:true,dataLayer:[],matchMedia:()=>({matches:standalone}),addEventListener(name,fn){handlers[name]=fn;}};
 return {win,handlers,registered};
}
test('the service worker is registered once, for the whole site',()=>{
 const {win,registered}=fakeWindow();startPwa(win);
 assert.deepEqual(registered.map(r=>[r.url,r.options.scope]),[['/sw.js','/']]);
 const late=fakeWindow({readyState:'loading'});startPwa(late.win);assert.equal(late.registered.length,0);late.handlers.load();assert.equal(late.registered.length,1);
});
test('the browser install prompt is kept for the settings dialog and used once',async()=>{
 const {win,handlers}=fakeWindow(),api=startPwa(win),seen=[];api.subscribe(state=>seen.push(state.kind));
 assert.equal(api.state().kind,'manual');assert.deepEqual(await api.install(),{outcome:'unavailable'});
 let prevented=false,prompted=0;handlers.beforeinstallprompt({preventDefault(){prevented=true;},async prompt(){prompted++;},userChoice:Promise.resolve({outcome:'accepted'})});
 assert(prevented&&api.state().kind==='prompt');assert.deepEqual(seen,['prompt']);
 assert.deepEqual(await api.install(),{outcome:'accepted'});assert.equal(prompted,1);assert.equal(api.state().kind,'manual','one prompt per event');
 handlers.appinstalled();assert(win.dataLayer.some(e=>e.event==='pwa_installed'));assert(win.dataLayer.some(e=>e.event==='pwa_install_click'));
 assert.equal(win.harvestPwa,api);
});
test('opening the installed app is counted and iPhones are recognised',()=>{
 const app=fakeWindow({standalone:true});startPwa(app.win);assert(app.win.dataLayer.some(e=>e.event==='pwa_launch'));assert.equal(app.win.harvestPwa.state().kind,'installed');
 const phone=fakeWindow({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'});startPwa(phone.win);assert.equal(phone.win.harvestPwa.state().kind,'ios');
 assert.equal(startPwa(null),null);
});
test('the manifest describes an installable app with real icons',()=>{
 const m=JSON.parse(read('public/manifest.webmanifest'));
 assert.equal(m.display,'standalone');assert.equal(m.scope,'/');assert(m.start_url.startsWith('/'));assert.match(m.theme_color,/^#[0-9a-f]{6}$/i);assert(m.name&&m.short_name);
 const sizes=new Set();for(const icon of m.icons){const p='public'+icon.src,{w,h}=png(p);assert.equal(`${w}x${h}`,icon.sizes,icon.src);sizes.add(`${icon.sizes}:${icon.purpose}`);}
 for(const need of ['192x192:any','512x512:any','512x512:maskable'])assert(sizes.has(need),need);
 assert.deepEqual(png('public/assets/pwa/apple-touch-icon.png'),{w:180,h:180});
});
test('play.html links the manifest and the iPhone app tags, and the theme colour matches',()=>{
 const play=read('public/play.html'),m=JSON.parse(read('public/manifest.webmanifest'));
 assert.match(play,/<link rel="manifest" href="\/manifest\.webmanifest">/);assert.match(play,/<link rel="apple-touch-icon" href="\/assets\/pwa\/apple-touch-icon\.png">/);
 assert.match(play,/apple-mobile-web-app-capable/);assert(play.includes(`<meta name="theme-color" content="${m.theme_color}">`));
});
test('the service worker caches nothing and never answers requests itself',()=>{
 const sw=read('public/sw.js').replace(/\/\/.*$/gm,'');
 assert(!/caches|respondWith|cache\.add|indexedDB/.test(sw));assert.match(sw,/skipWaiting/);assert.match(sw,/clients\.claim/);
});
test('the service worker is never cached by the host and may control the whole site',()=>{
 const rules=JSON.parse(read('vercel.json')).headers,get=source=>Object.fromEntries(rules.find(r=>r.source===source).headers.map(h=>[h.key,h.value]));
 assert.equal(get('/sw.js')['Cache-Control'],'no-cache');assert.equal(get('/sw.js')['Service-Worker-Allowed'],'/');
 assert.equal(get('/manifest.webmanifest')['Content-Type'],'application/manifest+json');
});
test('settings: a gear replaces the sound button on desktop and a drawn gear is used in the mobile menu',()=>{
 const farm=read('public/farm.html'),icons=read('public/visual-icons.js');
 assert.match(farm,/id="sound-button" aria-label="Settings"[^>]*title="Settings"><i data-lucide="settings" data-line-icon>/);
 assert.match(farm,/data-menu-action="sound-button"><i data-lucide="settings"><\/i>[\s\S]*Settings<\/strong>/,'mobile: no data-line-icon, so the drawn gear is swapped in');
 assert.match(icons,/svgArt=new Set\(\[[^\]]*'settings'/);assert.match(icons,/settings:'settings'/);
 assert(existsSync(new URL('public/assets/icons/settings.svg',root)));
 assert.match(farm,/<h2 id="sound-title">Settings<\/h2>/);assert(!/Sound settings/.test(farm),'no leftover "Sound settings" text');
 assert.match(farm,/id="app-settings"[^>]*hidden/);assert.match(farm,/href="\/settings\.css"/);
 assert(!/volume-x|volume-2/.test(read('public/sound-settings.js')),'the button no longer flips between speaker icons');
});
test('the farm-app block renders per device and hides itself where nothing can be installed',async()=>{
 const els={};const el=id=>els[id]??=({id,hidden:false,textContent:'',innerHTML:'',disabled:false});
 for(const id of ['app-settings','install-copy','install-steps','install-app'])el(id);
 let state={kind:'ios'},installed=0;
 globalThis.document={getElementById:el,querySelectorAll:()=>[]};
 globalThis.window={parent:{harvestPwa:{state:()=>state,subscribe(){},async install(){installed++;}}}};
 const {createInstallSection}=await import('../public/install-ui.js?t='+Date.now());
 const section=createInstallSection();
 assert.equal(els['app-settings'].hidden,false);assert.equal(els['install-steps'].hidden,false);assert.match(els['install-steps'].innerHTML,/Add to Home Screen/);assert.equal(els['install-app'].hidden,true);
 state={kind:'prompt'};section.refresh();assert.equal(els['install-app'].hidden,false);assert.equal(els['install-steps'].hidden,true);
 await els['install-app'].onclick();assert.equal(installed,1);
 state={kind:'installed'};section.refresh();assert.match(els['install-copy'].textContent,/installed/);assert.equal(els['install-app'].hidden,true);
 state={kind:'unsupported'};section.refresh();assert.equal(els['app-settings'].hidden,true);
 delete globalThis.document;delete globalThis.window;
});
test('settings headings use drawn icons: a golden bell for reminders and a phone with a barn for the farm app',()=>{
 const farm=read('public/farm.html'),icons=read('public/visual-icons.js');
 assert.match(farm,/settings-heading"><i data-lucide="bell"><\/i>Reminders/);assert.match(farm,/settings-heading"><i data-lucide="smartphone"><\/i>Farm app/);
 assert(!/data-lucide="(bell|smartphone)" data-line-icon/.test(farm),'no line icons left on these headings');
 assert.match(icons,/svgArt=new Set\(\[[^\]]*'reminders'[^\]]*'farmapp'/);assert.match(icons,/bell:'reminders'/);assert.match(icons,/smartphone:'farmapp'/);
 for(const file of ['reminders','farmapp']){const svg=read(`public/assets/icons/${file}.svg`);assert.match(svg,/viewBox="0 0 128 128"/);assert(!/<script|onload=|href=/i.test(svg),'a plain drawing');}
});
test('the installed iPhone app keeps the game and the sign-in card clear of the notch and the home indicator',()=>{
 const css=read('public/welcome.css');
 assert.match(css,/#farm-host\{inset:env\(safe-area-inset-top\) env\(safe-area-inset-right\) env\(safe-area-inset-bottom\) env\(safe-area-inset-left\)\}/,'the game frame is inset, because the iframe cannot see the safe areas itself');
 assert.match(css,/#welcome\{padding-top:calc\(12px \+ env\(safe-area-inset-top\)\);padding-bottom:calc\(12px \+ env\(safe-area-inset-bottom\)\)\}/);
 assert.match(read('public/play.html'),/viewport-fit=cover/);
});
