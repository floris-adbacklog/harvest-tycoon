// Phones on the website (18 Oct 2026, the owner: the pop-up "we also have a mobile app", "excl. dingen zoals Kong"): src/popup-ui.js
// fitsDevice('phone_web') is a phone on harvesttycoon.com in its browser, never an app, the home screen or a game portal; the database
// learns the group from supabase/popup-phone-web.sql, a pop-up only, and no offer goes to it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitsDevice,POPUP_AUDIENCES} from '../src/popup-ui.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('phones on the website: only a phone in the browser on harvesttycoon.com',()=>{
 assert.equal(POPUP_AUDIENCES.phone_web,'Phones on the website (not the apps or the game portals)');
 const phoneSite={installed:false,phone:true,web:true},computerSite={installed:false,phone:false,web:true},homeScreen={installed:true,phone:true,web:true};
 const phoneKongregate={installed:false,phone:true,web:false},phoneApp={installed:true,phone:true,playApp:true,web:false},crazy={installed:false,phone:true,web:false,crazygames:true};
 assert.deepEqual([phoneSite,computerSite,homeScreen,phoneKongregate,phoneApp,crazy].map(d=>fitsDevice('phone_web',d)),[true,false,false,false,false,false]);
 assert.equal(fitsDevice('phone_web',{installed:false,phone:true,web:'yes'}),false,'only a real true');
 assert.equal(fitsDevice('phone_web',{installed:false,phone:true}),false,'the special offer passes no web: never there');
 assert.equal(fitsDevice('phone_browser',phoneKongregate),true,'phone_browser does include a portal on a phone: the reason for the group');
});

test('a game from before the group never shows its pop-up, on any device',()=>{
 const today=/export function fitsDevice\(audience,\{installed,phone,playApp=false,web=false,crazygames=false\}\)\{\n(?: if\(crazygames===true\)return audience==='crazygames';\n)? (return [^\n]+)\n\}/.exec(read('src/popup-ui.js'))[1];
 const before=new Function('audience','{installed,phone,playApp=false,web=false,crazygames=false}',today.replace("||(audience==='phone_web'&&phone&&web===true&&!installed)",''));
 for(const device of [{installed:false,phone:true,web:true},{installed:false,phone:false,web:true},{installed:true,phone:true,playApp:true}])assert.equal(before('phone_web',device),false);
 assert.match(read('src/popup-ui.js'),/const popup=\(list\?\?\[\]\)\.find\(p=>fitsDevice\(p\.audience,device\(\)\)\);if\(!popup\)return;/,'skipped, so never marked as seen');
});

test('the database: the group in the table\'s check and in popup_post, changed in place from its live text; a pop-up only; no offer',()=>{
 const sql=read('supabase/popup-phone-web.sql'),before=read('supabase/popup-crazygames.sql');
 assert.match(sql,/add constraint popups_audience_check check \(audience in \('all','browser','phone_browser','phone','desktop','android_app','web','crazygames','phone_web'\)\);/);
 const old=/old text:=\$o\$(.*?)\$o\$;/.exec(sql)[1];
 assert.equal(/new text:=\$n\$(.*?)\n/.exec(before)[1],old,'the line it replaces is popup_post\'s own after popup-crazygames.sql');
 assert.match(sql,/if who='phone_web' and coalesce\(p_news,true\) then raise exception 'Send it to phones on the website as a pop-up only/);
 assert.match(sql,/if position\('''phone_web''' in d\)>0 then return; end if;/,'re-runnable');
 assert.match(sql,/<>1 then raise exception 'popup_post is not as expected/,'stops when the live text differs');
 assert.doesNotMatch(read('supabase/special-offer.sql'),/'phone_web'/,'no offer for the group');
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/<select id="admin-offer-audience">'\+Object\.entries\(POPUP_AUDIENCES\)\.filter\(\(\[key\]\)=>key!=='android_app'&&key!=='web'&&key!=='crazygames'&&key!=='phone_web'\)/,'the offer form leaves it out');
 assert.match(admin,/<select id="admin-popup-audience">'\+Object\.entries\(POPUP_AUDIENCES\)\.map/,'the pop-up form has it');
 for(const text of [sql,read('src/popup-ui.js')])assert.doesNotMatch(text,/ · /,'no middle dots');
});
