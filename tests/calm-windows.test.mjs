// Calmer windows (23 Oct 2026, the owner: "Ik bedoelde vooral de dialogen dat ze te druk ogen", then "doe alles"): rows instead of cards,
// facts instead of pills, a window's rules behind its ⓘ, the free slots as one tile, a recipe's time and profit first; and confetti when
// a building opens for you or is bought ("Doe confetti als je een nieuw gebouw opent en koopt").
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hintsButton} from '../public/dialog-shell.js';
import {confettiBurst,confettiFrom,CONFETTI_COLOURS} from '../public/confetti.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const css=read('public/calm-windows.css');

test('the calm sheet comes after every window\'s own sheet and the shell, before the farm screen\'s; nothing in it is under 12 px',()=>{
 const sheets=[...read('public/farm.html').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(sheets.slice(-3),['/dialog-shell.css','/calm-windows.css','/hud.css']);
 for(const m of css.matchAll(/font(?:-size)?:[^;}]*?(\d+(?:\.\d+)?)px/g))assert.ok(Number(m[1])>=12,m[0]);
 // Rows, not cards; what is ready keeps its green card.
 assert.match(css,/#task-list \.quest-item,\n#seed-dialog \.seed-row,[^{]*\{\n border:0;border-bottom:1px solid var\(--calm-line\);border-radius:0;background:none;box-shadow:none;/);
 assert.match(css,/#task-list \.quest-item\.is-ready,[^{]*\{\n margin-block:6px;padding-inline:12px;border:1px solid var\(--calm-ready-line\);border-radius:16px;background:var\(--calm-ready-fill\);/);
 assert.match(css,/--calm-ready-line:#8cc06a;--calm-ready-fill:#eef7e3/,'the house style\'s ready green');
 // Only "ready" stays a pill.
 assert.match(css,/#buildings-dialog \.building-status:not\(\.ready\)\{padding:0;background:none\}/);
});

test('a window\'s rules wait behind its ⓘ: the same lines in both lists, each one still in the game',()=>{
 const lists=[...css.matchAll(/:is\((\.milling-chain,[^)]*\([^)]*\)[^)]*\([^)]*\)[^)]*)\)/g)].map(m=>m[1].replace(/\s+/g,''));
 assert.equal(lists.length,2,'the hidden lines and the ⓘ\'s own check');assert.equal(lists[0],lists[1]);
 const sources=['public/farm.html','public/economy-ui.js','public/retention-ui.js','public/warehouse-ui.js','public/growth-ui.js','public/boosts-ui.js','public/season-ui.js','public/pass-ui.js','public/family-ui.js'].map(read).join('\n');
 for(const name of lists[0].match(/\.[\w-]+/g).filter(n=>!['.first-batch-note','.recipes-busy'].includes(n)))assert.ok(sources.includes(name.slice(1)),`still made by the game: ${name}`);
 // Shown again with the ⓘ: the rule hides them only while the window is not .show-hints, and beats a window's own id rule.
 assert.match(css,/dialog:not\(\.show-hints\) :is\(/);assert.match(css,/#seed-dialog:not\(\.show-hints\)>p\{display:none!important\}/);
 // The first batch's promise and "every slot taken" say what is going on now: they stay.
 assert.match(css,/\.milling-note:not\(\.first-batch-note\):not\(\.recipes-busy\)/);
});

test('the ⓘ beside Close: added once, its name the game\'s own words, a press shows the rules, each opening starts with them hidden',()=>{
 const made=[],classes=new Set();
 const dialog={ownerDocument:null,classList:{toggle:n=>{if(classes.has(n)){classes.delete(n);return false;}classes.add(n);return true;},remove:n=>classes.delete(n)}};
 let kept=null;const heading={querySelector:()=>kept};
 const close={parentElement:heading,before:b=>{kept=b;made.push(b);}};
 dialog.querySelector=sel=>sel==='.dialog-heading .close-dialog'?close:null;
 const doc={createElement:()=>{const attrs={},on={};return {attrs,on,setAttribute:(k,v)=>{attrs[k]=v;},getAttribute:k=>attrs[k],addEventListener:(t,f)=>{on[t]=f;}};}};
 const button=hintsButton(dialog,doc);
 assert.equal(made.length,1);assert.equal(button.className,'hints-button');assert.equal(button.textContent,'i');assert.equal(button.attrs['aria-label'],'How it works');
 button.on.click();assert.ok(classes.has('show-hints'));assert.equal(button.attrs['aria-pressed'],'true');
 assert.equal(hintsButton(dialog,doc),button,'once');assert.equal(made.length,1);assert.ok(!classes.has('show-hints'),'opened again: hidden again');assert.equal(button.attrs['aria-pressed'],'false');
 assert.equal(hintsButton({querySelector:()=>null},doc),null,'a window without a Close in its heading has none');
 assert.match(read('public/dialog-shell.js'),/if\(!dialog\.open\)\{dialog\.removeAttribute\('data-scrolled'\);return;\}\n try\{hintsButton\(dialog\);\}catch\{\}/,'on every opening');
 assert.ok('How it works' in JSON.parse(read('i18n/catalog.json')),'translated already');
});

test('the free slots are one tile with how many; a recipe\'s time and profit first',()=>{
 const ui=read('public/economy-ui.js');
 assert.doesNotMatch(ui,/\.repeat\(free\)/);assert.match(ui,/\$\{number\(free\)\} free<\/span>/);
 assert.ok('{0} free' in JSON.parse(read('i18n/catalog.json')));
 assert.match(css,/#building-dialog #building-content \.recipe-meta\{font-size:14px;font-weight:700;/);
 assert.match(css,/#building-dialog #building-content \.recipe-xp\{font-size:12px;/);
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
