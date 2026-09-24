import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const KEY='harvest-tycoon:cookies',DAY=864e5;
const banner=read('public/cookie-consent.js'),play=read('public/play.html');

// Runs public/cookie-consent.js against a small stand-in for the page.
function page({saved,search='',cookies=''}={}){
 const store=new Map(saved?[[KEY,JSON.stringify(saved)]]:[]),writes=[],body={children:[]};
 body.appendChild=el=>body.children.push(el);
 const document={readyState:'complete',body,addEventListener(){},
  get cookie(){return cookies;},set cookie(value){writes.push(value);},
  createElement(){
   const el={attributes:{},setAttribute(k,v){el.attributes[k]=v;},remove(){body.children=body.children.filter(c=>c!==el);},
    set innerHTML(html){el.html=html;el.buttons=[...html.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)].map(([,attrs,text])=>({attrs,text,getAttribute:name=>attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1]??null}));},
    get innerHTML(){return el.html;},querySelectorAll:selector=>selector==='[data-cookie]'?el.buttons:[]};
   return el;
  }};
 const win={document,URLSearchParams,JSON,Date,gtm:0,reloads:0,
  localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},
  location:{search,pathname:'/',hash:'',hostname:'www.harvesttycoon.com',reload(){win.reloads++;}},
  history:{state:null,replaceState(_s,_t,url){win.url=url;}}};
 win.window=win;win.harvestLoadGtm=()=>{win.gtm++;win.harvestGtmLoaded=true;};
 vm.runInNewContext(banner,win);
 const shown=()=>body.children[0];
 return {win,writes,shown,saved:()=>JSON.parse(store.get(KEY)??'null')};
}
const press=(p,text)=>p.shown().buttons.find(b=>b.text===text).onclick();

test('a first visit shows the choice and loads nothing until the visitor answers',()=>{
 const p=page();
 assert.ok(p.shown(),'the banner is shown');assert.equal(p.win.gtm,0,'Tag Manager waits');
 assert.match(p.shown().html,/Google Analytics and the Meta Pixel/);assert.match(p.shown().html,/href="\/privacy#cookies"/);
});
test('Decline and Accept are the same kind of button, side by side, so declining is as easy as accepting',()=>{
 const [decline,accept]=page().shown().buttons;
 assert.deepEqual([decline.text,accept.text],['Decline','Accept']);
 assert.equal(decline.attrs.replace('declined','X'),accept.attrs.replace('accepted','X'),'identical apart from the choice itself');
 const css=read('public/welcome.css');
 assert.match(css,/\.cookie-actions\{display:grid;grid-template-columns:1fr 1fr/,'two equal columns');
 assert.doesNotMatch(css,/\.cookie-button\[data-cookie/,'no extra styling for one of the two');
});
test('Accept remembers the choice and starts Tag Manager at once; the banner closes',()=>{
 const p=page();press(p,'Accept');
 assert.equal(p.saved().choice,'accepted');assert.equal(p.win.gtm,1);assert.equal(p.shown(),undefined);
});
test('Decline remembers the choice, removes Google and Meta cookies from our domain, and keeps other cookies',()=>{
 const p=page({cookies:'_ga=GA1.1.1; _ga_ABC123=GS1; _fbp=fb.1; sb-token=keep; harvest=1'});press(p,'Decline');
 assert.equal(p.saved().choice,'declined');assert.equal(p.win.gtm,0);assert.equal(p.win.reloads,0,'nothing was running, so no reload');
 const removed=new Set(p.writes.map(w=>w.split('=')[0]));
 assert.deepEqual([...removed].sort(),['_fbp','_ga','_ga_ABC123']);
 for(const domain of ['','; domain=www.harvesttycoon.com','; domain=.harvesttycoon.com'])assert.ok(p.writes.includes(`_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`),domain||'no domain');
});
test('withdrawing an earlier yes reloads the page, so the tools that were running stop',()=>{
 const p=page({saved:{choice:'accepted',at:Date.now()}});
 assert.equal(p.shown(),undefined,'no banner while the choice stands');
 p.win.harvestConsent.open();assert.match(p.shown().html,/Your choice now: <strong>accepted<\/strong>/);
 press(p,'Decline');assert.equal(p.saved().choice,'declined');assert.equal(p.win.reloads,1);
});
test('the choice is kept for 12 months, then asked again',()=>{
 assert.equal(page({saved:{choice:'declined',at:Date.now()-300*DAY}}).shown(),undefined);
 assert.ok(page({saved:{choice:'accepted',at:Date.now()-366*DAY}}).shown());
 assert.ok(page({saved:{choice:'maybe',at:Date.now()}}).shown(),'anything else counts as no choice');
});
test('/?cookie-settings (the link in the privacy policy) opens the choice and cleans the address',()=>{
 const p=page({saved:{choice:'declined',at:Date.now()},search:'?cookie-settings&source=pwa'});
 assert.ok(p.shown());assert.equal(p.win.url,'/?source=pwa');
});

// The loader at the top of play.html, run with each saved choice.
function loader(saved){
 const script=play.match(/<!-- Google Tag Manager, only after the visitor accepts cookies[^>]*-->\n<script>([\s\S]*?)<\/script>/)[1];
 const inserted=[],store=new Map(saved===undefined?[]:[[KEY,JSON.stringify(saved)]]);
 const document={getElementsByTagName:()=>[{parentNode:{insertBefore:el=>inserted.push(el)}}],createElement:()=>({})};
 const win={document,JSON,Date,localStorage:{getItem:k=>store.get(k)??null}};win.window=win;
 vm.runInNewContext(script,win);
 return {inserted,win};
}
test('the head loader starts Tag Manager only for a saved, recent "accepted"',()=>{
 assert.equal(loader({choice:'accepted',at:Date.now()}).inserted[0].src,'https://www.googletagmanager.com/gtm.js?id=GTM-NPF56JVR');
 for(const saved of [undefined,{choice:'declined',at:Date.now()},{choice:'accepted',at:Date.now()-366*DAY}])assert.equal(loader(saved).inserted.length,0,JSON.stringify(saved));
 const later=loader(undefined);later.win.harvestLoadGtm();later.win.harvestLoadGtm();assert.equal(later.inserted.length,1,'loaded once, even if asked twice');
 assert.match(play,/<script src="\/cookie-consent\.js" defer><\/script>/);
});
test('the choice can be changed later: on the home page, in the game settings and in the privacy policy',()=>{
 assert.match(play,/<button type="button" class="site-legal-button" onclick="window\.harvestConsent&&window\.harvestConsent\.open\(\)">Cookie settings<\/button>/);
 assert.match(read('public/farm.html'),/<button id="cookie-settings" class="small-button" type="button">Cookie settings<\/button>/);
 assert.match(read('public/sound-settings.js'),/window\.parent\?\.harvestConsent\?\.open\(\)/);
 const policy=read('public/privacy.html');
 assert.match(policy,/Only if you choose <strong>Accept<\/strong> in the cookie banner/);assert.match(policy,/<a href="\/\?cookie-settings">home page<\/a>/);
 assert.match(policy,/<code>harvest-tycoon:cookies<\/code>/);assert.match(policy,/Legal basis: your consent \(Article 6\(1\)\(a\) GDPR\), which you can withdraw at any time under Cookie settings/);
 assert.doesNotMatch(policy,/cookie-consent\.js|googletagmanager\.com\/gtm/,'the policy page itself still loads no tracking');
});
