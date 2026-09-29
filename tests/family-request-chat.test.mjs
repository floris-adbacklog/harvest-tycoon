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
