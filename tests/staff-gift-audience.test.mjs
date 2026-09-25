import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GIFT_AUDIENCES,giftCount,giftMatches,giftLabel,playerDetail,GUIDE_STEPS} from '../src/admin-players.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,25,12),iso=ms=>new Date(ms).toISOString();

// 25 Sep 2026: the staff gift goes to everyone, the farmers active this week, the farmers online now or one farmer; the daily room
// (5 gifts, 50 diamonds, 500 coins for all staff together) stays.
test('who a gift reaches: the same rules as the database, for the counts on the button',()=>{
 assert.deepEqual(GIFT_AUDIENCES.map(([id])=>id),['all','active','online','player']);
 const players=[{playerId:'a',username:'Anna',level:20,online:true,lastActiveAt:iso(now-60000)},{playerId:'b',username:'Bram',level:5,online:false,lastActiveAt:iso(now-3*86400000)},
  {playerId:'c',username:'Anna',level:3,online:false,lastActiveAt:iso(now-9*86400000)},{playerId:'d',username:'Dewi',level:1,online:false,lastActiveAt:null}];
 assert.equal(giftCount(players,'all',now),4);assert.equal(giftCount(players,'active',now),2);assert.equal(giftCount(players,'online',now),1);assert.equal(giftCount(players,'player',now),1);
 assert.deepEqual(giftMatches(players,'ann').map(p=>[p.playerId,p.level]),[['a',20],['c',3]],'two farmers with the same name, told apart by level, most recent first');
 assert.deepEqual(giftMatches(players,'  '),[]);
 assert.equal(giftLabel('all'),'Send to everyone');assert.equal(giftLabel('active',{count:345}),'Send to 345 farmers active this week');
 assert.equal(giftLabel('online',{count:1}),'Send to 1 farmer online now');assert.equal(giftLabel('player'),'Choose a farmer first');assert.equal(giftLabel('player',{player:players[1]}),'Send to Bram');
 assert.match(playerDetail({playerId:'b',username:'Bram',level:5,activity:[],earned:{},events:{},chat:{},invites:{}},{guideSteps:GUIDE_STEPS,now}),/data-gift-player="b">Send a gift<\/button>/,'a gift from a farmer\'s own page');
});
test('the database fixes who gets it when it is sent, keeps the daily room, and a farm only picks up its own gifts',()=>{
 const sql=read('supabase/staff-gift-audience.sql');
 assert.match(sql,/when 'active' then array\(select s\.player_id from public\.player_stats s where s\.last_active_at>now\(\)-interval '7 days'\)/);
 assert.match(sql,/when 'online' then array\(select s\.player_id from public\.player_stats s where s\.last_active_at>now\(\)-interval '30 minutes'\)/);
 assert.match(sql,/if n>=5 then raise exception 'Today''s 5 gifts have been sent\. Try again tomorrow\.'/);assert.match(sql,/if c\+p_coins>500 or d\+p_diamonds>50 then/);
 assert.match(sql,/if public\.chat_staff_role\(me\) is null then raise exception 'Not authorized\.'/,'the moderators and the admin');
 assert.match(sql,/else insert into public\.player_notices\(player_id,kind,body\) select f,'donation',note from unnest\(farmers\) f; end if;/,'only they see the notice');
 assert.match(sql,/drop function if exists public\.staff_donate\(integer,integer,text\);/,'one function, so an older open game still sends to everyone');
 assert.match(read('supabase/functions/farm-api/index.ts'),/\.or\(`recipients\.is\.null,recipients\.cs\.\{\$\{user\.id\}\}`\)/);
 assert.match(read('src/chat-client.js'),/donate:\(coins,diamonds,message,audience='all',player=null\)=>rpc\('staff_donate',\{p_coins:coins,p_diamonds:diamonds,p_message:message,p_audience:audience,p_player:player\}\)/);
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/bridge\.chat\.donate\(coins,diamonds,message\|\|null,gift\.audience,gift\.audience==='player'\?gift\.player\.playerId:null\)/,'one farmer by id: names are not unique');
});
