import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomPlayerName,isRandomPlayerName} from '../src/account-form.js';

// 27 Sep 2026: 16% of Facebook sign-ups stopped at an empty "Meet your farmer" name screen and never got a farm.
// A farmer who signs in with Facebook or Google now gets a friendly name on the server, as an email sign-up does.
const server=readFileSync('supabase/functions/farm-api/index.ts','utf8');

test('a farmer without a name gets a friendly one instead of the name screen',()=>{
 assert.match(server,/user\.user_metadata\.username\.trim\(\):randomPlayerName\(\)\)/);
 assert.match(server,/const username=profile\?\.username\?\?await freeName\(admin,chosen\);/);
 assert.doesNotMatch(server,/USERNAME_REQUIRED/);
});

test('the friendly name always passes the server name rule and reads as picked for them',()=>{
 const rule=/const nameValid=\(value:unknown\)=>typeof value==='string'&&(\/.+\/)\.test\(value\.trim\(\)\);/.exec(server);
 assert.ok(rule);const valid=new Function(`return ${rule[1]}`)();
 for(let i=0;i<500;i++){const name=randomPlayerName();assert.ok(valid.test(name),name);assert.ok(isRandomPlayerName(name),name);}
});

test('farm-api uses the same name maker as the sign-up card',()=>{
 assert.equal(readFileSync('src/account-form.js','utf8'),readFileSync('supabase/functions/farm-api/account-form.js','utf8'));
 assert.match(readFileSync('scripts/sync-game.mjs','utf8'),/src\/account-form\.js.*farm-api\/account-form\.js/);
});
