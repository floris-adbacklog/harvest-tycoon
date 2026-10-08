import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {buildingChips} from '../public/economy-ui.js';
import {productionSlots,productionJobs} from '../game/farm-state.js';
import {createTranslator} from '../public/i18n.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const chips=s=>[...buildingChips(s).matchAll(/<span class="building-status (\w+)">([^<]*)<\/span>/g)].map(([,kind,text])=>`${kind}:${text}`);
// The counts status() adds for a built building (pinned below), for a building at a level with some batches.
const counts=(key,level,done,running)=>{const b={level,job:null,extraJobs:[]},now=1000;const jobs=[...Array(done).fill({readyAt:now-1}),...Array(running).fill({readyAt:now+180000})];[b.job,...b.extraJobs]=jobs;const all=productionJobs(b),slots=productionSlots(b.level,key),ready=all.filter(j=>now>=j.readyAt).length;return {ready,working:all.length-ready,free:Math.max(0,slots-all.length),kind:!all.length?'idle':ready?'ready':'working',next:180000};};

// 8 Oct 2026: the Buildings list showed one line, "Level 6 · 4 ready · 4 / 5 slots", cut off with … in French, Russian and Czech on a
// phone and in English on a computer, with "slots" and "working" in English in every language. Now: a gold level chip beside the name
// and chips under it for what the building is doing.
test('a built building shows only its counts above zero as chips: ready green, working amber, free slots plain, the next time quiet',()=>{
 assert.deepEqual(chips({kind:'ready',ready:4,working:0,free:1}),['ready:4 ready','free:1 free']);
 assert.deepEqual(chips({kind:'ready',ready:1,working:2,free:2}),['ready:1 ready','working:2 working','free:2 free'],'no "Next in" while something is ready');
 assert.deepEqual(chips({kind:'working',ready:0,working:5,free:0,next:180000}),['working:5 working','next:Next in 3m'],'all slots busy: no "0 free"');
 assert.deepEqual(chips({kind:'working',ready:0,working:1,free:4,next:45000}),['working:1 working','free:4 free','next:Next in 45s']);
 assert.deepEqual(chips({kind:'idle',ready:0,working:0,free:5}),['idle:Ready to work'],'nothing running: one chip, not "5 free"');
 assert.deepEqual(chips({text:'12 / 40 fields',kind:'farm'}),['farm:12 / 40 fields'],'the Farmhouse: its fields');
 // The Factory (a slot per two levels, at most 5), a level-15 building (10 slots) and the village's buildings: the same code.
 assert.deepEqual(chips(counts('factory',7,1,2)),['ready:1 ready','working:2 working','free:1 free']);
 assert.deepEqual(chips(counts('factory',15,0,5)),['working:5 working','next:Next in 3m']);
 assert.deepEqual(chips(counts('windmill',15,3,6)),['ready:3 ready','working:6 working','free:1 free']);
 assert.deepEqual(chips(counts('mine',4,0,0)),['idle:Ready to work']);
 const ui=read('public/economy-ui.js');
 assert.match(ui,/const counts=\{ready,working:jobs\.length-ready,free:Math\.max\(0,slots-jobs\.length\)\};/);
 assert.doesNotMatch(ui.slice(ui.indexOf('export const buildingChips'),ui.indexOf('\n',ui.indexOf('export const buildingChips'))),/factory|village|world/i,'no building of its own');
});

test('status() keeps its text for the farm map and the tooltip and only adds the counts',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/return \{text:`Ready to work · 0 \/ \$\{slots\} slots`,kind:'idle',\.\.\.counts\};/);
 assert.match(ui,/return \{text:`\$\{ready\} ready · \$\{jobs\.length\} \/ \$\{slots\} slots`,kind:'ready',\.\.\.counts\};/);
 assert.match(ui,/return \{text:`\$\{jobs\.length\} \/ \$\{slots\} working · \$\{seconds\(next\)\}`,kind:'working',\.\.\.counts,next\};/);
 // The farm map's labels still get the text; only the list's chips are written as chips.
 assert.match(ui,/const text=s\.text,kind=`building-status \$\{s\.kind\}`;/);
});

test('the list: the level chip only on built buildings, locked, to build and the Family Hall keep their one line, no middle dots',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/const isBuilt=key=>key==='farmhouse'\|\|key!=='familyhall'&&buildingUnlocked\(state,key\);/);
 assert.match(ui,/const catalogStatus=\(key,s\)=>isBuilt\(key\)\?`<span class="building-chips" data-building-status="\$\{key\}">\$\{buildingChips\(s\)\}<\/span>`:`<span class="building-status \$\{s\.kind\}" data-building-status="\$\{key\}">\$\{s\.kind==='locked'\?art\('lock','unlock-lock'\):''\}\$\{s\.text\}<\/span>`;/);
 const list=ui.slice(ui.indexOf('const isBuilt='),ui.indexOf("foldLocked($('building-catalog'),'[data-open-building]'"));
 assert.doesNotMatch(list,/·/,'the list joins nothing with " · " (the locked line keeps its own "Locked · Reach level N.")');
 assert.doesNotMatch(buildingChips({kind:'ready',ready:2,working:1,free:1})+buildingChips({kind:'working',ready:0,working:2,free:1,next:90000}),/·/);
});

test('"{0} free" is always one text with its number, never a bare "free" (which is translated as "gratis")',()=>{
 const catalog=JSON.parse(read('i18n/catalog.json'));
 for(const key of ['{0} ready','{0} working','{0} free','Next in {0}','Level {0}','Ready to work','{0} / {1} fields'])assert.ok(key in catalog,key);
 assert.match(read('public/economy-ui.js'),/\['free',s\.free&&`\$\{s\.free\} free`\]/);
 for(const file of readdirSync(new URL('../public/i18n/',import.meta.url))){
  const code=file.replace('.json',''),dict=JSON.parse(read(`public/i18n/${file}`)),tr=createTranslator(dict,code),free=String(tr.translate('Free')??'').toLowerCase();
  for(const n of [1,2]){const out=tr.translate(`${n} free`);assert.ok(out&&out.includes(String(n)),`${code}: ${n} free`);if(free)assert.ok(!out.toLowerCase().includes(free),`${code}: "${out}" says "${free}"`);}
  for(const text of ['3 working','2 ready','Next in 3m'])assert.notEqual(tr.translate(text),null,`${code}: ${text}`);
 }
 // French and Portuguese: one batch is singular ("1 prêt", not "1 prêts"), on the farm map too.
 for(const [code,one,many] of [['fr','1 prêt','4 prêts'],['pt','1 pronto','4 prontos']]){
  const tr=createTranslator(JSON.parse(read(`public/i18n/${code}.json`)),code);
  assert.equal(tr.translate('1 ready'),one);assert.equal(tr.translate('4 ready'),many);assert.ok(tr.translate('1 ready · 1 / 5 slots').startsWith(`${one} `),code);
 }
});

test('the chips wrap instead of being cut off, mirror in Arabic and keep the game palette',()=>{
 const css=read('public/retention.css');
 assert.match(css,/#buildings-dialog \.building-level-chip\{display:inline-block;margin-inline-start:4px;padding:1px 7px;border-radius:99px;background:#f6ecd0;color:#8a6a22;font:700 12px\/1\.5 'DM Sans',sans-serif;/,'like the level in the Family list');
 assert.match(css,/#buildings-dialog \.building-chips\{display:flex;flex-wrap:wrap;gap:4px;/);
 assert.match(css,/#buildings-dialog \.building-chips>\.building-status\{margin:0;white-space:normal;overflow:visible\}/,'no …');
 assert.match(css,/#buildings-dialog \.building-status\.next\{[^}]*background:none/);
 assert.match(css,/#buildings-dialog \.building-card:has\(\.building-status\.ready\)/,'a card with a ready chip is still tinted green');
 const rules=css.split('\n').filter(l=>/building-(level-chip|chips)|building-status\.next/.test(l)).join('\n');
 assert.doesNotMatch(rules,/(margin|padding|inset)-(left|right)|[^-](left|right):/,'right to left: inline-start, never left/right');
});
