import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eventStandings,validateEvent} from '../supabase/functions/farm-api/event-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The UI modules import the browser-side farm client; load them with a minimal window so plain Node can test the pure helpers.
globalThis.window??={};
const {eventView,hasQualified,goalsDone,eligibilityNote,EVENTS_LEVEL}=await import('../public/live-events-ui.js');
const {sharingToday}=await import('../public/social-ui.js');
const {welcomeAction}=await import('../public/welcome-ui.js');

const H=3600000,M=60000,now=Date.UTC(2026,8,22,18,30);
const iso=t=>new Date(t).toISOString();
const event=(id,start,end,extra={})=>({id,title:id,description:'',starts_at:iso(start),ends_at:iso(end),active:true,settled_at:null,objectives:[{stat:'harvested',target:10}],rewards:{coins:200,diamondMin:1,diamondMax:2,participantStep:25,poolCap:50},...extra});

test('the event screen shows the running event, the next one during the break, rewards to collect and a short history',()=>{
 const live=event('live',now-H,now+4*H),next=event('next',now+5*H,now+10*H),later=event('later',now+11*H,now+16*H);
 const owed=event('owed',now-8*H,now-3*H,{settled_at:iso(now-3*H),player:{qualified:true,claimed_at:null}});
 const done=event('done',now-14*H,now-9*H,{settled_at:iso(now-9*H),player:{qualified:true,claimed_at:iso(now-8*H)}});
 const paused=event('paused',now-H,now+H,{active:false});
 const view=eventView([later,done,next,owed,live,paused],now);
 assert.equal(view.live.id,'live');assert.equal(view.next.id,'next');
 assert.deepEqual(view.owed.map(e=>e.id),['owed']);assert.deepEqual(view.past.map(e=>e.id),['done']);
 assert.equal(eventView([next,later],now).live,null,'in the 1-hour break there is no live event, only the next one');
});
test('qualifying mirrors the settlement rule: every goal full, 3 contributions over at least 10 minutes',()=>{
 const e=event('e',now-H,now+H),p=(harvested,actions,span)=>({progress:{harvested},actions,joined_at:iso(now-span),last_at:iso(now)});
 assert.equal(hasQualified(e,p(10,3,10*M)),true);
 assert.equal(hasQualified(e,p(9,3,10*M)),false);
 assert.equal(hasQualified(e,p(10,2,10*M)),false);
 assert.equal(hasQualified(e,p(10,3,10*M-1)),false);
 assert.equal(goalsDone(e,p(10,1,0)),true);
});
test('the screen says in one sentence why a farm cannot join yet',()=>{
 assert.equal(EVENTS_LEVEL,10);
 assert.match(eligibilityNote({level:7,minLevel:10,openAt:0,verified:true},now),/open at level 10\. You are level 7/);
 assert.match(eligibilityNote({level:12,minLevel:10,openAt:now+2*H,verified:true},now),/in 2h \(48 hours after you started\)/);
 assert.match(eligibilityNote({level:12,minLevel:10,openAt:0,verified:false},now),/Confirm your email/);
 assert.equal(eligibilityNote({level:12,minLevel:10,openAt:0,verified:true},now),null);
});
test('standings: finishers first by finish time, then by progress; rewards follow the settlement formula',()=>{
 const e=event('e',now-H,now+H),row=(player_id,harvested,actions,last)=>({player_id,progress:{harvested},actions,joined_at:iso(now-H),last_at:iso(now-H+last*M)});
 const ranked=eventStandings(e,[row('late',10,5,40),row('early',10,5,20),row('almost',9,9,5),row('slow',2,3,50),row('fast-but-short',10,2,1)],now);
 assert.deepEqual(ranked.map(r=>r.playerId),['early','late','fast-but-short','almost','slow']);
 assert.deepEqual(ranked.map(r=>r.finished),[true,true,false,false,false]);
 assert.deepEqual(ranked.slice(0,2).map(r=>[r.coins,r.diamonds]),[[200+300,1+2],[200+200,1+1]],'the usual reward plus the podium prize');
 assert.deepEqual([ranked[3].progress,ranked[3].coins,ranked[3].diamonds],[90,0,0]);
 const settled={...e,settled_at:iso(now)},paid=eventStandings(settled,[{...row('a',10,5,20),qualified:true,coins:200,diamonds:2},{...row('b',10,5,10),qualified:false,coins:0,diamonds:0}],now);
 assert.deepEqual(paid.map(r=>[r.playerId,r.finished,r.coins,r.diamonds]),[['a',true,200,2],['b',false,0,0]],'after settlement the stored qualification and rewards are shown as-is');
});
test('a pool that runs dry pays pool diamonds to the earliest finishers only; the podium prize comes on top',()=>{
 const e=event('e',now-H,now+H,{rewards:{coins:100,diamondMin:1,diamondMax:1,participantStep:10,poolCap:2}});
 const rows=['a','b','c'].map((id,i)=>({player_id:id,progress:{harvested:10},actions:3,joined_at:iso(now-H),last_at:iso(now-H+(20+i)*M)}));
 assert.deepEqual(eventStandings(e,rows,now).map(r=>r.diamonds),[1+2,1+1,0+1]);
});

test('automatic events: 5 hours on, 1 hour off, four times a day, created ahead by pg_cron and never impossible',()=>{
 const sql=read('supabase/live-events-schedule.sql');
 assert.match(sql,/floor\(extract\(epoch from now\(\)\)\/21600\)/,'6-hour slots aligned to 00, 06, 12 and 18 UTC');
 assert.match(sql,/starts\+interval '5 hours',true/,'each event runs 5 hours and is active');
 assert.match(sql,/for n in slot\.\.slot\+2 loop/,'the running event and the next two exist ahead of time');
 assert.match(sql,/md5\('harvest-auto-event:'\|\|n\)::uuid/,'one deterministic id per slot, so repeated runs never duplicate');
 assert.match(sql,/when raise_exception or unique_violation then null/,'an operator event in the same slot wins');
 assert.match(sql,/perform public\.harvest_event_settle\(ended\)/,'ended events are settled even when nobody opened the list');
 assert.match(sql,/cron\.schedule\('harvest-event-schedule','\*\/15 \* \* \* \*'/);
 assert.match(sql,/revoke all on function public\.harvest_event_schedule\(\) from public,anon,authenticated;/);
 const templates=JSON.parse(sql.match(/templates constant jsonb:='(\[[\s\S]*?\])';/)[1]),rewards=JSON.parse(sql.match(/rewards constant jsonb:='(\{[^']*\})';/)[1]);
 assert(templates.length>=4);
 for(const t of templates){
  const config=validateEvent({...t,starts_at:iso(now+H),ends_at:iso(now+6*H),active:true,rewards},now);
  assert.equal(config.objectives.length,t.objectives.length);
  assert(!t.objectives.some(o=>o.stat==='deliveries'),'the daily order board can run empty, so no event asks for deliveries');
 }
});
test('the player list is limited to what the screen shows and says why a farm is not taking part',()=>{
 const js=read('supabase/functions/farm-api/event-service.js');
 assert.match(js,/gt\('ends_at',new Date\(now-DAY_MS\)\.toISOString\(\)\)/,'running, upcoming and the last day');
 assert.match(js,/eq\('qualified',true\)\.is\('claimed_at',null\)/,'plus any reward still waiting');
 assert.match(js,/const scheduled=await admin\.rpc\('harvest_event_schedule'\);\n  if\(!scheduled\.error\)/,'the fallback schedule is best effort');
 assert.match(js,/eligibility:await eligibility\(admin,user\)/);
 assert.match(js,/respond=\(data,status=200\)=>\(\{status,data:\{\.\.\.data,profile:\{player_id:user\.id\}\}\}\)/,'every reply passes the stale-session guard in src/main.js');
});

test('Events sits next to Quests on desktop, in the More menu on phones; below level 10 it follows the other locked features',()=>{
 const html=read('public/farm.html'),css=read('public/mobile.css'),ui=read('public/live-events-ui.js');
 assert.match(html,/id="tasks-button"[^\n]*<\/button>\n      <button class="side-tool" id="events-button"/);
 assert.match(css,/\.side-tools #events-button\{display:none\}/,'the phone bottom bar keeps its five tabs');
 assert.doesNotMatch(read('public/game.js')+ui,/family-button'\)\.after\(button\)/,'no extra icon squeezed into the topbar');
 assert.match(ui,/if\(button\)button\.hidden=locked;/,'hidden on the desktop side-tool bar, like Boosts and Estate');
 assert.match(ui,/entry\.disabled=locked;entry\.classList\.toggle\('locked',locked\)/,'greyed with a lock in the More menu, like every locked card');
 assert.match(read('public/mobile-ui.js'),/\$\('more-dot'\)\.hidden=gift\.hidden&&\(\$\('events-dot'\)\?\.hidden\?\?true\);/);
});
test('the new icons are small WebP files, not megabyte PNGs',()=>{
 for(const name of ['live-events','family-sharing']){
  assert(readFileSync(new URL(`../public/assets/icons/${name}.webp`,import.meta.url)).length<60000,name);
  assert(readFileSync(new URL(`../public/assets/icons/${name}.png`,import.meta.url)).length<300000,name);
 }
 assert.match(read('public/visual-icons.js'),/const webpPictures=new Set\(\['live-events','family-sharing',/);
});

test('daily sharing knows what was already sent today, per member and per kind',()=>{
 const social={activity:[{sender:'me',recipient:'a',kind:'help'},{sender:'me',recipient:'b',kind:'help'},{sender:'me',recipient:'c',kind:'help'},{sender:'b',recipient:'me',kind:'gift'}]};
 const today=sharingToday(social,'me');
 assert.equal(today.sent,3);assert.equal(today.received,1);
 assert.equal(today.full('help'),true);assert.equal(today.full('gift'),false);
 assert.equal(today.done('help','a'),true);assert.equal(today.done('gift','a'),false);
});
test('the Members tab opens daily sharing from a calm card, and sharing comes back to it',()=>{
 const family=read('public/family-ui.js');
 assert.match(family,/<button type="button" class="family-share-entry" data-social-open>/);
 assert.doesNotMatch(family,/class="primary-button" data-social-open/);
 assert.match(family,/onBack:\(\)=>\{tab='members';open\(\);\}/);
});
test('Welcome Back offers one button that goes straight to what is waiting',()=>{
 assert.equal(welcomeAction({crops:3,batches:2,stall:10}),'Harvest your fields');
 assert.equal(welcomeAction({crops:0,batches:2,stall:10}),'Collect your batches');
 assert.equal(welcomeAction({crops:0,batches:0,stall:10}),'Visit the farm stall');
 assert.equal(welcomeAction({crops:0,batches:0,stall:0}),'Let’s get farming');
 assert.match(read('public/game.js'),/if\(state\.stats\.harvested>0&&\(!initialWelcome\|\|initialChapterReward\?\.diamonds\)\)toast\(`Welcome back!/,'no second "Welcome back" toast under the card');
});
test('the chore bar fills up at the chore\'s own maximum, and a plain result looks different from a find',()=>{
 const growth=read('public/growth-ui.js');
 assert.match(growth,/<progress max="\$\{c\.maxChance\}" value="\$\{status\.chance\}"/);
 assert.match(growth,/dialog\.classList\.toggle\('is-bonus',!!result\.bonus\);/);
 assert.match(growth,/No \$\{ITEMS\[item\]\.name\.toLowerCase\(\)\} this time\./);
});
test('the leaderboard only ranks; your profile, name and sign-out live in Settings',()=>{
 const ui=read('src/ui.js'),board=ui.slice(ui.indexOf('<dialog id="leaderboard-dialog"'),ui.indexOf('</dialog>',ui.indexOf('<dialog id="leaderboard-dialog"')));
 assert.doesNotMatch(board,/rename-player|logout-player|view-player-profile/);
 assert.match(ui,/account\.className='settings-account'/);
 assert.match(ui,/\(settings\?\.querySelector\('\.dialog-heading'\)\?\?document\.body\)\.after\(account\);/);
});
test('the first three finishers win a podium prize on top, the same in settlement, the projection and the screen',async()=>{
 const {PODIUM}=await import('../supabase/functions/farm-api/event-service.js'),{PODIUM_PRIZES}=await import('../public/live-events-ui.js');
 assert.deepEqual(PODIUM,[{coins:300,diamonds:2},{coins:200,diamonds:1},{coins:100,diamonds:1}]);
 assert.deepEqual(PODIUM_PRIZES,PODIUM,'the screen shows exactly what the server pays');
 const e=event('e',now-H,now+H),rows=['a','b','c','d'].map((id,i)=>({player_id:id,progress:{harvested:10},actions:5,joined_at:iso(now-H),last_at:iso(now-H+(20+i)*M)}));
 assert.deepEqual(eventStandings(e,rows,now).map(r=>[r.coins,r.diamonds,r.podium]),[[500,3,true],[400,2,true],[300,2,true],[200,1,false]]);
 for(const file of ['supabase/live-events.sql','supabase/live-events-podium.sql']){
  const sql=read(file);
  assert.match(sql,/coins=\(e\.rewards->>'coins'\)::integer\+\(case r\.rank when 1 then 300 when 2 then 200 when 3 then 100 else 0 end\)/,file);
  assert.match(sql,/\+\(case r\.rank when 1 then 2 when 2 then 1 when 3 then 1 else 0 end\)/,file);
 }
});
