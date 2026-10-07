import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,xpForLevel,levelOf,FEATURE_LEVELS,featureUnlocked,ITEMS,CROPS,HEIRLOOMS,LAB_YIELD,LAB_DISCOVER_MS,LAB_GROW_MS,LAB_DISCOVER_DIAMONDS,LAB_COMPLETE_DIAMONDS,
 masterPoints,masterFree,masterBonus,cropDuration,recipeDuration,marketSaleValue,VISITOR_STAY,VISITOR_WAIT,VISITOR_DIAMONDS,GIANT_TEND_MS,GIANT_COINS_PER_KG,GIANT_RECORD_DIAMONDS,
 VALLEY_PROJECTS,valleyProjectBonus,endgameInSight,itemAvailable,STARTER_PACK_CROPS,familyOrder,labCanCross,RECIPES,RECIPE_LEVELS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 27 Sep 2026: the Grand Valley Fair (90) is the last building; five things keep a farm going after it, all on its own.
const now=Date.UTC(2026,8,28,9);
function farm(level=97){const s=createFarm(now);s.xp=xpForLevel(level);s.rookieUntil=0;s.coins=10_000_000;normalizeFarm(s,now);return s;}

test('five after-90 activities, one a level from 91, out of sight before 90',()=>{
 assert.deepEqual([FEATURE_LEVELS.master,FEATURE_LEVELS.seedlab,FEATURE_LEVELS.visitors,FEATURE_LEVELS.giantpumpkin,FEATURE_LEVELS.valleyprojects],[91,92,93,94,95]);
 const low=farm(60);for(const key of ['master','seedlab','visitors','giantpumpkin','valleyprojects'])assert.equal(featureUnlocked(low,key),false,key);
 assert.equal(endgameInSight(low),false);assert.equal(endgameInSight(farm(90)),true);
 assert.throws(()=>act(low,{type:'master_spend',branch:'growth'},now),/level 91/);
});

test('Master points: one per level after 90, spent on four branches of ten ranks that speed and pay',()=>{
 const s=farm(95);assert.equal(masterPoints(s),5);assert.equal(masterFree(s),5);
 const crop=cropDuration(s,'corn',false,now),batch=recipeDuration(s,'flour',now),sale=marketSaleValue(s,10000,now);
 act(s,{type:'master_spend',branch:'growth'},now);act(s,{type:'master_spend',branch:'production'},now);act(s,{type:'master_spend',branch:'market'},now);
 assert.equal(masterFree(s),2);assert.equal(masterBonus(s,'growth'),.01);
 assert.ok(cropDuration(s,'corn',false,now)<crop);assert.ok(recipeDuration(s,'flour',now)<batch);assert.equal(marketSaleValue(s,10000,now),Math.floor(sale*1.01));
 act(s,{type:'master_spend',branch:'visitors'},now);act(s,{type:'master_spend',branch:'visitors'},now);
 assert.throws(()=>act(s,{type:'master_spend',branch:'visitors'},now),/next level/);
 assert.throws(()=>act(s,{type:'master_spend',branch:'luck'},now),/branch/);
});

test('Seed Lab: 20 heirlooms from two crops each; the first cross takes a day and discovers it, later ones 8 hours',()=>{
 assert.equal(Object.keys(HEIRLOOMS).length,20);
 for(const [k,h] of Object.entries(HEIRLOOMS)){assert.ok(!CROPS[k]&&ITEMS[k].heirloom,k);assert.equal(h.parents.length,2);for(const p of h.parents)assert.ok(CROPS[p],p);}
 assert.ok(!STARTER_PACK_CROPS.some(k=>HEIRLOOMS[k]),'heirlooms are no crops of the farm: not in the Starter Pack');
 const s=farm(92);s.inventory.cabbage=100;s.inventory.lettuce=300;
 assert.equal(itemAvailable(s,'savoycabbage'),false);
 assert.throws(()=>act(s,{type:'lab_cross',bed:0,heirloom:'ghostpumpkin'},now),/level 94/);
 const cross=act(s,{type:'lab_cross',bed:0,heirloom:'savoycabbage'},now);assert.equal(cross.discover,true);assert.equal(s.lab.beds[0].readyAt,now+LAB_DISCOVER_MS);
 assert.equal(s.inventory.cabbage,100-HEIRLOOMS.savoycabbage.input.cabbage);
 assert.throws(()=>act(s,{type:'lab_collect',bed:0},now+LAB_DISCOVER_MS-1),/Still growing/);
 const d=s.diamonds,r=act(s,{type:'lab_collect',bed:0},now+LAB_DISCOVER_MS);
 assert.equal(r.discovered,true);assert.equal(s.inventory.savoycabbage,LAB_YIELD);assert.equal(s.diamonds-d-(r.levelReward?.diamonds??0),LAB_DISCOVER_DIAMONDS);assert.equal(itemAvailable(s,'savoycabbage'),true);
 const again=act(s,{type:'lab_cross',bed:1,heirloom:'savoycabbage'},now+LAB_DISCOVER_MS);assert.equal(again.discover,false);assert.equal(s.lab.beds[1].readyAt,now+LAB_DISCOVER_MS+LAB_GROW_MS);
 // All twenty: +100 diamonds on the last discovery (200 until 7 Oct 2026).
 const t=farm(99);for(const k of Object.keys(CROPS))t.inventory[k]=100000;t.lab.found=Object.keys(HEIRLOOMS).slice(1);
 act(t,{type:'lab_cross',bed:0,heirloom:'savoycabbage'},now);const last=act(t,{type:'lab_collect',bed:0},now+LAB_DISCOVER_MS);
 assert.equal(last.complete,true);assert.equal(last.diamonds,LAB_DISCOVER_DIAMONDS+LAB_COMPLETE_DIAMONDS);
});

test('heirlooms stay out of the family order, family sharing and the goods boards',()=>{
 for(let w=2940;w<2990;w++)for(const k of Object.keys(familyOrder('fam',w,5).lines))assert.ok(!HEIRLOOMS[k],`${w}:${k}`);
 assert.match(read('public/social-ui.js'),/stock\(k\)>0&&!ITEMS\[k\]\.heirloom/);assert.match(read('src/leaderboard.js'),/!CROPS\[key\]&&!ITEMS\[key\]\.heirloom/);
 assert.match(read('public/economy-ui.js'),/HEIRLOOMS\[key\]\?state\.inventory\[key\]>0\|\|itemAvailable\(state,key\)/,'the Market shows an heirloom only once found or in stock');
});

test('visitors: a rush order when you are on the farm; a run of served visitors makes the next bigger and better paid',()=>{
 const s=farm(93);for(const k of Object.keys(s.buildings))s.buildings[k]={...s.buildings[k],built:true,level:12};normalizeFarm(s,now);
 const v=s.visitors.current;assert.ok(v,'a visitor at the gate');assert.equal(v.leavesAt,now+VISITOR_STAY);assert.equal(Object.keys(v.input).length>=2,true);
 for(const [k,n] of Object.entries(v.input))s.inventory[k]=n;
 const served=act(s,{type:'visitor_serve',visitor:v.id},now+1000);assert.equal(served.streak,1);assert.equal(s.visitors.current,null);assert.equal(s.visitors.nextAt,now+1000+VISITOR_WAIT);
 normalizeFarm(s,now+1000+VISITOR_WAIT);const next=s.visitors.current;assert.ok(next.id===v.id+1);
 // Since 7 Oct 2026 every visitor pays a flat VISITOR_DIAMONDS; the run raises the coins (it raised the diamonds too, 5 up to 15).
 assert.equal(v.diamonds,VISITOR_DIAMONDS);assert.equal(next.diamonds,VISITOR_DIAMONDS,'a flat 3 diamonds');assert.ok(next.coins>v.coins,'the run pays more coins');
 // Left unserved: the run ends.
 normalizeFarm(s,next.leavesAt+1);assert.equal(s.visitors.streak,0);assert.equal(s.visitors.current,null);
});

test('the giant pumpkin: tend every 8 hours, a little more each time, feed for more, weigh in for coins by the kilo',()=>{
 const s=farm(94);s.inventory.fertilizer=100;
 assert.equal(act(s,{type:'giant_tend'},now).added,10);
 assert.throws(()=>act(s,{type:'giant_tend'},now+GIANT_TEND_MS-1),/Tend it again/);
 assert.equal(act(s,{type:'giant_tend',feed:true},now+GIANT_TEND_MS).added,21);assert.equal(s.inventory.fertilizer,90);
 for(let i=2;i<10;i++)act(s,{type:'giant_tend',feed:true},now+i*GIANT_TEND_MS+i);
 const kg=s.giant.kg,coins=s.coins,r=act(s,{type:'giant_weigh'},now+10*GIANT_TEND_MS);
 assert.equal(r.coins,kg*GIANT_COINS_PER_KG);assert.equal(s.coins-coins,r.coins+(r.levelReward?.coins??0));assert.equal(r.record,kg>=100);
 assert.ok(r.diamonds>=GIANT_RECORD_DIAMONDS||kg<100);
 assert.throws(()=>act(s,{type:'giant_tend'},now+11*GIANT_TEND_MS),/weighed in/);
});

test('valley projects: hand in bit by bit, pay to finish, and the bonus lasts',()=>{
 const s=farm(95);for(const k of Object.keys(ITEMS))s.inventory[k]=0;
 assert.equal(Object.keys(VALLEY_PROJECTS).length,5);for(const p of Object.values(VALLEY_PROJECTS))assert.equal(p.levels.length,3);
 const step=VALLEY_PROJECTS.canal.levels[0],[first]=Object.keys(step.materials);
 assert.throws(()=>act(s,{type:'vproject_give',project:'canal'},now),/none of the goods/);
 s.inventory[first]=5;act(s,{type:'vproject_give',project:'canal',item:first},now);assert.equal(s.valleyProjects.canal.given[first],5);
 assert.throws(()=>act(s,{type:'vproject_finish',project:'canal'},now),/Hand in all/);
 for(const [k,n] of Object.entries(step.materials))s.inventory[k]=n;act(s,{type:'vproject_give',project:'canal'},now);
 const crop=cropDuration(s,'corn',false,now),done=act(s,{type:'vproject_finish',project:'canal'},now);
 assert.equal(done.level,1);assert.equal(valleyProjectBonus(s,'canal'),.03);assert.ok(cropDuration(s,'corn',false,now)<crop);
});

test('the screens: places on the map and in the menu, the Master tab, the fair tabs and the wiki',()=>{
 const game=read('public/game.js'),estate=read('public/estate-ui.js');
 for(const key of ['seedlab','visitors','valleyprojects'])assert.match(game,new RegExp(`addUtility\\('${key}',`),key);
 assert.match(game,/if\(ENDGAME_PLACES\.includes\(key\)\)\{const shown=endgameInSight\(state\);/,'hidden until level 90');
 assert.match(read('public/farm.html'),/<button data-estate-tab="master" aria-pressed="false" hidden>Master<\/button>/);
 assert.match(estate,/data-fair-tab="pumpkin"/);for(const fn of ['labMarkup','visitorsMarkup','projectsMarkup','pumpkinMarkup'])assert.match(estate,new RegExp(`function ${fn}\\(`),fn);
 assert.match(read('public/wiki-content.js'),/section\('After level 90'/);
 for(const f of ['heirloom-savoycabbage','visitor-cook','project-canal','giant-prize','endgame-master-star'])assert.ok(readFileSync(new URL(`../public/assets/icons/${f}.webp`,import.meta.url)).length>1000,f);
});

test('a free test bed counts as ready only when a cross is possible: crops for an heirloom open at your level',()=>{
 const s=farm(92);for(const k of Object.keys(CROPS))s.inventory[k]=0;
 assert.equal(labCanCross(s),false,'nothing to cross: the Seed Lab stays quiet');
 const h=HEIRLOOMS.ghostpumpkin;for(const [k,n] of Object.entries(h.input))s.inventory[k]=n;
 assert.equal(labCanCross(s),false,'the crops for a level-94 heirloom do not count at 92');
 for(const [k,n] of Object.entries(HEIRLOOMS.savoycabbage.input))s.inventory[k]=n;assert.equal(labCanCross(s),true);
 assert.equal(labCanCross(farm(80)),false,'before the Seed Lab opens');
 const ui=read('public/economy-ui.js');
 assert.match(ui,/if\(free\)return \{text:`\$\{free\} test \$\{free===1\?'bed':'beds'\} free`,kind:labCanCross\(state\)\?'ready':'idle'\};/);
});

// 3 Oct 2026: no heirlooms in the valley's asks. The Seed Lab's two beds make at most 8 every 8 hours, and every visitor wanting 7–11
// of one, and each project level 30–60 of two or three, made a wall; the farm's own goods of the same value stand in their place.
test('visitors and valley projects never ask for heirlooms; the projects cost what they did',()=>{
 const before={bridge:[391200,849600],watermill:[452400,649600],terraces:[369400,719200],canal:[347700,780000],barn:[441900,613200]};
 for(const [id,p] of Object.entries(VALLEY_PROJECTS))p.levels.forEach((l,i)=>{
  for(const k of Object.keys(l.materials)){assert.ok(!ITEMS[k].heirloom,`${id} ${i+1}: ${k}`);assert.ok(ITEMS[k].world!==2,`${id} ${i+1}: ${k} is no village good`);assert.ok(Object.keys(RECIPES).some(r=>RECIPES[r].output[k]&&(RECIPE_LEVELS[r]??1)<=FEATURE_LEVELS.valleyprojects),`${id} ${i+1}: ${k} can be made before the projects open`);}
  if(i){const value=Object.entries(l.materials).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0),was=before[id][i-1];assert.ok(Math.abs(value-was)/was<.01,`${id} ${i+1}: ${value} for ${was}`);}
 });
 const s=farm(100);for(const k of Object.keys(s.buildings))s.buildings[k]={...s.buildings[k],built:true,level:12};s.lab.found=Object.keys(HEIRLOOMS);
 for(let serial=0;serial<60;serial++){
  Object.assign(s.visitors,{current:null,nextAt:0,serial});normalizeFarm(s,now);
  const order=s.visitors.current;assert.ok(order,`visitor ${serial}`);
  for(const k of Object.keys(order.input))assert.ok(!ITEMS[k].heirloom,`visitor ${serial} asks ${k}`);
 }
 assert.doesNotMatch(read('public/estate-ui.js'),/visitors and valley projects ask for them/,'the Seed Lab no longer says they ask for them');
});
