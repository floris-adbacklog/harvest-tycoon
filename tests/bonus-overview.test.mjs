import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,xpForLevel,featureUnlocked,FEATURE_LEVELS,CROPS,cropDuration,marketSaleValue,vipActive,rookieBoost,masterBonus,DAY_MS} from '../public/farm-state.js';
import {bonusOverview} from '../public/bonus-overview.js';
import {bonusesMarkup,createGrowthUI} from '../public/growth-ui.js';
import {LANGUAGES} from '../public/languages.js';
import {catalog,translations,problem} from '../scripts/i18n.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 8 Oct 2026: a farmer asked to see in one place what VIP and the late unlocks take off. The Estate window got a Bonuses tab
// (public/bonus-overview.js, drawn by public/growth-ui.js) instead of a new screen.
const now=Date.UTC(2026,9,8,9);
function farm(level,change=()=>{},born=now-DAY_MS*30){const s=createFarm(born);s.xp=xpForLevel(level);normalizeFarm(s,now);change(s);return s;}
const STATES={
 'a new farm in its beginner boost':farm(10,()=>{},now-2*3600000),
 'level 30 with silo research 3 and VIP':farm(30,s=>{s.siloLevel=3;s.vipExpiresAt=now+5*DAY_MS;}),
 'level 100 with the late bonuses, a family and Double earnings':farm(100,s=>{
  s.siloLevel=5;s.master={growth:10,production:6,market:8,visitors:4};s.improvements=['ladders','heating','watertower','hayloft','ledger'];s.ranch.focus='goatshed';
  for(const [id,level] of Object.entries({canal:3,terraces:2,barn:3,watermill:1,bridge:2}))s.valleyProjects[id].level=level;
  s.family={familyId:'f1',level:4,unclaimedCount:0};s.boosts.coinsUntil=now+3600000;s.boosts.upgradeCredits=1;s.vipExpiresAt=now+DAY_MS;
 }),
 'level 80 with Orchard ladders only':farm(80,s=>{s.siloLevel=5;s.improvements=['ladders'];}),
 'level 96 with Orchard terraces and VIP':farm(96,s=>{s.siloLevel=4;s.valleyProjects.terraces.level=3;s.vipExpiresAt=now+3*3600000;s.boosts.xpUntil=now+600000;})
};
const groupOf=(s,id)=>bonusOverview(s,now).groups.find(g=>g.id===id);
const regrowCrops=Object.keys(CROPS).filter(k=>CROPS[k].regrow),normalCrops=Object.keys(CROPS).filter(k=>!CROPS[k].regrow);

test('the totals are the real rules: crop time, regrowth and the Market, without the Double earnings boost',()=>{
 for(const [name,s] of Object.entries(STATES)){
  const [crops,regrow]=groupOf(s,'crops')?.totals??[],want=1-cropDuration(s,'corn',false,now)/CROPS.corn.duration;
  if(want>=.005){assert.ok(crops,name);assert.equal(crops.value,want,name);assert.equal(crops.text,`Crops grow ${Math.round(want*100)}% faster`,name);
   for(const k of normalCrops)assert.ok(Math.abs(crops.value-(1-cropDuration(s,k,false,now)/CROPS[k].duration))<1e-4,`${name}: ${k}`);}
  else assert.equal(crops,undefined,name);
  const ladders=s.improvements.includes('ladders')||s.valleyProjects.terraces.level>0;
  assert.equal(!!regrow,ladders,`${name}: the regrowth total only with Orchard ladders or terraces`);
  for(const k of ladders?regrowCrops:[])assert.ok(Math.abs(regrow.value-(1-cropDuration(s,k,true,now)/CROPS[k].regrow))<1e-4,`${name}: ${k}`);
  const off={...s,boosts:{...s.boosts,coinsUntil:0}},market=marketSaleValue(off,1e6,now)/1e6-1,total=groupOf(s,'market')?.totals[0];
  if(market>=.005){assert.ok(Math.abs(total.value-market)<1e-6,name);assert.equal(total.text,`+${Math.round(market*100)}% at the Market`);for(const base of [1234,98765])assert.ok(Math.abs(marketSaleValue(off,base,now)/base-1-total.value)<1/base+1e-9,`${name}: ${base}`);}
  else assert.equal(total,undefined,name);
  const shared=1-(vipActive(s,now)?.9:1)*(1-rookieBoost(s,now))*(1-masterBonus(s,'production')),batches=groupOf(s,'production')?.totals[0];
  if(shared>=.005)assert.ok(Math.abs(batches.value-shared)<1e-4,name);else assert.equal(batches,undefined,name);
 }
 // The examples that were worked out by hand.
 const rich=STATES['level 100 with the late bonuses, a family and Double earnings'];
 assert.equal(groupOf(rich,'crops').totals[0].text,'Crops grow 56% faster','silo 40%, VIP 10%, Green fingers 10%, canal 9%');
 assert.equal(groupOf(rich,'crops').totals[1].text,'Trees, bushes and climbing plants grow back 68% faster','and ladders 20%, terraces 10% on regrowth');
 assert.equal(groupOf(rich,'market').totals[0].text,'+32% at the Market','VIP 5%, ledger 10%, Sharp trader 8% + barn 6%; the running Double earnings is not in it');
 assert.equal(groupOf(STATES['level 30 with silo research 3 and VIP'],'crops').totals[0].text,'Crops grow 37% faster');
});

test('every row says what it is worth, and Running now has what runs out',()=>{
 const rows=(s,id)=>Object.fromEntries((groupOf(s,id)?.rows??[]).filter(r=>r.active).map(r=>[r.id,r.value]));
 const rich=STATES['level 100 with the late bonuses, a family and Double earnings'];
 assert.deepEqual(rows(rich,'crops'),{silo:'−40%',vip:'−10%',growth:'−10%',canal:'−9%',watertower:'−13%',ladders:'−20%',terraces:'−10%'});
 assert.deepEqual(rows(rich,'production'),{vip:'−10%',production:'−6%',ranch:'−35%',heating:'−25%',watermill:'−15%'});
 assert.deepEqual(rows(rich,'market'),{vip:'+5%',ledger:'+10%',market:'+8%',barn:'+6%'});
 assert.deepEqual(rows(rich,'cheaper'),{seeds:'−25%',voucher:'−50%'});
 assert.deepEqual(rows(rich,'rewards'),{vip:'×2',family:'+30%',league:'Coins ×8',visitors:'+18%'});
 assert.deepEqual(rows(rich,'running'),{coins:'×2'});
 assert.equal(groupOf(rich,'production').rows.find(r=>r.id==='ranch').sub,'Goat Shed','the chosen herd’s building');
 const fresh=STATES['a new farm in its beginner boost'];
 assert.deepEqual(rows(fresh,'running'),{rookie:`−${Math.round(rookieBoost(fresh,now)*100)}%`});
 assert.match(groupOf(fresh,'running').rows[0].sub,/^\d+h( \d+m)? left$/);
 assert.equal(groupOf(STATES['level 80 with Orchard ladders only'],'running'),undefined,'nothing runs: no Running now');
 assert.equal(groupOf(farm(120,s=>{s.siloLevel=5;s.vipExpiresAt=0;s.master={growth:10,production:10,market:10,visitors:10};s.improvements=['ladders','heating','watertower','hayloft','ledger'];s.ranch.focus='dairy';for(const id of ['canal','terraces','barn','watermill','bridge'])s.valleyProjects[id].level=3;}),'cheaper').rows.length,1,'all research done, no voucher: only the seed price, no next row');
});

test('at most one next bonus per group, after the ones the farm has, with the level it opens at or where to get it',()=>{
 const states=[...Object.values(STATES),...[10,15,26,30,45,70,75,76,80,88,90,91,93,95,100,130].map(l=>farm(l)),farm(40,s=>{s.siloLevel=2;})];
 for(const s of states)for(const g of bonusOverview(s,now).groups){
  const next=g.rows.filter(r=>!r.active);
  assert.ok(next.length<=1,`${g.id}: ${next.length} next rows`);
  if(next.length)assert.equal(g.rows.at(-1),next[0],`${g.id}: the next one comes last`);
  assert.ok(g.rows.length,'a group with nothing is left out');
 }
 const at=(l,id,change)=>groupOf(farm(l,change),id).rows.find(r=>!r.active),vipOn=s=>{s.vipExpiresAt=now+7*DAY_MS;},withVip=change=>s=>{vipOn(s);change?.(s);};
 // No VIP: from level 10 (the shop) VIP is the next bonus where it makes crops, batches or sales better, and says where to get it.
 for(const [id,sub] of [['crops','10% faster crops'],['production','10% faster production'],['market','+5% market coins']])
  assert.deepEqual(at(12,id,s=>{s.vipExpiresAt=0;}),{id:'vip',name:'VIP',sub,value:'Diamonds & boosts',active:false},id);
 assert.equal(at(40,'crops',s=>{s.vipExpiresAt=0;s.siloLevel=1;}).id,'silo','crops: the next Silo step goes before VIP while there is one');
 assert.equal(at(40,'crops',s=>{s.vipExpiresAt=0;s.siloLevel=5;}).id,'vip');
 assert.deepEqual(at(10,'crops',withVip()),{id:'silo',name:'Silo research',sub:'−10% growing time',value:`From level ${FEATURE_LEVELS.silo}`,active:false});
 assert.deepEqual(at(40,'crops',withVip(s=>{s.siloLevel=3;})),{id:'silo',name:'Silo research',sub:'Level 4 of 5',value:'Next step: −5%',active:false});
 assert.deepEqual(at(40,'cheaper',s=>{s.siloLevel=0;}),{id:'silo',name:'Seed price',sub:'Silo research',value:'Next step: −5%',active:false});
 assert.equal(at(76,'crops',withVip(s=>{s.siloLevel=5;})).value,'Estate Workshop','Orchard ladders can be built');
 assert.equal(at(72,'production',withVip()).value,'Pick a herd');
 assert.equal(at(20,'rewards').name,'Meadow League','the Sprout League pays ×1: the next league is the bonus');
 assert.equal(at(20,'rewards').value,'From level 30');
 assert.equal(at(10,'market',withVip()).value,'From level 88','only the nearest, never the ones after it');
});

test('the tab never shows a " · ": names, lines and chips are separate elements',()=>{
 for(const [name,s] of Object.entries(STATES)){
  const html=bonusesMarkup(bonusOverview(s,now));
  assert.ok(!html.includes('·'),name);
  assert.match(html,/<li class="bonus-row is-active"><div><strong>[^<]+<\/strong><small>[^<]+<\/small><\/div><span class="bonus-chip">[^<]+<\/span><\/li>/,name);
 }
 const ui=read('public/growth-ui.js'),css=read('public/retention.css');
 assert.match(ui,/import \{bonusOverview\} from '\.\/bonus-overview\.js';/);
 assert.match(css,/#estate-dialog \.bonus-chip\{flex:none;[^}]*font:700 12px\/1\.5/,'the chip at the end of the row, 12 px like the Buildings chips');
 assert.doesNotMatch(css.slice(css.indexOf('#estate-dialog .bonus-groups')),/(?:^|[{;])(?:margin|padding)-(?:left|right)|(?:^|[{;])(?:left|right):/m,'right to left: no left or right');
 // Only the rules: the overview reads farm-state.js and nothing else.
 assert.deepEqual([...read('public/bonus-overview.js').matchAll(/from '([^']+)'/g)].map(m=>m[1]),['./farm-state.js']);
});

// 9 Oct 2026: the Bonuses tab opens with Medals at level 14 (with the diamond boosts at 10 before). The Estate window is reached
// through Medals (or the projects, from 27), so when Medals moved from 7 to 14 nothing led to the tab from 10 to 13.
test('the Bonuses tab is the last Estate tab and opens with Medals at level 14, the way into the Estate window; the boosts stay at 10',()=>{
 assert.match(read('public/farm.html'),/<button data-estate-tab="master" aria-pressed="false" hidden>Master<\/button><button data-estate-tab="bonuses" aria-pressed="false" hidden>Bonuses<\/button><\/div>/);
 assert.equal(FEATURE_LEVELS.boosts,10);assert.equal(FEATURE_LEVELS.mastery,14);
 assert.match(read('public/progression-ui.js'),/const sideTools=\{'#boosts-button':'boosts','#estate-button':'mastery'\};/,'the Boosts button from 10, the Estate button from Medals');
 // Just enough of the page for the Estate window: its tabs, its content and the dialog.
 const page=()=>{
  const els=new Map(),tabs=['projects','stall','chores','mastery','master','bonuses'].map(t=>({dataset:{estateTab:t},hidden:true,classList:{toggle(){}},setAttribute(){},querySelector:()=>null}));
  const el=id=>{if(!els.has(id))els.set(id,{id,hidden:false,innerHTML:'',textContent:'',open:false,showModal(){this.open=true;},classList:{toggle(){}}});return els.get(id);};
  globalThis.document={getElementById:el,querySelectorAll:s=>s==='[data-estate-tab]'?tabs:[],querySelector:()=>null};
  return {el,tab:t=>tabs.find(b=>b.dataset.estateTab===t)};
 };
 try{
  for(const [level,shown] of [[10,false],[13,false],[14,true],[40,true]]){
   const s=farm(level,()=>{},now-2*3600000),{el,tab}=page(),told=[];
   assert.equal(featureUnlocked(s,'boosts'),true,`level ${level}: the boosts are open`);assert.equal(featureUnlocked(s,'mastery'),shown,`level ${level}: Medals`);
   const ui=createGrowthUI({state:s,runAction:async()=>({}),onChange(){},notify:t=>told.push(t),itemList:()=>'',onNotice(){}});
   // In through Medals, as the Estate button and the Medals tile in More do.
   ui.open('mastery');assert.equal(el('estate-dialog').open,shown,`level ${level}: the window`);
   if(shown){assert.equal(tab('bonuses').hidden,false,`level ${level}: the tab`);assert.equal(tab('mastery').hidden,false);}
   el('estate-dialog').open=false;ui.open('bonuses');
   assert.equal(el('estate-dialog').open,shown,`level ${level}: opening it`);
   if(shown)assert.match(el('estate-content').innerHTML,/class="bonus-groups"/);else assert.deepEqual(told,['Reach level 14 to unlock Medals.','Reach level 14 to unlock Medals.']);
  }
 }finally{delete globalThis.document;}
});

test('every new text of the tab is in the catalog and in all 15 languages',()=>{
 const texts=['Bonuses','Every bonus your farm has now, and the next one to get.','Faster crops','Faster production','The Market pays more','Cheaper','Bigger rewards','Running now',
  'Crops grow {0}% faster','Trees, bushes and climbing plants grow back {0}% faster','Batches take {0}% less time','+{0}% at the Market','When trees, bushes and climbing plants grow back',
  'Windmill and Feed Mill','Every building also gets faster with its own level.','Next building upgrade','Daily gift, daily challenges and delivery orders','Family Chest and Family Order',
  'Coins ×{0} in events','Warm welcome and Stone bridge','Next step: −{0}%','Pick a herd','Batches in one barn take {0}% less time.'];
 const all=catalog(),codes=LANGUAGES.filter(l=>l.code!=='en').map(l=>l.code);
 assert.equal(codes.length,15);
 for(const text of texts){
  assert.ok(text in all,text);
  for(const code of codes){const out=translations(code)[text];assert.ok(out,`${code}: ${text}`);assert.equal(problem(text,out),'',`${code}: ${text}`);}
 }
 // The texts it shares with other screens were already there: the chip for later bonuses among them.
 for(const text of ['From level {0}','Level {0} of {1}','{0} left','Coins ×{0}','Family level {0}','Seed price','−{0}% growing time','−{0}% seed price','Master points','Valley projects','Estate Workshop'])assert.ok(text in all,text);
});

test('the Market wagon and the Loading crane count as bonuses, and picking a herd says what the hay loft makes of it',()=>{
 const rewards=groupOf(farm(90,s=>{s.improvements=['wagon','crane'];}),'rewards').rows.filter(r=>r.active);
 assert.deepEqual(rewards.filter(r=>['wagon','crane'].includes(r.id)).map(r=>[r.id,r.value]),[['wagon','×2'],['crane','×2']]);
 const next=groupOf(farm(80,s=>{s.vipExpiresAt=now+7*DAY_MS;s.ranch.focus=null;s.improvements=['hayloft'];}),'production').rows.find(r=>!r.active);
 assert.equal(next.sub,'Batches in one barn take 35% less time.');
});

test('the Estate window has no Stall or Chores tab: each opens on its own, from its icon and its tile, titled like its tile',()=>{
 const html=read('public/farm.html'),ui=read('public/growth-ui.js'),game=read('public/game.js');
 assert.doesNotMatch(html,/data-estate-tab="(stall|chores)"/);
 assert.match(html,/data-menu-utility="chores"/,'the Farm chores tile stays');
 assert.match(html,/data-menu-utility="stall"/,'the Farm stall tile stays');
 assert.match(game,/key==='stall'\|\|key==='chores'\|\|key==='mastery'\)growth\.open\(key\)/,'its icon and tile still open it');
 assert.match(ui,/const alone=\{stall:'Farm stall',chores:'Farm chores'\}\[tab\],dlg=\$\('estate-dialog'\);for\(const el of \[dlg\.querySelector\?\.\('\.estate-tabs'\),dlg\.querySelector\?\.\('\.dialog-heading \.eyebrow'\)\]\)if\(el\)el\.hidden=!!alone;\$\('estate-title'\)\.textContent=alone\?\?'Your growing estate';/);
});
