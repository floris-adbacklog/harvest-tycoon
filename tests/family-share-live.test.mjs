import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_CONFIG,FAMILY_CARDS_MAX,FAMILY_SHARE_GAP_MS,emptyFamilyContext,familyMutate,familyCards,familyStanding,createFarm,normalizeFarm,xpForLevel} from '../public/farm-state.js';
import {familyShareCard} from '../src/chat-ui.js';
import {createFamilyLive,familyCardIds,FAMILY_LIVE_EVERY,FAMILY_LIVE_SOON,FAMILY_LIVE_OLD_API} from '../src/family-live.js';
import {handleFamilyCards} from '../supabase/functions/farm-api/family-service.js';
import {familyShareDaySql,DAY_BODY,DAY_MD5,HOUR_MD5,DAY_CHANGES} from '../scripts/family-share-24h-sql.mjs';
import {SHARE_BODY} from '../scripts/family-share-sql.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// The family cards in the chat, live (20 Oct 2026, the owner: "als je iemand verwijdert moet dit wel realtime updaten 10 / 10 boeren",
// "ook na bericht plaatsen"), and Share in chat once a day (the owner, the same evening).

const now=Date.parse('2026-10-20T20:00:00Z');
const farm=level=>{const s=createFarm(now);s.xp=xpForLevel(level);return normalizeFarm(s,now);};
let ids=0;const uuid=()=>`00000000-0000-4000-8000-${String(++ids).padStart(12,'0')}`;
const run=(c,p,a,level=30)=>familyMutate(c,farm(level),p,a,now,{uuid});
const people=['lea',...Array.from({length:9},(_,i)=>`m${i}`),'out','other'];
// Meadow Friends, full (10 / 10), level 3 from its chests; and Other Acres. Then the leader removes m8: 9 / 10.
function valley(){
 ids=0;let c=emptyFamilyContext();
 for(const p of people)c.players.push({player_id:p,username:p,level:30,last_active_at:new Date(now).toISOString()});
 c=run(c,'lea',{type:'family_create',name:'Meadow Friends',emblem:'5'}).context;const id=c.families[0].id;
 for(let i=0;i<9;i++)c=run(c,`m${i}`,{type:'family_join',familyId:id}).context;
 c=run(c,'other',{type:'family_create',name:'Other Acres',emblem:'1'}).context;
 c.chests=[{family_id:id,week:1,points:26000},{family_id:id,week:2,points:12500}];c.attempts=[];
 return {c,id,other:c.families.find(f=>f.name==='Other Acres').id};
}
const kick=(c,who)=>{const next=run(c,'lea',{type:'family_kick',memberId:c.members.find(m=>m.player_id===who&&!m.left_at).id}).context;next.attempts=[];return next;};

// --- What farm-api answers ----------------------------------------------------------------------------------------------------------

test('familyCards: each family as it is now, in the card\'s own keys; a removal shows at once',()=>{
 let {c,id,other}=valley();
 const before=familyCards(c,[id],'out',now).cards[0];
 assert.deepEqual(before,{family:id,name:'Meadow Friends',emblem:'5',level:familyStanding(c,id).level,members:10,max:FAMILY_CONFIG.MAX_MEMBERS,mode:'open',minLevel:10});
 assert.ok(before.level>1,'the level from the chest tiers of every week');
 c=kick(c,'m8');
 const after=familyCards(c,[id,other],'out',now);
 assert.equal(after.cards[0].members,9,'10 / 10 becomes 9 / 10');
 assert.equal(after.cards[1].name,'Other Acres');assert.equal(after.cards[1].members,1);
 // Only what the family list shows anyone: no farmers, no names of members, no points, nothing of the family's settings beyond who
 // can join and from which level.
 for(const card of after.cards)assert.deepEqual(Object.keys(card).sort(),['emblem','family','level','max','members','minLevel','mode','name']);
 assert.doesNotMatch(JSON.stringify(after),/"m\d"|lea|points|shared_at|sharedAt|created|online|active/);
});

test('familyCards: a family that is gone (or never was) is only its id and gone; ids once each, at most 20',()=>{
 let {c,id,other}=valley();
 c.families=c.families.map(f=>f.id===other?{...f,deleted_at:new Date(now).toISOString()}:f);
 const r=familyCards(c,[other,'00000000-0000-4000-8000-999999999999',id,id],'out',now);
 assert.deepEqual(r.cards.map(x=>x.family),[other,'00000000-0000-4000-8000-999999999999',id]);
 assert.deepEqual(r.cards[0],{family:other,gone:true});assert.deepEqual(r.cards[1],{family:'00000000-0000-4000-8000-999999999999',gone:true});
 assert.equal(FAMILY_CARDS_MAX,20);
 assert.equal(familyCards(c,Array.from({length:30},(_,i)=>`id-${i}`),'out',now).cards.length,20);
 assert.deepEqual(familyCards(c,null,'out',now).cards,[]);
});

test('familyCards: who is asking, for Join or View: their own family now, and the family that removed them while it is closed to them',()=>{
 let {c,id,other}=valley();
 assert.deepEqual(familyCards(c,[id],'out',now).viewer,{familyId:null,blocked:null});
 assert.deepEqual(familyCards(c,[id],'m3',now).viewer,{familyId:id,blocked:null});
 assert.deepEqual(familyCards(c,[id],'other',now).viewer,{familyId:other,blocked:null});
 c=kick(c,'m8');
 const removed=familyCards(c,[id],'m8',now).viewer;
 assert.equal(removed.familyId,null);assert.equal(removed.blocked.family,id);assert.ok(removed.blocked.until>now);
});

function fakeAdmin(context){
 const calls=[];
 return {calls,rpc:async(name,args)=>{calls.push({name,args});if(name==='harvest_family_read')return {data:structuredClone({...context,now}),error:null};return {data:null,error:{code:'PGRST202'}};}};
}

test('farm-api family_cards: one read for every card, read only; bad input is refused or gone without asking the database',async()=>{
 const {c,id,other}=valley(),admin=fakeAdmin(c);
 let r=await handleFamilyCards({admin,body:{familyIds:[id,other,'nonsense']},player:'out'});
 assert.equal(r.status,200);assert.deepEqual(r.data.profile,{player_id:'out'},'the answer names whose it is, as the game checks');
 assert.deepEqual(admin.calls.map(x=>x.name),['harvest_family_read'],'one read, never a write');
 assert.deepEqual(admin.calls[0].args,{p_player:'out',p_family:null});
 assert.deepEqual(r.data.familyCards.cards.map(x=>[x.family,x.members??null,x.gone??false]),[[id,10,false],[other,1,false],['nonsense',null,true]]);
 assert.deepEqual(r.data.familyCards.viewer,{familyId:null,blocked:null});
 // Nothing that could be a family id: no read at all.
 const quiet=fakeAdmin(c);r=await handleFamilyCards({admin:quiet,body:{familyIds:['x','<script>']},player:'out'});
 assert.equal(r.status,200);assert.equal(quiet.calls.length,0);assert.deepEqual(r.data.familyCards.cards,[{family:'x',gone:true},{family:'<script>',gone:true}]);
 for(const familyIds of [undefined,'abc',{},Array.from({length:21},()=>id)]){
  const none=fakeAdmin(c);r=await handleFamilyCards({admin:none,body:{familyIds},player:'out'});
  assert.equal(r.status,422);assert.equal(r.data.code,'ACTION_REJECTED');assert.equal(none.calls.length,0);
 }
});

test('farm-api family_cards: on the list of requests, answered before the farm is read, and never a connection problem on the page',()=>{
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/'family','family_profile','family_share','family_cards','player_search'/);
 assert.match(api,/if\(body\.operation==='family_cards'\)\{const cards=await handleFamilyCards\(\{admin,body,player:user\.id\}\);return reply\(cards\.data,cards\.status\);\}/);
 assert.ok(api.indexOf("body.operation==='family_cards'")<api.indexOf("const found=await admin.from('player_farms')"),'no farm needed');
 // A background read: a failure keeps the cards as they were, it never shows "Reconnecting…".
 for(const file of ['src/main.js','src/farm-session.js'])assert.ok(read(file).includes("!['player_search','player_profile','avatar','family_cards'].includes(body.operation)"),file);
});

// --- The card -----------------------------------------------------------------------------------------------------------------------

const shared=(meta={})=>({id:'c1',channel:'global',sender:'lea',sender_name:'Lea',kind:'family_share',created_at:new Date(now-3*3600000).toISOString(),body:'Lea shared the family Meadow Friends',
 meta:{family:'fam-1',name:'Meadow Friends',emblem:'5',level:3,members:10,max:10,mode:'open',minLevel:10,...meta}});
const outsider={familyId:null,level:25,blocked:null};

test('the card shows the family as it is now: shared at 10 / 10, now 9 / 10, so an outsider gets Join',()=>{
 const m=shared();
 // While loading, or without an answer: what it was shared with. Full, so View.
 const stored=familyShareCard(m,outsider,now,null);
 assert.match(stored,/<span>10 \/ 10 farmers<\/span>/);assert.match(stored,/data-family-view="fam-1">View</);
 // Live: a farmer was removed.
 const live={family:'fam-1',name:'Meadow Friends',emblem:'5',level:4,members:9,max:10,mode:'open',minLevel:10};
 const html=familyShareCard(m,outsider,now,live);
 assert.match(html,/<span>9 \/ 10 farmers<\/span>/);assert.match(html,/<span>Level 4<\/span>/);assert.match(html,/title="Family level 4">4<\/b>/);
 assert.match(html,/<button type="button" class="primary-button chat-share-button" data-family-join="fam-1">Join<\/button><\/li>$/);
 // Its own family sees View; closed now: View for everyone; a minimum level the reader has not reached: View.
 assert.match(familyShareCard(m,{...outsider,familyId:'fam-1'},now,live),/data-family-view="fam-1">View</);
 assert.match(familyShareCard(m,outsider,now,{...live,mode:'closed'}),/data-family-view/);
 assert.match(familyShareCard(m,outsider,now,{...live,minLevel:30}),/<span>From level 30<\/span>.*data-family-view/s);
 // A new name or emblem shows too; the card's own family id is never taken from the answer.
 const renamed=familyShareCard(m,outsider,now,{...live,name:'Clover Hill',emblem:'1',family:'other'});
 assert.match(renamed,/chat-share-name" translate="no">Clover Hill</);assert.match(renamed,/data-family-join="fam-1"/);
 assert.doesNotMatch(html,/ · /);
});

test('a family that is gone: its card stays, quiet, "This family is no longer around." and no button',()=>{
 const html=familyShareCard(shared(),outsider,now,{family:'fam-1',gone:true});
 assert.match(html,/^<li class="chat-request chat-family-share is-gone" data-id="c1">/);
 assert.match(html,/chat-share-name" translate="no">Meadow Friends<\/p><small class="chat-request-status">This family is no longer around\.<\/small>/);
 assert.doesNotMatch(html,/<button|data-family-join|data-family-view|farmers|family-level-badge/);
 assert.match(read('public/chat.css'),/\.chat-request\.chat-family-share\.is-gone\{border-color:#ddd5c5;background:#f3efe6\}/);
});

// --- Asking: batched, rarely, only while looking ------------------------------------------------------------------------------------

test('familyCardIds: the cards on screen, newest first, each family once, not a blocked farmer\'s, at most 20',()=>{
 const card=(id,family,sender='lea')=>({id,kind:'family_share',sender,meta:{family}});
 const list=[card('a','f1'),{id:'b',kind:'message',sender:'x',meta:null},card('c','f2','eve'),card('d','f1'),card('e','f3'),{id:'f',kind:'family_share',sender:'lea',meta:null}];
 assert.deepEqual(familyCardIds(list),['f1','f2','f3']);
 assert.deepEqual(familyCardIds(list,new Set(['eve'])),['f1','f3']);
 assert.equal(familyCardIds(Array.from({length:40},(_,i)=>card(`x${i}`,`f${i}`))).length,20);
 assert.deepEqual(familyCardIds(null),[]);
});

function harness({fail=null}={}){
 let t=now;const asked=[];let changes=0;
 const live=createFamilyLive({clock:()=>t,onChange:()=>changes++,request:async ids=>{asked.push(ids);if(fail)throw fail;return {familyCards:{cards:ids.map(id=>({family:id,name:id,emblem:'1',level:1,members:asked.length,max:10,mode:'open',minLevel:10})),viewer:{familyId:null,blocked:null}}};}});
 return {live,asked,step:ms=>{t+=ms;},get changes(){return changes;},set fail(e){fail=e;}};
}

test('every card on screen in one request; then at most once a minute while the chat stays open',async()=>{
 const h=harness();
 assert.equal(await h.live.refresh(['f1','f2','f3'],{reason:'open'}),true);
 assert.deepEqual(h.asked,[['f1','f2','f3']],'one request for all of them');
 assert.equal(h.live.card('f2').members,1);assert.deepEqual(h.live.viewer,{familyId:null,blocked:null});assert.equal(h.changes,1);
 h.step(15000);assert.equal(await h.live.refresh(['f1','f2','f3']),false,'not before the minute');
 h.step(FAMILY_LIVE_EVERY-15000);assert.equal(await h.live.refresh(['f1','f2','f3']),true,'a minute later');
 assert.equal(h.asked.length,2);assert.equal(h.live.card('f1').members,2);
 // The chat opened again (or Global chosen again) within 10 seconds: nothing; after that: yes.
 h.step(5000);assert.equal(await h.live.refresh(['f1'],{reason:'open'}),false);
 h.step(FAMILY_LIVE_SOON);assert.equal(await h.live.refresh(['f1'],{reason:'open'}),true);
 // A card not seen yet (a new share, Load earlier messages): within 10 seconds, with the others.
 h.step(FAMILY_LIVE_SOON);assert.equal(await h.live.refresh(['f4','f1']),true);assert.deepEqual(h.asked.at(-1),['f4','f1']);
 assert.equal(await h.live.refresh([]),false,'no cards, no request');
 assert.equal(h.asked.length,4);
});

test('a join, leave or removal of the farmer\'s own: asked again at once; nothing new, nothing drawn again',async()=>{
 const h=harness();
 await h.live.refresh(['f1'],{reason:'open'});
 h.step(1000);assert.equal(await h.live.refresh(['f1'],{reason:'open'}),false);
 h.live.changed();assert.equal(h.live.viewer,null,'who you are to the families is unknown until the answer');
 assert.equal(await h.live.refresh(['f1'],{reason:'changed'}),true);assert.equal(h.asked.length,2);
 // The same answer twice draws nothing again.
 const quiet=createFamilyLive({clock:()=>now,request:async()=>({familyCards:{cards:[{family:'f1',members:3}],viewer:null}}),onChange:()=>{quiet.n=(quiet.n??0)+1;}});
 await quiet.refresh(['f1'],{reason:'changed'});await quiet.refresh(['f1'],{reason:'changed'});assert.equal(quiet.n,1);
 // A change while a request is on its way is asked for right after it, once.
 let release;const asked=[];
 const slow=createFamilyLive({clock:()=>now,request:ids=>{asked.push(ids);return new Promise(r=>{release=()=>r({familyCards:{cards:[],viewer:null}});});}});
 const first=slow.refresh(['f1'],{reason:'open'});assert.equal(await slow.refresh(['f1'],{reason:'changed'}),false);assert.equal(await slow.refresh(['f1']),false);
 release();await first;await new Promise(r=>setTimeout(r,0));assert.equal(asked.length,2);release();
});

test('fallback: no answer keeps what the card was shared with; an older farm-api (400) is asked again only after 10 minutes',async()=>{
 const h=harness({fail:Object.assign(new Error('Unknown request.'),{status:400})});
 assert.equal(await h.live.refresh(['f1'],{reason:'open'}),false);
 assert.equal(h.live.card('f1'),null,'the card shows its meta');assert.equal(h.live.viewer,null);
 const m=shared();assert.match(familyShareCard(m,outsider,now,h.live.card('f1')),/<span>10 \/ 10 farmers<\/span>/);
 h.step(FAMILY_LIVE_EVERY);assert.equal(await h.live.refresh(['f1']),false);
 h.step(FAMILY_LIVE_OLD_API-FAMILY_LIVE_EVERY);h.fail=null;assert.equal(await h.live.refresh(['f1']),true,'after 10 minutes, once farm-api knows it');
 assert.equal(h.asked.length,2);
 // Any other failure: a minute; what was live stays live.
 h.fail=new Error('network');h.step(FAMILY_LIVE_EVERY);assert.equal(await h.live.refresh(['f1']),false);
 assert.equal(h.live.card('f1').members,2,'the last answer stays');
 h.step(30000);h.fail=null;assert.equal(await h.live.refresh(['f1'],{reason:'open'}),false,'not within the minute after a failure');
 h.step(30000);assert.equal(await h.live.refresh(['f1']),true);
});

test('the chat asks only while it is open on Global with cards, in view; at open, a new card, every minute and after your own family action',()=>{
 const ui=read('src/chat-ui.js'),family=read('public/family-ui.js');
 assert.ok(ui.includes("const familyLive=createFamilyLive({request:ids=>bridge.request({operation:'family_cards',familyIds:ids}),onChange:()=>{if(dialog.open&&!disposed&&tab==='global')paint();}});"));
 assert.ok(ui.includes("if(disposed||!dialog.open||doc.hidden||tab!=='global'||busy)return;"),'never while the chat is closed or the tab is hidden');
 assert.ok(ui.includes("const ids=familyCardIds(messages,blocked());if(ids.length)void familyLive.refresh(ids,{reason});"));
 assert.match(ui,/markRead\(name\);void freshFaces\(messages\.map\(m=>m\.sender\),Date\.now\(\)-facesAt>60000\);freshFamilies\('open'\);/,'when Global opens');
 assert.match(ui,/if\(m\.kind==='family_share'\)freshFamilies\('open'\);/,'a new card');
 assert.match(ui,/if\(\(m\.kind==='join'\|\|m\.kind==='kick'\)&&m\.channel===overview\.family\?\.channel\)\{familyLive\.changed\(\);freshFamilies\('changed'\);\}/,'your family\'s own join and removal cards');
 assert.match(ui,/const familyTimer=setInterval\(\(\)=>freshFamilies\(\),5000\);/);assert.match(ui,/clearInterval\(familyTimer\);/);
 assert.match(ui,/if\(!doc\.hidden\)freshFamilies\(\);/,'back in view');
 assert.match(ui,/win\.addEventListener\?\.\('harvest-family-changed',\(\)=>\{familyLive\.changed\(\);freshFamilies\('changed'\);\}\);/);
 assert.match(family,/const familyChanged=\(\)=>\{try\{window\.dispatchEvent\(new CustomEvent\('harvest-family-changed'\)\);\}catch\{\}\};/);
 assert.match(family,/if\(result\.completed\)dialog\.classList\.add\('family-celebrate'\);done=true;familyChanged\(\);\}/,'every family action that went through');
 assert.match(family,/notify\(result\.message,\{names:namesIn\(view\)\}\);familyChanged\(\);return \{ok:true\};/,'Join from a card');
});

// --- Once a day (supabase/family-share-24h.sql) -------------------------------------------------------------------------------------

test('family-share-24h.sql: generated, guarded on the live body, the same function with a day, the grant kept, checked afterwards',()=>{
 const sql=read('supabase/family-share-24h.sql');
 assert.equal(sql,familyShareDaySql(),'run node scripts/family-share-24h-sql.mjs');
 assert.equal(FAMILY_SHARE_GAP_MS,86400000);
 assert.equal(HOUR_MD5,'ac05b2645eb31dde092059a957255205','the live body, read 20 Oct 2026');
 assert.match(sql,/\nbegin;\nset local lock_timeout='5s';\n/);assert.match(sql,/\ncommit;\n/);
 // The guard: the hour body, or this day body already (a second run).
 assert.ok(sql.includes(`if have not in ('${HOUR_MD5}','${DAY_MD5}') then`));
 assert.match(sql,/if have is null then raise exception/);
 // Only the three parts change.
 assert.equal(DAY_CHANGES.length,3);
 let back=DAY_BODY;for(const [from,to] of DAY_CHANGES){assert.equal(DAY_BODY.split(to).length,2,to);back=back.replace(to,from);}
 assert.equal(back,SHARE_BODY,'everything else word for word');
 assert.ok(DAY_BODY.includes('if f.shared_at is not null and f.shared_at>now_ms-86400000 then'));
 assert.ok(DAY_BODY.includes("raise exception 'Your family was shared in the chat less than a day ago.' using errcode='54000', detail=f.shared_at::text;"));
 assert.doesNotMatch(DAY_BODY,/less than an hour|now_ms-3600000|Once an hour/);
 assert.ok(sql.includes(`returns jsonb language plpgsql set search_path to '' as $function$${DAY_BODY}$function$;`));
 assert.match(sql,/revoke all on function public\.harvest_family_share\(uuid,uuid,integer\) from public, anon, authenticated;\ngrant execute on function public\.harvest_family_share\(uuid,uuid,integer\) to service_role;/);
 assert.ok(sql.includes(`is distinct from '${DAY_MD5}' then`));
 assert.match(sql,/pr\.proacl::text is distinct from '\{postgres=X\/postgres,service_role=X\/postgres\}'/);
 // It writes no table: only the function.
 const code=sql.replace(/^--.*$/gm,'').replace(/\$function\$[\s\S]*?\$function\$/,'');
 assert.doesNotMatch(code,/\b(insert into|update public|delete from|alter table|drop )/);
 // No alias in a DO block is also one of its variables (a PL/pgSQL name clash).
 for(const block of code.match(/do \$(\w+)\$[\s\S]*?end \$\1\$;/g)){
  const vars=[...(/declare([^;]*(?:;[^;]*)*?)\nbegin/.exec(block)?.[1]??'').matchAll(/(\w+) [a-z]+;/g)].map(m=>m[1]);
  const aliases=[...block.matchAll(/from [\w.]+ (\w+)/g)].map(m=>m[1]);
  for(const a of aliases)assert.ok(!vars.includes(a),`${a} in ${block.slice(0,20)}`);
 }
});
