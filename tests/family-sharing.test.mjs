import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITEMS} from '../public/farm-state.js';
import {sharingMessage,MAX_SHARE} from '../public/social-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The newest definition of harvest_social; the item-name check on requests was added in family-sharing-all-items.sql.
const sql=read('supabase/midgame-wave1.sql'),constraintSql=read('supabase/family-sharing-all-items.sql');

test('the server accepts exactly the game\'s crops and goods, so a new item needs both lists updated',()=>{
 const list=sql.match(/items constant text\[\]:=array\[([^\]]+)\]/)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 assert.deepEqual(list,Object.keys(ITEMS));
});
test('gifts and requests are 1–5 of any of them; the daily limits and the old 3-wheat gift stay',()=>{
 assert.equal(MAX_SHARE,5);
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
 assert.match(ui,/const keys=Object\.keys\(ITEMS\)\.filter\(k=>itemAvailable\(state,k\)\)/);
 assert.match(ui,/const giftKeys=\(\)=>Object\.keys\(ITEMS\)\.filter\(k=>stock\(k\)>0\)/,'you can only give what you have');
});
