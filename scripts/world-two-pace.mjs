// How many days a steady player takes from level 100 to 200 with all of World II (Oct 2026, the balance check of levels 110-200). Not a
// test: the owner decides on the XP rates after a week of real data (the plan's guard is 185 days or more; this model gave 174 when it
// was written, and 182 with no XP at all from the new content). Run: node scripts/world-two-pace.mjs
// Options (name=value): farmxp (the farm's own XP a day, 35000), S (sessions a day, 5), phi (share of the farm's feeding buildings the
// village may use, .5; inf for no limit), farm (their level: ramp = 6 at 100 to 10 at 150, or a number), place (village places: 10, 5,
// or ramp = level 1 when built, +1 every `days` days), reqshare (a request's XP = value / 50), boatshare (a boat's XP = value / 40),
// fieldsxp / newxp / livexp (XP factors for the Fields, the new recipes, the four first places), quay (hours with the Stone quay, 6),
// head=1 (only what was live before: four places, two kinds, no boat), log=1 (a line every 10 days), at=130,170 (one level's day).
// The model leans fast on purpose: a linear programme picks, at each level, the batches, requests and boats that give the most XP a day;
// fast field crops are never short, sunflowers 10, apples 40 and golden wheat 12 a day; goods for briefs, upgrades and landmarks are free.
import * as G from '../game/farm-state.js';
const {RECIPES,RECIPE_LEVELS,BUILDINGS,BUILDING_LEVELS,ITEMS,VILLAGE_GOODS,VILLAGE_NEVER_ASKED,worldTwoBuilding,productionSpeed,xpForLevel,villageRequestValue,boatValue,BOAT_GOODS,VILLAGE_LANDMARKS,VILLAGE_BRIEFS,VILLAGE_QUESTS,questXp,VILLAGE_THREE_KINDS,VILLAGE_THIRD_BOARD,BOAT_RETURN}=G;
const H=3600000;
const arg=k=>{const a=process.argv.find(x=>x.startsWith(k+'='));return a?a.slice(k.length+1):undefined;};
const S=Number(arg('S')??5),PHI=arg('phi')==='inf'?Infinity:Number(arg('phi')??.5),FARM_ARG=arg('farm')??'ramp',FARM_RAMP=FARM_ARG==='ramp';let FARM_LEVEL=FARM_RAMP?6:Number(FARM_ARG);
const PLACE=arg('place')??'10',RAMP_DAYS=Number(arg('days')??4),REQ_SHARE=Number(arg('reqshare')??50),FIELDS_XP=Number(arg('fieldsxp')??1),QUAY=Number(arg('quay')??6);
const FARM_XP=Number(arg('farmxp')??35000),NEWXP=Number(arg('newxp')??1),LIVEXP=Number(arg('livexp')??1),BOATSHARE=Number(arg('boatshare')??40),HEAD=arg('head')==='1';
const LIVE_IDS=new Set(['digiron','chop','saw','smeltiron','forgepickaxe','digsilver','smeltsilver','mastertools','heirloomflour','digdeep']),HEAD_PLACES=['mine','lumbercamp','smithy','villagemill'];
const xpOf=id=>RECIPES[id].xp*(RECIPES[id].building==='villagefields'?FIELDS_XP:LIVE_IDS.has(id)?LIVEXP:NEWXP),GAP=24/S;
const VILLAGE_PLACES=Object.keys(BUILDINGS).filter(k=>worldTwoBuilding(k)&&BUILDINGS[k].type==='production'&&(!HEAD||HEAD_PLACES.includes(k)));
const FEEDERS=['windmill','mill','coop','dairy','bakery','kitchen','goatshed','beeyard','craftshop'];
const FEED_RECIPES=Object.keys(RECIPES).filter(id=>FEEDERS.includes(RECIPES[id].building)&&['grainmeal','fertilizer','flour','windflour','feed','barleyfeed','windfeed','eggs','milk','cheese','bread','packedlunch','goatmilk','goatbrowse','hives','candles'].includes(id));
const RAW=new Set(['wheat','barley','cabbage','corn','lettuce']),BUDGET={sunflower:10,apples:40,goldenwheat:12};
// A dense simplex: the most of c.x with A x <= b (b >= 0) and x >= 0, Bland's rule.
function simplex(A,b,c){
 const m=A.length,n=c.length,W=n+m+1,EPS=1e-9;
 const T=A.map((row,i)=>{const r=new Float64Array(W);row.forEach((v,j)=>r[j]=v);r[n+i]=1;r[W-1]=b[i];return r;});
 const z=new Float64Array(W);c.forEach((v,j)=>z[j]=-v);const basis=Array.from({length:m},(_,i)=>n+i);
 for(let it=0;it<20000;it++){
  let col=-1;for(let j=0;j<W-1;j++)if(z[j]<-EPS){col=j;break;}
  if(col<0)break;
  let row=-1,best=Infinity;
  for(let i=0;i<m;i++)if(T[i][col]>EPS){const ratio=T[i][W-1]/T[i][col];if(ratio<best-EPS||(Math.abs(ratio-best)<=EPS&&basis[i]<basis[row])){best=ratio;row=i;}}
  if(row<0)return {value:Infinity,x:null};
  const p=T[row][col];for(let j=0;j<W;j++)T[row][j]/=p;
  for(let i=0;i<m;i++)if(i!==row&&Math.abs(T[i][col])>EPS){const f=T[i][col];for(let j=0;j<W;j++)T[i][j]-=f*T[row][j];}
  if(Math.abs(z[col])>EPS){const f=z[col];for(let j=0;j<W;j++)z[j]-=f*T[row][j];}
  basis[row]=col;
 }
 const x=new Float64Array(n);basis.forEach((v,i)=>{if(v<n)x[v]=T[i][W-1];});return {value:z[W-1],x};
}
const dur=(id,lvl,lm)=>RECIPES[id].duration*(1-productionSpeed(lvl,RECIPES[id].building))*(RECIPES[id].building==='villagefields'&&lm.windpump?.75:1)*(worldTwoBuilding(RECIPES[id].building)&&lm.longhouse?.9:1)/H;
// World II XP a day at a level, with these places (and their levels) and the landmarks finished.
function villageXp(level,placeLevels,lm){
 if(FARM_RAMP)FARM_LEVEL=Math.min(10,6+Math.floor((level-100)/12.5));
 const built=Object.keys(placeLevels);
 const rec=Object.keys(RECIPES).filter(id=>{const r=RECIPES[id];if(worldTwoBuilding(r.building))return built.includes(r.building)&&RECIPE_LEVELS[id]<=level&&(!HEAD||LIVE_IDS.has(id));return FEED_RECIPES.includes(id);});
 const avail=k=>rec.some(id=>RECIPES[id].output[k]);
 const kinds=level>=VILLAGE_THREE_KINDS&&!HEAD?3:2,target=villageRequestValue(level),share=target/kinds;
 const reqGoods=Object.keys(VILLAGE_GOODS).filter(k=>!VILLAGE_NEVER_ASKED.includes(k)&&ITEMS[k].sell<=share&&avail(k));
 const boatGoods=built.includes('pier')?BOAT_GOODS.filter(avail):[];
 const vars=[...rec.map(id=>({t:'r',id})),{t:'R'},{t:'B'},...reqGoods.map(k=>({t:'q',k})),...boatGoods.map(k=>({t:'b',k}))];
 const idx=new Map(vars.map((v,i)=>[v.t+':'+(v.id??v.k??''),i])),n=vars.length,A=[],b=[],row=()=>new Float64Array(n);
 // Slots: a batch longer than a session gap takes more than one session; the farm's feeding buildings give the village a share.
 for(const p of [...built.filter(k=>k!=='pier'),...FEEDERS]){const r=row();let any=false;const lvl=worldTwoBuilding(p)?placeLevels[p]:FARM_LEVEL;
  for(const id of rec)if(RECIPES[id].building===p){r[idx.get('r:'+id)]=Math.max(1,Math.ceil(dur(id,lvl,lm)/GAP-1e-9));any=true;}
  if(!any)continue;const cap=Math.max(1,Math.min(10,Math.floor(lvl)))*S*(worldTwoBuilding(p)?1:PHI);if(cap===Infinity)continue;A.push(r);b.push(cap);}
 // Every good made at least as much as it is used (fast field crops free, slow ones with a daily budget).
 const goods=new Set();for(const id of rec){Object.keys(RECIPES[id].input).forEach(k=>goods.add(k));Object.keys(RECIPES[id].output).forEach(k=>goods.add(k));}
 for(const g of goods){if(RAW.has(g))continue;const r=row();for(const id of rec){const R=RECIPES[id];if(R.input[g])r[idx.get('r:'+id)]+=R.input[g];if(R.output[g])r[idx.get('r:'+id)]-=R.output[g];}
  if(idx.has('q:'+g))r[idx.get('q:'+g)]+=1;if(idx.has('b:'+g))r[idx.get('b:'+g)]+=1;A.push(r);b.push(BUDGET[g]??0);}
 // Requests: every board helped every session; their village goods are worth all lines but the one farm good.
 {const r=row();r[idx.get('R:')]=target*(kinds-1)/kinds;for(const k of reqGoods)r[idx.get('q:'+k)]=-ITEMS[k].sell;A.push(r);b.push(0);}
 {const boards=(level>=VILLAGE_THIRD_BOARD?3:2)+(lm.lookout?1:0);const r=row();r[idx.get('R:')]=1;A.push(r);b.push(boards*Math.min(S,8));}
 // The boat sails at the first session after it is back.
 const V=boatValue(level),back=lm.stonequay?QUAY:BOAT_RETURN/H,per=24/(Math.ceil(back/GAP-1e-9)*GAP);
 {const r=row();r[idx.get('B:')]=V;for(const k of boatGoods)r[idx.get('b:'+k)]=-ITEMS[k].sell;A.push(r);b.push(0);}
 {const r=row();r[idx.get('B:')]=1;A.push(r);b.push(boatGoods.length?per:0);}
 const c=vars.map(v=>v.t==='r'?(worldTwoBuilding(RECIPES[v.id].building)?xpOf(v.id):0):v.t==='R'?target/REQ_SHARE:v.t==='B'?V/BOATSHARE:0);
 const res=simplex(A,b,c),parts={batches:0,requests:0,boat:0};
 vars.forEach((v,i)=>{const x=res.x[i];if(!x)return;if(v.t==='r')parts.batches+=x*c[i];if(v.t==='R')parts.requests+=x*c[i];if(v.t==='B')parts.boat+=x*c[i];});
 return {xp:res.value,parts};
}
// One-off XP by level: briefs (250 each), landmarks (5,000) and the village quests.
const ONE_OFF=new Map(),addAt=(L,x)=>ONE_OFF.set(L,(ONE_OFF.get(L)??0)+x);
for(const br of VILLAGE_BRIEFS)if(!HEAD||HEAD_PLACES.includes(br.place))addAt(BUILDING_LEVELS[br.place],250);
if(!HEAD)for(const l of Object.values(VILLAGE_LANDMARKS))addAt(l.level,5000);
for(const q of (HEAD?VILLAGE_QUESTS.slice(0,31):VILLAGE_QUESTS))addAt(Math.max(100,q.minLevel??100),questXp(q));
let xp=xpForLevel(100),day=0,level=100;const builtDay={},paid=new Set(),cache=new Map(),log=[];
while(level<200&&day<1000){
 const lm={};if(!HEAD)for(const [id,l] of Object.entries(VILLAGE_LANDMARKS))if(level>=l.level)lm[id]=true;
 const pl={};for(const p of [...VILLAGE_PLACES,...(HEAD?[]:['pier'])])if(level>=BUILDING_LEVELS[p]){builtDay[p]??=day;pl[p]=PLACE==='10'?10:PLACE==='5'?5:Math.min(10,1+Math.floor((day-builtDay[p])/RAMP_DAYS));}
 const key=JSON.stringify([level,pl,lm]);if(!cache.has(key))cache.set(key,villageXp(level,pl,lm));const v=cache.get(key);
 let one=0;for(const [L,x] of ONE_OFF)if(L<=level&&!paid.has(L)){paid.add(L);one+=x;}
 xp+=FARM_XP+v.xp+one;day++;while(xp>=xpForLevel(level+1))level++;
 if(day%10===0||level>=200)log.push(`day ${day}: level ${level}, World II ${Math.round(v.xp)} XP a day (batches ${Math.round(v.parts.batches)}, requests ${Math.round(v.parts.requests)}, boat ${Math.round(v.parts.boat)})`);
}
console.log(`${HEAD?'Live content only: ':''}level 100 to 200 in ${day} days (farm ${FARM_XP} XP a day, ${S} sessions, farm buildings ${FARM_ARG}, village places ${PLACE}, guard: 185 days or more)`);
if(arg('log'))console.log(log.join('\n'));
for(const L of (arg('at')??'').split(',').filter(Boolean).map(Number)){
 const pl={};for(const p of [...VILLAGE_PLACES,'pier'])if(L>=BUILDING_LEVELS[p])pl[p]=PLACE==='5'?5:10;
 const lm={};for(const [id,l] of Object.entries(VILLAGE_LANDMARKS))if(L>=l.level)lm[id]=true;
 const v=villageXp(L,pl,lm);console.log(`level ${L}: ${Math.round(v.xp)} XP a day`,JSON.stringify(Object.fromEntries(Object.entries(v.parts).map(([k,x])=>[k,Math.round(x)]))));
}
