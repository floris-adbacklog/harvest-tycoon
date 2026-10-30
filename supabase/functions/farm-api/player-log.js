import {ITEMS,BUILDINGS,CROPS,BOOSTS,IMPROVEMENTS,VILLAGE_LANDMARKS,VILLAGE_SHOP,FISH,LAKE_FISH,PETS,HARBOUR_WORKS,HARBOUR_QUESTS,NEIGHBOURS,VILLAGE_QUESTS,ACTIVE_STATIONS,levelOf,recipeFor} from './farm-state.js';
import {DECOR} from './farm-map.js';
import {isStaff,isSuperadmin} from './admin-service.js';

// A log per farmer (26 Sep 2026): what they did and what it gave or cost, with the time, in categories. The farmer reads their own
// on their profile; the admin and the moderators read everyone's, except purchases with real money, which only the farmer and the
// admin see. Rows live in player_logs (supabase/player-logs.sql) for 60 days (90 until 30 Oct 2026). Planting, watering, care and harvesting are not
// logged one by one: they are three quarters of all actions and would fill the log without saying much. Writing happens after the
// reply (EdgeRuntime.waitUntil in index.ts), so the game never waits for it, and it never costs an extra request.
export const LOG_CATEGORIES=Object.freeze(['account','farm','production','market','rewards','diamonds','social','staff','purchase']);
export const LOG_PAGE=50;
const number=value=>Number(value).toLocaleString('en-US');
const itemName=key=>ITEMS[key]?.name??key;
const building=key=>BUILDINGS[key]?.name??'building';
const landmark=key=>VILLAGE_LANDMARKS[key]?.name??'landmark';
const batches=count=>`${number(count)} ${count===1?'batch':'batches'}`;

// What a farm has before and after an action; the difference is what the log line says it gave or cost.
export function snapshot(state){return {coins:state.coins,diamonds:state.diamonds,xp:state.xp,level:levelOf(state),inventory:{...state.inventory}};}
export function changes(before,after){
 const parts=[],single={coins:'coin',diamonds:'diamond'},signed=(value,label)=>{if(value)parts.push(`${value>0?'+':'−'}${number(Math.abs(value))} ${Math.abs(value)===1?single[label]??label:label}`);};
 signed(after.coins-before.coins,'coins');signed(after.diamonds-before.diamonds,'diamonds');
 const xp=after.xp-before.xp;if(xp>0)parts.push(`+${number(xp)} XP`);
 const items=Object.keys({...before.inventory,...after.inventory}).map(key=>[key,(after.inventory[key]??0)-(before.inventory[key]??0)]).filter(([,count])=>count).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
 for(const [key,count] of items.slice(0,3))signed(count,itemName(key));
 if(items.length>3)parts.push(`${items.length-3} more`);
 return parts.join(' · ');
}

// Each logged action: its category and what happened, in the farmer's words. Actions not in here are not logged.
const FARM_ACTIONS={
 construct:['farm',(a)=>`Built the ${building(a.building)}`],
 // With builder's crates from the village (Oct 2026) the line names them; the changes after it show the coins paid and the crates used.
 upgrade:['farm',(a,s,r)=>r?.crates?`Upgraded the ${building(a.building)} to level ${s.buildings[a.building]?.level??''} with ${number(r.crates)} builder’s ${r.crates===1?'crate':'crates'}`:`Upgraded the ${building(a.building)} to level ${s.buildings[a.building]?.level??''}${a.currency==='diamonds'?' with diamonds':''}`],
 expand:['farm',(a,s)=>`Unlocked field ${s.plots.length}`],
 silo_upgrade:['farm',(a,s)=>`Silo research step ${s.siloLevel}`],
 warehouse_upgrade:['farm',(a,s)=>`Upgraded the Warehouse to level ${s.warehouse?.level??''}`],
 improve:['farm',(a)=>`Built ${IMPROVEMENTS[a.id]?.name??'an estate improvement'}`],
 clear_planting:['farm',()=>'Removed a crop from a field'],
 clear_plantings:['farm',(a,s,r)=>`Removed ${r?.cleared?.length??''} crops from the fields`],
 ranch_focus:['farm',()=>'Changed the ranch focus'],
 produce:['production',(a,s,r)=>`Started ${batches(r?.count??1)} of ${recipeFor(s,a.recipe)?.name??'a recipe'}`],
 collect:['production',(a)=>`Collected a batch at the ${building(a.building)}`],
 collect_all:['production',(a,s,r)=>`Collected ${batches(r?.count??1)} at the ${building(a.building)}`],
 sell:['market',(a)=>a.item&&a.item!=='all'?`Sold ${itemName(a.item)}`:a.category==='village'?'Sold all village goods':`Sold all ${a.category==='goods'?'goods':'crops'}`],
 delivery:['market',()=>'Delivered an order'],
 replace_order:['market',()=>'Replaced a delivery order'],
 stall_collect:['market',()=>'Collected the farm stall'],
 stall_upgrade:['market',()=>'Upgraded the farm stall'],
 valley_sell:['market',()=>'Sold a basket at the Valley Market'],
 valley_skip:['market',()=>'Sent a Valley Market customer away'],
 // World II's market square (Oct 2026): a villager helped or turned away, and a village place built from its golden brief.
 // The Help that opens the market crate (from level 116) says so; the changes show its diamonds.
 village_deliver:['market',(a,s,r)=>r?.crate?'Helped a villager at the market square and opened the market crate':'Helped a villager at the market square'],
 village_skip:['market',()=>'Said “Not now” to a villager'],
 // The miller's order (17 Oct 2026): the week's heirloom bakes delivered (the changes show its coins and diamonds).
 miller_deliver:['market',()=>'Delivered the miller’s order at the market square'],
 village_build:['farm',a=>`Built the ${building(a.place)} from a golden brief`],
 // The town boat at the Pier (Oct 2026): a part load, a full boat sailing off, a cargo turned down.
 boat_load:['market',(a,s,r)=>r?.sailed?'Sent the town boat off':'Loaded the town boat'],
 boat_skip:['market',()=>'Turned down a town boat cargo'],
 // The village's landmarks (Oct 2026): goods handed in bit by bit, and the landmark finished.
 landmark_give:['farm',a=>`Handed in goods for the ${landmark(a.landmark)}`],
 landmark_finish:['farm',a=>`Finished the ${landmark(a.landmark)} in the village`],
 depot_load:['market',()=>'Loaded an export trailer'],
 // World III, the harbour (28 Oct 2026): ships loaded and sent, the harbour master's works, its warehouse, quests and seal.
 harbour_visit:['farm',(a,s,r)=>r?.visited?'Sailed to the harbour':null],
 ship_load:['market',(a,s,r)=>r?.sailed?`${r?.kind==='voyage'?'Sent the flagship on a world voyage':r?.kind==='container'?'Sent a container ship off':'Sent a ship off from the harbour'}${r?.diamonds?` (+${r.diamonds} diamonds)`:''}${r?.crate?' and opened the harbour crate':''}`:'Loaded a ship at the harbour'],
 flagship_name:['farm',(a,s,r)=>`Named the flagship ${r?.name??''}`],
 ship_skip:['market',()=>'Said “Not now” to a ship at the harbour'],
 ship_swap:['market',()=>'Asked a ship at the harbour for something else'],
 harbour_give:['farm',a=>`Handed in goods for the ${HARBOUR_WORKS.find(w=>w.id===a.work)?.name??'harbour work'}`],
 harbour_finish:['farm',a=>`Finished the ${HARBOUR_WORKS.find(w=>w.id===a.work)?.name??'harbour work'} at the harbour`],
 harbour_warehouse:['farm',(a,s,r)=>`Harbour warehouse level ${r?.level??''}`],
 harbour_quest:['rewards',a=>`Claimed the harbour quest “${HARBOUR_QUESTS[a.id]?.title??'quest'}”`],
 seal_pat:['rewards',()=>'Patted the harbour seal'],
 depot_skip:['market',()=>'Skipped an export order'],
 fair_enter:['market',()=>'Entered the Grand Valley Fair'],
 master_spend:['farm',a=>`Spent a Master point (${a.branch})`],
 lab_cross:['production',a=>`Crossed ${a.heirloom} in the Seed Lab`],
 lab_collect:['production',()=>'Collected heirlooms from the Seed Lab'],
 visitor_serve:['market',()=>'Served a valley visitor'],
 visitor_decline:['market',()=>'Sent a valley visitor away'],
 giant_tend:['farm',a=>a.feed?'Tended and fed the giant pumpkin':'Tended the giant pumpkin'],
 giant_weigh:['market',()=>'Weighed in the giant pumpkin'],
 vproject_give:['farm',a=>`Handed in goods for the ${a.project} project`],
 vproject_finish:['farm',a=>`Finished a level of the ${a.project} project`],
 // The Fishing pond (11 Oct 2026): every fish, landed or let go, is a line (up to 77 a day), with its time: what the pond is measured by.
 fish:['rewards',(a,s,r)=>r?.released?'Let a fish go':`Caught a fish: ${FISH[r?.species]?.name??'fish'}, ${Number(r?.kg??0).toFixed(2)} kg`],
 // The village lake (12 Oct 2026): every lake fish too, with the lake named, so the two waters read apart in the log.
 lake_fish:['rewards',(a,s,r)=>r?.released?'Let a fish go at the village lake':`Caught a fish at the village lake: ${LAKE_FISH[r?.species]?.name??'fish'}, ${Number(r?.kg??0).toFixed(2)} kg`],
 // The farm's pets (20 Oct 2026): every pat, with the pet's name; the changes after it show its find.
 pet_pat:['rewards',a=>`Patted ${PETS[a.pet].name}`],
 quest:['rewards',()=>'Claimed a quest'],
 beginner_claim:['rewards',()=>'Claimed a beginner guide step'],
 daily:['rewards',()=>'Claimed a daily challenge'],
 checkin:['rewards',()=>'Opened the daily gift'],
 comeback:['rewards',()=>'Opened the comeback chest'],
 // The Halloween Pass (Oct 2026): every reward is its own claim; the line says which tier and which row.
 pass_claim:['rewards',a=>`Collected tier ${Number(a.tier)||''} of the Halloween Pass (${a.track==='paid'?'paid':'free'})`],
 level_rewards:['rewards',()=>'Collected level rewards'],
 mastery:['rewards',(a)=>`Earned a ${CROPS[a.crop]?.name??'crop'} mastery medal`],
 chore:['rewards',()=>'Did a farm chore'],
 activity_work:['rewards',()=>'Lent a helping hand'],
 project_start:['rewards',()=>'Started an estate project'],
 project_collect:['rewards',()=>'Finished an estate project'],
 finish_batch:['diamonds',(a)=>`Finished a batch at the ${building(a.building)} with diamonds`],
 finish_crop:['diamonds',()=>'Finished a field with diamonds'],
 tractor_care:['diamonds',(a,s,r)=>`Gave ${r?.count??''} crops full care with the tractor`],
 tractor_shift:['diamonds',(a)=>`Started the tractor's night shift (${CROPS[a.crop]?.name??'crops'})`],
 buy_boost:['diamonds',(a)=>`Used the boost ${BOOSTS[a.boost]?.name??''}`.trim()],
 buy_vip:['diamonds',()=>'Bought VIP'],
 buy_coins:['diamonds',(a,s,r)=>`Bought ${number(r?.coins??0)} coins with diamonds`],
 // The Village tab of the diamond shop (20 Oct 2026).
 village_cart:['diamonds',a=>`Bought the ${Object.hasOwn(VILLAGE_SHOP,a.cart)?VILLAGE_SHOP[a.cart].name:'cart'} with diamonds`],
 boat_now:['diamonds',()=>'Called the town boat back with diamonds'],
 villager_now:['diamonds',()=>'Called the next villager with diamonds'],
 lake_casts:['diamonds',()=>'Bought five lake casts with diamonds'],
 landmark_supplies:['diamonds',a=>`Bought the goods for the ${landmark(a.landmark)} with diamonds`],
 // The Harbour tab of the diamond shop (28 Oct 2026).
 // 30 Oct 2026 (the owner: "Breid logs uit met relevante dingen zoals coins spent"): every action that gives or costs coins, diamonds or
 // goods has its line now; only planting, watering, care and harvesting stay out (they count in the day's totals below).
 tractor:['farm',(a,s,r)=>{const n=r?.count??0,c=number(n),crop=CROPS[a.crop]?.name.toLowerCase()??'crops';
  if(a.mode==='plant')return n===1?`The tractor planted ${crop} on ${c} field`:`The tractor planted ${crop} on ${c} fields`;
  if(a.mode==='water')return n===1?`The tractor watered ${c} field`:`The tractor watered ${c} fields`;
  if(a.mode==='harvest')return n===1?`The tractor harvested ${c} field`:`The tractor harvested ${c} fields`;
  if(a.mode==='tend')return n===1?`The tractor gave care to ${c} field`:`The tractor gave care to ${c} fields`;
  if(a.mode==='fertilize')return n===1?`The tractor fertilized ${c} field`:`The tractor fertilized ${c} fields`;
  return 'Used the tractor';}],
 fertilize:['farm',(a,s,r)=>{const n=r?.count??(a.ids?.length??1);return n===1?`Fertilized ${number(n)} field`:`Fertilized ${number(n)} fields`;}],
 layout_buy:['farm',(a)=>`Bought and placed ${DECOR[a.kind]?.name.toLowerCase()??'a decoration'}`],
 layout_purchase:['farm',(a,s,r)=>`Bought ${number(r?.count??a.count??1)} × ${DECOR[a.kind]?.name.toLowerCase()??'decoration'} for later`],
 layout_draw:['farm',()=>'Changed paths, fences or flowers'],
 season_claim:['rewards',(a)=>`Claimed a Season Pass reward (tier ${number(Number(a.tier)+1)})`],
 season_chest:['rewards',()=>'Opened the Season Pass chest'],
 season_skip:['diamonds',()=>'Skipped a Season Pass tier'],
 bin_add:['market',(a)=>`Put ${number(a.count)} ${itemName(a.item)} in the shipping bin`],
 bin_take:['market',(a)=>`Took ${itemName(a.item)} back from the shipping bin`],
 donkey_cart_buy:['market',(a)=>`Bought ${itemName(a.item)} from the cart trader`],
 neighbour_gift:['social',(a)=>`Gave ${itemName(a.item)} to ${NEIGHBOURS[a.neighbour]?.name??'a neighbour'}`],
 village_quest:['rewards',(a)=>`Claimed the village quest “${VILLAGE_QUESTS[a.id]?.title??''}”`],
 activity_start:['production',(a)=>`Started a helping hand at the ${ACTIVE_STATIONS[a.station]?.name??'farm'}`],
 ship_now:['diamonds',()=>'Called a ship to the quay with diamonds'],
 harbour_supplies:['diamonds',a=>`Bought the goods for the ${HARBOUR_WORKS.find(w=>w.id===a.work)?.name??'harbour work'} with diamonds`]
};
const FAMILY_ACTIONS={family_create:'Started a family',family_join:'Joined a family',family_accept_invite:'Accepted a family invitation',family_request:'Asked to join a family',family_request_cancel:'Cancelled a request to join',family_request_accept:'Accepted a request to join',family_request_decline:'Declined a request to join',family_join_mode:'Changed who can join the family',family_min_level:'Changed the family minimum level',family_shirt:'Chose the family shirt',family_idle_days:'Changed when members who don\'t play leave the family',family_rejoin:'Joined the family again',
 family_decline_invite:'Declined a family invitation',family_leave:'Left the family',family_kick:'Removed a member from the family',
 family_promote:'Changed a member\'s role in the family',family_rank:'Changed a member\'s rank in the family',family_invite:'Invited a farmer to the family',family_cancel_invite:'Cancelled a family invitation',
 family_contribute:'Delivered to the Family Order',family_claim:'Claimed a family reward',family_tournament_goods:'Delivered goods for the family tournament',
 family_rename:'Renamed the family',family_emblem:'Changed the family emblem',family_open:'Changed who can join the family'};

const line=(category,action,text,detail)=>({category,action,text:(detail?`${text} · ${detail}`:text).slice(0,240)});
// The day's totals (30 Oct 2026, the owner: option 2): every farm action adds what it gave and what it cost to state.dayTally, planting,
// watering, care and harvesting too, on the server only (farm-api, after the action, before the save). The first action of a new UTC
// day writes the last day's totals as one line, at noon UTC of that day (so it falls on that day in every time zone) and, written after
// it, above that day's lines in the log; today's come with the log itself (handlePlayerLog today).
export const utcDayOf=ms=>new Date(ms).toISOString().slice(0,10);
export function dayTotalParts(t){
 const parts=[],add=(n,text)=>{if(n>0)parts.push(text);};
 add(t?.coinsIn,`+${number(t?.coinsIn)} ${t?.coinsIn===1?'coin':'coins'}`);add(t?.coinsOut,`−${number(t?.coinsOut)} ${t?.coinsOut===1?'coin':'coins'}`);
 add(t?.diamondsIn,`+${number(t?.diamondsIn)} ${t?.diamondsIn===1?'diamond':'diamonds'}`);add(t?.diamondsOut,`−${number(t?.diamondsOut)} ${t?.diamondsOut===1?'diamond':'diamonds'}`);
 add(t?.xp,`+${number(t?.xp)} XP`);
 return parts.join(' · ');
}
export function dayTotalLine(t){const parts=dayTotalParts(t);return parts?line('account','day_total','Day total',parts):null;}
export function tallyDay(state,before,after,now=Date.now()){
 const day=utcDayOf(now),rows=[];let t=state.dayTally;
 if(t&&t.day!==day){const row=dayTotalLine(t);if(row&&/^\d{4}-\d{2}-\d{2}$/.test(t.day))rows.push({...row,at:`${t.day}T12:00:00.000Z`});t=null;}
 if(!t||typeof t!=='object')t={day,coinsIn:0,coinsOut:0,diamondsIn:0,diamondsOut:0,xp:0};
 const coins=(after.coins??0)-(before.coins??0),diamonds=(after.diamonds??0)-(before.diamonds??0),xp=(after.xp??0)-(before.xp??0);
 if(coins>0)t.coinsIn+=coins;else t.coinsOut-=coins;
 if(diamonds>0)t.diamondsIn+=diamonds;else t.diamondsOut-=diamonds;
 if(xp>0)t.xp+=xp;
 state.dayTally=t;return rows;
}
// The log lines for one farm action: the action itself (when it is one worth logging) and a level reached on the way.
export function farmLog(action,before,state,result){
 const rows=[],after=snapshot(state),known=FARM_ACTIONS[action?.type];
 if(known){const [category,text]=known,said=text(action,state,result);if(said!=null)rows.push(line(category,action.type,said,changes(before,after)));}   // null: nothing worth a line (a second harbour visit the same day)
 if(after.level>before.level)rows.push(line('farm','level',`Reached level ${after.level}`));
 return rows;
}
export function familyLog(action,before,state){
 const text=FAMILY_ACTIONS[action?.type];if(!text)return [];
 return [line('social',action.type,text,state?changes(before,snapshot(state)):'')];
}
// On opening the game: back after a while, and what was waiting (a gift from the staff, the invite reward, the email bonus, and since
// Oct 2026 a comeback chest after 3 days or more away).
// 13 Oct 2026 (the measurement package): opened from a reminder (from: 'push', notify-hourly's ?source=push in a browser or either app,
// or 'email', the daily email's ?source=email; src/main.js sends it once, with the first load after the tap) says so, also after less
// than 30 minutes away. Still the action 'open', so every count of opens stays the same.
export function loadLog({away,gift,inviteReward,emailBonus,comeback,from}){
 const rows=[];
 if(from==='push')rows.push(line('account','open',away>=60000?`Opened the game from a push reminder after ${awayText(away)}`:'Opened the game from a push reminder'));
 else if(from==='email')rows.push(line('account','open',away>=60000?`Opened the game from the daily email after ${awayText(away)}`:'Opened the game from the daily email'));
 else if(away>=30*60000)rows.push(line('account','open',`Opened the game after ${awayText(away)}`));
 if(gift&&(gift.coins||gift.diamonds||gift.xp||gift.itemCount))rows.push(line('staff','gift','Received a gift from the staff',changes({coins:0,diamonds:0,xp:0,inventory:{}},{coins:gift.coins??0,diamonds:gift.diamonds??0,xp:gift.xp??0,inventory:gift.item?{[gift.item]:gift.itemCount}:{}})));
 if(inviteReward)rows.push(line('social','invite','Got the reward for joining through an invite'));
 if(emailBonus)rows.push(line('rewards','email','Got the bonus for confirming the email address'));
 if(comeback)rows.push(line('rewards','comeback',`A comeback chest was waiting after ${comeback.days} days away`));
 return rows;
}
// Whole minutes, like the hours and days (13 Oct 2026: a reminder's open from 1 minute away said "1 minutes", and 59.5 "60 minutes").
function awayText(ms){const m=Math.floor(ms/60000),h=Math.floor(ms/3600000),d=Math.floor(h/24);return d?`${d} ${d===1?'day':'days'}`:h?`${h} ${h===1?'hour':'hours'}`:`${m} ${m===1?'minute':'minutes'}`;}
export const accountLog=(action,text)=>[line('account',action,text)];
// The reminder question after a harvest (13 Oct 2026, the measurement package; public/reminder-nudge.js): shown, and what the farmer
// did with it, in this log too (Tag Manager only has it with the farmer's consent). The game keeps them (public/farm-client.js note) and
// sends them along with its next request to farm-api, an action or a refresh (body.notes): no request of their own. Never trusted: at
// most NOTE_MAX a request, known steps and channels only, a whole level; anything else is left out.
// The question right after the farm's first daily gift (13 Oct 2026, item 4) says so when it is shown (at: 'gift'); its answer reads the same.
export const NOTE_MAX=5;
const REMINDER_NOTES={
 shown:{push:l=>`Was asked to turn on push reminders at level ${l}`,email:l=>`Was asked to turn on the daily email at level ${l}`},
 on:{push:()=>'Turned on push reminders from the question',email:()=>'Turned on the daily email from the question'},
 later:{push:()=>'Said “Not now” to push reminders',email:()=>'Said “Not now” to the daily email'},
 blocked:{push:()=>'Push reminders could not be turned on: notifications are blocked on this device'},
 failed:{push:()=>'Push reminders could not be turned on',email:()=>'The daily email could not be turned on'}
};
const GIFT_SHOWN={push:l=>`Was asked to turn on push reminders after the first daily gift, at level ${l}`,email:l=>`Was asked to turn on the daily email after the first daily gift, at level ${l}`};
export function noteLog(notes){
 if(!Array.isArray(notes))return [];
 return notes.slice(0,NOTE_MAX).flatMap(n=>{
  const texts=n&&typeof n==='object'&&n.kind==='reminder'&&Object.hasOwn(REMINDER_NOTES,n.step)?(n.step==='shown'&&n.at==='gift'?GIFT_SHOWN:REMINDER_NOTES[n.step]):null;
  const text=texts&&Object.hasOwn(texts,n.channel)?texts[n.channel]:null;
  const level=n?.level;if(!text||!Number.isSafeInteger(level)||level<1||level>9999)return [];
  return [line('account',`reminder_${n.step}`,text(level))];
 });
}
// A farm event's reward, when the farmer collects it (event-service.js): the event's name and what it paid.
export function eventRewardLog(title,reward){
 return [line('rewards','event_reward',`Collected the reward of the event ${title?`“${title}”`:''}`.trim(),changes({coins:0,diamonds:0,xp:0,inventory:{}},{coins:reward?.coins??0,diamonds:reward?.diamonds??0,xp:0,inventory:{}}))];
}
// The admin closed or opened Invite a friend for this farmer (18 Oct 2026, cheating with it).
export const inviteClosedLog=closed=>[line('staff',closed?'invite_close':'invite_open',closed?'The admin closed Invite a friend':'The admin opened Invite a friend again')];
// A removal (a minus in diamonds, 17 Oct 2026) says so: "The admin took back diamonds · −50 diamonds".
export function adminGrantLog(granted){
 if(granted.diamonds<0)return [line('staff','admin_take','The admin took back diamonds',changes({coins:0,diamonds:0,xp:0,inventory:{}},{coins:0,diamonds:granted.diamonds,xp:0,inventory:{}}))];
 return [line('staff','admin_grant','Received a gift from the admin',changes({coins:0,diamonds:0,xp:0,inventory:{}},{coins:granted.coins??0,diamonds:granted.diamonds??0,xp:granted.xp??0,inventory:granted.item?{[granted.item]:granted.itemCount}:{}}))];
}

// Adds the lines for one farmer; a problem only costs the log lines, never the action.
export async function writeLog(admin,playerId,rows,byPlayer=null){
 if(!rows?.length||!playerId)return;
 try{const saved=await admin.from('player_logs').insert(rows.map(r=>({player_id:playerId,category:r.category,action:r.action,text:r.text,by_player:byPlayer,...(r.at?{created_at:r.at}:{})})));if(saved.error)console.error('Log failed',saved.error.code);}
 catch(error){console.error('Log failed',error?.name);}
}

// Reading a log: your own, or anyone's for the staff. Purchases only for the farmer themself and the admin. Newest first,
// LOG_PAGE lines at a time; `before` is the id of the last line already shown.
export async function handlePlayerLog({admin,user,body}){
 const respond=(data,status=200)=>({status,data:{...data,profile:{player_id:user.id}}});
 const playerId=String(body?.playerId??user.id),own=playerId===user.id;
 if(!/^[0-9a-f-]{36}$/i.test(playerId))return respond({error:'Choose a farmer.'},400);
 if(!own&&!(await isStaff(admin,user)))return respond({error:'Not authorized.'},403);
 const category=body?.category&&LOG_CATEGORIES.includes(body.category)?body.category:null,purchases=own||isSuperadmin(user);
 if(category==='purchase'&&!purchases)return respond({entries:[],more:false,categories:LOG_CATEGORIES.filter(c=>c!=='purchase')});
 let query=admin.from('player_logs').select('id,created_at,category,action,text,by_player').eq('player_id',playerId).order('id',{ascending:false}).limit(LOG_PAGE+1);
 if(category)query=query.eq('category',category);else if(!purchases)query=query.neq('category','purchase');
 if(Number.isSafeInteger(Number(body?.before))&&Number(body.before)>0)query=query.lt('id',Number(body.before));
 const found=await query;if(found.error)throw found.error;
 const rows=found.data??[],more=rows.length>LOG_PAGE,shown=rows.slice(0,LOG_PAGE);
 const staffIds=[...new Set(shown.map(r=>r.by_player).filter(Boolean))];
 let names=new Map();
 if(staffIds.length){const people=await admin.from('player_stats').select('player_id,username').in('player_id',staffIds);if(!people.error)names=new Map((people.data??[]).map(p=>[p.player_id,p.username]));}
 // Today's totals (30 Oct 2026) head the first page of All and Account, from the farm itself.
 let today=null;
 if(!(Number(body?.before)>0)&&(!category||category==='account'))try{const farm=await admin.from('player_farms').select('tally:state->dayTally').eq('player_id',playerId).maybeSingle();const t=farm?.data?.tally;if(t?.day===utcDayOf(Date.now()))today=dayTotalLine(t)?.text??null;}catch{}   // without it the log reads as before
 return respond({entries:shown.map(r=>({id:r.id,at:r.created_at,category:r.category,action:r.action,text:r.text,by:r.by_player?names.get(r.by_player)??'Staff':null})),more,today,categories:purchases?LOG_CATEGORIES:LOG_CATEGORIES.filter(c=>c!=='purchase')});
}
