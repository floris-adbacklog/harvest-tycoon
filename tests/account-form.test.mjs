import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MODES,formErrors,describeAuthError,randomPlayerName,validEmail} from '../src/account-form.js';
const validName=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(value.trim());
const play=readFileSync(new URL('../public/play.html',import.meta.url),'utf8');

test('generated player names always satisfy the server rule',()=>{
 for(let i=0;i<2000;i++)assert(validName(randomPlayerName()),randomPlayerName());
 assert.equal(randomPlayerName(()=>0),'Sunny Acres 1000');assert.equal(randomPlayerName(()=>0.999999),'Rustic Farm 9999');
});
test('each field gets its own message; the optional player name is only checked when it is filled in',()=>{
 assert.deepEqual(formErrors({mode:'register',email:'a@b.nl',password:'123456'},validName),{});
 assert.deepEqual(Object.keys(formErrors({mode:'register',email:'nope',password:'1'},validName)),['email','password']);
 assert.deepEqual(Object.keys(formErrors({mode:'register',name:'a!',email:'a@b.nl',password:'123456'},validName)),['name']);
 assert.deepEqual(Object.keys(formErrors({mode:'name',name:''},validName)),['name']);
 assert.deepEqual(Object.keys(formErrors({mode:'signin',email:'a@b.nl',password:''},validName)),['password']);
 assert.deepEqual(formErrors({mode:'signin',email:'a@b.nl',password:'x'},validName),{},'signing in never enforces the length rule');
 assert.deepEqual(Object.keys(formErrors({mode:'forgot',email:''},validName)),['email']);
 assert.deepEqual(Object.keys(formErrors({mode:'recovery',password:'12345'},validName)),['password']);
 assert(validEmail(' me@farm.example ')&&!validEmail('me@farm')&&!validEmail('me farm@x.nl'));
});
test('auth errors become plain sentences with a field and an analytics-safe reason',()=>{
 const cases=[[{code:'weak_password'},'weak_password','password'],[{code:'user_already_exists'},'email_exists','email'],[{code:'email_address_invalid'},'invalid_email','email'],[{status:429},'rate_limited'],[{code:'over_email_send_rate_limit'},'rate_limited'],[{code:'invalid_credentials'},'invalid_credentials'],[{code:'email_not_confirmed'},'email_not_confirmed'],[{message:'Failed to fetch'},'network'],[{message:'boom'},'other']];
 for(const [error,reason,field] of cases){const d=describeAuthError(error,e=>e.message);assert.equal(d.reason,reason);assert.equal(d.field,field);assert(d.message.length>=4);assert.match(d.reason,/^[a-z_]+$/);}
 assert.equal(describeAuthError({code:'email_not_confirmed'}).resend,true);
 assert.equal(describeAuthError({message:'boom'},()=>'').message,'Something went wrong. Please try again.');
});
test('every mode has the copy the card needs',()=>{
 for(const [key,m] of Object.entries(MODES)){assert(m.eyebrow&&m.title,key);if(key!=='confirm')assert(m.submit,key);}
 assert.deepEqual(MODES.register.fields,['email','password'],'a new player only has to give an email and a password');
 assert.equal(MODES.register.submit,'Start my farm');
});
test('the sign-up card markup has no confirm-password field and the promise sits with the button',()=>{
 assert(!/confirm-password|confirm-row/.test(play));
 assert(play.indexOf('id="account-submit"')<play.indexOf('id="register-promise"'),'promise directly below the button');
 assert.match(play,/id="register-promise"[^>]*>[\s\S]*Free to play\.[\s\S]*50 diamonds/);
 assert.match(play,/id="account-form" novalidate/);
 assert.match(play,/id="email"[^>]*inputmode="email"[^>]*autocapitalize="none"/);
 assert.match(play,/id="password"[^>]*autocomplete="new-password"/,'a first-time visitor is offered a generated password');
 assert.match(play,/id="toggle-password"[^>]*aria-label="Show password"/);
 assert(!/Internet required/.test(play));
 assert(play.indexOf('<script>try{var q=location.hash')<play.indexOf('/cloud/cloud.js'),'the boot script runs before the bundle');
});
