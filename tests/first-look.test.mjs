import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction as act,recordFirstLook,FIRST_LOOK_MAX_MS,beginnerProgress,formatDuration,DAY_MS} from '../game/farm-state.js';
import {liveStep} from '../public/beginner-ui.js';
import {createFarmClient} from '../public/farm-client.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,7,12);

// The CrazyGames launch (7 Oct 2026): we could not tell a farmer who left while the farm loaded from one who saw it and left.
test('a new farm keeps its first look once: times within the last day, durations up to 10 minutes, the frame size',()=>{
 const s=createFarm(now);
 const r=act(s,{type:'first_look',look:{shownAt:now-6000,loadMs:4200.4,readyAt:now-2000,readyMs:8200,frame:'960x540',firstInputAt:now+5*60000,extra:'x'}},now);
 assert.deepEqual(r,{});
 assert.deepEqual(s.onboarding.firstLook,{shownAt:now-6000,loadMs:4200,readyAt:now-2000,readyMs:8200,frame:'960x540'},'a time ahead of the server and unknown parts are left out');
 // The first touch comes along with the next action; what is kept stays as it is.
 act(s,{type:'field',id:0,action:'harvest',look:{firstInputAt:now+1000,shownAt:now}},now+2000);
 assert.equal(s.onboarding.firstLook.firstInputAt,now+1000);assert.equal(s.onboarding.firstLook.shownAt,now-6000);
 const t=createFarm(now);recordFirstLook(t,{shownAt:now-DAY_MS-1,loadMs:-5,readyMs:FIRST_LOOK_MAX_MS*3,frame:'<b>',readyAt:now+30000},now);
 assert.deepEqual(t.onboarding.firstLook,{readyMs:FIRST_LOOK_MAX_MS,readyAt:now},'clamped: a long wait to 10 minutes, a little ahead to now');
 const u=createFarm(now);recordFirstLook(u,'nonsense',now);recordFirstLook(u,{frame:'1e3x5'},now);assert.equal(u.onboarding.firstLook,undefined);
 // The device's clock with sentAt (review, 7 Oct 2026): moved by the server's now minus sentAt, here a clock 5 minutes behind; the
 // clamping comes after the move.
 const v=createFarm(now),device=now-300000;
 recordFirstLook(v,{shownAt:device-6000,readyAt:device-2000,firstInputAt:device+60000,sentAt:device},now);
 assert.deepEqual(v.onboarding.firstLook,{shownAt:now-6000,readyAt:now-2000});
 recordFirstLook(v,{firstInputAt:device+3000,firstInputMs:5000.6,sentAt:device+4000},now);
 assert.equal(v.onboarding.firstLook.firstInputAt,now-1000);assert.equal(v.onboarding.firstLook.firstInputMs,5001,'the time to the first touch on one clock, whatever each trip took');
 const x=createFarm(now);recordFirstLook(x,{readyAt:now-1000,firstInputMs:-1,sentAt:'x'},now);assert.deepEqual(x.onboarding.firstLook,{readyAt:now-1000},'no sentAt: the server\'s own times');
});

// Review, 7 Oct 2026: first_look went out with the saving lock (body.farm-saving: no taps or sweeps on the farm, styles.css) just as a
// new farmer could first tap. It goes quietly now, keeps its place in the line, and its answer still takes over the farm.
test('the first look never locks the farm: no farm-saving and no saving status, still in order, and its answer takes over',async()=>{
 const classes=new Set(),statuses=[],sent=[],gates=[],server=createFarm(now),t=now+5000,tick=()=>new Promise(r=>setTimeout(r,0));
 let refuse=false;
 globalThis.document={body:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},documentElement:{hasAttribute:()=>false}};
 globalThis.window={parent:{harvestBridge:{serverNow:t,request(body){sent.push(body.action);return new Promise((resolve,reject)=>gates.push(()=>{
  if(refuse)return reject(Object.assign(new Error('Unknown farm action.'),{code:'ACTION_REJECTED'}));
  const result=act(server,body.action,t);resolve({state:structuredClone(server),result,serverNow:t});}));}}}};
 const state=structuredClone(server),client=createFarmClient(state,{onChange(){},onStatus:s=>statuses.push(s)});await client.load();
 const clock=Date.now();client.look({readyAt:clock-1000,frame:'960x540'});client.sendLook();
 const locked=()=>classes.has('farm-saving');
 assert.equal(locked(),false,'the farm takes taps at once');assert.ok(!statuses.includes('saving'));
 await tick();assert.equal(sent.length,1);assert.equal(sent[0].type,'first_look');assert.ok(Number.isFinite(sent[0].look.sentAt),'stamped as it leaves');
 assert.equal(locked(),false,'nor while it is on its way');
 // A tap meanwhile shows at once and waits its turn behind it (its own request does lock, as every tap does).
 const harvested=await client.runAction({type:'field',id:0,action:'harvest'});assert.equal(harvested.action,'harvest');assert.equal(state.stats.harvested,1);
 await tick();assert.equal(sent.length,1,'still in the line');
 gates.shift()();await tick();await tick();
 assert.equal(sent.length,2);assert.equal(sent[1].type,'field');assert.equal(sent[1].look,undefined,'the look went once');
 assert.equal(state.onboarding.firstLook.frame,'960x540','its answer took over the farm');assert.equal(state.stats.harvested,1,'with the tap on top');
 assert.ok(Math.abs(state.onboarding.firstLook.readyAt-(t-1000))<2000,'moved onto the server\'s clock');
 gates.shift()();await tick();await tick();assert.equal(locked(),false);
 // The first touch 15 s later goes quietly too, and an older farm-api that refuses first_look shows nothing.
 const before=statuses.length;refuse=true;client.look({firstInputAt:Date.now()});client.sendLook();await tick();
 assert.equal(locked(),false);assert.equal(sent.at(-1).type,'first_look');gates.shift()();await tick();await tick();
 assert.deepEqual(statuses.slice(before),[],'no saving, no error');assert.equal(locked(),false);
});

test('every finished guide step keeps when it was finished, the last one too',()=>{
 const s=createFarm(now);
 act(s,{type:'field',id:0,action:'harvest'},now+1000);
 assert.deepEqual(s.onboarding.stepAt,{harvest:now+1000});
 s.onboarding.completed=9;s.onboarding.milestones.collect=true;
 act(s,{type:'beginner_claim',id:'collect'},now+9000);assert.equal(s.onboarding.stepAt.collect,now+9000);
});

test('the game notes the first look and sends it at once; the first touch goes with the next request',()=>{
 const cloud=read('src/game-cloud.js'),game=read('public/game.js'),client=read('public/farm-client.js');
 // The start and the frame's size at once, only shownAt after a drawn frame: a tab in the background draws nothing (review, 7 Oct 2026).
 assert.match(cloud,/look=window\.harvestFirstLook=\{\.\.\.\(started\?\{started\}:\{\}\),frame:`\$\{step\(globalThis\.innerWidth\)\}x\$\{step\(globalThis\.innerHeight\)\}`\};\n  nextFrame\(\(\)=>nextFrame\(\(\)=>\{const now=Date\.now\(\);Object\.assign\(look,\{shownAt:now,\.\.\.\(started\?\{loadMs:Math\.round\(now-started\)\}:\{\}\)\}\);\}\)\);/);
 assert.match(cloud,/started=window\.parent\.performance\.timeOrigin\|\|started/,'from the start of the page around the farm');
 assert.match(game,/if\(!villageWorld&&!adminView&&!\(state\.stats\.harvested>0\)\)noteFirstLook\(\);/,'only for a farm that has not harvested yet');
 assert.match(game,/let started=look\.started;if\(!started\)try\{started=window\.parent\.performance\.timeOrigin;\}catch\{started=performance\.timeOrigin;\}/);
 assert.match(game,/readyAt:at,\.\.\.\(started\?\{readyMs:Math\.round\(at-started\)\}:\{\}\),frame:look\.frame\?\?`\$\{step\(innerWidth\)\}x\$\{step\(innerHeight\)\}`\}\);client\.sendLook\(\);\}/);
 assert.match(game,/const t=Date\.now\(\);client\.look\(\{firstInputAt:t,\.\.\.\(fresh\?\{firstInputMs:t-at\}:\{\}\)\}\);/,'the device\'s clock: the server moves it by sentAt');
 assert.match(game,/fresh=!state\.onboarding\?\.firstLook;/,'firstInputMs only after a readyAt from this same visit');assert.doesNotMatch(game,/firstInputAt:server\(/);
 assert.match(game,/game\.addEventListener\('pointerdown',touched,true\);/);
 assert.match(client,/const sent=withLook\(action\),run=line\.then\(\(\)=>bridge\.request\(\{operation:'action',action:stamped\(sent\),requestId:crypto\.randomUUID\(\)\}\)\);/);
 assert.match(client,/const sendLook=\(\)=>\{if\(noted&&!adminView\(\)\)void send\(\{type:'first_look'\},true\)\.then\(replace,\(\)=>\{\}\);\};/);
 // The farm's models load 8 at a time (7 Oct 2026; 4 before).
 assert.match(game,/loadInBatches\(modelNames,async name=>\{await loadModel\(name\);loaded\+\+;loadingUI\.modelsReady\(loaded\);\},8\)/);
});

test('timers under 2 minutes keep their seconds, and step 10 says how long the eggs take now',()=>{
 assert.deepEqual([59,60,61,90,119,120,121].map(s=>formatDuration(s*1000)),['59s','1m','1m 1s','1m 30s','1m 59s','2m','3m']);
 const s=createFarm(now),eggs=at=>beginnerProgress(s,at).find(q=>q.id==='collect').description;
 assert.equal(eggs(now),'Collect a finished batch from a building. Chicken feed becomes eggs in 3m.','the beginner boost (40% since 9 Oct 2026)');
 assert.equal(eggs(now+3*DAY_MS),'Collect a finished batch from a building. Chicken feed becomes eggs in 5m.');
 assert.equal(beginnerProgress(s,now).find(q=>q.id==='water').description,'Plant wheat and water it within a minute. It grows faster and gives an extra crop.');
});

test('the phone banner says when the eggs are ready, and what to do at step 7, in one short line',()=>{
 const s=createFarm(now);assert.equal(liveStep(s,'sell_egg',now),null,'no batch: the step\'s own line');
 s.buildings.coop.job={recipe:'eggs',readyAt:now+61000,startedAt:now};
 assert.equal(liveStep(s,'sell_egg',now),'Eggs in 1m 1s, then sell one');
 assert.equal(liveStep(s,'collect',now),'Batch ready in 1m 1s');
 assert.equal(liveStep(s,'sell_egg',now+61000),'Collect eggs at the Coop');assert.equal(liveStep(s,'collect',now+61000),null);
 s.inventory.eggs=3;assert.equal(liveStep(s,'sell_egg',now),'Sell an egg in Market');
 assert.equal(liveStep(s,'water',now),null);
 assert.match(read('public/game.js'),/rookie\.tick\(\);activities\.tick\(\);beginner\?\.tick\(\);/);
});

test('day 1 of the gift, level 2 and the end of the guide say what comes next',()=>{
 assert.match(read('public/retention-ui.js'),/r\.streak===1\?`Day 1 gift! \+\$\{r\.diamonds\} diamonds and \+\$\{r\.coins\.toLocaleString\('en-US'\)\} coins\.\$\{r\.returnBoost\?` Plus \$\{r\.returnBoost\} minutes of double harvest!`:''\} Come back tomorrow for day 2\.`:`Welcome back!/);
 const game=read('public/game.js');
 assert.match(game,/const goal=\['mill','dairy'\]\.find\(key=>!state\.buildings\[key\]\?\.built&&buildingEligible\(state,key\)&&buildingCost\(state,key\)>0\);/);
 assert.match(game,/if\(goal\)return back\?`Next goal: build the \$\{name\} for \$\{cost\} coins in Buildings\. \$\{when\} Come back tomorrow for your next daily gift and 30 minutes of double harvest\.`/);
 // No middle dot in the new texts (the page swaps them out, but they are written without).
 for(const text of ['Day 1 gift!','Next goal: build the','Eggs in {0}, then sell one','Batch ready in {0}',"Water works in a crop's first minute"])assert.ok(read('i18n/catalog.json').includes(text),text);
});
