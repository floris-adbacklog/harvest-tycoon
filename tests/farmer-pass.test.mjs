import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as G from '../game/farm-state.js';
import {FARMER_PASS_PARTS,FARMER_OFFER,FARMER_PARTS,DEFAULT_FARMER,farmerOwned,farmerPassParts,farmerOf,validFarmerConfig,wearPart,rewardOpen} from '../game/farmer-parts.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source.replace("from './farmer-parts.js';",`from '${new URL('../game/farmer-parts.js',import.meta.url).href}';`)).toString('base64');
const show=(sha,file)=>{try{return execFileSync('git',['show',`${sha}:${file}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<26,stdio:['ignore','pipe','ignore']});}catch{return null;}};

// A Season Pass can give parts for your own farmer (21 Oct 2026, the owner: "Doe alles behalve 9; Kerstoutfit bewaren voor Kerst Pass",
// item 8). The mechanism only: the running Autumn 2026 pass keeps its tiers.
const now=Date.parse('2026-10-21T12:00:00Z');
const farm=level=>{const s=G.createFarm(now-30*G.DAY_MS);s.xp=G.xpForLevel(level);return G.normalizeFarm(s,now);};

test('a tier\'s reward {farmer:[...]} gives farmer parts; they are owned through the pass, worn like any earned part, and a refund takes them back',()=>{
 // The top hat's own goal is selling 2,000 crops: a new farm has not, but a pass that gives it makes it theirs.
 const s=farm(20),hat='hat_034';assert.equal(rewardOpen(hat,s,{level:20}),false);assert.ok(!farmerOwned(s,{level:20}).includes(hat));
 const reward=G.seasonReward({farmer:[hat],coins:60},20);assert.deepEqual(reward.farmer,[hat]);assert.notEqual(reward.farmer,undefined);
 G.giveFarmerParts(s,reward.farmer);G.giveFarmerParts(s,[hat]);
 assert.deepEqual(s.farmerParts,[hat],'each once');assert.ok(farmerOwned(s,{level:20}).includes(hat));
 assert.equal(farmerOwned(s,{level:20}).filter(id=>id===hat).length,1);
 const worn=wearPart(DEFAULT_FARMER,'hat',hat);assert.equal(validFarmerConfig(worn,{owned:farmerOwned(s,{level:20})}).ok,true);
 G.applyFarmAction(s,{type:'farmer_wear',farmer:worn},now);assert.equal(s.farmer.hat,hat);assert.equal(farmerOf(s,{level:20}).hat,hat);
 // A refund: gone again, and it comes off the farmer as shown.
 G.takeFarmerParts(s,new Set([hat]));assert.deepEqual(s.farmerParts,[]);assert.ok(!farmerOwned(s,{level:20}).includes(hat));
 assert.equal(farmerOf(s,{level:20}).hat,undefined);
 // Kept clean: only earned parts of the catalog, each once; a farm without the key never gets one.
 const t=farm(20);t.farmerParts=['nope',5,hat,hat,'outwear_001',null];G.normalizeFarm(t,now);assert.deepEqual(t.farmerParts,[hat],'a free part, a number or an unknown id is no pass part');
 const u=farm(20);G.normalizeFarm(u,now);assert.equal(Object.hasOwn(u,'farmerParts'),false);
 assert.deepEqual(farmerPassParts({farmerParts:'hat_034'}),[]);
});

test('the claim and the refund use it: what a tier gives is collected with it, a refunded paid row gives its parts back',()=>{
 const src=read('game/farm-state.js');
 assert.match(src,/if\(r\.farmer\)giveFarmerParts\(state,r\.farmer\);\n entry\[track\]\.push\(tier\);/);
 assert.match(src,/for\(const id of r\.farmer\?\?\[\]\)parts\.add\(id\);\}\n takeFarmerParts\(state,parts\);/);
 assert.match(src,/if\(r\.farmer\)r\.farmer=\[\.\.\.reward\.farmer\];/,'the reward is copied, never the tier\'s own list');
});

test('the running Autumn 2026 pass is untouched (its tiers as live, none gives a farmer part); the live rules play on with a farm that has pass parts',async t=>{
 // The tiers as they are on main and profile-release (21 Oct 2026), number for number.
 assert.equal(createHash('sha256').update(JSON.stringify(G.seasonById('autumn-2026').tiers)).digest('hex'),'9e8b467f4df487ac33863cdb4f2a9208ecd0d2b3c98ec289e63f9f9792990a46');
 for(const tier of G.seasonById('autumn-2026').tiers)for(const track of ['free','paid'])assert.equal(tier[track].farmer,undefined);
 // The live rules (main f6c82f75) on a farm with pass parts: the list is kept as it is (a key they do not know), and the farm plays on.
 const old=show('f6c82f75','game/farm-state.js');if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old));
 const s=farm(20);G.giveFarmerParts(s,['hat_034']);const copy=structuredClone(s);
 O.normalizeFarm(copy,now+60000);assert.deepEqual(copy.farmerParts,['hat_034']);
 O.farmSummary(copy,now+60000);O.applyFarmAction(copy,{type:'sell',item:'wheat',quantity:1},now+60000);assert.deepEqual(copy.farmerParts,['hat_034']);
 assert.deepEqual(G.normalizeFarm(structuredClone(copy),now+120000).farmerParts,['hat_034'],'and back on the new rules');
});

test('FARMER_PASS_PARTS: empty until the Winter pass, written down how it will be used; the Christmas pieces stay out of My farmer',()=>{
 assert.deepEqual(FARMER_PASS_PARTS,{});
 const parts=read('game/farmer-parts.js');
 assert.match(parts,/The Winter pass will use it like this: a winter hat, a scarf and a coat/);
 assert.match(parts,/No Christmas outfit here: that is kept for a Christmas Pass\./);
 for(const id of ['hat_015','costume_5'])assert.ok(!FARMER_OFFER.has(id)&&!Object.hasOwn(FARMER_PASS_PARTS,id),`${FARMER_PARTS[id].name} is not offered`);
 // A part a pass gives says so in My farmer (in every language).
 assert.match(read('public/farmer-creator.js'),/if\(Object\.hasOwn\(FARMER_PASS_PARTS,id\)\)return 'In the Season Pass\.';/);
 const catalog=JSON.parse(read('i18n/catalog.json'));assert.ok(Object.hasOwn(catalog,'In the Season Pass.'));
});
