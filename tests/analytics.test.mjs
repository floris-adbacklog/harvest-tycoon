import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pushEvent,trackSignUp,isNewRegistration} from '../src/analytics.js';

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
test('Tag Manager is installed once, on the page shell only (not in the game iframe)',()=>{
 const play=readFileSync(new URL('../public/play.html',import.meta.url),'utf8'),farm=readFileSync(new URL('../public/farm.html',import.meta.url),'utf8');
 assert.equal(play.split('GTM-NPF56JVR').length-1,2,'one head script and one noscript iframe');
 assert(play.indexOf('googletagmanager.com/gtm.js')<play.indexOf('<meta name="viewport"'),'script sits at the top of the head');
 assert(play.indexOf('<meta charset="utf-8">')<play.indexOf('googletagmanager.com/gtm.js')&&play.indexOf('googletagmanager.com/gtm.js')<1024,'charset stays inside the first 1024 bytes');
 assert(play.indexOf('<body data-phase="checking">\n<!-- Google Tag Manager (noscript) -->')>0,'noscript directly after <body>');
 assert(!farm.includes('googletagmanager'),'farm.html is loaded inside play.html; a second container would double-count');
});
