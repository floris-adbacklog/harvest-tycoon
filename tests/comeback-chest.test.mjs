import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,giftCoins,comebackCoins,comebackChest,offerComeback,DAY_MS,DAILY_BOOST_MS,
 COMEBACK_MIN_DAYS,COMEBACK_MAX_DAYS,COMEBACK_EVERY_DAYS,COMEBACK_COINS,COMEBACK_BOOST} from '../game/farm-state.js';
import {welcomeSummary} from '../supabase/functions/farm-api/welcome-service.js';
import {instantResult} from '../public/farm-client.js';

// The comeback chest (Oct 2026): away 3 days or more, a chest in Welcome back with 20 coins × half the level for every day away (up to
// 7) and 30 minutes of double XP; VIP doubles it; one every 14 days; never expires, never stacks; no diamonds, no XP.
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const start=Date.UTC(2026,9,2,12);
const farmAt=(level,now=start)=>{const s=createFarm(now);s.xp=xpForLevel(level);return s;};

test('the rules: 3 to 7 days, 20 coins × half the level a day, 30 minutes of double XP, one every 14 days',()=>{
 assert.deepEqual([COMEBACK_MIN_DAYS,COMEBACK_MAX_DAYS,COMEBACK_EVERY_DAYS,COMEBACK_COINS,COMEBACK_BOOST],[3,7,14,20,'xp']);
 const table={5:[150,250,350],15:[450,750,1050],30:[900,1500,2100],60:[1800,3000,4200]};
 for(const [level,coins] of Object.entries(table))assert.deepEqual([3,5,7].map(d=>comebackCoins(d,Number(level))),coins,`level ${level}`);
 assert.equal(comebackCoins(3,1),60,'never below 20 coins a day');assert.equal(comebackCoins(12,10),comebackCoins(7,10),'7 days at most');
});

test('coming back never pays better than coming every day: below a 3-day gift run at every level, with no diamonds',()=>{
 for(let level=1;level<=120;level++){
  const run=giftCoins(1,level)+giftCoins(2,level)+giftCoins(3,level);
  for(let days=COMEBACK_MIN_DAYS;days<=COMEBACK_MAX_DAYS;days++)assert.ok(comebackCoins(days,level)<run,`level ${level}, ${days} days: ${comebackCoins(days,level)} < ${run}`);
 }
 const s=farmAt(30);offerComeback(s,10*DAY_MS,start);const diamonds=s.diamonds,xp=s.xp;
 const r=applyFarmAction(s,{type:'comeback'},start);
 assert.equal(s.diamonds,diamonds,'no diamonds');assert.equal(s.xp,xp,'no XP');assert.equal(r.diamonds,undefined);assert.equal(r.xp,undefined);
 assert.equal(DAILY_BOOST_MS,30*60000,'the same boost minutes as the gift run\'s day 3');
});

test('offered on a load after 3 days away, from the server\'s clock only; days capped at 7; never stacks; one every 14 days',()=>{
 const s=createFarm(start);
 assert.equal(offerComeback(s,3*DAY_MS-1,start),null,'just under 3 days');assert.equal(s.comeback.pending,null);
 assert.deepEqual(offerComeback(s,3*DAY_MS,start),{days:3,at:start});assert.equal(s.comeback.lastAt,start);
 assert.equal(offerComeback(s,5*DAY_MS,start+DAY_MS),null,'one waiting is enough');assert.equal(s.comeback.pending.days,3);
 assert.equal(offerComeback(s,NaN,start),null);
 const t=createFarm(start);assert.equal(offerComeback(t,10*DAY_MS,start).days,COMEBACK_MAX_DAYS);
 applyFarmAction(t,{type:'comeback'},start+60000);
 assert.equal(offerComeback(t,4*DAY_MS,start+10*DAY_MS),null,'10 days after the last one');
 assert.equal(offerComeback(t,4*DAY_MS,start+COMEBACK_EVERY_DAYS*DAY_MS-1),null);
 assert.deepEqual(offerComeback(t,4*DAY_MS,start+COMEBACK_EVERY_DAYS*DAY_MS),{days:4,at:start+COMEBACK_EVERY_DAYS*DAY_MS},'14 days on: again');
 // It never expires: still there weeks later, worked out at the level of that moment.
 const u=farmAt(10);offerComeback(u,5*DAY_MS,start);u.xp=xpForLevel(20);
 assert.deepEqual(comebackChest(u,start+40*DAY_MS),{days:5,coins:comebackCoins(5,20),boost:'xp',boostMs:DAILY_BOOST_MS});
});

test('collecting pays the coins and lengthens double XP; VIP doubles both; a second collect is refused; the action decides nothing',()=>{
 const s=farmAt(10);offerComeback(s,4*DAY_MS,start);const coins=s.coins;
 const r=applyFarmAction(s,{type:'comeback',days:7,coins:1e9},start);
 assert.deepEqual(r,{coins:comebackCoins(4,10),days:4,boost:'xp',boostMinutes:30});assert.equal(s.coins,coins+comebackCoins(4,10),'the payload changes nothing');
 assert.equal(s.boosts.xpUntil,start+30*60000);assert.equal(s.comeback.pending,null);assert.equal(s.comeback.collected,1);
 assert.throws(()=>applyFarmAction(s,{type:'comeback'},start),/No comeback chest is waiting/);
 assert.throws(()=>applyFarmAction(createFarm(start),{type:'comeback'},start),/No comeback chest is waiting/,'only the server puts one there');
 // A boost that is still running is lengthened, not reset (like the gift).
 const t=farmAt(10);offerComeback(t,3*DAY_MS,start);t.boosts.xpUntil=start+10*60000;applyFarmAction(t,{type:'comeback'},start);assert.equal(t.boosts.xpUntil,start+40*60000);
 const vip=farmAt(20);vip.vipExpiresAt=start+30*DAY_MS;offerComeback(vip,6*DAY_MS,start);
 const v=applyFarmAction(vip,{type:'comeback'},start);assert.equal(v.coins,comebackCoins(6,20)*2);assert.equal(v.boostMinutes,60);assert.equal(vip.boosts.xpUntil,start+60*60000);
 assert.equal(levelOf(vip),20);
});

test('the saved chest is cleaned up: farms from before it start at 0, rubbish is dropped',()=>{
 const s=createFarm(start);assert.deepEqual(s.comeback,{lastAt:0,collected:0,pending:null});
 delete s.comeback;normalizeFarm(s,start);assert.deepEqual(s.comeback,{lastAt:0,collected:0,pending:null},'an older farm');
 s.comeback={lastAt:'soon',collected:-3,pending:{days:9,at:start}};normalizeFarm(s,start);assert.deepEqual(s.comeback,{lastAt:0,collected:0,pending:null});
 s.comeback={lastAt:start,collected:2,pending:{days:5,at:start,coins:1e9}};normalizeFarm(s,start);assert.deepEqual(s.comeback,{lastAt:start,collected:2,pending:{days:5,at:start}},'only days and when');
 s.comeback={pending:{days:2.5,at:start}};normalizeFarm(s,start);assert.equal(s.comeback.pending,null);
});

test('Welcome back still mints nothing; the chest shows at once in the game (it spends nothing)',()=>{
 const s=createFarm(start),copy=structuredClone(s);
 assert.ok(welcomeSummary(s,new Date(start-4*DAY_MS).toISOString(),start));assert.deepEqual(s,copy);
 // farm-api saves a load only when there is a Welcome back (or another reward): every away time that offers a chest must have one,
 // or the chest offered on that load would never be saved.
 assert.ok(welcomeSummary(s,new Date(start-COMEBACK_MIN_DAYS*DAY_MS).toISOString(),start),'3 days away is always a Welcome back');
 offerComeback(s,4*DAY_MS,start);
 const shown=instantResult(s,{type:'comeback'},start);assert.equal(shown.result.coins,comebackCoins(4,levelOf(s)));assert.equal(shown.trial.comeback.pending,null);assert.ok(s.comeback.pending,'the farm itself waits for the server');
 assert.throws(()=>instantResult(createFarm(start),{type:'comeback'},start),/No comeback chest is waiting/);
});

test('farm-api offers it on a load only, from updated_at, never to the admin account, and logs it',()=>{
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/const comeback=isAdminAccount\(user\)\?null:offerComeback\(state,now-\(Date\.parse\(row\.updated_at\)\|\|now\),now\);/);
 assert.equal((api.match(/offerComeback\(/g)??[]).length,1,'nowhere else');
 assert.ok(api.indexOf('offerComeback(state')>api.indexOf("if(body.operation==='load'){")&&api.indexOf('offerComeback(state')<api.indexOf('const previous=row.receipts.find'),'in the load branch');
 assert.match(read('supabase/functions/farm-api/player-log.js'),/comeback:\['rewards',\(\)=>'Opened the comeback chest'\]/);
});

test('the chest has its own row and Collect in Welcome back and at the top of Today, with the Family Chest art',()=>{
 const welcome=read('public/welcome-ui.js'),retention=read('public/retention-ui.js'),css=read('public/retention.css');
 assert.match(welcome,/data-welcome-chest><span class="welcome-gift-art">\$\{art\('family-chest-wood'\)\}<\/span><span class="welcome-gift-copy"><strong>Comeback chest<\/strong>/);
 assert.ok(welcome.indexOf('data-welcome-chest')<welcome.indexOf('data-welcome-gift'),'above the gift');
 assert.match(retention,/\$\('daily-gift'\)\.innerHTML=`\$\{chestRow\(chestOffer\(now\)\)\}<section/);
 assert.match(retention,/<small class="welcome-chest-note">For coming back after \$\{COMEBACK_MIN_DAYS\} days or more\. One every \$\{COMEBACK_EVERY_DAYS\} days\.<\/small>/,'Today says the rule in one line');
 assert.doesNotMatch(welcome,/welcome-chest-note/,'Welcome back already says how long you were away');
 assert.match(retention,/act\(\{type:'comeback'\}/);assert.doesNotMatch(retention+welcome,/collect all/i);
 assert.match(css,/:is\(#welcome-back-dialog,#daily-gift\) \.welcome-gift\{/);
 assert.match(read('public/visual-icons.js'),/'family-chest-wood'/);
});

test('the wiki, the reminders fact and the privacy policy say how it works, from the rules',async()=>{
 const {wikiArticle}=await import('../public/wiki-content.js');const {COMEBACK_PUSH_DAYS}=await import('../supabase/functions/notify-hourly/rules.js');
 const daily=wikiArticle('daily').html,account=wikiArticle('account').html;
 assert.match(daily,new RegExp(`Back after a while</h3><p>Away for ${COMEBACK_MIN_DAYS} days or more\\? The Welcome back card holds a comeback chest: ${COMEBACK_COINS} coins × half your level for every day you were away \\(up to ${COMEBACK_MAX_DAYS} days\\), and ${DAILY_BOOST_MS/60000} minutes of double XP\\. VIP doubles it`));
 assert.match(daily,new RegExp(`at most every ${COMEBACK_EVERY_DAYS} days`));
 for(let d=COMEBACK_MIN_DAYS;d<=COMEBACK_MAX_DAYS;d++)assert.ok(daily.includes(`<tr><td>${d}</td>`)&&daily.includes(`</span>${comebackCoins(d,30).toLocaleString('en-US')}</td>`),`${d} days`);
 assert.deepEqual([...COMEBACK_PUSH_DAYS],[3,6]);assert.match(account,/After 3 and 6 days away, the morning gift reminder tells you a comeback chest is waiting\./);
 assert.match(read('public/privacy.html'),/after 3 and 6 days away it tells you a comeback chest is waiting/);
});

test('the reminder job gets the chest and the last save: the same function, only two more fields in the farm',()=>{
 const sql=read('supabase/comeback-chest.sql'),job=read('supabase/notifications-job.sql');
 const fn=text=>text.slice(text.indexOf('create or replace function public.notification_candidates()'),text.indexOf('$$;',text.indexOf('create or replace function public.notification_candidates()'))+3);
 assert.equal(fn(sql),fn(job).replace("'login', f.state -> 'login')","'login', f.state -> 'login', 'comeback', f.state -> 'comeback', 'seenAt', f.updated_at)"));
 assert.match(sql,/revoke all on function public\.notification_candidates\(\) from public, anon, authenticated;/);assert.match(sql,/grant execute on function public\.notification_candidates\(\) to service_role;/);
});
