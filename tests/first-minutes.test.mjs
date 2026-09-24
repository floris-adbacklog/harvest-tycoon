import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction as act,BEGINNER_STEP_XP,BEGINNER_REWARD,FIRST_HARVEST_BONUS,RETURN_BOOST_MS,DAY_MS,harvestYield} from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
import {inAppName,chromeIntent,browserTipText,BROWSER_TIP_KEY} from '../src/browser-tip.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,24,12);

test('guide steps finish themselves with the action that does them, also steps done earlier',()=>{
 const s=createFarm(now),xp=s.xp;
 const r=act(s,{type:'field',id:0,action:'harvest'},now);
 assert.deepEqual(r.guide,[{step:'harvest',title:'Your first basket',xp:BEGINNER_STEP_XP}]);assert.equal(s.onboarding.completed,1);
 assert.equal(r.xp,s.xp-xp-BEGINNER_STEP_XP,'the harvest XP stays the harvest XP; the step XP is its own');
 // A farmer who did steps before this rule (they never pressed "Complete step") catches up with their next action.
 const stuck=createFarm(now);Object.assign(stuck.onboarding.milestones,{harvest:true,sell:true,plant:true});
 assert.deepEqual(act(stuck,{type:'field',id:6,action:'plant',crop:'wheat'},now).guide.map(g=>g.step),['harvest','sell','plant']);
});

test('the last step waits for its diamonds to be collected by hand',()=>{
 const s=createFarm(now);s.onboarding.completed=9;s.onboarding.milestones.collect=true;
 assert.equal(act(s,{type:'checkin'},now).guide,undefined);assert.equal(s.onboarding.completed,9);
 const diamonds=s.diamonds,r=act(s,{type:'beginner_claim',id:'collect'},now);
 assert.equal(r.diamonds,BEGINNER_REWARD);assert.equal(s.diamonds,diamonds+BEGINNER_REWARD+(r.levelReward?.diamonds??0),'plus a level reward if its XP makes a level');
});

test('the first harvest on a new farm is a golden one (3x), once; older farms are unchanged',()=>{
 const s=createFarm(now),corn=s.inventory.corn,one=harvestYield(s.plots[0]);
 const first=act(s,{type:'field',id:0,action:'harvest'},now);
 assert.equal(FIRST_HARVEST_BONUS,3);assert.equal(first.firstHarvest,3);assert.equal(first.quantity,one*3);assert.equal(s.inventory.corn,corn+one*3);
 const second=act(s,{type:'field',id:1,action:'harvest'},now);assert.equal(second.firstHarvest,undefined);assert.equal(second.quantity,harvestYield({...s.plots[1],crop:'corn'})||second.quantity);
 const legacy=createLegacyFarm(now);legacy.stats.harvested=0;assert.equal(act(legacy,{type:'field',id:0,action:'harvest'},now).firstHarvest,undefined);
});

test('coming back on a second day: the daily gift brings 30 minutes of double harvest, once',()=>{
 const s=createFarm(now);
 assert.equal(act(s,{type:'checkin'},now).returnBoost,undefined,'day 1: the promise');assert.equal(s.boosts.harvestUntil??0,0);
 const day2=now+DAY_MS,r=act(s,{type:'checkin'},day2);
 assert.equal(RETURN_BOOST_MS,30*60000);assert.equal(r.returnBoost,30);assert.equal(s.boosts.harvestUntil,day2+RETURN_BOOST_MS);
 assert.equal(act(s,{type:'checkin'},now+2*DAY_MS).returnBoost,undefined,'only once');
 assert.match(read('game/farm-state.js'),/Come back tomorrow for the next one and 30 minutes of double harvest\./,'the gift step says so');
});

test('the screens: steps announce themselves, the finale opens once, a promise at the end, the next unlock is shown',()=>{
 const guide=read('public/beginner-ui.js'),game=read('public/game.js'),progression=read('public/progression-ui.js');
 assert.match(guide,/\$\('claim-reward'\)\.hidden=!current\?\.ready;/,'no button for steps that finish themselves');
 assert.match(guide,/notify\(`✓ \$\{title\} · \+\$\{xp\} XP\.\$\{current\?` Next: \$\{current\.title\}\.`:''\}`\);/);
 assert.match(guide,/if\(current\?\.index===BEGINNER_QUESTS\.length-1&&current\.ready&&!finaleShown\)\{finaleShown=true;open\(\);\}/);
 assert.match(game,/beginner\?\.afterAction\(result\);/);
 assert.match(game,/onFinished:result=>giftPopup\(\{xp:result\.xp,diamonds:result\.diamonds\},\{eyebrow:'BEGINNER GUIDE COMPLETE',title:'Well done, farmer!',icon:'diamonds',text:comeBackNote\(\)\}\)/);
 assert.match(game,/Come back tomorrow for your next daily gift and 30 minutes of double harvest\./);
 assert.match(game,/if\(result\.firstHarvest\)\{particleBurst\(id,true\);toast\(`A golden first harvest: \$\{result\.firstHarvest\}× the crop!`\);\}/);
 assert.match(progression,/export const nextUnlock=state=>upcoming\(state\)\[0\]\?\?null;/);
 assert.match(progression,/Next at level \$\{next\.level\}: <strong>\$\{next\.name\}<\/strong>/,'on the level-up screen');
 assert.match(game,/\$\('level-next'\)\.textContent=next\?`Next at level \$\{next\.level\}: \$\{next\.name\}`:'';/,'and on the level card');
 assert.match(read('public/farm.html'),/<small id="level-next" class="level-next" hidden><\/small>/);
 assert.match(read('public/retention-ui.js'),/\$\{r\.returnBoost\?` Plus \$\{r\.returnBoost\} minutes of double harvest!`:''\}/);
 assert.match(read('public/rookie-ui.js'),/Come back tomorrow: your next daily gift brings 30 minutes of double harvest\./);
});

test('inside Instagram, Facebook or TikTok: one tip to open the game in the phone\'s own browser',()=>{
 assert.equal(inAppName('Mozilla/5.0 (iPhone) Instagram 300.0'),'Instagram');assert.equal(inAppName('Mozilla/5.0 [FBAN/FBIOS;FBAV/400]'),'Facebook');
 assert.equal(inAppName('Mozilla/5.0 (Linux; Android 14) musical_ly_2024'),'TikTok');
 assert.equal(chromeIntent('https://www.harvesttycoon.com/'),'intent://www.harvesttycoon.com/#Intent;scheme=https;package=com.android.chrome;end');
 assert.deepEqual([browserTipText('Android Instagram').action,browserTipText('iPhone Instagram').action],['Open in Chrome','Copy link']);
 assert.match(browserTipText('iPhone Instagram').text,/inside Instagram\. Open Harvest Tycoon in Safari so your farm is easy to find again\./);assert.match(browserTipText('Android FBAV').text,/Chrome so your farm is easy to find again and you get reminders/);
 assert.equal(BROWSER_TIP_KEY,'harvest-tycoon:browser-tip');
 assert.match(read('src/main.js'),/scheduleBrowserTip\(\{embedded:embeddedBrowser\(navigator\.userAgent\),doc:document,win:window,storage:store\}\);/);
 assert.match(read('public/privacy.html'),/<code>harvest-tycoon:browser-tip<\/code>/);
});

test('good news with "first" in it is not a warning; "Do this first." still is',async()=>{
 const {toastParts}=await import('../public/toast-ui.js');
 assert.equal(toastParts('✓ Your first basket · +15 XP. Next: Your first market sale.').tone,'reward');
 assert.notEqual(toastParts('A golden first harvest: 3× the crop!').tone,'warn');
 assert.equal(toastParts('Plant a crop in this field first.').tone,'warn');
});
