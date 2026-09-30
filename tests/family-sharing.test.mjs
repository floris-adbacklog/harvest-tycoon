import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITEMS} from '../public/farm-state.js';
import {sharingMessage,maxShare,helpCoins} from '../public/social-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The newest definition of harvest_social; the item-name check on requests was added in family-sharing-all-items.sql.
const sql=read('supabase/pig-farm.sql'),constraintSql=read('supabase/family-sharing-all-items.sql');

test('the server accepts exactly the game\'s crops and goods, so a new item needs both lists updated',()=>{
 const list=sql.match(/items constant text\[\]:=array\[([^\]]+)\]/)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 assert.deepEqual(list,Object.keys(ITEMS).filter(k=>!ITEMS[k].heirloom&&ITEMS[k].world!==2),'heirlooms (the Seed Lab, 27 Sep 2026) and World II goods (30 Sep 2026) are not shared');
});
test('gifts and requests are 1–5 of any of them; the daily limits and the old 3-wheat gift stay',()=>{
 assert.deepEqual([10,19,20,30,60].map(maxShare),[5,5,10,15,30],'up to 5 per 10 levels (26 Sep 2026)');assert.deepEqual([10,11,30,60].map(helpCoins),[250,275,750,1500],'help: level × 25 coins');
 assert.match(sql,/if item is null or not \(item=any\(items\)\) or quantity is null or quantity not between 1 and 5 then raise exception 'Ask for 1–5 of a crop or good\.';/);
 assert.match(sql,/item:=coalesce\(p_action->>'item','wheat'\);quantity:=coalesce\(\(p_action->>'quantity'\)::integer,3\);/,'an older store without an item still sends 3 wheat');
 assert.match(sql,/kind=social\.kind\)>=3 or \(select count\(\*\) from public\.family_social_actions where recipient=social\.recipient and day=d and kind=social\.kind\)>=3/,'3 sent and 3 received a day, unchanged');
 assert.match(sql,/level>=10\) then raise exception 'Daily sharing opens at level 10, after 48 hours on your farm and 24 hours in your family\.'/);
 assert.match(constraintSql,/check \(item ~ '\^\[a-z\]\{2,24\}\$'\)/);
});
test('the toast names what moved, with the item\'s own name',()=>{
 const name=id=>({m1:'Anna'})[id];
 assert.equal(sharingMessage({kind:'gift',item:'bread',quantity:4},{kind:'gift',recipient:'m1'},name),'You sent 4 Fresh bread to Anna.');
 assert.equal(sharingMessage({item:'berrytart',quantity:2},{kind:'request'}),`Your family can see your request for 2 ${ITEMS.berrytart.name}.`);
 assert.equal(sharingMessage({item:'corn',quantity:3},{kind:'fulfill'}),'You gave 3 Corn. Your family thanks you!');
 assert.equal(sharingMessage({message:'You helped with 5 coins. Thank you!'},{kind:'help'}),'You helped with 5 coins. Thank you!');
});
test('a gift sends the chosen item and amount; the request list is every crop or good you have unlocked',()=>{
 const ui=read('public/social-ui.js');
 assert.match(ui,/act\(\{kind:'gift',recipient:gift\.to,item:gift\.item,quantity:gift\.quantity\}\)/);
 assert.match(ui,/const keys=Object\.keys\(ITEMS\)\.filter\(k=>itemAvailable\(state,k\)&&!ITEMS\[k\]\.heirloom&&!worldTwoItem\(k\)\)/);
 assert.match(ui,/const giftKeys=\(\)=>Object\.keys\(ITEMS\)\.filter\(k=>stock\(k\)>0&&!ITEMS\[k\]\.heirloom&&!worldTwoItem\(k\)\)/,'you can only give what you have, and never World II goods');
});

// 30 Sep 2026: a request fills up from several farmers ("Give what you have"), supabase/family-sharing-partial.sql.
test('a family request fills up together: each gives what they have, the card and the list show how full it is',()=>{
 const sql=read('supabase/family-sharing-partial.sql');
 assert.match(sql,/add column if not exists given integer not null default 0/);assert.match(sql,/add column if not exists helpers uuid\[\] not null default '\{\}'/);
 assert.match(sql,/quantity:=r\.quantity-r\.given;/,'only what is still needed');
 assert.match(sql,/quantity:=least\(quantity,coalesce\(\(actor\.state#>>array\[''inventory'',item\]\)::integer,0\)\)/,'what the giver has');
 assert.match(sql,/fulfilled_by=case when r\.given\+gave>=r\.quantity then p_player end/,'fulfilled once full');
 assert.match(sql,/if definition=before then raise exception 'harvest_social: change % did not find its line', i;/,'built on the live function, loudly');
 assert.match(sql,/create trigger family_request_chat_given after update of fulfilled_by, given on public\.family_social_requests/);
 assert.equal(sharingMessage({item:'corn',quantity:3,given:3,needed:10},{kind:'fulfill'}),'You gave 3 Corn. 3 of 10 are in.');
 assert.equal(sharingMessage({item:'corn',quantity:2,given:10,needed:10},{kind:'fulfill'}),'You gave 2 Corn. Your family thanks you!');
 const ui=read('public/social-ui.js');assert.match(ui,/give=Math\.min\(have,left\)/);assert.match(ui,/\$\{give<1\?'You have none':`Give \$\{give\}`\}/);assert.match(ui,/class="sharing-progress"/);
 const chat=read('src/chat-ui.js');assert.match(chat,/give_=known\?Math\.min\(have,left\):left/);assert.match(chat,/`\$\{filled\} of \$\{qty\} in/);assert.match(chat,/if\(full\)card\?\.classList\.add\('is-given'\)/);
});
