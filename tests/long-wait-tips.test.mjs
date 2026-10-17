import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel,applyFarmAction as act,CROPS,cropDuration,formatDuration,POND_OPEN} from '../public/farm-state.js';
import {cropChoiceText,waitTip,waitTipText,createWaitTip,quickCrop,quickestCrop,QUICK_CROP_MS,LONG_WAIT_LEVEL,LONG_WAIT_MS,WAIT_TIP_KEY,WAIT_TIP_SHOW_MS} from '../public/wait-tip.js';
import {toastParts} from '../public/toast-ui.js';
import {seedTab} from '../public/economy-ui.js';
import {createTranslator} from '../public/i18n.js';
import {LANGUAGES} from '../public/languages.js';
import {catalog,translations} from '../scripts/i18n.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Long waits early on (16 Oct 2026, the owner: "People quickly plant lots of corn, or even barley early on, and then sit in a long waiting
// time."). Live: of 1,225 early farms (level 1-8) that stopped, 10% left with 5+ minutes still to grow, 98% of those with corn or barley on
// their fields. Three changes: a word in the seed shop when a long crop is chosen, a note after planting long crops, and the seed shop's
// Quick tab at 5 minutes or less.
const now=new Date(2026,9,16,12,0).getTime(),later=now+2*86400000;   // later: the first day's beginner boost is over
const clock=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
function farmer({level=6,at=now,guide=true}={}){
 const s=createFarm(at);s.xp=xpForLevel(level)+5;s.coins=50000;
 if(guide)s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};
 s.plots=s.plots.map(p=>({...p,crop:null,readyAt:0,plantedAt:0}));   // the starter crops cleared: each test plants its own
 return s;
}
const plant=(s,crop,ids,at)=>{for(const id of ids)act(s,{type:'field',id,action:'plant',crop},at);};
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};

test('1. the seed shop: a crop that is not quick says how long it takes and names wheat for playing on, up to level 8, in the farm\'s own times',()=>{
 assert.equal(QUICK_CROP_MS,5*60000);assert.equal(LONG_WAIT_LEVEL,8);
 const s=farmer({level:8});assert.equal(quickestCrop(s),'wheat');
 assert.equal(cropChoiceText(s,'corn',later),'Corn selected: ready in 15m, good before a break. Playing on? Wheat is ready in 2m.');
 assert.equal(cropChoiceText(s,'barley',later),'Barley selected: ready in 45m, good before a break. Playing on? Wheat is ready in 2m.');
 // A quick crop (5 minutes or less) keeps today's word.
 assert.ok(quickCrop('wheat')&&quickCrop('lettuce')&&!quickCrop('corn'));
 assert.equal(cropChoiceText(s,'wheat',later),'Wheat selected. Choose an empty field to plant.');
 assert.equal(cropChoiceText(s,'lettuce',later),'Lettuce selected. Choose an empty field to plant.');
 // Level 9 and up: the plain word for every crop.
 const nine=farmer({level:9});
 assert.equal(cropChoiceText(nine,'corn',later),'Corn selected. Choose an empty field to plant.');
 assert.equal(cropChoiceText(nine,'cabbage',later),'Cabbage selected. Choose an empty field to plant.');
 // The first day's beginner boost is in both numbers: corn 7.5 minutes (8m), wheat 1 minute.
 const fresh=farmer({level:5});
 assert.ok(cropDuration(fresh,'corn',false,now)<CROPS.corn.duration,'the boost is on');
 assert.equal(cropChoiceText(fresh,'corn',now),`Corn selected: ready in ${formatDuration(cropDuration(fresh,'corn',false,now))}, good before a break. Playing on? Wheat is ready in ${formatDuration(cropDuration(fresh,'wheat',false,now))}.`);
 assert.equal(cropChoiceText(fresh,'corn',now),'Corn selected: ready in 8m, good before a break. Playing on? Wheat is ready in 1m.');
 // The seed shop's row says it when a crop is chosen.
 const ui=read('public/economy-ui.js');
 assert.match(ui,/import \{QUICK_CROP_MS,cropChoiceText\} from '\.\/wait-tip\.js';/);
 // Not when the shop was opened from the tractor (17 Oct 2026): the tractor opens again and shows the crop (tractor-plant-ask.test.mjs).
 assert.match(ui,/b\.addEventListener\('click',\(\)=>\{chooseCrop\(b\.dataset\.chooseCrop\);const fromTractor=\$\('seed-dialog'\)\.dataset\.from==='tractor';\$\('seed-dialog'\)\.close\(\);if\(!fromTractor\)notify\(cropChoiceText\(state,b\.dataset\.chooseCrop,farmNow\(\)\)\);\}\)/);
 assert.doesNotMatch(ui,/notify\(`\$\{CROPS\[b\.dataset\.chooseCrop\]\.name\} selected/,'one place says it');
});

test('2. after planting: more than half of the fields growing a crop that is not quick, the last one 10 minutes or more away',()=>{
 const s=farmer();
 plant(s,'corn',[0,1,2,3],later);assert.equal(waitTip(s,'corn',later),null,'4 of 8 fields: half, not more');
 plant(s,'corn',[4],later);
 assert.deepEqual(waitTip(s,'corn',later),{at:later+CROPS.corn.duration,open:[...(POND_OPEN?['pond']:[]),'hand','wheat']});
 // A ripe crop is not growing.
 s.plots[4]={...s.plots[4],readyAt:later-1};assert.equal(waitTip(s,'corn',later),null);
 // The last growing field decides the time: barley next to corn.
 const b=farmer();plant(b,'corn',[0,1,2,3],later);plant(b,'barley',[4],later);
 assert.equal(waitTip(b,'barley',later).at,later+CROPS.barley.duration);
 // 10 minutes or more: 9m59s is not enough, 10m is.
 const ten=farmer();plant(ten,'corn',[0,1,2,3,4],later);
 assert.equal(waitTip(ten,'corn',later+CROPS.corn.duration-LONG_WAIT_MS+1),null);
 assert.ok(waitTip(ten,'corn',later+CROPS.corn.duration-LONG_WAIT_MS));
 // Only after a crop that is not quick, only up to level 8.
 const quick=farmer();plant(quick,'corn',[0,1,2,3],later);plant(quick,'wheat',[4],later);assert.equal(waitTip(quick,'wheat',later),null,'wheat is quick');
 const nine=farmer({level:9});plant(nine,'corn',[0,1,2,3,4],later);assert.equal(waitTip(nine,'corn',later),null);
 const eight=farmer({level:8});plant(eight,'corn',[0,1,2,3,4],later);assert.ok(waitTip(eight,'corn',later));
 // Not while the Beginner guide is unfinished (its last step claimed: every step done).
 const guide=farmer({guide:false});guide.onboarding={...guide.onboarding,completed:9,rewardClaimed:false};plant(guide,'corn',[0,1,2,3,4],later);
 assert.equal(waitTip(guide,'corn',later),null);
});

test('2. the list names only what is open now: the fishing pond, a helping hand, and wheat while a field is empty',()=>{
 const s=farmer();plant(s,'corn',[0,1,2,3,4,5,6,7],later);
 assert.deepEqual(waitTip(s,'corn',later).open,[...(POND_OPEN?['pond']:[]),'hand'],'no empty field: no wheat');
 // Level 3: the hand is open, the pond (level 4) not yet; level 2: neither.
 const three=farmer({level:3});plant(three,'corn',[0,1,2,3,4],later);assert.deepEqual(waitTip(three,'corn',later).open,['hand','wheat']);
 const two=farmer({level:2});plant(two,'corn',[0,1,2,3,4],later);assert.deepEqual(waitTip(two,'corn',later).open,['wheat']);
 const full=farmer({level:2});plant(full,'corn',[0,1,2,3,4,5,6,7],later);assert.deepEqual(waitTip(full,'corn',later).open,[]);
 // The words: joined with "or", in the device's own clock as the next-goal line says it.
 const at=now+20*60000,t=clock(at);
 assert.equal(waitTipText({at,open:['pond','hand','wheat']},now),`Your fields are ready at ${t}. Meanwhile: the fishing pond, a helping hand or wheat on an empty field.`);
 assert.equal(waitTipText({at,open:['pond','hand']},now),`Your fields are ready at ${t}. Meanwhile: the fishing pond or a helping hand.`);
 assert.equal(waitTipText({at,open:['pond','wheat']},now),`Your fields are ready at ${t}. Meanwhile: the fishing pond or wheat on an empty field.`);
 assert.equal(waitTipText({at,open:['hand','wheat']},now),`Your fields are ready at ${t}. Meanwhile: a helping hand or wheat on an empty field.`);
 assert.equal(waitTipText({at,open:['pond']},now),`Your fields are ready at ${t}. Meanwhile: the fishing pond.`);
 assert.equal(waitTipText({at,open:['hand']},now),`Your fields are ready at ${t}. Meanwhile: a helping hand.`);
 assert.equal(waitTipText({at,open:['wheat']},now),`Your fields are ready at ${t}. Meanwhile: wheat on an empty field.`);
 assert.equal(waitTipText({at,open:[]},now),`Your fields are ready at ${t}.`,'nothing open: only the time');
 // Another day: "tomorrow at".
 const late=new Date(2026,9,16,23,55).getTime(),next=late+15*60000;
 assert.equal(waitTipText({at:next,open:['hand']},late),`Your fields are ready tomorrow at ${clock(next)}. Meanwhile: a helping hand.`);
 const s2=farmer();plant(s2,'corn',[0,1,2,3,4],late+2*86400000);assert.match(waitTipText(waitTip(s2,'corn',late+2*86400000),late+2*86400000),/^Your fields are ready tomorrow at /);
});

test('2. once a day on this device, in memory where storage is blocked; quiet in the admin view and the village',()=>{
 const s=farmer();plant(s,'corn',[0,1,2,3,4],later);
 const shown=[],store=memory(),tip=createWaitTip({state:s,now:()=>later,show:m=>shown.push(m),storage:store});
 assert.equal(tip.planted('corn'),true);assert.equal(shown.length,1);assert.match(shown[0],/^Your fields are ready at /);
 assert.equal(store.m.get(WAIT_TIP_KEY),new Date(later).toDateString(),'its own key');
 assert.ok(read('public/privacy.html').includes(`<code>${WAIT_TIP_KEY}</code>`),'the device key is on the privacy page');
 assert.equal(tip.planted('corn'),false);assert.equal(shown.length,1,'not twice the same day');
 // The same device later that day (a reload): still nothing; the next day again.
 let t=later+60000;const again=createWaitTip({state:s,now:()=>t,show:m=>shown.push(m),storage:store});
 assert.equal(again.planted('corn'),false);
 t=later+86400000;s.plots=s.plots.map(p=>({...p,crop:null,readyAt:0,plantedAt:0}));plant(s,'corn',[0,1,2,3,4],t);assert.equal(again.planted('corn'),true);assert.equal(shown.length,2);
 // A planting that does not call for it does not use up the day.
 const q=farmer(),out=[],fresh=createWaitTip({state:q,now:()=>later,show:m=>out.push(m),storage:memory()});
 plant(q,'corn',[0,1,2],later);assert.equal(fresh.planted('corn'),false);
 plant(q,'corn',[3,4],later);assert.equal(fresh.planted('corn'),true);assert.equal(out.length,1);
 // Blocked storage (every access throws) or none at all: once a day in memory.
 for(const storage of [{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}},null]){
  const seen=[],blocked=createWaitTip({state:s,now:()=>t,show:m=>seen.push(m),storage});
  assert.equal(blocked.planted('corn'),true);assert.equal(blocked.planted('corn'),false);assert.equal(seen.length,1);
 }
 // Quiet (the admin view, the village): nothing, and the day stays free.
 let isQuiet=true;const quietOut=[],quiet=createWaitTip({state:s,now:()=>t,show:m=>quietOut.push(m),storage:memory(),quiet:()=>isQuiet});
 assert.equal(quiet.planted('corn'),false);assert.equal(quietOut.length,0);
 isQuiet=false;assert.equal(quiet.planted('corn'),true);
});

// The longest toasts in the game: the note stays 6 seconds (the game's toast passes the time on), and both words keep their own picture
// (toast-ui.js): the seeds for every crop chosen, the harvest for the note, also when it names a helping hand.
test('2. the note stays 6 seconds, and the seed shop\'s word and the note show the seeds and the harvest',()=>{
 const s=farmer();plant(s,'corn',[0,1,2,3,4],later);
 const calls=[];assert.equal(createWaitTip({state:s,now:()=>later,show:(...a)=>calls.push(a),storage:memory()}).planted('corn'),true);
 assert.equal(WAIT_TIP_SHOW_MS,6000);assert.deepEqual(calls[0][1],{duration:WAIT_TIP_SHOW_MS});
 assert.match(read('public/game.js'),/\nfunction toast\(message,options\)\{showToast\?\?=createToast\(\$\('toast'\)\);showToast\(message,options\);\}\n/,'the game\'s toast passes the time on');
 for(const key of ['wheat','lettuce','corn','barley'])assert.equal(toastParts(cropChoiceText(s,key,later)).icon,'seeds',key);
 const at=now+20*60000;
 for(const open of [['pond','hand','wheat'],['hand','wheat'],['hand'],['pond'],['wheat'],[]])for(const n of [now,now-86400000])assert.equal(toastParts(waitTipText({at,open},n)).icon,'harvest',open.join(' '));
});

test('2. game.js: the note after a planting tap and after a plant sweep, with the game\'s own toast, quiet in the admin view and the village',()=>{
 const game=read('public/game.js');
 assert.match(game,/\nimport \{ createWaitTip \} from '\.\/wait-tip\.js';\n/);
 assert.match(game,/\nconst waitTip=createWaitTip\(\{state,now:farmNow,show:toast,quiet:\(\)=>adminView\|\|villageWorld\}\);\n/);
 const interact=game.slice(game.indexOf('async function interact('),game.indexOf('\nfunction sweepAction('));
 assert.match(interact,/const result=await runAction\(\{type:'field',id,action,crop:selectedCrop\}\);[\s\S]*\n  const waited=action==='plant'&&waitTip\.planted\(state\.plots\[id\]\.crop\);\n[\s\S]*\}catch\(e\)\{toast\(e\.message\);/,'after a tap that planted');
 const endSweep=game.slice(game.indexOf('function endSweep('),game.indexOf('\nconst firstBasketWaits='));
 assert.match(endSweep,/\n if\(action==='plant'&&!result\.short\)waitTip\.planted\(result\.crop\);\n/,'after a plant sweep; "Out of coins" keeps the toast');
 assert.match(endSweep,/if\(!result\)\{if\(run\.handle\.reason\)toast\(run\.handle\.reason\);return;\}[\s\S]*waitTip\.planted/,'only once the sweep was saved');
 // The page preloads the new module like every other (scripts/module-preload.mjs).
 assert.match(read('public/farm.html'),/<link rel="modulepreload" href="\/wait-tip\.js">/);
});

test('3. the seed shop\'s Quick tab: 5 minutes or less (wheat and lettuce); Hours from above 5 minutes to 8 hours',()=>{
 const tab=tab=>Object.keys(CROPS).filter(k=>seedTab(CROPS[k].duration)===tab).sort();
 assert.deepEqual(tab('quick'),['lettuce','wheat']);
 for(const key of ['corn','barley','cabbage','greenbeans','cauliflower'])assert.equal(seedTab(CROPS[key].duration),'later',key);
 assert.equal(seedTab(QUICK_CROP_MS),'quick');assert.equal(seedTab(QUICK_CROP_MS+1),'later');
 assert.equal(seedTab(28800000-1),'later');assert.equal(seedTab(28800000),'overnight');assert.equal(seedTab(CROPS.pumpkin.duration),'overnight');
 const ui=read('public/economy-ui.js');
 assert.match(ui,/\.filter\(\(\[,c\]\)=>seedFilter==='all'\|\|seedTab\(c\.duration\)===seedFilter\)/,'the list follows seedTab');
 assert.doesNotMatch(ui,/duration<=900000|duration>900000/,'no 15-minute boundary left');
 // The tabs seedTab names are the dialog's own, and no text about the tabs speaks of 15 minutes.
 const html=read('public/farm.html'),dialog=html.slice(html.indexOf('<dialog id="seed-dialog"'),html.indexOf('</dialog>',html.indexOf('<dialog id="seed-dialog"')));
 for(const key of ['quick','later','overnight'])assert.match(dialog,new RegExp(`data-seed-filter="${key}"`));
 assert.match(dialog,/<p>Quick crops for active play, longer ones for when you are away\.<\/p>/);
 assert.doesNotMatch(dialog,/15 ?m(in|inutes)?\b/);
 assert.match(read('public/wiki-content.js'),/Quick crops are good while you play; longer ones grow while you are away\./);
 assert.doesNotMatch(read('public/wiki-content.js'),/[Qq]uick crops[^.]*15 minutes/);
});

test('the new words are in the catalog and every language has them, whole: the toasts translate as one text',()=>{
 const all=catalog(),at=now+20*60000,t=clock(at);
 const english=[...['','pond','hand','wheat','pond hand','pond wheat','hand wheat','pond hand wheat'].flatMap(mix=>[now,now-86400000].map(n=>{const open=mix?mix.split(' '):[];return [waitTipText({at,open},n),open,n];}))];
 const keys=[...new Set(english.map(([text])=>text.replace(t,'{0}')))];
 assert.equal(keys.length,16,'8 mixes, today and tomorrow');
 const choice='{0} selected: ready in {1}, good before a break. Playing on? {2} is ready in {3}.';
 for(const key of [...keys,choice,'{0} selected. Choose an empty field to plant.'])assert.ok(key in all,key);
 const seed=farmer({level:5}),choiceText=cropChoiceText(seed,'corn',later);
 for(const {code} of LANGUAGES.filter(l=>l.code!=='en'&&l.ready)){
  const dict=translations(code),tr=createTranslator(dict,code);
  for(const key of [...keys,choice])assert.equal(typeof dict[key],'string',`${code}: ${key}`);
  // The toast as the game writes it, translated whole (no shorter sentence takes the time and the rest with it).
  for(const [text] of english){const key=text.replace(t,'{0}');assert.equal(tr.translate(text),dict[key].replace('{0}',t),`${code}: ${text}`);}
  const out=tr.translate(choiceText);
  assert.ok(out&&out.includes(dict.Corn)&&out.includes(dict.Wheat)&&!/selected|Playing on|before a break/.test(out),`${code}: ${out}`);
 }
});
