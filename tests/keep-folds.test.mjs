import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {keepFolds} from '../public/keep-folds.js';
import {renderFamilyTournament} from '../public/family-tournament.js';
import {createFarm} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Fold-outs stay open while their window does (16 Oct 2026, the owner, with a screenshot of "How rewards work" in the Farm family
// window: an opened fold-out closed again by itself, now and then). Windows draw their content anew with innerHTML, on a timer, after a
// farm update or the family's or the events' refresh, and a <details> written fresh comes back closed. public/keep-folds.js notes the open
// ones by their data-fold key before, and opens them again after; the window closing forgets them.

// A window (a <dialog>) with its content: innerHTML is read for its <details> tags, which keep their key and open state as the browser's
// would; the dialog sends 'close' when it closes, as a <dialog> does. self: the dialog is the container (the events window).
// el.tap(key,open) is the player tapping a summary: the browser sets open and sends 'toggle' from the fold (it does not bubble, so only a
// listener in the capture phase on the container hears it). Setting .open alone is a browser that sends no 'toggle'.
function win({open=true,self=false}={}){
 const listeners={},on=(type,fn)=>(listeners[type]??=[]).push(fn);let folds=[];
 const dialog={open,addEventListener:on,close(){dialog.open=false;for(const fn of listeners.close??[])fn();},showModal(){dialog.open=true;},
  // A <dialog> closed and opened again at once: its 'close' comes when it is open again.
  closeAndReopen(){for(const fn of listeners.close??[])fn();}};
 const el=self?dialog:{addEventListener:on};
 el.send=target=>{for(const fn of listeners.toggle??[])fn({target});};el.tap=(key,state)=>{const fold=el.fold(key);fold.open=state;el.send(fold);};el.toggles=()=>(listeners.toggle??[]).length;
 Object.assign(el,{writes:0,closest:s=>s==='dialog'?dialog:null,querySelectorAll:s=>s==='details[data-fold]'?folds.filter(f=>f.dataset.fold!==undefined):[],querySelector:()=>({}),setAttribute(){},
  fold:key=>folds.find(f=>f.dataset.fold===key),unkeyed:()=>folds.find(f=>f.dataset.fold===undefined)});
 Object.defineProperty(el,'innerHTML',{get:()=>'',set(html){el.writes++;folds=[...String(html).matchAll(/<details([^>]*)>/g)].map(([,attrs])=>({dataset:{fold:attrs.match(/data-fold="([^"]*)"/)?.[1]},open:/\sopen(?=[\s>]|$)/.test(attrs)}));}});
 return {el,dialog};
}
const page=(...folds)=>folds.map(([key,label,open=false])=>`<details class="x"${key?` data-fold="${key}"`:''}${open?' open':''}><summary>${label}</summary><p>…</p></details>`).join('');

test('keepFolds: an open fold-out stays open when its window draws it anew, found by its data-fold key, not by its place or its words',()=>{
 const {el}=win();
 keepFolds(el,page(['how-rewards','How rewards work'],['past-weeks','Previous weeks'],[null,'No key']));
 assert.equal(el.writes,1);assert.equal(el.fold('how-rewards').open,false,'a fresh window: closed, as before');
 el.fold('how-rewards').open=true;el.unkeyed().open=true;   // the player opens two
 // The refresh: other order, other numbers in the summaries.
 keepFolds(el,page(['past-weeks','Vorige weken (3)'],['how-rewards','Zo werken de prijzen (12)'],[null,'No key']));
 assert.equal(el.writes,2);assert.equal(el.fold('how-rewards').open,true,'still open');assert.equal(el.fold('past-weeks').open,false,'the other stays closed');
 assert.equal(el.unkeyed().open,false,'a fold-out without a key is left as its HTML says');
 // The player closes it and opens the other: so it stays, also when written with write().
 el.fold('how-rewards').open=false;el.fold('past-weeks').open=true;
 keepFolds(el,()=>{el.innerHTML=page(['how-rewards','How rewards work'],['past-weeks','Previous weeks']);});
 assert.equal(el.fold('how-rewards').open,false,'closed by the player, closed after the refresh');assert.equal(el.fold('past-weeks').open,true);
});

test('keepFolds: a fold the player closed stays closed though its HTML says open; one it has not seen keeps its HTML; keys come and go',()=>{
 const {el}=win();
 keepFolds(el,page(['create','Start your own family',true]));assert.equal(el.fold('create').open,true,'open by its HTML');
 el.fold('create').open=false;
 keepFolds(el,page(['create','Start your own family',true],['new','New',true]));
 assert.equal(el.fold('create').open,false,'the player closed it');assert.equal(el.fold('new').open,true,'a key it does not know yet: as written');
 // A tab without the fold, then back: it is still open (the window stayed open).
 el.fold('new').open=false;el.fold('create').open=true;
 keepFolds(el,page(['other','Another tab']));assert.equal(el.fold('other').open,false);assert.equal(el.fold('create'),undefined);
 keepFolds(el,page(['create','Start your own family'],['new','New',true]));assert.equal(el.fold('create').open,true);assert.equal(el.fold('new').open,false);
});

test('keepFolds: closing the window forgets, so its fold-outs start closed next time; closed and opened again at once keeps them',()=>{
 const {el,dialog}=win();
 keepFolds(el,page(['rules','How events work']));el.fold('rules').open=true;
 dialog.closeAndReopen();keepFolds(el,page(['rules','How events work']));assert.equal(el.fold('rules').open,true,'one window\'s button opening another in its place');
 dialog.close();
 keepFolds(el,page(['rules','How events work']));assert.equal(el.fold('rules').open,false,'drawn while closed: starts closed');
 dialog.showModal();el.fold('rules').open=true;keepFolds(el,page(['rules','How events work']));assert.equal(el.fold('rules').open,true,'and is kept again');
 // A window that opens first and draws after (the Family Hall): its old content still has the fold open, and that is not kept.
 dialog.close();dialog.showModal();keepFolds(el,page(['rules','How events work']));assert.equal(el.fold('rules').open,false);
 // The dialog is the container itself (the events window).
 const events=win({self:true});
 keepFolds(events.el,page(['how-events','How events work']));events.el.fold('how-events').open=true;
 keepFolds(events.el,page(['how-events','How events work']));assert.equal(events.el.fold('how-events').open,true);
 events.el.close();keepFolds(events.el,page(['how-events','How events work']));assert.equal(events.el.fold('how-events').open,false);
});

test('keepFolds: a fold the player closes stays closed when another tab of the window is written without it (the Estate, Today)',()=>{
 // The Estate: Projects (and Chores and Medals since 23 Oct 2026) go through keepFolds, Stall, Master and Bonuses write it themselves; Today's
 // Challenges the same for today-content. Each open and close is noted when the player makes it, not only when keepFolds draws.
 const {el,dialog}=win(),projects=()=>keepFolds(el,page(['road','The road ahead'])),stall=()=>{el.innerHTML='<section class="stall-hero">…</section>';};
 projects();el.tap('road',true);projects();assert.equal(el.fold('road').open,true,'a farm update keeps it open');
 el.tap('road',false);stall();projects();assert.equal(el.fold('road').open,false,'closed, then Stall, then Projects: still closed');
 el.tap('road',true);stall();projects();assert.equal(el.fold('road').open,true,'opened, then Stall, then Projects: still open');
 // Today: Replace this order opened during a refresh, closed, Challenges, Orders.
 const today=win(),orders=()=>keepFolds(today.el,page(['replace-3-0','Replace this order'],['replace-4-0','Replace this order'])),challenges=()=>{today.el.innerHTML='<div class="daily-bonus-card"></div>';};
 orders();today.el.tap('replace-3-0',true);orders();today.el.tap('replace-3-0',false);today.el.tap('replace-4-0',true);challenges();orders();
 assert.equal(today.el.fold('replace-3-0').open,false);assert.equal(today.el.fold('replace-4-0').open,true);
 // The dialog's own 'toggle' (a <dialog> sends one too), a fold without a key, no target: passed over. After the window closes nothing
 // is noted, and the listener is added once.
 assert.doesNotThrow(()=>{el.send(dialog);el.send({open:true});el.send({dataset:{},open:true});el.send(null);});assert.equal(el.toggles(),1);
 dialog.close();el.tap('road',true);stall();projects();assert.equal(el.fold('road').open,false,'closed window: starts closed');
 dialog.showModal();projects();projects();assert.equal(el.toggles(),1,'one listener however often the window opens');
});

test('keepFolds never throws for itself: no container, a container without a DOM, a browser without <details>, a window without a dialog',()=>{
 let wrote=0;
 assert.doesNotThrow(()=>keepFolds(null,'<p>x</p>'));assert.doesNotThrow(()=>keepFolds(undefined,()=>wrote++));assert.equal(wrote,1,'write() still runs');
 const bare={innerHTML:''};keepFolds(bare,'<p>plain</p>');keepFolds(bare,'<p>again</p>');assert.equal(bare.innerHTML,'<p>again</p>','an element without querySelectorAll or closest is only written');
 const broken={innerHTML:'',closest(){throw new Error('no');},querySelectorAll(){throw new Error('no');}};
 assert.doesNotThrow(()=>{keepFolds(broken,'<p>1</p>');keepFolds(broken,'<p>2</p>');});assert.equal(broken.innerHTML,'<p>2</p>');
 // No <details> support: open is no boolean, and is neither read nor set.
 const old={folds:[],innerHTML:'',closest:()=>null,querySelectorAll(){return old.folds;}};
 keepFolds(old,()=>{old.folds=[{dataset:{fold:'a'}}];});old.folds[0].open='yes';
 keepFolds(old,()=>{old.folds=[{dataset:{fold:'a'}}];});assert.equal(old.folds[0].open,undefined);
 // Outside a dialog the folds are kept for as long as the page is open.
 const loose={folds:[],innerHTML:'',closest:()=>null,querySelectorAll(){return loose.folds;}};
 keepFolds(loose,()=>{loose.folds=[{dataset:{fold:'a'},open:false}];});loose.folds[0].open=true;
 keepFolds(loose,()=>{loose.folds=[{dataset:{fold:'a'},open:false}];});assert.equal(loose.folds[0].open,true);
 // write() throwing is the renderer's own error, as before.
 assert.throws(()=>keepFolds(win().el,()=>{throw new Error('render');}),/render/);
});

// Every window that draws its fold-outs anew, and what draws it (16 Oct 2026): each fold-out has its key, each render goes through keepFolds.
const keys=source=>[...source.matchAll(/<details\b[^>]*>/g)].map(m=>m[0]);
const keyed=(file,{except=[]}={})=>{const source=read(file);for(const tag of keys(source))if(!except.some(e=>tag.includes(e)))assert.match(tag,/ data-fold="[^"]+"/,`${file}: ${tag}`);return source;};

test('the Farm family window: every fold-out has its key, one per member menu, and the 30-second read and every action keep them',()=>{
 const ui=keyed('public/family-ui.js'),tour=keyed('public/family-tournament.js');
 assert.match(ui,/^import \{keepFolds\} from '\.\/keep-folds\.js';$/m);
 assert.match(ui,/keepFolds\(content,view\.family\?\(\(\{week,sharing,members,tournament,stats,settings\}\[tab\]\)\?\?week\)\(\):landing\(\)\);/,'This week, Members, Tournament, Stats, Settings and the landing');
 assert.doesNotMatch(ui,/content\.innerHTML=view\.family/);
 const fixed=[...(ui+tour).matchAll(/data-fold="([a-z-]+)"/g)].map(m=>m[1]);
 assert.deepEqual(fixed.sort(),['chest','create','gives','how-rewards','order-done','order-later','order-rewards','past-weeks','tournament-goods'],'unique in the window');
 assert.match(ui,/<details class="family-member-menu" data-fold="member-\$\{m\.id\}">/,'each member\'s menu its own');
 // A member's menu still closes once an option is picked.
 assert.match(ui,/const type=b\.dataset\.familyAction;\n[^\n]*\n   const menu=b\.closest\('\.family-member-menu'\);if\(menu\)menu\.open=false;/);
 // How rewards work, as the owner saw it: kept through a refresh of the Tournament tab.
 const view={family:{id:'home'},endsAt:Date.now()+3600000,tournament:{past:[],top:[],placePrizes:[100],placeShares:[100],poolSteps:[100,200,300],firstPrize:100,firstPrizeMin:100,firstPrizeMax:5000,activeFamilies:2,activePlayers:3,pool:200,yourRank:null}};
 const {el}=win(),draw=()=>keepFolds(el,renderFamilyTournament({view,now:Date.now(),emblem:()=>'',rewards:'',preview:''}));
 draw();assert.equal(el.fold('how-rewards').open,false);el.fold('how-rewards').open=true;draw();
 assert.equal(el.fold('how-rewards').open,true);assert.equal(el.fold('past-weeks').open,false);
});

test('the events window: How events work stays open through the 30-second refresh and starts closed after the window closes',async()=>{
 const {createLiveEventsUI}=await import('../public/live-events-ui.js');
 const {el:dialog}=win({self:true,open:false}),rules=()=>dialog.fold('how-events');
 const doc={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>dialog,body:{append(){}}};
 const previous=globalThis.document;globalThis.document=doc;
 const ui=createLiveEventsUI({state:createFarm(Date.now()),notify(){},refreshFarm(){},document:doc,bridge:{request:async()=>({events:[]})}});
 try{
  await ui.open();
  assert.equal(rules().open,false);rules().open=true;
  await ui.load();assert.equal(rules().open,true,'the refresh keeps it open');
  dialog.close();await ui.open();assert.equal(rules().open,false,'opened again: closed, as before');
 }finally{ui.dispose();globalThis.document=previous;}
 assert.match(read('public/live-events-ui.js'),/<details class="family-extra event-rules" data-fold="how-events">/);
});

test('the Estate, Today and the diamond shop: The road ahead, Replace this order and the field and batch pickers keep their state',()=>{
 const growth=keyed('public/growth-ui.js'),retention=keyed('public/retention-ui.js'),boosts=read('public/boosts-ui.js'),picker=keyed('public/field-picker.js');
 for(const [name,source] of [['growth',growth],['retention',retention],['boosts',boosts]])assert.match(source,/^import \{keepFolds\} from '\.\/keep-folds\.js';$/m,name);
 assert.match(growth,/<details class="estate-road" data-fold="road">/);assert.match(growth,/keepFolds\(\$\('estate-content'\),`\$\{lead\('landmark',/,'the projects tab');
 // A replaced order is a new order: its fold starts closed (its revision is in the key), so Spend & replace is not right there again.
 assert.match(retention,/<details class="order-replace" data-fold="replace-\$\{o\.id\}-\$\{o\.revision\}">/);
 assert.match(retention,/keepFolds\(\$\('today-content'\),`<p class="section-copy orders-lead">/,'the delivery orders');
 assert.doesNotMatch(retention,/\$\('today-content'\)\.innerHTML=`<p class="section-copy orders-lead">/);
 assert.equal([...picker.matchAll(/<details class="field-picker" id="\$\{id\}" data-fold="\$\{id\}"/g)].length,2,'the field picker and the batch picker');
 assert.match(boosts,/keepFolds\(\$\('boost-catalog'\),`<section class="shop-section" id="shop-finish">/);assert.doesNotMatch(boosts,/\$\('boost-catalog'\)\.innerHTML=/);
});

test('the building window, the seed shop and the Buildings list: their fold-outs and the locked folds keep their state; the Factory keeps its own',()=>{
 const ui=keyed('public/economy-ui.js',{except:['factory-recipe-group']}),progression=read('public/progression-ui.js');
 assert.match(ui,/^import \{keepFolds\} from '\.\/keep-folds\.js';$/m);
 assert.match(ui,/<details class="build-recipes" data-fold="recipes"><summary>/);
 // The innerHTML and the locked fold it adds after it are inside one keepFolds, so that fold is kept too.
 assert.match(ui,/keepFolds\(\$\('crop-catalog'\),\(\)=>\{\$\('crop-catalog'\)\.innerHTML=[^]*?foldLocked\(\$\('crop-catalog'\),'\[data-choose-crop\]:not\(\.is-season\)',[^\n]*,'Seeds to unlock','seeds-locked'\);\}\);/);
 assert.match(ui,/keepFolds\(\$\('building-catalog'\),\(\)=>\{\$\('building-catalog'\)\.innerHTML=[^]*?'Buildings to unlock','buildings-locked'\);[^]*?foldLocked\(\$\('building-catalog'\),'\[data-open-place\]',[^\n]*,'Places to unlock','places-locked'\);\}\);/);
 assert.match(ui,/keepFolds\(\$\('building-content'\),\(\)=>\{\$\('building-content'\)\.innerHTML=content;[^\n]*\n[^\n]*foldLocked\(recipeList,'\[data-recipe-card\]',[^\n]*,'Coming later','recipes-locked'\);\}\);/);
 assert.doesNotMatch(ui,/^ *\$\('(?:crop-catalog|building-catalog|building-content)'\)\.innerHTML=/m,'no list is written past keepFolds');
 assert.deepEqual([...ui.matchAll(/foldLocked\([^\n]*?,'([a-z]+-locked)'\)/g)].map(m=>m[1]),['seeds-locked','buildings-locked','places-locked','recipes-locked'],'every locked fold has its key');assert.equal([...ui.matchAll(/foldLocked\(/g)].length,4);
 assert.match(progression,/export function foldLocked\(container,selector,isLocked,title,fold=''\)\{/);assert.match(progression,/details\.className='future-unlocks';if\(fold\)details\.dataset\.fold=fold;/);
 // The Factory's groups keep their own open set (kept while the game runs), the fertilizer picker its own open state and scroll.
 assert.match(ui,/data-factory-group="\$\{source\}" \$\{openFactoryGroups\.has\(source\)\?'open':''\}>/);assert.match(ui,/\$\('fertilizer-field-picker'\)\.open=!!pickerOpen;/);
});

test('keep-folds.js is preloaded with the other modules',()=>{
 assert.match(read('public/farm.html'),/<link rel="modulepreload" href="\/keep-folds\.js">/);
 for(const page of ['crazygames','kongregate','discord'])assert.match(read(`public/${page}.html`),/<link rel="prefetch" href="\/keep-folds\.js">/,page);
});
