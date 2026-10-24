// Calmer windows (23 Oct 2026, the owner: "Ik bedoelde vooral de dialogen dat ze te druk ogen", then "doe alles"): rows instead of cards,
// facts instead of pills, a window's rules behind its ⓘ, the free slots as one tile, a recipe's time and profit first; and confetti when
// a building opens for you or is bought ("Doe confetti als je een nieuw gebouw opent en koopt").
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hintsButton,hintTexts,HINT_LINES} from '../public/dialog-shell.js';
import {confettiBurst,confettiFrom,CONFETTI_COLOURS} from '../public/confetti.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const css=read('public/calm-windows.css');

test('the calm sheet comes after every window\'s own sheet and the shell, before the farm screen\'s; nothing in it is under 12 px',()=>{
 const sheets=[...read('public/farm.html').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(sheets.slice(-3),['/dialog-shell.css','/calm-windows.css','/hud.css']);
 for(const m of css.matchAll(/font(?:-size)?:[^;}]*?(\d+(?:\.\d+)?)px/g))assert.ok(Number(m[1])>=12,m[0]);
 // Rows, not cards; what is ready keeps its green card.
 assert.match(css,/#task-list \.quest-item,\n#seed-dialog \.seed-row,[^{]*\{\n border:0;border-bottom:1px solid var\(--calm-line\);border-radius:0;background:none;box-shadow:none;/);
 assert.match(css,/#task-list \.quest-item\.is-ready,[^{]*\{\n margin-block:6px;margin-inline:-10px;padding-inline:11px;border:1px solid var\(--calm-ready-line\);border-radius:16px;background:var\(--calm-ready-fill\);/);
 assert.match(css,/--calm-ready-line:#8cc06a;--calm-ready-fill:#eef7e3/,'the house style\'s ready green');
 // Only "ready" stays a pill.
 assert.match(css,/#buildings-dialog \.building-status:not\(\.ready\)\{padding:0;background:none\}/);
});

test('a window\'s rules wait behind its ⓘ: hidden where they stand, the same lines as the ⓘ\'s card, each one still in the game',()=>{
 const list=css.match(/dialog :is\((\.seed-yield-line,[^)]*)\)/)[1].replace(/\s+/g,'');
 assert.equal(list,HINT_LINES,'the sheet hides what the card shows');
 const sources=['public/farm.html','public/economy-ui.js','public/retention-ui.js','public/warehouse-ui.js','public/growth-ui.js','public/boosts-ui.js','public/season-ui.js','public/pass-ui.js','public/family-ui.js'].map(read).join('\n');
 for(const name of list.match(/\.[\w-]+/g))assert.ok(sources.includes(name.slice(1)),`still made by the game: ${name}`);
 assert.match(css,/#seed-dialog>p\{display:none!important\}/,'beats a window\'s own id rule');
 // A building's window keeps its lines in view (23 Oct 2026, the owner: "dezelfde layout en informatie").
 assert.doesNotMatch(list,/milling|production-capacity|recipe-section/);
});

// 24 Oct 2026 (the owner: "wat doet dit i'tje hier? ik klik erop maar er gebeurt niks"): the ⓘ opens a card under the heading with the
// window's lines, and only shows while there is one to show (not one in a tab that is not open).
test('the ⓘ beside Close: a card with the window\'s rules under its heading, a second press closes it; there only while there is a rule',()=>{
 const el=(extra={})=>{const kids=[],attrs={};return {kids,attrs,hidden:false,textContent:'',setAttribute:(k,v)=>{attrs[k]=v;},getAttribute:k=>attrs[k],append:(...n)=>kids.push(...n),...extra};};
 const line=(text,inHidden=false)=>({textContent:text,closest:sel=>sel==='[hidden]'?(inHidden?{}:null):null});
 let lines=[line('Coins grow  with your level.'),line('Customers pay more.',true),line('Coins grow with your level.')];
 const made=[];let panel=null,kept=null,scrolled=null;
 const head={after:p=>{panel=p;made.push('panel');}};
 const close={parentElement:{querySelector:()=>kept},before:b=>{kept=b;made.push('button');}};
 const dialog={id:'today-dialog',scrollTo:o=>{scrolled=o;},querySelectorAll:sel=>sel===HINT_LINES?lines:[],
  querySelector:sel=>sel==='.dialog-heading .close-dialog'?close:sel===':scope>.dialog-top,:scope>.dialog-heading'?head:sel==='.hints-panel'?panel:sel==='.hints-button'?kept:null};
 const doc={createElement:tag=>{const e=el({tag});e.addEventListener=(t,f)=>{e['on'+t]=f;};e.remove=()=>{if(panel===e)panel=null;};return e;}};
 assert.deepEqual(hintTexts(dialog),['Coins grow with your level.'],'its own words once, not a line in a closed tab');
 const button=hintsButton(dialog,doc,null);
 assert.equal(button.className,'hints-button');assert.equal(button.textContent,'i');assert.equal(button.attrs['aria-label'],'How it works');assert.equal(button.hidden,false);
 button.onclick();
 assert.ok(panel,'a card');assert.equal(panel.className,'hints-panel');assert.equal(panel.attrs.translate,'no','already in the farmer\'s language');
 assert.deepEqual(panel.kids.map(p=>p.textContent),['Coins grow with your level.']);assert.equal(button.attrs['aria-pressed'],'true');assert.deepEqual(scrolled,{top:0});
 // A second press closes it; opening the window again starts closed.
 panel.remove=()=>{panel=null;};button.onclick();assert.equal(panel,null);assert.equal(button.attrs['aria-pressed'],'false');
 button.onclick();panel.remove=()=>{panel=null;};assert.ok(panel);hintsButton(dialog,doc,null);assert.equal(panel,null,'closed on opening');
 assert.equal(made.filter(m=>m==='button').length,1,'one ⓘ');
 // With no rule to show (all in closed tabs) the ⓘ hides.
 lines=[line('Customers pay more.',true)];hintsButton(dialog,doc,null);assert.equal(button.hidden,true);
 assert.equal(hintsButton({querySelector:()=>null},doc),null,'a window without a Close in its heading has none');
 const shell=read('public/dialog-shell.js');
 assert.match(shell,/if\(!dialog\.open\)\{dialog\.removeAttribute\('data-scrolled'\);try\{hintWatch\.get\(dialog\)\?\.disconnect\(\);hintWatch\.delete\(dialog\);closeHints\(dialog\);\}catch\{\}return;\}\n try\{hintsButton\(dialog\);\}catch\{\}/,'on every opening; the watch ends on closing');
 assert.match(css,/\.dialog-heading \.hints-button\[hidden\]\{display:none\}/);
 assert.ok('How it works' in JSON.parse(read('i18n/catalog.json')),'translated already');
});

test('a building\'s window is as it was before the redesign, its look too, with what you cannot make greyed out',()=>{
 const ui=read('public/economy-ui.js'),retention=read('public/retention.css');
 assert.doesNotMatch(ui,/\.repeat\(free\)|job-tile/);assert.match(ui,/<div class="job-panel /);
 // The calm sheet leaves the production window alone (the owner, 23 Oct 2026: "vroeger was nog steeds beter", "ook niet groen").
 assert.doesNotMatch(css,/recipe-card|recipe-flow|recipe-meta|recipe-xp/);
 assert.doesNotMatch(retention,/#building-dialog #building-content \.recipe-card\.is-ready,/,'not in the light-green ready rule');
 assert.match(retention,/#building-content \.recipe-card\.is-ready\{border-color:#cfe0c3;background:#f8fbf3\}/,'its own quiet ready look, as before');
 assert.match(retention,/#building-content \.recipe-card:not\(\.is-ready\)\{background:#f3efe8\}/,'what you cannot make is greyed out');
 // On a computer two recipes side by side again (desktop-hud.css).
 assert.match(read('public/desktop-hud.css'),/:is\(#crop-catalog,#building-dialog \.recipe-list,#today-content \.daily-list\)\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('confetti on the screen: the farm\'s colours, in the open window, never with reduced motion, never in the way',()=>{
 assert.deepEqual([...CONFETTI_COLOURS],['#58b865','#f2b544','#e0624c','#7fc3ea','#ffe58a']);
 const game=read('public/game.js');for(const c of CONFETTI_COLOURS)assert.match(game,new RegExp(`0x${c.slice(1)}`),'the same as the farm\'s own confetti');
 const el=()=>{const kids=[];return {kids,style:{},setAttribute(){},append:(...n)=>kids.push(...n),animate:()=>({}),remove(){this.gone=true;}};};
 const body=el(),modal=el();modal.matches=s=>s===':modal';
 const doc={body,createElement:()=>el(),querySelectorAll:s=>s==='dialog[open]'?[modal]:[]},win={matchMedia:()=>({matches:false})};
 const timers=[];globalThis.setTimeout=(f,ms)=>{timers.push(ms);return 0;};
 const layer=confettiBurst({x:100,y:200,count:12,doc,win,random:()=>.5});
 assert.equal(layer.kids.length,12);assert.equal(modal.kids[0],layer,'in the open window, above the rest');assert.equal(body.kids.length,0);
 assert.match(layer.style.cssText,/position:fixed;inset:0;z-index:2147483000;pointer-events:none/);assert.deepEqual(timers,[1600]);
 assert.equal(confettiBurst({x:1,y:1,doc,win:{matchMedia:()=>({matches:true})}}),null,'reduced motion');
 assert.equal(confettiBurst({x:NaN,y:1,doc,win}),null);assert.equal(confettiFrom(null),null);
 const plain={...doc,querySelectorAll:()=>[]};confettiBurst({x:1,y:1,count:3,doc:plain,win,random:()=>.1});assert.equal(body.kids.length,1,'no window open: over the farm');
});

test('confetti when you buy a building (from its button) and when a level opens one (over it on the farm, once the window in front closed)',()=>{
 const ui=read('public/economy-ui.js'),game=read('public/game.js');
 assert.match(ui,/\$\('construct-building'\)\?\.addEventListener\('click',e=>\{const at=e\.currentTarget\.getBoundingClientRect\(\);mutate\(async\(\)=>\{await runAction\(\{type:'construct',building:key\}\);confettiFrom\(at\);/);
 assert.match(ui,/\[data-village-build\]'\)\?\.addEventListener\('click',e=>\{const at=e\.currentTarget\.getBoundingClientRect\(\);mutate\(async\(\)=>\{const r=await runAction\(\{type:'village_build',place:key\}\);confettiFrom\(at\);/);
 assert.match(game,/const open=new Set\(Object\.keys\(BUILDINGS\)\.filter\(key=>buildingEligible\(state,key\)\)\);\n const fresh=buildingsOpen\?\[\.\.\.open\]\.filter\(key=>!buildingsOpen\.has\(key\)\):\[\];buildingsOpen=open;/,'the first look only notes');
 assert.match(game,/if\(modalOpen\(\)&&performance\.now\(\)-asked<CHEER_WAIT\)\{setTimeout\(now,400\);return;\}const box=new THREE\.Box3\(\)\.setFromObject\(view\.object\);confettiAt\(/);
 assert.match(game,/\n if\(ready\)cheerNewBuildings\(\);\n/);
});
