// Group messages with filters (8 Oct 2026, supabase/chat-group-filters.sql): the admin's private message to many farmers goes to the
// farmers who match every filter, never to one who switched private messages off, and every copy says who it was sent to.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createChatClient,dmChannel} from '../src/chat-client.js';
import {createChatUI,groupPills,groupLine,messageLayout} from '../src/chat-ui.js';
import {LANGUAGES} from '../public/languages.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const sql=read('supabase/chat-group-filters.sql');
const fn=name=>{const at=sql.indexOf(`create or replace function public.${name}`);assert.ok(at>=0,name);return sql.slice(at,Math.min(...['$function$;','$f$;'].map(end=>sql.indexOf(end,at)).filter(i=>i>=0)));};
const ME='11111111-1111-4111-8111-111111111111',ADMIN='00000000-0000-4000-8000-0000000000aa';

test('the filters: fixed keys only, all together, every value checked; anything else is refused and nothing goes',()=>{
 const f=fn('chat_broadcast_filters(');
 assert.match(f,/returns jsonb language plpgsql immutable set search_path to '' as \$f\$/);
 assert.match(f,/if jsonb_typeof\(f\)<>'object' then raise exception 'Choose who gets it\.' using errcode='22023'; end if;/);
 assert.match(f,/if k not in \('minLevel','maxLevel','active','platform','notPlatform','crazygames','language','family'\) then raise exception 'There is no filter called %\.', k using errcode='22023'; end if;/,'an unknown key');
 assert.match(f,/if case when jsonb_typeof\(v\)='number' and s ~ '\^\[0-9\]\{1,3\}\$' then s::integer not between 1 and 200 else true end then raise exception 'Choose a level from 1 to 200\.'/,'a whole level from 1 to 200, never a text read as a number');
 assert.match(f,/if v is distinct from 'true'::jsonb then raise exception 'The filter % cannot be %\.', k, v using errcode='22023'; end if;/,'CrazyGames is true or left out');
 assert.match(f,/\(k='active' and s in \('online','week','month','all'\)\) or \(k in \('platform','notPlatform'\) and s in \('android','ios','browser'\)\)/);
 assert.match(f,/if out->>'platform'=out->>'notPlatform' then raise exception 'Leave out a different place than the one you chose\.'/,'a place cannot be chosen and left out at once');
 assert.match(f,/or \(k='family' and s in \('in','out'\)\)\) then\n   raise exception 'The filter % cannot be %\.', k, v using errcode='22023';/);
 assert.match(f,/if \(out->>'minLevel'\)::integer>\(out->>'maxLevel'\)::integer then raise exception 'Up to level must be at least From level\.'/);
 // What changes nothing is left out, so the farmer's line names only what was chosen.
 assert.match(f,/if \(k='minLevel' and s::integer>1\) or \(k='maxLevel' and s::integer<200\) then out:=out\|\|jsonb_build_object\(k,s::integer\); end if;/);
 assert.match(f,/elsif not \(k='active' and s='all'\) then out:=out\|\|jsonb_build_object\(k,s\);/);
 // The game's own languages, no more, no less.
 const codes=/k='language' and s in \(([^)]*)\)/.exec(f)[1].match(/'([a-z]{2})'/g).map(c=>c.slice(1,3)).sort();
 assert.deepEqual(codes,LANGUAGES.map(l=>l.code).sort());
 assert.match(sql,/revoke all on function public\.chat_broadcast_filters\(jsonb\) from public, anon, authenticated;/);
 // No country, ad source, purchase or VIP filter.
 assert.doesNotMatch(f,/country|utm|purchase|vip/i);
});

test('who gets it: every filter, and never a farmer who blocked the admin, is banned, is a CrazyGames guest or switched private messages off',()=>{
 const t=fn('chat_broadcast_targets(');
 assert.match(t,/^create or replace function public\.chat_broadcast_targets\(p_sender uuid, p_filters jsonb\)\n returns table\(player_id uuid, language text\) language sql stable security definer set search_path to ''/);
 assert.match(t,/ps\.level>=greatest\(\(select c\.dm_level from public\.chat_config c\),coalesce\(\(p_filters->>'minLevel'\)::integer,1\)\)/,'the private-message level still applies');
 // No upper level unless one is chosen: the game has no level cap, and 'Every farmer' must mean every farmer.
 assert.match(t,/and \(p_filters->>'maxLevel' is null or ps\.level<=\(p_filters->>'maxLevel'\)::integer\)/);assert.doesNotMatch(t,/,200\)/);
 assert.match(t,/when 'online' then ps\.last_active_at>now\(\)-interval '30 minutes' when 'week' then ps\.last_active_at>now\(\)-interval '7 days'\n   when 'month' then ps\.last_active_at>now\(\)-interval '30 days' else true end/,'online is the green dot\'s 30 minutes');
 // The Android app adds " HarvestTycoonApp/" to its user agent (public/android-app.js), the one the farm last loaded with.
 assert.match(read('public/android-app.js'),/HarvestTycoonApp\\\//);
 // The iPhone app adds the same mark on an iPhone, an iPad or an iPad in desktop mode (public/android-app.js iosApp).
 assert.match(read('public/android-app.js'),/function iosApp\(ua\)\{return \/HarvestTycoonApp\\\/\/\.test\(ua\|\|''\)&&\/iPhone\|iPad\|iPod\|Macintosh\/\.test\(ua\|\|''\);\}/);
 const p=fn('chat_broadcast_platform(');
 assert.match(p,/returns boolean language sql immutable set search_path to ''/);
 assert.match(p,/case p_platform when 'android' then p_device like '%HarvestTycoonApp\/%' and p_device like '%Android%'\n  when 'ios' then p_device like '%HarvestTycoonApp\/%' and p_device ~ '\(iPhone\|iPad\|iPod\|Macintosh\)'\n  when 'browser' then p_device not like '%HarvestTycoonApp\/%' end/);
 assert.match(sql,/revoke all on function public\.chat_broadcast_platform\(text,text\) from public, anon, authenticated;/);
 // Chosen: only a farm last loaded there (no load on record is nowhere). Left out: a farm with no load on record stays in.
 assert.match(t,/and \(p_filters->>'platform' is null or public\.chat_broadcast_platform\(seen\.device,p_filters->>'platform'\)\)\n  and \(p_filters->>'notPlatform' is null or not coalesce\(public\.chat_broadcast_platform\(seen\.device,p_filters->>'notPlatform'\),false\)\)/);
 assert.match(t,/exists\(select 1 from auth\.users u where u\.id=ps\.player_id and u\.raw_app_meta_data->>'portal'='crazygames'\)/);
 assert.match(t,/coalesce\(seen\.language,'en'\)=p_filters->>'language'/,'no language on record: English, as the text they get');
 assert.match(t,/when 'in' then exists\(select 1 from public\.family_members m join public\.families fa on fa\.id=m\.family_id where m\.player_id=ps\.player_id and m\.left_at is null and fa\.deleted_at is null\)/);
 assert.match(t,/not exists\(select 1 from public\.chat_blocks b where b\.player_id=ps\.player_id and b\.blocked_id=p_sender\)/);
 assert.match(t,/not exists\(select 1 from public\.chat_sanctions s where s\.player_id=ps\.player_id and s\.banned\)/);
 assert.match(t,/and not exists\(select 1 from public\.chat_settings cs where cs\.player_id=ps\.player_id and cs\.private_off\)/,'private messages off: left out (the owner, 8 Oct 2026)');
 assert.match(t,/and not public\.harvest_portal_guest\(ps\.player_id\)\n$/,'a CrazyGames guest never gets it');
 assert.match(sql,/revoke all on function public\.chat_broadcast_targets\(uuid,jsonb\) from public, anon, authenticated;/,'only the functions below call it');
 // The setting it reads is the one chat_send checks and Settings switches (chat_set_private).
 assert.match(read('supabase/chat.sql'),/c\.private_off/);
});

test('sending: the admin only, the old checks and texts, the group on every copy, logged with the same time',()=>{
 const d=fn('chat_broadcast_dm(p_body text, p_filters jsonb');
 assert.match(d,/^create or replace function public\.chat_broadcast_dm\(p_body text, p_filters jsonb, p_send boolean default false, p_texts jsonb default null\)\n returns integer language plpgsql security definer set search_path to ''/);
 assert.match(d,/declare me uuid:=\(select auth\.uid\(\)\);/,'the sender is who is signed in, never a parameter');
 assert.match(d,/if me is null or coalesce\(\(select auth\.jwt\(\)->>'is_anonymous'\)::boolean,false\) or public\.harvest_portal_guest\(me\) then raise exception 'Sign in to use the chat\.' using errcode='28000'; end if;/);
 assert.match(d,/if public\.chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Not authorized\.' using errcode='42501'; end if;\n f:=public\.chat_broadcast_filters\(p_filters\);/,'the admin only, and the filters checked before anything is counted');
 assert.match(d,/if not coalesce\(p_send,false\) then return \(select count\(\*\) from public\.chat_broadcast_targets\(me,f\)\); end if;/,'the count uses the same filters');
 assert.match(d,/if char_length\(msg\)<1 or char_length\(msg\)>500 then raise exception 'Write 1–500 characters\.'/);
 assert.match(d,/m\.body=msg or m\.body in \(select value from jsonb_each_text\(own\)\)\) and m\.created_at>now\(\)-interval '10 minutes' and m\.meta->'group'->'filters'=f\) then raise exception 'You sent this message a moment ago\.'/,'a double click sends once; the same text may go to another group');
 assert.match(d,/coalesce\(own->>t\.language,msg\),\n   jsonb_build_object\('group',jsonb_build_object\('id',gid,'filters',f\)\)\n  from public\.chat_broadcast_targets\(me,f\) t/,'their language, else English, and the checked filters on every copy');
 assert.match(d,/insert into public\.chat_reads\(player_id,channel,last_read_at\) select me,sent\.channel,now\(\) from sent/,'the admin\'s side read, for exactly the chats that got it');
 assert.match(d,/if n>0 then insert into public\.chat_broadcasts\(id,sender,filters,body,recipients,sent_at\) values\(gid,me,f,msg,n,now\(\)\); end if;/);
 assert.match(sql,/revoke all on function public\.chat_broadcast_dm\(text,jsonb,boolean,jsonb\) from public, anon;\ngrant execute on function public\.chat_broadcast_dm\(text,jsonb,boolean,jsonb\) to authenticated;/);
 // chat_messages has meta live (family-request-chat.sql), and the chat reads it with every message (src/chat-client.js).
 assert.match(read('supabase/family-request-chat.sql'),/alter table public\.chat_messages add column if not exists meta jsonb;/);
 assert.match(read('src/chat-client.js'),/const CARD_COLUMNS=`\$\{MESSAGE_COLUMNS\},kind,meta`;/);
});

test('the dashboard of before keeps working: its call becomes one with filters; the API tells the two apart by their names',()=>{
 const old=fn('chat_broadcast_dm(p_body text, p_audience text');
 assert.match(old,/if public\.chat_staff_role\(\(select auth\.uid\(\)\)\) is distinct from 'admin' then raise exception 'Not authorized\.'/);
 assert.match(old,/if p_audience is null or p_audience not in \('online','week','all'\) then raise exception 'Choose who gets it\.'/);
 assert.match(old,/return public\.chat_broadcast_dm\(p_body,jsonb_build_object\('active',p_audience,'minLevel',lvl\),p_send,p_texts\);/);
 // PostgREST picks an overloaded function by the names given: the old call's p_audience and p_min_level against the new p_filters.
 const names=signature=>signature.match(/p_\w+/g);
 const [a,b]=[/function public\.chat_broadcast_dm\((p_body text, p_audience[^)]*)\)/.exec(sql)[1],/function public\.chat_broadcast_dm\((p_body text, p_filters[^)]*)\)/.exec(sql)[1]].map(names);
 assert.ok(a.includes('p_audience')&&!b.includes('p_audience')&&b.includes('p_filters')&&!a.includes('p_filters'));
 const client=read('src/chat-client.js');
 assert.match(client,/rpc\('chat_broadcast_dm',\{p_body:body,p_audience:audience,p_send:send,p_min_level:minLevel,p_texts:texts\}\)/);
 assert.match(client,/supabase\.rpc\('chat_broadcast_dm',\{p_body:body,p_filters:filters,p_send:send,p_texts:texts\}\)/);
 // Replaced only while live is still the function that was read on 8 Oct 2026; a second run leaves it.
 assert.match(sql,/if position\(\$m\$jsonb_build_object\('active',p_audience,'minLevel',lvl\)\$m\$ in d\)>0 then return; end if;\n if md5\(d\)<>'a9eb04b87c3e15c05be67613391fb2ab' then raise exception/);
 assert.ok(sql.indexOf('do $check$')<sql.indexOf('create table if not exists public.chat_broadcasts'),'checked before anything changes');
 // The guest rule on the old three-argument target list (crazygames.sql) is left as it is.
 assert.doesNotMatch(sql,/chat_broadcast_targets\(uuid,text,integer\)/);
});

test('the log: row-level security on and nothing for the API; the admin reads the last sends with the replies counted when asked',()=>{
 assert.match(sql,/create table if not exists public\.chat_broadcasts\(\n id uuid primary key default gen_random_uuid\(\),\n sender uuid not null references auth\.users\(id\) on delete cascade,\n filters jsonb not null default '\{\}'::jsonb,\n body text not null,\n recipients integer not null check \(recipients>=0\),\n sent_at timestamptz not null default now\(\)\n\);/);
 assert.match(sql,/alter table public\.chat_broadcasts enable row level security;\nrevoke all on public\.chat_broadcasts from public, anon, authenticated;/);
 assert.doesNotMatch(sql,/create policy/,'no policy: only the admin\'s function reads it');
 const l=fn('chat_broadcast_log(');
 assert.match(l,/if public\.chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Not authorized\.'/);
 assert.match(l,/'replies',\(select count\(\*\) from public\.chat_messages m where m\.sender=b\.sender and m\.created_at=b\.sent_at and m\.channel like 'dm:%' and m\.meta->'group'->>'id'=b\.id::text\n     and exists\(select 1 from public\.chat_messages r where r\.channel=m\.channel and r\.sender<>b\.sender and r\.created_at>m\.created_at\)\)/);
 assert.match(l,/limit least\(greatest\(coalesce\(p_limit,10\),1\),50\)/);
 assert.match(sql,/revoke all on function public\.chat_broadcast_log\(integer\) from public, anon;\ngrant execute on function public\.chat_broadcast_log\(integer\) to authenticated;/);
 // Keyed on the admin who sent it: it goes with their account, patched into the live delete function after its chat settings.
 assert.match(sql,/want text:=\$a\$delete from public\.chat_settings where player_id=p_player;get diagnostics n=row_count;c:=c\|\|jsonb_build_object\('chat_settings',n\);\$a\$;/);
 assert.ok(read('supabase/delete-account.sql').includes("delete from public.chat_settings where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_settings',n);"),'the line is in the repository\'s copy');
 assert.match(sql,/if position\('public\.chat_broadcasts' in d\)>0 then return; end if;\n if \(length\(d\)-length\(replace\(d,want,''\)\)\)\/length\(want\)<>1 then raise exception/);
 assert.match(sql,/delete from public\.chat_broadcasts where sender=p_player;get diagnostics n=row_count;c:=c\|\|jsonb_build_object\('chat_broadcasts',n\);/);
});

test('the client: filters under their own name; before the file is in the database, null, so the dashboard keeps the old choice',async()=>{
 const calls=[];let reply={data:42,error:null};
 const client=createChatClient({rpc:async(name,args)=>{calls.push([name,args]);return reply;}},{playerId:ADMIN});
 assert.equal(await client.broadcastGroup({filters:{active:'week',language:'es'}}),42);
 assert.deepEqual(calls[0],['chat_broadcast_dm',{p_body:'',p_filters:{active:'week',language:'es'},p_send:false,p_texts:null}]);
 reply={data:[{id:'x',recipients:3,replies:1}],error:null};
 assert.deepEqual(await client.broadcastLog(),[{id:'x',recipients:3,replies:1}]);assert.deepEqual(calls[1],['chat_broadcast_log',{p_limit:10}]);
 reply={data:null,error:{code:'PGRST202',message:'Could not find the function public.chat_broadcast_dm(p_body, p_filters, p_send, p_texts) in the schema cache'}};
 assert.equal(await client.broadcastGroup({filters:{}}),null);assert.equal(await client.broadcastLog(),null);
 reply={data:null,error:{code:'22023',message:'There is no filter called country.'}};
 await assert.rejects(client.broadcastGroup({filters:{country:'NL'}}),/There is no filter called country\./,'the admin reads the database\'s own words');
});

test('the farmer\'s line: one pill per filter in the game\'s words, the language by its own name, "Every farmer" without filters',()=>{
 assert.deepEqual(groupPills({}),['Every farmer']);assert.deepEqual(groupPills(null),['Every farmer']);
 assert.deepEqual(groupPills({minLevel:14,maxLevel:40,active:'week',platform:'android',crazygames:true,language:'es',family:'in'}),
  ['From level 14','Up to level 40','Active this week','Plays in the Android app','Plays on CrazyGames','Plays in Español','In a family']);
 assert.deepEqual(groupPills({active:'online'}),['Online now']);assert.deepEqual(groupPills({active:'month'}),['Active this month']);
 assert.deepEqual(groupPills({platform:'browser',family:'out'}),['Plays in the browser','Not in a family']);
 assert.deepEqual(groupPills({language:'ar'}),['Plays in العربية']);
 // The App Store app, and a place left out (the owner, 8 Oct 2026: "exclude Google Play").
 assert.deepEqual(groupPills({platform:'ios'}),['Plays in the iPhone app']);
 assert.deepEqual(groupPills({notPlatform:'android'}),['Not in the Android app']);
 assert.deepEqual(groupPills({minLevel:20,notPlatform:'ios'}),['From level 20','Not in the iPhone app']);
 assert.deepEqual(groupPills({notPlatform:'browser'}),['Not in the browser']);assert.deepEqual(groupPills({notPlatform:'windows'}),[]);
 // Only what the database checked: a filter this game does not know is left out, and then nothing says "every farmer".
 assert.deepEqual(groupPills({country:'NL'}),[]);assert.deepEqual(groupPills({active:'constructor',minLevel:'14',crazygames:'yes'}),[]);
 const line=groupLine({body:'Hi',meta:{group:{id:'g',filters:{minLevel:14,language:'nl'}}}});
 assert.match(line,/^<div class="chat-group"><span class="chat-group-title">.*Group message from the team<\/span><span class="chat-group-to"><span>Sent to:<\/span><span class="chat-group-pill">From level 14<\/span><span class="chat-group-pill">Plays in Nederlands<\/span><\/span><\/div>$/);
 assert.doesNotMatch(line,/·/,'separate pills, never a middle dot');
 assert.doesNotMatch(line,/Hi/,'never the admin\'s own text');
 assert.equal(groupLine({body:'Hi',meta:null}),'');assert.equal(groupLine({body:'Hi'}),'');
 assert.doesNotMatch(groupLine({meta:{group:{filters:{country:'NL'}}}}),/Sent to/);
 // A group message stands on its own: a message of the admin's right before or after it never folds into it.
 const at=n=>new Date(Date.UTC(2026,9,8,9,n)).toISOString();
 assert.deepEqual(messageLayout([{sender:'a',created_at:at(3)},{sender:'a',created_at:at(2),meta:{group:{id:'g',filters:{}}}},{sender:'a',created_at:at(1)}]).map(x=>x.cont),[false,false,false]);
 // Every text in every language; the Arabic layout runs by itself (no left or right).
 for(const code of LANGUAGES.map(l=>l.code).filter(c=>c!=='en')){
  const words=JSON.parse(read(`public/i18n/${code}.json`));
  for(const key of ['Group message from the team','Sent to:','From level {0}','Up to level {0}','Online now','Active this week','Active this month','Plays in the Android app','Plays in the iPhone app','Plays in the browser','Not in the Android app','Not in the iPhone app','Not in the browser','Plays on CrazyGames','Plays in {0}','In a family','Not in a family','Every farmer'])assert.ok(words[key],`${code}: ${key}`);
 }
 const css=read('public/chat.css'),group=css.slice(css.indexOf('.chat-group{'),css.indexOf('.chat-msg.has-translate:not(.is-cont) .chat-group'));
 assert.ok(group.length>100);assert.doesNotMatch(group,/\b(left|right)\b/);assert.match(group,/\.chat-group-to\{display:flex;flex-wrap:wrap;/,'the pills wrap on a 360 px phone');
 assert.match(group,/\.chat-group-pill\{max-width:100%;[^}]*text-overflow:ellipsis;white-space:nowrap\}/);
});

// Just enough of a page for the chat window to open a private chat and draw its messages.
function page(chat){
 const made=[];
 const el=()=>{const node={hidden:false,open:false,disabled:false,value:'',textContent:'',innerHTML:'',dataset:{},attrs:{},kids:new Map(),on:{},classList:{toggle(){},add(){},remove(){},contains:()=>false},
  setAttribute(k,v){node.attrs[k]=String(v);},getAttribute:k=>node.attrs[k]??null,removeAttribute(k){delete node.attrs[k];},hasAttribute:k=>k in node.attrs,
  querySelector(sel){if(!node.kids.has(sel))node.kids.set(sel,el());return node.kids.get(sel);},querySelectorAll:()=>[],addEventListener(type,fn){(node.on[type]??=[]).push(fn);},
  showModal(){node.open=true;},close(){node.open=false;},focus(){},append(){},remove(){},setSelectionRange(){}};return node;};
 const button=el(),dot=el(),listeners=new Map();
 const doc={hidden:false,getElementById:id=>id==='chat-button'?button:id==='chat-dot'?dot:null,createElement:()=>{const node=el();made.push(node);return node;},body:{append(){}},querySelectorAll:()=>[],addEventListener(){}};
 chat.subscribe=()=>()=>{};
 const ui=createChatUI({bridge:{chat,playerId:ME},profiles:null,doc,win:{addEventListener(type,fn){listeners.set(type,fn);},matchMedia:()=>({matches:false})}});
 return {ui,list:made[0].querySelector('.chat-list'),close:()=>listeners.get('pagehide')?.()};
}
test('in the game: the group message shows the line above its text; an ordinary private message does not',async()=>{
 const saved={document:globalThis.document,matchMedia:globalThis.matchMedia};
 globalThis.document??={querySelectorAll:()=>[]};globalThis.matchMedia??=()=>({matches:false});
 const channel=dmChannel(ME,ADMIN),msg=(id,body,meta,minute)=>({id,channel,sender:ADMIN,sender_name:'Tony',sender_staff:true,sender_vip:false,body,meta,kind:'message',created_at:new Date(Date.UTC(2026,9,8,9,minute)).toISOString()});
 const rows=[msg('m2','Thanks for playing!',null,30),msg('m1','Tell us what you think: https://example.com',{group:{id:'g1',filters:{active:'week',minLevel:14}}},20)];
 const chat={overview:async()=>({me:ME,role:null,joined:'2026-09-01T00:00:00Z',level:30,family:null,unread:{notices:0,global:0,family:0,dm:0,mentions:0},threads:[],blocked:[],crew:null,privateOn:true,levels:{global:1,dm:1}}),
  messages:async()=>rows,markRead:async()=>{},faces:async()=>new Map(),cards:async()=>[],dmChannel:other=>dmChannel(ME,other)};
 const p=page(chat);
 try{
  await p.ui.open({with:{id:ADMIN,name:'Tony'}});for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));
  const html=p.list.innerHTML,first=html.indexOf('data-id="m1"'),second=html.indexOf('data-id="m2"');
  assert.ok(first>0&&second>=0);
  const groupRow=html.slice(first,html.indexOf('</li>',first)),plainRow=html.slice(second,html.indexOf('</li>',second));
  assert.match(groupRow,/<div class="chat-group">.*Group message from the team.*<span>Sent to:<\/span><span class="chat-group-pill">From level 14<\/span><span class="chat-group-pill">Active this week<\/span><\/span><\/div><p class="chat-text">/,'above its text');
  assert.doesNotMatch(plainRow,/chat-group/,'only the group message');
  assert.match(groupRow,/class="chat-name"/,'with the admin\'s name, never folded into the message before it');
 }finally{p.close();if(saved.document===undefined)delete globalThis.document;if(saved.matchMedia===undefined)delete globalThis.matchMedia;}
});

test('the dashboard: the filters next to the audience, the count with them, the question names them, the last sends listed',()=>{
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/<option value="online">Online now<\/option><option value="week" selected>Active this week<\/option><option value="month" data-group-filter>Active this month<\/option><option value="all">Everyone<\/option>/);
 for(const id of ['max-level','platform','notPlatform','language','family','crazygames'])assert.match(admin,new RegExp(`id="admin-dm-${id}"`),id);
 assert.match(admin,/<select id="admin-dm-language"><option value="">Any language<\/option>'\+LANGUAGES\.map/);
 assert.match(admin,/for\(const id of \['audience','platform','notPlatform','language','family','crazygames'\]\)dialog\.querySelector\(`#admin-dm-\$\{id\}`\)\.addEventListener\('change',\(\)=>void countDm\(\)\);/,'every filter counts again');
 assert.match(admin,/let n=groupFilters===false\?null:await bridge\.chat\.broadcastGroup\(\{filters:dmFilters\(\)\}\);if\(ask!==dmCounting\)return;/,'the count with the filters, only the latest one');
 assert.match(admin,/if\(n===null\)\{showGroupFilters\(false\);n=await bridge\.chat\.broadcastDm\(/,'the old database: the old choice and count');
 assert.match(admin,/if\(active!=='all'\)f\.active=active;if\(minLevel>1\)f\.minLevel=minLevel;/,'only what narrows it down, as the database keeps it');
 assert.match(admin,/description=group\?`Sent to: \$\{groupPills\(filters\)\.join\(', '\)\}\. They get “\$\{body\}” from you\$\{languages\} and can reply\./,'the question names the filters as the farmers will read them');
 assert.match(admin,/const reached=group\?await bridge\.chat\.broadcastGroup\(\{body,filters,send:true,texts\}\):await bridge\.chat\.broadcastDm\(\{body,audience:audience\.value,send:true,minLevel,texts\}\);/);
 assert.match(admin,/if\(reached===null\)\{showGroupFilters\(false\);/,'never a wider send without the filters');
 assert.match(admin,/\$\{number\(b\.recipients\)\} farmer\$\{b\.recipients===1\?'':'s'\}, \$\{number\(b\.replies\)\} replied/);
 assert.match(admin,/import \{translateLink,groupPills\} from '\.\/chat-ui\.js';/);
 // The moderators never see it: the whole card is the admin's (Settings).
 assert.match(admin,/dialog\.querySelector\('\[data-admin-tab="settings"\]'\)\.hidden=role!=='admin';/);
});
