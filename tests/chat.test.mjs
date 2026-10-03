import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {dmChannel,chatError} from '../src/chat-client.js';
import {receiveDonations,normalizeFarm,createFarm,xpForLevel} from '../game/farm-state.js';
import {giftNotice} from '../supabase/functions/farm-api/admin-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const sql=read('supabase/chat.sql');

test('a private chat has one name for both farmers, whoever writes first',()=>{
 const a='4744af19-aef1-406c-9bb2-2fc9bda17efb',b='e8e4c7c3-c06f-408c-9fe6-1cfa7d2b3ae8';
 assert.equal(dmChannel(a,b),`dm:${a}:${b}`);assert.equal(dmChannel(b,a),`dm:${a}:${b}`);
 assert.match(sql,/split_part\(p_channel,':',2\)<split_part\(p_channel,':',3\)/,'the database only accepts that same order');
});

test('errors read as plain sentences; a lost connection gets its own',()=>{
 assert.equal(chatError({message:'Write 1–200 characters.',code:'22023'}).message,'Write 1–200 characters.');
 assert.equal(chatError({message:'TypeError: Failed to fetch'}).message,'No connection right now. Try again in a moment.');
});

// Oct 2026: the chat names its limit, and a database's own words never reach a farmer in English.
test('the pace limit names the 2 seconds; a cut-off request is no connection; an expired sign-in says so',()=>{
 assert.equal(chatError({message:'Slow down a little.',code:'54000'}).message,'Slow down: one message every 2 seconds.');
 assert.match(sql,/if last_at>now\(\)-interval '2 seconds' or recent>=12 then raise exception 'Slow down a little\.'/,'the database still says the old words; the game says the rule');
 for(const message of ['AbortError: The operation was aborted.','AbortError: signal is aborted without reason','TimeoutError: signal timed out','NetworkError when attempting to fetch resource.','Load failed','canceling statement due to statement timeout',''])
  assert.equal(chatError({message}).message,'No connection right now. Try again in a moment.',message);
 for(const error of [{message:'JWT expired',code:'PGRST303'},{message:'JWT expired',code:'PGRST301'},{message:'AuthSessionMissingError: Auth session missing!'}])
  assert.equal(chatError(error).message,'Your session has ended. Please sign in again.',error.message);
});

test('the database\'s own words become the general text (the staff dashboard keeps them); every refusal of ours stays as written',()=>{
 for(const error of [{message:'permission denied for function chat_send',code:'42501'},{message:'Could not find the function public.chat_send(p_body, p_channel) in the schema cache',code:'PGRST202'},
  {message:'new row for relation "chat_messages" violates check constraint "chat_messages_channel_check"',code:'23514'},{message:'column "kind" does not exist',code:'42703'},
  {message:'<!DOCTYPE html><html><body>502 Bad Gateway</body></html>'},{message:'TypeError: Cannot read properties of undefined (reading \'id\')'},{message:'An invalid response was received from the upstream server'}]){
  const said=chatError(error);assert.equal(said.message,'That did not work. Please try again.',error.message);assert.equal(said.raw,error.message,'the words stay with the error');
 }
 // Every refusal the database raises that a farmer may read (the catalog holds it: the translations have it) comes through as it is.
 const catalog=JSON.parse(read('i18n/catalog.json')),texts=[];
 for(const dir of ['supabase/','supabase/migrations/'])for(const file of readdirSync(new URL(`../${dir}`,import.meta.url)).filter(f=>f.endsWith('.sql')))
  for(const m of read(`${dir}${file}`).matchAll(/raise exception\s+'((?:[^']|'')*)'/gi)){let n=0;const key=m[1].replace(/''/g,"'").replace(/%/g,()=>`{${n++}}`).replace(/\s+/g,' ').trim();if(key in catalog&&key!=='Slow down a little.')texts.push(key.replace(/\{\d+\}/g,'12'));}
 assert.ok(texts.length>100,`${texts.length} refusals`);
 for(const message of texts){const said=chatError({message,code:'P0001'});assert.equal(said.message,message);assert.equal(said.raw,undefined,message);}
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/const why=error=>error\?\.raw\?\?error\?\.message;/);assert.doesNotMatch(admin,/error\.message/,'every staff screen shows the database\'s words');
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
 assert.deepEqual(got,[{coins:500,diamonds:50,message:'Thanks!'},{coins:1000,diamonds:50,message:null}],'the same gift twice pays once, and no row pays more than the cap (1,000 since 28 Sep 2026)');
 assert.equal(farm.coins,coins+1500);assert.equal(farm.diamonds,diamonds+100);
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

test('the header: chat next to Farm Family and the staff dashboard next to the chat; on phones both live in More, under Friends',()=>{
 const html=read('public/farm.html'),css=read('public/chat.css');
 assert.match(html,/id="family-dot" aria-hidden="true" hidden>!<\/span><\/button><button class="icon-button" id="chat-button"[^>]*hidden><i data-game-art="chat"><\/i><span id="chat-dot" aria-hidden="true" hidden><\/span><\/button><button class="icon-button" id="admin-button"/);
 assert.match(css,/@media\(max-width:900px\),\(max-height:550px\) and \(pointer:coarse\)\{#chat-button\{display:none\}\}/,'a clean header on phones');
 assert.doesNotMatch(css,/#chat-button:not\(\[hidden\]\)\{display:flex/);
 assert.match(html,/<button data-menu-action="chat-button" id="chat-menu-entry" hidden><i data-game-art="chat"><\/i><span><strong>Chat<\/strong><small>Talk with the valley<\/small><\/span><b class="menu-pill" id="chat-menu-pill" hidden><\/b><\/button>\n    <button data-menu-action="family-button"/);
 assert.match(html,/data-section-heading="friends">Friends<\/h3>[\s\S]*?<button data-menu-action="family-button" id="family-menu-entry" hidden><i data-game-art="family-members"><\/i><span><strong>Farm family<\/strong>/);
 const mobile=read('public/mobile-ui.js');
 assert.match(mobile,/familyTile\.hidden=family\.hidden;/,'the Family tile follows the Family button');
 assert.match(mobile,/chatTile\.hidden=chat\.hidden;chatPill\.hidden=chat\.hidden\|\|\(chatDot\?\.hidden\?\?true\);chatPill\.textContent=chatDot\?\.textContent\?\?'';/,'the Chat tile carries the unread count as a pill');
 assert.match(mobile,/&&!familyWaiting&&!chatWaiting&&!emailWaiting;/,'and lights the More dot');
 assert.match(mobile,/for\(const id of \['chat-button','chat-dot'\]\)if\(\$\(id\)\)chatWatch\.observe/,'live, as messages come in');
});

test('the chat window: Global first, no red count on Global, names open a profile without a way back, VIP and Moderator marks',()=>{
 const ui=read('src/chat-ui.js'),profiles=read('src/player-profiles.js');
 assert.match(ui,/const first=other\?'private':wanted\?\?'global';/);
 assert.match(ui,/const per=\{notices:u\.notices,global:0,family:u\.family,private:u\.dm\};/);
 assert.match(ui,/profiles\?\.open\(profile\.dataset\.profile,\{back:null\}\)/);
 assert.match(profiles,/backButton\.hidden=back===null;/);
 assert.match(ui,/\$\{m\.sender_vip\?VIP:''\}\$\{m\.sender_staff\?/);
 assert.match(ui,/if\(badge&&heading&&!heading\.querySelector\('\.farmer-mod-badge'\)\)heading\.insertAdjacentHTML\('beforeend',staffBadge\(badge,'farmer-mod-badge'\)\);/,'the admin shows as Admin, a moderator as Moderator (26 Sep 2026)');
 assert.ok(!/innerHTML=[^;]*\$\{m\.body\}/.test(ui),'a message is always escaped');
});

test('the Admin dashboard opens for moderators too, reading only; giving stays with the admin',()=>{
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/dialog\.querySelector\('\[data-admin-tab="settings"\]'\)\.hidden=role!=='admin';/);
 assert.match(dash,/'ONLY FOR YOU':'FOR THE MODERATORS'/);
 assert.match(read('src/player-profiles.js'),/checkAdmin\(\)\.then\(admin=>\{if\(!disposed&&gift&&admin&&selected===playerId&&dialog\.open\)\{renderAdminGrant\(playerId\);return true;\}return false;\}\);/,'the gift form on a profile is still only for the admin');
});

test('a gift note shows the diamond and the coin in front of the amounts',()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/n\.kind==='gift'\|\|n\.kind==='donation'\?giftBody\(n\.body\):n\.kind==='news'\?linkify\(news\.body\):esc\(n\.body\)/);
 assert.match(ui,/const withAmounts=text=>esc\(text\)\.replace\(/,'escaped first, then only the amounts get a picture');
});

test('Send message on a profile opened from the chat really opens that private chat (the late close report does not stop it)',()=>{
 assert.match(read('src/chat-ui.js'),/dialog\.addEventListener\('close',\(\)=>\{closeMenu\(\);if\(!dialog\.open\)\{loading\+\+;busy=false;\}\}\);/);
});

test('the Private tab finds any farmer by name to write to, without the profile, and not yourself',()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/placeholder="Find a farmer to message…"/);
 assert.match(ui,/bridge\.request\(\{operation:'player_search',query\}\)/,'the same search as the leaderboard');
 assert.match(ui,/\.filter\(p=>p\.playerId!==me\)/);
 assert.match(ui,/find\.hidden=!\(tab==='private'&&!thread&&overview\?\.privateOn!==false\);/,'not when your own private messages are off');
});

test('after sending, the cursor stays in the message box for the next message (only the send button waits)',()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/input\.disabled=Boolean\(compose\.blocked\);sendButton\.disabled=Boolean\(compose\.blocked\)\|\|sending;/);
 assert.match(ui,/if\(dialog\.open\)input\.focus\(\{preventScroll:true\}\);/);
});

test('Report sits next to Block, in a private chat and on a profile, and reports the farmer\'s latest message you can read',()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/<button type="button" class="chat-report" hidden>\$\{art\('alert'\)\}<\/button><button type="button" class="chat-block" hidden>\$\{art\('block'\)\}<\/button>/);
 assert.match(ui,/data-chat="report">\$\{art\('alert'\)\}Report<\/button><button type="button" class="small-button farmer-chat-report" data-chat="\$\{status\.blocked\?'unblock':'block'\}">\$\{art\('block'\)\}/);
 const fn=sql.slice(sql.indexOf('create or replace function public.chat_report_player'));
 assert.match(fn,/x\.sender=p_player and public\.chat_can_read\(x\.channel\) order by x\.created_at desc limit 1/);
 assert.match(fn,/perform public\.chat_report\(m,p_reason\);/,'the same limits as reporting one message');
});

test('the dashboard keeps a report log (reports only, not every message): what was reported, how often, and who did what',()=>{
 const fn=sql.slice(sql.indexOf('create or replace function public.chat_mod_log'));
 assert.match(fn.slice(0,400),/if public\.chat_staff_role\(\(select auth\.uid\(\)\)\) is null then raise exception 'Not authorized\.'/,'staff only');
 assert.match(fn,/from public\.chat_reports r group by r\.message_id/,'built from the reports, never from all messages');
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/client\.reportLog\(\)/);assert.match(dash,/deleted:'Deleted',dismissed:'Nothing wrong',muted:'Muted',banned:'Banned from chat'/);
});

test('"Forgot your password?" has a Back button at the top, back to the start of the card',()=>{
 const html=read('public/play.html'),main=read('src/main.js');
 assert.match(html,/<button type="button" id="account-back" class="account-back" hidden>[\s\S]*?Back<\/button><h2 id="account-title">/);
 assert.match(main,/\$\('account-back'\)\.hidden=mode!=='forgot';/);
 assert.match(main,/\$\('account-back'\)\.onclick=\(\)=>\{if\(submitting\)return;setMode\(knownPlayer\(\)\?'signin':'register',true\);\};/);
});

test('the VIP mark follows the farmer as they are now, also on messages from before they became VIP',async()=>{
 const {createChatClient}=await import('../src/chat-client.js');
 const now=Date.now(),rows=[{id:'1',sender:'a',sender_vip:false},{id:'2',sender:'b',sender_vip:true},{id:'3',sender:'a',sender_vip:false}];
 const query=result=>({select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},in(){return this;},then:(ok,fail)=>Promise.resolve(result).then(ok,fail)});
 const supabase={from:table=>table==='chat_messages'?query({data:rows,error:null}):query({data:[{player_id:'a',vip_expires_at:new Date(now+86400000).toISOString()},{player_id:'b',vip_expires_at:new Date(now-1000).toISOString()}],error:null})};
 const list=await createChatClient(supabase,{playerId:'me'}).messages('global');
 assert.deepEqual(list.map(m=>[m.id,m.sender_vip]),[['1',true],['2',false],['3',true]],'a is VIP now (both messages), b no longer');
});

test('events: every goal done is finished, the first three get a trophy, no qualifying step (30 Sep 2026)',async()=>{
 const ui=read('public/live-events-ui.js');
 assert.match(ui,/<span class="event-rank">\$\{r\.podium\?art\(MEDALS\[r\.rank-1\]\):r\.rank\}<\/span>/);
 assert.match(ui,/const label=r=>r\.podium\?placeLabel\(r\.rank\):r\.finished\?'✓ Finished':`\$\{r\.progress\}% done`;/);
 assert.doesNotMatch(ui,/qualifying|Qualifying|qualifyHint|3 times over 10 minutes/,'no qualifying rule left on the screen');
});

test('Farm Family: the family\'s own name and emblem on top, four tabs with a "!" where something waits, a Later fold and one Deliver button',()=>{
 const html=read('public/farm.html'),ui=read('public/family-ui.js');
 assert.match(html,/<span class="family-heading-emblem" id="family-heading-emblem" hidden><\/span>/);
 assert.equal((html.match(/<b class="family-tab-dot" hidden>!<\/b>/g)??[]).length,4);
 assert.match(ui,/document\.getElementById\('family-chat'\)\.onclick=\(\)=>\{dialog\.close\(\);window\.harvestChat\?\.open\(\{tab:'family'\}\);\};/);
 assert.match(ui,/class="primary-button family-deliver" data-family-action="family_contribute"/);
 assert.match(ui,/later=l=>waitsLater\(l\)&&open\.some\(x=>!waitsLater\(x\)\)/,'nothing is folded away when every open line waits');
 assert.match(ui,/const invite=manager\?\(closed\?`<p class="family-notice">Your family is closed to new farmers\. To invite someone, change who can join in Family settings\.<\/p>`:`\$\{inviteSearch\.html\(\)\}\$\{renderSentInvitations\(/,'the leader invites from Members, below the list');
 assert.match(ui,/return `\$\{manager&&!closed\?joinRequests\(\):''\}<div class="family-member-list">/,'farmers asking to join come first');
});

test('the staff can edit a message: same rules as sending, live for everyone, marked as edited, every edit kept for the admin',()=>{
 const sql=read('supabase/chat-edit-message.sql');
 assert.match(sql,/if public\.chat_staff_role\(me\) is null then raise exception 'Not authorized\.'/);
 assert.match(sql,/char_length\(clean\)<1 or char_length\(clean\)>200/);assert.match(sql,/Links are not allowed in the chat\./);assert.match(sql,/public\.chat_is_rude\(clean\)/);
 assert.match(sql,/insert into public\.chat_message_edits\(message_id,editor,before,after\)/);assert.match(sql,/edited_by_moderator=\(me<>msg\.sender\)/);
 assert.match(sql,/alter table public\.chat_message_edits enable row level security;\s*revoke all on public\.chat_message_edits from anon, authenticated;/,'the edit log is for the admin only');
 const client=read('src/chat-client.js');
 assert.match(client,/,edited_at,edited_by_moderator';/);assert.match(client,/\{event:'UPDATE',schema:'public',table:'chat_messages'\},payload=>emit\(\{type:'edited',message:payload\.new\}\)/);
 assert.match(client,/editMessage:\(message,body\)=>rpc\('chat_mod_edit',\{p_message:message,p_body:body\}\)/);
 const ui=read('src/chat-ui.js');
 assert.match(ui,/if\(staff\)items\.push\(\['edit','Edit message'\],\['delete','Delete message'\]\);/);
 assert.match(ui,/\(\$\{m\.edited_by_moderator\?'edited by a moderator':'edited'\}\)/);
 assert.match(ui,/if\(event\.type==='edited'\)/);assert.match(ui,/messages=withEdit\(messages,await chat\.editMessage\(m\.id,body\)\);/);
});

// 25 Sep 2026: the admin can have a notice in Notifications for every in-game purchase, and turn it off in Settings, Chat.
test('in-game purchases: a notice for the admin when a purchase is credited, with a switch only the admin sees',()=>{
 const sql=read('supabase/purchase-alerts.sql');
 assert.match(sql,/create trigger harvest_purchase_alert after update of status on public\.harvest_purchases\n for each row when \(old\.status='pending' and new\.status in \('credited','test_paid'\)\)/,'once, when Stripe has been paid');
 assert.match(sql,/where public\.chat_staff_role\(u\.id\)='admin'\n  and not exists\(select 1 from public\.chat_settings c where c\.player_id=u\.id and c\.purchase_alerts_off\)/,'the admin only, unless turned off');
 assert.match(sql,/'Test purchase \(no money\): '/,'a test payment says so');
 assert.match(sql,/if public\.chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Not authorized\.'/,'nobody else may flip the switch');
 assert.match(sql,/''purchaseAlerts'',case when public\.chat_staff_role\(me\)=''admin'' then/,'the overview tells only the admin');
 const html=read('public/farm.html');
 assert.match(html,/<label class="notify-row notify-row-art" for="chat-purchases" id="chat-purchases-row" hidden>/,'hidden until the chat says you are the admin');
 const ui=read('src/chat-ui.js');
 assert.match(ui,/const admin=typeof overview\.purchaseAlerts==='boolean';if\(purchaseRow\)purchaseRow\.hidden=!admin;/);
 assert.match(ui,/purchase:'In-game purchase'/);assert.match(ui,/n\.kind==='purchase'\?'diamonds'/);
 assert.match(read('src/chat-client.js'),/setPurchaseAlerts:on=>rpc\('chat_set_purchase_alerts',\{p_on:on\}\)/);
});
test('in-game purchases reach the admin\'s phone too, once, and can never block the purchase itself',async()=>{
 const sql=read('supabase/purchase-alerts-push.sql');
 assert.match(sql,/perform net\.http_post\(url:='https:\/\/jnmdirvidffzxukbdmij\.supabase\.co\/functions\/v1\/notify-hourly\?notice'/,'only when the admin has a device that allows notifications');
 assert.match(sql,/if exists\(select 1 from public\.push_subscriptions p where p\.player_id=admin_id\) then/);
 assert.match(sql,/exception when others then return new;   -- a notice never stands in the way of the purchase itself/);
 assert.match(sql,/update public\.player_notices set pushed_at=now\(\)\n  where id=p_notice and kind='purchase' and player_id is not null and pushed_at is null and created_at>now\(\)-interval '10 minutes'/,'each notice once');
 assert.match(sql,/revoke execute on function public\.notice_push_claim\(uuid\) from public, anon, authenticated;/,'the notification service only');
 const fn=read('supabase/functions/notify-hourly/index.ts');
 assert.match(fn,/if\(query\.has\('notice'\)\)\{/);assert.match(fn,/admin\.rpc\('notice_push_claim',\{p_notice:id\}\)/);assert.match(fn,/url:'\/\?open=chat&channel=notices'/);
 const {openIntent}=await import('../public/app-links.js');
 assert.deepEqual(openIntent('?open=chat&channel=notices'),{open:'chat',channel:'notices'},'tapping it opens the Notifications tab');
 assert.deepEqual(openIntent('?open=chat&channel=nonsense'),{open:'chat'});
 assert.match(read('src/chat-ui.js'),/else if\(channel==='notices'\)wanted='notices';/);
});
test('the admin shows as Admin (not Moderator) in the chat, on profiles and on the leaderboard; a VIP mark sits beside it',async()=>{
 const src=readFileSync(new URL('../src/staff-badge.js',import.meta.url),'utf8');
 assert.match(src,/admin:\{label:'Admin',title:'Admin: the maker of Harvest Tycoon'\},moderator:\{label:'Moderator'/);
 const ui=readFileSync(new URL('../src/chat-ui.js',import.meta.url),'utf8'),board=readFileSync(new URL('../src/leaderboard.js',import.meta.url),'utf8');
 assert.match(ui,/sender_staff\?staffBadge\(staffRole\(m\.sender\)\?\?'moderator','chat-mod'\):''\}/,'in the chat both carry their word: Admin or Moderator');
 assert.match(board,/if\(vip\)strong\.insertAdjacentHTML\('beforeend',vip\);const role=staffRole\(row\.player_id\);if\(role\)strong\.insertAdjacentHTML\('beforeend',staffBadge\(role\)\);/,'VIP and staff both show');
 const sql=readFileSync(new URL('../supabase/chat-staff-list.sql',import.meta.url),'utf8');
 assert.match(sql,/''role'',public\.chat_staff_role\(p_player\)/);assert.doesNotMatch(sql,/@/,'no e-mail address in the list');
});
test('the chat client has no method twice: a second staffList once emptied the Admin dashboard\'s moderator list',()=>{
 const src=readFileSync(new URL('../src/chat-client.js',import.meta.url),'utf8');
 const names=[...src.matchAll(/^\s{2}([A-Za-z]+):/gm)].map(m=>m[1]),twice=names.filter((n,i)=>names.indexOf(n)!==i);
 assert.deepEqual(twice,[],'each method once');
 assert.match(src,/staffList:\(\)=>rpc\('staff_list'\)/);assert.match(src,/staffRoles:\(\)=>rpc\('chat_staff_list'\)/);
 assert.match(readFileSync(new URL('../src/staff-badge.js',import.meta.url),'utf8'),/chat\?\.staffRoles\?\.\(\)/);
});
test('phones show the dashboard tabs as icons only; each tab keeps its name',()=>{
 const dash=readFileSync(new URL('../src/admin-dashboard.js',import.meta.url),'utf8'),css=readFileSync(new URL('../public/chat.css',import.meta.url),'utf8');
 for(const [tab,name] of [['chat','Chat'],['players','Players'],['growth','Growth'],['purchases','Purchases'],['settings','Settings']])assert.match(dash,new RegExp(`data-admin-tab="${tab}" aria-label="${name}"[^>]*>'\\+art\\('[\\w-]+'\\)\\+'<span class="admin-tab-name">${name}</span></button>`),tab);
 assert.match(css,/@media\(max-width:600px\)\{\.admin-tab-name\{display:none\}/,'only the words hide, never a sprite icon (a span too)');
});
test('the staff see who reported a message, with the reason, in the open reports and the log',()=>{
 const sql=readFileSync(new URL('../supabase/chat-report-reporters.sql',import.meta.url),'utf8'),dash=readFileSync(new URL('../src/admin-dashboard.js',import.meta.url),'utf8');
 assert.equal((sql.match(/jsonb_build_object\('id',q\.reporter,'name',ps\.username,'reason',q\.reason\) order by q\.created_at/g)??[]).length,2,'both lists');
 assert.match(sql,/where q\.message_id=r\.message_id and q\.resolved_at is null\) as reporters/,'the open list: only the open reports');
 assert.equal((sql.match(/if public\.chat_staff_role\(\(select auth\.uid\(\)\)\) is null then raise exception 'Not authorized\.'/g)??[]).length,2,'staff only');
 assert.equal((dash.match(/<\/small>\$\{reportedBy\(r\)\}/g)??[]).length,2);
 assert.match(dash,/#admin-report-list'\)\.addEventListener\('click',async event=>\{\n  const name=event\.target\.closest\('\[data-profile\]'\);if\(name\)\{window\.harvestProfiles\?\.open\(/);
});
test('a gift per level pays the coins times the farmer\'s level when it arrives; a fixed one the same for everyone',()=>{
 const farm=normalizeFarm(createFarm(0),0);farm.xp=xpForLevel(30);const coins=farm.coins;
 const got=receiveDonations(farm,[{id:'p',coins:20,diamonds:10,per_level:true},{id:'q',coins:999,diamonds:0,per_level:true},{id:'f',coins:900,diamonds:0}]);
 assert.deepEqual(got.map(g=>g.coins),[600,50*30,900],'20 x level 30; per level at most 50; a fixed gift as it is');assert.equal(farm.coins,coins+600+1500+900);
 const sql=read('supabase/staff-gift-per-level.sql'),dash=read('src/admin-dashboard.js');
 assert.match(sql,/if per and l\+p_coins>50 then raise exception/);assert.match(sql,/if not per and c\+p_coins>1000 then raise exception/);
 assert.match(sql,/drop function if exists public\.staff_donate\(integer,integer,text,text,uuid\);/,'one version, so older games still call it');
 assert.match(sql,/check \(coins>=0 and coins<=case when per_level then 50 else 1000 end\)/);
 assert.match(read('supabase/functions/farm-api/index.ts'),/select\('id,coins,diamonds,message,per_level'\)/);
 assert.match(dash,/data-coin-kind="fixed" aria-pressed="true">Fixed<\/button><button type="button" class="admin-filter" data-coin-kind="level" aria-pressed="false">Per level<\/button>/);
 assert.match(dash,/gift\.audience==='player'\?gift\.player\.playerId:null,gift\.perLevel\)/);
});

test('a message from someone else, in any chat, has a small Google Translate link to the farmer\'s own language',async()=>{
 const {translateLink}=await import('../src/chat-ui.js');
 assert.equal(translateLink('Hola, ¿cómo estás? & más','nl'),'https://translate.google.com/?sl=auto&tl=nl&text=Hola%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F%20%26%20m%C3%A1s&op=translate');
 const ui=readFileSync(new URL('../src/chat-ui.js',import.meta.url),'utf8');
 assert.match(ui,/const translate=!mine&&String\(m\.body\?\?''\)\.trim\(\)\?/,'global, family and private chats, never on your own messages');
 assert.match(ui,/if\(touch\(\)&&!mine&&String\(m\.body\?\?''\)\.trim\(\)\)items\.push\(\['translate','Translate with Google'\]\)/,'on a phone it is in the long-press menu');
 assert.match(read('public/chat.css'),/@media\(hover:hover\) and \(pointer:fine\)\{\.chat-translate\{opacity:0\}\.chat-msg:hover \.chat-translate/,'on a computer it shows on hover, like the menu');
 assert.match(ui,/target="_blank" rel="noopener noreferrer" aria-label="Translate with Google"/,'a new tab, without handing the game page over');
 assert.match(ui,/translateLink\(m\.body,chosenLanguage\(\)\)/,'into the language the farmer plays in');
});

test('a gift note from the database shows in the player\'s language: "You’ve received:", the amounts, and the staff\'s words untranslated',()=>{
 const ui=read('src/chat-ui.js'),from=ui.indexOf(' const AMOUNT_ART='),to=ui.indexOf(' function noticeRow(');
 const giftBody=new Function('art','esc',ui.slice(from,to)+';return giftBody;')(k=>`[${k}]`,s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
 const html=giftBody('Donation: you received 10 diamonds + 10 coins for every level. “We reached 2.000+ players!”');
 assert.equal(html,'<span>You’ve received:</span> <span class="chat-amount">[diamonds]<b>10</b> diamonds</span> + <span class="chat-amount">[coins]<b>10</b> coins</span> <span>for every level</span> <span translate="no">“We reached 2.000+ players!”</span>');
 assert.equal(giftBody('Donation: you received 50 diamonds.'),'<span>You’ve received:</span> <span class="chat-amount">[diamonds]<b>50</b> diamonds</span>','no note');
 assert.equal(giftBody('Something else'),'Something else','any other text as before');
 assert.match(giftBody('Donation: you received 1 diamonds. “<b>hi</b>”'),/“&lt;b&gt;hi&lt;\/b&gt;”/,'the note stays escaped');
});
test('the admin can take a handled report out of the report log; an open one is handled first, the message itself stays (1 Oct 2026)',()=>{
 const sql=read('supabase/chat-report-log-remove.sql'),admin=read('src/admin-dashboard.js');
 assert.match(sql,/if me is null or public\.chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Not authorized\.'/,'the admin only, not the moderators');
 assert.match(sql,/r\.resolved_at is null\) then raise exception 'Handle this report first\.'/,'an open report stays until it is handled');
 assert.match(sql,/delete from public\.chat_reports where message_id=p_message;/);assert.doesNotMatch(sql,/chat_messages/,'the message itself is not touched');
 assert.match(sql,/revoke all on function public\.chat_mod_log_remove\(uuid\) from public, anon;/);
 assert.match(admin,/\$\{role==='admin'&&!r\.open\?`<button type="button" class="small-button" data-log-remove="\$\{esc\(r\.messageId\)\}">Remove<\/button>`:''\}/);
 assert.match(admin,/confirmAction\(\{title:'Remove from the report log\?'/,'asked once more');
 assert.match(read('src/chat-client.js'),/reportLogRemove:message=>rpc\('chat_mod_log_remove',\{p_message:message\}\)/);
});
test('a moderator can still send a gift, but only the admin writes a message with it (1 Oct 2026)',()=>{
 const sql=read('supabase/staff-gift-message-admin.sql'),admin=read('src/admin-dashboard.js');
 assert.match(sql,/if msg is not null and public\.chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Only the admin can add a message to a gift\.'/);
 assert.match(sql,/if public\.chat_staff_role\(me\) is null then raise exception 'Not authorized\.'/,'the moderators still give coins and diamonds');
 assert.match(admin,/dialog\.querySelector\('\.admin-donate-message'\)\.hidden=role!=='admin';/,'no message box for a moderator');
 assert.match(admin,/const message=role==='admin'\?dialog\.querySelector\('#admin-donate-message'\)\.value\.trim\(\):''/);
 assert.match(read('public/chat.css'),/\.admin-donate-message\[hidden\]\{display:none\}/,'the label\'s own display does not show it again');
});
test('the Crew: one group chat for the admin and the moderators, pinned on top of their private chats; nobody else reads or writes it (1 Oct 2026)',()=>{
 const sql=read('supabase/chat-crew.sql'),ui=read('src/chat-ui.js');
 assert.match(sql,/if p_channel='crew' then return public\.chat_staff_role\(me\) is not null; end if;/,'only the staff read it, Realtime included');
 assert.match(sql,/elsif p_channel='crew' then\n  if public\.chat_staff_role\(me\) is null then raise exception 'Choose a chat\.'/,'only the staff write in it');
 assert.match(sql,/if public\.chat_staff_role\(me\) is not null then crew:=jsonb_build_object\('channel','crew',/,'the overview has it for the staff only');
 assert.match(sql,/'dm',coalesce\(\(select sum\(\(x->>'unread'\)::int\) from jsonb_array_elements\(threads\) x\),0\)\+coalesce\(\(crew->>'unread'\)::int,0\)\),/,'its new messages count on Private');
 assert.match(sql,/body ~\* '\(https\?:\/\/\|www\\\.\|/,'the chat\'s rules hold here too');
 assert.match(ui,/list\.innerHTML=\(overview\?\.crew\?crewRow\(overview\.crew\):''\)\+/,'pinned first');
 assert.match(ui,/blockButton\.hidden=reportButton\.hidden=back\.hidden\|\|Boolean\(thread\?\.crew\);/,'no Block or Report on the Crew');
 assert.match(ui,/if\(threadButton&&threadButton\.dataset\.thread==='crew'\)\{if\(!overview\?\.crew\)return;/);
 assert.match(ui,/overview\.unread\.dm=overview\.threads\.reduce\(\(sum,x\)=>sum\+\(x\.unread\|\|0\),0\)\+\(overview\.crew\?\.unread\|\|0\);/);
});
test('a Crew message is a push for the rest of the staff, like a private message, and tapping it opens the Crew (1 Oct 2026)',()=>{
 const sql=read('supabase/chat-crew-push.sql'),crew=read('supabase/chat-crew.sql');
 assert.match(crew,/check \(channel ~ '\^\(global\|crew\|family:/,'the chat table takes the Crew\'s channel');
 assert.match(sql,/where p\.player_id<>new\.sender and public\.chat_staff_role\(p\.player_id\) is not null\n   and exists\(select 1 from public\.notification_settings x where x\.player_id=p\.player_id and x\.push_messages\)/,'the staff with message pushes on, not the sender');
 assert.match(sql,/r\.channel='crew' and r\.last_read_at>now\(\)-interval '2 minutes'/,'not while they read the Crew');
 assert.match(sql,/where s\.pushed_at<now\(\)-interval '3 minutes';/,'at most one per 3 minutes');
 assert.match(sql,/create trigger chat_crew_push after insert on public\.chat_messages for each row when \(new\.channel='crew'\)/);
 assert.match(sql,/'senderName',m\.sender_name\|\|' \(Crew\)'/);assert.match(sql,/update public\.chat_push_state set claimed=true where channel='crew' and message_id=m\.id and not claimed returning player_id/,'each push once');
 assert.match(read('public/app-links.js'),/const CHANNEL=\/\^\(global\|notices\|crew\|/);
 assert.match(read('src/chat-ui.js'),/else if\(crew\)thread=\{channel:'crew',crew:true,otherName:'Crew'\};/);
});

