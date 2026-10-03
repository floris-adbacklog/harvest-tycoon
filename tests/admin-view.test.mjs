import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createShowcaseFarm,SHOWCASE_LEVEL,normalizeFarm,levelOf,levelProgress,BUILDINGS,MAX_PLOTS,MAX_BUILDING_LEVEL,TOP_BUILDING_LEVEL,beyondMaxBuilding,medalsWaiting,QUESTS,dailyTasks,dailyOrders,grantLevelRewards,grantChapterRewards,fieldTapAction,productionJobs,beginnerProgress,rookieLeft,stallNotice,unlockEntries,worldTwoOpen,masterFree,createFarm} from '../public/farm-state.js';
import {createFarmClient,ADMIN_LOCKED} from '../public/farm-client.js';
import {ADMIN_TOOLS,startAdminView,markAdminView,statText,ONLINE_MINUTES} from '../src/admin-view.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The admin view (3 Oct 2026): an admin account opens a showcase farm at level 999 (farm-state.js createShowcaseFarm, built by farm-api on
// every load, never saved) with the staff's own topbar and menu (src/admin-view.js, public/admin-view.css). Everyone else: no change.
const NOW=Date.UTC(2026,9,3,12,0,0);

test('the showcase farm: level 999, every building built and at its top, all 40 fields, nothing waiting, the same after a second look',()=>{
 const s=createShowcaseFarm(NOW);
 assert.equal(SHOWCASE_LEVEL,999);assert.equal(levelOf(s),999);assert.equal(s.showcase,true);assert.ok(worldTwoOpen(s));
 const p=levelProgress(s);assert.equal(p.level,999);assert.ok(p.target>0&&p.current>=0&&p.current<p.target,'the XP bar has something to show');
 for(const [key,b] of Object.entries(BUILDINGS)){
  assert.equal(s.buildings[key].built,true,key);
  if(b.type==='production')assert.equal(s.buildings[key].level,beyondMaxBuilding(key)?TOP_BUILDING_LEVEL:MAX_BUILDING_LEVEL,key);
  if(b.type==='production')assert.ok(productionJobs(s.buildings[key]).length>0&&productionJobs(s.buildings[key]).every(j=>j.readyAt>NOW+3600000),`${key} busy for hours`);
 }
 assert.equal(s.plots.length,MAX_PLOTS);
 assert.ok(s.plots.every(p=>p.crop&&p.watered&&p.tended&&p.readyAt>NOW&&fieldTapAction(p,NOW)===null),'growing, cared for, not ripe: a tap does nothing');
 assert.deepEqual(unlockEntries(s).filter(e=>!e.unlocked),[],'everything open');
 assert.equal(JSON.stringify(normalizeFarm(structuredClone(s),NOW)),JSON.stringify(s),'normalizeFarm leaves it as it is');
 assert.equal(JSON.stringify(createShowcaseFarm(NOW)),JSON.stringify(s),'the same farm for the same moment');
 const looked=structuredClone(s);dailyTasks(looked,NOW);dailyOrders(looked,NOW);assert.equal(JSON.stringify(looked),JSON.stringify(s),'opening Today changes nothing');
 // Nothing to collect or claim anywhere: no "!" and no pop-up.
 assert.deepEqual(medalsWaiting(s),[]);assert.ok(!QUESTS.some((q,i)=>!s.claimed.includes(i)&&s.stats[q.stat]>=q.target));
 assert.ok(dailyTasks(structuredClone(s),NOW).every(q=>q.claimed));assert.ok(dailyOrders(structuredClone(s),NOW).every(o=>o.done));
 const g=structuredClone(s);assert.deepEqual(grantLevelRewards(g).levels,[]);assert.deepEqual(grantChapterRewards(g).chapters,[]);
 assert.ok(beginnerProgress(s).every(q=>q.done));assert.equal(rookieLeft(s,NOW),0);assert.equal(stallNotice(s,NOW),false);assert.equal(s.estate.job,null);
 assert.equal(s.coins,0);assert.equal(s.diamonds,0);assert.equal(s.vipExpiresAt,0);
 // Built from `now`: a refresh a minute later shows the same farm.
 const later=createShowcaseFarm(NOW+60000);assert.equal(later.plots[0].readyAt-later.plots[0].plantedAt,s.plots[0].readyAt-s.plots[0].plantedAt);
 // Every Master branch is full; the points left have nowhere to go, so the Estate shows none to spend there (public/growth-ui.js).
 assert.ok(masterFree(s)>0);assert.match(read('public/growth-ui.js'),/masterFree\(state\)>0&&!state\.showcase;/);assert.match(read('public/growth-ui.js'),/const free=state\.showcase\?0:masterFree\(state\)/);
});

test('the showcase farm carries the admin\'s real family, and a normal farm is not a showcase',()=>{
 const family={familyId:'f1',name:'Green Acres',unclaimedCount:0};
 const s=createShowcaseFarm(NOW,{family});assert.deepEqual(s.family,family);assert.notEqual(s.family,family,'a copy');
 assert.equal(createShowcaseFarm(NOW).family.familyId,null);
 assert.equal(createFarm(NOW).showcase,undefined);
 for(const copy of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(copy),read('game/farm-state.js'),copy);
});

test('farm-api: an admin account\'s load is the showcase, after the play lock and before the farm is read, and it saves nothing',()=>{
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/import \{[^}]*createShowcaseFarm,SHOWCASE_LEVEL\} from '\.\/farm-state\.js';/);
 const lock=api.indexOf("if(body.operation==='action'&&isAdminAccount(user))return reply({error:'This is your admin account, so playing is locked here. Play on your own farmer account.',code:'ACTION_REJECTED'},422);");
 const branch=api.indexOf("if(body.operation==='load'&&isAdminAccount(user)){"),loop=api.indexOf('for(let attempt=0;attempt<5;attempt++){');
 assert.ok(lock>0&&branch>lock&&loop>branch,'lock, then the showcase, then the farm read loop');
 const body=api.slice(branch,api.indexOf('\n  }\n',branch));
 assert.match(body,/return reply\(\{state:createShowcaseFarm\(now,\{family\}\),profile:\{player_id:user\.id,username,currency:0,level:SHOWCASE_LEVEL,avatar_id:profile\?\.avatar_id\?\?'default'\},adminView:true,emailCheck:\{needed:false,email:user\.email\?\?'',canChange:false\},serverNow:now\}\);/);
 assert.match(body,/admin\.from\('player_farms'\)\.select\('family:state->family'\)\.eq\('player_id',user\.id\)\.maybeSingle\(\)/,'only the family is read');
 assert.doesNotMatch(body,/harvest_commit_farm|\.update\(|\.insert\(|\.upsert\(|grantLevelRewards|receiveDonations|grantEmailBonus|writeLog/,'nothing is written');
});

test('supabase/admin-level.sql: the admins are level 999 for everyone else, re-runnable, explained',()=>{
 assert.ok(existsSync(new URL('../supabase/admin-level.sql',import.meta.url)));
 const sql=read('supabase/admin-level.sql');
 assert.match(sql,/^-- The admins are level 999/);assert.match(sql,/boardAdmins/);assert.match(sql,/nothing sets it back/);
 assert.match(sql,/update public\.player_stats set level=999 where public\.chat_staff_role\(player_id\)='admin' and level is distinct from 999;/);
});

test('the page is marked before it shows, from the load\'s adminView, never on CrazyGames; farm.html carries nothing of it',()=>{
 const cloud=read('src/game-cloud.js'),farm=read('public/farm.html');
 const mark=cloud.indexOf('if(adminView)markAdminView(document);'),shown=cloud.indexOf('document.body.hidden=false;');
 assert.ok(mark>0&&mark<shown,'marked before the body shows');
 assert.match(cloud,/const adminView=!portal&&window\.harvestInitialFarm\.adminView===true;/);
 assert.ok(cloud.indexOf('if(adminView)startAdminView({bridge});')>cloud.indexOf('createAdminDashboard(bridge,{chat});'),'after the dashboard, whose buttons it presses');
 assert.doesNotMatch(farm,/admin-view|data-admin-view|data-admin-tool/);
 const doc={documentElement:{dataset:{}},head:{children:[],append(el){this.children.push(el);}},createElement:()=>({})};
 markAdminView(doc);assert.equal(doc.documentElement.dataset.adminView,'');assert.equal(doc.head.children[0].href,'/admin-view.css');
});

test('admin-view.css only acts in the admin view and hides the play-only parts, never the bottom HUD (the medal toast lives there)',()=>{
 const css=read('public/admin-view.css').replace(/\/\*[^]*?\*\//g,'');
 const selectors=[...css.replace(/@media[^{]*\{/g,'').matchAll(/([^{}]+)\{[^}]*\}/g)].flatMap(([,s])=>s.split(/,(?![^(]*\))/).map(x=>x.trim()).filter(Boolean));
 assert.ok(selectors.length>20);
 for(const s of selectors)assert.ok(s.startsWith('html[data-admin-view]'),`unscoped: ${s}`);
 for(const part of ['.coin-counter','#diamond-button','#rookie-button','#pass-button','#starter-pack-chip','#offer-chip','.beginner-card','#beginner-mobile','.tool-dock','.context-hint','.bottom-note','.touch-instructions','#active-boosts','#more-dot','[data-menu-action="all-quests-mobile"]'])assert.ok(css.includes(part),part);
 assert.doesNotMatch(css,/\.bottom-hud\{[^}]*display:none/);assert.doesNotMatch(css,/env\(safe-area-inset-bottom/);
 // My farm, How to play, Chat, Admin panel, More: in that order on a phone and on a computer.
 const order=['#farm-button','#admin-help-tool','#admin-chat-tool','#admin-admin-tool','#more-button'].map(id=>Number(new RegExp(`html\\[data-admin-view\\] ${id}\\{order:(\\d)\\}`).exec(css)?.[1]));
 assert.deepEqual(order,[1,2,3,4,5]);
 assert.match(css,/html\[data-admin-view\] \.side-tools>\.side-tool:not\(#farm-button,#more-button,\[data-admin-tool\]\)/);
});

// A small page for src/admin-view.js: elements with the few things it uses.
function page({role='admin'}={}){
 const els=new Map(),clicks=[],listeners={};
 const el=(id,extra={})=>{const e={id,hidden:false,dataset:{},attrs:{},children:[],classes:new Set(),textContent:'',parts:{},
  setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},
  classList:{toggle:(c,on)=>{on?e.classes.add(c):e.classes.delete(c);}},
  querySelector(sel){return this.parts[sel]??=(this.innerHTML?.includes(`<${sel}`)?{textContent:new RegExp(`<${sel}[^>]*>([^<]*)<`).exec(this.innerHTML)?.[1]??'',hidden:false}:null);},
  click(){clicks.push(this.id);this.onclick?.();},...extra};if(id)els.set(id,e);return e;};
 const tools=[el('farm-button'),el('more-button')];
 for(const t of tools)t.after=function(n){tools.splice(tools.indexOf(this)+1,0,n);if(n.id)els.set(n.id,n);n.after=t.after;};
 const resources=el('',{prepend(...n){this.children.unshift(...n);for(const x of n)els.set(x.id,x);}});
 for(const id of ['help-button','chat-button','admin-button'])el(id);el('chat-dot');
 els.get('admin-button').hidden=true;els.get('chat-dot').hidden=false;els.get('chat-dot').textContent='4';
 el('admin-dashboard-dialog',{addEventListener(type,f){listeners['dashboard-'+type]=f;},removeEventListener(){}});
 const doc={hidden:false,getElementById:id=>els.get(id)??null,querySelector:sel=>sel==='.topbar .resources'?resources:null,createElement:()=>el(''),addEventListener(type,f){listeners[type]=f;},removeEventListener(){}};
 const win={MutationObserver:class{observe(){}disconnect(){}},setInterval:()=>1,clearInterval(){},setTimeout:(f,ms)=>setTimeout(f,ms),clearTimeout:t=>clearTimeout(t),addEventListener(){},harvestStaff:{opened:[],role:()=>role,open(tab){this.opened.push(tab);}}};
 return {doc,win,els,tools,resources,clicks,listeners};
}
test('the admin view\'s menu: My farm, How to play, Chat, Admin panel, More; each presses the game\'s own button',async()=>{
 assert.deepEqual(ADMIN_TOOLS.map(([key,name,picture,target])=>[key,name,picture,target]),[['help','How to play','guide','help-button'],['chat','Chat','chat','chat-button'],['admin','Admin panel','admin','admin-button']]);
 const p=page();startAdminView({bridge:{onlineCount:async()=>37,chat:{reports:async()=>[{},{},{}]}},doc:p.doc,win:p.win});
 assert.deepEqual(p.tools.map(t=>t.id),['farm-button','admin-help-tool','admin-chat-tool','admin-admin-tool','more-button']);
 assert.ok(p.tools.slice(1,4).every(t=>t.className==='side-tool'&&t.dataset.adminTool));
 assert.match(p.els.get('admin-help-tool').innerHTML,/<b>How to play<\/b>/);assert.match(p.els.get('admin-admin-tool').innerHTML,/<b>Admin panel<\/b>/);
 p.els.get('admin-help-tool').click();p.els.get('admin-chat-tool').click();p.els.get('admin-admin-tool').click();
 assert.deepEqual(p.clicks,['admin-help-tool','help-button','admin-chat-tool','chat-button','admin-admin-tool','admin-button']);
 // The Admin panel button is there when the dashboard's is; the chat's unread count comes along.
 assert.equal(p.els.get('admin-admin-tool').hidden,true);assert.equal(p.els.get('admin-chat-tool').hidden,false);
 assert.equal(p.els.get('admin-chat-tool').querySelector('em').textContent,'4');
 await new Promise(r=>setTimeout(r,0));
 const [online,reports]=p.resources.children;
 assert.equal(online.id,'admin-online-stat');assert.equal(reports.id,'admin-reports-stat');
 assert.equal(online.querySelector('strong').textContent,'37');assert.equal(reports.querySelector('strong').textContent,'3');assert.ok(reports.classes.has('has-reports'));
 assert.match(online.innerHTML,/<small translate="no">online<\/small>/);assert.match(reports.innerHTML,/<small translate="no">open reports<\/small>/,'English, as the staff screens');
 assert.equal(online.getAttribute('aria-disabled'),'false');assert.equal(online.getAttribute('aria-haspopup'),'dialog');
 online.click();reports.click();assert.deepEqual(p.win.harvestStaff.opened,['players','chat'],'the dashboard at Players and at the reports');
});
test('the admin view\'s numbers say "–" while unknown or when they cannot be read (a password session has no admin powers)',async()=>{
 // A password session: no dashboard behind the numbers, so a tap opens nothing and the reports are not even asked for.
 let asked=0;const w=page({role:null});startAdminView({bridge:{onlineCount:async()=>12,chat:{reports:async()=>{asked++;return [];}}},doc:w.doc,win:w.win});
 await new Promise(r=>setTimeout(r,0));
 const [count,open]=w.resources.children;assert.equal(count.querySelector('strong').textContent,'12');assert.equal(open.querySelector('strong').textContent,'–');assert.equal(asked,0);
 assert.equal(count.getAttribute('aria-disabled'),'true');assert.equal(count.getAttribute('aria-haspopup'),null);
 count.click();open.click();assert.deepEqual(w.win.harvestStaff.opened,[]);
 const p=page();startAdminView({bridge:{onlineCount:async()=>{throw new Error('offline');},chat:{reports:async()=>{throw new Error('Not authorized.');}}},doc:p.doc,win:p.win});
 const [online,reports]=p.resources.children;assert.equal(online.querySelector('strong').textContent,'–');
 await new Promise(r=>setTimeout(r,0));
 assert.equal(online.querySelector('strong').textContent,'–');assert.equal(reports.querySelector('strong').textContent,'–');assert.ok(!reports.classes.has('has-reports'));
 const q=page();startAdminView({bridge:{},doc:q.doc,win:q.win});await new Promise(r=>setTimeout(r,0));
 assert.equal(q.resources.children[0].querySelector('strong').textContent,'–','no count on this bridge');
 assert.equal(statText(0),'0');assert.equal(statText(1250),'1,250');assert.equal(statText(NaN),'–');assert.equal(ONLINE_MINUTES,30);
});
test('the numbers: one database count and the chat reports, no Edge Function, every minute while in view',()=>{
 // On the server's clock (the load's serverNow), as the dashboard's Online now.
 for(const file of ['src/main.js','src/farm-session.js'])assert.match(read(file),/const skew=Number\.isFinite\(bridge\.serverNow\)\?bridge\.serverNow-Date\.now\(\):0;\n\s+bridge\.onlineCount=async\(\)=>\{[^\n]*const at=Date\.now\(\)\+skew,[^\n]*\.from\('player_stats'\)\.select\('player_id',\{count:'exact',head:true\}\)\.gte\('last_active_at',new Date\(at-30\*60000\)\.toISOString\(\)\)\.lte\('last_active_at',new Date\(at\+60000\)\.toISOString\(\)\)/,file);
 const view=read('src/admin-view.js');
 assert.match(view,/bridge\.onlineCount\(\)/);assert.match(view,/bridge\.chat\.reports\(\)/);assert.doesNotMatch(view,/bridge\.request\(/);
 assert.match(view,/export const ADMIN_REFRESH_MS=60000;/);assert.match(view,/if\(doc\.hidden\)return;if\(busy\)\{again=true;return;\}/);
 // A hung request gives up after 15 s; the showcase is built again every hour and after midnight, so a tab left open stays tidy.
 assert.match(view,/export const ADMIN_WAIT_MS=15000,SHOWCASE_RELOAD_MS=3600000;/);assert.match(view,/win\.harvestRefresh\?\.\(\)/);
 assert.match(read('src/admin-dashboard.js'),/function open\(tab='chat'\)\{\n  if\(!role\)return;\n  if\(!dialog\.open\)openDashboard\(\);/);
});

test('in the admin view no action is tried: no farm change, no request, the admin message; a sweep does nothing either',async()=>{
 let requests=0;
 globalThis.localStorage={getItem(){return null;},setItem(){}};
 globalThis.document={body:{classList:{add(){},remove(){}}},documentElement:{hasAttribute:name=>name==='data-admin-view'}};
 globalThis.window={parent:{harvestBridge:{request:async()=>{requests++;return {};},serverNow:Date.now()}}};
 try{
  const state=createShowcaseFarm(Date.now()),before=JSON.stringify(state),client=createFarmClient(state,{onChange(){},onStatus(){}});
  await assert.rejects(client.runAction({type:'sell',item:'wheat',quantity:4}),e=>e.message===ADMIN_LOCKED&&e.code==='ACTION_REJECTED');
  await assert.rejects(client.runAction({type:'buy_boost',boost:'xp',expectedCost:10}),e=>e.message===ADMIN_LOCKED);
  const sweep=client.sweep('harvest','wheat');assert.equal(sweep.add(0),null);assert.equal(sweep.end(),null);assert.equal(sweep.reason,ADMIN_LOCKED);
  await new Promise(r=>setTimeout(r,0));
  assert.equal(requests,0,'nothing reached the server');assert.equal(JSON.stringify(state),before,'the farm on the screen did not move');
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;}
 assert.equal(ADMIN_LOCKED,'This is your admin account, so playing is locked here. Play on your own farmer account.');
 const game=read('public/game.js');
 assert.match(game,/const adminView=document\.documentElement\.hasAttribute\('data-admin-view'\);\nwindow\.harvestInitialFarm = null;/);
 assert.match(game,/function sweepAction\(target\)\{if\(adminView\)return null;/,'a drag over a field moves the view');
});

test('no analytics or ad conversions from the showcase, no Welcome back; the menu lights its own buttons only there',()=>{
 const game=read('public/game.js');
 assert.match(game,/const track=\(event,params=\{\}\)=>\{if\(adminView\)return;try\{window\.parent\.harvestBridge\?\.trackGame\?\.\(event,params\);\}catch\{\}\};/);
 assert.match(game,/if\(!adminView\)\{if\(villageWorld\)toast\('Welcome to the village!/);
 // farm-client's own tracking runs only after an action, which never happens there.
 assert.ok(read('public/farm-client.js').indexOf('if(adminView())throw adminLocked();')<read('public/farm-client.js').indexOf('const instant=instantResult(state,action,farmNow());'));
 const mobile=read('public/mobile-ui.js');
 assert.match(mobile,/const sections=\{'tasks-dialog':'tasks-button','buildings-dialog':'buildings-button','building-dialog':'buildings-button','market-dialog':'market-button','more-dialog':'more-button','chat-dialog':''\};/,'unchanged for everyone else');
 assert.match(mobile,/if\(document\.documentElement\.hasAttribute\('data-admin-view'\)\)Object\.assign\(sections,\{'help-dialog':'admin-help-tool','chat-dialog':'admin-chat-tool','admin-dashboard-dialog':'admin-admin-tool'\}\);/);
 assert.ok(read('scripts/i18n-extract.mjs').includes('admin-[^/]*'),'the staff screen stays English');
 // The special offer never opens by itself there (nothing is bought on an admin account); the dashboard's Preview still opens it.
 assert.match(read('src/offer-ui.js'),/function autoOpen\(\)\{\n  if\(!running\(\)\|\|seen\(\)\|\|waiting\|\|doc\.documentElement\?\.hasAttribute\?\.\('data-admin-view'\)\)return;/);
});

test('the numbers follow the dashboard: asked again when it closes, and once the powers arrive; a hung answer turns into "–"',async()=>{
 let role=null,reportsAsked=0;const p=page();p.win.harvestStaff.role=()=>role;
 const view=startAdminView({bridge:{onlineCount:()=>new Promise(()=>{}),chat:{reports:async()=>{reportsAsked++;return [{}];}}},doc:p.doc,win:{...p.win,setTimeout:(f)=>setTimeout(f,5)}});
 await new Promise(r=>setTimeout(r,30));
 const [online,reports]=p.resources.children;assert.equal(online.querySelector('strong').textContent,'–','no answer in time');assert.equal(reportsAsked,0);
 role='admin';view.mirror();await new Promise(r=>setTimeout(r,30));assert.equal(reportsAsked,1,'the powers came: asked at once');assert.equal(reports.querySelector('strong').textContent,'1');
 p.listeners['dashboard-close']();await new Promise(r=>setTimeout(r,30));assert.equal(reportsAsked,2,'the dashboard closed: asked again');
});

test('admins stay off every board and get no gifts; their Family window and invite card read the showcase too',()=>{
 const board=read('src/leaderboard.js');
 assert.match(board,/export const ADMIN_LEVEL=999;/);assert.match(board,/if\(!admins\.length&&Array\.isArray\(data\)\)data=data\.filter\(row=>!\(Number\(row\.level\)>=ADMIN_LEVEL\)\);/,'when the admin list does not load');
 assert.equal(SHOWCASE_LEVEL,999);
 const grant=read('supabase/functions/farm-api/admin-service.js');
 assert.ok(grant.indexOf('if(isAdminAccount(target?.data?.user))return respond(')>0&&grant.indexOf('if(isAdminAccount(target?.data?.user))return respond(')<grant.indexOf("admin.rpc('harvest_commit_farm'"),'refused before anything is saved');
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/const showcase=isAdminAccount\(user\)&&\['family','family_profile','invite'\]\.includes\(body\.operation\);\n\s+const state=showcase\?createShowcaseFarm\(now,\{family:/);
 const s=createShowcaseFarm(NOW);assert.equal(s.visitors.current,null,'no visitor to serve');
 const later=structuredClone(s);normalizeFarm(later,NOW+12*3600000);assert.equal(later.visitors.current,null);
});
