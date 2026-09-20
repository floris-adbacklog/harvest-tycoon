import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,xpForLevel,FAMILY_MIN_LEVEL,FAMILY_INVITATION_LIFETIME,FAMILY_CONFIG,emptyFamilyContext,familyMutate,familyPublicView,DAY_MS} from '../game/farm-state.js';
import {familyChanges,handleFamily} from '../supabase/functions/farm-api/family-service.js';
import {renderFamilyInvitation,renderSentInvitations} from '../public/family-invitations-ui.js';
const now=Date.UTC(2026,8,20,12);
const farm=()=>{const s=createFarm(now);s.xp=xpForLevel(FAMILY_MIN_LEVEL);return normalizeFarm(s,now);};
const run=(c,p,a,t=now)=>familyMutate(c,farm(),p,a,t);
function fixture(){let c=run(emptyFamilyContext(),'a',{type:'family_create',name:'Apple Team',emblem:'0'}).context;c=run(c,'b',{type:'family_create',name:'Berry Team',emblem:'1'}).context;c.players=[{player_id:'a',username:'Alice',level:10},{player_id:'b',username:'Bob',level:10},{player_id:'r',username:'Robin',level:10}];return c;}
const invite=(c,p='a',recipient='r',t=now)=>run(c,p,{type:'family_invite',playerId:recipient},t);
const pending=c=>c.invitations.find(i=>i.recipient_id==='r'&&i.status==='pending');
test('one recipient has at most one invitation across families; sending does not join or reward them',()=>{
 const c=fixture(),before=structuredClone(c),sent=invite(c);assert.equal(sent.failed,false);assert.deepEqual(c,before);assert.equal(sent.context.members.length,2);
 const i=pending(sent.context);assert.equal(i.expires_at,now+FAMILY_INVITATION_LIFETIME);
 const second=invite(sent.context,'b');assert.equal(second.failed,true);assert.match(second.result.error,/already has a pending/);assert.equal(second.context.invitations.filter(i=>i.status==='pending').length,1);
 assert.equal(invite(sent.context).failed,true);
});
test('accept joins the correct private family once and consumes the invitation',()=>{
 const c=invite(fixture()).context,i=pending(c);const r=run(c,'r',{type:'family_accept_invite',invitationId:i.id});assert.equal(r.failed,false);
 assert.equal(r.context.members.find(m=>m.player_id==='r').family_id,i.family_id);assert.equal(r.context.invitations[0].status,'accepted');
 assert.equal(run(r.context,'r',{type:'family_accept_invite',invitationId:i.id}).failed,true);
});
test('only the recipient can accept or decline; only that family leader can cancel',()=>{
 const c=invite(fixture()).context,i=pending(c);
 assert.equal(run(c,'stranger',{type:'family_accept_invite',invitationId:i.id}).failed,true);
 assert.throws(()=>run(c,'stranger',{type:'family_decline_invite',invitationId:i.id}),/no longer/);
 assert.throws(()=>run(c,'b',{type:'family_cancel_invite',invitationId:i.id}),/no longer/);
 assert.equal(run(c,'a',{type:'family_cancel_invite',invitationId:i.id}).context.invitations[0].status,'cancelled');
});
test('declining frees the recipient for another family without a join cooldown',()=>{
 let c=invite(fixture()).context;c=run(c,'r',{type:'family_decline_invite',invitationId:pending(c).id}).context;
 assert.equal(c.invitations[0].status,'declined');assert.equal(c.members.some(m=>m.player_id==='r'),false);assert.equal(invite(c,'b').failed,false);
});
test('expired invitations are removed from the active inbox and can be replaced',()=>{
 const c=invite(fixture()).context,i=pending(c),later=now+FAMILY_INVITATION_LIFETIME;
 assert.equal(familyPublicView(c,'r',farm(),later).invitation,null);
 const accepted=run(c,'r',{type:'family_accept_invite',invitationId:i.id},later);assert.equal(accepted.failed,true);assert.equal(accepted.context.invitations[0].status,'expired');
 const next=invite(c,'b','r',later);assert.equal(next.failed,false);assert.equal(next.context.invitations.filter(i=>i.status==='pending').length,1);assert.equal(next.context.invitations[0].status,'expired');
});
test('level, capacity, membership, self and cooldown checks reject unavailable recipients',()=>{
 let c=fixture();c.players.find(p=>p.player_id==='r').level=9;assert.match(invite(c).result.error,/level 10/);
 c=fixture();assert.match(invite(c,'a','a').result.error,/another/);assert.match(invite(c,'a','b').result.error,/already belongs/);assert.match(invite(c,'a','missing').result.error,/another/);
 c=fixture();c.members.push({player_id:'r',family_id:null,left_at:now-1,cooldown_until:now+1000});assert.match(invite(c).result.error,/cooldown/);
 c=fixture();const id=c.families[0].id;for(let j=0;j<5;j++)c.members.push({player_id:`f${j}`,family_id:id,left_at:null,role:'member'});assert.match(invite(c).result.error,/full/);
});
test('accept rechecks capacity and cooldown without consuming a still-valid invitation',()=>{
 let c=invite(fixture()).context,i=pending(c);for(let j=0;j<5;j++)c.members.push({player_id:`f${j}`,family_id:i.family_id,left_at:null,role:'member'});
 let r=run(c,'r',{type:'family_accept_invite',invitationId:i.id});assert.equal(r.failed,true);assert.match(r.result.error,/full/);assert.equal(pending(r.context).id,i.id);
 c=invite(fixture()).context;i=pending(c);c.members.push({player_id:'r',family_id:null,left_at:now-1,cooldown_until:now+1000});r=run(c,'r',{type:'family_accept_invite',invitationId:i.id});assert.match(r.result.error,/join again/);
});
test('joining or creating another family clears the pending invitation; dissolved families cancel theirs',()=>{
 let c=invite(fixture()).context;c=run(c,'r',{type:'family_create',name:'New Place',emblem:'0'}).context;assert.equal(c.invitations[0].status,'cancelled');
 c=invite(fixture()).context;c=run(c,'a',{type:'family_leave'}).context;assert.equal(c.invitations[0].status,'cancelled');assert.equal(familyPublicView(c,'r',farm(),now).invitation,null);
});
test('legacy codes cannot join private families and are absent from the public view',()=>{
 const c=fixture();const r=run(c,'r',{type:'family_join',code:c.families[0].invite_code});assert.equal(r.failed,true);assert.match(r.result.error,/replaced/);assert.ok(!JSON.stringify(familyPublicView(c,'a',farm(),now)).includes(c.families[0].invite_code));
 assert.throws(()=>run(c,'a',{type:'family_code'}),/valid family action/);
});
test('public inbox shows only the recipient invitation, and sent invitations only to the leader',()=>{
 const c=invite(fixture()).context;const inbox=familyPublicView(c,'r',farm(),now);assert.equal(inbox.invitation.family.name,'Apple Team');assert.equal(inbox.invitation.invitedBy,'Alice');assert.equal(inbox.invitation.canAccept,true);
 assert.equal(familyPublicView(c,'b',farm(),now).invitation,null);assert.equal(familyPublicView(c,'b',farm(),now).sentInvitations.length,0);
 assert.equal(familyPublicView(c,'a',farm(),now).sentInvitations[0].username,'Robin');
 const html=renderFamilyInvitation(inbox,now,()=>'<em>Emblem</em>',(type,label)=>`<button>${label}</button>`);assert.match(html,/Accept invitation/);assert.match(html,/Decline/);assert.match(html,/Apple Team/);
 const sent=renderSentInvitations(familyPublicView(c,'a',farm(),now),now,()=>'<button>Cancel</button>');assert.match(sent,/Robin/);assert.match(sent,/Cancel/);
});
test('invitations are part of the same revision-checked family transaction',()=>{
 const c=fixture(),next=invite(c).context,changes=familyChanges(c,next);assert.equal(changes.invitations.length,1);assert.equal(changes.invitations[0].status,'pending');assert.ok(!changes.members);
});
test('invite attempts share the server hourly limit, including failed attempts',()=>{
 let c=fixture();for(let n=1;n<FAMILY_CONFIG.ATTEMPTS_PER_HOUR;n++)c=invite(c,'a','missing').context;
 assert.match(invite(c).result.error,/Too many/);
});
test('inviting through the service resolves the target by stable player ID before mutation',async()=>{
 const target='11111111-1111-4111-8111-111111111111';const c=fixture();c.now=now;let writes=0;
 const admin={from(table){assert.equal(table,'player_stats');return {select(fields){assert.equal(fields,'player_id,username,level');return this;},eq(key,value){assert.equal(key,'player_id');assert.equal(value,target);return this;},async maybeSingle(){return {data:{player_id:target,username:'Verified Robin',level:10}};}};},async rpc(name,args){if(name==='harvest_family_context')return {data:structuredClone(c)};assert.equal(name,'harvest_family_commit');assert.equal(args.p_changes.invitations[0].recipient_id,target);writes++;return {data:true};}};
 const result=await handleFamily({admin,body:{operation:'action',requestId:'request',action:{type:'family_invite',playerId:target,username:'Forged name'}},row:{revision:1,receipts:[]},state:farm(),player:'a',username:'Alice'});
 assert.equal(result.status,200);assert.equal(writes,1);assert.match(result.data.result.message,/Verified Robin/);
});
