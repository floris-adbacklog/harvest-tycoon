// Calmer windows (23 Oct 2026, the owner: "Ik bedoelde vooral de dialogen dat ze te druk ogen", then "doe alles"): rows instead of cards,
// facts instead of pills, a window's rules behind its ⓘ, the free slots as one tile, a recipe's time and profit first; and confetti when
// a building opens for you or is bought ("Doe confetti als je een nieuw gebouw opent en koopt").
import test from 'node:test';
import {wikiArticle} from '../public/wiki-content.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hintsButton,wikiFor,WINDOW_WIKI} from '../public/dialog-shell.js';
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

test('a window\'s rule lines are left out, each one still in the game; a building\'s window keeps its own',()=>{
 const list=css.match(/dialog :is\((\.seed-yield-line,[^)]*)\)/)[1].replace(/\s+/g,'');
 const sources=['public/farm.html','public/economy-ui.js','public/retention-ui.js','public/warehouse-ui.js','public/growth-ui.js','public/boosts-ui.js','public/season-ui.js','public/pass-ui.js','public/family-ui.js'].map(read).join('\n');
 for(const name of list.match(/\.[\w-]+/g))assert.ok(sources.includes(name.slice(1)),`still made by the game: ${name}`);
 assert.match(css,/#seed-dialog>p\{display:none!important\}/,'beats a window\'s own id rule');
 assert.doesNotMatch(list,/milling|production-capacity|recipe-section|shop-earn/,'a building\'s lines and Boosts\' Earn daily button stay in view');
});

// 24 Oct 2026 (the owner: "wat doet dit i'tje hier?", then "stuur die i gewoon naar wiki links want dit is heel verwarrend"): the ⓘ opens
// the window's page in How to play, with the way back to the window.
test('the ⓘ beside Close opens the window\'s page in How to play, and its way back opens the window again',()=>{
 const topics=new Set(['getting-started','crops','buildings','market','quests','daily','family','events','helpers','village','harbour','estate','diamonds','chat','account']);
 for(const [id,[topic,section]] of Object.entries(WINDOW_WIKI)){assert.ok(topics.has(topic),id);assert.match(section,/^sec-[a-z0-9-]+$/,id);}
 const farm=read('public/farm.html')+read('src/ui.js');for(const id of Object.keys(WINDOW_WIKI).filter(id=>id!=='events-dialog'))assert.match(farm,new RegExp(`<dialog id="${id}"`),id);   // the leaderboard's window is made in src/ui.js
 let kept=null,asked=null,shown=0;const closed=[];
 const close={parentElement:{querySelector:()=>kept},before:b=>{kept=b;}};
 const badge={getAttribute:()=>'silo'};
 const dialog={id:'utility-dialog',showModal:()=>{shown++;},querySelector:sel=>sel==='.dialog-heading .close-dialog'?close:sel==='.dialog-titles h2'?{textContent:' Silo research '}:sel==='.dialog-heading .dialog-badge'?badge:null};
 const doc={createElement:()=>{const attrs={};return {attrs,setAttribute:(k,v)=>{attrs[k]=v;},addEventListener:(t,f)=>{attrs['on'+t]=f;}};},querySelectorAll:()=>[{close:()=>closed.push(1)}]};
 const win={harvestWiki:(topic,section,options)=>{asked={topic,section,options};}};
 const button=hintsButton(dialog,doc,win);
 assert.equal(button.className,'hints-button');assert.equal(button.textContent,'i');assert.equal(button.attrs['aria-label'],'How it works');
 button.attrs.onclick();
 assert.deepEqual([asked.topic,asked.section,asked.options.from.label],['helpers','sec-silo-research','Silo research'],'the Silo by its picture, back by its title');
 asked.options.from.go();assert.equal(shown,1,'the way back opens the window again');assert.equal(closed.length,1);
 assert.equal(hintsButton(dialog,doc,win),button,'once');
 assert.deepEqual(wikiFor({id:'building-dialog',querySelector:sel=>sel==='.farmhouse-panel'?{}:null}),['crops','sec-more-fields'],'the Farmhouse: more fields');
 // A village place and Buildings in the village (24 Oct 2026): the village places, not the farm's buildings.
 for(const id of ['building-dialog','buildings-dialog']){
  assert.deepEqual(wikiFor({id,dataset:{place:'village'},querySelector:()=>null}),['village','sec-village-places'],id);
  assert.deepEqual(wikiFor({id,dataset:{place:'farm'},querySelector:()=>null}),['buildings','sec-how-buildings-work'],id);
 }
 const village=wikiArticle('village',{level:150}).html;
 assert.match(village,/id="sec-village-places"[\s\S]*id="building-mine"[\s\S]*id="sec-made-on-the-farm"/,'the places under their own heading');
 assert.equal(hintsButton({id:'more-dialog',querySelector:sel=>sel==='.dialog-heading .close-dialog'?close:null},doc,win),null,'no page, no ⓘ');
 assert.equal(hintsButton(dialog,doc,{}),null,'no How to play (the farm not ready): none');
 assert.match(read('public/game.js'),/window\.harvestWiki=\(id,anchor='',options=\{\}\)=>\{openDialog\('help-dialog'\);renderWiki\(state,id,anchor,options\);\};/);
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
