// All private chats within reach (8 Oct 2026, supabase/chat-threads-paging.sql): the overview lists the 30 newest and every unread one and
// counts them all, Show more pages on from a cursor, and a push for a chat further down opens that chat.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createChatClient,dmChannel} from '../src/chat-client.js';
import {createChatUI,dmOther,mergeThreads,byLast} from '../src/chat-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const sql=read('supabase/chat-threads-paging.sql');
const ME='11111111-1111-4111-8111-111111111111',DAISY='22222222-2222-4222-8222-222222222222',OTHER='33333333-3333-4333-8333-333333333333';

test('the database: two indexes on my id in a private channel, read as two lookups, so the overview reads only my own private messages',()=>{
 assert.match(sql,/create index if not exists chat_messages_dm_first on public\.chat_messages \(split_part\(channel,':',2\), created_at desc\) where channel like 'dm:%';/);
 assert.match(sql,/create index if not exists chat_messages_dm_second on public\.chat_messages \(split_part\(channel,':',3\), created_at desc\) where channel like 'dm:%';/);
 // Each lookup repeats the index's own condition and expression, or the planner cannot use it.
 for(const side of [2,3])assert.equal(sql.split(`where m.channel like 'dm:%' and split_part(m.channel,':',${side})=me::text group by m.channel`).length-1,2,`side ${side}: the overview and chat_threads`);
 assert.doesNotMatch(sql.slice(sql.indexOf('$new$')),/split_part\(m\.channel,':',2\)=me::text or/,'no "or" over both sides: that reads the whole table');
});

test('the overview is patched from the live text: every part found exactly once or nothing changes, and a second run does nothing',()=>{
 assert.match(sql,/d:=pg_get_functiondef\('public\.chat_overview\(\)'::regprocedure\);/);
 assert.match(sql,/if position\('''moreThreads''' in d\)>0 then raise notice 'chat_overview has moreThreads already'; return; end if;/);
 assert.match(sql,/if \(length\(d\)-length\(replace\(d,want\[i\],''\)\)\)\/length\(want\[i\]\)<>1 then raise exception 'chat_overview: part % \(of 4\) was not found once', i; end if;/);
 assert.match(sql,/d:=replace\(d,want\[i\],put\[i\]\);\n end loop;\n execute d;/);
 // What it looks for is the overview as the repository has it (supabase/chat-crew.sql; live had the same part on 8 Oct 2026).
 const base=read('supabase/chat-crew.sql'),want=[...sql.slice(sql.indexOf('want text[]'),sql.indexOf('put text[]')).matchAll(/\$old\$([\s\S]*?)\$old\$/g)].map(m=>m[1]);
 assert.equal(want.length,3);for(const part of want)assert.ok(base.includes(part),part.slice(0,60));
 assert.ok(base.includes('threads jsonb; blocked jsonb;'));
});

test('the overview lists the 30 newest and every unread chat (99 at most), counts them all, and says where the next page starts',()=>{
 assert.match(sql,/row_number\(\) over \(order by mine\.last_at desc, mine\.channel collate "C" desc\) as n from mine\n  where not exists\(select 1 from public\.chat_blocks b where b\.player_id=me and b\.blocked_id=mine\.other\)/,'blocked farmers left out before counting');
 assert.match(sql,/select k\.\* from k where k\.n<=30 or k\.unread>0 order by k\.last_at desc, k\.channel collate "C" desc limit 99/);
 assert.match(sql,/coalesce\(\(select sum\(k\.unread\) from k\),0\),\n  \(select count\(\*\) from k\)>\(select count\(\*\) from t\),\n  \(select jsonb_build_object\('at',k\.last_at,'channel',k\.channel\) from k where k\.n=30\)\n into threads, n_dm, more_threads, threads_cursor;/);
 assert.match(sql,/if not more_threads then threads_cursor:=null; end if;/);
 assert.match(sql,/'threads',threads,'moreThreads',more_threads,'threadsCursor',threads_cursor,'blocked',blocked,/);
 // An unread count as before: the other farmer's messages after I last read the chat (or since I joined).
 assert.equal(sql.split("count(*) filter (where m.sender<>me and m.created_at>coalesce(r.last_read_at,joined))").length-1,4);
 assert.match(sql,/left join public\.chat_reads r on r\.player_id=me and r\.channel=m\.channel/);
});

test('chat_threads: a page after the cursor, as the overview orders it (time, then channel), guarded like the overview',()=>{
 const fn=sql.slice(sql.indexOf('create or replace function public.chat_threads'));
 assert.match(fn,/^create or replace function public\.chat_threads\(p_before_at timestamptz, p_before_channel text, p_limit integer default 30\)\n returns jsonb language plpgsql stable security definer set search_path to '' as \$function\$/);
 assert.match(fn,/me uuid:=\(select auth\.uid\(\)\);/,'the farmer is who is signed in, never a parameter');
 assert.match(fn,/if me is null or coalesce\(\(select auth\.jwt\(\)->>'is_anonymous'\)::boolean,false\) then raise exception 'Sign in to use the chat\.' using errcode='28000'; end if;/);
 assert.match(fn,/lim int:=least\(greatest\(coalesce\(p_limit,30\),1\),50\);/,'1 to 50 at a time');
 // A message to many farmers gives their chats one time: the cursor is the pair, or chats with that time would be skipped.
 assert.match(fn,/and \(p_before_at is null or mine\.last_at<p_before_at or \(mine\.last_at=p_before_at and mine\.channel collate "C"<coalesce\(p_before_channel,''\)\)\)\n  order by mine\.last_at desc, mine\.channel collate "C" desc limit lim\+1/);
 assert.match(fn,/where not exists\(select 1 from public\.chat_blocks b where b\.player_id=me and b\.blocked_id=mine\.other\)/);
 assert.match(fn,/\(select count\(\*\) from k\)>lim,/);
 assert.match(fn,/return jsonb_build_object\('threads',page,'more',more,'cursor',case when more then last_one end\);/);
 assert.match(fn,/revoke all on function public\.chat_threads\(timestamptz,text,integer\) from public, anon;\ngrant execute on function public\.chat_threads\(timestamptz,text,integer\) to authenticated;/);
 // The same rows as the overview's, so the list draws both the same way.
 const row="'channel',t.channel,'otherId',t.other,'otherName',coalesce(ps.username,'A farmer'),'otherAvatar',ps.avatar_id,'otherVip',coalesce(ps.vip_expires_at>now(),false),'lastAt',t.last_at,";
 const patched=sql.slice(sql.indexOf('$new$')),overviewPart=patched.slice(0,patched.indexOf('create or replace function public.chat_threads'));
 assert.equal(patched.split(row).length-1,2);assert.ok(overviewPart.includes(row));
 assert.match(overviewPart,/order by k\.last_at desc, k\.channel collate "C" desc limit 99/,'the overview orders the same way, so its cursor fits');
});

test('the client asks for the page after the cursor exactly as the server wrote it; without chat_threads it gets null',async()=>{
 const calls=[];let reply={data:{threads:[],more:false,cursor:null},error:null};
 const client=createChatClient({rpc:async(name,args)=>{calls.push([name,args]);return reply;}},{playerId:ME});
 const cursor={at:'2026-10-08T09:15:02.123456+00:00',channel:`dm:${ME}:${DAISY}`};
 assert.deepEqual(await client.threads(cursor),{threads:[],more:false,cursor:null});
 assert.deepEqual(calls[0],['chat_threads',{p_before_at:'2026-10-08T09:15:02.123456+00:00',p_before_channel:`dm:${ME}:${DAISY}`,p_limit:30}],'the microseconds stay');
 reply={data:null,error:{code:'PGRST202',message:'Could not find the function public.chat_threads in the schema cache'}};
 assert.equal(await client.threads(cursor),null,'the database without supabase/chat-threads-paging.sql');
 reply={data:null,error:{code:'28000',message:'Sign in to use the chat.'}};
 await assert.rejects(client.threads(cursor),/Sign in to use the chat\./);
});

test('the other farmer of a private chat comes from its channel, only when I am one of the two',()=>{
 assert.equal(dmOther(`dm:${ME}:${DAISY}`,ME),DAISY);assert.equal(dmOther(`dm:${ME}:${DAISY}`,DAISY),ME);
 assert.equal(dmOther(`dm:${DAISY}:${OTHER}`,ME),null,'not my chat');
 for(const bad of ['global','crew',`family:${DAISY}`,`dm:${ME}`,`dm:${ME}:${DAISY}:x`,null])assert.equal(dmOther(bad,ME),null,String(bad));
 assert.equal(dmOther(`dm:${ME}:${DAISY}`,null),null);
});

test('the order of the list: newest first, then the channel in byte order, as the server pages them',()=>{
 const t=(channel,lastAt)=>({channel,lastAt});
 assert.deepEqual([t('dm:a:b','2026-10-08T09:00:00.000001+00:00'),t('dm:a:c','2026-10-08T10:00:00Z'),t('dm:a:d','2026-10-08T09:00:00.000001+00:00')].sort(byLast).map(x=>x.channel),['dm:a:c','dm:a:d','dm:a:b']);
});

test('the list is the overview\'s chats, then the older pages that are not among them, each chat once',()=>{
 const t=(channel,extra={})=>({channel,otherId:channel,otherName:channel,...extra});
 assert.deepEqual(mergeThreads([t('a'),t('b')],[t('b',{otherName:'old'}),t('c'),t('c')]).map(x=>[x.channel,x.otherName]),[['a','a'],['b','b'],['c','c']]);
 assert.deepEqual(mergeThreads(undefined,[t('c')]).map(x=>x.channel),['c']);assert.deepEqual(mergeThreads([t('a')],null).map(x=>x.channel),['a']);
});

// A small stand-in for the page: just enough for the chat window to open, draw its list and take a tap.
function page({chat}){
 const made=[],listeners=new Map();
 const el=()=>{const node={hidden:false,open:false,disabled:false,value:'',textContent:'',innerHTML:'',dataset:{},attrs:{},kids:new Map(),on:{},
  classList:{toggle(){},add(){},remove(){},contains:()=>false},
  setAttribute(k,v){node.attrs[k]=String(v);},getAttribute:k=>node.attrs[k]??null,removeAttribute(k){delete node.attrs[k];},hasAttribute:k=>k in node.attrs,
  querySelector(sel){if(!node.kids.has(sel))node.kids.set(sel,el());return node.kids.get(sel);},querySelectorAll:()=>[],
  addEventListener(type,fn){(node.on[type]??=[]).push(fn);},fire(type,event={}){for(const fn of node.on[type]??[])fn(event);},
  showModal(){node.open=true;},close(){if(node.open){node.open=false;node.fire('close');}},focus(){},append(){},remove(){},setSelectionRange(){},
  getBoundingClientRect:()=>({left:0,right:100,top:0,bottom:100})};return node;};
 const button=el(),dot=el();
 const doc={hidden:false,getElementById:id=>id==='chat-button'?button:id==='chat-dot'?dot:null,createElement:()=>{const node=el();made.push(node);return node;},body:{append(){}},querySelectorAll:()=>[],addEventListener(){}};
 const win={addEventListener(type,fn){listeners.set(type,fn);},matchMedia:()=>({matches:false})};
 let live=null;chat.subscribe=fn=>{live=fn;return()=>{};};
 const ui=createChatUI({bridge:{chat,playerId:ME},profiles:null,doc,win});
 const dialog=made[0],list=dialog.querySelector('.chat-list'),title=dialog.querySelector('#chat-title');
 const tap=match=>list.fire('click',{target:{closest:sel=>match(sel)}});
 return {ui,button,list,title,tap,emit:event=>live?.(event),close:()=>listeners.get('pagehide')?.()};
}
const settle=async(times=6)=>{for(let i=0;i<times;i++)await new Promise(resolve=>setImmediate(resolve));};
const overview=(threads,extra={})=>({me:ME,role:null,joined:'2026-09-01T00:00:00Z',level:30,family:null,mutedUntil:null,banned:false,unread:{notices:0,global:0,family:0,dm:0,mentions:0},threads,blocked:[],crew:null,privateOn:true,levels:{global:5,dm:5},...extra});
let farmers=0;
const thread=(name,lastAt,extra={})=>{const id=`${String(++farmers).padStart(8,'0')}-0000-4000-8000-000000000000`;return {channel:dmChannel(ME,id),otherId:id,otherName:name,otherAvatar:null,otherVip:false,lastAt,last:{body:`hello from ${name}`,mine:false},unread:0,...extra};};
const order=html=>[...html.matchAll(/data-thread="([^"]+)"/g)].map(m=>m[1]);
async function withPage(chat,run){
 const saved={document:globalThis.document,matchMedia:globalThis.matchMedia};
 globalThis.document??={querySelectorAll:()=>[]};globalThis.matchMedia??=()=>({matches:false});
 const p=page({chat});
 try{await run(p);}finally{p.close();if(saved.document===undefined)delete globalThis.document;if(saved.matchMedia===undefined)delete globalThis.matchMedia;}
}
const baseChat=extra=>({markRead:async()=>{},faces:async()=>new Map(),messages:async()=>[],cards:async()=>[],dmChannel:other=>dmChannel(ME,other),...extra});

test('a push for a private chat that is not in the list opens that chat, the farmer\'s name from the public cards; else the list',async()=>{
 const asked=[],opened=[];
 const chat=baseChat({overview:async()=>overview([]),cards:async ids=>{asked.push(ids);return ids.includes(DAISY)?[{playerId:DAISY,username:'Daisy',level:12,avatarId:'hen'}]:[];},messages:async name=>{opened.push(name);return [];}});
 await withPage(chat,async({ui,title,list})=>{
  await ui.open({channel:`dm:${ME}:${DAISY}`});await settle();
  assert.deepEqual(asked,[[DAISY]],'one card, the other farmer');assert.deepEqual(opened,[`dm:${ME}:${DAISY}`],'the conversation itself');
  assert.match(title.innerHTML,/data-profile="22222222-2222-4222-8222-222222222222"[^>]*>Daisy</);
  // Not my chat: no lookup, the list.
  asked.length=0;opened.length=0;
  await ui.open({channel:`dm:${DAISY}:${OTHER}`});await settle();
  assert.deepEqual(asked,[]);assert.deepEqual(opened,[]);assert.match(list.innerHTML,/No private messages yet/);
  // A farmer who is gone: the list.
  await ui.open({channel:`dm:${ME}:${OTHER}`});await settle();
  assert.deepEqual(asked,[[OTHER]]);assert.deepEqual(opened,[]);assert.match(list.innerHTML,/No private messages yet/);
 });
 // A chat in the list opens from the list's own row, without a lookup.
 const listed=thread('daisy','2026-10-08T09:00:00Z',{channel:`dm:${ME}:${DAISY}`,otherId:DAISY,otherName:'Daisy'});asked.length=0;opened.length=0;
 await withPage({...chat,overview:async()=>overview([listed])},async({ui})=>{await ui.open({channel:listed.channel});await settle();assert.deepEqual(asked,[]);assert.deepEqual(opened,[listed.channel]);});
});

test('Show more: the next page after the overview\'s cursor, then after the page\'s own; gone when the server says there is no more',async()=>{
 const [a,b,c,d,e,f]=['aa','bb','cc','dd','ee','ff'].map((n,i)=>thread(n,`2026-10-08T0${9-i}:00:00.12345${i}+00:00`));
 const first={at:c.lastAt,channel:c.channel},second={at:e.lastAt,channel:e.channel},asked=[];
 const pages=[{threads:[d,e],more:true,cursor:second},{threads:[f],more:false,cursor:null}];
 const chat=baseChat({overview:async()=>overview([a,b,c],{moreThreads:true,threadsCursor:first}),threads:async cursor=>{asked.push(cursor);return pages.shift();}});
 await withPage(chat,async({ui,list,tap})=>{
  await ui.open({tab:'private'});await settle();
  assert.deepEqual(order(list.innerHTML),[a,b,c].map(t=>t.channel));
  assert.match(list.innerHTML,/<li class="chat-earlier"><button type="button" class="small-button" data-chat-threads>Show more<\/button><\/li>$/,'at the end of the list');
  tap(sel=>sel==='[data-chat-threads]');await settle();
  assert.deepEqual(asked,[first],'the overview\'s cursor, as it came');
  assert.deepEqual(order(list.innerHTML),[a,b,c,d,e].map(t=>t.channel));assert.match(list.innerHTML,/data-chat-threads>Show more/);
  tap(sel=>sel==='[data-chat-threads]');await settle();
  assert.deepEqual(asked,[first,second],'then the page\'s own cursor');
  assert.deepEqual(order(list.innerHTML),[a,b,c,d,e,f].map(t=>t.channel));assert.doesNotMatch(list.innerHTML,/data-chat-threads/);
  // An older chat opens from the list like any other.
  tap(sel=>sel==='[data-thread]'?{dataset:{thread:f.channel}}:null);await settle();assert.match(list.innerHTML,/Say hello to ff!/);
 });
});

test('a refreshed overview (every 3 minutes and on every private message) keeps the older pages, and nothing falls in between',async()=>{
 const [n,a,b,c,d,e]=['nn','aa','bb','cc','dd','ee'].map((name,i)=>thread(name,`2026-10-08T0${9-i}:00:00Z`));
 let now=overview([a,b,c],{moreThreads:true,threadsCursor:{at:c.lastAt,channel:c.channel}});const asked=[];
 const chat=baseChat({overview:async()=>now,threads:async cursor=>{asked.push(cursor);return asked.length===1?{threads:[d,e],more:true,cursor:{at:e.lastAt,channel:e.channel}}:{threads:[],more:false,cursor:null};}});
 await withPage(chat,async({ui,list,tap,emit})=>{
  await ui.open({tab:'private'});await settle();
  tap(sel=>sel==='[data-chat-threads]');await settle();
  assert.deepEqual(order(list.innerHTML),[a,b,c,d,e].map(t=>t.channel));
  // A new chat came in and d got an answer: c dropped out of the overview's newest, d moved up with its new message.
  const answered={...d,lastAt:'2026-10-08T10:30:00Z',last:{body:'a new answer',mine:false},unread:1};
  now=overview([answered,n,a,b],{moreThreads:true,threadsCursor:{at:b.lastAt,channel:b.channel},unread:{notices:0,global:0,family:0,dm:1,mentions:0}});
  emit({type:'connected'});emit({type:'connected'});await settle();
  assert.deepEqual(order(list.innerHTML),[answered,n,a,b,c,e].map(t=>t.channel),'c stays, d once (its new copy)');
  assert.match(list.innerHTML,/a new answer/);assert.doesNotMatch(list.innerHTML,/hello from dd/);
  tap(sel=>sel==='[data-chat-threads]');await settle();
  assert.deepEqual(asked.at(-1),{at:e.lastAt,channel:e.channel},'pages on from the pages already there, not the new overview\'s cursor');
  // Opening the chat again starts at the newest again.
  await ui.open({tab:'private'});await settle();
  assert.deepEqual(order(list.innerHTML),[answered,n,a,b].map(t=>t.channel));assert.match(list.innerHTML,/data-chat-threads>Show more/);
 });
});

test('after Show more the list stays newest first: an older unread chat from the overview sits among the pages by its time',async()=>{
 const [a,b,d,e]=['ka','kb','kd','ke'].map((name,i)=>thread(name,`2026-10-08T0${9-i}:00:00Z`));
 // The overview: the newest (a, b) and an older chat with an unread answer (u, older than d on the next page).
 const u=thread('ku','2026-10-08T06:30:00Z',{unread:2});
 let now=overview([a,b,u],{moreThreads:true,threadsCursor:{at:b.lastAt,channel:b.channel},unread:{notices:0,global:0,family:0,dm:2,mentions:0}});
 const chat=baseChat({overview:async()=>now,threads:async()=>({threads:[d,e],more:false,cursor:null})});
 await withPage(chat,async({ui,list,tap,emit})=>{
  await ui.open({tab:'private'});await settle();
  tap(sel=>sel==='[data-chat-threads]');await settle();
  assert.deepEqual(order(list.innerHTML),[a,b,d,u,e].map(t=>t.channel),'by time, as the server pages them');
  // u was read on another device: the next overview no longer lists it. It stays in the list, without a stale count.
  now=overview([a,b],{moreThreads:true,threadsCursor:{at:b.lastAt,channel:b.channel}});
  emit({type:'connected'});emit({type:'connected'});await settle();
  assert.deepEqual(order(list.innerHTML),[a,b,d,u,e].map(t=>t.channel));
  const row=list.innerHTML.split('<li>').find(html=>html.includes(`data-thread="${u.channel}"`));
  assert.doesNotMatch(row,/is-unread|chat-count/,'nothing unread is left on a chat the server no longer counts');
 });
});

test('the old database: no moreThreads, no Show more; a missing chat_threads takes the button away',async()=>{
 const a=thread('aa','2026-10-08T09:00:00Z');
 await withPage(baseChat({overview:async()=>overview([a])}),async({ui,list})=>{await ui.open({tab:'private'});await settle();assert.deepEqual(order(list.innerHTML),[a.channel]);assert.doesNotMatch(list.innerHTML,/data-chat-threads/);});
 await withPage(baseChat({overview:async()=>overview([a],{moreThreads:true,threadsCursor:{at:a.lastAt,channel:a.channel}}),threads:async()=>null}),async({ui,list,tap})=>{
  await ui.open({tab:'private'});await settle();assert.match(list.innerHTML,/data-chat-threads/);
  tap(sel=>sel==='[data-chat-threads]');await settle();assert.doesNotMatch(list.innerHTML,/data-chat-threads/);assert.deepEqual(order(list.innerHTML),[a.channel]);
 });
});

test('reading a chat takes its own count off the server\'s count for all chats, also those the list does not show',async()=>{
 const a=thread('aa','2026-10-08T09:00:00Z',{unread:3});
 await withPage(baseChat({overview:async()=>overview([a],{unread:{notices:0,global:0,family:0,dm:28,mentions:0}})}),async({ui,button,tap})=>{
  await ui.open({tab:'private'});await settle();assert.equal(button.attrs['aria-label'],'Open chat, 28 unread');
  tap(sel=>sel==='[data-thread]'?{dataset:{thread:a.channel}}:null);await settle();
  assert.equal(button.attrs['aria-label'],'Open chat, 25 unread','not 0: 25 are in chats further down');
 });
});

test('Show more reuses a text every language has, and the chat\'s own button look',()=>{
 for(const code of ['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh']){const words=JSON.parse(read(`public/i18n/${code}.json`));for(const key of ['Show more','Loading…','A farmer'])assert.ok(words[key],`${code}: ${key}`);}
 assert.match(read('public/chat.css'),/\.chat-earlier\{display:flex;justify-content:center;padding:12px 0 4px\}/);
});
