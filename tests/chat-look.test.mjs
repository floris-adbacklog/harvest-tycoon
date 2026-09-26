import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {messageLayout,dayLabel} from '../src/chat-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=new Date(2026,8,26,15,0).getTime(),minutes=n=>new Date(now-n*60000).toISOString();
const msg=(id,sender,ago)=>({id,sender,created_at:minutes(ago)});

test('messages in a row from one farmer (at most 10 minutes apart, the same day) share one name; each day starts with a divider',()=>{
 const shown=[msg('a','boer',2),msg('b','boer',5),msg('c','boer',11),msg('d','boer',30),msg('e','anna',31),msg('f','anna',60*20),msg('g','anna',60*20+3)];
 assert.deepEqual(messageLayout(shown).map(({m,day,cont})=>`${m.id}:${day?'day':''}${cont?'cont':''}`),
  ['a:day','b:cont','c:cont','d:','e:','f:day','g:cont'],'d is 19 minutes older than c: a new group; f is yesterday: a new day');
 assert.equal(dayLabel(minutes(2),now),'Today');assert.equal(dayLabel(minutes(60*20),now),'Yesterday');
 assert.match(dayLabel(minutes(60*50),now),/^Thu 24 Sept?$/);
});
test('a second message in a row shows only its text (the name stays for a screen reader), and every row keeps the room of the menu, so the times line up',()=>{
 const ui=read('src/chat-ui.js'),css=read('public/chat.css');
 assert.match(ui,/<li class="chat-msg is-cont\$\{mine\?' is-mine':''\}" data-id="\$\{esc\(m\.id\)\}"><span aria-hidden="true"><\/span><div class="chat-msg-main"><p class="chat-text" title="\$\{esc\(exact\(m\.created_at\)\)\}"><span class="chat-sr">\$\{esc\(m\.sender_name\)\}: <\/span>/);
 assert.match(ui,/<li class="chat-day" role="separator"><span>\$\{esc\(dayLabel\(m\.created_at\)\)\}<\/span><\/li>/);
 assert.match(ui,/:'<span class="chat-more-space" aria-hidden="true"><\/span>';/);
 assert.match(css,/\.chat-more-space\{flex-shrink:0;width:28px;margin-right:-4px\}/);assert.match(css,/\.chat-more\{width:32px;height:28px\}\.chat-more-space\{width:32px\}/,'the same width as the menu button on smaller screens');
 assert.match(css,/\.chat-msg:has\(\+ \.chat-msg\.is-cont\)\{padding-bottom:4px;border-bottom-left-radius:0;border-bottom-right-radius:0\}/,'one block for a group');
});
test('on a phone a long press opens the menu of a message (no "•••" on every message), and the menu can copy the text',()=>{
 const ui=read('src/chat-ui.js'),css=read('public/chat.css');
 assert.match(ui,/pressTimer=setTimeout\(\(\)=>\{pressTimer=null;pressed=true;openMenu\(row\);win\.navigator\?\.vibrate\?\.\(10\);\},500\);/);
 assert.match(ui,/if\(event\.pointerType!=='touch'\)return;/,'a mouse keeps the button');
 assert.match(ui,/Math\.hypot\(event\.clientX-pressStart\.x,event\.clientY-pressStart\.y\)>10\)endPress\(\)/,'scrolling is not a long press');
 assert.match(ui,/if\(pressed\)\{pressed=false;return;\}/,'the tap that ends it does nothing more');
 assert.match(ui,/if\(touch\(\)\)items\.push\(\['copy','Copy text'\]\);/);assert.match(ui,/key==='copy'\)\{await win\.navigator\.clipboard\.writeText\(m\.body\);note\('Copied\.'\)/);
 assert.match(css,/@media\(pointer:coarse\)\{\.chat-more-space\{display:none\}\.chat-more,\.chat-msg\.is-cont>\.chat-more\{position:absolute;width:1px;height:1px;/,'hidden but still there for a screen reader');
});
