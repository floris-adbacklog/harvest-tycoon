import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {PLAYER_AVATARS,playerAvatar,isPlayerAvatar,avatarImage} from '../public/player-avatars.js';
import {avatarSettingsMarkup,createAvatarSettings} from '../public/avatar-settings.js';
import {savePlayerAvatar} from '../supabase/functions/farm-api/avatar-service.js';
import {handlePlayerDirectory} from '../supabase/functions/farm-api/player-profile-service.js';
import {renderPlayerProfile,renderPlayerSearch} from '../src/player-profiles.js';

test('19 additional avatars and the original resolve to unique, shipped images',()=>{
 assert.equal(PLAYER_AVATARS.length,20);assert.equal(new Set(PLAYER_AVATARS.map(a=>a.id)).size,20);
 assert.equal(new Set(PLAYER_AVATARS.map(a=>a.src)).size,20);assert.equal(new Set(PLAYER_AVATARS.map(a=>a.name)).size,20,'no two faces share a name');
 for(const a of PLAYER_AVATARS){assert.ok(existsSync(new URL('../public'+a.src,import.meta.url)),a.src);assert.ok(isPlayerAvatar(a.id));}
 assert.equal(readFileSync(new URL('../public/player-avatars.js',import.meta.url),'utf8'),readFileSync(new URL('../supabase/functions/farm-api/player-avatars.js',import.meta.url),'utf8'));
});
test('every avatar is a farmer portrait of the same size and style, and the family emblem artwork is not among them',()=>{
 for(const a of PLAYER_AVATARS.slice(1)){
  const file=readFileSync(new URL('../public'+a.src,import.meta.url));
  assert.equal(file.subarray(0,4).toString(),'RIFF',a.id);assert.equal(file.subarray(8,12).toString(),'WEBP',a.id);
  assert.ok(file.length>20000&&file.length<60000,`${a.id} is a light portrait (${file.length} bytes)`);
  assert.match(a.name,/^[A-Z][a-z]+( [a-z]+)?$/,`${a.id} has a role name like the others`);
 }
 for(const emblem of ['owl','fox','windmill','horseshoe'])assert.ok(!PLAYER_AVATARS.some(a=>a.name.toLowerCase().includes(emblem)),`${emblem} is an emblem, not an avatar`);
});
test('the database accepts exactly the avatars the game offers',()=>{
 const migrations=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(f=>/player_avatars\.sql$/.test(f)).sort();
 assert.ok(migrations.length>=2,'the first list and the extension are both in the repo');
 const latest=readFileSync(new URL(`../supabase/migrations/${migrations.at(-1)}`,import.meta.url),'utf8');
 const listed=[...latest.match(/check \(avatar_id in \(([^)]*)\)\)/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
 assert.deepEqual(listed,PLAYER_AVATARS.map(a=>a.id),'same IDs in the same order as public/player-avatars.js');
});
test('unknown avatar IDs cannot become an image path or injected HTML',()=>{
 for(const id of [undefined,null,{},'__proto__','../../../secret','https://bad.example/a','" onerror="alert(1)']){
  assert.equal(isPlayerAvatar(id),false);assert.equal(playerAvatar(id).id,'default');assert.ok(avatarImage(id).includes('/assets/farmer-avatar.webp'));assert.ok(!avatarImage(id).includes('onerror'));
 }
});
function db({missing=false,error=null}={}){
 const calls=[];let patch,owner;
 return {calls,from(table){calls.push(table);return {update(value){patch=value;calls.push(value);return this;},eq(key,value){assert.equal(key,'player_id');owner=value;return this;},select(fields){assert.ok(!fields.includes('*'));return this;},async maybeSingle(){return {data:missing?null:{player_id:owner,username:'Sunny',level:5,currency:123,avatar_id:patch.avatar_id},error};}};}};
}
test('avatar writes only the authenticated owner and cosmetic data, safely repeatable',async()=>{
 const admin=db(),now=Date.UTC(2026,8,21);
 for(let i=0;i<2;i++){
  const r=await savePlayerAvatar({admin,player:'owner',avatarId:'berry-gardener',now,playerId:'someone-else',coins:999});
  assert.equal(r.status,200);assert.equal(r.data.profile.player_id,'owner');assert.equal(r.data.profile.avatar_id,'berry-gardener');assert.equal(r.data.profile.currency,123);
 }
 for(const patch of admin.calls.filter(c=>typeof c==='object'))assert.deepEqual(patch,{avatar_id:'berry-gardener',last_active_at:new Date(now).toISOString()});
});
test('invalid choices never write; missing profiles and database errors are not successes',async()=>{
 const admin=db();for(const avatarId of ['',null,{},'vip-only','/assets/farmer-avatar.webp'])assert.equal((await savePlayerAvatar({admin,player:'owner',avatarId})).status,400);
 assert.equal(admin.calls.length,0);
 assert.equal((await savePlayerAvatar({admin:db({missing:true}),player:'owner',avatarId:'default'})).status,409);
 await assert.rejects(()=>savePlayerAvatar({admin:db({error:new Error('offline')}),player:'owner',avatarId:'default'}),/offline/);
});
test('profile directory returns the saved avatar in both search and profile',async()=>{
 const row={player_id:'11111111-1111-4111-8111-111111111111',username:'Sunny',level:5,avatar_id:'berry-gardener'};
 const admin={from(table){return {select(){return this;},eq(){return this;},in(){return this;},is(){return this;},ilike(){return this;},order(){return this;},limit(){return this;},async maybeSingle(){return {data:table==='player_stats'?row:null};},then(resolve){return Promise.resolve({data:table==='player_stats'?[row]:[]}).then(resolve);}};}};
 for(const body of [{operation:'player_profile',playerId:row.player_id},{operation:'player_search',query:'Sunny'}]){
  const r=await handlePlayerDirectory({admin,body,player:row.player_id});const p=r.data.playerProfile??r.data.players[0];assert.equal(p.avatarId,'berry-gardener');
  assert.ok(renderPlayerProfile(p).includes('/assets/avatars/berry-gardener.webp'));assert.ok(renderPlayerSearch([p]).includes('/assets/avatars/berry-gardener.webp'));
 }
});
test('avatar save is authenticated, session-checked and separate from farm rewards',()=>{
 const index=readFileSync(new URL('../supabase/functions/farm-api/index.ts',import.meta.url),'utf8');const route=index.indexOf('const saved=await savePlayerAvatar');
 assert.ok(route>index.indexOf("admin.rpc('harvest_session_active'"));assert.ok(route<index.indexOf("admin.from('player_farms')"));assert.match(index,/savePlayerAvatar\(\{admin,player:user.id,avatarId:body.avatarId\}\)/);
 assert.match(index,/avatar_id:profile\?\.avatar_id\?\?'default'/);
 const html=avatarSettingsMarkup('berry-gardener');assert.equal((html.match(/type="radio" name="avatar"/g)||[]).length,20);assert.equal((html.match(/ checked/g)||[]).length,1);assert.match(html,/value="berry-gardener" checked/);
 assert.equal((html.match(/data-emblem-step=/g)||[]).length,2,'one row of faces with an arrow on each side, not a wall of squares');
 assert.match(html,/<span>3 of 20<\/span>/);assert(!html.includes('<details'),'no folded-away grid');
});
function uiHarness(){
 const nodes=new Map(),events=[],pending=[];
 const node=()=>({listeners:{},textContent:'',disabled:false,addEventListener(k,fn){this.listeners[k]=fn;},setAttribute(){},querySelectorAll(){return [];},querySelector(key){if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);}});
 const root=node();const previous=globalThis.window;
 globalThis.window={addEventListener(){},dispatchEvent(event){events.push(event);}};
 const controller=createAvatarSettings(root,{profile:{avatar_id:'default'},bridge:{playerId:'owner',request(body){return new Promise((resolve,reject)=>pending.push({body,resolve,reject}));}}});
 const form=nodes.get('form');return {controller,nodes,events,pending,choose(id){form.listeners.change({target:{name:'avatar',value:id}});},submit(){return form.listeners.submit({preventDefault(){}});},restore(){globalThis.window=previous;}};
}
test('Settings previews without saving, prevents duplicate requests and confirms after server success',async()=>{
 const h=uiHarness();try{
  h.choose('orchard-grower');assert.equal(h.controller.savedAvatar,'default');assert.equal(h.pending.length,0);
  const done=h.submit();await h.submit();assert.equal(h.pending.length,1);assert.equal(h.nodes.get('fieldset').disabled,true);
  h.pending[0].resolve({profile:{player_id:'owner',avatar_id:'orchard-grower'}});await done;
  assert.equal(h.controller.savedAvatar,'orchard-grower');assert.equal(h.nodes.get('#avatar-feedback').textContent,'Avatar saved.');assert.equal(h.events.length,1);
 }finally{h.restore();}
});
test('Settings retains saved avatar on error, permits retry and rejects wrong-owner replies',async()=>{
 const h=uiHarness();try{
  h.choose('berry-gardener');let done=h.submit();h.pending[0].reject(new Error('Offline. Try again.'));await done;
  assert.equal(h.controller.savedAvatar,'default');assert.equal(h.nodes.get('.avatar-save').disabled,false);assert.match(h.nodes.get('#avatar-feedback').textContent,/Offline/);
  done=h.submit();h.pending[1].resolve({profile:{player_id:'other',avatar_id:'berry-gardener'}});await done;
  assert.equal(h.controller.savedAvatar,'default');assert.equal(h.events.length,0);
 }finally{h.restore();}
});

test('the Save button is found by its class: the first button in the form is an arrow, and it must stay an arrow',()=>{
 const html=avatarSettingsMarkup('berry-gardener');
 assert.match(html.match(/<button[^>]*>/)[0],/class="emblem-arrow"/,'the first button of the form is the left arrow');
 const saves=html.match(/<button[^>]*class="[^"]*avatar-save[^"]*"[^>]*>/g)??[];assert.equal(saves.length,1);assert.match(saves[0],/type="submit"/);
 const source=readFileSync(new URL('../public/avatar-settings.js',import.meta.url),'utf8');
 assert.match(source,/save=form\.querySelector\('\.avatar-save'\)/);assert.ok(!/form\.querySelector\('button'\)/.test(source),'never "the first button"');
});
test('choosing an avatar enables and labels only the Save button, never "a button"',async()=>{
 const h=uiHarness();try{
  h.choose('orchard-grower');assert.equal(h.nodes.get('.avatar-save').disabled,false,'Save can be pressed');assert.equal(h.nodes.get('.avatar-save').textContent,'Save avatar');
  const done=h.submit();assert.equal(h.nodes.get('.avatar-save').textContent,'Saving…');
  h.pending[0].resolve({profile:{player_id:'owner',avatar_id:'orchard-grower'}});await done;
  assert.equal(h.nodes.get('.avatar-save').disabled,true,'nothing new to save');assert.equal(h.nodes.get('.avatar-save').textContent,'Save avatar');
  assert.ok(![...h.nodes.keys()].includes('button'),'no lookup ever grabbed an arrow');
 }finally{h.restore();}
});
