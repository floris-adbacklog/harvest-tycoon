import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderFamilyStats,familyHistory,familyTrend,memberSplit} from '../public/family-stats.js';
import {renderFamilyTournament} from '../public/family-tournament.js';
import {art} from '../public/visual-icons.js';
import {FAMILY_MIN_LEVEL,emptyFamilyContext,familyMutate,familyWeek,familyWeekStart,familyPublicView,createFarm,normalizeFarm,xpForLevel} from '../public/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const text=html=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

// The Farm Family window (5 Oct 2026): a fifth tab, Stats (public/family-stats.js), the texts that no longer matched the rules, and
// Previous weeks grouped per week. The views are written out by hand, as familyPublicView sends them, with and without the fields
// the server added for the Stats tab, so the window is tested on its own.
const now=Date.parse('2026-10-05T12:00:00Z'),week=familyWeek(now);
const member=(id,name,points,order,goods,chest,extra={})=>({id,playerId:id,username:name,avatarId:'default',level:20,online:false,points,orderPoints:order,extraPoints:goods,chestPoints:chest,role:'member',top:false,isSelf:false,...extra});
function fullView(){
 return {family:{id:'home',name:'Meadow Friends'},yourPoints:3760,yourOrderPoints:3120,extraUsed:640,chest:{points:4910,mine:1140,minPoints:300,tiers:[]},
  members:[member('me','Lucky Orchard',3760,3120,640,1140,{isSelf:true}),member('rosa','Rosa',5400,5400,0,2310,{top:true}),member('jens','Jens',1560,1260,300,180),member('mila','Mila',0,0,0,420)],
  lastWeek:{week:week-1,points:2000,rank:5,chestPoints:980},
  tournament:{yourRank:4,rankOf:14,familyPoints:10720,pointsBehind:1200,pointsAhead:350,familyDiamonds:85,yourDiamonds:29,entered:true,placePrizes:[213,145,111,85,68,59,51,42,42,34],activeFamilies:14,top:[],past:[],
   history:[{week:week-1,rank:5,points:9000,diamonds:1250,activeMembers:4,families:14},{week:week-2,rank:7,points:7000,diamonds:51,activeMembers:3,families:12},{week:week-3,rank:3,points:12000,diamonds:111,activeMembers:4,families:null}]}};
}

test('the Stats tab: your family\'s place of how many, the gaps either side, the prize now and yours', ()=>{
 const html=renderFamilyStats({view:fullView()}),words=text(html);
 assert.match(words,/Your family this week/);assert.match(words,/#4 of 14/);
 assert.match(words,/10,720 points · 1,200 behind #3 · 350 ahead of #5/);
 assert.match(words,/85 family prize now/);assert.match(words,/29 for you now/);
 // From an older server: no rankOf (the families taking part), no pointsAhead (taken from the top ten when the next family is in it).
 const old=fullView();delete old.tournament.rankOf;delete old.tournament.pointsAhead;old.tournament.yourRank=1;old.tournament.top=[{points:10720},{points:9000}];
 assert.match(text(renderFamilyStats({view:old})),/#1 of 14 10,720 points · 1,720 ahead of #2/);
 // Last of all, and below the prizes: no family below, and the top ten named.
 const last=fullView();Object.assign(last.tournament,{yourRank:14,pointsAhead:null,familyDiamonds:0,yourDiamonds:0});
 const lastWords=text(renderFamilyStats({view:last}));assert.match(lastWords,/1,200 behind #13 0 family prize now The top ten win prizes\./);assert.doesNotMatch(lastWords,/ahead of #15/);
});

test('the Stats tab: you, with order and goods, chest points against the 300 and your part of the family\'s points; your last week', ()=>{
 const words=text(renderFamilyStats({view:fullView()}));
 assert.match(words,/3,760 tournament points 3,120 order · 640 goods/);
 assert.match(words,/1,140 chest points ✓ You share in every chest/);
 assert.match(words,/35% of your family’s points/,'3,760 of 10,720');
 assert.match(words,/Last week: 2,000 tournament points · your family was #5 · 980 chest points/);
 const short=fullView();short.members[0].chestPoints=120;short.lastWeek=null;
 const shortWords=text(renderFamilyStats({view:short}));assert.match(shortWords,/120 chest points 180 more to share in the chests/);assert.doesNotMatch(shortWords,/Last week/);
});

test('the Stats tab: every farmer by tournament points with order, goods and chest bars; the crown is "Most chest points"', ()=>{
 const html=renderFamilyStats({view:fullView()});
 const names=[...html.matchAll(/<span translate="no">([^<]+)<\/span>/g)].map(m=>m[1]);
 assert.deepEqual(names,['Rosa','Lucky Orchard','Jens','Mila'],'most tournament points first; a name is the player\'s own word');
 assert.match(html,/<li class="family-stats-farmer is-self">/);
 assert.match(text(html),/Rosa Most chest points 5,400 order · 0 goods · 2,310 chest 5,400 points/);
 assert.match(html,/<i class="is-order" style="width:58%"><\/i><i class="is-goods" style="width:12%"><\/i>/,'3,120 and 640 of the best 5,400');
 assert.match(html,/<span class="family-stats-bar is-chest" aria-hidden="true"><i style="width:18%"><\/i><\/span>/,'420 of the most chest points, 2,310');
 assert.match(text(html),/Order and goods points count for the tournament\. Chest points come from everything you do on your farm: from 300 you share in every chest\./);
 // A server that does not split the points yet: your own split from the old fields, the others' total only.
 const old=fullView();for(const m of old.members){delete m.orderPoints;delete m.extraPoints;delete m.chestPoints;}
 assert.deepEqual(memberSplit(old,old.members[0]),{points:3760,order:3120,goods:640,chest:1140,split:true});
 assert.deepEqual(memberSplit(old,old.members[1]),{points:5400,order:null,goods:null,chest:null,split:false});
 const oldHtml=renderFamilyStats({view:old});assert.match(oldHtml,/<i class="is-order" style="width:100%"><\/i><\/span>\s*<\/div>/,'Rosa: one bar for her total, no empty line under it');
});

test('the Stats tab: your last weeks, newest first, of how many families, diamonds formatted, and the trend in one line', ()=>{
 const html=renderFamilyStats({view:fullView()}),words=text(html);
 assert.match(words,/Your last weeks Up 2 places on the week before\. Week of Place Points Family prize/);
 const day=w=>new Date(familyWeekStart(w)).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'});
 assert.match(words,new RegExp(`Family prize ${day(week-1)} #5 of 14 9,000 1,250 ${day(week-2)} #7 of 12 7,000 51 ${day(week-3)} #3 12,000 111`),'no "of" when the count is unknown');
 assert.equal(familyTrend([{rank:2},{rank:5}]),'Up 3 places on the week before.');assert.equal(familyTrend([{rank:4},{rank:5}]),'Up 1 place on the week before.');
 assert.equal(familyTrend([{rank:3},{rank:3}]),'The same place as the week before.');assert.equal(familyTrend([{rank:3}]),'');
 // From an older server: this family's rows in the four weeks of results, with the families ranked that week counted.
 const old=fullView();delete old.tournament.history;
 old.tournament.past=[{week:week-1,familyId:'other',rank:1,points:9,diamonds:5},{week:week-1,familyId:'home',rank:2,points:8,diamonds:3},{week:week-2,familyId:'home',rank:1,points:7,diamonds:2}];
 assert.deepEqual(familyHistory(old).map(r=>[r.week,r.rank,r.families]),[[week-1,2,2],[week-2,1,1]]);
 const many=fullView();many.tournament.history=Array.from({length:10},(_,i)=>({week:week-1-i,rank:1,points:1,diamonds:1,families:1}));
 assert.equal(familyHistory(many).length,8,'at most eight weeks');
});

test('the Stats tab when nothing has happened yet: no delivery this week, no finished week, a farmer with no points', ()=>{
 const view=fullView();Object.assign(view.tournament,{yourRank:null,pointsAhead:null,familyPoints:0,familyDiamonds:0,yourDiamonds:0,entered:false,history:[]});
 for(const m of view.members)Object.assign(m,{points:0,orderPoints:0,extraPoints:0});
 const html=renderFamilyStats({view}),words=text(html);
 assert.match(words,/Nobody in your family has delivered yet\. The first delivery to the Family Order enters the tournament\./);
 assert.match(html,/<button type="button" class="small-button" data-family-goto="week">Go to the Family Order<\/button>/,'one tap to the order');
 assert.match(words,/No results yet\. A week your family delivers in shows here once it ends, on Monday at 00:00 UTC\./);
 assert.match(words,/0% of your family’s points/);assert.doesNotMatch(html,/NaN|undefined|Infinity/);
 // The bare minimum a view can have (an older server, a family of one): it still draws.
 const bare=renderFamilyStats({view:{family:{id:'x'},members:[{id:'a',username:'Ann',points:0,isSelf:true}],tournament:{}}});
 assert.doesNotMatch(bare,/NaN|undefined|Infinity/);assert.match(text(bare),/Ann \(you\)/);
});

test('the Stats tab draws from the real view of a family that has delivered', ()=>{
 const farm=()=>{const s=createFarm(now);s.xp=xpForLevel(FAMILY_MIN_LEVEL+10);s.stats.bread=1;s.stats.made_bread=1;s.stats.sold_eggs=1;return normalizeFarm(s,now);};
 let c=emptyFamilyContext();c.players.push({player_id:'ann',username:'Ann',level:20},{player_id:'bob',username:'Bob',level:20});
 const run=(p,a,s=farm())=>{const r=familyMutate(c,s,p,a,now);c=r.context;return r;};
 run('ann',{type:'family_create',name:'Meadow Friends',emblem:'0'});run('bob',{type:'family_join',familyId:c.families[0].id});
 const [item]=Object.keys(c.orders[0].lines),s=farm();s.inventory[item]=2;run('ann',{type:'family_contribute',week,item,count:2},s);
 const html=renderFamilyStats({view:familyPublicView(c,'ann',farm(),now)});
 assert.match(text(html),/#1 of 1/);assert.doesNotMatch(html,/NaN|undefined|Infinity/);
 assert.ok(html.indexOf('>Ann<')<html.indexOf('>Bob<'),'Ann delivered, so she comes first');
});

test('the window has five tabs, Stats last with an existing picture, and the Stats tab is drawn by family-stats.js', ()=>{
 const html=read('public/farm.html'),ui=read('public/family-ui.js'),css=read('public/family.css');
 assert.match(html,/<button role="tab" data-family-tab="stats" aria-selected="false"><i data-game-art="log"><\/i><span>Stats<\/span><\/button><\/div>/,'no "!" on Stats: nothing waits there');
 assert.match(art('log'),/\/assets\/icons\/log\.webp/,'the farm log\'s painted book, already WebP');
 assert.match(ui,/import \{renderFamilyStats\} from '\.\/family-stats\.js';/);assert.match(ui,/function stats\(\)\{return renderFamilyStats\(\{view\}\);\}/);
 assert.match(ui,/content\.querySelectorAll\('\[data-family-goto\]'\)\.forEach\(/,'every "go to" button works, not only the first');
 // Five tabs on a phone: each as wide as its word, a word of 12px under its picture, a long word breaks inside its own tab.
 assert.match(css,/#family-tabs button>span\{max-width:100%;overflow-wrap:anywhere;hyphens:auto\}/);
 assert.match(css,/@media\(max-width:720px\)\{#family-tabs button\{flex-direction:column;/);
});

test('the window\'s texts match the rules: leaving has no wait, the top ten win, the family level counts chests', ()=>{
 const ui=read('public/family-ui.js');
 assert.doesNotMatch(ui,/You wait 48 hours|cannot join another family for 48 hours|cannot join a family again|top three|raises the family level/);
 assert.match(ui,/'You can join or start another family straight away\.'/);
 assert.match(ui,/description:'You can join another family straight away\. Your points this week stay here\.'/);
 assert.match(ui,/description:`They can join another family straight away, but not this one for \$\{Math\.round\(FAMILY_CONFIG\.JOIN_COOLDOWN_MS\/3600000\)\} hours\.`/);
 assert.match(ui,/'Reach the top ten to win a prize\.'/);
 assert.match(ui,/Every chest your family opens counts towards the family level: \$\{num\(s\.tiers\)\} of \$\{num\(s\.next\)\} chests for level \$\{s\.level\+1\}\./);
 assert.match(ui,/Each level adds \$\{step\}% to the chest and the weekly order, up to \+\$\{max\}%\./);
});

test('Previous weeks: one group per week, newest first under its Monday, your family picked out, diamonds formatted', ()=>{
 const past=[{week:week-2,familyId:'b',name:'Corn Crew',rank:1,points:9000,diamonds:1500},{week:week-1,familyId:'home',name:'Meadow Friends',rank:2,points:8000,diamonds:1250},{week:week-1,familyId:'b',name:'Corn Crew',rank:1,points:9500,diamonds:2125},{week:week-2,familyId:'home',name:'Meadow Friends',rank:2,points:7000,diamonds:850}];
 const view={family:{id:'home'},endsAt:now,tournament:{past,top:[],placePrizes:[100],placeShares:[100],poolSteps:[100,200,300],firstPrize:100,firstPrizeMin:100,firstPrizeMax:5000,activeFamilies:2,activePlayers:3,pool:200,yourRank:null}};
 const html=renderFamilyTournament({view,now,emblem:()=>'',rewards:'',preview:''});
 const fold=html.slice(html.indexOf('<summary>Previous weeks</summary>'));
 const day=w=>new Date(familyWeekStart(w)).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'});
 assert.deepEqual([...fold.matchAll(/<h4>([^<]+)<\/h4>/g)].map(m=>m[1]),[`Week of ${day(week-1)}`,`Week of ${day(week-2)}`]);
 assert.match(text(fold),/Corn Crew 9,500 points 2,125 diamonds Meadow Friends Your family · 8,000 points 1,250 diamonds/,'first place first, the number formatted');
 assert.equal([...fold.matchAll(/class="family-list-row is-yours"/g)].length,2,'your family in every week it took part');
 assert.equal(text(renderFamilyTournament({view:{...view,tournament:{...view.tournament,past:[]}},now,emblem:()=>'',rewards:'',preview:''})).includes('Results appear after the first week ends.'),true);
});
