import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction as act,choreStatus,choreRoll,choreFinds,CHORES,CHORE_PRACTICE_STEP,ACTIVE_STATIONS,levelOf,levelReward} from '../game/farm-state.js';
import {art} from '../public/visual-icons.js';
import {soundForAction} from '../public/farm-audio.js';
const now=Date.UTC(2026,8,18);
// Chores pay enough XP to level up a young farm; level-ups pay their own coins and diamonds on top.
// Farm chores open at level 15 on every farm since 19 Oct 2026 (older farms had them from level 1): the chore tests play at 15.
const CHORE_LEVEL=15;
const levelGain=(from,to,key)=>{let sum=0;for(let l=from+1;l<=to;l++)sum+=levelReward(l)[key];return sum;};
test('practice unlocks chores in order at their mastery threshold and respects caps',()=>{
 const s=createFarm(now,{level:CHORE_LEVEL});let time=now;
 for(const id of ['troughs','sorting'])assert.throws(()=>act(s,{type:'chore',id},time,()=>{throw Error('must not roll');}),/Master/);
 for(const id of Object.keys(CHORES)){
  const c=CHORES[id];assert.equal(choreStatus(s,id,time).locked,false);
  for(let i=0;i<Math.ceil((c.maxChance-c.baseChance)/CHORE_PRACTICE_STEP);i++){
   assert.equal(choreStatus(s,id,time).chance,Math.min(c.maxChance,c.baseChance+i*CHORE_PRACTICE_STEP));
   act(s,{type:'chore',id},time,()=>0);time+=c.cooldown;
  }
  assert.equal(choreStatus(s,id,time).chance,c.maxChance);
  act(s,{type:'chore',id},time,()=>0);time+=c.cooldown;
  assert.equal(choreStatus(s,id,time).chance,c.maxChance);
 }
});
// A chore's lucky find is the farm's own since 26 Oct 2026 (choreRoll: the farm's seed, the chore, the attempt), so a chore shows at
// once in the browser with the find farm-api pays. seeded() gives a farm whose rolls fall as a test needs.
const seeded=(farm,want)=>{for(let seed=1;seed<100000;seed++){farm.rookieUntil=seed;if(want(farm))return farm;}throw new Error('no seed');};
test('a regular completion earns guaranteed rewards, advances practice, starts cooldown and ignores forged outcome',()=>{
 const s=seeded(createFarm(now,{level:CHORE_LEVEL}),f=>!choreFinds(choreRoll(f,'weeds',0),60)&&choreFinds(choreRoll(f,'weeds',1),64)),coins=s.coins,xp=s.xp,inventory=structuredClone(s.inventory),level=levelOf(s);
 s.boosts.xpUntil=now+999999;
 const r=act(s,{type:'chore',id:'weeds',success:true,roll:0,chance:100,bonus:true},now,()=>0);
 assert.equal(r.success,true);assert.equal(r.coins,27);assert.equal(r.xp,90,'45 XP, doubled by the XP boost');
 assert.equal(s.coins,coins+27+levelGain(level,levelOf(s),'coins'));assert.equal(s.xp,xp+90);assert.deepEqual(s.inventory,inventory,'no find: neither the action nor the server\'s roll can claim one');
 assert.equal(s.stats.chores,1);assert.ok(s.onboarding.milestones.chore);
 assert.equal(r.nextChance,64);assert.equal(s.chores.weeds,now+900000);
 assert.throws(()=>act(s,{type:'chore',id:'weeds'},now+899999,()=>{throw Error('must not roll');}),/returns in/);
 assert.equal(s.chorePractice.weeds,1);assert.equal(r.bonus,false);
 const restored=normalizeFarm(JSON.parse(JSON.stringify(s)),now);
 assert.equal(restored.chorePractice.weeds,1);
 const found=act(restored,{type:'chore',id:'weeds'},now+900000,()=>.99);
 assert.equal(found.bonus,true,'the second attempt\'s find, whatever the server would have rolled');const {item,count}=CHORES.weeds.bonus;assert.equal(restored.inventory[item],(inventory[item]??0)+count);
});
test('success boundary is strict and a mastered first chore always succeeds',()=>{
 assert.equal(choreFinds(.6,60),false);assert.equal(choreFinds(.5999,60),true);assert.equal(choreFinds(.999999,100),true);
 for(let seed=1;seed<=50;seed++){const s=createFarm(now,{level:CHORE_LEVEL});s.rookieUntil=seed;s.chorePractice.weeds=20;assert.equal(act(s,{type:'chore',id:'weeds'},now).bonus,true,`seed ${seed}`);}
 const miss=seeded(createFarm(now,{level:CHORE_LEVEL}),f=>!choreFinds(choreRoll(f,'weeds',0),60));
 assert.equal(act(miss,{type:'chore',id:'weeds'},now,()=>0).bonus,false,'a roll of 0 from outside changes nothing');
});
test('a chore\'s find is the farm\'s own: the same farm and attempt always roll the same, and finds come as often as the chance says',()=>{
 const s=createFarm(now,{level:CHORE_LEVEL});s.rookieUntil=Date.UTC(2026,9,26,12);
 assert.equal(choreRoll(s,'weeds',3),choreRoll(structuredClone(s),'weeds',3),'the browser and farm-api work it out alike');
 assert.notEqual(choreRoll(s,'weeds',3),choreRoll(s,'weeds',4));assert.notEqual(choreRoll(s,'weeds',3),choreRoll(s,'troughs',3));
 const other=structuredClone(s);other.rookieUntil+=1;assert.notEqual(choreRoll(s,'weeds',3),choreRoll(other,'weeds',3),'every farm has its own sequence');
 const old=structuredClone(s);delete old.rookieUntil;assert.ok(choreRoll(old,'weeds',0)>=0&&choreRoll(old,'weeds',0)<1,'a farm from before the seed rolls too');
 // Over many farms and attempts the finds come as often as before: 35%, 60% and 85% within a point.
 for(const chance of [35,60,85]){
  let finds=0,n=0;
  for(let seed=1;seed<=400;seed++){const f={rookieUntil:seed*7919};for(let attempt=0;attempt<50;attempt++,n++)if(choreFinds(choreRoll(f,'weeds',attempt),chance))finds++;}
  assert.ok(Math.abs(finds/n*100-chance)<1,`${chance}%: ${(finds/n*100).toFixed(2)}%`);
 }
 for(let i=0;i<1000;i++){const r=choreRoll({rookieUntil:i},'sorting',i%37);assert.ok(r>=0&&r<1);}
});
test('old farms retain balances and cooldowns without inventing per-chore practice',()=>{
 const s=createFarm(now);delete s.chorePractice;s.stats.chores=100;s.chores.weeds=now+30000;
 const balance=s.coins;normalizeFarm(s,now);
 assert.equal(s.stats.chores,100);assert.equal(s.coins,balance);assert.equal(s.chores.weeds,now+30000);
 assert.equal(choreStatus(s,'weeds',now).attempts,0);
});
test('each hands-on station awards an item and Honey has dedicated artwork',()=>{
 assert.deepEqual(Object.values(ACTIVE_STATIONS).map(s=>s.item),['lettuce','honey','fertilizer','feed']);
 assert.match(art('honey'),/assets\/icons\/honey.webp/);
});
test('chores rest 15 minutes to three hours (three times as long since 9 Oct 2026) and pay their XP in full; the chores list counts attempts with the same practice step',()=>{
 const rows=Object.values(CHORES).map(c=>[c.cooldown/60000,c.xp]);
 assert.deepEqual(rows,[[15,45],[30,70],[60,110],[90,150],[135,200],[180,260]]);
 assert.equal(CHORE_PRACTICE_STEP,4);
 const ui=readFileSync(new URL('../public/growth-ui.js',import.meta.url),'utf8');
 assert.match(ui,/const mastery=c=>Math\.ceil\(\(c\.maxChance-c\.baseChance\)\/CHORE_PRACTICE_STEP\);/);
});
test('a resting chore shows its time left on a dark button that reads at a glance; Locked keeps the pale look (2 Oct 2026)',()=>{
 const ui=readFileSync(new URL('../public/growth-ui.js',import.meta.url),'utf8'),css=readFileSync(new URL('../public/beta.css',import.meta.url),'utf8');
 assert.match(ui,/const choreButton=s=>s\.locked\?\{text:'Locked',waiting:false\}:s\.remaining\?\{text:`Back in \$\{formatDuration\(s\.remaining\)\}`,waiting:true\}/);
 assert.match(ui,/b\.classList\.toggle\('is-waiting',shown\.waiting\)/,'the live countdown keeps the dark look');
 assert.match(css,/\.chore-card>button\.is-waiting:disabled\{background:linear-gradient\(180deg,#4d4330,#2b2417\);[^}]*color:#fff5d8/);
});
test('a tapped chore answers at once: its hourglass turns while the server works, nothing tapped twice (26 Oct 2026)',()=>{
 const ui=readFileSync(new URL('../public/growth-ui.js',import.meta.url),'utf8'),css=readFileSync(new URL('../public/beta.css',import.meta.url),'utf8');
 assert.match(ui,/if\(acting\)return;acting=\{chore:action\.type==='chore'\?action\.id:null\};markBusy\(\);/,'marked before the request goes out; a second tap is ignored');
 assert.match(ui,/if\(b\.dataset\.chore===acting\.chore\)\{b\.disabled=false;b\.setAttribute\('aria-disabled','true'\);b\.classList\.add\('is-busy'\);b\.classList\.remove\('is-waiting'\);b\.textContent='';b\.title='One moment…';b\.setAttribute\('aria-label','One moment…'\);\}else b\.disabled=true;/,'the tapped chore keeps its colour and width, every other button is off');
 assert.match(ui,/finally\{acting=null;const said=\$\('estate-feedback'\)\.textContent;render\(\);\$\('estate-feedback'\)\.textContent=said;/,'a failed request gives the buttons back too');
 assert.match(ui,/lastReadiness=readiness\(\);icons\(\);if\(acting\)markBusy\(\);/,'a render while waiting keeps the mark');
 assert.match(ui,/if\(!\$\('estate-dialog'\)\.open\|\|acting\)return;/,'the clock does not overwrite it');
 assert.match(css,/\.chore-act>button\.is-busy::before\{content:"";flex:none;width:22px;height:22px;background:url\(\/assets\/icons\/hourglass\.svg\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.chore-act>button\.is-busy::before\{animation:none\}\}/);
 for(const lang of ['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh']){
  const words=JSON.parse(readFileSync(new URL(`../public/i18n/${lang}.json`,import.meta.url),'utf8'));
  assert.ok(words['One moment…'],`One moment… in ${lang}`);
 }
});
