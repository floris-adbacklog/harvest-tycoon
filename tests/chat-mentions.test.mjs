import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chatParts,mentionsMe,mentionAt,insertMention,mentionIds,mentionMatches,MAX_MENTIONS,MAX_WIKI_LINKS} from '../src/chat-rich.js';
import {wikiArticle,wikiSectionTitle} from '../public/wiki-content.js';
import {wikiLinksIn} from '../public/wiki-link.js';
import {messagePushes} from '../supabase/functions/notify-hourly/messages.js';
import {textsFor,MAIL_LANGUAGES} from '../supabase/functions/notify-hourly/texts.js';
import {createChatClient} from '../src/chat-client.js';
import {headerCount} from '../src/chat-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const A='00000000-0000-4000-8000-00000000000a',B='00000000-0000-4000-8000-00000000000b';

// 3 Oct 2026: links to our own wiki are the only links the chat lets through, at most 2 in a message, as chips. Which address is one is
// the wiki's own rule (public/wiki-link.js, the address Copy link writes): one helper for the wiki and the chat (Oct 2026 merge).
test('the chat reads a wiki link with the wiki\'s own helper, never a second one of its own',()=>{
 const rich=read('src/chat-rich.js');
 assert.match(rich,/import \{wikiLinksIn\} from '\.\.\/public\/wiki-link\.js';/);
 assert.match(rich,/for\(const \{url,topic,section,index\} of wikiLinksIn\(text\)\)marks\.push\(/);
 assert.doesNotMatch(rich,/harvesttycoon|function \w*[wW]iki\w*\(/,'no address rule or wiki helper of its own');
 assert.doesNotMatch(read('src/chat-ui.js'),/harvesttycoon\\\.com|wikiLinkTitle|chatWikiLink/);
});

test('a message becomes words, wiki chips and mentions, in order; the chip says the section in the game\'s own words',()=>{
 const parts=chatParts('See https://www.harvesttycoon.com/wiki/chat#sec-house-rules, @Ann Lee and @Ann!',[{id:'a',name:'Ann'},{id:'b',name:'Ann Lee'}]);
 assert.deepEqual(parts,[{text:'See '},{wiki:{topic:'chat',section:'sec-house-rules',url:'https://www.harvesttycoon.com/wiki/chat#sec-house-rules'}},{text:', '},{mention:{id:'b',name:'Ann Lee'}},{text:' and '},{mention:{id:'a',name:'Ann'}},{text:'!'}],'the longer name first');
 assert.deepEqual(chatParts('myharvesttycoon.com/wiki/chat'),[{text:'myharvesttycoon.com/wiki/chat'}],'not on its own: plain words');
 assert.deepEqual(chatParts('harvesttycoon.com/wiki/nope'),[{text:'harvesttycoon.com/wiki/nope'}],'a topic the wiki does not have');
 assert.deepEqual(chatParts('@Bob was here',[{id:'b',name:'Bobby'}]),[{text:'@Bob was here'}],'a mention counts only where its name is');
 assert.deepEqual(chatParts(''),[{text:''}]);
 assert.deepEqual(chatParts('(harvesttycoon.com/wiki/crops#crop-wheat) ok'),[{text:'('},{wiki:{topic:'crops',section:'crop-wheat',url:'harvesttycoon.com/wiki/crops#crop-wheat'}},{text:') ok'}],'the bracket stays words');
 assert.equal(wikiSectionTitle('chat','sec-house-rules'),'House rules');
 assert.equal(wikiSectionTitle('buildings','building-bakery'),'Bakery','a building\'s row: its name, without the picture');
 assert.equal(wikiSectionTitle('crops','crop-wheat'),'Wheat','a crop\'s row in Every crop');
 assert.equal(wikiSectionTitle('quests','level-30'),'Level 30','a level in What opens when');
 assert.equal(wikiSectionTitle('crops','sec-nothing-here'),'Fields and crops','an unknown section: the topic');
 // The titles are texts the page already translates: the house rules heading is in the catalog.
 assert.ok('House rules' in JSON.parse(read('i18n/catalog.json')));
 assert.match(wikiArticle('chat').html,/id="sec-house-rules"><h3>House rules<\/h3>/);
});

test('the game and the database let the same wiki links through: the same address, at most 2, every other link refused with its reason',()=>{
 const sql=read('supabase/chat-wiki-links.sql');
 // The database's wiki address (it is a JavaScript expression too): it counts and strips this one.
 const WIKI_SQL=String.raw`(^|[\s(])(https?://)?(www\.)?harvesttycoon\.com/wiki(/[a-z-]+)?/?(#[a-z0-9-]+)?(?=$|[\s).,!?;:])`;
 assert.equal(sql.split(`'${WIKI_SQL}'`).length-1,2,'chat_wiki_links counts and strips the same address');
 // Every chip the game draws (wiki-link.js, the wiki's own rule) is a link the database let through as one: what the database lets
 // through and the wiki does not name (http://, the wiki's home, an unknown topic) stays plain words.
 const counted=body=>[...body.matchAll(new RegExp(WIKI_SQL,'gi'))].map(m=>m.index+m[1].length);
 for(const body of ['See https://www.harvesttycoon.com/wiki/chat#sec-house-rules.','(harvesttycoon.com/wiki/crops) and www.harvesttycoon.com/wiki/buildings#building-bakery!','harvesttycoon.com/wiki/quests?fbclid=x','one\nhttps://harvesttycoon.com/wiki/market#sec-x, two','https://www.harvesttycoon.com/wiki/quests/#level-30'])
  {const links=wikiLinksIn(body);assert.ok(links.length,body);for(const link of links)assert.ok(counted(body).includes(link.index),`${body}: ${link.url}`);}
 for(const body of ['http://harvesttycoon.com/wiki/crops','harvesttycoon.com/wiki','harvesttycoon.com/wiki/nope'])assert.ok(counted(body).length===1&&chatParts(body).every(part=>part.text),body);
 assert.equal(MAX_WIKI_LINKS,2);
 assert.match(sql,/if public\.chat_wiki_links\(body\)<0 then raise exception 'Only links to the Harvest Tycoon wiki are allowed in the chat\.'/);
 assert.match(sql,/if public\.chat_wiki_links\(body\)>2 then raise exception 'Up to 2 wiki links fit in one message\.'/);
 assert.match(sql,/select pg_temp\.chat_links_patch\('public\.chat_send\(text,text\)','chat_wiki_links\(',/,'one function sends in every chat (global, family, private, the Crew)');
 assert.match(sql,/select pg_temp\.chat_links_patch\('public\.chat_mod_edit\(uuid,text\)','chat_wiki_links\(',/,'the staff\'s edit follows the same rule');
 assert.match(sql,/if position\(p_from in def\)=0 then raise exception/,'patched from the live definition, never over an unknown one');
 assert.match(sql,/revoke all on function public\.chat_wiki_links\(text\) from public, anon, authenticated;/);
 const wiki=wikiArticle('chat').html;
 assert.match(wiki,/<li>No links, except to this wiki: at most 2 in one message\.<\/li>/,'the house rules say it');
});

test('a wiki chip opens How to play there, inside the game, with "‹ Chat" back to the same chat; the staff\'s other links stay links',()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/class="chat-wiki" data-wiki-link="\$\{esc\(link\.topic\)\}" data-wiki-section="\$\{esc\(link\.section\)\}">\$\{art\('guide'\)\}<span>\$\{esc\(wikiSectionTitle\(link\.topic,link\.section\)\)\}<\/span><\/button>/,'the book and the spot\'s title, outside translate="no" so it is translated');
 assert.match(ui,/<span translate="no">\$\{m\.sender_staff\?linkify\(part\.text\):esc\(part\.text\)\}<\/span>/,'the words themselves stay as written');
 assert.match(ui,/if\(wiki\)\{openWiki\(wiki\.dataset\.wikiLink,wiki\.dataset\.wikiSection\);return;\}/);
 // The way back is How to play's own (wiki-ui.js renderWiki's from: "‹ Chat" in the jump bar, which stays in view; "‹ Back" after a
 // link inside the wiki), not a second button in the title bar (Oct 2026 merge).
 assert.match(ui,/dialog\.close\(\);\n  win\.harvestWiki\(topic,section,\{from:\{label:'Chat',go:\(\)=>\{doc\.querySelectorAll\('dialog\[open\]'\)\.forEach\(d=>d\.close\(\)\);if\(switchedOff\)return;dialog\.showModal\(\);dialog\.focus\(\{preventScroll:true\}\);show\(tab,\{keepThread:true\}\);\}\}\}\);/,'no new tab, also on CrazyGames and in the app');
 assert.match(read('public/game.js'),/window\.harvestWiki=\(id,anchor='',options=\{\}\)=>\{openDialog\('help-dialog'\);renderWiki\(state,id,anchor,options\);\};/);
 assert.match(read('public/wiki-ui.js'),/trail=from\?\.go\?\[\{label:String\(from\.label\?\?'Back'\),go:from\.go\}\]:\[\]/);
 assert.doesNotMatch(ui+read('public/chat.css'),/wiki-chat-back/,'one way back');
 assert.ok('Chat' in JSON.parse(read('i18n/catalog.json')),'"Chat" is a text the game has already');
});

// 3 Oct 2026: mentions, phase 1 (in the game) and 2 (the push in the farmer's language).
test('typing "@" finds the name being typed; a pick puts "@Full Name " in; only picked names that are still there go along, at most 3',()=>{
 assert.deepEqual(mentionAt('hi @Gen'),{start:3,query:'Gen'});
 assert.deepEqual(mentionAt('@'),{start:0,query:''});
 assert.deepEqual(mentionAt('hi @Gentle Farm 6170'),{start:3,query:'Gentle Farm 6170'},'names have spaces');
 assert.equal(mentionAt('mail me@home'),null,'an @ inside a word is not one');
 assert.equal(mentionAt('hi @abcdefghijklmnopqrstu'),null,'longer than a name');
 assert.deepEqual(mentionAt('hi @Gen and more',7),mentionAt('hi @Gen'),'up to the cursor');
 // 3 Oct 2026 review: after a pick the words that follow are the message, not a search ("No farmers found" after every pick).
 for(const text of ['hi @Anna ','hi @Anna thanks','hi @Anna, thanks','@Anna'])assert.equal(mentionAt(text,undefined,['Bram','Anna']),null,text);
 assert.deepEqual(mentionAt('hi @Annab',undefined,['Anna']),{start:3,query:'Annab'},'another farmer whose name starts the same');
 assert.equal(mentionAt('see you @ home'),null,'no name starts with a space');
 assert.match(read('src/chat-ui.js'),/mentionAt\(input\.value,input\.selectionStart\?\?input\.value\.length,picked\.values\(\)\)/);
 assert.deepEqual(insertMention('hi @Gen',7,3,'Gentle Farm 6170'),{text:'hi @Gentle Farm 6170 ',caret:21});
 assert.deepEqual(insertMention('@Br see you',3,0,'Bram'),{text:'@Bram see you',caret:6},'no second space');
 const picked=new Map([[A,'Anna'],[B,'Bram'],['c','Cor'],['d','Dirk'],['me','Me']]);
 assert.deepEqual(mentionIds('@Anna @Bram @Me',picked,'me'),[A,B],'never yourself');
 assert.deepEqual(mentionIds('@Bram hi',picked),[B],'Anna was taken out of the text');
 assert.equal(mentionIds('@Anna @Bram @Cor @Dirk',picked).length,MAX_MENTIONS);
 const people=[{playerId:'me',username:'Me'},{playerId:A,username:'Anna'},{playerId:A,username:'Anna'},{playerId:B,username:'Bram'},{playerId:'x',username:'Annabel'},{playerId:'blocked',username:'Anne'}];
 assert.deepEqual(mentionMatches(people,'ann',{me:'me',blocked:new Set(['blocked'])}).map(p=>p.playerId),[A,'x'],'any case, you and blocked farmers left out, each once');
 assert.equal(mentionMatches(people,'').length,5);
});

test('a mention marks the message, counts on Global, the chat button and the app icon, and plays the private message\'s sound',()=>{
 assert.equal(mentionsMe({sender:A,meta:{mentions:[{id:B,name:'Bram'}]}},B),true);
 assert.equal(mentionsMe({sender:B,meta:{mentions:[{id:B,name:'Bram'}]}},B),false,'never your own message');
 assert.equal(mentionsMe({sender:A,meta:null},B),false);
 assert.equal(headerCount({notices:1,family:2,dm:3,global:40,mentions:4}),10,'Global\'s own messages still do not count, its mentions do');
 const ui=read('src/chat-ui.js');
 assert.match(ui,/onIcon=\(u\.dm\?\?0\)\+\(u\.family\?\?0\)\+\(u\.mentions\?\?0\)/);
 assert.match(ui,/else if\(name==='global'\)overview\.unread\.global=overview\.unread\.mentions=0;/,'reading Global clears them');
 assert.match(ui,/if\(m\.sender!==me&&\(m\.channel\.startsWith\('dm:'\)\|\|m\.channel==='crew'\|\|forMe\)\)win\.harvestSound\?\.\('message'\);/);
 assert.match(ui,/if\(forMe\)overview\.unread\.mentions=Math\.min\(99,\(overview\.unread\.mentions\?\?0\)\+1\);/);
 assert.match(ui,/\$\{mentionsMe\(m,me\)\?' is-mention':''\}/,'a soft mark on the message');
 assert.match(ui,/class="chat-mention\$\{who\.id===me\?' is-me':''\}" data-profile="\$\{esc\(who\.id\)\}" translate="no">@\$\{esc\(who\.name\)\}<\/button>/,'a chip that opens the profile by id');
 assert.match(read('public/chat.css'),/\.chat-msg\.is-mention\{background:#fff4d6\}/);
});

test('the list: Global and Family only, recent speakers or from 2 letters every farmer, Family its members; said on the box itself',()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/const canMention=\(\)=>\(tab==='global'\|\|\(tab==='family'&&Boolean\(overview\?\.family\)\)\)&&!composeState\(\)\.blocked;/,'not in private chats or the Crew');
 assert.match(ui,/if\(family\)people=await members\(\);\n   else if\(query\.length>=2\)\{try\{people=\(await bridge\.request\(\{operation:'player_search',query\}\)\)\?\.players\?\?\[\];/);
 assert.match(ui,/if\(!family&&query\.length>=2\)pickTimer=setTimeout\(run,300\);/,'a short pause before searching');
 assert.match(ui,/drawPicks\('Mention up to 3 farmers in one message\.'\)/);
 assert.match(ui,/const m=await chat\.send\(name,text,tab==='global'\|\|tab==='family'\?mentionIds\(text,picked,me\):\[\]\);/);
 assert.match(ui,/placeholder:tab==='global'\|\|tab==='family'\?'Type @ to mention a farmer\.':`Message \$\{thread\.otherName\}…`/,'short enough for a phone');
 assert.match(ui,/pickList\.addEventListener\('click',/,'a tap picks on click, so it never lands on a message under the list');
 const wiki=wikiArticle('chat').html;
 assert.match(wiki,/<strong>Mentions<\/strong><p>Type @ in Global or Family and pick a farmer\. A mention reaches them like a private message\.<\/p>/,'one line in the wiki');
});

test('the client sends the ids with the message, and still sends it without them before the database knows mentions',async()=>{
 const calls=[];const make=errorFor=>({rpc:async(name,args)=>{calls.push(args);return 'p_mentions' in args&&errorFor?{data:null,error:errorFor}:{data:{id:'m',args},error:null};}});
 let client=createChatClient(make(null),{playerId:'me'});
 assert.deepEqual((await client.send('global','hi @Bram',[B])).args,{p_channel:'global',p_body:'hi @Bram',p_mentions:[B]});
 assert.deepEqual((await client.send('global','hi')).args,{p_channel:'global',p_body:'hi'},'no mentions: the call as before');
 client=createChatClient(make({code:'PGRST202',message:'Could not find the function'}),{playerId:'me'});
 assert.deepEqual((await client.send('global','hi @Bram',[B])).args,{p_channel:'global',p_body:'hi @Bram'});
 client=createChatClient(make({code:'54000',message:'You can mention up to 10 farmers an hour.'}),{playerId:'me'});
 await assert.rejects(client.send('global','hi @Bram',[B]),/You can mention up to 10 farmers an hour\./,'a limit says why');
});

test('the database: mentions checked before the message is stored, limits, members only, a push like a private message, the count',()=>{
 const sql=read('supabase/chat-mentions.sql');
 assert.match(sql,/create or replace function public\.chat_send\(p_channel text, p_body text, p_mentions uuid\[\]\) returns jsonb language plpgsql set search_path to ''/,'a second function: chat_send\(text,text\) stays as it is');
 assert.doesNotMatch(sql,/drop function[^;]*chat_send/);
 assert.match(sql,/result:=public\.chat_send\(p_channel,p_body\);/,'every rule of sending still holds');
 assert.match(sql,/if new\.sender is distinct from \(select auth\.uid\(\)\) or coalesce\(new\.kind,'message'\)<>'message' then return new; end if;/);
 assert.match(sql,/if cardinality\(ids\)>3 then raise exception 'Mention up to 3 farmers in one message\.'/);
 assert.match(sql,/position\('@'\|\|whose in new\.body\)=0/,'the name of now must be in the words');
 assert.match(sql,/continue when new\.channel like 'family:%' and not exists\(select 1 from public\.family_members m where m\.player_id=who/,'in Family only its members');
 assert.match(sql,/if seen>10 then raise exception 'You can mention up to 10 farmers an hour\.'/);
 assert.match(sql,/create trigger chat_mentions_tag before insert on public\.chat_messages for each row when \(new\.channel='global' or new\.channel like 'family:%'\)/,'never in a private chat or the Crew');
 const push=sql.slice(sql.indexOf('create or replace function public.chat_mention_push'));
 for(const rule of ['x.push_messages','b.blocked_id=new.sender',"r.last_read_at>now()-interval '2 minutes'","s.pushed_at<now()-interval '3 minutes'",'public.app_push_players a where a.player_id=t.id and a.enabled','exception when others then return null;'])assert.ok(push.includes(rule),rule);
 assert.match(sql,/m\.meta->'mentions' @> jsonb_build_array\(jsonb_build_object\('id',me\)\)\n    and not exists\(select 1 from public\.chat_blocks b where b\.player_id=me and b\.blocked_id=m\.sender\)/,'the count leaves out blocked farmers');
 assert.match(sql,/return jsonb_build_object\('kind','mention','senderName',m\.sender_name/);
 assert.match(sql,/revoke all on function public\.chat_mention_push\(\) from public, anon, authenticated;/);
 assert.match(sql,/grant execute on function public\.chat_send\(text,text,uuid\[\]\) to authenticated;/);
});

test('the push: one title per language, "Bram mentioned you" for a mention, "Message from Bram" in the farmer\'s language for a private message',()=>{
 for(const code of MAIL_LANGUAGES){const t=textsFor(code);assert.ok(t.pushMention('Bram').includes('Bram')&&t.pushMessage('Bram').includes('Bram'),code);}
 const claim={kind:'mention',senderName:'Bram',body:'@Anna look',channel:'global',subscriptions:[{endpoint:'e1',p256dh:'k',auth:'a',player:A},{endpoint:'e2',p256dh:'k',auth:'a',player:B},{endpoint:'e3',p256dh:'k',auth:'a',player:'c'}]};
 const pushes=messagePushes(claim,[A,B,'c'],new Map([[A,'nl'],[B,'de']]));
 assert.deepEqual(pushes.map(p=>[p.language,p.title,p.players,p.subscriptions.map(s=>s.endpoint)]),[['nl','Bram noemde je',[A],['e1']],['de','Bram hat dich erwähnt',[B],['e2']],['en','Bram mentioned you',['c'],['e3']]]);
 assert.deepEqual(Object.keys(pushes[0]).sort(),['body','language','players','subscriptions','tag','title','url']);
 assert.equal(pushes[0].url,'/?open=chat&channel=global');assert.equal(pushes[0].tag,'chat-global');assert.deepEqual(pushes[0].subscriptions[0],{endpoint:'e1',p256dh:'k',auth:'a'});
 const dm=messagePushes({senderName:'Bram',body:'hoi',channel:`dm:${A}:${B}`,subscriptions:[{endpoint:'e1',p256dh:'k',auth:'a'}]},[A],new Map([[A,'nl']]));
 assert.deepEqual(dm.map(p=>[p.title,p.subscriptions.length]),[['Bericht van Bram',1]],'an older answer without the farmer: its one farmer');
 assert.equal(messagePushes({senderName:'Bram (Crew)',channel:'crew',subscriptions:[]},[A],new Map())[0].title,'Message from Bram (Crew)');
 const index=read('supabase/functions/notify-hourly/index.ts');
 assert.match(index,/for\(const \{language,players:who,subscriptions,\.\.\.push\} of messagePushes\(claim,players,await db\.languagesOf\(players\)\)\)\{/);
 assert.doesNotMatch(index,/Message from \$\{/,'no English title left in the function');
 assert.match(index,/admin\.from\('player_seen'\)\.select\('player_id,language'\)\.in\('player_id',players\.slice\(0,500\)\)/);
});

test('Settings: the private messages switch is the mentions switch too, and says so',()=>{
 const html=read('public/farm.html');
 assert.match(html,/<strong>Private messages and mentions<\/strong><small>When a farmer sends you a private message or mentions you in the chat, and you are not in the game\. At most one every few minutes per chat\.<\/small><\/span><input id="notify-messages"/);
 assert.doesNotMatch(html,/New private message/);
});
