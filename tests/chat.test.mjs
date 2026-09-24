import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dmChannel,chatError} from '../src/chat-client.js';
import {receiveDonations,normalizeFarm,createFarm} from '../game/farm-state.js';
import {giftNotice} from '../supabase/functions/farm-api/admin-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const sql=read('supabase/chat.sql');

test('a private chat has one name for both farmers, whoever writes first',()=>{
 const a='4744af19-aef1-406c-9bb2-2fc9bda17efb',b='e8e4c7c3-c06f-408c-9fe6-1cfa7d2b3ae8';
 assert.equal(dmChannel(a,b),`dm:${a}:${b}`);assert.equal(dmChannel(b,a),`dm:${a}:${b}`);
 assert.match(sql,/split_part\(p_channel,':',2\)<split_part\(p_channel,':',3\)/,'the database only accepts that same order');
});

test('errors read as plain sentences; a lost connection gets its own',()=>{
 assert.equal(chatError({message:'Slow down a little.'}).message,'Slow down a little.');
 assert.equal(chatError({message:'TypeError: Failed to fetch'}).message,'No connection right now. Try again in a moment.');
});

test('every chat table is locked: row-level security on, no direct rights, reading only through the policies',()=>{
 for(const table of ['staff_roles','chat_messages','player_notices','chat_reads','chat_blocks','chat_sanctions','chat_reports','chat_settings','chat_config','chat_push_state','staff_donations'])
  assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security;`),`${table} has RLS`);
 assert.match(sql,/revoke all on public\.staff_roles, public\.chat_messages, public\.player_notices, public\.chat_reads, public\.chat_blocks, public\.chat_sanctions, public\.chat_reports, public\.chat_settings from anon, authenticated;/);
 assert.match(sql,/grant select on public\.chat_messages, public\.player_notices to authenticated;/,'players only ever read, and only messages and notices');
 assert.match(sql,/for select to authenticated using \(\(select public\.chat_can_read\(channel\)\)\)/,'a message is read only by the chat it belongs to (Realtime uses the same rule)');
 assert.match(sql,/and \(expires_at is null or expires_at > now\(\)\)\);/,'news disappears when its hours are up');
});

test('every function runs with an empty search path, and players cannot see who is staff or hand out pushes',()=>{
 const definers=[...sql.matchAll(/create or replace function public\.(\w+)\([^)]*\)[^$]*?security definer([^$]*)\$/g)];
 assert.ok(definers.length>=20);
 for(const [,name,rest] of definers)assert.match(rest,/set search_path (to|=) ''/,`${name} sets an empty search path`);
 assert.match(sql,/revoke execute on function public\.chat_staff_role\(uuid\) from public, anon, authenticated;/);
 assert.match(sql,/revoke execute on function public\.chat_push_claim\(uuid\) from public, anon, authenticated;/,'only the notification service claims a push');
 assert.match(sql,/revoke execute on function public\.chat_dm_push\(\) from public, anon, authenticated;/);
});

test('sending checks everything in the database: ban, mute, length, links, words, where you belong, pace',()=>{
 const send=sql.slice(sql.indexOf('create or replace function public.chat_send'),sql.indexOf('create or replace function public.chat_mark_read'));
 for(const rule of ["You can no longer send messages in the chat.","You are muted until","Write 1–200 characters.","Links are not allowed in the chat.","Please keep it friendly.","Join this family to chat with it.","This farmer does not receive your messages.","Your private messages are off.","This farmer does not receive private messages.","Slow down a little."])
  assert.ok(send.includes(rule),rule);
 assert.match(send,/last_at>now\(\)-interval '2 seconds' or recent>=12/,'one message every 2 seconds, 12 a minute');
 assert.match(send,/public\.chat_staff_role\(me\) is null and exists\(select 1 from public\.chat_settings c where c\.player_id=other and c\.private_off\)/,'the staff can still reach a farmer who switched private messages off');
});

test('a chat ban is only the chat, the staff cannot be banned, and only the admin appoints moderators or posts news',()=>{
 const sanction=sql.slice(sql.indexOf('create or replace function public.chat_mod_sanction'),sql.indexOf('create or replace function public.staff_set_moderator'));
 assert.ok(!/player_farms|player_stats/.test(sanction),'the farm is never touched');
 assert.match(sanction,/public\.chat_staff_role\(p_player\) is not null then raise exception 'This farmer cannot be muted\.'/);
 for(const fn of ['staff_set_moderator','chat_post_news','chat_set_levels','staff_list']){
  const body=sql.slice(sql.indexOf(`create or replace function public.${fn}`));
  assert.match(body.slice(0,600),/is distinct from 'admin' then raise exception 'Not authorized\.'/,`${fn}: admin only`);
 }
 assert.match(sql,/insert into public\.staff_roles\(player_id,role\) values\('4744af19-aef1-406c-9bb2-2fc9bda17efb','moderator'\)/,'Boer Slak is the first moderator');
});

test('a gift for everyone: 500 coins and 50 diamonds a day for all staff together, received once per farm',()=>{
 const donate=sql.slice(sql.indexOf('create or replace function public.staff_donate'));
 assert.match(donate,/if c\+p_coins>500 or d\+p_diamonds>50 then raise exception/);
 assert.match(donate,/if n>=5 then raise exception/);
 assert.match(sql,/coins integer not null default 0 check \(coins between 0 and 500\), diamonds integer not null default 0 check \(diamonds between 0 and 50\)/);
 const farm=normalizeFarm(createFarm(0),0),coins=farm.coins,diamonds=farm.diamonds;
 const got=receiveDonations(farm,[{id:'a',coins:500,diamonds:50,message:'Thanks!'},{id:'a',coins:500,diamonds:50},{id:'b',coins:9999,diamonds:9999}]);
 assert.deepEqual(got,[{coins:500,diamonds:50,message:'Thanks!'},{coins:500,diamonds:50,message:null}],'the same gift twice pays once, and no row pays more than the cap');
 assert.equal(farm.coins,coins+1000);assert.equal(farm.diamonds,diamonds+100);
 assert.deepEqual(receiveDonations(farm,[{id:'a',coins:500,diamonds:50}]),[],'a later load does not pay it again');
 assert.deepEqual(normalizeFarm(structuredClone(farm),0).donations,['a','b'],'the ids are kept with the farm');
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/Date\.parse\(user\.created_at\?\?''\)/,'only farms that existed when the gift was sent');
 assert.equal(giftNotice({coins:1000,xp:0,diamonds:50,item:null,itemCount:0,message:'Thanks for playing!'}),'Donation: you received 50 diamonds + 1,000 coins. “Thanks for playing!”');
});

test('a private message reaches a phone only when it should, and never blocks the message itself',()=>{
 const push=sql.slice(sql.indexOf('create or replace function public.chat_dm_push'),sql.indexOf('create or replace function public.chat_push_claim'));
 for(const rule of ['public.push_subscriptions p where p.player_id=other','s.player_id=other and s.push_messages) then return null','b.blocked_id=new.sender',"r.last_read_at>now()-interval '2 minutes'","s.pushed_at<now()-interval '3 minutes'"])assert.ok(push.includes(rule),rule);
 assert.match(push,/exception when others then return null;/);
 assert.match(sql,/for each row when \(new\.channel like 'dm:%'\)/,'not for the family or global chat');
 const service=read('supabase/functions/notify-hourly/index.ts');
 assert.match(service,/if\(query\.has\('dm'\)\)\{/);assert.match(service,/admin\.rpc\('chat_push_claim',\{p_message:id\}\)/);
});

test('the header: chat next to Farm Family and the staff dashboard next to the chat; on phones the chat takes the Family spot',()=>{
 const html=read('public/farm.html'),css=read('public/chat.css');
 assert.match(html,/id="family-dot" aria-hidden="true" hidden>!<\/span><\/button><button class="icon-button" id="chat-button"[^>]*hidden><i data-game-art="chat"><\/i><span id="chat-dot" aria-hidden="true" hidden><\/span><\/button><button class="icon-button" id="admin-button"/);
 assert.match(css,/\.topbar \.resources:has\(#chat-button:not\(\[hidden\]\)\) #family-button\{display:none\}/);
 assert.match(html,/data-section-heading="friends">Friends<\/h3>[\s\S]*?<button data-menu-action="family-button" id="family-menu-entry" hidden><i data-game-art="family-members"><\/i><span><strong>Farm family<\/strong>/);
 const mobile=read('public/mobile-ui.js');
 assert.match(mobile,/familyTile\.hidden=family\.hidden;/,'the Family tile follows the Family button');
});

test('the chat window: Global first, no red count on Global, names open a profile without a way back, VIP and Moderator marks',()=>{
 const ui=read('src/chat-ui.js'),profiles=read('src/player-profiles.js');
 assert.match(ui,/const first=other\?'private':wanted\?\?'global';/);
 assert.match(ui,/const per=\{notices:u\.notices,global:0,family:u\.family,private:u\.dm\};/);
 assert.match(ui,/profiles\?\.open\(profile\.dataset\.profile,\{back:null\}\)/);
 assert.match(profiles,/backButton\.hidden=back===null;/);
 assert.match(ui,/\$\{m\.sender_vip\?VIP:''\}\$\{m\.sender_staff\?/);
 assert.match(ui,/farmer-mod-badge" title="Moderator of the valley chat">\$\{art\('admin'\)\}Moderator/,'the admin wears the same Moderator badge');
 assert.ok(!/innerHTML=[^;]*\$\{m\.body\}/.test(ui),'a message is always escaped');
});

test('the Admin dashboard opens for moderators too, reading only; giving stays with the admin',()=>{
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/dialog\.querySelector\('\[data-admin-tab="settings"\]'\)\.hidden=role!=='admin';/);
 assert.match(dash,/'ONLY FOR YOU':'FOR THE MODERATORS'/);
 assert.match(read('src/player-profiles.js'),/checkAdmin\(\)\.then\(admin=>\{if\(!disposed&&admin&&selected===playerId&&dialog\.open\)renderAdminGrant\(playerId\);\}\);/,'the gift form on a profile is still only for the admin');
});
