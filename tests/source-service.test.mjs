import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanSource,recordSource} from '../supabase/functions/farm-api/source-service.js';
import {readSource} from '../src/source-link.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 2 Oct 2026: farm-api records once, for a brand-new farm, how the farmer found the game (supabase/player-attribution.sql).
function db(tables={}){
 const calls=[];
 return {calls,tables,from(table){
  const q={table};calls.push(q);
  return {upsert(row,opts){q.row=row;q.opts=opts;if(!(tables[table]??=[]).some(r=>r.player_id===row.player_id))tables[table].push(row);return Promise.resolve({error:null});}};
 }};
}
const headers=agent=>({get:name=>name==='user-agent'?agent:null});
const ANDROID_FB='Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/484.0.0.66.73;]';

test('cleanSource checks every field again and keeps the click ids as yes or no; anything else is left out',()=>{
 const empty={src:null,utm_source:null,utm_medium:null,utm_campaign:null,utm_content:null,referrer_host:null,has_fbclid:false,has_ttclid:false,has_gclid:false,in_app:null,landing_path:null};
 assert.deepEqual(cleanSource(undefined),empty);assert.deepEqual(cleanSource('src'),empty);assert.deepEqual(cleanSource([1]),empty);
 assert.deepEqual(cleanSource({src:'reddit-cozygames',utm_source:'facebook',utm_medium:'paid',utm_campaign:'EU autumn | cozy',utm_content:'video_2',ref:'reddit.com',fb:true,tt:true,g:true,via:'instagram',lp:'/es/'}),
  {src:'reddit-cozygames',utm_source:'facebook',utm_medium:'paid',utm_campaign:'EU autumn | cozy',utm_content:'video_2',referrer_host:'reddit.com',has_fbclid:true,has_ttclid:true,has_gclid:true,in_app:'instagram',landing_path:'/es/'});
 const junk=cleanSource({src:'Reddit<x>',utm_source:'<script>',utm_campaign:'a'.repeat(101),ref:'https://reddit.com/r/x',fb:'IwAR123',tt:1,g:'yes',via:'snapchat',lp:'https://evil.example/',extra:'x'});
 assert.deepEqual(junk,empty,'never the click id itself, never a full address');
 assert.ok(!('extra' in junk));
 // What the sign-in page reads is exactly what the server keeps.
 const page=readSource({href:'https://www.harvesttycoon.com/?src=reddit-cozygames&utm_source=tiktok&utm_campaign=eu&ttclid=E.C.P',pathname:'/',referrer:'https://www.reddit.com/r/x'});
 assert.deepEqual(cleanSource(page),{...empty,src:'reddit-cozygames',utm_source:'tiktok',utm_campaign:'eu',referrer_host:'reddit.com',has_ttclid:true,landing_path:'/'});
});
test('recordSource writes one row per farmer with the language and the device; the first record stays',async()=>{
 const a=db(),now=Date.UTC(2026,9,2,10);
 const row=await recordSource({admin:a,player:'f1',source:{src:'reddit-cozygames',lp:'/'},headers:headers(ANDROID_FB),language:'nl',now});
 assert.deepEqual(a.calls[0].opts,{onConflict:'player_id',ignoreDuplicates:true});
 assert.equal(row.device,'Android phone · Facebook app');assert.equal(row.language,'nl');assert.equal(row.created_at,'2026-10-02T10:00:00.000Z');assert.equal(row.src,'reddit-cozygames');
 await recordSource({admin:a,player:'f1',source:{src:'other'},headers:headers(''),language:'en',now:now+1000});
 assert.equal(a.tables.player_attribution.length,1);assert.equal(a.tables.player_attribution[0].src,'reddit-cozygames','the first touch stays');
 const direct=await recordSource({admin:db(),player:'f2',source:{},headers:headers(''),language:'English'});
 assert.equal(direct.language,null);assert.equal(direct.device,null);assert.equal(direct.src,null,'an empty source is still recorded: Direct');
 const none=db();assert.equal(await recordSource({admin:none,player:'f3',source:undefined,headers:headers('')}),null);assert.equal(none.calls.length,0,'an old game tab that sends nothing: no record ("Not recorded")');
 const failing={from:()=>({upsert:async()=>({error:{code:'42P01'}})})};
 await assert.rejects(recordSource({admin:failing,player:'f4',source:{},headers:headers('')}),e=>e.code==='42P01');
});
test('farm-api records it only where a brand-new farm is made, beside the load, and never in the farm\'s way',()=>{
 const index=read('supabase/functions/farm-api/index.ts');
 assert.match(index,/import \{recordSource\} from '\.\/source-service\.js';/);
 const call="later(recordSource({admin,player:user.id,source:body.source??user.user_metadata?.source,headers:req.headers,language:body.language,now}).catch(";
 assert.equal(index.split(call).length,2,'once');
 const branch=index.slice(index.indexOf('if(!row){'),index.indexOf("admin.rpc('harvest_commit_farm'"));
 assert.ok(branch.includes(call),'inside the new-farm branch, before the farm is committed');
 assert.ok(branch.indexOf('else{const invite=await linkInvite(')<branch.indexOf(call),'in the else branch: a farm with earlier progress (profile) is no new farmer');
});
test('the table and the admin function: locked to farm-api, one source per farmer, test payments left out',()=>{
 const sql=read('supabase/player-attribution.sql');
 assert.match(sql,/create table if not exists public\.player_attribution \(\n player_id uuid primary key references auth\.users\(id\) on delete cascade,/);
 assert.match(sql,/src text check \(src ~ '\^\[a-z0-9\]\[a-z0-9_\.-\]\{0,47\}\$'\)/,'the same tag rule as src/source-link.js');
 for(const column of ['utm_source','utm_medium','utm_campaign','utm_content'])assert.match(sql,new RegExp(`${column} text check \\(char_length\\(${column}\\)<=100\\)`),column);
 assert.match(sql,/has_fbclid boolean not null default false,\n has_ttclid boolean not null default false,\n has_gclid boolean not null default false,/,'click ids only as yes or no');
 assert.doesNotMatch(sql,/fbclid text|ttclid text|gclid text|\bip\b/,'never the click id or the IP address');
 assert.match(sql,/alter table public\.player_attribution enable row level security;\nrevoke all on public\.player_attribution from anon, authenticated;/);
 assert.match(sql,/create or replace function public\.admin_source_stats\(p_since timestamptz\)[^]*?language sql stable security definer set search_path to '' as \$f\$/);
 assert.match(sql,/revoke all on function public\.admin_source_stats\(timestamptz\) from public, anon, authenticated;\ngrant execute on function public\.admin_source_stats\(timestamptz\) to service_role;/);
 assert.match(sql,/coalesce\('src:'\|\|a\.src, 'partner:'\|\|pr\.code, case when r\.invitee_id is not null then 'invite' end,\n    'utm:'\|\|lower\(a\.utm_source\)\|\|coalesce\(' \/ '\|\|a\.utm_campaign,''\),\n    case when a\.has_fbclid then 'ad:meta' when a\.has_ttclid then 'ad:tiktok' when a\.has_gclid then 'ad:google' end,\n    'site:'\|\|a\.referrer_host,\n    case when a\.player_id is not null then 'direct' end,\n    'unknown'\) as source/,'our tag, partner, invite, utm, ad click, website, Direct, else not recorded');
 assert.match(sql,/from public\.harvest_purchases h where h\.livemode group by h\.player_id/,'test payments do not count');
 assert.match(sql,/coalesce\(u\.is_anonymous,false\)=false\n   and not exists\(select 1 from public\.partners p where p\.user_id=u\.id and not exists\(select 1 from public\.player_farms f where f\.player_id=u\.id\)\)/,'real accounts, as admin_auth_signups counts them');
});
