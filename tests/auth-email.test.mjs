import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authEmail,confirmationUrl,languageOf,LANGUAGES,MAIL_OF} from '../supabase/functions/auth-email/mail.js';
import {TEMPLATES,SUBJECTS} from '../supabase/functions/auth-email/texts.js';
import {LANGUAGES as GAME_LANGUAGES} from '../public/languages.js';

test('the auth emails of the Send Email Hook: the Supabase link, a subject in every game language, the templates\' layout',()=>{
 const link=confirmationUrl({supabaseUrl:'https://x.supabase.co',tokenHash:'abc123',type:'signup',redirectTo:'https://www.harvesttycoon.com/play.html'});
 assert.equal(link,'https://x.supabase.co/auth/v1/verify?token=abc123&type=signup&redirect_to=https%3A%2F%2Fwww.harvesttycoon.com%2Fplay.html');
 for(const {code} of GAME_LANGUAGES)assert.ok(LANGUAGES.includes(code),`${code} has its emails`);
 for(const [type,name] of Object.entries(MAIL_OF))for(const lang of LANGUAGES){
  const mail=authEmail({type,language:lang,link:`${link}&x=<"'>`});
  assert.ok(mail.subject.endsWith(SUBJECTS[name][lang])&&mail.subject.length<120,`${type} ${lang}`);
  assert.ok(mail.html.includes(`lang="${lang}"`)&&mail.html.includes(TEMPLATES[name][lang].button.replace(/&/g,'&amp;').replace(/'/g,'&#39;')),`${type} ${lang} button`);
  assert.ok(mail.html.includes('&amp;x=&lt;&quot;&#39;&gt;')&&!mail.html.includes('x=<"'),'the link is escaped in the page');
  assert.ok(mail.text.includes(`&x=<"'>`),'and whole in the plain text');
 }
 assert.equal(languageOf('nl'),'nl');assert.equal(languageOf('xx'),'en');assert.equal(languageOf(undefined),'en');
 assert.match(authEmail({type:'recovery',language:'nl',link}).subject,/^🔑 Kies een nieuw wachtwoord/);
 assert.throws(()=>authEmail({type:'magiclink',language:'en',link}),/No email for the magiclink action/);
 const hook=readFileSync(new URL('../supabase/functions/auth-email/index.ts',import.meta.url),'utf8');
 assert.match(hook,/new Webhook\(secret\)\.verify/,'only Supabase can call it');
 assert.match(hook,/user\.user_metadata\?\.language/,'the farmer\'s game language');
});
