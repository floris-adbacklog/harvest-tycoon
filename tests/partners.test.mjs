import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {PARTNER_RULES,partnerCode,joinDetails,payoutDetails,payoutMail,ensurePartner,partnerPayout,euro} from '../supabase/functions/partner-api/partner.js';
import {linkPartner} from '../supabase/functions/farm-api/partner-service.js';
import {takeRefFromUrl,pendingRef,REF_KEY} from '../src/partner-link.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 1 Oct 2026: the partner programme, apart from Invite a friend: partners who are not players, their own account on /partners,
// 25% of what their players spend without VAT, for life, and payouts only on request from €20 (an email to info@).
function db(tables={}){
 const calls=[];
 const from=table=>{
  const q={table,filters:[],op:'select'};calls.push(q);
  const rows=()=>(tables[table]??[]).filter(r=>q.filters.every(([k,v])=>r[k]===v));
  const api={
   select(){return api;},eq(k,v){q.filters.push([k,v]);return api;},order(){return api;},limit(){return api;},
   maybeSingle:async()=>({data:rows()[0]??null,error:null}),single:async()=>({data:q.row,error:null}),
   insert(row){q.op='insert';q.row={...row,created_at:'2026-10-01T20:00:00Z'};(tables[table]??=[]).push(q.row);return api;},
   upsert(row,opts){q.op='upsert';q.row=row;q.opts=opts;if(!(tables[table]??=[]).some(r=>r.player_id===row.player_id))tables[table].push(row);return Promise.resolve({error:null});},
   delete(){q.op='delete';return {eq:async(k,v)=>{tables[table]=(tables[table]??[]).filter(r=>r[k]!==v);return {error:null};}};},
   then(resolve){return Promise.resolve({data:rows(),error:null}).then(resolve);}
  };
  return api;
 };
 return {calls,tables,from,rpcs:[],async rpc(name,args){this.rpcs.push([name,args]);return this.answers?.[name]?.(args)??{data:null,error:null};}};
}

test('the rules: 25% without 21% VAT, payouts from €20 by hand, requests by email to info@harvesttycoon.com',()=>{
 assert.deepEqual({...PARTNER_RULES},{sharePct:25,vatPct:21,minCents:2000,site:'https://www.harvesttycoon.com',to:'info@harvesttycoon.com'});
 const sql=read('supabase/partners.sql');
 assert.match(sql,/'earnedCents',floor\(money\.gross\/1\.21\*0\.25\)::int/,'25% of the price without 21% VAT');
 assert.match(sql,/where h\.status='credited' and h\.livemode and h\.player_id<>p_partner/,'only real, paid purchases, never the partner\'s own');
 assert.match(sql,/create unique index if not exists partner_payouts_open on public\.partner_payouts\(partner_id\) where status='requested';/,'one open request at a time');
 assert.match(sql,/if available<p_min then raise exception 'You can ask for a payout from €%\.'/);
 assert.match(sql,/revoke all on public\.partners, public\.partner_referrals, public\.partner_payouts from anon, authenticated;/);
 for(const fn of ['partner_admin_list','partner_admin_payout'])assert.match(sql,new RegExp(`function public\\.${fn}\\([^]*?is distinct from 'admin' then raise exception 'Not authorized\\.'`),fn);
 assert.match(sql,/not exists\(select 1 from public\.partners p where p\.user_id=auth\.users\.id and not exists\(select 1 from public\.player_farms f/,'a partner without a farm is no signup in the dashboard');
 assert.equal(euro(103),'€1.03');assert.equal(euro(-5),'€0.00');
});

test('a partner\'s link is remembered on a new visitor\'s device, goes along with the sign-up and the first farm, and links a new farm only',async()=>{
 const store={};const storage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
 let replaced='';const history={state:null,replaceState:(s,t,u)=>{replaced=u;}};
 assert.equal(takeRefFromUrl({location:{href:'https://www.harvesttycoon.com/?ref=greena123&x=1'},history,storage,known:false}),'GREENA123');
 assert.equal(replaced,'/?x=1','the code leaves the address bar');assert.equal(pendingRef(storage),'GREENA123');
 assert.equal(pendingRef(storage,Date.now()+31*86400000),null,'30 days');
 delete store[REF_KEY];assert.equal(takeRefFromUrl({location:{href:'https://x.com/?ref=ABCD12'},history,storage,known:true}),null,'not for a browser that already played');
 const main=read('src/main.js');
 assert.match(main,/\.\.\.\(partnerCode\?\{partnerCode\}:\{\}\)/);assert.match(main,/\.\.\.\(ref\?\{ref\}:\{\}\)/);
 assert.match(read('supabase/functions/farm-api/index.ts'),/await linkPartner\(\{admin,player:user\.id,code:body\.partnerCode\?\?user\.user_metadata\?\.ref,now\}\)\.catch/,'only where a brand-new farm is made, and never in its way');
 const base={partners:[{user_id:'p1',code:'GREENA123'}]};
 const a=db(structuredClone(base));assert.deepEqual(await linkPartner({admin:a,player:'f1',code:'greena123'}),{code:'GREENA123'});assert.equal(a.tables.partner_referrals[0].partner_id,'p1');
 assert.equal(await linkPartner({admin:db(structuredClone(base)),player:'p1',code:'GREENA123'}),null,'never the partner\'s own account');
 assert.equal(await linkPartner({admin:db(structuredClone(base)),player:'f1',code:'NOPE99'}),null,'an unknown code');
 assert.equal(await linkPartner({admin:db(structuredClone(base)),player:'f1',code:'<x>'}),null);
});

test('joining: a name and the terms, a website or handle if given; a code from the name; the panel for an existing partner',async()=>{
 assert.equal(partnerCode('Green Acres!',()=>0.5),'GREENA550');assert.equal(partnerCode('',()=>0),'HT100');assert.match(partnerCode('ÉÉ',()=>0),/^[A-Z0-9]{4,12}$/);
 assert.deepEqual(joinDetails({partner_name:' Farm  Tube ',partner_website:'@farmtube',partner_terms:true}),{name:'Farm Tube',website:'@farmtube'});
 assert.deepEqual(joinDetails({name:'X',terms:false}),{error:'Accept the partner terms to join.'});
 assert.ok(joinDetails({name:'X',terms:true,website:'not a site'}).error);
 const fresh=db({});const made=await ensurePartner({admin:fresh,user:{id:'u1',user_metadata:{partner_signup:true,partner_name:'Farm Tube',partner_terms:true}},random:()=>0});
 assert.equal(made.partner.code,'FARMTU100');assert.equal(made.joined,true);
 assert.deepEqual(await ensurePartner({admin:db({}),user:{id:'u2',user_metadata:{username:'Player'}}}),{partner:null},'a game account becomes a partner only when it asks');
});

test('a payout request: checked, sent by email with where to pay (kept out of the database), and taken back when the email fails',async()=>{
 assert.ok(payoutDetails({name:'',details:'NL00BANK0123456789'}).error);assert.ok(payoutDetails({name:'Jo',details:'x'}).error);
 const ok=payoutDetails({name:'Jo Farm',details:'NL00BANK0123456789',note:'thanks'});assert.deepEqual(ok,{name:'Jo Farm',how:'NL00BANK0123456789',note:'thanks'});
 const mail=payoutMail({partner:{name:'Farm Tube',code:'FARMTU100'},user:{email:'p@x.com'},request:{id:'r1',amountCents:2537},details:ok,stats:{players:9,payingPlayers:3,earnedCents:2537,paidCents:0}});
 assert.equal(mail.subject,'Payout request: €25.37 for Farm Tube');assert.match(mail.text,/IBAN or PayPal: NL00BANK0123456789/);assert.match(mail.text,/mark it paid in the Admin dashboard/);
 assert.doesNotMatch(read('supabase/partners.sql'),/iban|paypal|details text/i,'where to pay is never stored');
 const a=db({partners:[{user_id:'u1',code:'FARMTU100',name:'Farm Tube'}],partner_payouts:[{id:'r1',partner_id:'u1'}]});
 a.answers={partner_request_payout:()=>({data:{id:'r1',amountCents:2537},error:null}),partner_stats:()=>({data:{players:9},error:null})};
 const failed=await partnerPayout({admin:a,user:{id:'u1',email:'p@x.com'},body:{name:'Jo',details:'NL00BANK0123456789'},mail:async()=>{throw new Error('The email could not be sent.');}});
 assert.equal(failed.status,502);assert.equal(a.tables.partner_payouts.length,0,'no request is left without its email');
 assert.deepEqual(a.rpcs[0],['partner_request_payout',{p_partner:'u1',p_min:2000}]);
 const src=read('supabase/functions/partner-api/partner.js');assert.match(src,/to:\[PARTNER_RULES\.to\],reply_to:replyTo/,'to info@, answered to the partner');
});

test('/partners: its own account box and panel, the assets to download, the terms; linked as Partner programme in every footer',()=>{
 const page=read('public/partners.html'),js=read('src/partners.js'),vercel=JSON.parse(read('vercel.json'));
 assert.match(page,/<script type="module" src="\/cloud\/partners\.js"><\/script>/);assert.match(page,/id="partner-app"/);assert.match(page,/<h2 id="terms">Partner terms<\/h2>/);
 for(const [,href] of page.matchAll(/class="partner-asset" href="([^"]+)" download/g))assert.ok(existsSync(new URL(`../public${href}`,import.meta.url)),href);
 assert.ok((page.match(/class="partner-asset"/g)??[]).length>=6,'a few assets');
 assert.match(js,/storageKey:PARTNER_AUTH_KEY/);assert.match(js,/export const PARTNER_AUTH_KEY='harvest-tycoon:partner-auth';/,'its own session: a partner never opens a farm');
 assert.match(js,/emailRedirectTo:`\$\{location\.origin\}\/partners`/);assert.match(js,/partner_signup:true/);
 assert.ok(vercel.rewrites.some(r=>r.source==='/partners'&&r.destination==='/partners.html'));
 for(const path of ['public/play.html','public/404.html','public/delete-account.html','public/privacy.html','public/partners.html','scripts/build-wiki.mjs'])assert.match(read(path),/<a href="\/partners">Partner programme<\/a>/,path);
 assert.match(read('src/admin-dashboard.js'),/data-payout-status="paid">Paid<\/button>/);assert.match(read('src/chat-client.js'),/partnerPayout:\(id,status\)=>rpc\('partner_admin_payout',\{p_id:id,p_status:status\}\)/);
});
