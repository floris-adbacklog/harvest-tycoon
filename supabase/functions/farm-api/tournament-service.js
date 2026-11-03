// The Super Tournament (3 Nov 2026; rules in tournament.js, the tables and the score in supabase/super-tournament.sql).
// operation 'tournament': the farmer's view (the running one, or the last that ended, with the top and their own place) and claim;
// operation 'admin_tournament': the admin starts and stops one by hand and keeps the weekly plans (the automatic pilot), superadmin only.
import {isSuperadmin} from './admin-service.js';
import {writeLog,tournamentPrizeLog} from './player-log.js';
import {CROPS,ITEMS} from './farm-state.js';
import {TOURNAMENT_KINDS,TOURNAMENT_HOURS,tournamentScoring,tournamentSettings,tournamentPot,tournamentPrizes} from './tournament.js';

const HOUR_MS=3600000,DAY_MS=86400000,TOP=20;
// The goods a Goods Tournament may pick: the farm's own (World I), not crops or heirlooms, as the admin's gift list groups them.
export const TOURNAMENT_GOODS=Object.freeze(Object.fromEntries(Object.entries(ITEMS).filter(([key,item])=>!Object.hasOwn(CROPS,key)&&!item.heirloom&&(item.world??1)===1)));
// The News a new tournament posts for everyone, in every language the game speaks (art: the finish flag beside it in the chat).
export const TOURNAMENT_NEWS=Object.freeze({
 body:'A new Super Tournament has started! Open it from the menu and take part: the best farmers win diamonds and coins.',
 texts:{
  nl:{body:'Er is een nieuw Supertoernooi begonnen! Open het via het menu en doe mee: de beste boeren winnen diamanten en munten.'},
  es:{body:'¡Ha empezado un nuevo Supertorneo! Ábrelo desde el menú y participa: los mejores granjeros ganan diamantes y monedas.'},
  fr:{body:'Un nouveau Super Tournoi a commencé ! Ouvre-le depuis le menu et participe : les meilleurs fermiers gagnent des diamants et des pièces.'},
  de:{body:'Ein neues Superturnier hat begonnen! Öffne es im Menü und mach mit: Die besten Farmer gewinnen Diamanten und Münzen.'},
  pt:{body:'Um novo Supertorneio começou! Abra pelo menu e participe: os melhores fazendeiros ganham diamantes e moedas.'},
  cs:{body:'Začal nový Superturnaj! Otevři ho v menu a zapoj se: nejlepší farmáři vyhrávají diamanty a mince.'},
  hu:{body:'Elindult egy új Szuperverseny! Nyisd meg a menüből és szállj be: a legjobb farmerek gyémántokat és érméket nyernek.'},
  tr:{body:'Yeni bir Süper Turnuva başladı! Menüden aç ve katıl: en iyi çiftçiler elmas ve altın kazanır.'},
  ru:{body:'Начался новый Супертурнир! Открой его в меню и участвуй: лучшие фермеры выигрывают алмазы и монеты.'},
  uk:{body:'Почався новий Супертурнір! Відкрий його в меню й бери участь: найкращі фермери виграють діаманти й монети.'},
  id:{body:'Super Turnamen baru telah dimulai! Buka dari menu dan ikut serta: petani terbaik memenangkan berlian dan koin.'},
  hi:{body:'एक नया सुपर टूर्नामेंट शुरू हो गया है! इसे मेनू से खोलें और हिस्सा लें: सबसे अच्छे किसान हीरे और सिक्के जीतते हैं।'},
  ja:{body:'新しいスーパートーナメントが始まりました！メニューから開いて参加しよう。上位の農家はダイヤとコインを獲得できます。'},
  zh:{body:'新的超级锦标赛开始了！从菜单打开并参加：最优秀的农夫将赢得钻石和金币。'},
  ar:{body:'بدأت بطولة كبرى جديدة! افتحها من القائمة وشارك: أفضل المزارعين يربحون الماس والعملات.'},
  art:'tournament'
 }
});

// What the admin sent for a tournament or a plan, checked against the rules: the kind and its pick, a title, hours and settings.
export function validateTournament(config){
 const kind=String(config?.kind??''),def=TOURNAMENT_KINDS[kind];if(!def)throw Error('Choose a kind of tournament.');
 const pick=def.pick?String(config?.pick??''):null;
 const scoring=tournamentScoring(kind,pick,{crops:CROPS,goods:TOURNAMENT_GOODS});if(!scoring)throw Error(def.pick==='crop'?'Choose a crop.':'Choose a good.');
 const title=String(config?.title??'').trim()||def.title;if(title.length<3||title.length>80)throw Error('The title has 3 to 80 characters.');
 const hours=Math.round(Number(config?.hours));if(!Number.isFinite(hours)||hours<TOURNAMENT_HOURS[0]||hours>TOURNAMENT_HOURS[1])throw Error(`A tournament lasts ${TOURNAMENT_HOURS[0]} to ${TOURNAMENT_HOURS[1]} hours.`);
 return {kind,pick,title,scoring,hours,settings:tournamentSettings(config?.settings)};
}
export function validatePlan(config){
 const base=validateTournament(config);
 const weekday=Number(config?.weekday),atMinute=Number(config?.atMinute);
 if(!Number.isInteger(weekday)||weekday<0||weekday>6)throw Error('Choose a day of the week.');
 if(!Number.isInteger(atMinute)||atMinute<0||atMinute>1439)throw Error('Choose a time (UTC).');
 return {...base,weekday,atMinute,active:config?.active!==false};
}
const running=now=>t=>!t.settled_at&&!t.stopped_at&&Date.parse(t.starts_at)<=now&&Date.parse(t.ends_at)>now;
const shape=(t,now)=>({id:t.id,kind:t.kind,pick:t.pick,title:t.title,startsAt:t.starts_at,endsAt:t.ends_at,stoppedAt:t.stopped_at,settledAt:t.settled_at,settings:t.settings,running:running(now)(t),
 participants:t.participants,counted:t.counted,pot:t.settled_at?{counted:t.counted,diamonds:t.pot_diamonds,coins:t.pot_coins,places:t.places}:null});

// The names, levels and avatars beside a list of rows (as the events' standings show them).
async function dress(admin,rows,me){
 const ids=[...new Set(rows.map(r=>r.player_id))];
 const names=ids.length?await admin.from('player_stats').select('player_id,username,level,avatar_id,vip_expires_at').in('player_id',ids):{data:[]};
 if(names.error)throw names.error;
 const byId=new Map(names.data.map(p=>[p.player_id,p]));
 return rows.map(r=>({rank:r.rank,playerId:r.player_id,score:Number(r.score)||0,place:r.place??null,coins:r.coins??0,diamonds:r.diamonds??0,
  username:byId.get(r.player_id)?.username??'Farmer',level:byId.get(r.player_id)?.level??null,avatarId:byId.get(r.player_id)?.avatar_id??null,vipExpiresAt:Date.parse(byId.get(r.player_id)?.vip_expires_at)||0,isYou:r.player_id===me}));
}
// The farmer's view of one tournament: everyone taking part, who counts for the pot, the pot "if it ended now" while it runs (the
// settled one once it ended), the top, and the farmer's own row and rank.
async function view(admin,t,me,now){
 const min=t.settings?.minScore??10;
 const [top,total,counted,mine]=await Promise.all([
  admin.from('harvest_tournament_players').select('player_id,score,scored_at,place,coins,diamonds').eq('tournament_id',t.id).order('score',{ascending:false}).order('scored_at').order('player_id').limit(TOP),
  admin.from('harvest_tournament_players').select('player_id',{count:'exact',head:true}).eq('tournament_id',t.id),
  admin.from('harvest_tournament_players').select('player_id',{count:'exact',head:true}).eq('tournament_id',t.id).gte('score',min),
  admin.from('harvest_tournament_players').select('player_id,score,scored_at,place,coins,diamonds,claimed_at').eq('tournament_id',t.id).eq('player_id',me).maybeSingle()
 ]);
 for(const r of [top,total,counted,mine])if(r.error)throw r.error;
 let you=null;
 if(mine.data){
  const ahead=await admin.from('harvest_tournament_players').select('player_id',{count:'exact',head:true}).eq('tournament_id',t.id).or(`score.gt.${Number(mine.data.score)||0},and(score.eq.${Number(mine.data.score)||0},scored_at.lt.${mine.data.scored_at})`);
  if(ahead.error)throw ahead.error;
  you={rank:(ahead.count??0)+1,score:Number(mine.data.score)||0,place:mine.data.place,coins:mine.data.coins,diamonds:mine.data.diamonds,claimed:Boolean(mine.data.claimed_at),counts:(Number(mine.data.score)||0)>=min};
 }
 const pot=t.settled_at?{counted:t.counted,diamonds:t.pot_diamonds,coins:t.pot_coins,places:t.places}:tournamentPot(counted.count??0,t.settings);
 const prizes=t.settled_at?null:tournamentPrizes(counted.count??0,t.settings);
 const rows=await dress(admin,top.data.map((r,i)=>({...r,rank:i+1})),me);
 // While it runs, each top row shows the prize its place would win if it ended now (only a row that counts).
 if(prizes)for(const r of rows){const p=r.score>=min?prizes[r.rank-1]:null;r.coins=p?.coins??0;r.diamonds=p?.diamonds??0;}
 if(you&&!t.settled_at){const p=you.counts?prizes[you.rank-1]:null;you.coins=p?.coins??0;you.diamonds=p?.diamonds??0;}
 return {...shape(t,now),participants:total.count??0,counted:counted.count??0,pot,top:rows,you};
}

export async function handleTournament({admin,body,user,now=Date.now()}){
 const respond=(data,status=200)=>({status,data:{...data,serverNow:now,profile:{player_id:user.id}}});
 const managing=body.operation==='admin_tournament';
 if(managing&&!isSuperadmin(user))return respond({error:'Not authorized.'},403);
 try{
  if(managing)return respond(await manage(admin,body,user,now));
  if(body.command==='claim'){
   const r=await admin.rpc('harvest_tournament_claim',{p_player:user.id,p_tournament:String(body.tournamentId??'')});if(r.error)throw r.error;
   if(r.data?.coins||r.data?.diamonds){
    const t=await admin.from('harvest_tournaments').select('title').eq('id',body.tournamentId).maybeSingle();
    globalThis.EdgeRuntime?.waitUntil?.(writeLog(admin,user.id,tournamentPrizeLog(t.data?.title??null,r.data)));
   }
   return respond({prize:r.data});
  }
  if(body.command&&body.command!=='view')throw Error('Unknown tournament command.');
  // The running one, otherwise the last that ended in the past 2 days (settled first, so its prizes are there to collect).
  const list=await admin.from('harvest_tournaments').select('*').lte('starts_at',new Date(now).toISOString()).gte('ends_at',new Date(now-2*DAY_MS).toISOString()).order('starts_at',{ascending:false}).limit(3);
  if(list.error)throw list.error;
  let shown=list.data.find(running(now))??list.data[0]??null;
  if(shown&&!shown.settled_at&&!running(now)(shown)){
   const s=await admin.rpc('harvest_tournament_settle',{p_tournament:shown.id});if(s.error)throw s.error;
   const again=await admin.from('harvest_tournaments').select('*').eq('id',shown.id).single();if(again.error)throw again.error;shown=again.data;
  }
  // Prizes still to collect, up to 30 days back (also from an older tournament than the one shown).
  const owed=await admin.from('harvest_tournament_players').select('tournament_id,place,coins,diamonds,harvest_tournaments!inner(title,settled_at,ends_at)').eq('player_id',user.id).is('claimed_at',null).not('place','is',null).gte('harvest_tournaments.ends_at',new Date(now-30*DAY_MS).toISOString()).limit(5);
  if(owed.error)throw owed.error;
  return respond({tournament:shown?await view(admin,shown,user.id,now):null,owed:owed.data.filter(o=>o.harvest_tournaments?.settled_at&&o.coins+o.diamonds>0).map(o=>({tournamentId:o.tournament_id,title:o.harvest_tournaments.title,place:o.place,coins:o.coins,diamonds:o.diamonds}))});
 }catch(error){if(error.code&&!['P0001','23514','23505','22P02'].includes(error.code))throw error;return respond({error:error.message},422);}
}

async function manage(admin,body,user,now){
 const iso=new Date(now).toISOString();
 if(body.command==='start'){
  const c=validateTournament(body.config);
  const busy=await admin.from('harvest_tournaments').select('id').is('settled_at',null).is('stopped_at',null).gt('ends_at',iso).limit(1);
  if(busy.error)throw busy.error;if(busy.data.length)throw Error('A tournament is running already. Stop it first.');
  const ends=new Date(now+c.hours*HOUR_MS).toISOString();
  const made=await admin.from('harvest_tournaments').insert({kind:c.kind,pick:c.pick,title:c.title,scoring:c.scoring,settings:c.settings,starts_at:iso,ends_at:ends,created_by:user.id}).select().single();
  if(made.error)throw made.error;
  if(body.news!==false){const posted=await admin.from('player_notices').insert({player_id:null,kind:'news',body:TOURNAMENT_NEWS.body,expires_at:ends,texts:TOURNAMENT_NEWS.texts,min_level:null,no_portals:false});if(posted.error)console.error('Tournament news failed',posted.error.message);}
  return {tournament:shape(made.data,now)};
 }
 if(body.command==='stop'){
  const stopped=await admin.from('harvest_tournaments').update({stopped_at:iso}).eq('id',body.tournamentId).is('settled_at',null).is('stopped_at',null).select();
  if(stopped.error)throw stopped.error;if(!stopped.data.length)throw Error('This tournament has ended already.');
  const s=await admin.rpc('harvest_tournament_settle',{p_tournament:body.tournamentId});if(s.error)throw s.error;
  return {stopped:true};
 }
 if(body.command==='plan_save'){
  const c=validatePlan(body.config);
  const row={kind:c.kind,pick:c.pick,title:c.title,scoring:c.scoring,settings:c.settings,weekday:c.weekday,at_minute:c.atMinute,hours:c.hours,active:c.active,news:body.news===false?null:TOURNAMENT_NEWS};
  const saved=body.planId?await admin.from('harvest_tournament_plans').update(row).eq('id',body.planId).select():await admin.from('harvest_tournament_plans').insert({...row,created_by:user.id}).select();
  if(saved.error)throw saved.error;if(!saved.data?.length)throw Error('This plan no longer exists.');
  return {plan:saved.data[0]};
 }
 if(body.command==='plan_toggle'){
  if(typeof body.active!=='boolean')throw Error('Choose on or off.');
  const r=await admin.from('harvest_tournament_plans').update({active:body.active}).eq('id',body.planId).select();if(r.error)throw r.error;if(!r.data.length)throw Error('This plan no longer exists.');
  return {plan:r.data[0]};
 }
 if(body.command==='plan_delete'){
  const r=await admin.from('harvest_tournament_plans').delete().eq('id',body.planId).select('id');if(r.error)throw r.error;
  return {deleted:r.data.length};
 }
 if(body.command==='results'){
  const s=await admin.rpc('harvest_tournament_settle',{p_tournament:body.tournamentId});if(s.error)throw s.error;
  const [t,rows]=await Promise.all([admin.from('harvest_tournaments').select('*').eq('id',body.tournamentId).single(),
   admin.from('harvest_tournament_players').select('player_id,score,scored_at,place,coins,diamonds,claimed_at').eq('tournament_id',body.tournamentId).order('score',{ascending:false}).order('scored_at').order('player_id').limit(100)]);
  for(const r of [t,rows])if(r.error)throw r.error;
  const shown=await dress(admin,rows.data.map((r,i)=>({...r,rank:i+1})),user.id);
  return {tournament:{...shape(t.data,now),participants:t.data.participants,counted:t.data.counted},rows:shown.map((r,i)=>({...r,claimed:Boolean(rows.data[i].claimed_at)}))};
 }
 if(body.command&&body.command!=='list')throw Error('Unknown tournament command.');
 const [list,plans]=await Promise.all([admin.from('harvest_tournaments').select('*').order('starts_at',{ascending:false}).limit(20),admin.from('harvest_tournament_plans').select('*').order('weekday').order('at_minute')]);
 for(const r of [list,plans])if(r.error)throw r.error;
 // Live counts for the running one (the settled ones carry their own).
 const tournaments=list.data.map(t=>shape(t,now));
 const live=tournaments.find(t=>t.running);
 if(live){const [a,b]=await Promise.all([admin.from('harvest_tournament_players').select('player_id',{count:'exact',head:true}).eq('tournament_id',live.id),admin.from('harvest_tournament_players').select('player_id',{count:'exact',head:true}).eq('tournament_id',live.id).gte('score',live.settings?.minScore??10)]);
  for(const r of [a,b])if(r.error)throw r.error;live.participants=a.count??0;live.counted=b.count??0;live.pot=tournamentPot(live.counted,live.settings);}
 return {tournaments,plans:plans.data.map(p=>({id:p.id,kind:p.kind,pick:p.pick,title:p.title,settings:p.settings,weekday:p.weekday,atMinute:p.at_minute,hours:p.hours,active:p.active,lastStart:p.last_start,news:Boolean(p.news)}))};
}
