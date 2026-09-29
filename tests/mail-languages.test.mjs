import test from 'node:test';
import assert from 'node:assert/strict';
import {LANGUAGES} from '../public/languages.js';
import {textsFor,MAIL_LANGUAGES} from '../supabase/functions/notify-hourly/texts.js';
import {planPlayer} from '../supabase/functions/notify-hourly/rules.js';
import {digestEmail} from '../supabase/functions/notify-hourly/mail.js';
import {CROP_NAMES,BUILDING_NAMES,LOCAL_NAMES} from '../supabase/functions/notify-hourly/names.js';
import {codeTexts} from '../supabase/functions/farm-api/mail-text.js';
import {emailCodeMessage} from '../supabase/functions/farm-api/event-service.js';

const codes=LANGUAGES.map(l=>l.code);
const names={crops:CROP_NAMES,buildings:BUILDING_NAMES};

test('every game language has its reminder and code email texts, with the same parts as English',()=>{
 assert.deepEqual([...MAIL_LANGUAGES].sort(),[...codes].sort());
 const en=Object.keys(textsFor('en')).sort(),enCode=Object.keys(codeTexts('en')).sort();
 for(const code of codes){
  assert.deepEqual(Object.keys(textsFor(code)).sort(),en,code);
  assert.equal(textsFor(code).language,code);
  assert.deepEqual(Object.keys(codeTexts(code)).sort(),enCode,code);
  assert.equal(codeTexts(code).language,code);
  for(const n of [1,2,5,21])assert.ok(!/undefined/.test(textsFor(code).subjectCrops(n)+textsFor(code).jobsMany(n,'x')+textsFor(code).cropsLine(n,'x')),`${code} ${n}`);
 }
 assert.equal(textsFor('xx').language,'en','an unknown language falls back to English');
 assert.equal(textsFor(null).language,'en');
});

test('the reminder is written in the farmer\'s game language, with the game\'s own crop names',()=>{
 const now=Date.UTC(2026,8,29,10),digest={username:'Anna',language:'nl',crops:[{crop:'wheat'},{crop:'wheat'}],jobs:[],giftWaiting:false,streak:0};
 const mail=digestEmail({digest,names,appUrl:'https://example.com',unsubscribeUrl:'https://example.com/u'});
 assert.equal(mail.subject,'Je boerderij heeft je nodig: 2 gewassen klaar');
 assert.match(mail.html,/<html lang="nl">/);assert.match(mail.text,new RegExp(`${LOCAL_NAMES.nl.crops.wheat} ×2`));
 assert.match(mail.html,/Afmelden<\/a>/);
 const player={player_id:'p',timezone:'Europe/Amsterdam',language:'de',last_active_at:new Date(now-3600000).toISOString(),push_crops:true,push_production:true,push_daily:false,
  crops_seen_at:now-7200000,production_seen_at:now-7200000,subscriptions:[{endpoint:'e',p256dh:'k',auth:'a'}],farm:{plots:[{crop:'wheat',readyAt:now-3600000}]}};
 assert.equal(planPlayer(player,now,names).push.body,'Deine Feldfrüchte sind erntereif');
 assert.equal(planPlayer({...player,language:null},now,names).push.body,'Your crops are ready to harvest');
});

test('the code email follows the farmer\'s language and falls back to English',()=>{
 assert.equal(emailCodeMessage('042042',undefined,'es').subject,'Tu código de Harvest Tycoon: 042042');
 assert.match(emailCodeMessage('042042',undefined,'ja').html,/<html lang="ja">/);
 assert.equal(emailCodeMessage('042042').subject,'Your Harvest Tycoon code: 042042');
});
