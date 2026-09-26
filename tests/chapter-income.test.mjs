import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHAPTER_STALL_INCOME,chapterIncome,PROJECTS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 26 Sep 2026: a tester paid 45,000 coins and goods for chapter 4 and got 6 coins an hour, 300 days to earn it back.
test('each estate chapter adds more to the stall: about a month of the stall pays back its coins',()=>{
 assert.equal(CHAPTER_STALL_INCOME.length,PROJECTS.length);
 assert.deepEqual(CHAPTER_STALL_INCOME,[10,20,30,60,180,500,900,1400,2200,3400]);
 for(let i=1;i<CHAPTER_STALL_INCOME.length;i++)assert.ok(CHAPTER_STALL_INCOME[i]>CHAPTER_STALL_INCOME[i-1],'every chapter adds more');
 for(let i=3;i<PROJECTS.length;i++){const days=PROJECTS[i].coins/CHAPTER_STALL_INCOME[i]/24;assert.ok(days>25&&days<40,`chapter ${i+1}: ${days.toFixed(0)} days`);}
 assert.deepEqual([0,3,4,10,99].map(chapterIncome),[0,60,120,8700,8700]);
 const ui=read('public/growth-ui.js');
 assert.match(ui,/This chapter adds <b>\+\$\{number\(CHAPTER_STALL_INCOME\[state\.estate\.completed\]\)\} coins\/hour<\/b> to your stall, for good\./);
 assert.match(ui,/and \+\$\{number\(r\.income\)\} coins\/hour at your stall\./);assert.doesNotMatch(ui,/6 coins\/hour/);
 assert.match(read('public/wiki-content.js'),/Each finished chapter adds coins an hour to your stall for good, more for every chapter/);
});
