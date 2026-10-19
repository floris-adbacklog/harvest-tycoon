// 19 Oct 2026, the owner: "toon alleen Ready to work bij buildings als je daadwerkelijk iets kan ontwikkelen, anders Missing goods (rood)",
// "Ik heb het over buildings dialoog", "zet missing goods ook onderaan, in de buildings lijst". A built building with nothing running is
// "Ready to work" only when one of its recipes can start now (its window's own rule, recipeAvailability); otherwise "Missing goods" in
// red, at the bottom of the Buildings list (above the folded locked ones).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {buildingChips,buildingCanWork} from '../public/economy-ui.js';
import {createFarm,xpForLevel,normalizeFarm,buildingRecipes,recipeAvailability,RECIPES} from '../public/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const chips=s=>[...buildingChips(s).matchAll(/<span class="building-status (\w+)">([^<]*)<\/span>/g)].map(([,kind,text])=>`${kind}:${text}`);

// A level-40 farm with every farm building built, nothing running.
function farm(now){
 const state=createFarm(now-86400000);state.xp=xpForLevel(40)+10;
 for(const k of Object.keys(state.buildings))state.buildings[k]={...state.buildings[k],built:true,level:3};
 normalizeFarm(state,now);for(const b of Object.values(state.buildings)){b.job=null;b.extraJobs=[];}
 return state;
}

test('the chip: "Missing goods" for kind missing, "Ready to work" stays for idle',()=>{
 assert.deepEqual(chips({kind:'missing',ready:0,working:0,free:3}),['missing:Missing goods']);
 assert.deepEqual(chips({kind:'idle',ready:0,working:0,free:3}),['idle:Ready to work']);
});

test('ready to work only when a recipe can start now: an empty barn is missing goods, one batch of ingredients is enough',()=>{
 const now=Date.UTC(2026,9,19,12),state=farm(now);
 const open=buildingRecipes(state,'bakery').filter(id=>!recipeAvailability(state,id).locked);
 assert.ok(open.length>0,'the bakery has open recipes at level 40');
 for(const k of Object.keys(state.inventory))state.inventory[k]=0;
 assert.equal(buildingCanWork(state,'bakery'),false,'nothing in the barn: missing goods');
 const id=open[0];for(const [k,n] of Object.entries(RECIPES[id].input))state.inventory[k]=n;
 assert.equal(recipeAvailability(state,id).canStart,true);
 assert.equal(buildingCanWork(state,'bakery'),true,'one batch of one recipe: ready to work');
 state.inventory[Object.keys(RECIPES[id].input)[0]]-=1;
 assert.equal(buildingCanWork(state,'bakery'),false,'one short: missing goods again');
});

test('a building none of whose recipes is open yet keeps "Ready to work" (nothing is missing there)',()=>{
 const now=Date.UTC(2026,9,19,12),state=farm(now);state.xp=0;
 for(const k of Object.keys(state.inventory))state.inventory[k]=0;
 const key=Object.keys(state.buildings).find(k=>buildingRecipes(state,k).length&&buildingRecipes(state,k).every(id=>recipeAvailability(state,id).locked));
 if(key)assert.equal(buildingCanWork(state,key),true,key);
});

test('status(), the list order and the refresh: missing goods is its own kind, sorted last and re-sorted while the list is open',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/if\(!jobs\.length&&!buildingCanWork\(state,key\)\)return \{text:`Missing goods · 0 \/ \$\{slots\} slots`,kind:'missing',\.\.\.counts\};\n  if\(!jobs\.length\)return \{text:`Ready to work · 0 \/ \$\{slots\} slots`,kind:'idle',\.\.\.counts\};/);
 assert.match(ui,/export function buildingCanWork\(state,key\)\{const open=buildingRecipes\(state,key\)\.map\(id=>recipeAvailability\(state,id,farmNow\(\)\)\)\.filter\(a=>!a\.locked\);return !open\.length\|\|open\.some\(a=>a\.canStart\);\}/);
 assert.match(ui,/missingLast=key=>status\(key\)\.kind==='missing'\?1:0;/);
 assert.match(ui,/const readyKeys=Object\.keys\(BUILDINGS\)\.map\(key=>\{const kind=status\(key,now\)\.kind;return kind==='ready'\|\|kind==='missing'\?`\$\{key\}:\$\{kind\}`:'';\}\)\.filter\(Boolean\)\.join\(\);/);
 // Locked buildings still fold at the very bottom, after the missing ones (foldLocked runs after the sort).
 assert.ok(ui.indexOf("foldLocked($('building-catalog'),'[data-open-building]'")>ui.indexOf('missingLast(a)-missingLast(b)'));
});

test('red in the list (the game\'s own red), red text on a computer\'s map label, hidden like "Ready to work" in a small window',()=>{
 const css=read('public/retention.css');
 assert.match(css,/#buildings-dialog \.building-status\.missing\{background:#f8e2da;color:#a3473a\}/);
 assert.match(css,/\.building-label \.building-status\.missing\{color:#a3473a\}/);
 assert.match(read('public/buttons.css'),/--btn-red-hover:#a3473a/,'the red is the buttons\' own');
 assert.match(read('public/desktop-hud.css'),/\.building-label \.building-status\.idle,\.building-label \.building-status\.missing,\.building-label \.building-status\.family\{display:none\}/);
});

test('both texts are translated in every language',()=>{
 for(const file of readdirSync(new URL('../public/i18n/',import.meta.url))){
  const dict=JSON.parse(read(`public/i18n/${file}`));
  assert.ok(dict['Missing goods'],`${file}: Missing goods`);
  assert.ok(dict['Missing goods · 0 / {0} slots']?.includes('{0}'),`${file}: Missing goods · 0 / {0} slots`);
 }
});
