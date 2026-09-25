import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleAdminPlayers,handleAdminPlayer,seenFrom,recordSeen,deviceName} from '../supabase/functions/farm-api/admin-analytics-service.js';
import {filterPlayers,funnel,funnelHtml,playerRow,playerDetail,countryCounts,country,GUIDE_STEPS} from '../src/admin-players.js';
import {BEGINNER_QUESTS} from '../game/farm-state.js';
import {zoneCountry,ZONE_COUNTRY} from '../supabase/functions/farm-api/time-zones.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const owner={id:'22222222-2222-4222-8222-222222222222',email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z'};
const moderator={id:'33333333-3333-4333-8333-333333333333',email:'mod@example.com'};
const now=Date.UTC(2026,8,25,12),DAY=86400000,iso=ms=>new Date(ms).toISOString();
const P1='11111111-1111-4111-8111-111111111111',P2='44444444-4444-4444-8444-444444444444',P3='55555555-5555-4555-8555-555555555555';

// A small stand-in for the Supabase client: tables are arrays of rows, rpc answers admin_player_accounts from `accounts`.
function database(tables={}){
 const calls=[];
 return {calls,
  from(table){
   const call={table,filters:[]};calls.push(call);
   let rows=[...(tables[table]??[])],head=false,single=false;
   const q={
    range(from,to){call.ranges=[...(call.ranges??[]),[from,to]];rows=rows.slice(from,to+1);return q;},
    select(v,opts){call.select=v;head=Boolean(opts?.head);return q;},
    eq(k,v){call.filters.push(['eq',k,v]);rows=rows.filter(r=>r[k]===v);return q;},
    is(k,v){call.filters.push(['is',k,v]);rows=rows.filter(r=>(r[k]??null)===v);return q;},
    in(k,values){rows=rows.filter(r=>values.includes(r[k]));return q;},
    order(){return q;},limit(){return q;},
    maybeSingle(){single=true;return q;},
    upsert(row){call.upsert=row;return q;},
    then(resolve){return Promise.resolve(head?{count:rows.length,error:null}:{data:single?rows[0]??null:rows,error:null}).then(resolve);}
   };
   return q;
  },
  rpc(name,args){const call={rpc:name,args};calls.push(call);
   if(name!=='admin_player_accounts')throw new Error(`unexpected rpc ${name}`);
   // The database joins the player name from player_stats; p_player and p_ip narrow it down.
   const names=new Map((tables.player_stats??[]).map(s=>[s.player_id,s.username]));
   let rows=(tables.accounts??[]).map(a=>({...a,username:names.get(a.player_id)??null})).filter(a=>(!args.p_player||a.player_id===args.p_player)&&(!args.p_ip||a.ip===args.p_ip));
   const q={range(from,to){call.ranges=[...(call.ranges??[]),[from,to]];rows=rows.slice(from,to+1);return q;},then(resolve){return Promise.resolve({data:rows,error:null}).then(resolve);}};
   return q;
  }
 };
}
const accounts=[
 {player_id:P1,created_at:iso(now-2*DAY),provider:'google',last_sign_in_at:iso(now-3600000),country:'NL',ip:'81.2.3.4',device:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',seen_at:iso(now-60000)},
 {player_id:P2,created_at:iso(now-10*DAY),provider:'email',last_sign_in_at:iso(now-9*DAY),country:null,ip:'81.2.3.4',device:null,seen_at:null},
 {player_id:P3,created_at:iso(now-DAY/2),provider:'facebook',last_sign_in_at:null,country:null,ip:null,device:null,seen_at:null}
];
const tables={accounts,
 player_stats:[
  {player_id:P1,username:'Tony',level:12,currency:5000,last_active_at:iso(now-60000),vip_expires_at:iso(now+DAY),avatar_id:'farmer-1',events_finished:3},
  {player_id:P2,username:'Idle',level:4,currency:900,last_active_at:iso(now-9*DAY),vip_expires_at:null,avatar_id:null,events_finished:0}
 ],
 player_farms:[
  {player_id:P1,diamonds:120,visits:5,streak:2,guide:10,guideDone:true,family:'f1',state:{diamonds:120,xp:5000,login:{visits:5,streak:2,best:4},onboarding:{completed:10,rewardClaimed:true},plots:new Array(14).fill({}),buildings:{coop:{level:2},beeyard:{built:false},mill:{level:1}},family:{familyId:'f1'},emailBonus:1,starterOffer:{unlockedAt:now-DAY},stats:{harvested:300,produced:50,chores:12,activity_rounds:4,earned:90000,diamonds_earned:210}}},
  {player_id:P2,diamonds:5,visits:1,streak:1,guide:3,guideDone:false,family:null,state:{login:{visits:1}}}
 ],
 families:[{id:'f1',name:'Sunny Acres'}],
 harvest_purchases:[{player_id:P1,pack:'starter',status:'pending',amount_cents:299,diamonds:300,livemode:true,created_at:iso(now-DAY)}],
 live_event_players:[{player_id:P1,qualified:true,diamonds:30,joined_at:iso(now-DAY)},{player_id:P1,qualified:false,diamonds:0,joined_at:iso(now-2*DAY)}],
 chat_messages:[{sender:P1},{sender:P1}],chat_reports:[],chat_sanctions:[],
 referrals:[{invitee_id:P1,referrer_id:P2,qualified_at:null}],
 family_members:[{player_id:P1,family_id:'f1',role:'leader',left_at:null}],
 staff_roles:[{player_id:moderator.id}]
};

test('admin_players: every account with its farm, last activity, sign-in, guide step and family; never-played accounts too',async()=>{
 const result=await handleAdminPlayers({admin:database(tables),user:owner,now});
 assert.equal(result.status,200);assert.equal(result.data.owner,true);assert.equal(result.data.guideSteps,BEGINNER_QUESTS.length);
 const [tony,idle,fresh]=result.data.players;
 assert.equal(tony.username,'Tony');assert.equal(tony.online,true);assert.equal(tony.vip,true);assert.equal(tony.provider,'google');assert.equal(tony.family,'Sunny Acres');
 assert.equal(tony.daysPlayed,5);assert.equal(tony.guide,10);assert.equal(tony.guideDone,true);assert.equal(tony.lastActiveAt,iso(now-60000));
 assert.equal(tony.country,'NL');assert.equal(tony.ip,'81.2.3.4');assert.equal(tony.device,'iPhone · Safari');
 assert.equal(idle.online,false);assert.equal(idle.family,null);assert.equal(idle.country,null);
 assert.equal(fresh.everPlayed,false);assert.equal(fresh.username,null);assert.equal(fresh.provider,'facebook');
});
test('admin_players: every page is read, however many farmers there are (PostgREST answers at most 1,000 rows at a time)',async()=>{
 const db=database(tables),result=await handleAdminPlayers({admin:db,user:owner,now,page:2});
 assert.deepEqual(result.data.players.map(p=>p.playerId),[P1,P2,P3],'three accounts over two pages of two');
 const pages=db.calls.filter(c=>c.rpc==='admin_player_accounts').map(c=>c.ranges);
 assert.deepEqual(pages,[[[0,1]],[[2,3]],[[3,4]]],'each page its own request, until one comes back empty');
 assert.deepEqual(db.calls.filter(c=>c.table==='player_stats').map(c=>c.ranges),[[[0,1]],[[2,3]]]);
 const code=read('supabase/functions/farm-api/admin-analytics-service.js');
 assert.doesNotMatch(code.slice(code.indexOf('export async function handleAdminPlayers'),code.indexOf('export async function handleAdminPlayer(')),/\.limit\(/,'no cap on the list');
 assert.doesNotMatch(read('supabase/admin-player-accounts-paging.sql'),/limit 5000/);
});
test('admin_players and admin_player: the IP address, country and device are for the admin only, never for a moderator',async()=>{
 const list=await handleAdminPlayers({admin:database(tables),user:moderator,now});
 assert.equal(list.status,200);assert.equal(list.data.owner,false);
 for(const p of list.data.players)for(const key of ['ip','country','device'])assert.ok(!(key in p),`a moderator never gets ${key}`);
 const one=await handleAdminPlayer({admin:database(tables),user:moderator,playerId:P1,now});
 assert.equal(one.status,200);for(const key of ['ip','country','device','userAgent','seenAt','purchases','starter'])assert.ok(!(key in one.data.player),`a moderator never gets ${key}`);
 assert.deepEqual(one.data.player.sameNetwork,[{playerId:P2,username:'Idle',everPlayed:true}],'but does see which accounts share the network, for a second account dodging a ban');
 assert.match(playerDetail(one.data.player,{now}),/Same network as<\/dt><dd><button type="button" class="admin-link" data-player="[^"]+">Idle<\/button>/);
 const farmer=await handleAdminPlayers({admin:database(tables),user:{id:'x',email:'someone@example.com'},now});
 assert.equal(farmer.status,403);
});
test('admin_player: one farmer in full — account, progress, activity, purchases, events, chat, invites and family',async()=>{
 const {status,data:{player}}=await handleAdminPlayer({admin:database(tables),user:owner,playerId:P1,now});
 assert.equal(status,200);
 assert.equal(player.username,'Tony');assert.equal(player.xp,5000);assert.equal(player.diamonds,120);assert.equal(player.fields,14);assert.equal(player.buildings,2,'a building that is not built does not count');
 assert.equal(player.daysPlayed,5);assert.equal(player.bestStreak,4);assert.equal(player.guide,10);assert.equal(player.guideTotal,BEGINNER_QUESTS.length);
 assert.deepEqual(player.family,{name:'Sunny Acres',role:'leader'});assert.equal(player.emailBonus,true);assert.deepEqual(player.starter,{offeredAt:now-DAY,bought:false});
 assert.equal(player.activity.find(a=>a.key==='harvested').count,300);assert.equal(player.activity.find(a=>a.key==='events').count,3);
 assert.deepEqual(player.events,{joined:2,finished:1,diamonds:30});
 assert.deepEqual(player.purchases,[{pack:'starter',status:'pending',euros:2.99,diamonds:300,test:false,createdAt:iso(now-DAY)}]);
 assert.equal(player.chat.messages,2);assert.equal(player.chat.reported,0);assert.equal(player.chat.banned,false);
 assert.equal(player.invites.invitedBy,'Idle');assert.equal(player.invites.friends,0);
 assert.equal(player.ip,'81.2.3.4');assert.equal(player.country,'NL');assert.deepEqual(player.sameNetwork,[{playerId:P2,username:'Idle',everPlayed:true}]);
 const unseen=await handleAdminPlayer({admin:database(tables),user:owner,playerId:P3,now});assert.equal(unseen.data.player.sameNetwork,null,'no IP known: not "nobody else"');
 assert.equal((await handleAdminPlayer({admin:database(tables),user:owner,playerId:'nope',now})).status,400);
 assert.equal((await handleAdminPlayer({admin:database(tables),user:owner,playerId:'99999999-9999-4999-8999-999999999999',now})).status,404);
});

test('seenFrom: the country comes from the device time zone, never from the IP address; nothing made up when something is missing',()=>{
 const headers=values=>new Headers(values);
 assert.deepEqual(seenFrom(headers({'cf-ipcountry':'IN','cf-connecting-ip':'81.2.3.4','user-agent':'UA'}),'Europe/Amsterdam'),{country:'NL',ip:'81.2.3.4',device:'UA'},'the time zone decides, not the IP');
 assert.deepEqual(seenFrom(headers({'cf-ipcountry':'NL','x-forwarded-for':'2a02:a45::1, 10.0.0.1'})),{country:null,ip:'2a02:a45::1',device:null},'no time zone, no country');
 assert.deepEqual(seenFrom(headers({'cf-connecting-ip':'not an ip'}),'UTC'),{country:null,ip:null,device:null});
 assert.equal(seenFrom(headers({'user-agent':'x'.repeat(500)})).device.length,300);
 assert.deepEqual(seenFrom(undefined,'Nowhere/Special'),{country:null,ip:null,device:null});
});
test('the time zone table: every zone of the tz database plus the older names browsers still report',()=>{
 assert.equal(zoneCountry('Europe/Amsterdam'),'NL');assert.equal(zoneCountry('Europe/Brussels'),'BE');assert.equal(zoneCountry('America/New_York'),'US');
 assert.equal(zoneCountry('Europe/Kiev'),'UA','live notification settings still say Europe/Kiev');assert.equal(zoneCountry('Europe/Kyiv'),'UA');assert.equal(zoneCountry('Asia/Calcutta'),'IN');
 assert.equal(zoneCountry('UTC'),null);assert.equal(zoneCountry('toString'),null,'only real zones, nothing from the object itself');assert.equal(zoneCountry(null),null);
 assert.ok(Object.keys(ZONE_COUNTRY).length>400);assert.ok(Object.values(ZONE_COUNTRY).every(c=>/^[A-Z]{2}$/.test(c)));
 assert.match(read('scripts/build-time-zones.mjs'),/zone\.tab/);
});
test('recordSeen keeps one row per farmer (an upsert) with only what the visit knows, and farm-api runs it beside the load',async()=>{
 const db=database();
 await recordSeen({admin:db,player:P1,headers:new Headers({'cf-connecting-ip':'1.2.3.4'}),timeZone:'Europe/Brussels',now});
 assert.deepEqual(db.calls[0].upsert,{player_id:P1,country:'BE',ip:'1.2.3.4',seen_at:iso(now)});
 const older=database();await recordSeen({admin:older,player:P1,headers:new Headers({'cf-connecting-ip':'1.2.3.4'}),now});
 assert.ok(!('country' in older.calls[0].upsert),'a load without a time zone keeps the country saved before');
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/if\(body\.operation==='load'\)\{const seen=Promise\.resolve\(\)\.then\(\(\)=>recordSeen\(\{admin,player:user\.id,headers:req\.headers,timeZone:body\.timeZone\}\)\)\.catch\(\(\)=>\{\}\);/,'even a synchronous failure never stops the load');
 assert.match(api,/EdgeRuntime\?\.waitUntil\?\.\(seen\)/);
 assert.match(api,/'admin_players','admin_player'/);assert.match(read('src/connection.js'),/'admin_invites','admin_players','admin_player'\]/,'read-only, so safe to retry');
 assert.match(read('src/supabase.js'),/const sent=body\?\.operation==='load'\?\{\.\.\.body,timeZone:deviceTimeZone\(\)\}:body;/,'every farm load sends the device time zone');
 const sql=read('supabase/admin-player-insights.sql');
 assert.match(sql,/alter table public\.player_seen enable row level security;\s*revoke all on public\.player_seen from anon, authenticated;/);
 const paging=read('supabase/admin-player-accounts-paging.sql');
 assert.match(paging,/revoke all on function public\.admin_player_accounts\(uuid, text\) from public, anon, authenticated;\s*grant execute on function public\.admin_player_accounts\(uuid, text\) to service_role;/);
});
test('deviceName: a short system and browser from the user agent',()=>{
 assert.equal(deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'),'Windows · Chrome');
 assert.equal(deviceName('Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36'),'Android phone · Samsung Internet');
 assert.equal(deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]'),'iPhone · Facebook app');
 assert.equal(deviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:130.0) Gecko/20100101 Firefox/130.0'),'Mac · Firefox');
 assert.equal(deviceName(null),null);
});

const list=[
 {playerId:'a',username:'Anna',level:14,online:true,everPlayed:true,createdAt:iso(now-2*DAY),lastActiveAt:iso(now-60000),guide:10,daysPlayed:3,country:'NL',ip:'1.1.1.1'},
 {playerId:'b',username:'Bram',level:5,online:false,everPlayed:true,createdAt:iso(now-5*DAY),lastActiveAt:iso(now-3*DAY),guide:6,daysPlayed:2,country:'BE',ip:'2.2.2.2'},
 {playerId:'c',username:'Cees',level:2,online:false,everPlayed:true,createdAt:iso(now-40*DAY),lastActiveAt:iso(now-20*DAY),guide:2,daysPlayed:1,country:null,ip:null},
 {playerId:'d',username:null,level:null,online:false,everPlayed:false,createdAt:iso(now-DAY/4),lastActiveAt:null,guide:0,daysPlayed:0}
];
test('the player list: filters, search (also by country and IP) and orders',()=>{
 const ids=(o)=>filterPlayers(list,o,now).map(p=>p.playerId);
 assert.deepEqual(ids({}),['a','b','c','d'],'last active first, never active last');
 assert.deepEqual(ids({filter:'online'}),['a']);
 assert.deepEqual(ids({filter:'week'}),['a','b']);
 assert.deepEqual(ids({filter:'quiet'}),['c'],'played before, not active for 7 days');
 assert.deepEqual(ids({filter:'new'}),['a','b','d']);
 assert.deepEqual(ids({filter:'never'}),['d']);
 assert.deepEqual(ids({search:'belg'}),['b'],'the country name');assert.deepEqual(ids({search:'1.1.1'}),['a'],'the IP address');
 assert.deepEqual(ids({sort:'new'}),['d','a','b','c']);assert.deepEqual(ids({sort:'level'}),['a','b','c','d']);
});
test('a list row shows last active as a date and a time, and the IP only when the admin has it',()=>{
 const row=playerRow(list[1],{now});
 assert.match(row,/3d ago/);assert.match(row,/Sep 22, \d\d:\d\d/);assert.match(row,/IP 2\.2\.2\.2/);assert.match(row,/Belgium/);assert.match(row,/Guide 6\/10/);
 const {ip,country:c,...forModerator}=list[1];
 assert.doesNotMatch(playerRow(forModerator,{now}),/IP /);
 assert.equal(country('NL'),'🇳🇱 Netherlands');assert.equal(country(null),null);
});
test('the funnel: how far new players got, the biggest drop marked, "came back" only for players old enough',()=>{
 assert.equal(GUIDE_STEPS.length,BEGINNER_QUESTS.length,'one label per beginner guide step');
 const week=funnel(list,'7',now);
 assert.equal(week.total,3);
 const row=label=>week.rows.find(r=>r.label.startsWith(label));
 assert.equal(row('Opened their farm').count,2);assert.equal(row('Guide 1:').count,2);assert.equal(row('Guide 7:').count,1);assert.equal(row('Level 14').count,1);
 assert.equal(week.rows.filter(r=>r.worst).length,1);assert.equal(row('Opened their farm').worst,true,'the one who never opened the farm is the biggest drop');
 const [day1,day3,day7]=week.back;
 assert.deepEqual([day1.count,day1.total],[2,2]);assert.deepEqual([day3.count,day3.total],[0,1]);assert.equal(day7.total,0);
 assert.equal(funnel(list,'all',now).total,4);
 assert.match(funnelHtml(week),/Biggest drop/);assert.match(funnelHtml(funnel([],'7',now)),/Nobody made an account/);
 assert.deepEqual(countryCounts(list),{rows:[{code:'BE',count:1},{code:'NL',count:1}],unknown:1});
});
test('one farmer\'s page lists the other accounts on the same network, and leaves out what a moderator may not see',()=>{
 const detail={playerId:'a',username:'Anna',level:14,xp:1,coins:1,diamonds:1,avatarId:null,createdAt:iso(now-2*DAY),lastActiveAt:iso(now-60000),lastSignInAt:null,provider:'email',online:true,everPlayed:true,
  vipUntil:null,daysPlayed:3,streak:1,bestStreak:2,guide:4,guideDone:false,guideTotal:10,fields:8,buildings:3,family:null,emailBonus:false,starter:{offeredAt:null,bought:false},
  activity:[{key:'harvested',label:'Crops harvested',count:10}],earned:{coins:0,diamonds:0},events:{joined:0,finished:0,diamonds:0},purchases:[],chat:{messages:0,reported:0,muted:false,banned:false},invites:{invitedBy:null,friends:0,qualified:0}};
 const html=playerDetail({...detail,ip:'1.1.1.1',country:'NL',device:'iPhone · Safari',sameNetwork:[list[1]],purchases:[]},{guideSteps:GUIDE_STEPS,now});
 assert.match(html,/Same network as<\/dt><dd><button[^>]*data-player="b">Bram<\/button>/);assert.match(html,/IP address<\/dt><dd>1\.1\.1\.1/);assert.match(html,/<h4>Purchases<\/h4>/);assert.match(html,/next: Start production/);assert.match(html,/email not confirmed/);
 const {purchases,...forModerator}=detail,mod=playerDetail(forModerator,{guideSteps:GUIDE_STEPS,now});
 assert.doesNotMatch(mod,/<dt>(IP address|Country|Device)<\/dt>|<h4>Purchases/);assert.match(mod,/Same network as<\/dt><dd>Not known/);
});
test('the dashboard: the list replaces the newest players, the funnel and countries sit in Growth, the policy names what is kept',()=>{
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/bridge\.request\(\{operation:'admin_players'\}\)\.catch\(\(\)=>null\)/);
 assert.match(dash,/bridge\.request\(\{operation:'admin_player',playerId:id\}\)/);
 assert.match(dash,/id="admin-funnel"/);assert.match(dash,/id="admin-countries" hidden/);
 assert.doesNotMatch(dash,/admin_recent_players/);
 assert.match(read('public/privacy.html'),/your IP address, your browser and device type, and the country of your device’s time zone/);
});
