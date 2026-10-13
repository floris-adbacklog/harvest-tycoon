import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runJob,EMAIL_DAILY_CAP} from '../supabase/functions/notify-hourly/job.js';
import {CROP_NAMES,BUILDING_NAMES} from '../supabase/functions/notify-hourly/names.js';

// The daily email's cap (13 Oct 2026): 1,000 a day on Resend's paid plan, instead of the free plan's 60 that ran out at 12:05 UTC.
const names={crops:CROP_NAMES,buildings:BUILDING_NAMES},MORNING=Date.parse('2026-09-21T07:05:00Z'),HOUR=3600000;
const farmer=i=>({player_id:`p${i}`,email:`farmer${i}@example.com`,username:'Tony',push_crops:false,push_production:false,push_daily:false,email_digest:true,digest_hour:9,timezone:'Europe/Amsterdam',
 last_active_at:new Date(MORNING-(3+i)*60000).toISOString(),crops_seen_at:null,production_seen_at:null,last_push_at:null,push_day:null,push_count:0,daily_morning_on:null,daily_evening_on:null,digest_on:null,
 subscriptions:[],farm:{plots:[{id:0,crop:'wheat',readyAt:MORNING-HOUR}],buildings:{},login:{lastDay:'2026-09-20',streak:1}}});
function jobDeps(rows,emailsSent){
 const log={mails:[],digestOn:[],added:0};
 return {log,deps:{names,log:()=>{},sendPush:null,emailConfirmed:async()=>true,sendEmail:async row=>{log.mails.push(row.player_id);return true;},
  db:{beginRun:async()=>({run:true,emails_sent:emailsSent}),candidates:async()=>rows,saveState:async(id,patch)=>{if(patch.digest_on)log.digestOn.push(id);},removeSubscription:async()=>{},markSuccess:async()=>{},markFailure:async()=>{},addEmails:async n=>{log.added+=n;}}}};
}

test('the daily email cap is 1,000 a day, well inside Resend\'s paid 50,000 a month',()=>{
 assert.equal(EMAIL_DAILY_CAP,1000);assert.ok(EMAIL_DAILY_CAP*31<=50000*0.7,'a month at the cap leaves room for the sign-up and other mails');
 const source=readFileSync(new URL('../supabase/functions/notify-hourly/job.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/free Resend allowance/,'the old reason is gone');assert.match(source,/let emailBudget=Math\.max\(0,\(deps\.emailCap\?\?EMAIL_DAILY_CAP\)-\(run\.emails_sent\?\?0\)\);/,'still counted per UTC day');
});
test('a day like 13 Oct: with 60 already sent, the next 75 farmers still get their mail at their hour',async()=>{
 const rows=Array.from({length:75},(_,i)=>farmer(i)),{log,deps}=jobDeps(rows,60);
 const stats=await runJob(deps,MORNING);
 assert.equal(stats.emails,75);assert.equal(log.mails.length,75);assert.equal(log.added,75);assert.equal(log.digestOn.length,75);
});
test('at the cap no more mail goes out that day, and nobody is marked as mailed',async()=>{
 const rows=Array.from({length:3},(_,i)=>farmer(i));
 const full=jobDeps(rows,EMAIL_DAILY_CAP),stats=await runJob(full.deps,MORNING);
 assert.equal(stats.emails,0);assert.deepEqual(full.log.mails,[]);assert.deepEqual(full.log.digestOn,[]);assert.equal(full.log.added,0);
 // One left: the most recently active farmer gets it.
 const last=jobDeps(rows,EMAIL_DAILY_CAP-1);await runJob(last.deps,MORNING);assert.deepEqual(last.log.mails,['p0']);
});
