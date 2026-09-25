import {ITEMS,BUILDINGS,CROPS,BOOSTS,IMPROVEMENTS,levelOf,recipeFor} from './farm-state.js';
import {isStaff,isSuperadmin} from './admin-service.js';

// A log per farmer (26 Sep 2026): what they did and what it gave or cost, with the time, in categories. The farmer reads their own
// on their profile; the admin and the moderators read everyone's, except purchases with real money, which only the farmer and the
// admin see. Rows live in player_logs (supabase/player-logs.sql) for 90 days. Planting, watering, care and harvesting are not
// logged one by one: they are three quarters of all actions and would fill the log without saying much. Writing happens after the
// reply (EdgeRuntime.waitUntil in index.ts), so the game never waits for it, and it never costs an extra request.
export const LOG_CATEGORIES=Object.freeze(['account','farm','production','market','rewards','diamonds','social','staff','purchase']);
export const LOG_PAGE=50;
const number=value=>Number(value).toLocaleString('en-US');
const itemName=key=>ITEMS[key]?.name??key;
const building=key=>BUILDINGS[key]?.name??'building';
const batches=count=>`${number(count)} ${count===1?'batch':'batches'}`;

// What a farm has before and after an action; the difference is what the log line says it gave or cost.
export function snapshot(state){return {coins:state.coins,diamonds:state.diamonds,xp:state.xp,level:levelOf(state),inventory:{...state.inventory}};}
export function changes(before,after){
 const parts=[],signed=(value,label)=>{if(value)parts.push(`${value>0?'+':'−'}${number(Math.abs(value))} ${label}`);};
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
 upgrade:['farm',(a,s)=>`Upgraded the ${building(a.building)} to level ${s.buildings[a.building]?.level??''}${a.currency==='diamonds'?' with diamonds':''}`],
 expand:['farm',(a,s)=>`Unlocked field ${s.plots.length}`],
 silo_upgrade:['farm',(a,s)=>`Silo research step ${s.siloLevel}`],
 improve:['farm',(a)=>`Built ${IMPROVEMENTS[a.id]?.name??'an estate improvement'}`],
 clear_planting:['farm',()=>'Removed a crop from a field'],
 ranch_focus:['farm',()=>'Changed the ranch focus'],
 produce:['production',(a,s,r)=>`Started ${batches(r?.count??1)} of ${recipeFor(s,a.recipe)?.name??'a recipe'}`],
 collect:['production',(a)=>`Collected a batch at the ${building(a.building)}`],
 collect_all:['production',(a,s,r)=>`Collected ${batches(r?.count??1)} at the ${building(a.building)}`],
 sell:['market',(a)=>a.item&&a.item!=='all'?`Sold ${itemName(a.item)}`:`Sold all ${a.category==='goods'?'goods':'crops'}`],
 delivery:['market',()=>'Delivered an order'],
 replace_order:['market',()=>'Replaced a delivery order'],
 stall_collect:['market',()=>'Collected the farm stall'],
 stall_upgrade:['market',()=>'Upgraded the farm stall'],
 valley_sell:['market',()=>'Sold a basket at the Valley Market'],
 valley_skip:['market',()=>'Sent a Valley Market customer away'],
 depot_load:['market',()=>'Loaded an export trailer'],
 depot_skip:['market',()=>'Skipped an export order'],
 fair_enter:['market',()=>'Entered the Grand Valley Fair'],
 quest:['rewards',()=>'Claimed a quest'],
 beginner_claim:['rewards',()=>'Claimed a beginner guide step'],
 daily:['rewards',()=>'Claimed a daily challenge'],
 checkin:['rewards',()=>'Opened the daily gift'],
 level_rewards:['rewards',()=>'Collected level rewards'],
 mastery:['rewards',(a)=>`Earned a ${CROPS[a.crop]?.name??'crop'} mastery medal`],
 chore:['rewards',()=>'Did a farm chore'],
 activity_work:['rewards',()=>'Lent a helping hand'],
 project_start:['rewards',()=>'Started an estate project'],
 project_collect:['rewards',()=>'Finished an estate project'],
 finish_batch:['diamonds',(a)=>`Finished a batch at the ${building(a.building)} with diamonds`],
 finish_crop:['diamonds',()=>'Finished a field with diamonds'],
 buy_boost:['diamonds',(a)=>`Used the boost ${BOOSTS[a.boost]?.name??''}`.trim()],
 buy_vip:['diamonds',()=>'Bought VIP']
};
const FAMILY_ACTIONS={family_create:'Started a family',family_join:'Joined a family',family_accept_invite:'Accepted a family invitation',
 family_decline_invite:'Declined a family invitation',family_leave:'Left the family',family_kick:'Removed a member from the family',
 family_promote:'Changed a member\'s role in the family',family_invite:'Invited a farmer to the family',family_cancel_invite:'Cancelled a family invitation',
 family_contribute:'Delivered to the Family Order',family_claim:'Claimed a family reward',family_tournament_goods:'Delivered goods for the family tournament',
 family_rename:'Renamed the family',family_emblem:'Changed the family emblem',family_open:'Changed who can join the family'};

const line=(category,action,text,detail)=>({category,action,text:(detail?`${text} · ${detail}`:text).slice(0,240)});
// The log lines for one farm action: the action itself (when it is one worth logging) and a level reached on the way.
export function farmLog(action,before,state,result){
 const rows=[],after=snapshot(state),known=FARM_ACTIONS[action?.type];
 if(known){const [category,text]=known;rows.push(line(category,action.type,text(action,state,result),changes(before,after)));}
 if(after.level>before.level)rows.push(line('farm','level',`Reached level ${after.level}`));
 return rows;
}
export function familyLog(action,before,state){
 const text=FAMILY_ACTIONS[action?.type];if(!text)return [];
 return [line('social',action.type,text,state?changes(before,snapshot(state)):'')];
}
// On opening the game: back after a while, and what was waiting (a gift from the staff, the invite reward, the email bonus).
export function loadLog({away,gift,inviteReward,emailBonus}){
 const rows=[];
 if(away>=30*60000)rows.push(line('account','open',`Opened the game after ${awayText(away)}`));
 if(gift&&(gift.coins||gift.diamonds||gift.xp||gift.itemCount))rows.push(line('staff','gift','Received a gift from the staff',changes({coins:0,diamonds:0,xp:0,inventory:{}},{coins:gift.coins??0,diamonds:gift.diamonds??0,xp:gift.xp??0,inventory:gift.item?{[gift.item]:gift.itemCount}:{}})));
 if(inviteReward)rows.push(line('social','invite','Got the reward for joining through an invite'));
 if(emailBonus)rows.push(line('rewards','email','Got the bonus for confirming the email address'));
 return rows;
}
function awayText(ms){const h=Math.floor(ms/3600000),d=Math.floor(h/24);return d?`${d} ${d===1?'day':'days'}`:h?`${h} ${h===1?'hour':'hours'}`:`${Math.round(ms/60000)} minutes`;}
export const accountLog=(action,text)=>[line('account',action,text)];
export function adminGrantLog(granted){
 return [line('staff','admin_grant','Received a gift from the admin',changes({coins:0,diamonds:0,xp:0,inventory:{}},{coins:granted.coins??0,diamonds:granted.diamonds??0,xp:granted.xp??0,inventory:granted.item?{[granted.item]:granted.itemCount}:{}}))];
}

// Adds the lines for one farmer; a problem only costs the log lines, never the action.
export async function writeLog(admin,playerId,rows,byPlayer=null){
 if(!rows?.length||!playerId)return;
 try{const saved=await admin.from('player_logs').insert(rows.map(r=>({player_id:playerId,category:r.category,action:r.action,text:r.text,by_player:byPlayer})));if(saved.error)console.error('Log failed',saved.error.code);}
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
 let query=admin.from('player_logs').select('id,created_at,category,text,by_player').eq('player_id',playerId).order('id',{ascending:false}).limit(LOG_PAGE+1);
 if(category)query=query.eq('category',category);else if(!purchases)query=query.neq('category','purchase');
 if(Number.isSafeInteger(Number(body?.before))&&Number(body.before)>0)query=query.lt('id',Number(body.before));
 const found=await query;if(found.error)throw found.error;
 const rows=found.data??[],more=rows.length>LOG_PAGE,shown=rows.slice(0,LOG_PAGE);
 const staffIds=[...new Set(shown.map(r=>r.by_player).filter(Boolean))];
 let names=new Map();
 if(staffIds.length){const people=await admin.from('player_stats').select('player_id,username').in('player_id',staffIds);if(!people.error)names=new Map((people.data??[]).map(p=>[p.player_id,p.username]));}
 return respond({entries:shown.map(r=>({id:r.id,at:r.created_at,category:r.category,text:r.text,by:r.by_player?names.get(r.by_player)??'Staff':null})),more,categories:purchases?LOG_CATEGORIES:LOG_CATEGORIES.filter(c=>c!=='purchase')});
}
