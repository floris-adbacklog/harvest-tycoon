// The family bonus's live count (21 Oct 2026, the owner): "Familiebonus: als 3 of meer leden van je Boerenfamilie het afronden,
// krijgen jullie elk 500 munten en 3 diamanten extra. Toon hier achter 1 /3. hoeveel mensen het gehaald hebben en zet erbij dat ze
// niet alle 3 in dezelfde liga hoeven te zitten". farm-api (event-service.js withFamilyCounts) puts family:{finished:n} on each
// running event; the events window shows "1 / 3" behind the sentence (held at 3, ✓ once reached) and the league sentence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.window??={};
const {EVENT_LEAGUES,HOUR_EVENT_REWARDS,createFarm,xpForLevel,normalizeFarm}=await import('../game/farm-state.js');
const {familyFinished,handleEvents}=await import('../supabase/functions/farm-api/event-service.js');
const {createLiveEventsUI}=await import('../public/live-events-ui.js');
const {LANGUAGES}=await import('../public/languages.js');
const {catalog,translations,problem}=await import('../scripts/i18n.mjs');
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const M=60000,iso=t=>new Date(t).toISOString();
const SAME='They do not have to be in the same league.';

// An hourly event: the Sprout League fertilizes 1 field, every other league plants 9 + its index.
const START=Date.UTC(2026,9,21,10);
const hourEvent=(extra={})=>({id:'hour',title:'Growing strong',description:'Grow.',starts_at:iso(START),ends_at:iso(START+55*M),active:true,settled_at:null,rewards:HOUR_EVENT_REWARDS,
 objectives:[{stat:'fertilized',target:1}],leagues:EVENT_LEAGUES.map((l,i)=>({title:`${l.name} goal`,description:'',objectives:[i===0?{stat:'fertilized',target:1}:{stat:'planted',target:9+i}]})),...extra});

test('finished: every goal of the member\'s own league, members from any league count (as harvest_event_settle)',()=>{
 const e=hourEvent();
 const rows=[
  {player_id:'a',league:0,progress:{fertilized:1}},            // Sprout, done
  {player_id:'b',league:3,progress:{planted:12}},              // Harvest league (index 3): 9+3, done
  {player_id:'c',league:3,progress:{planted:11,fertilized:5}}, // Sprout's goal met, not its own league's: not finished
  {player_id:'d',league:7,progress:{planted:16}},              // a village league: 9+7, done
  {player_id:'e',league:null,progress:{fertilized:1}}          // a row without a stored league: the event's own goals
 ];
 assert.equal(familyFinished(e,rows),4);
 assert.equal(familyFinished(e,[]),0);
 assert.equal(familyFinished(hourEvent({leagues:null}),[{league:4,progress:{fertilized:1}}]),1,'an event without league goals: its own for everyone');
 assert.equal(familyFinished(hourEvent({settled_at:iso(START+56*M)}),[{qualified:true},{qualified:false},{qualified:null}]),1,'settled: its qualified flags');
 // The rule is the settlement's, word for word: the league's goals, else the event's, with no league filter on the family count.
 const sql=read('supabase/league-at-join.sql');
 assert.ok(sql.includes("coalesce(e.leagues->p.league->'objectives',e.objectives)"));
 assert.match(sql,/join public\.family_members m on m\.player_id=lp\.player_id and m\.left_at is null\s+join public\.families f on f\.id=m\.family_id and f\.deleted_at is null\s+where lp\.event_id=p_event and lp\.qualified\)/);
});

// farm-api: the events list from a stand-in database, recording every read.
function database({family='fam',deleted=false,members=['me','m2','m3','m4'],rows=[],fail=null}){
 const calls=[];
 const q=table=>{const call={table,ops:[]};calls.push(call);const me={};
  for(const op of ['select','eq','in','is','gt','order','limit','single','maybeSingle'])me[op]=(...a)=>{call.ops.push([op,...a]);return me;};
  me.then=(ok,no)=>Promise.resolve(answer(call)).then(ok,no);return me;};
 const has=(call,op,col)=>call.ops.find(o=>o[0]===op&&o[1]===col);
 function answer(call){
  if(fail===call.table)return {error:{message:'down'}};
  if(call.table==='live_events')return {data:[hourEvent()]};
  if(call.table==='family_members'){
   if(has(call,'eq','player_id'))return {data:family?[{family_id:family}]:[]};
   return {data:members.map(player_id=>({player_id}))};
  }
  if(call.table==='families')return {data:deleted?[]:[{id:family}]};
  if(call.table==='live_event_players'){
   if(call.ops.some(o=>o[0]==='select'&&o[2]?.head))return {count:rows.length};
   if(has(call,'is','claimed_at'))return {data:[]};
   const ids=has(call,'in','player_id')?.[2];
   if(ids){if(fail==='family_rows')return {error:{message:'down'}};return {data:rows.filter(r=>ids.includes(r.player_id)).map(r=>({event_id:'hour',...r}))};}
   return {data:rows.filter(r=>r.player_id==='me').map(r=>({event_id:'hour',...r}))};
  }
  if(call.table==='player_stats')return call.ops.some(o=>o[0]==='maybeSingle')?{data:{level:20}}:{data:[]};
  return {data:[]};
 }
 return {calls,admin:{from:q,rpc:name=>Promise.resolve(name==='harvest_event_board'?{data:rows.map(r=>({...r,last_at:iso(START)}))}:{data:null})}};
}
async function list(options){
 const db=database(options),realNow=Date.now;Date.now=()=>START+30*M;
 try{const r=await handleEvents({admin:db.admin,body:{command:'list'},user:{id:'me'}});assert.equal(r.status,200);return {event:r.data.events.find(e=>e.id==='hour'),calls:db.calls};}
 finally{Date.now=realNow;}
}

test('farm-api: family.finished on the running event; no family, a deleted family or a failed read leave it out',async()=>{
 const rows=[{player_id:'me',league:0,progress:{fertilized:1}},{player_id:'m2',league:5,progress:{planted:14}},{player_id:'m3',league:1,progress:{planted:3}},
  {player_id:'out',league:0,progress:{fertilized:1}}];   // finished, but not in the family
 let r=await list({rows});
 assert.deepEqual(r.event.family,{finished:2},'me (Sprout) and m2 (Valley Legends), not m3 or a stranger');
 // Three small reads for it: my membership, the family and its members (together), the members' rows of the running events.
 assert.equal(r.calls.filter(c=>['family_members','families'].includes(c.table)).length,3);
 const famRows=r.calls.filter(c=>c.table==='live_event_players'&&c.ops.some(o=>o[0]==='in'&&o[1]==='player_id'));
 assert.equal(famRows.length,1);assert.deepEqual(famRows[0].ops.find(o=>o[1]==='event_id'),['in','event_id',['hour']]);
 assert.ok(r.calls.find(c=>c.table==='family_members'&&c.ops.some(o=>o[0]==='eq'&&o[1]==='player_id')).ops.some(o=>o[0]==='is'&&o[1]==='left_at'&&o[2]===null),'current members only');
 assert.ok(r.calls.find(c=>c.table==='families').ops.some(o=>o[0]==='is'&&o[1]==='deleted_at'&&o[2]===null));
 r=await list({rows,members:['me']});assert.deepEqual(r.event.family,{finished:1},'a family of one');
 for(const options of [{rows,family:null},{rows,deleted:true},{rows,fail:'family_members'},{rows,fail:'families'},{rows,fail:'family_rows'}]){
  r=await list(options);
  assert.ok(!('family' in r.event),JSON.stringify(options));
  assert.ok(r.event.standings,'the rest of the response as always');
 }
});

// The events window, drawn with a small stand-in for the page (as tests/league-at-join.test.mjs).
function page({level=20,events=[],now}){
 const els={'events-dot':{hidden:true},'mobile-events-hint':{textContent:''},'events-button':{setAttribute(){},hidden:false}};
 let html='';const listeners={};
 const dialog={open:false,id:'',className:'',setAttribute(){},addEventListener:(t,f)=>(listeners[t]??=[]).push(f),showModal(){dialog.open=true;},close(){dialog.open=false;for(const f of listeners.close??[])f();},
  querySelector:()=>({}),querySelectorAll:()=>[],closest:()=>null};
 Object.defineProperty(dialog,'innerHTML',{get:()=>html,set:v=>{html=String(v);}});
 const doc={hidden:false,getElementById:id=>els[id]??null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>dialog,body:{append(){}}};
 const state=createFarm(now());state.xp=xpForLevel(level);normalizeFarm(state,now());
 const bridge={request:async()=>({events,serverNow:now(),eligibility:{level,minLevel:15}})};
 globalThis.document=doc;
 const ui=createLiveEventsUI({state,notify(){},refreshFarm(){},document:doc,bridge,now});
 return {ui,html:()=>html};
}
const bonusLine=html=>{const at=html.indexOf('<p class="event-family-bonus">');return html.slice(at,html.indexOf('</p>',at)+4);};

test('the events window: "1 / 3" behind the family bonus, "✓ 3 / 3" once reached, nothing without a family or from an old farm-api',async t=>{
 const clock=()=>START+30*M;
 const cases=[[{finished:0},'<b class="event-family-count ">0 / 3</b>'],[{finished:1},'<b class="event-family-count ">1 / 3</b>'],
  [{finished:3},'<b class="event-family-count is-done">✓ 3 / 3</b>'],[{finished:5},'<b class="event-family-count is-done">✓ 3 / 3</b>'],
  [undefined,''],[null,''],[{},'']];
 for(const [family,count] of cases){
  const p=page({events:[hourEvent(family===undefined?{}:{family})],now:clock});
  t.after(()=>{p.ui.dispose();delete globalThis.document;});
  await p.ui.open();const line=bonusLine(p.html());
  assert.match(line,/^<p class="event-family-bonus"><img class="game-art[^>]*data-art="family-members"[^>]*><span>Family bonus: /,JSON.stringify(family));
  assert.ok(line.endsWith(`you each get 500 coins and 3 diamonds more. <span>${SAME}</span></span>${count}</p>`),`${JSON.stringify(family)}: ${line}`);
  assert.doesNotMatch(line,/ · /);
 }
 // The next event (the server sends no count for it): the sentence, no count.
 const p=page({events:[hourEvent({id:'next',starts_at:iso(START+60*M),ends_at:iso(START+115*M)})],now:clock});
 t.after(()=>{p.ui.dispose();delete globalThis.document;});
 await p.ui.open();
 assert.ok(bonusLine(p.html()).endsWith(`<span>${SAME}</span></span></p>`));
});

test('the same-league sentence: in the window, the wiki and the family cards, in every language',()=>{
 const wiki=read('public/wiki-content.js');
 assert.ok(read('public/live-events-ui.js').includes(`<span>\${bonus} <span>${SAME}</span></span>\${count}</p>`));
 assert.ok(wiki.includes(`diamonds more. <span>${SAME}</span>\`],`),'How to play › Events › Family bonus');
 assert.ok(wiki.includes(`on top of their own prize. <span>${SAME}</span> See \${h.link('events')}.</p>`),'How to play › Farm family › Events together');
 assert.ok(read('public/family-ui.js').includes(`diamonds extra. <span>${SAME}</span>\`],`),'What your family gives you');
 assert.ok(/\.event-family-count\{[^}]*border-radius:999px/.test(read('public/retention.css')));
 const all=catalog(),codes=LANGUAGES.filter(l=>l.code!=='en').map(l=>l.code);
 assert.equal(codes.length,15);
 for(const text of [SAME,'{0} on top of their own prize.']){
  assert.ok(text in all,text);
  for(const code of codes){const out=translations(code)[text];assert.ok(out,`${code}: ${text}`);assert.equal(problem(text,out),'',`${code}: ${text}`);assert.doesNotMatch(JSON.stringify(out),/ · /);}
 }
 // The game's own words: Dutch "liga", French "ligue" with its typographic apostrophe.
 assert.equal(translations('nl')[SAME],'Ze hoeven niet in dezelfde liga te zitten.');
 assert.equal(translations('fr')[SAME],'Ils n’ont pas besoin d’être dans la même ligue.');
});
