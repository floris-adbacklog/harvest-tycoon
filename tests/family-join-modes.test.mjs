import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_MIN_LEVEL,FAMILY_JOIN_MODES,FAMILY_REQUEST_LIFETIME,familyJoinMode,emptyFamilyContext,familyMutate,familyPublicView,createFarm,normalizeFarm,xpForLevel} from '../public/farm-state.js';
import {familyChanges} from '../supabase/functions/farm-api/family-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.parse('2026-09-26T12:00:00Z');
const farm=()=>{const s=createFarm(now);s.xp=xpForLevel(FAMILY_MIN_LEVEL);return normalizeFarm(s,now);};
let ids=0;const uuid=()=>`id-${++ids}`;
const run=(c,p,a,t=now)=>familyMutate(c,farm(),p,a,t,{uuid});
const withPlayers=(c,...names)=>{for(const p of names)if(!c.players.some(x=>x.player_id===p))c.players.push({player_id:p,username:p,level:FAMILY_MIN_LEVEL});return c;};
function family(mode){
 let c=withPlayers(emptyFamilyContext(),'lea','bo','cas');
 c=run(c,'lea',{type:'family_create',name:'Meadow Friends',emblem:'0'}).context;
 if(mode)c=run(c,'lea',{type:'family_join_mode',mode}).context;
 return c;
}
const fid=c=>c.families[0].id;

test('four ways in: open, request to join, invite only, closed; a new family is invite-only and an older one reads its is_open',()=>{
 assert.deepEqual(Object.keys(FAMILY_JOIN_MODES),['open','request','invite','closed']);
 assert.equal(familyJoinMode(family().families[0]),'invite');
 assert.equal(familyJoinMode({is_open:true}),'open');assert.equal(familyJoinMode({is_open:false}),'invite');assert.equal(familyJoinMode({is_open:true,join_mode:'closed'}),'closed');
 const c=family('request');assert.equal(c.families[0].join_mode,'request');assert.equal(c.families[0].is_open,false);
 assert.equal(family('open').families[0].is_open,true,'an older farm-api still sees an open family as open');
 assert.throws(()=>run(family(),'bo',{type:'family_join_mode',mode:'open'}),/Join a family first/);
 assert.throws(()=>run(family(),'lea',{type:'family_join_mode',mode:'everyone'}),/Choose who can join/);
});

test('open: join at once; request: ask, then the leader accepts; invite only: neither; closed: not even an invitation',()=>{
 const open=family('open');assert.equal(run(open,'bo',{type:'family_join',familyId:fid(open)}).failed,false);
 const req=family('request');
 assert.ok(run(req,'bo',{type:'family_join',familyId:fid(req)}).failed,'no joining straight away');
 const asked=run(req,'bo',{type:'family_request',familyId:fid(req)});assert.equal(asked.failed,false);assert.match(asked.result.message,/within 3 days/);
 const r=asked.context.requests[0];assert.deepEqual({status:r.status,expires:r.expires_at-now},{status:'pending',expires:FAMILY_REQUEST_LIFETIME});
 const accepted=run(asked.context,'lea',{type:'family_request_accept',requestId:r.id});
 assert.equal(accepted.context.members.find(m=>m.player_id==='bo').family_id,fid(req));assert.equal(accepted.context.requests[0].status,'accepted');assert.equal(accepted.result.accepted,'bo');
 const inv=family('invite');assert.ok(run(inv,'bo',{type:'family_request',familyId:fid(inv)}).failed);assert.ok(run(inv,'bo',{type:'family_join',familyId:fid(inv)}).failed);
 assert.equal(run(inv,'lea',{type:'family_invite',playerId:'bo'}).failed,false,'invite-only still invites');
 const closed=family('closed');assert.ok(run(closed,'lea',{type:'family_invite',playerId:'bo'}).failed,'closed: no invitations either');
 const invited=run(family('invite'),'lea',{type:'family_invite',playerId:'bo'}).context,shut=run(invited,'lea',{type:'family_join_mode',mode:'closed'}).context;
 assert.match(run(shut,'bo',{type:'family_accept_invite',invitationId:shut.invitations[0].id}).result.error,/closed/,'an invitation sent before it closed cannot be used');
});

test('requests: one at a time, the farmer can cancel, the leader can decline, and they end after 3 days or when the family stops taking them',()=>{
 let c=family('request');c=withPlayers(c,'dee');c=run(c,'dee',{type:'family_create',name:'Other Farm',emblem:'0'}).context;c=run(c,'dee',{type:'family_join_mode',mode:'request'}).context;
 const [first,second]=c.families;
 c=run(c,'bo',{type:'family_request',familyId:first.id}).context;
 assert.match(run(c,'bo',{type:'family_request',familyId:second.id}).result.error,/already asked to join Meadow Friends/);
 assert.match(run(c,'bo',{type:'family_request',familyId:first.id}).result.error,/already asked to join this family/);
 assert.throws(()=>run(c,'cas',{type:'family_request_cancel',requestId:c.requests[0].id}),/no longer open/,'only your own');
 const cancelled=run(c,'bo',{type:'family_request_cancel',requestId:c.requests[0].id}).context;assert.equal(cancelled.requests[0].status,'cancelled');
 assert.throws(()=>run(c,'bo',{type:'family_request_accept',requestId:c.requests[0].id}),/Join a family first/,'only a leader answers');
 const declined=run(c,'lea',{type:'family_request_decline',requestId:c.requests[0].id});assert.equal(declined.context.requests[0].status,'declined');assert.equal(declined.result.declined,'bo');
 assert.equal(run(c,'lea',{type:'family_read'},now+FAMILY_REQUEST_LIFETIME).context.requests[0].status,'expired');
 assert.equal(run(c,'lea',{type:'family_join_mode',mode:'invite'}).context.requests[0].status,'cancelled','no longer taking requests');
 assert.equal(run(c,'bo',{type:'family_create',name:'Bo Farm',emblem:'0'}).context.requests.length,1);
 const changes=familyChanges(c,run(c,'lea',{type:'family_request_decline',requestId:c.requests[0].id}).context);assert.equal(changes.requests[0].status,'declined','the server writes requests like invitations');
});

test('the Families list: every family with who can join, open ones first; your own request; a leader sees who is asking',()=>{
 let c=family('request');for(const [p,name,mode] of [['o1','Open Acres','open'],['o2','Quiet Barn','closed'],['o3','Invite Grove','invite']]){c=withPlayers(c,p);c=run(c,p,{type:'family_create',name,emblem:'0'}).context;c=run(c,p,{type:'family_join_mode',mode}).context;}
 c=run(c,'bo',{type:'family_request',familyId:c.families[0].id}).context;
 const bo=familyPublicView(c,'bo',farm(),now);
 assert.deepEqual(bo.families.map(f=>[f.name,f.mode]),[['Open Acres','open'],['Meadow Friends','request'],['Invite Grove','invite'],['Quiet Barn','closed']]);
 assert.equal(bo.myRequest.family.name,'Meadow Friends');assert.ok(bo.openFamilies.every(f=>f.mode==='open'),'older games keep their open list');
 const lea=familyPublicView(c,'lea',farm(),now);assert.deepEqual(lea.joinRequests.map(r=>r.username),['bo']);assert.equal(lea.families.length,0,'in a family: no list');assert.equal(lea.family.mode,'request');
 const ui=read('public/family-ui.js');
 assert.match(ui,/f\.mode==='request'\?\(mine\?\.family\.id===f\.id\?actionButton\('family_request_cancel','Cancel request'/);
 assert.match(ui,/<select data-family-mode aria-label="Who can join"/);assert.match(ui,/act\(\{type:'family_join_mode',mode:event\.currentTarget\.value\}\)/);
 assert.match(ui,/actionButton\('family_request_accept','Accept'/);assert.match(ui,/offer\(player\)\{if\(!view\?\.family\?\.leader\|\|view\.family\.mode==='closed'\|\|/,'a closed family shows no invite button on profiles');assert.match(ui,/view\?\.joinRequests\?\.length\|\|/,'the Family dot lights up for a leader with requests');
});

test('the database: join_mode beside is_open, a requests table only the server reaches, loaded and saved with the family',()=>{
 const sql=read('supabase/family-join-requests.sql');
 assert.match(sql,/add column if not exists join_mode text check \(join_mode is null or join_mode in \('open','request','invite','closed'\)\)/);
 assert.match(sql,/update public\.families set join_mode=case when is_open then 'open' else 'invite' end where join_mode is null;/,'the open families stay open');
 assert.match(sql,/revoke all on public\.family_requests from anon, authenticated;/);
 assert.match(sql,/'requests',coalesce\(\(select jsonb_agg\(to_jsonb\(t\)\) from public\.family_requests t where t\.status='pending'\)/);
 assert.match(sql,/deleted_at=excluded\.deleted_at,join_mode=excluded\.join_mode;/);
 assert.match(sql,/having count\(\*\)>1\) then raise exception 'One join request at a time'/);
 const service=read('supabase/functions/farm-api/family-service.js');
 assert.match(service,/requests:\['id'\]/);assert.match(service,/kind:'family'/,'the leader and the farmer hear of it in Notifications');
});
