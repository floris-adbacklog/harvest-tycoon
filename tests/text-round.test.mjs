// Plan F, proposal 5 (13 Oct 2026, the owner's yes): one text round, so nothing in the first levels looks broken or goes unexplained. Each
// rule is said on the screen that shows it; the release needs no new rule, reward or unlock.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,xpForLevel,QUESTS,questXp,QUEST_XP,CROP_LEVELS,FEATURE_LEVELS,STARTER_KEEP,ROOKIE_MS} from '../public/farm-state.js';
import {LOADING_TIPS} from '../public/loading-screen.js';
import {EVENTS_LEVEL} from '../public/live-events-ui.js';
import {createEconomyUI} from '../public/economy-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,13,12);
// A small page for the screens' own code: every element of farm.html by its id, and each id a screen writes into its markup (as the
// browser would make it; one that is never written stays missing, so a screen that reads it breaks here as it would there). A list of
// [data-…] buttons comes from the markup, with their data and the onclick a screen gives them.
function page(){
 const byId=new Map();
 const register=html=>{for(const [,id] of html.matchAll(/\sid="([^"]+)"/g))element(id);};
 const buttons=(html,selector)=>{
  const [,attr]=selector.match(/^\[(data-[a-z-]+)\]$/)??[];if(!attr)return [];
  return [...html.matchAll(new RegExp(`<[a-z]+[^>]*\\s${attr}(?:="[^"]*")?[^>]*>`,'g'))].map(([tag])=>({tag,disabled:/\sdisabled[\s>]/.test(tag),onclick:null,addEventListener(type,fn){this.onclick=fn;},closest:()=>element(),
   dataset:Object.fromEntries([...tag.matchAll(/\sdata-([a-z-]+)(?:="([^"]*)")?/g)].map(([,k,v])=>[k.replace(/-([a-z])/g,(m,c)=>c.toUpperCase()),v??'']))}));
 };
 function element(id){
  const e={id,hidden:false,disabled:false,textContent:'',className:'',dataset:{},style:{},open:false,scrollTop:0,html:'',found:{},
   classList:{toggle(){},add(){},remove(){},contains:()=>false},lastChild:{textContent:''},append(){},
   addEventListener(type,fn){e.onclick=fn;},removeEventListener(){},setAttribute(){},removeAttribute(){},getAttribute:()=>null,hasAttribute:()=>false,
   closest:()=>element(),querySelector:()=>element(),querySelectorAll:selector=>e.found[selector]??=buttons(e.html,selector),
   showModal(){e.open=true;},close(){e.open=false;},getBoundingClientRect:()=>({width:0,height:0}),
   get innerHTML(){return e.html;},set innerHTML(value){e.html=String(value);e.found={};register(e.html);},
   insertAdjacentHTML(where,html){e.html=where==='afterbegin'?html+e.html:e.html+html;e.found={};register(html);}};
  if(id)byId.set(id,e);return e;
 }
 for(const [,id] of read('public/farm.html').matchAll(/\sid="([^"]+)"/g))element(id);
 return {byId,document:{getElementById:id=>byId.get(id)??null,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>element()}};
}
// Runs fn with the page as the document; the square's 30-second redraw is not started (it would keep the test running).
async function withPage(fn){
 const p=page(),saved={document:globalThis.document,setTimeout:globalThis.setTimeout};
 globalThis.document=p.document;globalThis.setTimeout=()=>0;
 try{return await fn(p);}finally{globalThis.document=saved.document;globalThis.setTimeout=saved.setTimeout;if(saved.document===undefined)delete globalThis.document;}
}
const economyUI=s=>createEconomyUI({state:s,onChange(){},onCrop(){},onExpand(){},notify(){},runAction:async()=>({}),onEstate(){},onFamily(){},onPlace(){}});
const quest=title=>QUESTS.find(q=>q.title===title);

test('quests: Room for more names field 13, the tractor has its own quest, the Feed Mill and the Dairy Barn have their whole names',()=>{
 assert.equal(quest('Room for more').description,'Unlock field 13 at the Farmhouse.');
 // Fields 9 to 12 are no expansion: after them the quest still says 0 / 1, now with the field it means.
 const s=createFarm(now);s.coins=1e5;s.xp=xpForLevel(6);normalizeFarm(s,now);
 for(let i=0;i<4;i++)act(s,{type:'expand'},now);assert.equal(s.plots.length,12);assert.equal(s.stats.expansions,0);
 s.inventory.wheat=50;s.inventory.corn=50;act(s,{type:'expand'},now);assert.equal(s.plots.length,13);assert.equal(s.stats.expansions,1);
 assert.equal(quest('Tractor time').description,'Use the tractor 5 times.');assert.ok(!QUESTS.some(q=>q.title==='A helping hand'),'one name for the helping hand');
 assert.equal(quest('Feed the flock').description,'Make 6 animal feed at the Feed Mill.');assert.equal(quest('Say cheese').description,'Collect 2 cheese from the Dairy Barn.');
 assert.ok(!QUESTS.some(q=>/the (Mill|Dairy)\b(?! Barn)/.test(q.description)));
 const one=read('public/farm-state.js');assert.equal(read('game/farm-state.js'),one);assert.equal(read('supabase/functions/farm-api/farm-state.js'),one);
});

test('the wiki: the 20 starter quests give coins only, the others 15 XP up to 1,000 coins',()=>{
 const starters=QUESTS.filter(q=>questXp(q)===0);assert.equal(starters.length,20);assert.ok(starters.every(q=>q.xp===0));
 assert.ok(QUESTS.filter(q=>q.xp===undefined&&q.reward<=1000).every(q=>questXp(q)===QUEST_XP));
 assert.match(read('public/wiki-content.js'),/\['trophy','Bigger quests, more XP',`The \$\{QUESTS\.filter\(q=>q\.xp===0\)\.length\} small starter quests give coins only\. Other quests up to \$\{number\(1000\)\} coins give \$\{QUEST_XP\} XP; bigger ones give more, up to 250 XP for the biggest\.`\]/);
});

test('loading tips say the level of what opens later, as the rules have it, and every page starts with the same apple tip',()=>{
 const tip=key=>LOADING_TIPS.find(([picture])=>picture===key)[1];
 assert.equal(tip('live-events'),`From level ${EVENTS_LEVEL} a new event starts every hour: finish its goal for diamonds.`);   // hourly events, 20 Oct 2026
 assert.equal(tip('chore-weeds'),`From level ${FEATURE_LEVELS.chores} farm chores pay coins and XP, and sometimes find extra crops.`);
 assert.equal(tip('apples'),`From level ${CROP_LEVELS.apples} apple trees grow back after you pick them, and from level ${CROP_LEVELS.berries} berry bushes too.`);
 for(const page of ['farm','play','crazygames','kongregate','discord'])assert.ok(read(`public/${page}.html`).includes(`<span id="loading-tip-text">${tip('apples')}</span>`),page);
});

test('a building not built yet: Makes lists what it makes then, Coming later the rest with its level, and the recipes are counted as they are',()=>withPage(p=>{
 const s=createFarm(now);s.coins=5000;s.xp=xpForLevel(6);s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};for(const k of ['mill','dairy'])s.buildings[k].built=true;normalizeFarm(s,now);
 economyUI(s).openBuilding('windmill');const html=p.byId.get('building-content').innerHTML;
 const makes=html.slice(html.indexOf('<div class="build-makes"><span>Makes</span>'),html.indexOf('<div class="build-makes build-later">'));
 assert.match(makes,/Grain meal/);assert.match(makes,/Flour/);assert.doesNotMatch(makes,/Natural fertilizer|Animal feed/);
 assert.match(html,/<div class="build-makes build-later"><span>Coming later<\/span><div><b title="Natural fertilizer">.*Natural fertilizer<small>Level 14<\/small><\/b><b title="Animal feed">.*Animal feed<small>Level 18<\/small><\/b><\/div><\/div>/);
 assert.match(html,/<summary>See the 2 recipes you can make now<\/summary>/);
 // A building whose recipes are all open says all of them, as before.
 economyUI(s).openBuilding('bakery');const bakery=p.byId.get('building-content').innerHTML;assert.doesNotMatch(bakery,/build-later/);
 assert.match(read('public/retention.css'),/#building-content \.build-later b\{border-style:dashed;/);
}));

test('Market opens on Crops when Farm goods has nothing to sell, and the kept starter stock says what it is for',()=>withPage(p=>{
 const s=createFarm(now);s.xp=xpForLevel(4);s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};normalizeFarm(s,now);
 const economy=economyUI(s);economy.openMarket('goods');assert.match(p.byId.get('sell-all').textContent,/Sell all goods/);
 s.inventory.eggs=0;s.inventory.feed=0;s.inventory.milk=0;economy.renderMarket({opening:true});assert.match(p.byId.get('sell-all').textContent,/Sell all crops/,'empty goods: Crops');
 economy.openMarket('goods');s.inventory.eggs=3;economy.renderMarket({opening:true});assert.match(p.byId.get('sell-all').textContent,/Sell all goods/,'eggs to sell: it stays');
 economy.renderMarket();assert.match(p.byId.get('sell-all').textContent,/Sell all goods/,'a tab picked by hand stays while the window is open');
 assert.match(read('public/game.js'),/if\(id==='market-dialog'\)economy\.renderMarket\(\{opening:true\}\);\$\(id\)\.showModal\(\);/);
 // The starter corn is kept for the first half hour: the line says why.
 const fresh=createFarm(Date.now());fresh.xp=xpForLevel(2);normalizeFarm(fresh,Date.now());fresh.inventory.corn+=3;assert.ok(STARTER_KEEP.corn>0&&ROOKIE_MS===30*60000);
 const m=economyUI(fresh);m.openMarket('crops');assert.match(p.byId.get('market-items').innerHTML,/<small class="market-kept">8 kept for your first buildings, free in /);assert.match(p.byId.get('market-items').innerHTML,/<span>8 kept for your first buildings, free in /);
}));

test('the care step: Show me with nothing growing points to planting, or to harvesting when no field is empty',()=>{
 const game=read('public/game.js');
 assert.match(game,/if\(target==='tend'&&!state\.plots\.some\(p=>p\.crop&&p\.readyAt>farmNow\(\)\)\)\{const empty=state\.plots\.some\(p=>!p\.crop\);if\(empty\)setCrop\('wheat'\);else setTool\('harvest'\);focusFields\(\);toast\(empty\?'Plant wheat first: its care marker comes while it grows\.':'Harvest a ripe crop first, then plant one: care is for a crop that grows\.'\);return;\}/);
 // It comes before the usual Care pointer, which still says to tap a crop with a care marker when something grows.
 assert.ok(game.indexOf("if(target==='tend'&&!state.plots.some(")<game.indexOf("target==='tend'?'Tap a growing crop with a care marker.'"));
});

test('the daily gift on a phone: the boost badge of days 3, 5 and 7 sits on the top edge, clear of the day\'s name',()=>{
 assert.match(read('public/retention.css'),/@media\(max-width:560px\)\{#daily-gift \.streak-day\{padding-top:12px\}#daily-gift \.streak-boost\{top:-10px;inset-inline-end:auto;left:50%;width:20px;height:20px;transform:translateX\(-50%\)\}/);
});
