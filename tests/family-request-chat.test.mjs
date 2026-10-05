import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {messageLayout} from '../src/chat-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('a request for goods writes a card into the family chat, and marks it given when a farmer fills it',()=>{
 const sql=read('supabase/family-request-chat.sql');
 assert.match(sql,/add column if not exists kind text not null default 'message'/);
 assert.match(sql,/check \(kind in \('message','request'\)\)/);
 assert.match(sql,/create trigger family_request_chat after insert on public\.family_social_requests/);
 assert.match(sql,/create trigger family_request_chat_given after update of fulfilled_by on public\.family_social_requests/);
 assert.match(sql,/'family:'\|\|new\.family_id::text/);
 assert.equal((sql.match(/exception when others then return new;/g)??[]).length,2,'a problem with the card never stops the request');
});

test('a request card stands on its own in the chat: it never folds into the messages around it',()=>{
 const at=minute=>new Date(Date.UTC(2026,8,29,10,minute)).toISOString();
 const shown=[{sender:'a',created_at:at(3)},{sender:'a',kind:'request',created_at:at(2)},{sender:'a',created_at:at(1)}];
 assert.deepEqual(messageLayout(shown).map(x=>x.cont),[false,false,false]);
 assert.deepEqual(messageLayout([{sender:'a',created_at:at(2)},{sender:'a',created_at:at(1)}]).map(x=>x.cont),[false,true]);
});

test('the card: the family icon, the good\'s picture, a Give button for the others, and the chat still works before the SQL runs',()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/if\(m\.kind==='request'\)return requestRow\(m\);/);
 assert.match(ui,/art\('family-members'\)\}Family request/);
 assert.match(ui,/art\(r\.item\)/);
 assert.match(ui,/action:\{kind:'fulfill',request:button\.dataset\.give\}/);
 assert.match(ui,/await win\.harvestRefresh\?\.\(\)/);
 assert.match(read('public/game.js'),/window\.harvestStock=key=>Number\(state\.inventory\?\.\[key\]\)\|\|0;/);
 const client=read('src/chat-client.js');
 assert.match(client,/const CARD_COLUMNS=`\$\{MESSAGE_COLUMNS\},kind,meta`/);
 assert.match(client,/if\(first\.error\?\.code==='42703'\)cards=false;/,'without the new columns the chat reads the old ones');
});

test('a new rank in the family writes a card with the rank\'s badge; joining another family or leaving does not',()=>{
 const sql=read('supabase/family-rank-chat.sql');
 assert.match(sql,/check \(kind in \('message','request','rank','top','join','kick','chest'\)\)/);
 assert.match(sql,/after update of role on public\.family_members for each row\s+when \(old\.role is distinct from new\.role and old\.family_id=new\.family_id and old\.left_at is null and new\.left_at is null\)/);
 assert.match(sql,/jsonb_build_object\('from',old\.role,'to',new\.role\)/);
 assert.match(sql,/exception when others then return new;/);
 const ui=read('src/chat-ui.js');
 assert.match(ui,/if\(m\.kind==='rank'\)return rankRow\(m\);/);
 assert.match(ui,/art\(`family-rank-\$\{RANK_ORDER\[to\]\?to:'member'\}`\)/);
 assert.match(ui,/\$\{up\?'Promoted':'Demoted'\}/);
 const at=minute=>new Date(Date.UTC(2026,8,29,10,minute)).toISOString();
 assert.deepEqual(messageLayout([{sender:'a',created_at:at(2)},{sender:'a',kind:'rank',created_at:at(1)}]).map(x=>x.cont),[false,false]);
});

test('a new top farmer is checked once an hour and gets a card; the first run only writes down who is on top',()=>{
 const sql=read('supabase/family-top-chat.sql');
 assert.match(sql,/select cron\.schedule\('harvest-family-top','35 \* \* \* \*','select public\.family_top_check\(\)'\);/,'once an hour');
 assert.match(sql,/order by cp\.family_id, cp\.points desc, cp\.player_id::text/,'the game\'s rule: most points, a tie to the lowest player ID');
 assert.match(sql,/m\.left_at is null/);assert.match(sql,/cp\.points>0/);
 assert.match(sql,/if found and \(prev\.week<>wk or prev\.player_id<>r\.player_id\) then/,'a card only when it changed, never on the first run');
 assert.match(sql,/floor\(\(extract\(epoch from now\(\)\)\*1000-4\*86400000\)\/\(7\*86400000\)\)/,'the game\'s week (familyWeek)');
 const ui=read('src/chat-ui.js');
 assert.match(ui,/if\(m\.kind==='top'\)return topRow\(m\);/);
 assert.match(ui,/art\('family-rank-top'\)/);
 for(const file of ['supabase/family-rank-chat.sql','supabase/family-top-chat.sql'])assert.match(read(file),/check \(kind in \('message','request','rank','top','join','kick','chest'\)\)/,`${file}: the same kinds, whichever runs last`);
});

test('a new member of the family gets a card with the member badge; the founder and farmers already in it do not',()=>{
 const sql=read('supabase/family-join-chat.sql');
 assert.match(sql,/create trigger family_join_chat after insert or update on public\.family_members/);
 assert.match(sql,/if new\.left_at is not null or new\.role<>'member' then return new; end if;/,'not the founder, who starts as leader');
 assert.match(sql,/if tg_op='UPDATE' and old\.family_id is not distinct from new\.family_id and old\.left_at is null then return new; end if;/,'not a farmer who was already in');
 assert.match(sql,/exception when others then return new;/);
 const ui=read('src/chat-ui.js');
 assert.match(ui,/if\(m\.kind==='join'\)return joinRow\(m\);/);
 assert.match(ui,/art\('family-rank-member'\)/);
 for(const file of ['supabase/family-rank-chat.sql','supabase/family-top-chat.sql','supabase/family-join-chat.sql','supabase/family-kick-chat.sql'])assert.match(read(file),/check \(kind in \('message','request','rank','top','join','kick','chest'\)\)/,`${file}: the same kinds, whichever runs last`);
});

test('a farmer removed from the family gets a grey card with their old rank and who removed them, written by farm-api',()=>{
 const service=read('supabase/functions/farm-api/family-service.js');
 assert.match(service,/if\(writeFarm&&body\.action\.type==='family_kick'\)\{/,'only after a removal that went through');
 assert.match(service,/kind:'kick',meta:\{role:target\.role,by:username,by_id:player\}/);
 assert.match(service,/globalThis\.EdgeRuntime\?\.waitUntil\?\.\(card\)/,'beside the reply, never in its way');
 const ui=read('src/chat-ui.js');
 assert.match(ui,/if\(m\.kind==='kick'\)return kickRow\(m\);/);
 assert.match(ui,/was removed from the family\./);
});
