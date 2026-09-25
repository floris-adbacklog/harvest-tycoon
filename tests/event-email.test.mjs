import test from 'node:test';
import assert from 'node:assert/strict';
import {sendEmailCode,confirmEmailCode,EMAIL_CODE,emailCodeMessage} from '../supabase/functions/farm-api/event-service.js';

// A tiny stand-in for the email_checks table and the harvest_email_checked check.
function db({checked=false}={}){
 let row=null;
 const table={
  select(){return this;},eq(){return this;},
  async maybeSingle(){return {data:row?{...row}:null,error:null};},
  async upsert(value){row={...value};return {error:null};},
  update(patch){return {eq:async()=>{row={...row,...patch};return {error:null};}};}
 };
 return {row:()=>row,rpc:async()=>({data:checked||Boolean(row?.confirmed_at),error:null}),from:()=>table};
}
const user={id:'00000000-0000-4000-8000-000000000001',email:'farmer@example.com'};

test('a code goes to the farmer\'s own address, at most once a minute and 5 times a day, and only its hash is kept',async()=>{
 const admin=db(),sent=[];const mail=async(to,m)=>sent.push({to,m});let t=Date.UTC(2026,8,25,10);
 const r=await sendEmailCode({admin,user,now:t,mail,random:()=>123456});
 assert.equal(r.sent,true);assert.equal(sent[0].to,user.email);assert.match(sent[0].m.subject,/123456/);
 assert.ok(!JSON.stringify(admin.row()).includes('123456'),'the code itself is never stored');
 await assert.rejects(()=>sendEmailCode({admin,user,now:t+30000,mail}),/Wait a minute/);
 for(let i=1;i<EMAIL_CODE.perDay;i++){t+=EMAIL_CODE.waitMs;await sendEmailCode({admin,user,now:t,mail});}
 await assert.rejects(()=>sendEmailCode({admin,user,now:t+EMAIL_CODE.waitMs,mail}),/5 codes today/);
 assert.equal(sent.length,EMAIL_CODE.perDay);
});

test('the right code within 30 minutes confirms; wrong codes count down, and an old code expires',async()=>{
 const admin=db(),t=Date.UTC(2026,8,25,10);
 await sendEmailCode({admin,user,now:t,mail:async()=>{},random:()=>654321});
 await assert.rejects(()=>confirmEmailCode({admin,user,code:'12',now:t}),/6 digits/);
 await assert.rejects(()=>confirmEmailCode({admin,user,code:'111111',now:t}),/4 tries left/);
 assert.deepEqual(await confirmEmailCode({admin,user,code:'654321',now:t+60000}),{verified:true});
 assert.ok(admin.row().confirmed_at);assert.equal(admin.row().code_hash,null);
 const late=db();await sendEmailCode({admin:late,user,now:t,mail:async()=>{},random:()=>1});
 await assert.rejects(()=>confirmEmailCode({admin:late,user,code:'000001',now:t+EMAIL_CODE.validMs}),/expired/);
 const many=db();await sendEmailCode({admin:many,user,now:t,mail:async()=>{},random:()=>2});
 for(let i=0;i<EMAIL_CODE.tries;i++)await confirmEmailCode({admin:many,user,code:'999999',now:t}).catch(()=>{});
 await assert.rejects(()=>confirmEmailCode({admin:many,user,code:'000002',now:t}),/Too many tries/);
});

test('an account that is already checked (or Google/Facebook) gets no email',async()=>{
 const sent=[];const r=await sendEmailCode({admin:db({checked:true}),user,mail:async()=>sent.push(1)});
 assert.deepEqual(r,{verified:true});assert.equal(sent.length,0);
 assert.match(emailCodeMessage('042042').text,/within 30 minutes/);
});

test('a confirmed email pays 10 diamonds once, only through the server\'s load, and the entry shows only for email sign-ups',async()=>{
 const {createFarm,grantEmailBonus,EMAIL_BONUS,normalizeFarm}=await import('../game/farm-state.js');
 const s=createFarm(Date.UTC(2026,8,25)),before=s.diamonds;
 assert.equal(EMAIL_BONUS,10);assert.equal(grantEmailBonus(s,1),10);assert.equal(s.diamonds,before+10);
 assert.equal(grantEmailBonus(s,2),0,'only once');assert.equal(s.diamonds,before+10);
 const t=createFarm(0);t.emailBonus='soon';normalizeFarm(t,0);assert.equal(t.emailBonus,undefined);
 const {readFileSync}=await import('node:fs');const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/if\(!checked\.error&&checked\.data===true&&grantEmailBonus\(state,now\)\)\{/);
 assert.match(api,/emailBonusPaid=true;\n      if\(\(user\.app_metadata\?\.provider\?\?'email'\)==='email'\)\{const message='Thanks for confirming your email!';/,'only an email sign-up sees a pop-up; Google and Facebook are paid quietly');
 assert.match(api,/friends\.length\|\|emailBonusPaid\)\{/,'a quiet payment is still saved');
 assert.match(api,/const emailCheck=\(farm:\{emailBonus\?:number\}\)=>\(\{needed:\(user\.app_metadata\?\.provider\?\?'email'\)==='email'&&!farm\.emailBonus/);
 const html=read('public/farm.html');
 assert.match(html,/<button class="side-tool" id="email-button"[^>]*hidden><span><i data-game-art="letter"><\/i><\/span><b>Verify<\/b><\/button>/);
 assert.match(html,/<button data-menu-action="email-button" id="email-menu-entry" hidden><i data-game-art="letter"><\/i><span><strong>Confirm your email<\/strong><small>10 diamonds for you<\/small>/);
 assert.match(read('public/game.js'),/const hide=!emailAccount\.needed;\$\('email-button'\)\.hidden=hide;\$\('email-menu-entry'\)\.hidden=hide;/);
});
