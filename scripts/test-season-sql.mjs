// Isolated PostgreSQL/WASM check of supabase/season-pass-engine.sql (Oct 2026); never connects to Supabase. The functions it patches are
// set up here from their live bodies of 20 Oct 2026 (the parts the patches touch are copied exactly), the md5 guards point at those
// copies, and then: the constraints, one season purchase per farmer and season, crediting into passPremium, a payment after the season,
// the refund trigger (passPremium, worn paid looks, a paid avatar), the event counter and the avatar ids.
// Install @electric-sql/pglite@0.5.8 in a separate directory and set HARVEST_PGLITE_MODULE to its dist/index.js:
//   HARVEST_PGLITE_MODULE=/path/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-season-sql.mjs
import assert from 'node:assert/strict';
import {SQL,LIVE_MD5} from './season-pass-sql.mjs';
const {PGlite}=await import(process.env.HARVEST_PGLITE_MODULE??'@electric-sql/pglite');
const db=new PGlite();let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
const one=async(sql,params)=>(await db.query(sql,params)).rows[0];
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema net;
create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as 'select 1::bigint';
create table auth.users(id uuid primary key);insert into auth.users values('00000000-0000-0000-0000-00000000000a');
create table public.player_stats(player_id uuid primary key,username text,currency integer,level integer default 1,updated_at timestamptz,
 avatar_id text not null default 'default' check (avatar_id = any (array['default','owner','lantern-keeper'])));
create table public.player_farms(player_id uuid primary key,state jsonb,revision bigint default 1,updated_at timestamptz default now());
create table public.player_logs(player_id uuid,category text,action text,text text);
create table public.player_notices(id uuid primary key default gen_random_uuid(),player_id uuid,kind text,body text);
create table public.chat_settings(player_id uuid,purchase_alerts_off boolean);create table public.push_subscriptions(player_id uuid);create table public.app_push_players(player_id uuid,enabled boolean);
create function public.chat_staff_role(p uuid) returns text language sql as $$select case when p='00000000-0000-0000-0000-00000000000a' then 'admin' end$$;
create table public.harvest_purchases(id uuid primary key,player_id uuid,pack text,diamonds integer default 0,coins integer default 0,vip_days integer default 0,amount_cents integer,
 offer_id uuid,pass_id text,status text default 'pending',livemode boolean default true,store text default 'stripe',kreds integer,stripe_payment_id text,account_deleted_at timestamptz,refunded_at timestamptz,credited_at timestamptz);
create table public.live_event_players(event_id uuid,player_id uuid,qualified boolean,claimed_at timestamptz,coins integer,diamonds integer,paid_diamonds integer);
create table public.live_events(id uuid primary key,settled_at timestamptz);
create function public.harvest_event_settle(p uuid) returns void language sql as '';
`);
// The live bodies (20 Oct 2026), as read with select prosrc: the grant whole, the others with the line the patch needs.
const LIVE={
 'harvest_purchase_grant(uuid)':['p_purchase uuid','void',false,`
declare purchase public.harvest_purchases%rowtype; farm_state jsonb; goods jsonb; crop text; vip_until bigint;
begin
 select * into purchase from public.harvest_purchases where id=p_purchase;
 if not found then raise exception 'Unknown purchase'; end if;
 select state into farm_state from public.player_farms where player_id=purchase.player_id for update;
 if not found then raise exception 'Farm is missing'; end if;
 farm_state:=jsonb_set(farm_state,'{diamonds}',to_jsonb(coalesce((farm_state->>'diamonds')::bigint,0)+purchase.diamonds));
 if purchase.pack='pass' then
  farm_state:=jsonb_set(farm_state,'{passPremium}',(select coalesce(jsonb_agg(distinct v),'[]'::jsonb) from jsonb_array_elements(
   (case when jsonb_typeof(farm_state->'passPremium')='array' then farm_state->'passPremium' else '[]'::jsonb end)||jsonb_build_array(purchase.pass_id)) v));
 end if;
 update public.player_farms set state=farm_state,revision=revision+1,updated_at=now() where player_id=purchase.player_id;
end `],
 'harvest_purchase_alert()':['','trigger',true,`
declare what text;
begin
 what:=case when new.pack='starter' then 'the Starter Pack'
  when new.pack='pass' then 'the Halloween Pass'
  else to_char(new.diamonds,'FM999G999')||' diamonds' end;
 insert into public.player_notices(player_id,kind,body) values('00000000-0000-0000-0000-00000000000a','purchase','bought '||what);
 return new;
end `],
 'harvest_purchase_log()':['','trigger',true,`
begin
 insert into public.player_logs(player_id,category,action,text) values(new.player_id,'purchase','purchase','Bought '||case when new.pack='starter' then 'the Starter Pack'
    when new.pack='pass' then 'the Halloween Pass'
    else to_char(new.diamonds,'FM999G999')||' diamonds' end);
 return new;
end `],
 ...Object.fromEntries(['play','apple','kong'].map(store=>[`harvest_revoke_${store}_purchases(jsonb)`,['p_items jsonb','jsonb',false,`
declare purchase public.harvest_purchases%rowtype; n integer:=0;
begin
 select * into purchase from public.harvest_purchases where id=(p_items->>'id')::uuid for update;
 insert into public.player_logs(player_id,category,action,text) values(purchase.player_id,'purchase','refund','Refunded: '
     ||case when purchase.pack='starter' then 'the Starter Pack' when purchase.pack='pass' then 'the Halloween Pass' when purchase.pack='offer' then 'the special offer'
      else to_char(purchase.diamonds,'FM999G999')||' diamonds' end);
 update public.harvest_purchases set status='refunded',refunded_at=now() where id=purchase.id;
 return jsonb_build_object('revoked',1);
end `]])),
 'harvest_event_claim(uuid,uuid)':['p_player uuid, p_event uuid','jsonb',false,`
declare p public.live_event_players; farm public.player_farms; paid integer;
begin
 select * into farm from public.player_farms where player_id=p_player for update;
 select * into p from public.live_event_players where player_id=p_player and event_id=p_event for update;
 paid:=greatest(0,p.diamonds);
 farm.state:=jsonb_set(jsonb_set(farm.state,'{coins}',to_jsonb((farm.state->>'coins')::integer+p.coins)),'{diamonds}',to_jsonb((farm.state->>'diamonds')::integer+paid));
 update public.player_farms set state=farm.state,revision=revision+1,updated_at=now() where player_id=p_player;
 update public.live_event_players set claimed_at=now(),paid_diamonds=paid where event_id=p_event and player_id=p_player;
 return jsonb_build_object('coins',p.coins,'diamonds',paid);
end `]
};
let sql=SQL;
for(const [sig,[args,returns,definer,body]] of Object.entries(LIVE)){
 const name=sig.slice(0,sig.indexOf('('));
 await db.exec(`create or replace function public.${name}(${args}) returns ${returns} language plpgsql ${definer?'security definer ':''}set search_path to '' as $function$${body}$function$;`);
 const {m}=await one(`select md5(prosrc) m from pg_proc where oid='public.${sig}'::regprocedure`);
 sql=sql.replace(`'${LIVE_MD5[sig]}'`,`'${m}'`);
}
await db.exec(`create trigger harvest_purchase_alert after update of status on public.harvest_purchases for each row when (old.status='pending' and new.status in ('credited','test_paid')) execute function public.harvest_purchase_alert();
create trigger harvest_purchase_log after update of status on public.harvest_purchases for each row when (old.status='pending' and new.status in ('credited','test_paid')) execute function public.harvest_purchase_log();`);
// A changed body is refused, and nothing of the file stays.
await assert.rejects(db.exec(SQL),/is not the body read on 20 Oct 2026/);await db.exec('rollback');
check(!(await one(`select 1 x from information_schema.columns where table_name='player_stats' and column_name='look'`)),'a refused run leaves nothing behind');
await db.exec(sql);
const farmer='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
for(const id of [farmer,other]){await db.query(`insert into public.player_stats(player_id,username) values($1,'F')`,[id]);await db.query(`insert into public.player_farms(player_id,state) values($1,'{"diamonds":5,"coins":10,"stats":{}}')`,[id]);}
const buy=(id,player,extra={})=>db.query(`insert into public.harvest_purchases(id,player_id,pack,amount_cents,pass_id,store) values($1,$2,$3,$4,$5,$6)`,
 [id,player,extra.pack??'season',extra.cents??1999,extra.pass??'autumn-2026',extra.store??'stripe']);
const p1=crypto.randomUUID(),p2=crypto.randomUUID();
await buy(p1,farmer);
await assert.rejects(buy(p2,farmer),/harvest_one_season_per_player/,'one Season Pass per farmer and season');checks++;
await assert.rejects(buy(crypto.randomUUID(),other,{cents:499}),/harvest_pack_amount_matches/,'€19.99 only');checks++;
await assert.rejects(db.query(`insert into public.harvest_purchases(id,player_id,pack,amount_cents,pass_id,diamonds) values($1,$2,'season',1999,'autumn-2026',50)`,[crypto.randomUUID(),other]),/check/,'no diamonds of its own');checks++;
// Crediting: the season into passPremium, never twice; the notice and the log name it.
await db.query(`select public.harvest_purchase_grant($1)`,[p1]);await db.query(`select public.harvest_purchase_grant($1)`,[p1]);
await db.query(`update public.harvest_purchases set status='credited' where id=$1`,[p1]);
check(JSON.stringify((await one(`select state->'passPremium' p from public.player_farms where player_id=$1`,[farmer])).p)==='["autumn-2026"]','credited once into passPremium');
check((await one(`select body from public.player_notices where body like '%Season Pass%'`)).body.includes('the Season Pass (autumn-2026)'),'the admin notice names it');
check((await one(`select text from public.player_logs where text like 'Bought%'`)).text==='Bought the Season Pass (autumn-2026)','the log names it');
// A payment after the collecting week, with no other season running: nothing given, the admins asked to refund it.
check((await one(`select public.harvest_season_target('autumn-2026','{}'::jsonb) t`)).t==='autumn-2026'||Date.now()>=Date.UTC(2026,11,29),'in time: its own season');
const running=Date.now()<Date.UTC(2026,11,22)?'autumn-2026':null;
check((await one(`select public.harvest_season_target('summer-2026','{}'::jsonb) t`)).t===running,'paid after its season: the season running now');
check((await one(`select public.harvest_season_target('summer-2026','{"passPremium":["autumn-2026"]}'::jsonb) t`)).t===null,'and none when the farm has that one already (the admins refund it)');
// A payment for an ended season when the farm has the running one already: nothing given, a refund notice for the admins.
{const late=crypto.randomUUID();await buy(late,farmer,{pass:'summer-2026'});await db.query(`select public.harvest_purchase_grant($1)`,[late]);
 check(JSON.stringify((await one(`select state->'passPremium' p from public.player_farms where player_id=$1`,[farmer])).p)==='["autumn-2026"]','no second pass');
 check((await one(`select count(*)::int n from public.player_notices where body like '%after it ended%refund it%'`)).n===1,'the admins are asked to refund it');
 await db.query(`update public.harvest_purchases set status='expired' where id=$1`,[late]);}
// The refund trigger: passPremium, the worn paid looks and a paid avatar; free looks stay.
await db.query(`update public.player_stats set avatar_id='season-autumn-2026-harvest-chef',look='{"frame":"autumn-2026-frame","title":"autumn-2026-title-leaf-collector","color":"autumn-2026-color-moss-green"}' where player_id=$1`,[farmer]);
await db.query(`update public.harvest_purchases set status='refunded' where id=$1`,[p1]);
const after=await one(`select s.avatar_id,s.look,f.state->'passPremium' p from public.player_stats s join public.player_farms f using(player_id) where player_id=$1`,[farmer]);
check(after.avatar_id==='default','a paid season avatar goes back to the default');
check(JSON.stringify(after.look)===JSON.stringify({color:'autumn-2026-color-moss-green',title:'autumn-2026-title-leaf-collector'}),'the paid frame goes, the free title and colour stay: '+JSON.stringify(after.look));
check(JSON.stringify(after.p)==='[]','the season leaves passPremium');
// The revoke functions' texts.
await buy(p2,other);await db.query(`update public.harvest_purchases set status='credited' where id=$1`,[p2]);
await db.query(`select public.harvest_revoke_play_purchases($1)`,[{id:p2}]);
check((await one(`select text from public.player_logs where action='refund' and player_id=$1 and text like 'Refunded:%'`,[other])).text==='Refunded: the Season Pass','the refund log names it');
// The event counter.
const ev=crypto.randomUUID();await db.query(`insert into public.live_event_players values($1,$2,true,null,25,3,null)`,[ev,farmer]);
await db.query(`select public.harvest_event_claim($1,$2)`,[farmer,ev]);
const farm=(await one(`select state from public.player_farms where player_id=$1`,[farmer])).state;
check(farm.stats.events_claimed===1&&farm.coins===35&&farm.diamonds===8,'collecting an event reward counts in the farm');
// Avatars: the old list and season ids; a look column that is an object.
await db.query(`update public.player_stats set avatar_id='season-autumn-2026-pumpkin-royal' where player_id=$1`,[farmer]);checks++;
await assert.rejects(db.query(`update public.player_stats set avatar_id='season-' where player_id=$1`,[farmer]),/avatar_id_check/);checks++;
await assert.rejects(db.query(`update public.player_stats set avatar_id='hacker' where player_id=$1`,[farmer]),/avatar_id_check/);checks++;
await assert.rejects(db.query(`update public.player_stats set look='[]' where player_id=$1`,[farmer]),/look_check/);checks++;
console.log(`season-pass-engine.sql: ${checks} checks passed`);
