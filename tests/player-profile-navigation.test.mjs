import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/player-profiles.js',import.meta.url),'utf8').split('export function createPlayerProfiles')[1];
// admin defaults to false so every pre-existing test below (none of which care about it) keeps seeing exactly
// the dialog it always has; confirmed defaults to true so a Give click does not need a confirm mock every time.
// playerId is the browser's own signed-in id — only relevant to the self-gift refresh test below.
function harness({admin=false,confirmed=true,playerId}={}){
 let doc,timer;const intervals=[],requests=[],created=[],confirms=[],refreshes=[];
 class Element{
  constructor(){this.nodes=new Map();this.listeners={};this.attributes={};this.innerHTML='';this.textContent='';this.children=[];this.isConnected=true;this.value='';this.open=false;}
  querySelector(key){if(!this.nodes.has(key))this.nodes.set(key,new Element());return this.nodes.get(key);}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(key,fn){this.listeners[key]=fn;}
  before(el){created.push(el);}
  append(el){this.children.push(el);}
  replaceChildren(){this.children=[];this.innerHTML='';}
  focus(){doc.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;this.listeners.close?.();}
  contains(el){return this===el||this.children.includes(el);}
 }
 const board=new Element();doc={body:new Element(),activeElement:new Element(),hidden:false,getElementById:()=>board,createElement:()=>new Element()};
 const bridge={playerId,request(body){return new Promise((resolve,reject)=>requests.push({body,resolve,reject}));}};
 const win={addEventListener(){},harvestRefresh:()=>{refreshes.push(Date.now());return Promise.resolve();}};
 const context=vm.createContext({document:doc,window:win,setTimeout(fn){timer=fn;return 1;},clearTimeout(){timer=null;},setInterval(fn){intervals.push(fn);return 2;},clearInterval(){},refreshVipBadges(){},renderPlayerProfile:p=>p.username,renderPlayerSearch:players=>players.map(p=>p.username).join(','),checkAdmin:()=>Promise.resolve(admin),confirmAction(request){confirms.push(request);return Promise.resolve(confirmed);},art:()=>'',esc:value=>String(value??''),renderLogEntries:()=>'',LOG_LABELS:{},adminGrantItemOptions:'<option value="">None</option><option value="wheat">Wheat</option>',ITEMS:{wheat:{name:'Wheat'}}});
 vm.runInContext(`function createPlayerProfiles${source}`,context);
 const controller=context.createPlayerProfiles(bridge),dialog=doc.body.children[0],search=created[0];
 return {controller,requests,dialog,search,doc,intervals,confirms,refreshes,tick(){const fn=timer;timer=null;fn?.();}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('a slow first profile cannot overwrite a newer selected farmer',async()=>{
 const h=harness(),one=h.controller.open('one'),two=h.controller.open('two');
 h.requests[1].resolve({playerProfile:{username:'Second'}});await two;
 h.requests[0].resolve({playerProfile:{username:'First'}});await one;
 assert.equal(h.dialog.querySelector('#farmer-profile-content').innerHTML,'Second');
});
test('closing while loading never reopens the profile and restores focus',async()=>{
 const h=harness(),origin=h.doc.activeElement,pending=h.controller.open('one');h.dialog.close();
 h.requests[0].resolve({playerProfile:{username:'First'}});await pending;
 assert.equal(h.controller.isOpen,false);assert.equal(h.doc.activeElement,origin);assert.ok(!h.dialog.querySelector('#farmer-profile-content').innerHTML.includes('First'));
});
test('typing invalidates an outstanding search before the next debounce completes',async()=>{
 const h=harness(),input=h.search.querySelector('input'),results=h.search.querySelector('#farmer-search-results');
 input.value='Tony';input.listeners.input();h.tick();assert.equal(h.requests.length,1);
 input.value='Sunny';input.listeners.input();h.requests[0].resolve({players:[{username:'Tony'}]});await flush();assert.equal(results.innerHTML,'');
 h.tick();h.requests[1].resolve({players:[{username:'Sunny'}]});await flush();assert.equal(results.innerHTML,'Sunny');
});
test('clearing search discards pending results and resets busy state',async()=>{
 const h=harness(),input=h.search.querySelector('input');input.value='Tony';input.listeners.input();h.tick();
 h.search.querySelector('#farmer-search-clear').onclick();h.requests[0].resolve({players:[{username:'Tony'}]});await flush();
 const results=h.search.querySelector('#farmer-search-results');assert.equal(results.innerHTML,'');assert.equal(results.attributes['aria-busy'],'false');assert.equal(input.value,'');
});
test('profile lookup errors remain in the dialog with a working retry',async()=>{
 const h=harness(),pending=h.controller.open('missing');h.requests[0].reject(new Error('Farmer not found'));await pending;
 assert.equal(h.controller.isOpen,true);assert.equal(h.dialog.querySelector('#farmer-profile-status').textContent,'Farmer not found');
 const retry=h.dialog.querySelector('#farmer-profile-content').children[0];const again=retry.onclick();h.requests[1].resolve({playerProfile:{username:'Now available'}});await again;
 assert.equal(h.dialog.querySelector('#farmer-profile-content').innerHTML,'Now available');
});

// The admin gift form (only for floris@millstone.nl — see tests/admin-grant.test.mjs for the server-side gate,
// which is the real one; checkAdmin here only ever decides whether this box draws itself at all).
test('the admin gift form stays hidden and empty for anyone but the admin account',async()=>{
 const h=harness({admin:false}),pending=h.controller.open('one');
 h.requests[0].resolve({playerProfile:{username:'Tony'}});await pending;await flush();
 const box=h.dialog.querySelector('#admin-grant');
 assert.equal(box.hidden,true);assert.equal(box.innerHTML,'');
});
test('the admin gift form appears for the admin account, above the leaderboard button in the markup',async()=>{
 const h=harness({admin:true}),pending=h.controller.open('one');
 h.requests[0].resolve({playerProfile:{username:'Tony'}});await pending;await flush();
 const box=h.dialog.querySelector('#admin-grant');
 assert.equal(box.hidden,false);assert.match(box.innerHTML,/admin-grant-give/);
 // Real DOM order (the mock's querySelector does not track it): the static template places #admin-grant before the button.
 const full=readFileSync(new URL('../src/player-profiles.js',import.meta.url),'utf8');
 assert.ok(full.indexOf('id="admin-grant"')<full.indexOf('farmer-profile-back">Back to leaderboard'));
});
test('an empty gift is rejected locally: no confirm, no request',async()=>{
 const h=harness({admin:true}),pending=h.controller.open('one');
 h.requests[0].resolve({playerProfile:{username:'Tony'}});await pending;await flush();
 const box=h.dialog.querySelector('#admin-grant');
 await box.querySelector('#admin-grant-give').onclick();
 assert.equal(box.querySelector('#admin-grant-status').textContent,'Enter at least one amount.');
 assert.equal(h.confirms.length,0);assert.equal(h.requests.length,1,'only the profile fetch, nothing for the grant');
});
test('the message field only appears once "notify" is checked',async()=>{
 const h=harness({admin:true}),pending=h.controller.open('one');
 h.requests[0].resolve({playerProfile:{username:'Tony'}});await pending;await flush();
 const box=h.dialog.querySelector('#admin-grant');
 assert.match(box.innerHTML,/id="admin-grant-message"[^>]*hidden/,'starts hidden in the template — most gifts have no note');
 const notify=box.querySelector('#admin-grant-notify'),message=box.querySelector('#admin-grant-message');
 notify.checked=true;notify.onchange();assert.equal(message.hidden,false);
 notify.checked=false;notify.onchange();assert.equal(message.hidden,true);
});
test('declining the custom confirmation sends nothing to the server',async()=>{
 const h=harness({admin:true,confirmed:false}),pending=h.controller.open('one');
 h.requests[0].resolve({playerProfile:{username:'Tony'}});await pending;await flush();
 const box=h.dialog.querySelector('#admin-grant');box.querySelector('#admin-grant-coins').value='500';
 await box.querySelector('#admin-grant-give').onclick();
 assert.equal(h.confirms.length,1);assert.equal(h.confirms[0].title,'Give Tony?');assert.equal(h.confirms[0].description,'500 coins.');
 assert.equal(h.requests.length,1,'declined — no grant request was sent');
});
test('confirming sends exactly what was entered, including notify and a trimmed message, and reports the result',async()=>{
 const h=harness({admin:true}),pending=h.controller.open('one');
 h.requests[0].resolve({playerProfile:{username:'Tony'}});await pending;await flush();
 const box=h.dialog.querySelector('#admin-grant');
 box.querySelector('#admin-grant-coins').value='1000';box.querySelector('#admin-grant-xp').value='50';box.querySelector('#admin-grant-diamonds').value='0';
 const notify=box.querySelector('#admin-grant-notify');notify.checked=true;notify.onchange();
 box.querySelector('#admin-grant-message').value='  Well played!  ';
 const done=box.querySelector('#admin-grant-give').onclick();await flush();
 assert.equal(h.confirms[0].title,'Give Tony?');assert.equal(h.confirms[0].description,'1000 coins, 50 XP. They will be notified.');assert.equal(h.confirms[0].confirmLabel,'Give');
 // The body was built inside the vm sandbox, so it is a same-shape but different-realm object; compare by value.
 assert.deepEqual(JSON.parse(JSON.stringify(h.requests[1].body)),{operation:'admin_grant',playerId:'one',coins:1000,xp:50,diamonds:0,item:null,itemCount:0,notify:true,message:'Well played!'});
 h.requests[1].resolve({granted:{coins:1000,xp:50,diamonds:0},totals:{level:12}});await done;
 assert.equal(box.querySelector('#admin-grant-status').textContent,'Given: +1000 coins · +50 XP · +0 diamonds. New level: 12. Notified.');
 assert.equal(box.querySelector('#admin-grant-coins').value,'0');
});
test('gifting yourself refreshes your own running farm, so the coin counter and any popup catch up immediately',async()=>{
 const h=harness({admin:true,playerId:'one'}),pending=h.controller.open('one');
 h.requests[0].resolve({playerProfile:{username:'Tony'}});await pending;await flush();
 const box=h.dialog.querySelector('#admin-grant');box.querySelector('#admin-grant-coins').value='500';
 const done=box.querySelector('#admin-grant-give').onclick();await flush();
 h.requests.find(r=>r.body.operation==='admin_grant').resolve({granted:{coins:500,xp:0,diamonds:0},totals:{level:12}});await done;
 assert.equal(h.refreshes.length,1,'window.harvestRefresh was called because the target was the signed-in player');
 assert.deepEqual(h.requests.map(r=>r.body.operation),['player_profile','player_log','admin_grant'],'your own profile also reads your farm log, right after the profile');
});
test('gifting someone else never touches your own running farm',async()=>{
 const h=harness({admin:true,playerId:'admin-id'}),pending=h.controller.open('someone-else');
 h.requests[0].resolve({playerProfile:{username:'Tony'}});await pending;await flush();
 const box=h.dialog.querySelector('#admin-grant');box.querySelector('#admin-grant-coins').value='500';
 const done=box.querySelector('#admin-grant-give').onclick();await flush();
 h.requests[1].resolve({granted:{coins:500,xp:0,diamonds:0},totals:{level:12}});await done;
 assert.equal(h.refreshes.length,0);
});
test('a failed grant shows the server\'s own message and leaves the button usable again',async()=>{
 const h=harness({admin:true}),pending=h.controller.open('one');
 h.requests[0].resolve({playerProfile:{username:'Tony'}});await pending;await flush();
 const box=h.dialog.querySelector('#admin-grant');box.querySelector('#admin-grant-coins').value='10';
 const give=box.querySelector('#admin-grant-give'),done=give.onclick();await flush();
 h.requests[1].reject(new Error('This farmer changed at the same moment. Please try again.'));await done;
 assert.equal(box.querySelector('#admin-grant-status').textContent,'This farmer changed at the same moment. Please try again.');
 assert.equal(give.disabled,false);
});
test('switching to another farmer before the admin check resolves targets the one now open, not the stale one',async()=>{
 const h=harness({admin:true}),one=h.controller.open('one');const two=h.controller.open('two');
 h.requests[1].resolve({playerProfile:{username:'Second'}});await two;
 h.requests[0].resolve({playerProfile:{username:'First'}});await one;await flush();
 const box=h.dialog.querySelector('#admin-grant');box.querySelector('#admin-grant-coins').value='10';
 box.querySelector('#admin-grant-give').onclick();await flush();
 assert.equal(h.requests[2].body.playerId,'two','the rendered form targets the farmer actually selected now, not the stale "one"');
});
