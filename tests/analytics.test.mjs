import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pushEvent,trackSignUp,isNewRegistration,trackAuth,deviceType} from '../src/analytics.js';

test('a new registration pushes one anonymous sign_up event to the dataLayer',()=>{
 const win={};trackSignUp({confirmationRequired:true},win);
 assert.deepEqual(win.dataLayer,[{event:'sign_up',method:'email',email_confirmation_required:true}]);
 trackSignUp({},win);assert.equal(win.dataLayer.length,2);assert.equal(win.dataLayer[1].email_confirmation_required,false);
 const keys=win.dataLayer.flatMap(Object.keys);
 for(const forbidden of ['email','username','name','user_id','id'])assert(!keys.includes(forbidden),forbidden);
});
test('pushing keeps an existing dataLayer, and does nothing without a window',()=>{
 const win={dataLayer:[{event:'gtm.js'}]};pushEvent('x',{},win);assert.deepEqual(win.dataLayer.map(e=>e.event),['gtm.js','x']);
 assert.doesNotThrow(()=>pushEvent('x',{},null));
});
test('an already-registered address is not counted as a registration',()=>{
 assert.equal(isNewRegistration({user:{identities:[]}}),false);
 assert.equal(isNewRegistration({user:{identities:[{provider:'email'}]}}),true);
 assert.equal(isNewRegistration({user:{}}),true);assert.equal(isNewRegistration({}),true);
});
test('Tag Manager is installed once, on the page shell only (not in the game iframe), and only after consent',()=>{
 const play=readFileSync(new URL('../public/play.html',import.meta.url),'utf8'),farm=readFileSync(new URL('../public/farm.html',import.meta.url),'utf8');
 assert.equal(play.split('GTM-NPF56JVR').length-1,1,'one head loader; it only runs after cookies are accepted (tests/cookie-consent.test.mjs)');
 assert(play.indexOf('googletagmanager.com/gtm.js')<play.indexOf('<meta name="viewport"'),'script sits at the top of the head');
 assert(play.indexOf('<meta charset="utf-8">')<play.indexOf('googletagmanager.com/gtm.js')&&play.indexOf('googletagmanager.com/gtm.js')<1024,'charset stays inside the first 1024 bytes');
 assert(!play.includes('googletagmanager.com/ns.html'),'no noscript iframe: it would load Tag Manager without asking');
 assert(!farm.includes('googletagmanager'),'farm.html is loaded inside play.html; a second container would double-count');
});
test('sign-up funnel steps carry the device and only whitelisted, anonymous parameters',()=>{
 const win={innerWidth:390};
 trackAuth('view',{mode:'register'},win);trackAuth('error',{mode:'register',reason:'weak_password',field:'password',email:'a@b.nl',message:'Password too short for a@b.nl',user_id:'x'},win);trackAuth('login',{method:'password',after_signup:true},win);
 assert.deepEqual(win.dataLayer,[{event:'auth_view',device:'mobile',mode:'register'},{event:'auth_error',device:'mobile',mode:'register',reason:'weak_password',field:'password'},{event:'auth_login',device:'mobile',method:'password',after_signup:true}]);
 trackAuth('mode',{mode:'Not Allowed!',reason:undefined,field:'x'.repeat(40)},win);assert.deepEqual(win.dataLayer[3],{event:'auth_mode',device:'mobile'});
});
test('device type follows the viewport width',()=>{
 assert.equal(deviceType({innerWidth:375}),'mobile');assert.equal(deviceType({innerWidth:820}),'tablet');assert.equal(deviceType({innerWidth:1440}),'desktop');assert.equal(deviceType(null),'desktop');
});
