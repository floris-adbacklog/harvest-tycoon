import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderCue,CUE_ORDER,CUE_LENGTH} from '../public/sound-kit.js';
import {soundForAction,SOUND_CUES} from '../public/farm-audio.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 27 Sep 2026: every moment that was silent or borrowed another's sound got its own.
const OWN={construct:'construct',finish_crop:'finish',finish_batch:'finish',quest:'quest',delivery:'delivery',stall_collect:'stall',buy_boost:'boost',expand:'expand',valley_sell:'valley',fair_enter:'fair',improve:'improve',
 // The market square (Oct 2026): helping a villager sounds like a sold basket, a golden brief like a new building.
 village_deliver:'valley',village_build:'construct'};

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
