import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_MIN_LEVEL,emptyFamilyContext,familyMutate,familyPublicView,createFarm,normalizeFarm,xpForLevel,applyFarmAction,DAY_MS} from '../game/farm-state.js';
import {FAMILY_SHIRT,FAMILY_SHIRTS,FAMILY_SHIRT_PART,FARMER_PARTS,DEFAULT_FARMER,farmerOwned,farmerOf,farmerFiles,farmerPart,validFarmerConfig,creatorParts,wearPart} from '../game/farmer-parts.js';
import {familyChanges} from '../supabase/functions/farm-api/family-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// The family shirt (21 Oct 2026, the owner: "Doe alles behalve 9; Kerstoutfit bewaren voor Kerst Pass", item 6).
const now=Date.parse('2026-10-21T12:00:00Z');
const farm=()=>{const s=createFarm(now);s.xp=xpForLevel(FAMILY_MIN_LEVEL+5);return normalizeFarm(s,now);};
const run=(c,p,a,t=now)=>familyMutate(c,farm(),p,a,t);
function family(sqlRan=true){
 let c=run(emptyFamilyContext(),'lea',{type:'family_create',name:'Meadow Friends',emblem:'3'},now-9*DAY_MS).context;
 for(const p of ['lea','bo','cas'])if(!c.players.some(x=>x.player_id===p))c.players.push({player_id:p,username:p,level:20,last_active_at:new Date(now).toISOString()});
 for(const p of ['bo','cas'])c=run(c,p,{type:'family_join',familyId:c.families[0].id},now-9*DAY_MS).context;
 // As read from the database: after supabase/family-shirt.sql every family row has its shirt (empty to begin with).
 if(sqlRan)for(const f of c.families)f.shirt??=null;
 return c;
}
const memberOf=(c,p)=>c.members.find(m=>m.player_id===p);

test('the leader or a co-leader picks the family shirt\'s cut (or none); it is saved with the family and shown to every member',()=>{
 assert.deepEqual(FAMILY_SHIRTS,['outwear_001','outwear_016','outwear_026'],'a T-shirt, a polo shirt and a hoodie');
 for(const id of FAMILY_SHIRTS)assert.equal(FARMER_PARTS[id].slot,'top');
 let c=family();
 c=run(c,'lea',{type:'family_rank',memberId:memberOf(c,'bo').id,rank:'coleader'}).context;
 const set=run(c,'bo',{type:'family_shirt',shirt:'outwear_026'});
 assert.equal(set.context.families[0].shirt,'outwear_026','a co-leader may');assert.match(set.result.message,/Family shirt chosen\. Members can wear it in My farmer\./);
 assert.deepEqual(familyChanges(c,set.context).families.map(f=>f.shirt),['outwear_026'],'saved with the family row (harvest_family_commit: shirt=excluded.shirt)');
 assert.throws(()=>run(c,'cas',{type:'family_shirt',shirt:'outwear_001'}),/Only the family leader or a co-leader/,'a member may not');
 for(const shirt of ['outwear_010','hat_009','',42,{},'family_shirt'])assert.throws(()=>run(c,'lea',{type:'family_shirt',shirt}),/Choose a family shirt\./,String(shirt));
 const none=run(set.context,'lea',{type:'family_shirt',shirt:null});assert.equal(none.context.families[0].shirt,null);assert.match(none.result.message,/Your family has no shirt now\./);
 // Every member sees it (the view's family: its cut, or null for none).
 for(const p of ['lea','bo','cas'])assert.equal(familyPublicView(set.context,p,farm(),now).family.shirt,'outwear_026');
 assert.equal(familyPublicView(c,'cas',farm(),now).family.shirt,null);
 // A cut that is not one (a row changed by hand) shows as none.
 const odd=structuredClone(c);odd.families[0].shirt='hat_009';assert.equal(familyPublicView(odd,'lea',farm(),now).family.shirt,null);
});

test('before supabase/family-shirt.sql has run, nothing changes: no shirt in the view, and the action is refused (the database would drop it)',()=>{
 const c=family(false);
 assert.equal(Object.hasOwn(c.families[0],'shirt'),false);
 assert.equal('shirt' in familyPublicView(c,'lea',farm(),now).family&&familyPublicView(c,'lea',farm(),now).family.shirt!==undefined,false);
 assert.equal(JSON.parse(JSON.stringify(familyPublicView(c,'lea',farm(),now))).family.shirt,undefined,'not sent at all (the Family window then shows no shirt)');
 assert.throws(()=>run(c,'lea',{type:'family_shirt',shirt:'outwear_001'}),/The family shirt is not open yet\./);
 assert.match(read('public/family-ui.js'),/\$\{f\.shirt!==undefined\?shirtPicker\(f\):''\}/);
});

test('My farmer: a member wears it as a top while they are in a family, drawn in the family\'s cut; out of the family it comes off',()=>{
 const inFamily={...farm(),family:{familyId:'f-1',unclaimedCount:0}},alone={...farm(),family:{familyId:null,unclaimedCount:0}};
 assert.ok(farmerOwned(inFamily,{level:15}).includes(FAMILY_SHIRT));assert.ok(!farmerOwned(alone,{level:15}).includes(FAMILY_SHIRT));
 assert.ok(!farmerOwned({},{}).includes(FAMILY_SHIRT));
 const worn=wearPart(DEFAULT_FARMER,'top',FAMILY_SHIRT);assert.equal(worn.top,FAMILY_SHIRT);assert.equal(worn.outfit,undefined,'a top takes the dungarees off, as any top');
 assert.equal(validFarmerConfig(worn,{owned:farmerOwned(inFamily,{level:15}),offered:true}).ok,true);
 assert.equal(validFarmerConfig(worn,{owned:farmerOwned(alone,{level:15}),offered:true}).ok,false);
 assert.equal(FAMILY_SHIRT_PART.earned,true);assert.equal(farmerPart(FAMILY_SHIRT),FAMILY_SHIRT_PART);
 // The farm action: saved in a family; a farm that left its family shows it no more (farmerOf takes it off).
 const s=structuredClone(inFamily);applyFarmAction(s,{type:'farmer_wear',farmer:worn},now);assert.equal(s.farmer.top,FAMILY_SHIRT);
 assert.equal(farmerOf(s,{level:15}).top,FAMILY_SHIRT);
 const left={...s,family:{familyId:null,unclaimedCount:0}};assert.equal(farmerOf(left,{level:15}).top,'outwear_001','the plain T-shirt in its place, never bare-chested');
 assert.ok(validFarmerConfig(farmerOf(left,{level:15}),{owned:farmerOwned(left,{level:15}),offered:true}).ok,'and My farmer can save it as it shows');
 assert.throws(()=>applyFarmAction(structuredClone(alone),{type:'farmer_wear',farmer:worn},now));
 // The files: the family's cut, or the T-shirt until the family is known; My farmer's picture sheets are untouched (its own tile).
 assert.deepEqual(farmerFiles(worn,{shirt:'outwear_026'}).filter(f=>f.startsWith('outwear')),FARMER_PARTS.outwear_026.files);
 assert.deepEqual(farmerFiles(worn).filter(f=>f.startsWith('outwear')),FARMER_PARTS.outwear_001.files);
 assert.ok(!creatorParts('top').some(p=>p.family));
 const creator=read('public/farmer-creator.js');
 assert.match(creator,/const shirt=tab==='top'&&family\?\.shirt&&isOwned\(farmerPart\(FAMILY_SHIRT\)\)\?/);
 // farmer.js: one colour, the family's (its emblem's, as the flag), and the emblem on a patch on the chest, made once at the rest pose.
 const farmer=read('public/farmer.js');
 assert.match(farmer,/export const familyColour=emblem=>emblemColor\(emblem\);/,'the emblem\'s colour, or cream behind an own picture (30 Oct 2026)');
 assert.match(farmer,/const worn=new Map\(\),patch=chestPatch\(root,bones,height\);/);
 assert.match(read('public/family-flag.js'),/emblem=FAMILY_EMBLEMS\.find\(e=>e\.id===family\.emblem\)\?\?FAMILY_EMBLEMS\[0\]/,'the flag\'s colour is the emblem\'s too');
});

test('the shirt is kept on the device after every Family read, so drawing it needs no read of its own',async()=>{
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 try{
  const {keepFamilyShirt,keptFamilyShirt,familyShirt,FAMILY_SHIRT_KEEP}=await import('../public/family-shirt.js');
  let reads=0;const bridge={request:async body=>{reads++;assert.deepEqual(body,{operation:'family'});return {family:{family:{id:'f-1',shirt:'outwear_016',emblem:'3'}},profile:{player_id:'me'}};}};
  assert.deepEqual(await familyShirt('f-1',bridge),{shirt:'outwear_016',emblem:'3'});assert.equal(reads,1);
  assert.deepEqual(await familyShirt('f-1',bridge),{shirt:'outwear_016',emblem:'3'});assert.equal(reads,1,'kept');
  assert.equal(keptFamilyShirt('f-2'),null,'another family: read again');assert.equal(keptFamilyShirt('f-1',Date.now()+FAMILY_SHIRT_KEEP+1),null,'a day old: read again');
  keepFamilyShirt({family:{id:'f-1',emblem:'3'}});assert.equal(keptFamilyShirt('f-1').shirt,null,'a view without a shirt: none');
  assert.equal(await familyShirt(null,bridge),null);
 }finally{delete globalThis.localStorage;}
 const game=read('public/game.js'),ui=read('public/family-ui.js');
 assert.match(ui,/view=data\.family;lastRead=Date\.now\(\);error='';keepFamilyShirt\(view\);/);assert.match(ui,/view=result\.family;lastRead=Date\.now\(\);keepFamilyShirt\(view\);/);
 assert.match(game,/family=config\.top==='family_shirt'\?await \(await import\('\.\/family-shirt\.js'\)\)\.familyShirt\(state\.family\?\.familyId\):null;/,'read only when the farmer wears it');
});

test('supabase/family-shirt.sql: guarded, one transaction, the commit patched in its live definition, the grant explicit, checked after',()=>{
 const sql=read('supabase/family-shirt.sql');
 assert.match(sql,/^begin;$/m);assert.match(sql,/^commit;$/m);
 assert.match(sql,/"harvest_family_commit\(uuid,bigint,bigint,integer,jsonb,integer\[\],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean\)":\["03b6dd5875190236a4034c0c8ce4f7b5","8c3514769a8d4e1fc0d4ed033349401c"\]/,'the live md5 (21 Oct 2026) and the patched one');
 assert.match(sql,/execute replace\(body,'idle_days=excluded\.idle_days;','idle_days=excluded\.idle_days,shirt=excluded\.shirt;'\);/);
 assert.match(sql,/revoke all on function public\.harvest_family_commit\([^)]*\) from public, anon, authenticated;/);
 assert.match(sql,/is distinct from '8c3514769a8d4e1fc0d4ed033349401c'/);
 const cuts=/check \(shirt is null or shirt in \(([^)]*)\)\)/.exec(sql)[1].split(',').map(x=>x.trim().replace(/'/g,''));
 assert.deepEqual(cuts,FAMILY_SHIRTS,'the database allows exactly the game\'s cuts');
 // No DO block's tag is named like one of its variables.
 const tags=[...sql.matchAll(/do \$(\w+)\$/g)].map(m=>m[1]),vars=[...sql.matchAll(/declare ([^;]*;(?:[^;]*;)*?)\s*begin/g)].flatMap(m=>[...m[1].matchAll(/(?:^|;|,)\s*(\w+)\s+(?:jsonb|text|regprocedure)/g)].map(x=>x[1]));
 for(const t of tags)assert.ok(!vars.includes(t),t);
 assert.match(read('supabase/functions/farm-api/player-log.js'),/family_shirt:'Chose the family shirt'/);
 // Joining a family is no "Something new to wear in My farmer." (QA, 21 Oct 2026): a family without a shirt has none to show.
 assert.match(read('public/game.js'),/const earnedToWear=\(\)=>farmerOwned\(state,farmerFarm\(\)\)\.filter\(id=>id!==FAMILY_SHIRT\);\nlet farmerKnown=new Set\(earnedToWear\(\)\);/);
});
