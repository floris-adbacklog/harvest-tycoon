import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,applyFarmAction,dailyGift,streakToday,xpForLevel,levelOf,DAILY_REWARDS,DAILY_DIAMONDS,DAILY_BOOSTS,DAILY_BOOST_MS,DAY_MS,STREAK_SAVE_DAYS} from '../game/farm-state.js';

// 27 Sep 2026: the daily gift's coins grow with the level, days 3, 5 and 7 of every streak week bring a 30-minute boost, and one
// missed day a week keeps the streak.
const start=Date.UTC(2026,8,27,12);
const farmAt=(level,now=start)=>{const s=createFarm(now);s.xp=xpForLevel(level);return s;};

test('the coins grow with the level: × level/2, never below the base, in fives; the diamonds stay',()=>{
 assert.deepEqual([1,2,3,10,20,50].map(level=>dailyGift(farmAt(level),1,start).coins),[40,40,60,200,400,1000]);
 assert.deepEqual([1,2,3,4,5,6,7].map(day=>dailyGift(farmAt(20),day,start).coins),DAILY_REWARDS.map(c=>c*10));
 assert.equal(dailyGift(farmAt(50),2,start).coins,1375);
 assert.deepEqual([1,7,30].map(day=>dailyGift(farmAt(40),day,start).diamonds),[DAILY_DIAMONDS[0],DAILY_DIAMONDS[6],DAILY_DIAMONDS[6]]);
 const s=farmAt(20);s.xp=xpForLevel(20)+5;const gift=applyFarmAction(s,{type:'checkin'},start);
 assert.equal(gift.coins,400,'the level before the gift\'s own XP');assert.equal(levelOf(s),20);
});

test('days 3, 5 and 7 of every streak week bring 30 minutes of double XP, double harvest and double earnings',()=>{
 assert.deepEqual(DAILY_BOOSTS,{3:'xp',5:'harvest',7:'coins'});assert.equal(DAILY_BOOST_MS,30*60000);
 assert.deepEqual([1,2,3,4,5,6,7,8,10,12,14,21].map(day=>dailyGift(farmAt(10),day,start).boost),[null,null,'xp',null,'harvest',null,'coins',null,'xp','harvest','coins','coins']);
 const s=farmAt(10);const got=[];
 for(let day=0;day<7;day++){const now=start+day*DAY_MS,r=applyFarmAction(s,{type:'checkin'},now);got.push(r.boost??null);
  if(r.boost)assert.equal({harvest:s.boosts.harvestUntil,xp:s.boosts.xpUntil,coins:s.boosts.coinsUntil}[r.boost],now+DAILY_BOOST_MS,`day ${day+1}`);}
 assert.deepEqual(got,[null,null,'xp',null,'harvest',null,'coins']);
 // VIP doubles the whole gift: the coins, the diamonds and the boost (an hour).
 const vip=farmAt(20);vip.vipExpiresAt=start+30*DAY_MS;for(let day=0;day<2;day++)applyFarmAction(vip,{type:'checkin'},start+day*DAY_MS);
 const third=applyFarmAction(vip,{type:'checkin'},start+2*DAY_MS);
 assert.equal(third.coins,700*2);assert.equal(third.diamonds,DAILY_DIAMONDS[2]*2);assert.equal(third.boostMinutes,60);assert.equal(vip.boosts.xpUntil,start+2*DAY_MS+60*60000);
 // A boost that is still running is lengthened, not reset.
 const t=farmAt(10);for(let day=0;day<2;day++)applyFarmAction(t,{type:'checkin'},start+day*DAY_MS);
 const now=start+2*DAY_MS;t.boosts.xpUntil=now+10*60000;applyFarmAction(t,{type:'checkin'},now);assert.equal(t.boosts.xpUntil,now+40*60000);
});

test('one missed day keeps the streak, once a week; two missed days start it over',()=>{
 const s=farmAt(10);
 for(let day=0;day<4;day++)applyFarmAction(s,{type:'checkin'},start+day*DAY_MS);
 assert.equal(s.login.streak,4);
 assert.deepEqual(streakToday(s,start+5*DAY_MS),{streak:5,claimed:false,saved:true},'day 5 missed one day: saved');
 const r=applyFarmAction(s,{type:'checkin'},start+5*DAY_MS);assert.equal(r.streak,5);assert.equal(r.saved,true);assert.equal(r.boost,'harvest');
 assert.equal(s.login.savedDay,new Date(start+5*DAY_MS).toISOString().slice(0,10));
 // Within the week the save is used: the next missed day starts over.
 applyFarmAction(s,{type:'checkin'},start+6*DAY_MS);
 assert.deepEqual(streakToday(s,start+8*DAY_MS),{streak:1,claimed:false,saved:false});
 // A week after the save it is back.
 applyFarmAction(s,{type:'checkin'},start+7*DAY_MS);applyFarmAction(s,{type:'checkin'},start+8*DAY_MS);
 const back=start+(5+STREAK_SAVE_DAYS)*DAY_MS;applyFarmAction(s,{type:'checkin'},back-2*DAY_MS);
 assert.equal(streakToday(s,back).saved,true);
 // Two missed days: day 1 again.
 const t=farmAt(10);applyFarmAction(t,{type:'checkin'},start);applyFarmAction(t,{type:'checkin'},start+DAY_MS);
 assert.deepEqual(streakToday(t,start+4*DAY_MS),{streak:1,claimed:false,saved:false});
 assert.equal(applyFarmAction(t,{type:'checkin'},start+4*DAY_MS).streak,1);
 // A farmer who never collected starts at day 1, and rubbish in the save field is cleared.
 const u=farmAt(5);assert.deepEqual(streakToday(u,start),{streak:1,claimed:false,saved:false});
 u.login.savedDay='yesterday';applyFarmAction(u,{type:'checkin'},start);assert.equal(u.login.savedDay,undefined);
});

test('the gift sounds like a present, shows tomorrow once collected, and comes back inside Welcome back, not as a second pop-up',async()=>{
 const {readFileSync}=await import('node:fs');const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 const {renderCue,CUE_ORDER,CUE_LENGTH}=await import('../public/sound-kit.js');const {soundForAction,SOUND_CUES}=await import('../public/farm-audio.js');
 assert.equal(soundForAction({type:'checkin'},{diamonds:4},5,5),'dailygift');assert.equal(soundForAction({type:'checkin'},{diamonds:4},5,6),'levelup','a level-up still comes first');
 assert.equal(soundForAction({type:'daily'},{diamonds:2},5,5),'diamond','the daily challenges keep theirs');
 assert(CUE_ORDER.includes('dailygift')&&SOUND_CUES.dailygift&&CUE_LENGTH.dailygift<1.5);
 const samples=renderCue('dailygift',24000);assert(samples.some(v=>Math.abs(v)>.01)&&samples.every(v=>Math.abs(v)<=.5));
 const retention=read('public/retention-ui.js'),welcome=read('public/welcome-ui.js'),game=read('public/game.js');
 assert.match(retention,/<strong>Tomorrow · day \$\{today\.streak\+1\}<\/strong>\$\{giftChips\(next\)\}/);
 assert.match(retention,/if\(r&&r\.streak%7===0\)celebrate\(r\);/,'every seventh day is celebrated');
 assert.match(retention,/danger=!today\.claimed&&today\.streak-1>=3&&new Date\(\)\.getHours\(\)>=18/,'the flame: a streak of 3+ in the evening');
 assert.match(retention,/\(await api\.push\.status\(\)\)\.kind!=='off'\)return;/,'the reminder offer only where notifications can work and are off');
 assert.match(welcome,/data-collect-gift/);assert.match(game,/showWelcomeBack\(initialWelcome,\{gift:\{offer:retention\.giftOffer\(\),chips:retention\.giftChips,collect:retention\.collectGift\}/);
});

test('the morning push names the same boosts as the game gives',async()=>{
 const {GIFT_BOOSTS,STREAK_SAVE_DAYS:pushSave}=await import('../supabase/functions/notify-hourly/rules.js');const {BOOSTS}=await import('../game/farm-state.js');
 assert.deepEqual(Object.fromEntries(Object.entries(DAILY_BOOSTS).map(([day,kind])=>[day,BOOSTS[kind].name.replace('Double','double')])),{...GIFT_BOOSTS});
 assert.equal(pushSave,STREAK_SAVE_DAYS);
});
