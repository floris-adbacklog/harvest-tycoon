import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,xpForLevel,applyFarmAction,medalsWaiting,FEATURE_NAMES,FEATURE_LEVELS,unlockEntries} from '../game/farm-state.js';
import {MEDAL_NAMES,newMedals,medalMessage,withMedals,createMedalNotice} from '../public/medal-notice.js';
import {toastParts} from '../public/toast-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,3,12);
function farm(level){const s=createFarm(now);s.xp=xpForLevel(level);s.rookieUntil=0;normalizeFarm(s,now);return s;}

// Oct 2026: a crop medal used to be silent until collected, and farmers on level 7-9 could not open Medals at all.
// 9 Oct 2026: Medals opens at level 14 (it was 7), so these farms are level 14.
test('a medal waits from its harvest until it is collected, only for crops the Medals list shows',()=>{
 const s=farm(14);
 assert.deepEqual(medalsWaiting(s),[]);
 s.mastery.harvests.wheat=25;assert.deepEqual(medalsWaiting(s),['wheat:0']);
 s.mastery.harvests.wheat=100;assert.deepEqual(medalsWaiting(s),['wheat:0','wheat:1']);
 applyFarmAction(s,{type:'mastery',crop:'wheat',tier:0},now);assert.deepEqual(medalsWaiting(s),['wheat:1'],'collected: no longer waiting');
 s.mastery.harvests.truffles=1000;assert.ok(!medalsWaiting(s).some(id=>id.startsWith('truffles:')),'a crop that is not open yet never lights the "!"');
});

test('the harvest that earns a medal names it once; before level 14 a medal waits quietly',()=>{
 const s=farm(14),before=medalsWaiting(s);
 s.mastery.harvests.wheat=24;s.plots[0]={...s.plots[0],crop:'wheat',plantedAt:now-3600000,readyAt:now-1,careAt:now-1};
 const was=medalsWaiting(s);applyFarmAction(s,{type:'field',id:0,action:'harvest'},now);
 assert.deepEqual(newMedals(was,s),[{crop:'wheat',tier:0}]);
 assert.deepEqual(newMedals(medalsWaiting(s),s),[],'already known: no second notice');
 assert.deepEqual(before,[]);
 const young=farm(13);young.mastery.harvests.corn=25;assert.deepEqual(newMedals([],young),[],'Medals opens at level 14');
 assert.equal(FEATURE_LEVELS.mastery,14);
});

test('the toast names the crop and the medal, or how many; it is good news with the medal picture',()=>{
 assert.equal(medalMessage([{crop:'wheat',tier:0}]),'Wheat: Bronze medal! Collect it in Medals.');
 assert.equal(medalMessage([{crop:'corn',tier:2},{crop:'wheat',tier:0}]),'2 new medals! Collect them in Medals.');
 assert.deepEqual(MEDAL_NAMES,['Bronze medal','Silver medal','Gold medal','Platinum medal']);
 const parts=toastParts(medalMessage([{crop:'wheat',tier:0}]));
 assert.equal(parts.icon,'medal-bronze');assert.notEqual(parts.tone,'warn');
 assert.equal(toastParts('Platinum medal collected! +100 coins and +25 XP.').icon,'medal-platinum','its own tier\'s picture (6 Oct 2026)');
 assert.equal(toastParts(medalMessage([{crop:'corn',tier:2},{crop:'wheat',tier:0}])).icon,'medal-gold','several: the gold one');
});

test('the four tier medals are painted WebP pictures, used on the Medals tab, the harvest chip, profiles and the leaderboard',async()=>{
 const {MEDAL_ART,artSource}=await import('../public/visual-icons.js');
 assert.deepEqual([...MEDAL_ART],['medal-bronze','medal-silver','medal-gold','medal-platinum']);
 for(const key of MEDAL_ART){assert.equal(artSource(key).src,`/assets/icons/${key}.webp`);assert.ok(existsSync(new URL(`../public/assets/icons/${key}.webp`,import.meta.url)),key);}
 assert.match(withMedals([{crop:'wheat',tier:3}],'x'),/data-art="medal-platinum"/);
 assert.match(read('public/growth-ui.js'),/<span class="mastery-medal\$\{t\.claimed\?' earned':''\}" title="\$\{t\.name\}: \$\{number\(t\.target\)\} harvests">\$\{art\(MEDAL_ART\[t\.id\]\)\}<\/span>/);
 assert.match(read('src/player-profiles.js'),/<span class="farmer-badge-art">\$\{art\(crop\)\}\$\{art\(MEDAL_ART\[best\],'farmer-badge-medal'\)\}<\/span>/);
 assert.match(read('public/rank-picker.js'),/badges:'medal-gold'/);assert.match(read('public/visual-icons.js'),/medal:'medal-gold'/,'every medal symbol (Medals in More, a project\'s medals) is the gold medal');
});

test('the chip sits on a line of its own over the harvest, one per tier, highest first',()=>{
 assert.equal(withMedals([],'<b>x</b>'),'<b>x</b>','no medal: the floating text is unchanged');
 const html=withMedals([{crop:'wheat',tier:0},{crop:'corn',tier:0},{crop:'barley',tier:2}],'<b>x</b>');
 assert.match(html,/^<span class="float-stack"><span class="float-row"><span class="float-chip is-medal tier-2">[\s\S]*<span>Gold medal<\/span><\/span><span class="float-chip is-medal tier-0">[\s\S]*<span>Bronze medal<\/span><b>×2<\/b><\/span><\/span><span class="float-row"><b>x<\/b><\/span><\/span>$/);
});

// A tiny page: one element for the toast and a list of open windows.
function page(){
 const listeners=[],open=[];
 const el={className:'toast medal-toast',innerHTML:'',offsetWidth:1,style:{setProperty(){}},classList:{set:new Set(),add(c){this.set.add(c);},remove(c){this.set.delete(c);}}};
 Object.defineProperty(el,'className',{get(){return ['toast medal-toast',...el.classList.set].join(' ');},set(v){el.classList.set=new Set(String(v).split(/\s+/).filter(c=>c&&c!=='toast'&&c!=='medal-toast'));}});
 const doc={querySelector:sel=>sel==='dialog[open]'&&open.length?{}:null,addEventListener:(type,fn)=>{if(type==='close')listeners.push(fn);}};
 return {el,doc,open,close(){open.pop();listeners.forEach(fn=>fn());}};
}
test('one toast for many medals, never under a window, and a medal collected meanwhile is left out',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const s=farm(14),p=page(),notice=createMedalNotice(p.el,{state:s,doc:p.doc});
 s.mastery.harvests.wheat=25;s.mastery.harvests.corn=25;
 notice.earned([{crop:'wheat',tier:0}]);notice.earned([{crop:'corn',tier:0}]);
 t.mock.timers.tick(800);
 assert.match(p.el.innerHTML,/2 new medals! Collect them in Medals\./);assert.ok(p.el.classList.set.has('visible'));assert.ok(p.el.classList.set.has('is-reward'));
 assert.ok(p.el.className.includes('medal-toast'),'it keeps its place at the bottom');
 // The tractor's window is open: the toast waits for it to close.
 p.el.innerHTML='';s.mastery.harvests.barley=25;p.open.push('tractor');
 notice.earned([{crop:'barley',tier:0}]);t.mock.timers.tick(5000);assert.equal(p.el.innerHTML,'');
 p.close();t.mock.timers.tick(500);assert.match(p.el.innerHTML,/Barley: Bronze medal! Collect it in Medals\./);
 // Collected before its toast could show: no toast.
 p.el.innerHTML='';s.mastery.harvests.lettuce=25;p.open.push('estate');notice.earned([{crop:'lettuce',tier:0}]);
 applyFarmAction(s,{type:'mastery',crop:'lettuce',tier:0},now);p.close();t.mock.timers.tick(500);assert.equal(p.el.innerHTML,'');
});

test('the game: the chip, the toast at the bottom, the "!" on the way to Medals and a Medals tile in More from level 14',()=>{
 const game=read('public/game.js'),growth=read('public/growth-ui.js'),html=read('public/farm.html'),mobile=read('public/mobile-ui.js');
 assert.match(game,/const runAction=withActionSounds\(async action=>\{const before=progressionSnapshot\(state\),medalsBefore=medalsWaiting\(state\);[^\n]*medalToast\(newMedals\(medalsBefore,state\)\);return result;\}/,'every action (a tap, the tractor) names a new medal');
 assert.match(game,/floatReward\(id,withMedals\(newMedals\(medalsBefore,state\),/,'the chip over a tap harvest');
 assert.match(game,/const medals=action==='harvest'\?newMedals\(run\.medals,state\):\[\];/,'a sweep: medals since it began');
 assert.match(game,/floatReward\(last,withMedals\(medals,[^\n]*\)\);medalToast\(medals\);\}/,'one toast for the whole sweep');
 assert.match(game,/key==='stall'\|\|key==='chores'\|\|key==='mastery'\)growth\.open\(key\)/);
 assert.match(html,/<section class="bottom-hud" aria-label="Tools and seeds">\n      <div id="medal-toast" class="toast medal-toast" role="status" aria-live="polite"><\/div>/);
 // Under On the farm, after Boosts (level 10) since Medals moved to level 14: the menu lists what is gated in the order it opens.
 assert.match(html,/<button data-menu-action="boosts-button">[^\n]*\n    <button data-menu-utility="mastery"><i data-lucide="medal"><\/i><span><strong>Medals<\/strong><small class="menu-hint">Rewards for every crop<\/small><\/span><\/button>/);
 assert.match(html,/<button data-estate-tab="mastery" aria-pressed="false">Medals<b class="estate-tab-dot" hidden>!<\/b><\/button>/);
 assert.match(growth,/const medals=featureUnlocked\(state,'mastery'\)&&medalsWaiting\(state\)\.length>0;/);
 assert.match(growth,/\[data-menu-utility="mastery"\]'\)\?\.classList\.toggle\('has-dot',medals\)/);
 assert.match(growth,/tabDot\.hidden=!medals;/);
 assert.match(mobile,/&&!medalWaiting&&!passWaiting&&/,'the More button lights on every screen');
 assert.match(read('public/retention.css'),/\.toast\.medal-toast\{top:auto;bottom:calc\(100% \+ 10px\)/);
});

test('Medals is called Medals everywhere: the level-up card, the menus, the wiki',()=>{
 assert.equal(FEATURE_NAMES.mastery,'Medals');
 assert.equal(unlockEntries(farm(13)).find(e=>e.id==='feature:mastery').name,'Medals','the level-up card at level 14');
 for(const file of ['game/farm-state.js','public/growth-ui.js','public/wiki-content.js','public/economy-ui.js','public/farm.html'])assert.doesNotMatch(read(file),/Crop mastery|mastery!|mastery medal|Full mastery|Projects & mastery|passive income and mastery/i,file);
 const wiki=read('public/wiki-content.js');
 assert.match(wiki,/section\('Medals',/);assert.match(wiki,/You collect each medal yourself in Medals \(on a phone: More → Medals; on a computer: Estate → Medals\)\. A yellow ! shows when one is waiting\./);
});
