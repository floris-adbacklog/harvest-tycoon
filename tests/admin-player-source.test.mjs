import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {farmerSource} from '../supabase/functions/farm-api/admin-analytics-service.js';
import {playerDetail,sourceLabel} from '../src/admin-players.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 29 Oct 2026 (the owner): a farmer's source on their own page in Admin, named as Growth names it (admin_source_stats).
test('one farmer\'s source follows Growth\'s first-touch order',()=>{
 const a={src:null,utm_source:null,utm_medium:null,utm_campaign:null,utm_content:null,referrer_host:null,has_fbclid:false,has_ttclid:false,has_gclid:false,in_app:null,landing_path:'/',created_at:'2026-10-29T05:00:00Z'};
 assert.equal(farmerSource({...a,src:'meta-retarget',utm_source:'meta',has_fbclid:true}).key,'src:meta-retarget','our own link first');
 assert.equal(farmerSource({...a,utm_source:'Meta'},'abc').key,'partner:abc','then a partner');
 assert.equal(farmerSource({...a,utm_source:'meta'},null,true).key,'invite','then a friend');
 assert.equal(farmerSource({...a,utm_source:'Meta',utm_campaign:'retarget',has_fbclid:true}).key,'utm:meta / retarget','then utm, lower case, with the campaign');
 assert.equal(farmerSource({...a,has_ttclid:true,referrer_host:'tiktok.com'}).key,'ad:tiktok');
 assert.equal(farmerSource({...a,referrer_host:'reddit.com'}).key,'site:reddit.com');
 assert.equal(farmerSource(a).key,'direct');
 assert.deepEqual(farmerSource(null),{key:'unknown'});
 // The same order as the SQL Growth reads.
 const sql=read('supabase/player-attribution.sql');
 assert.match(sql,/coalesce\('src:'\|\|a\.src, 'partner:'\|\|pr\.code, case when r\.invitee_id is not null then 'invite' end,/);
});

test('the farmer\'s page shows it to the admin only, with Growth\'s name',()=>{
 const base={playerId:'00000000-0000-0000-0000-000000000001',username:'Tess',createdAt:'2026-10-20T10:00:00Z',everPlayed:true,guide:3,guideTotal:10,activity:[],events:{joined:0,finished:0,diamonds:0},
  chat:{messages:0,reported:0,muted:false,banned:false},invites:{invitedBy:null,friends:0,qualified:0,closed:false},earned:{coins:0,diamonds:0},level:12,xp:1,coins:1,diamonds:1};
 const html=playerDetail({...base,source:{key:'src:meta-retarget',utm:{source:'meta',medium:'paid',campaign:'retarget',content:null},referrer:null,landing:'/',inApp:'instagram',clicks:['fbclid']}});
 assert.match(html,/Came from/);assert.match(html,new RegExp(sourceLabel('src:meta-retarget').label));assert.match(html,/utm meta \/ paid \/ retarget \/ –/);assert.match(html,/in the instagram app/);
 assert.doesNotMatch(playerDetail(base),/Came from/,'a moderator gets no source');
 assert.doesNotMatch(read('supabase/functions/farm-api/admin-analytics-service.js').match(/source:farmerSource[^\n]*/)[0],/owner/,'it sits inside the admin-only part');
 assert.match(read('supabase/functions/farm-api/admin-analytics-service.js'),/owner\?quiet\(admin\.from\('player_attribution'\)/);
});
