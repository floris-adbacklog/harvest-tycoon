import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_MIN_LEVEL,FAMILY_CONFIG,FAMILY_IDLE_DAYS,FAMILY_IDLE_DEFAULT,familyIdleDays,familyDaysAway,familyIdleLeaves,familyRejoinOffer,emptyFamilyContext,familyMutate,familyPublicView,createFarm,normalizeFarm,xpForLevel,DAY_MS} from '../game/farm-state.js';
import {familyChanges,familyRejoinRead} from '../supabase/functions/farm-api/family-service.js';
import {welcomeFamilyRow} from '../public/welcome-ui.js';
import {codeTranslator,createTranslator} from '../public/i18n.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Away too long (17 Oct 2026, the owner): a member who has not played for the family's number of days (7, 14, 30, 60 or 90; 30 for
// every family) leaves it automatically, never the leader; Welcome back and the Family window offer "Join again".
const now=Date.parse('2026-10-17T12:00:00Z');
const farm=()=>{const s=createFarm(now);s.xp=xpForLevel(FAMILY_MIN_LEVEL+5);return normalizeFarm(s,now);};
const run=(c,p,a,t=now)=>familyMutate(c,farm(),p,a,t);
const ago=days=>new Date(now-days*DAY_MS).toISOString();
function family(names=['lea','bo','cas','dee','eli'],name='Meadow Friends'){
 let c=run(emptyFamilyContext(),names[0],{type:'family_create',name,emblem:'7'},now-60*DAY_MS).context;
 for(const p of names)if(!c.players.some(x=>x.player_id===p))c.players.push({player_id:p,username:p,level:20,last_active_at:new Date(now).toISOString()});
 for(const p of names.slice(1))c=run(c,p,{type:'family_join',familyId:c.families[0].id},now-60*DAY_MS).context;
 return c;
}
const memberOf=(c,p)=>c.members.find(m=>m.player_id===p);
const played=(c,p,iso)=>{c.players.find(x=>x.player_id===p).last_active_at=iso;return c;};
// What harvest_family_idle_leave does to a member row (the test below checks the SQL sets exactly these columns).
function idleLeave(c,t=now){
 const c2=structuredClone(c),gone=[];
 for(const m of c2.members){
  const f=c2.families.find(x=>x.id===m.family_id&&!x.deleted_at),p=c2.players.find(x=>x.player_id===m.player_id);
  if(!f||!familyIdleLeaves(m,f,p?.last_active_at,t))continue;
  Object.assign(m,{family_id:null,left_at:t,role:'member',left_reason:'idle',left_family:f.id,left_days:familyDaysAway(p?.last_active_at,m.joined_at,t)});gone.push(m.player_id);
 }
 return {c:c2,gone};
}

test('the choice: 7, 14, 30, 60 or 90 days, 30 for every family, new and old; the leader or a co-leader picks it',()=>{
 assert.deepEqual(FAMILY_IDLE_DAYS,[7,14,30,60,90]);assert.equal(FAMILY_IDLE_DEFAULT,30);
 let c=family();assert.equal(c.families[0].idle_days,30,'a new family starts at 30');
 assert.equal(familyIdleDays({}),30,'a family saved before the choice existed');assert.equal(familyIdleDays({idle_days:45}),30);assert.equal(familyIdleDays({idle_days:60}),60);
 c=run(c,'lea',{type:'family_rank',memberId:memberOf(c,'bo').id,rank:'coleader'}).context;
 c=run(c,'lea',{type:'family_rank',memberId:memberOf(c,'cas').id,rank:'honorary'}).context;
 const set=run(c,'bo',{type:'family_idle_days',days:60});assert.equal(set.context.families[0].idle_days,60,'a co-leader may');
 assert.match(set.result.message,/Members who don't play for 60 days now leave the family automatically\./);
 assert.deepEqual(familyChanges(c,set.context).families.map(f=>f.idle_days),[60],'saved with the family (harvest_family_commit: idle_days=excluded.idle_days)');
 assert.equal(run(c,'lea',{type:'family_idle_days',days:7}).context.families[0].idle_days,7,'the leader may');
 assert.throws(()=>run(c,'cas',{type:'family_idle_days',days:7}),/Only the family leader or a co-leader/,'an honorary member may not');
 assert.throws(()=>run(c,'dee',{type:'family_idle_days',days:7}),/Only the family leader or a co-leader/,'a member may not');
 for(const days of [0,1,21,45,365,'x',null,undefined])assert.throws(()=>run(c,'lea',{type:'family_idle_days',days}),/Choose after how many days/,String(days));
 const view=familyPublicView(set.context,'dee',farm(),now);assert.equal(view.family.idleDays,60);
 const old=structuredClone(c);delete old.families[0].idle_days;
 assert.equal(familyPublicView(old,'dee',farm(),now).family.idleDays,null,'before supabase/family-idle-leave.sql has run: no rule shown, as nothing carries it out yet');
});

test('farm-api before the SQL: a new family gets no idle_days and the choice is refused, so nothing shows that is never saved',()=>{
 // What harvest_family_context returns before supabase/family-idle-leave.sql has run: whole family rows without idle_days.
 const old=family();for(const f of old.families)delete f.idle_days;
 const made=run(old,'zed',{type:'family_create',name:'New Farm',emblem:'0'});assert.equal(made.failed,false);
 const fresh=made.context.families.find(f=>f.name==='New Farm');assert.ok(!Object.hasOwn(fresh,'idle_days'),'not in memory either');
 assert.equal(familyPublicView(made.context,'zed',farm(),now).family.idleDays,null,'the reply shows no rule and no choice');
 assert.ok(!familyChanges(old,made.context).families.some(f=>Object.hasOwn(f,'idle_days')),'and sends none');
 assert.throws(()=>run(made.context,'zed',{type:'family_idle_days',days:7}),/Choose after how many days/,'the new family\'s leader');
 assert.throws(()=>run(old,'lea',{type:'family_idle_days',days:30}),/Choose after how many days/,'an old family\'s leader');
 // After the SQL every family row has it: a new family gets 30.
 const after=family();assert.equal(run(after,'zed',{type:'family_create',name:'New Farm',emblem:'0'}).context.families.find(f=>f.name==='New Farm').idle_days,30);
 assert.equal(run(emptyFamilyContext(),'zed',{type:'family_create',name:'First Farm',emblem:'0'}).context.families[0].idle_days,30,'the very first family too');
});

test('the rule: at, over and under the days; never the leader; co-leaders and honorary members leave like members',()=>{
 const f={idle_days:30},m=role=>({family_id:'f',left_at:null,role,joined_at:now-90*DAY_MS});
 assert.equal(familyIdleLeaves(m('member'),f,ago(30),now),true,'exactly 30 days');
 assert.equal(familyIdleLeaves(m('member'),f,ago(45),now),true,'over');
 assert.equal(familyIdleLeaves(m('member'),f,new Date(now-30*DAY_MS+1).toISOString(),now),false,'a millisecond under');
 assert.equal(familyIdleLeaves(m('member'),f,ago(29),now),false);
 for(const role of ['coleader','honorary'])assert.equal(familyIdleLeaves(m(role),f,ago(31),now),true,role);
 assert.equal(familyIdleLeaves(m('leader'),f,ago(400),now),false,'never the leader');
 assert.equal(familyIdleLeaves(m('member'),{idle_days:7},ago(7),now),true);assert.equal(familyIdleLeaves(m('member'),{idle_days:90},ago(89),now),false);
 assert.equal(familyIdleLeaves(m('member'),{},ago(30),now),true,'no choice saved: 30');
 assert.equal(familyIdleLeaves({...m('member'),joined_at:now-2*DAY_MS},f,ago(40),now),false,'counted from joining when that is later');
 assert.equal(familyIdleLeaves({...m('member'),joined_at:now-31*DAY_MS},f,null,now),true,'no last played at all: from joining');
 assert.equal(familyIdleLeaves({...m('member'),left_at:now-DAY_MS},f,ago(99),now),false,'only farmers in a family');
 // A family of five: two away long enough, the leader away longest of all.
 let c=family();played(c,'lea',ago(200));played(c,'bo',ago(31));played(c,'cas',ago(30));played(c,'dee',ago(29));played(c,'eli',ago(1));
 c=run(c,'lea',{type:'family_rank',memberId:memberOf(c,'bo').id,rank:'coleader'}).context;played(c,'lea',ago(200));
 const {c:after,gone}=idleLeave(c);assert.deepEqual(gone.sort(),['bo','cas']);
 assert.equal(memberOf(after,'lea').role,'leader');assert.equal(memberOf(after,'lea').family_id,after.families[0].id,'the leader stays, also after 200 days');
 assert.deepEqual({...memberOf(after,'bo'),id:0,joined_at:0},{id:0,player_id:'bo',family_id:null,role:'member',joined_at:0,left_at:now,cooldown_until:null,blocked_family:null,left_reason:'idle',left_family:c.families[0].id,left_days:31});
 const view=familyPublicView(after,'lea',farm(),now);assert.equal(view.members.length,3,'the seats are free');assert.equal(view.family.members,3);
});

test('no wait after leaving for being away: any family at once, and back into the old one whatever its join mode or minimum level',()=>{
 let c=family();played(c,'bo',ago(31));
 c=run(c,'lea',{type:'family_join_mode',mode:'closed'}).context;c=run(c,'lea',{type:'family_min_level',level:100}).context;
 const {c:left}=idleLeave(c),fid=c.families[0].id;
 assert.equal(memberOf(left,'bo').cooldown_until,null);assert.equal(memberOf(left,'bo').blocked_family,null);
 const offer=familyRejoinOffer(left,'bo',now);assert.deepEqual(offer,{familyId:fid,name:'Meadow Friends',emblem:'7',days:31});
 assert.deepEqual(familyPublicView(left,'bo',farm(),now).rejoin,offer,'the Family window offers it too');
 assert.ok(run(left,'bo',{type:'family_join',familyId:fid}).failed,'the closed family takes nobody new by Join');
 const back=run(left,'bo',{type:'family_rejoin',familyId:fid});assert.equal(back.failed,false);assert.equal(back.result.message,'Welcome back to Meadow Friends!');
 const m=memberOf(back.context,'bo');assert.deepEqual([m.family_id,m.role,m.left_at,m.left_reason,m.left_family,m.left_days],[fid,'member',null,null,null,null]);
 assert.equal(familyRejoinOffer(back.context,'bo',now),null,'once in a family, no offer');
 assert.equal(familyPublicView(back.context,'bo',farm(),now).family.id,fid);assert.equal(back.context.families[0].join_mode,'closed','the family itself is unchanged');
 // Any other family at once, too; and then the offer is gone for good, also after leaving that one.
 let d=run(left,'zed',{type:'family_create',name:'Other Farm',emblem:'0'}).context;
 const joined=run(d,'bo',{type:'family_join',familyId:d.families[1].id});assert.equal(joined.failed,false,'no wait');
 assert.equal(familyRejoinOffer(joined.context,'bo',now),null);
 const leftAgain=run(joined.context,'bo',{type:'family_leave'}).context;assert.equal(familyRejoinOffer(leftAgain,'bo',now),null,'a normal leave later never brings it back');
 assert.equal(memberOf(leftAgain,'bo').left_reason,null);
});

test('Join again only while the family is there, has room and has not removed them; only the family they left',()=>{
 let c=family();played(c,'bo',ago(40));const fid=c.families[0].id;
 const {c:left}=idleLeave(c);
 assert.ok(familyRejoinOffer(left,'bo',now));
 // Gone.
 const gone=structuredClone(left);gone.families[0].deleted_at=now;assert.equal(familyRejoinOffer(gone,'bo',now),null);
 // Full: 10 farmers in it.
 let full=structuredClone(left);for(let i=0;i<FAMILY_CONFIG.MAX_MEMBERS-4;i++)full.members.push({id:`x${i}`,player_id:`x${i}`,family_id:fid,role:'member',joined_at:now,left_at:null});
 assert.equal(full.members.filter(m=>m.family_id===fid&&!m.left_at).length,10);assert.equal(familyRejoinOffer(full,'bo',now),null);
 assert.match(run(full,'bo',{type:'family_rejoin',familyId:fid}).result.error,/unavailable or full/);
 // Room again: the offer is back (it lasts until they join a family).
 full.members.pop();assert.ok(familyRejoinOffer(full,'bo',now));
 // Removed by that family (a block still running).
 const blocked=structuredClone(left);Object.assign(memberOf(blocked,'bo'),{blocked_family:fid,cooldown_until:now+DAY_MS});assert.equal(familyRejoinOffer(blocked,'bo',now),null);
 Object.assign(memberOf(blocked,'bo'),{cooldown_until:now-1});assert.ok(familyRejoinOffer(blocked,'bo',now),'a block that ran out is no block');
 // In a family now.
 const inOne=run(left,'bo',{type:'family_create',name:'Bo Farm',emblem:'0'}).context;assert.equal(familyRejoinOffer(inOne,'bo',now),null);
 assert.match(run(inOne,'bo',{type:'family_rejoin',familyId:fid}).result.error,/Leave your current family first/);
 // A normal leave or a removal is no offer; another family's id is refused.
 const normal=run(family(),'bo',{type:'family_leave'}).context;assert.equal(familyRejoinOffer(normal,'bo',now),null);
 assert.match(run(left,'bo',{type:'family_rejoin',familyId:'someone-else'}).result.error,/unavailable or full/);
 assert.match(run(left,'cas',{type:'family_rejoin',familyId:fid}).result.error,/Leave your current family first/);
});

test('"N days away" in the member list: whole days since last played (or joined), nothing on the day itself, the leader too',()=>{
 assert.equal(familyDaysAway(new Date(now-23*3600000).toISOString(),0,now),0);
 assert.equal(familyDaysAway(ago(1),0,now),1);assert.equal(familyDaysAway(ago(5.5),0,now),5);
 assert.equal(familyDaysAway(ago(10),now-2*DAY_MS,now),2,'from joining when that is later');assert.equal(familyDaysAway(null,0,now),0);
 let c=family();played(c,'lea',ago(5));played(c,'bo',ago(1));played(c,'cas',new Date(now-3600000).toISOString());
 const away=Object.fromEntries(familyPublicView(c,'dee',farm(),now).members.map(m=>[m.username,m.daysAway]));
 assert.deepEqual(away,{lea:5,bo:1,cas:0,dee:0,eli:0});
 const ui=read('public/family-ui.js');
 assert.match(ui,/\$\{m\.daysAway>0\?`<span class="family-away">\$\{m\.daysAway===1\?'1 day away':`\$\{m\.daysAway\} days away`\}<\/span>`:''\}/,'1 day away, 5 days away; nothing for today');
 assert.match(ui,/const idleRule=days=>`Members who don't play for \$\{days\} days leave the family automatically\. The leader stays\.`;/);
 assert.match(ui,/view\.family\.idleDays\?`<p class="family-footnote family-idle-rule">\$\{idleRule\(view\.family\.idleDays\)\}<\/p>`:''/,'one line on Members');
 assert.match(ui,/<strong>Away too long<\/strong><p>\$\{idleRule\(f\.idleDays\)\}<\/p><\/div><select data-family-idle-days/,'and in Family settings beside the choice');
 assert.match(ui,/act\(\{type:'family_idle_days',days:Number\(event\.currentTarget\.value\)\}\)/);
 const nl=JSON.parse(read('public/i18n/nl.json'));assert.equal(nl['{0} days away'],'{0} dagen weg');assert.equal(nl['1 day away'],'1 dag weg');
 const catalog=JSON.parse(read('i18n/catalog.json'));
 for(const key of ['1 day away','{0} days away','Away too long','Join again',"Members who don't play for {0} days leave the family automatically. The leader stays.",'You left {0} after {1} days away.','Left the family after {0} days away']){
  assert.ok(key in catalog,key);assert.ok(!key.includes(' · '),'no middle dots');
  for(const code of ['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh'])assert.ok(key in JSON.parse(read(`public/i18n/${code}.json`)),`${code}: ${key}`);
 }
});

test('Welcome back: one line with the family and the days, and Join again; nothing without an offer',async()=>{
 assert.equal(welcomeFamilyRow(null),'');assert.equal(welcomeFamilyRow({}),'');
 const row=welcomeFamilyRow({familyId:'f1',name:'Bees & <Co>',emblem:'7',days:31});
 assert.match(row,/<strong translate="no">You left Bees &amp; &lt;Co&gt; after 31 days away\.<\/strong>/,'the family name as written, never the page\'s translation');assert.match(row,/data-rejoin-family>Join again<\/button>/);
 assert.match(row,/class="family-emblem"/,'the family\'s own emblem');
 const welcome=read('public/welcome-ui.js'),game=read('public/game.js'),api=read('supabase/functions/farm-api/index.ts');
 // 18 Oct 2026: the way to the farm is the second button while today's gift waits to be collected (its Collect is the green one).
 assert.match(welcome,/\$\{family\?\.rejoin\?welcomeFamilyRow\(summary\.family\):''\}<button class="\$\{gift\?\.offer\?'secondary-button':'primary-button'\} welcome-back-go" data-continue>/,'inside the Welcome back card, no pop-up of its own');
 assert.match(welcome,/try\{await family\.rejoin\(summary\.family\.familyId\);row\.classList\.add\('is-collected'\);rejoin\.remove\(\);row\.querySelector\('strong'\)\.textContent=t\('Welcome back to \{0\}!',summary\.family\.name\);\}/);
 assert.match(welcome,/catch\(error\)\{rejoin\.remove\(\);const strong=row\.querySelector\('strong'\);strong\.removeAttribute\('translate'\);strong\.textContent=error\?\.message\|\|'This family is unavailable or full\.';\}/,'the game\'s own English error, translated by the page');
 assert.match(game,/family:\{rejoin:familyId=>runAction\(\{type:'family_rejoin',familyId\}\)\}\}\);/);
 assert.match(api,/const rejoining=welcome&&familyUnlocked\(state\)\?familyRejoinRead\(admin,user\.id\)\.catch\(\(\)=>null\):null;/,'read only when Welcome back shows');
 assert.match(api,/if\(back\?\.offer&&welcome\)Object\.assign\(welcome,\{family:back\.offer\}\);/);
 // farm-api's read: the same rule from the database's small answer; nothing before the SQL has run.
 let c=family();played(c,'bo',ago(31));const {c:left}=idleLeave(c),fid=c.families[0].id;
 const answer={now,families:left.families.filter(f=>f.id===fid),members:left.members.filter(m=>m.player_id==='bo'||m.family_id===fid&&!m.left_at)};
 const read1=await familyRejoinRead({rpc:async name=>{assert.equal(name,'harvest_family_rejoin');return {data:structuredClone(answer)};}},'bo');
 assert.deepEqual(read1,{offer:{familyId:fid,name:'Meadow Friends',emblem:'7',days:31},inFamily:false});
 const inside=await familyRejoinRead({rpc:async()=>({data:{now,families:left.families,members:left.members.filter(m=>m.player_id==='cas'||m.family_id===fid)}})},'cas');
 assert.deepEqual(inside,{offer:null,inFamily:true});
 assert.equal(await familyRejoinRead({rpc:async()=>({error:{code:'PGRST202'}})},'bo'),null,'no such function yet');
});

test('supabase/family-idle-leave.sql: re-runnable, the same rule, a normal leave for the family without a wait, and the live checks kept',()=>{
 const sql=read('supabase/family-idle-leave.sql');
 // Re-runnable: every part checks whether it is done.
 assert.match(sql,/alter table public\.families add column if not exists idle_days integer not null default 30;/);
 assert.match(sql,/alter table public\.families drop constraint if exists families_idle_days_check;\nalter table public\.families add constraint families_idle_days_check check \(idle_days in \(7,14,30,60,90\)\);/);
 assert.deepEqual(sql.match(/idle_days in \(([\d,]+)\)/)[1].split(',').map(Number),FAMILY_IDLE_DAYS,'the same choices as the game');
 for(const col of ['left_reason text','left_family uuid','left_days integer'])assert.match(sql,new RegExp(`alter table public\\.family_members add column if not exists ${col};`));
 assert.match(sql,/drop trigger if exists family_members_back on public\.family_members;\ncreate trigger family_members_back before insert or update on public\.family_members for each row\n when \(new\.family_id is not null and/,'cleared once the farmer is in any family again');
 assert.match(sql,/select cron\.unschedule\('harvest-family-idle-leave'\) where exists\(select 1 from cron\.job where jobname='harvest-family-idle-leave'\);\nselect cron\.schedule\('harvest-family-idle-leave','47 \* \* \* \*','select public\.harvest_family_idle_leave\(\)'\);/,'every hour');
 assert.doesNotMatch(sql.replace(/^--.*$/gm,''),/create table|drop table|drop function|delete from/i);
 // The commit patch: only two places change, each once, and only when not done yet.
 const patch=sql.slice(sql.indexOf('do $patch$'),sql.indexOf('end $patch$;'));
 assert.match(patch,/if position\('idle_days=excluded\.idle_days' in def\)=0 then/);assert.match(patch,/if position\('jsonb_populate_record\(null::public\.families,' in def\)=0 then/);
 assert.match(patch,/if times<>1 then raise exception/);assert.match(patch,/if def=live then return; end if;/);
 for(const check of ['count(*)>10','Invalid family membership','Order overflow','Invalid contribution change','blocked_family=excluded.blocked_family','join_mode=excluded.join_mode'])assert.ok(patch.includes(`position('${check}' in def)=0`),`keeps ${check}`);
 // Played on the live function's own words (read on 17 Oct 2026): once changes it, twice changes nothing more.
 const pairs=[...patch.matchAll(/def:=replace\(def,'((?:[^']|'')*)','((?:[^']|'')*)'\);/g)].map(m=>[m[1].replace(/''/g,"'"),m[2].replace(/''/g,"'")]);assert.equal(pairs.length,2);
 const live=` insert into public.families select * from jsonb_populate_recordset(null::public.families,coalesce(p_changes->'families','[]')) on conflict(id) do update set name=excluded.name,emblem=excluded.emblem,invite_code=excluded.invite_code,is_open=excluded.is_open,created_at=excluded.created_at,renamed_at=excluded.renamed_at,deleted_at=excluded.deleted_at,join_mode=excluded.join_mode,min_level=excluded.min_level;\n insert into public.family_members select * from jsonb_populate_recordset(null::public.family_members,coalesce(p_changes->'members','[]'))`;
 const once=pairs.reduce((d,[from,to])=>d.includes(to)?d:d.replace(from,to),live),twice=pairs.reduce((d,[from,to])=>d.includes(to)?d:d.replace(from,to),once);
 assert.equal(twice,once);
 assert.match(once,/insert into public\.families select \* from jsonb_populate_recordset\(jsonb_populate_record\(null::public\.families,jsonb_build_object\('idle_days',30\)\),coalesce\(p_changes->'families','\[\]'\)\)/,'a family a farm-api from before this makes gets 30');
 assert.match(once,/min_level=excluded\.min_level,idle_days=excluded\.idle_days;/);assert.match(once,/jsonb_populate_recordset\(null::public\.family_members,/,'members are read as before');
 // The leaves: the rule of familyIdleLeaves.
 const job=sql.slice(sql.indexOf('create or replace function public.harvest_family_idle_leave()'),sql.indexOf('revoke all on function public.harvest_family_idle_leave()'));
 assert.match(job,/perform 1 from public\.family_revision where id for update;/,'the family lock first');
 assert.match(job,/where m\.left_at is null and m\.family_id is not null and m\.role<>'leader'/,'never the leader');
 assert.match(job,/join public\.families f on f\.id=m\.family_id and f\.deleted_at is null/);
 assert.match(job,/greatest\(coalesce\(floor\(extract\(epoch from ps\.last_active_at\)\*1000\)::bigint,0\),m\.joined_at\)<=now_ms-f\.idle_days\*86400000::bigint/,'last played or joined, at or over the days');
 const set=job.match(/update public\.family_members m set (.*)\n/)[1].split(',').map(s=>s.split('=')[0]).sort();
 assert.deepEqual(set,['family_id','left_at','left_days','left_family','left_reason','role'],'what idleLeave above does: no cooldown_until, no blocked_family');
 assert.match(job,/set family_id=null,left_at=now_ms,role='member',left_reason='idle',left_family=idle\.family_id,left_days=idle\.days/);
 assert.match(job,/if gone>0 then update public\.family_revision set revision=revision\+1 where id; end if;/);
 assert.doesNotMatch(job,/chat_messages|player_notices|push|net\.http/,'no chat card, no notice, no push');
 assert.match(job,/insert into public\.player_logs\(player_id,category,action,text\)\n select l\.player_id,'social','family_idle_leave',format\('Left the family after %s days away',l\.days\) from left_now l;/,'one line in their own log, without the family name');
 assert.match(read('scripts/i18n-extract.mjs'),/'Left the family after \{0\} days away'\]/,'and that line is translated');
 // Only farm-api and the job.
 assert.match(sql,/revoke all on function public\.harvest_family_rejoin\(uuid\) from public, anon, authenticated;\ngrant execute on function public\.harvest_family_rejoin\(uuid\) to service_role;/);
 assert.match(sql,/revoke all on function public\.harvest_family_idle_leave\(\) from public, anon, authenticated;/);
 assert.doesNotMatch(sql,/raise exception '(?![^']*harvest_family_commit)/,'every stop names the function, so none reaches the players\' catalog');
});

test('a family name in a sentence stays as written and never picks the plural: t() and translate="no" (Welcome back, Join again, the toast)',()=>{
 // The page's translation would translate a name that is also a text ("Cozy") and take a name's digits ("Betty 2026") for the days.
 const lang=code=>JSON.parse(read(`public/i18n/${code}.json`)),nl=codeTranslator(lang('nl'),'nl'),ru=codeTranslator(lang('ru'),'ru'),ar=codeTranslator(lang('ar'),'ar');
 assert.ok('Cozy' in lang('nl'),'a family name that is also a text of the game');
 assert.equal(nl('You left {0} after {1} days away.','Cozy',31),'Je hebt Cozy verlaten na 31 dagen weg.');
 assert.equal(nl('Welcome back to {0}!','Cozy'),'Welkom terug bij Cozy!');
 assert.equal(ru('You left {0} after {1} days away.','Betty 2026',31),'После 31 дня отсутствия ты покинул семью Betty 2026.','31 дня, not the form for 2026');
 assert.equal(ru('You left {0} after {1} days away.','Cozy',7),'После 7 дней отсутствия ты покинул семью Cozy.');
 assert.equal(ar('You left {0} after {1} days away.','Betty 2026',7),'غادرت Betty 2026 بعد غياب 7 أيام.','Arabic: the few form for 7');
 // The log line has no name: the page translates it whole, the days decide the form.
 assert.equal(createTranslator(lang('ru'),'ru').translate('Left the family after 31 days away'),'Покинул семью после 31 дня отсутствия');
 assert.equal(createTranslator(lang('nl'),'nl').translate('Left the family after 31 days away'),'De familie verlaten na 31 dagen weg');
 const ui=read('public/family-ui.js');
 assert.match(ui,/import \{t,ownWords,ownLine,ownText,setOwnText\} from '\.\/i18n\.js';/);
 assert.match(ui,/<strong translate="no">\$\{esc\(t\('You left \{0\} after \{1\} days away\.',r\.name,Number\(r\.days\)\)\)\}<\/strong><span>You can join it again straight away\.<\/span>/);
 assert.match(ui,/notify\(action\.type==='family_rejoin'&&view\?\.family\?\.name\?t\('Welcome back to \{0\}!',view\.family\.name\):result\.message,\{names:\[\.\.\.names,\.\.\.namesIn\(view\)\]\}\)/);
 assert.match(read('public/welcome-ui.js'),/<strong translate="no">\$\{esc\(t\('You left \{0\} after \{1\} days away\.',offer\.name,Number\(offer\.days\)\)\)\}<\/strong>/);
});

test('the wiki and the texts say the same rule',()=>{
 const wiki=read('public/wiki-content.js');
 assert.match(wiki,/section\('Away too long',`<p>A member who doesn't play for \$\{FAMILY_IDLE_DEFAULT\} days leaves the family automatically/);
 assert.match(wiki,/The leader never leaves this way\./);assert.match(wiki,/Welcome back offers to join that family again straight away, while it has room\./);
 assert.match(wiki,/See who is online, who has been away for a day or more and how much everyone did this week\./);
 assert.match(read('supabase/functions/farm-api/player-log.js'),/family_idle_days:'Changed when members who don\\'t play leave the family',family_rejoin:'Joined the family again'/);
});
