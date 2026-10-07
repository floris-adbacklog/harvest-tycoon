import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {FAMILY_EMBLEMS,FAMILY_EMBLEM_ORDER,FAMILY_GAME_EMBLEM_ORDER,FAMILY_EMBLEM_DEFAULT,FAMILY_MIN_LEVEL,familyEmblemChoices,familyEmblemReal,familyEmblemValid,emptyFamilyContext,familyMutate,createFarm,normalizeFarm,xpForLevel,ITEMS,CROPS,itemUnlockLevel,worldTwoItem} from '../game/farm-state.js';
import {art,artSource,pictureFile} from '../public/visual-icons.js';
import {LANGUAGES} from '../public/languages.js';
import {renderPlayerProfile} from '../src/player-profiles.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const file=icon=>new URL(`../public/assets/icons/${icon}.webp`,import.meta.url);

// 7 Oct 2026: 33 real family emblems (ids 60-92), so the picker offers a round 40 with the 7 older ones.
const NEW=['rooster','sheep','cow','piglet','bunny','hedgehog','duckling','goat','horse','squirrel','robin','frog','turtle','ladybug','butterfly','watering-can','lantern','key','shield-crest','moon','rainbow','mushroom-cottage','water-well','scarecrow','ginger-cat','sheepdog','snail','dragonfly','swan','fawn','badger','sun','raincloud'].map(name=>`family-${name}`);
const OLD_REAL=['family-bee','family-oak','family-barn','family-fox','family-owl','family-windmill','family-horseshoe'];
// 7 Oct 2026, 100 emblems: after the 40 family emblems, 60 game icons: the 53 old crop and goods emblems and 7 more of the game's own
// goods (ids 93-99).
const NEW_GAME=['salad','beangratin','applecompote','applevinegar','pickledbeans','truffleomelette','berrycheesecake'];
const ANIMALS=new Set(['rooster','duckling','cow','piglet','sheep','goat','horse','sheepdog','ginger-cat','bunny','fox','owl','hedgehog','squirrel','badger','fawn','robin','swan','frog','turtle','snail','bee','ladybug','butterfly','dragonfly'].map(name=>`family-${name}`));
const now=Date.parse('2026-10-07T12:00:00Z');
const farm=()=>{const s=createFarm(now);s.xp=xpForLevel(FAMILY_MIN_LEVEL);return normalizeFarm(s,now);};
const create=emblem=>familyMutate(emptyFamilyContext(),farm(),'alice',{type:'family_create',name:'Meadow Friends',emblem},now);

test('the new emblems are added at the end (ids 60-92 and 93-99), so every family keeps its emblem',()=>{
 assert.equal(FAMILY_EMBLEMS.length,100);
 FAMILY_EMBLEMS.forEach((e,i)=>assert.equal(e.id,String(i),'an id is its place in the list'));
 assert.deepEqual(FAMILY_EMBLEMS.slice(60,93).map(e=>e.icon),NEW);
 assert.deepEqual(FAMILY_EMBLEMS.slice(93).map(e=>e.icon),NEW_GAME,'7 Oct 2026: 7 more game icons');
 assert.deepEqual(FAMILY_EMBLEMS.slice(0,25).filter(familyEmblemReal).map(e=>e.icon),['family-bee','family-oak','family-barn','family-fox','family-owl','family-windmill','family-horseshoe']);
 assert.equal(FAMILY_EMBLEMS.slice(25,60).filter(familyEmblemReal).length,0,'ids 25-59 are crops and goods');
 assert.equal(new Set(FAMILY_EMBLEMS.map(e=>e.icon)).size,FAMILY_EMBLEMS.length,'no emblem twice');
});

test('the picker offers all 100: the 40 family emblems first, animals first, then things',()=>{
 const offer=familyEmblemChoices().slice(0,40);
 assert.equal(familyEmblemChoices().length,100);assert.ok(offer.every(familyEmblemReal));
 assert.deepEqual(offer.map(e=>e.icon).sort(),[...OLD_REAL,...NEW].sort(),'every real one, once');
 assert.deepEqual(offer.map(e=>e.icon),FAMILY_EMBLEM_ORDER,'in the order they had');
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
test('then the 60 game icons: the 53 old crop and goods emblems and the 7 new, crops first, then goods, then the farm\'s own things',()=>{
 const games=familyEmblemChoices().slice(40);
 assert.equal(games.length,60);assert.ok(games.every(e=>!familyEmblemReal(e)));
 assert.deepEqual(games.map(e=>e.id).sort(),FAMILY_EMBLEMS.filter(e=>!familyEmblemReal(e)).map(e=>e.id).sort(),'every old one and the 7 new, once');
 assert.deepEqual(games.map(e=>e.icon),FAMILY_GAME_EMBLEM_ORDER,'in their own order, not by id');
 assert.equal(new Set(FAMILY_GAME_EMBLEM_ORDER).size,60);
 const crop=e=>!!CROPS[e.icon];
 assert.equal(games.filter(crop).length,16);assert.ok(games.slice(0,16).every(crop),'the 16 crops first');
 assert.deepEqual(games.slice(0,4).map(e=>e.icon),['wheat','corn','barley','sunflower'],'the corn between the two sheaves');
 assert.deepEqual(games.slice(16,18).map(e=>e.icon),['truffles','prizeproduce'],'then what else the land gives');
 assert.deepEqual(games.slice(-5).map(e=>e.icon),['farm','tractor','silo','cart','trophy'],'the farm\'s own things last');
 assert.ok(games.slice(18,-5).every(e=>ITEMS[e.icon]&&!crop(e)),'goods in between');
});
test('the 7 new game icons are goods a farmer makes before level 40, not hidden heirlooms or World II',()=>{
 for(const icon of NEW_GAME){
  assert.ok(ITEMS[icon],`${icon} is an item`);assert.ok(itemUnlockLevel(icon)<=40,`${icon} opens at level ${itemUnlockLevel(icon)}`);
  assert.ok(!ITEMS[icon].heirloom&&!worldTwoItem(icon),`${icon} is on the farm`);
 }
});
test('every family can pick any of the 100 again: the row is the same for every family, whatever it has now',()=>{
 const row=familyEmblemChoices().map(e=>e.id);
 assert.deepEqual([...row].sort((a,b)=>a-b),FAMILY_EMBLEMS.map(e=>e.id),'all 100, once');
 for(const id of ['0','17','22','59','60','92','93','99'])assert.ok(row.includes(id),`${id} is in the row`);
 assert.deepEqual(familyEmblemChoices('17').map(e=>e.id),row,'no family gets its own row any more');
});
test('the old emblems still show everywhere: the family window, the flag and a farmer profile look them up in the whole list',()=>{
 assert.match(read('public/family-ui.js'),/const emblem=id=>\{const e=FAMILY_EMBLEMS\.find\(x=>x\.id===id\)\?\?FAMILY_EMBLEMS\[0\];/);
 assert.match(read('public/family-flag.js'),/emblem=FAMILY_EMBLEMS\.find\(e=>e\.id===family\.emblem\)\?\?FAMILY_EMBLEMS\[0\]/);
 const profile=emblem=>renderPlayerProfile({username:'Floris',level:41,online:true,stats:{},badges:[],family:{id:'f',name:'Meadow',emblem,role:'Leader'}});
 assert.match(profile('17'),/<span class="farmer-family-emblem"[^>]*><span class="game-art game-art-sprite " data-art="cheese"/);
 assert.match(profile('93'),/<span class="farmer-family-emblem"[^>]*><span class="game-art game-art-sprite " data-art="salad"/);
 assert.match(profile('99'),/<span class="farmer-family-emblem"[^>]*><img class="game-art " data-art="berrycheesecake" src="\/assets\/icons\/berrycheesecake\.webp"/);
 assert.match(profile('60'),/<span class="farmer-family-emblem"[^>]*><img class="game-art " data-art="family-rooster" src="\/assets\/icons\/family-rooster\.webp"/);
});

test('the server takes exactly the ids that exist: 0-99, the old ones and the new ones',()=>{
 for(const id of ['0','17','59','60','92','93','99'])assert.equal(familyEmblemValid(id),true,id);
 for(let i=0;i<FAMILY_EMBLEMS.length;i++)assert.equal(familyEmblemValid(String(i)),true,String(i));
 for(const id of ['100','101','999','07','093',' 60','-1','1e1','__proto__','',null,undefined,60,99])assert.equal(familyEmblemValid(id),false,String(id));
 assert.equal(create('60').context.families[0].emblem,'60');
 assert.equal(create('93').context.families[0].emblem,'93');
 assert.equal(create('99').context.families[0].emblem,'99');
 assert.equal(create('0').context.families[0].emblem,'0');
 for(const id of ['100','999','07',undefined])assert.deepEqual([create(id).failed,create(id).result],[true,{error:'Choose a family emblem.'}],String(id));   // a failed create is counted, not thrown
 let c=create('60').context;
 for(const id of ['17','92','93','99','0','60']){const r=familyMutate(c,farm(),'alice',{type:'family_emblem',emblem:id},now);assert.equal(r.failed,false);c=r.context;assert.equal(c.families[0].emblem,id);}
 for(const id of ['100','101'])assert.throws(()=>familyMutate(c,farm(),'alice',{type:'family_emblem',emblem:id},now),/Choose a family emblem/);
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
 for(const icon of NEW_GAME)assert.match(artSource(icon).src,/\.webp$/,`${icon} shows as WebP`);   // 7 Oct 2026: no new picture, the game's own
 assert.match(read('public/visual-icons.js'),/for\(const \{icon\} of FAMILY_EMBLEMS\)if\(icon\.startsWith\('family-'\)\)\{pictures\[icon\]=icon;webpPictures\.add\(icon\);\}/);
});

test('every emblem in the picker has a name in every language: a game icon is called after its item',()=>{
 const ui=read('public/family-ui.js'),own=Function(`return ${ui.match(/const EMBLEM_NAMES=(\{[\s\S]*?\});/)[1]}`)();
 assert.match(ui,/const emblemName=e=>EMBLEM_NAMES\[e\.icon\]\?\?ITEMS\[e\.icon\]\?\.name\?\?/);
 const nameOf=e=>own[e.icon]??ITEMS[e.icon]?.name,catalog=JSON.parse(read('i18n/catalog.json'));
 const texts=Object.fromEntries(LANGUAGES.filter(l=>l.code!=='en').map(({code})=>[code,JSON.parse(read(`public/i18n/${code}.json`))]));
 for(const e of familyEmblemChoices()){
  const name=nameOf(e);assert.ok(name,`${e.icon} has a name`);assert.ok(name in catalog,`${name} is in the catalog`);
  assert.ok(!/ · /.test(name));
  if(!familyEmblemReal(e)&&ITEMS[e.icon])assert.ok(!(e.icon in own),`${e.icon} keeps its item name`);
  for(const [code,t] of Object.entries(texts))assert.ok(typeof t[name]==='string'&&t[name].trim(),`${name} in ${code}`);
 }
 assert.equal(new Set(familyEmblemChoices().map(nameOf)).size,100,'no two emblems share a name');
 assert.deepEqual(Object.keys(own).filter(icon=>!icon.startsWith('family-')).sort(),FAMILY_EMBLEMS.filter(e=>!familyEmblemReal(e)&&!ITEMS[e.icon]).map(e=>e.icon).sort(),'a name of its own only for the five that are no item');
 assert.equal(Object.keys(own).length,45,'40 family emblems and those five, and no more');
});
