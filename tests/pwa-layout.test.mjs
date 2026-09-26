import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');

// Runs public/app-mode.js against a fake page. `safeTop` is what env(safe-area-inset-top) resolves to.
function run({standalone=true,parentStandalone=false,inFrame=false,parentShortfall=' 0px',fixed=null,width=402,height=874,screen={width:402,height:874},safeTop=62}={}){
 const listeners={window:{},document:{}},vars={},attrs={};
 const page={innerWidth:width,innerHeight:height,matchMedia:()=>({matches:standalone}),navigator:{standalone:false},
  addEventListener:(name,fn)=>{listeners.window[name]=fn;}};
 const html={setAttribute:(key,value)=>{attrs[key]=value;},removeAttribute:key=>{delete attrs[key];},hasAttribute:key=>key in attrs,style:{setProperty:(key,value)=>{vars[key]=value;}},appendChild(){},removeChild(){}};
 let viewport='width=device-width, initial-scale=1, viewport-fit=cover';const meta={getAttribute:()=>viewport,setAttribute:(key,value)=>{viewport=value;}};
 page.document={documentElement:html,querySelector:()=>meta,createElement:()=>({style:{},getBoundingClientRect:()=>({height:fixed??page.innerHeight})}),addEventListener:(name,fn)=>{listeners.document[name]=fn;}};
 page.parent=inFrame?{matchMedia:()=>({matches:parentStandalone}),navigator:{standalone:false},document:{documentElement:{}},getComputedStyle:()=>({getPropertyValue:()=>parentShortfall})}:page;
 // The script reads bare `window`, `document`, `screen` and `getComputedStyle`.
 vm.runInNewContext(read('public/app-mode.js'),{window:page,document:page.document,screen,getComputedStyle:()=>({paddingTop:`${safeTop}px`}),setTimeout:()=>0});
 return {attrs,vars,listeners,fake:page,viewport:()=>viewport};
}
const shortfall=options=>run(options).vars['--viewport-shortfall'];

test('the ordinary browser is never marked, so the installed-app rules cannot reach it',()=>{
 const page=run({standalone:false});
 assert.deepEqual(page.attrs,{});assert.deepEqual(page.vars,{});
});
test('the installed app is marked, in the page and in the game frame',()=>{
 assert.equal(run().attrs['data-app-mode'],'standalone');
 assert.equal(run({standalone:false,inFrame:true,parentStandalone:true}).attrs['data-app-mode'],'standalone','the frame follows the page around it');
 assert.deepEqual(run({standalone:false,inFrame:true,parentStandalone:false}).attrs,{});
});
test('a layout height that is a status bar short of the screen is measured',()=>{
 assert.equal(shortfall({height:812}),'62px','iPhone with Dynamic Island: 874 - 812 is exactly the status bar');
 assert.equal(shortfall({width:390,height:753,screen:{width:390,height:844},safeTop:91}),'91px');
});
test('a page that fills the screen has no shortfall',()=>{
 assert.equal(shortfall({height:874}),'0px');
});
test('other reasons for a shorter page are not mistaken for the quirk',()=>{
 assert.equal(shortfall({height:812,safeTop:0}),'0px','a page below an opaque status bar has no safe area on top');
 assert.equal(shortfall({height:600}),'0px','a split-screen window is not a status bar short');
 assert.equal(shortfall({width:874,height:402,screen:{width:402,height:874},safeTop:0}),'0px','landscape');
 assert.equal(shortfall({width:874,height:402,screen:{width:874,height:402},safeTop:0}),'0px','landscape, when the screen reports its size the other way round');
});
test('it measures again when the window changes',()=>{
 const page=run({height:874});
 assert.equal(page.vars['--viewport-shortfall'],'0px');
 page.fake.innerHeight=812;page.listeners.window.resize();
 assert.equal(page.vars['--viewport-shortfall'],'62px');
 page.fake.innerHeight=874;page.listeners.window.orientationchange();
 assert.equal(page.vars['--viewport-shortfall'],'0px');
});

const rules=css=>css.replace(/\/\*[\s\S]*?\*\//g,'').split('}').map(rule=>rule.split('{')[0].trim()).filter(Boolean);
test('every installed-app layout rule is scoped to the installed app',()=>{
 const css=read('public/pwa-layout.css');
 assert(rules(css).length>=2);
 for(const selector of rules(css))assert(selector.startsWith('html[data-app-mode=standalone]'),`unscoped rule: ${selector}`);
 // The strip below the fixed game frame (iOS) shows the body: with the farm open both html and body are the bottom bar's cream.
 assert.match(read('public/welcome.css'),/html\[data-app-mode=standalone\]:has\(body\[data-phase=authenticated\]\),html\[data-app-mode=standalone\] body\[data-phase=authenticated\]\{background:#fffdf5\}/);
 assert.match(read('public/mobile.css'),/\.side-tools\{position:absolute;inset:auto 0 0;[^}]*background:#fffdf5/,'the same cream as the bottom bar on phones');
 assert.match(read('public/farm.html'),/First allow notifications on this device: private messages, your daily gift and crops &amp; goods ready are then on\. You can switch each one off below\./,'the reminders text matches the defaults');
 assert.doesNotMatch(read('public/privacy.html'),/switched off by default/);
});
test('the game reads the bottom safe area in one place, which the installed app can correct',()=>{
 const base=read('public/styles.css');
 assert.match(base,/^:root\{--safe-bottom:env\(safe-area-inset-bottom,0px\)\}/,'the browser keeps the plain safe area');
 assert.match(read('public/pwa-layout.css'),/html\[data-app-mode=standalone\]\{--safe-bottom:max\(0px,calc\(env\(safe-area-inset-bottom,0px\) - var\(--viewport-shortfall,0px\)\)\)\}/);
 const own=new Set(['styles.css','welcome.css','pwa-layout.css','loading-screen.css']);
 for(const file of readdirSync(new URL('public/',root)).filter(name=>name.endsWith('.css')&&!own.has(name)))
  assert(!/env\(safe-area-inset-bottom\)/.test(read(`public/${file}`)),`${file} reads the bottom safe area directly`);
 for(const file of ['mobile.css','beginner.css','settings.css','starter-pack.css'])assert.match(read(`public/${file}`),/var\(--safe-bottom\)/,file);
});
test('the game frame and the page load the installed-app files, before anything is drawn',()=>{
 const farm=read('public/farm.html'),play=read('public/play.html');
 assert(farm.indexOf('/app-mode.js')>0&&farm.indexOf('/app-mode.js')<farm.indexOf('/styles.css'));
 const sheets=[...farm.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(sheets.at(-1),'/pwa-layout.css','loaded last, so it can correct the rules before it');
 assert(play.indexOf('/app-mode.js')>0&&play.indexOf('/app-mode.js')<play.indexOf('/welcome.css'));
});

// 26 Sep 2026: the page stretches the game frame over the strip, so the farm reaches the bottom of the screen; inside the frame the
// buttons stay above the strip, in case it takes no taps.
test('the game frame reaches over the strip, and its bottom bar sits on the home indicator like an app',()=>{
 // iOS draws no fixed element below the short layout (seen on an iPhone): the frame is then part of the page, a strip taller.
 assert.match(read('public/welcome.css'),/html\[data-app-mode=standalone\]\[data-viewport-short\] #farm-host\{position:absolute;top:0;right:0;bottom:auto;left:0;height:calc\(100% \+ var\(--viewport-shortfall,0px\)\)\}/);
 assert.match(read('public/welcome.css'),/html\[data-app-mode=standalone\]\[data-viewport-short\] #loading-screen\{position:absolute;top:0;right:0;bottom:auto;left:0;height:calc\(100% \+ var\(--viewport-shortfall,0px\)\);min-height:0\}/,'and the loading screen before the farm opens');
 assert.equal(run({height:812}).attrs['data-viewport-short'],'');assert.equal(run({height:874}).attrs['data-viewport-short'],undefined,'only when the layout is short');
 assert.equal(run({height:874}).viewport(),'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover','the installed app starts with the game viewport and keeps it');
 const stretched=run({standalone:false,inFrame:true,parentStandalone:true,height:874,parentShortfall:' 62px'});
 assert.equal(stretched.vars['--viewport-shortfall'],'0px','the stretched frame fills the screen');assert.equal(stretched.vars['--frame-strip'],'62px','the strip of the page around it (for the admin\'s device line)');
 assert.doesNotMatch(read('public/pwa-layout.css'),/var\(--frame-strip/,'the buttons are no longer kept above it: that left an empty band');
 const short=run({standalone:false,inFrame:true,parentStandalone:true,height:812,parentShortfall:' 62px'});
 assert.equal(short.vars['--viewport-shortfall'],'62px');assert.equal(short.vars['--frame-strip'],'0px','a frame that is itself short already keeps clear of the strip: no double room');
 assert.equal(run({height:874}).vars['--frame-strip'],'0px','the page itself');
});

// 26 Sep 2026: on the user's iPhone the fix did nothing: window.innerHeight was the full screen, the full-screen box was not.
test('a full-screen box that ends a status bar short counts, even when window.innerHeight says full screen; the admin can read the numbers',()=>{
 const page=run({height:874,fixed:812});
 assert.equal(page.vars['--viewport-shortfall'],'62px');
 assert.deepEqual({...page.fake.harvestViewport},{screen:'402×874',window:'402×874',fixed:812,statusBar:62,shortfall:62,strip:0});
 assert.equal(run({height:874,fixed:874}).vars['--viewport-shortfall'],'0px','a box that fills the screen: nothing to fix');
 assert.match(read('src/admin-dashboard.js'),/This device: screen \$\{page\.screen\}, window \$\{page\.window\}, full-screen box \$\{page\.fixed\}/);
});
