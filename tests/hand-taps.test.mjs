import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,activityStatus,featureUnlocked,xpForLevel,ACTIVE_STATIONS,HAND_TAP_SLACK} from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
import {createFarmClient} from '../public/farm-client.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,13,12),MIN=60000;
const at=(level,make=createFarm,t=now)=>{const s=make(t);s.xp=xpForLevel(level);s.xpOffset=0;normalizeFarm(s,t);return s;};

// 13 Oct 2026 (the owner: "is there a delay in doing the 3 tasks, can it go"): a job's three taps follow each other at once. The job's
// nextAt (0.6 s after the start and after every tap) is gone from the rules and from the tiles, which stayed grey about a second.
test('the three taps of a job follow each other at once and the job pays once',()=>{
 const s=at(12),xp=s.xp,{startedAt}=act(s,{type:'activity_start',station:'greenhouse'},now);
 assert(!('nextAt' in s.activities.jobs.greenhouse),'a new job has no wait between taps');
 const results=[...s.activities.jobs.greenhouse.targets].map(target=>act(s,{type:'activity_work',station:'greenhouse',startedAt,target},now));
 assert.deepEqual(results.map(r=>r.finished),[false,false,true]);
 assert.equal(s.xp-xp,ACTIVE_STATIONS.greenhouse.xp);assert.equal(s.activities.completed.greenhouse,1);
 assert.equal(activityStatus(s,'greenhouse',now).remaining,ACTIVE_STATIONS.greenhouse.cooldown,'the stop still rests its full hour: the pace is unchanged');
 assert.throws(()=>act(s,{type:'activity_start',station:'greenhouse'},now+1),/returns/);
});
test('an older save whose job still waits on nextAt takes the next tap at once',()=>{
 const s=at(12),{startedAt}=act(s,{type:'activity_start',station:'apiary'},now),job=s.activities.jobs.apiary;job.nextAt=now+600;
 assert.equal(act(s,{type:'activity_work',station:'apiary',startedAt,target:job.targets[0]},now+1).progress,1);
});
// The first tap can now come before the server has answered the start: it carries the start this device showed (its own clock).
test('a tap with this device\'s start time counts for the server\'s job; a tap from an earlier job is still refused',()=>{
 const s=at(12),{startedAt}=act(s,{type:'activity_start',station:'paddock'},now),[a,b,c]=s.activities.jobs.paddock.targets;
 for(const wrong of [startedAt+HAND_TAP_SLACK+1,startedAt-HAND_TAP_SLACK-1,undefined,null,String(startedAt),NaN]){
  const before=structuredClone(s);assert.throws(()=>act(s,{type:'activity_work',station:'paddock',startedAt:wrong,target:a},now),/current job/,String(wrong));assert.deepEqual(s,before);
 }
 act(s,{type:'activity_work',station:'paddock',startedAt:startedAt-450,target:a},now);act(s,{type:'activity_work',station:'paddock',startedAt:startedAt+HAND_TAP_SLACK,target:b},now);
 assert(act(s,{type:'activity_work',station:'paddock',startedAt,target:c},now).finished);
 // The next job at this stop starts after its rest: a tap still carrying the first job's start is refused there.
 const next=s.activities.cooldowns.paddock;act(s,{type:'activity_start',station:'paddock'},next);
 assert.throws(()=>act(s,{type:'activity_work',station:'paddock',startedAt,target:s.activities.jobs.paddock.targets[0]},next),/current job/);
});
test('the slack is far below the shortest rest a stop has, at every level, new and older farms',()=>{
 let shortest=Infinity;
 for(const make of [createFarm,createLegacyFarm])for(let level=1;level<=200;level++){const s=at(level,make);if(featureUnlocked(s,'activities'))for(const k of Object.keys(ACTIVE_STATIONS))shortest=Math.min(shortest,activityStatus(s,k,now).cooldown);}
 assert.equal(shortest,18*MIN);assert.equal(HAND_TAP_SLACK,5*MIN);assert(HAND_TAP_SLACK*3<shortest);
});
// The whole way on a phone: the start and three quick taps all show at once, before the server answered anything, and the server (whose
// clock is a moment ahead, as a round trip makes it) takes all four; nothing goes back and no error shows.
test('a start and three quick taps before the server answers all hold, on the screen and on the server',async()=>{
 const server=at(12,createFarm,Date.now()),state=structuredClone(server),answers=[],errors=[];
 globalThis.localStorage={getItem(){return null;},setItem(){}};globalThis.document={body:{classList:{add(){},remove(){}}}};
 globalThis.window={parent:{harvestBridge:{serverNow:Date.now(),request:body=>new Promise((resolve,reject)=>answers.push(()=>{const t=Date.now()+400;try{const result=act(server,body.action,t);resolve({state:structuredClone(server),serverNow:t,result});}catch(e){reject(Object.assign(new Error(e.message),{code:'ACTION_REJECTED'}));}}))}}};
 const client=createFarmClient(state,{onChange(){},onStatus(){},onError:m=>errors.push(m)});await client.load();
 await client.runAction({type:'activity_start',station:'workshop'});const job=state.activities.jobs.workshop;
 const shown=[];for(const target of [...job.targets])shown.push(await client.runAction({type:'activity_work',station:'workshop',startedAt:job.startedAt,target}));
 assert.deepEqual(shown.map(r=>r.finished),[false,false,true],'all three show at once');assert.equal(state.activities.completed.workshop,1);
 for(let i=0;i<20&&(answers.length||i<4);i++){answers.shift()?.();await new Promise(r=>setTimeout(r,0));}
 assert.deepEqual(errors,[]);assert.equal(server.activities.completed.workshop,1,'the server took all three taps');assert(!server.activities.jobs.workshop);
 assert.equal(state.activities.completed.workshop,1,'and the screen kept them');assert(!state.activities.jobs.workshop);
});
test('the tiles no longer wait on nextAt, and its refusal text is gone from the rules and the catalog',()=>{
 assert.doesNotMatch(read('public/activities-ui.js'),/job\.nextAt/);
 for(const f of ['game/farm-state.js','public/farm-state.js','supabase/functions/farm-api/farm-state.js']){const src=read(f);assert.doesNotMatch(src,/moment to finish|nextAt:now\+600|job\.nextAt/,f);}
 assert(!('Give your last action a moment to finish.' in JSON.parse(read('i18n/catalog.json'))));
});
