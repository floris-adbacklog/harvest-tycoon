import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {clockStorage,clockOffset,CLOCK_KEY,CLOCK_SLACK} from '../src/clock-storage.js';
// A device whose clock is wrong (31 Oct 2026, the farmer whose game kept asking to sign in again): src/clock-storage.js.
const memory=()=>{const map=new Map();return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};};
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=({iat,exp,n=1,sub='11111111-1111-1111-1111-111111111111'})=>`${b64({alg:'HS256'})}.${b64({sub,iat,exp,n,session_id:'s1',role:'authenticated'})}.sig`;
const session=(iat,n=1)=>({access_token:token({iat,exp:iat+3600,n}),refresh_token:`r${n}`,token_type:'bearer',expires_in:3600,expires_at:iat+3600,
 user:{id:'11111111-1111-1111-1111-111111111111',aud:'authenticated',role:'authenticated',email:'a@b.c',app_metadata:{},user_metadata:{},created_at:'2026-10-31T00:00:00Z'}});
const HOURS3=3*3600000;

test('a new sign-in measures how far the clock is off and expires_at is read in this device\'s time',()=>{
 const store=memory(),server=1_800_000_000_000,storage=clockStorage(store,()=>server+HOURS3+2000);
 storage.setItem('auth',JSON.stringify(session(server/1000)));
 assert.equal(JSON.parse(store.getItem('auth')).expires_at,server/1000+3600,'stored: the real end');
 assert.equal(clockOffset(store),HOURS3+2000);
 assert.equal(JSON.parse(storage.getItem('auth')).expires_at,server/1000+3600+HOURS3/1000+2);
});

test('the smallest of the last few counts, a clock that is right changes nothing, and other values pass untouched',()=>{
 const store=memory();let now=0;const storage=clockStorage(store,()=>now);
 for(const [i,late] of [[1,HOURS3+9000],[2,HOURS3+1000],[3,HOURS3+5000]].entries()){now=1e12+late[1];storage.setItem('auth',JSON.stringify(session(1e9,i)));}
 assert.equal(clockOffset(store),HOURS3+1000);
 assert.equal(JSON.parse(store.getItem(CLOCK_KEY)).length,3);
 // The same sign-in written again (as supabase-js does) is not a new measurement.
 now=1e12+HOURS3+60000;storage.setItem('auth',store.getItem('auth'));
 assert.equal(JSON.parse(store.getItem(CLOCK_KEY)).length,3);
 const right=memory(),fine=clockStorage(right,()=>1e12+CLOCK_SLACK-1);
 fine.setItem('auth',JSON.stringify(session(1e9)));
 assert.equal(clockOffset(right),0);
 assert.equal(JSON.parse(fine.getItem('auth')).expires_at,1e9+3600);
 fine.setItem('verifier','abc');assert.equal(fine.getItem('verifier'),'abc');
 assert.equal(fine.getItem('missing'),null);
 const broken=memory();broken.setItem(CLOCK_KEY,'{oops');assert.equal(clockOffset(broken),0);
});

test('a clock behind is measured too, so a sign-in the server ended is renewed in time',()=>{
 const store=memory(),server=1_800_000_000_000,storage=clockStorage(store,()=>server-HOURS3);
 storage.setItem('auth',JSON.stringify(session(server/1000)));
 assert.equal(clockOffset(store),-HOURS3);
 assert.equal(JSON.parse(storage.getItem('auth')).expires_at,server/1000+3600-HOURS3/1000);
});

test('with the real supabase-js, a clock 3 hours ahead no longer renews the sign-in on every request',async t=>{
 const realNow=Date.now,server=realNow();
 t.after(()=>{Date.now=realNow;});
 Date.now=()=>realNow()+HOURS3;
 let renewals=0;
 const fetch=async(url)=>{
  if(String(url).includes('/token')){renewals++;return new Response(JSON.stringify(session(Math.floor(server/1000),renewals+1)),{status:200,headers:{'content-type':'application/json'}});}
  return new Response('{}',{status:200,headers:{'content-type':'application/json'}});
 };
 const run=async storage=>{
  const store=memory();renewals=0;
  const client=createClient('https://x.supabase.co','anon',{global:{fetch},auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'auth',storage:storage(store)}});
  await client.auth.setSession({access_token:session(Math.floor(server/1000)).access_token,refresh_token:'r1'});
  renewals=0;
  for(let i=0;i<5;i++)await client.auth.getSession();
  return renewals;
 };
 assert.ok(await run(store=>store)>=5,'without it: a renewal on every getSession');
 assert.equal(await run(store=>clockStorage(store)),0,'with it: none');
});

test('the website and the portals keep their sign-in through it, and a 401 on a wrong clock says so on the sign-in screen',()=>{
 const supabase=readFileSync(new URL('../src/supabase.js',import.meta.url),'utf8');
 assert.match(supabase,/storageKey:'harvest-tycoon:auth',storage\}/);
 assert.match(supabase,/detectSessionInUrl:false,storageKey,storage\}/);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/landing\(clockOffset\(\)\?CLOCK_WRONG:'Your session has ended\. Please sign in again\.'\)/);
 assert.match(main,/const CLOCK_WRONG='Your session has ended because the clock on your device is set wrong\./);
});
