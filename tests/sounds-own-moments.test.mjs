import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderCue,CUE_ORDER,CUE_LENGTH} from '../public/sound-kit.js';
import {soundForAction,SOUND_CUES} from '../public/farm-audio.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 27 Sep 2026: every moment that was silent or borrowed another's sound got its own.
const OWN={construct:'construct',finish_crop:'finish',finish_batch:'finish',quest:'quest',delivery:'delivery',stall_collect:'stall',buy_boost:'boost',expand:'expand',valley_sell:'valley',fair_enter:'fair',improve:'improve',
 // The market square (Oct 2026): helping a villager sounds like a sold basket, a golden brief like a new building; a finished landmark
 // like a lasting improvement.
 village_deliver:'valley',village_build:'construct',landmark_finish:'improve',
 // Seed Lab heirlooms collected (28 Oct 2026, the owner): a seed pod, a glass jar, two bells.
 lab_collect:'heirloom'};

test('each of these moments has its own sound, and a level-up still comes first',()=>{
 for(const [type,cue] of Object.entries(OWN))assert.equal(soundForAction({type},{},5,5),cue,type);
 assert.equal(soundForAction({type:'depot_load'},{shipped:true},5,5),'depot','a full trailer leaves with a horn');
 assert.equal(soundForAction({type:'depot_load'},{shipped:false},5,5),'produce','a part load is crates going on');
 assert.equal(soundForAction({type:'quest'},{},5,6),'levelup');
 assert.equal(soundForAction({type:'sell'},{},5,5),'sell','selling keeps its coins');
 assert.equal(soundForAction({type:'village_skip'},{},120,120),null,'"Not now" is quiet');
});

test('the new sounds are made like the others: short, never clipping, with plain notes until they are ready',()=>{
 for(const cue of [...new Set(Object.values(OWN)),'depot','message','purchase']){
  assert(CUE_ORDER.includes(cue)&&CUE_LENGTH[cue]<=1.45&&SOUND_CUES[cue],cue);
  const samples=renderCue(cue,24000);assert(samples.some(v=>Math.abs(v)>.01),`${cue} is audible`);assert(samples.every(v=>Math.abs(v)<=.5),`${cue} does not clip`);
 }
 assert.ok(CUE_LENGTH.message<.6,'a message ding stays small');
});

test('a private message from someone else and a confirmed purchase play their sound through the farm\'s audio',()=>{
 assert.match(read('public/game.js'),/window\.harvestSound=kind=>farmAudio\.play\(kind\);/);
 assert.match(read('src/chat-ui.js'),/if\(m\.sender!==me&&\(m\.channel\.startsWith\('dm:'\)\|\|m\.channel==='crew'\|\|forMe\)\)win\.harvestSound\?\.\('message'\);/,'a private message, one in the staff\'s Crew, or a mention of you (3 Oct 2026)');
 assert.match(read('src/payment-ui.js'),/window\.harvestSound\?\.\('purchase'\);\n    window\.dispatchEvent\(new Event\('harvest-purchase-confirmed'\)\);/);
});

// The village's later levels (Oct 2026): the Help that opens the market crate, sowing in the Village Fields, the town boat and the
// landmarks each sound like their moment, with cues that exist; the Great Hall's bell is a cue of its own.
test('the market crate, the Village Fields, the town boat and the landmarks have their sounds, and the Great Hall a bell',()=>{
 assert.equal(soundForAction({type:'village_deliver'},{crate:10},120,120),'diamond','the Help that opens the market crate');
 assert.equal(soundForAction({type:'village_deliver'},{crate:0},120,120),'valley');
 assert.equal(soundForAction({type:'produce'},{building:'villagefields'},120,120),'plant','sowing in the Village Fields');
 assert.equal(soundForAction({type:'produce'},{building:'coop'},120,120),'produce');
 assert.equal(soundForAction({type:'boat_load'},{sailed:true},150,150),'depot','a full boat sails with the horn');
 assert.equal(soundForAction({type:'boat_load'},{sailed:false},150,150),'produce','a part load is crates going on');
 assert.equal(soundForAction({type:'boat_skip'},{},150,150),null,'turning a cargo down is quiet');
 assert.equal(soundForAction({type:'landmark_give'},{},170,170),'produce');
 assert.equal(soundForAction({type:'landmark_finish'},{},170,170),'improve');
 assert.equal(soundForAction({type:'landmark_finish'},{},199,200),'levelup','a level-up still comes first');
 assert(CUE_ORDER.at(-1)==='bell'&&CUE_LENGTH.bell<=1.45&&SOUND_CUES.bell,'the bell: made last, short, with plain notes until it is ready');
 const samples=renderCue('bell',24000);assert(samples.some(v=>Math.abs(v)>.01),'audible');assert(samples.every(v=>Math.abs(v)<=.5),'never clips');
});
