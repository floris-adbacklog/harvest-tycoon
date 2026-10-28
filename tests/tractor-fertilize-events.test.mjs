import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel,applyFarmAction,CROPS,NO_EVENT_ACTIONS,buildingCost} from '../game/farm-state.js';
import {PROGRESS_BODY as LIVE_PROGRESS} from '../scripts/league-at-join-sql.mjs';
import {PROGRESS_BODY,LIVE_MD5,NEW_MD5,OLD_LINE,NEW_LINE,tractorFertilizeEventsSql} from '../scripts/tractor-fertilize-events-sql.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,25,12),HOUR=3600000;

// 25 Oct 2026, a player via the owner: "besmeten werkt niet meer bij events". Since 24 Oct 2026 fertilizing goes only through the
// tractor (saved as the action 'tractor'); harvest_event_progress counted "Fertilize fields" only for the action 'fertilize'.

// The trigger's "does this action count for this goal" rule, read from its SQL and run here as JavaScript.
function mappedRule(body){
 const start=body.indexOf('mapped:='),expr=body.slice(start+8,body.indexOf(';',start));
 const list=s=>`[${s}]`;
 const js=expr.replace(/\s+/g,' ')
  .replace(/(stat|action) in \(([^)]*)\)/g,(_,k,l)=>`${list(l)}.includes(${k})`)
  .replace(/stat like '([^']*)'/g,(_,p)=>`stat.startsWith('${p.replace(/\\/g,'').replace(/_?%$/,'_')}')`)
  .replace(/(stat|action)='([^']*)'/g,`$1==='$2'`).replace(/ and /g,' && ').replace(/ or /g,' || ');
 return new Function('stat','action',`return ${js};`);
}
const counts=mappedRule(PROGRESS_BODY),countedBefore=mappedRule(LIVE_PROGRESS);

function farm(){
 const s=createFarm(now-30*24*HOUR);s.xp=xpForLevel(30)+10;s.coins=50000;s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};
 s.inventory.fertilizer=10;if(buildingCost(s,'windmill'))s.buildings.windmill.built=true;
 for(const id of [0,1])Object.assign(s.plots[id],{crop:'pumpkin',plantedAt:now-1000,readyAt:now-1000+CROPS.pumpkin.duration,careAt:now+HOUR,watered:false,tended:false,fertilized:false});
 return s;
}
// What farm-api saves as the receipt's eventAction: the action's type, or none for a no-event action (index.ts).
const eventAction=action=>NO_EVENT_ACTIONS.has(action.type)?null:action.type;

test('the rule read from the SQL is the trigger’s: the old one missed the tractor, the new one counts it',()=>{
 assert.equal(countedBefore('fertilized','fertilize'),true);assert.equal(countedBefore('fertilized','tractor'),false,'the bug');
 assert.equal(counts('fertilized','fertilize'),true);assert.equal(counts('fertilized','tractor'),true);
 assert.equal(counts('fertilized','field'),false);assert.equal(counts('harvest_wheat','tractor'),true);assert.equal(counts('made_flour','collect'),true);
 assert.equal(counts('harvested','tractor_care'),false);
});

test('every way to fertilize counts for "Fertilize fields": the tractor’s Fertilize job (picked fields or not) and an older page’s by hand',()=>{
 for(const action of [{type:'tractor',mode:'fertilize',crop:'wheat',ids:[0,1],expectedCost:0},{type:'tractor',mode:'fertilize',crop:'wheat'},{type:'fertilize',ids:[0,1]},{type:'fertilize',id:0}]){
  const s=farm(),before=s.stats.fertilized??0;applyFarmAction(s,action,now);
  assert.ok(s.stats.fertilized>before,`${JSON.stringify(action)} raises stats.fertilized`);
  const saved=eventAction(action);assert.ok(saved,'saved as an event action');
  assert.equal(counts('fertilized',saved),true,`${JSON.stringify(action)} counts`);
 }
 // The tractor's other jobs never raise it, so counting 'tractor' adds nothing else.
 const s=farm(),before=s.stats.fertilized??0;applyFarmAction(s,{type:'tractor',mode:'water',crop:'wheat'},now);assert.equal(s.stats.fertilized??0,before);
});

test('the SQL: one line of harvest_event_progress, guarded on the live body, generated and up to date',()=>{
 assert.equal(LIVE_MD5,'4eef8c3039a4316ad5b6a45a4a897b69');assert.notEqual(NEW_MD5,LIVE_MD5);
 assert.equal(PROGRESS_BODY,LIVE_PROGRESS.replace(OLD_LINE,NEW_LINE),'nothing else changes');
 assert.equal(NEW_LINE,`(stat='fertilized' and action in ('fertilize','tractor'))`);
 const sql=read('supabase/tractor-fertilize-events.sql');
 assert.equal(sql,tractorFertilizeEventsSql(),'run node scripts/tractor-fertilize-events-sql.mjs');
 assert.match(sql,/^begin;$/m);assert.match(sql,/^commit;$/m);
 assert.ok(sql.includes(`have not in ('${LIVE_MD5}','${NEW_MD5}')`),'refuses another live body; a second run changes nothing');
 assert.ok(sql.includes(`is distinct from '${NEW_MD5}'`),'the after-check');
 assert.ok(sql.includes(`create or replace function public.harvest_event_progress()\n returns trigger language plpgsql set search_path to '' as $function$`));
});
