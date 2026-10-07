import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {FAMILY_EMBLEMS,FAMILY_EMBLEM_ORDER,FAMILY_EMBLEM_DEFAULT,FAMILY_MIN_LEVEL,familyEmblemChoices,familyEmblemReal,familyEmblemValid,emptyFamilyContext,familyMutate,createFarm,normalizeFarm,xpForLevel} from '../game/farm-state.js';
import {art,artSource,pictureFile} from '../public/visual-icons.js';
import {LANGUAGES} from '../public/languages.js';
import {renderPlayerProfile} from '../src/player-profiles.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const file=icon=>new URL(`../public/assets/icons/${icon}.webp`,import.meta.url);

// 7 Oct 2026: 33 real family emblems (ids 60-92), so the picker offers a round 40 with the 7 older ones.
const NEW=['rooster','sheep','cow','piglet','bunny','hedgehog','duckling','goat','horse','squirrel','robin','frog','turtle','ladybug','butterfly','watering-can','lantern','key','shield-crest','moon','rainbow','mushroom-cottage','water-well','scarecrow','ginger-cat','sheepdog','snail','dragonfly','swan','fawn','badger','sun','raincloud'].map(name=>`family-${name}`);
const OLD_REAL=['family-bee','family-oak','family-barn','family-fox','family-owl','family-windmill','family-horseshoe'];
const ANIMALS=new Set(['rooster','duckling','cow','piglet','sheep','goat','horse','sheepdog','ginger-cat','bunny','fox','owl','hedgehog','squirrel','badger','fawn','robin','swan','frog','turtle','snail','bee','ladybug','butterfly','dragonfly'].map(name=>`family-${name}`));
const now=Date.parse('2026-10-07T12:00:00Z');
const farm=()=>{const s=createFarm(now);s.xp=xpForLevel(FAMILY_MIN_LEVEL);return normalizeFarm(s,now);};
const create=emblem=>familyMutate(emptyFamilyContext(),farm(),'alice',{type:'family_create',name:'Meadow Friends',emblem},now);

test('the 33 new emblems are added at the end (ids 60-92), so every family keeps its emblem',()=>{
 assert.equal(FAMILY_EMBLEMS.length,93);
 FAMILY_EMBLEMS.forEach((e,i)=>assert.equal(e.id,String(i),'an id is its place in the list'));
 assert.deepEqual(FAMILY_EMBLEMS.slice(60).map(e=>e.icon),NEW);
 assert.deepEqual(FAMILY_EMBLEMS.slice(0,25).filter(familyEmblemReal).map(e=>e.icon),['family-bee','family-oak','family-barn','family-fox','family-owl','family-windmill','family-horseshoe']);
 assert.equal(FAMILY_EMBLEMS.slice(25,60).filter(familyEmblemReal).length,0,'ids 25-59 are crops and goods');
 assert.equal(new Set(FAMILY_EMBLEMS.map(e=>e.icon)).size,FAMILY_EMBLEMS.length,'no emblem twice');
});

test('the picker offers only the real family emblems, animals first, then things',()=>{
 const offer=familyEmblemChoices();
 assert.equal(offer.length,40,'a round 40: the 7 older family emblems and the 33 new');assert.ok(offer.every(familyEmblemReal));
 assert.deepEqual(offer.map(e=>e.icon).sort(),[...OLD_REAL,...NEW].sort(),'every real one, once');
 const firstThing=offer.findIndex(e=>!ANIMALS.has(e.icon));
 assert.equal(firstThing,25,'25 animals');assert.ok(offer.slice(firstThing).every(e=>!ANIMALS.has(e.icon)),'then only things');
 assert.deepEqual(offer.slice(0,3).map(e=>e.icon),['family-rooster','family-duckling','family-cow']);
 assert.deepEqual([...FAMILY_EMBLEM_ORDER].sort(),offer.map(e=>e.icon).sort(),'the order holds exactly the emblems that exist');
 assert.equal(new Set(FAMILY_EMBLEM_ORDER).size,FAMILY_EMBLEM_ORDER.length);
 for(const e of FAMILY_EMBLEMS.filter(familyEmblemReal))assert.ok(FAMILY_EMBLEM_ORDER.includes(e.icon),`${e.icon} has its place`);
 assert.ok(FAMILY_EMBLEM_ORDER.every(icon=>icon.startsWith('family-')));
});
test('a new family starts with a real family emblem: the first in the row',()=>{
 assert.equal(FAMILY_EMBLEM_DEFAULT,familyEmblemChoices()[0].id);assert.equal(FAMILY_EMBLEM_DEFAULT,'60');
 assert.ok(familyEmblemReal(FAMILY_EMBLEMS[Number(FAMILY_EMBLEM_DEFAULT)]));
});
test('a family with an old crop or goods emblem keeps it, first in its row, until it picks another',()=>{
 const cheese=FAMILY_EMBLEMS.find(e=>e.icon==='cheese');
 const offer=familyEmblemChoices(cheese.id);
 assert.equal(offer.length,41);assert.equal(offer[0],cheese);assert.ok(offer.slice(1).every(familyEmblemReal));
 assert.deepEqual(familyEmblemChoices('0').slice(0,2).map(e=>e.icon),['wheat','family-rooster']);
 assert.deepEqual(familyEmblemChoices('22'),familyEmblemChoices(),'a real one is already in the row');
 assert.deepEqual(familyEmblemChoices('93'),familyEmblemChoices(),'nothing to keep for an id that does not exist');
 assert.deepEqual(familyEmblemChoices('__proto__'),familyEmblemChoices());
});
test('the old emblems still show everywhere: the family window, the flag and a farmer profile look them up in the whole list',()=>{
 assert.match(read('public/family-ui.js'),/const emblem=id=>\{const e=FAMILY_EMBLEMS\.find\(x=>x\.id===id\)\?\?FAMILY_EMBLEMS\[0\];/);
 assert.match(read('public/family-flag.js'),/emblem=FAMILY_EMBLEMS\.find\(e=>e\.id===family\.emblem\)\?\?FAMILY_EMBLEMS\[0\]/);
 const profile=emblem=>renderPlayerProfile({username:'Floris',level:41,online:true,stats:{},badges:[],family:{id:'f',name:'Meadow',emblem,role:'Leader'}});
 assert.match(profile('17'),/<span class="farmer-family-emblem"[^>]*><span class="game-art game-art-sprite " data-art="cheese"/);
 assert.match(profile('60'),/<span class="farmer-family-emblem"[^>]*><img class="game-art " data-art="family-rooster" src="\/assets\/icons\/family-rooster\.webp"/);
});

test('the server takes exactly the ids that exist: the new ones and the old ones too (0-92)',()=>{
 for(const id of ['0','17','59','60','92'])assert.equal(familyEmblemValid(id),true,id);
 for(let i=0;i<FAMILY_EMBLEMS.length;i++)assert.equal(familyEmblemValid(String(i)),true,String(i));
 for(const id of ['93','94','95','99','100','999','07',' 60','-1','1e1','__proto__','',null,undefined,60])assert.equal(familyEmblemValid(id),false,String(id));
 assert.equal(create('60').context.families[0].emblem,'60');
 assert.equal(create('92').context.families[0].emblem,'92');
 assert.equal(create('0').context.families[0].emblem,'0','a page that has not reloaded yet still creates a family');
 for(const id of ['93','99','100','07',undefined])assert.deepEqual([create(id).failed,create(id).result],[true,{error:'Choose a family emblem.'}],String(id));   // a failed create is counted, not thrown
 let c=create('0').context;
 for(const id of ['60','92','12','17']){const r=familyMutate(c,farm(),'alice',{type:'family_emblem',emblem:id},now);assert.equal(r.failed,false);c=r.context;assert.equal(c.families[0].emblem,id);}
 for(const id of ['93','99'])assert.throws(()=>familyMutate(c,farm(),'alice',{type:'family_emblem',emblem:id},now),/Choose a family emblem/);
 for(const path of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(path),read('game/farm-state.js'),`${path} is in sync`);
});

test('every real family emblem is a WebP picture of 256 px, registered as one, with no PNG for the new ones',()=>{
 for(const e of FAMILY_EMBLEMS.filter(familyEmblemReal)){
  assert.ok(existsSync(file(e.icon)),`${e.icon}.webp`);
  assert.equal(pictureFile(e.icon),`/assets/icons/${e.icon}.webp`);assert.equal(artSource(e.icon).src,`/assets/icons/${e.icon}.webp`);
  assert.match(art(e.icon),new RegExp(`src="/assets/icons/${e.icon}\\.webp"`));
 }
 for(const icon of NEW){
  const bytes=readFileSync(file(icon));
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.equal(bytes.subarray(12,16).toString(),'VP8X','with see-through edges');
  const size=at=>1+bytes[at]+(bytes[at+1]<<8)+(bytes[at+2]<<16);
  assert.deepEqual([size(24),size(27)],[256,256],`${icon} is 256 px like the fox`);
  assert.ok(bytes.length<45000,`${icon} is light: ${bytes.length} bytes`);
  assert.ok(!existsSync(new URL(`../public/assets/icons/${icon}.png`,import.meta.url)),`no ${icon}.png`);
 }
 assert.match(read('public/visual-icons.js'),/for\(const \{icon\} of FAMILY_EMBLEMS\)if\(icon\.startsWith\('family-'\)\)\{pictures\[icon\]=icon;webpPictures\.add\(icon\);\}/);
});

test('every emblem in the picker has a name in every language',()=>{
 const ui=read('public/family-ui.js'),names=Object.fromEntries([...ui.matchAll(/'(family-[a-z-]+)':'([^']+)'/g)].map(m=>[m[1],m[2]]));
 const catalog=JSON.parse(read('i18n/catalog.json'));
 for(const icon of [...OLD_REAL,...NEW]){
  const name=names[icon];assert.ok(name,`${icon} has a name`);assert.ok(name in catalog,`${name} is in the catalog`);
  assert.ok(!/ · /.test(name));
  for(const {code} of LANGUAGES.filter(l=>l.code!=='en')){const texts=JSON.parse(read(`public/i18n/${code}.json`));assert.ok(typeof texts[name]==='string'&&texts[name].trim(),`${name} in ${code}`);}
 }
 assert.equal(new Set(Object.values(names)).size,Object.keys(names).length,'no two emblems share a name');
 assert.equal(Object.keys(names).length,40,'a name for each of the 40, and no more');
});
