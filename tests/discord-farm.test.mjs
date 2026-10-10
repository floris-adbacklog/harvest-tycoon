// The farm inside Discord (Oct 2026): the game's own code, shared with the website, CrazyGames and Kongregate, as a Discord player gets
// it. The page around the farm (public/discord.html, src/discord-page.js) hands over a portal like Kongregate's, plus openLink: links
// out go through Discord's own window. Discord runs no script or handler written in a page, so the farm page has none.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {portal as portalAround,portalOff,portalChat,portalLogIn,PORTAL_FEATURES,PRIVACY_URL,PRIVACY_CONTACT,privacyContact,openOut} from '../public/portal.js';
import {createPortalUI} from '../src/portal-ui.js';
import {wikiArticle,wikiQuick,WIKI_TOPICS} from '../public/wiki-content.js';
import {groupPills,groupLine} from '../src/chat-ui.js';
import {linkify} from '../src/popup-ui.js';
import {setAppBadge} from '../public/app-badge.js';
import {portalTips,LOADING_TIPS,PORTAL_HIDDEN_TIPS,watchLoading} from '../public/loading-screen.js';
import {renderLanguageSettings} from '../public/language-settings.js';
import {provider} from '../src/admin-players.js';
import {createDiscordSwitch,switchWarning,SWITCH_TEXT} from '../public/discord-link-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};

// The portal as src/discord-page.js hands it to the farm: every feature off, a signed-in player (no guests), the chat on, who to ask
// about privacy, and the way out for the privacy policy (Discord's openExternalLink).
function discordPortal(openLink=url=>{opened.push(url);return Promise.resolve({opened:true});}){
 return {name:'discord',features:Object.fromEntries(PORTAL_FEATURES.map(f=>[f,false])),guest:false,settings:{muteAudio:false,disableChat:false},userAvailable:true,
  privacyContact:PRIVACY_CONTACT,reload(){},reopen(){},event(){},openLink};
}
const opened=[];
const DISCORD=discordPortal();
const KONG={name:'kongregate',guest:false,features:Object.fromEntries(PORTAL_FEATURES.map(f=>[f,false])),settings:{muteAudio:false,disableChat:false},userAvailable:true,privacyContact:PRIVACY_CONTACT};
const CRAZY={name:'crazygames',guest:true,features:Object.fromEntries(PORTAL_FEATURES.map(f=>[f,false])),settings:{muteAudio:false,disableChat:false}};
// A tap, on the privacy policy or somewhere else.
const tap=(href=PRIVACY_URL)=>{const event={stopped:0,target:{closest:sel=>sel===`a[href="${href}"]`?{href}:null},preventDefault(){event.stopped++;}};return event;};

test('the portal: every feature off, the chat on for every player, read from the page around the game',()=>{
 for(const feature of PORTAL_FEATURES)assert.equal(portalOff(feature,DISCORD),true,feature);
 assert.equal(portalChat(DISCORD),'on','no guests: everyone in the game is signed in with Discord');assert.equal(portalLogIn(DISCORD),true);
 assert.equal(portalAround({parent:{harvestBridge:{portal:DISCORD}}}),DISCORD);assert.equal(portalAround({parent:{harvestBridge:{pending:true},harvestPortal:DISCORD}}),DISCORD);
 const saved=globalThis.window;globalThis.window={parent:{harvestPortal:DISCORD}};
 try{assert.equal(linkify('See https://www.harvesttycoon.com/partners'),'See https://www.harvesttycoon.com/partners','a web address stays words');}
 finally{if(saved===undefined)delete globalThis.window;else globalThis.window=saved;}
});

test('the privacy policy opens through Discord\'s own window; other taps, other portals and the website stay as they were',async()=>{
 opened.length=0;
 const policy=tap();assert.equal(openOut(policy,DISCORD),true);assert.equal(policy.stopped,1,'not as a plain link');assert.deepEqual(opened,[PRIVACY_URL]);
 const other=tap('#wiki-crops');assert.equal(openOut(other,DISCORD),false);assert.equal(other.stopped,0);assert.deepEqual(opened,[PRIVACY_URL]);
 assert.equal(openOut({target:null,preventDefault(){throw new Error('no');}},DISCORD),false,'a tap on nothing');
 // Kongregate, CrazyGames and the website as before: a plain link in a new tab.
 for(const found of [KONG,CRAZY,null]){const event=tap();assert.equal(openOut(event,found),false,found?.name??'website');assert.equal(event.stopped,0);}
 // Discord saying no (or the player closing its window) is no error in the game.
 const refused=discordPortal(()=>Promise.reject(new Error('closed')));assert.equal(openOut(tap(),refused),true);await settle();
 // The farm page: one listener for every privacy link in the frame (loading screen, Settings, the wiki opened later), before the link
 // itself; Settings › Privacy has the policy and who to ask, as on Kongregate.
 opened.length=0;
 const listeners=[],nodes=[],make=tag=>{const n={tag,className:'',textContent:'',innerHTML:'',children:[],append(c){this.children.push(c);},prepend(c){this.children.unshift(c);},remove(){n.removed=true;}};nodes.push(n);return n;};
 const privacy=make('section');privacy.querySelectorAll=()=>[];const privacyLink={href:'/privacy'};
 const doc={documentElement:{dataset:{}},querySelector:()=>null,querySelectorAll:sel=>sel==='a[href="/privacy"]'?[privacyLink]:[],getElementById:id=>id==='privacy-settings'?privacy:null,createElement:make,
  addEventListener:(type,fn,capture)=>listeners.push({type,fn,capture})};
 createPortalUI({portal:DISCORD,doc});
 assert.equal(doc.documentElement.dataset.portal,'discord');assert.equal(privacyLink.href,PRIVACY_URL);
 assert.match(privacy.children[0].innerHTML,/^By playing you agree to our <a href="https:\/\/www\.harvesttycoon\.com\/privacy" target="_blank" rel="noopener">Privacy Policy<\/a>\.$/);
 assert.equal(privacy.children[1].textContent,privacyContact());
 assert.equal(listeners.length,1);assert.equal(listeners[0].type,'click');assert.equal(listeners[0].capture,true,'before anything else on the page sees the tap');
 const event=tap();listeners[0].fn(event);assert.equal(event.stopped,1);assert.deepEqual(opened,[PRIVACY_URL]);
 // Kongregate and CrazyGames get no listener (their fake page has no addEventListener at all).
 for(const found of [KONG,CRAZY]){const page={...doc,addEventListener(){throw new Error(`${found.name}: no listener`);}};createPortalUI({portal:found,doc:page});}
});

test('the wiki on Discord: its own lines, no guests, nothing of CrazyGames or Kongregate, the policy the only link out',()=>{
 const ctx={level:120,portal:'discord',href:id=>`#wiki-${id}`},html=WIKI_TOPICS.map(t=>wikiArticle(t.id,ctx).html).join('\n');
 for(const gone of [/Buying diamonds/,/Play it as an app/,/Install the app/,/Invite a friend/,/Confirm your email/,/Share my farm/,/delete-account/,/Stripe;/,/Reminders/,/Forgot your password/,/home screen/,/CrazyGames/,/Kongregate/,/As a guest/,/Starter Pack/,/Who can chat/])
  assert.doesNotMatch(html,gone,String(gone));
 assert.match(html,/Your farm on Discord/);assert.match(html,/Your farm belongs to your Discord account: open the game in Discord on any device and it is there\./);
 assert.match(html,/Your farm is saved on our server with your Discord account/);assert.match(html,/Questions about your privacy\? Email info@harvesttycoon\.com\./);
 const links=[...html.matchAll(/href="([^"]*)"/g)].map(m=>m[1]);
 assert.deepEqual([...new Set(links.filter(href=>!href.startsWith('#')))],[PRIVACY_URL],'the wiki stays in the game; the policy is the one link out');
 assert.doesNotMatch(html,/mailto:/);assert.doesNotMatch(wikiQuick({portal:'discord'}),/>App</);
 assert.equal(WIKI_TOPICS.map(t=>wikiArticle(t.id,{...ctx,portal:DISCORD}).html).join('\n'),html,'the portal object reads the same as its name');
 // CrazyGames and Kongregate as before.
 const cg=WIKI_TOPICS.map(t=>wikiArticle(t.id,{level:120,portal:true}).html).join('\n');
 assert.match(cg,/Who can chat/);assert.match(cg,/Your farm on CrazyGames/);assert.doesNotMatch(cg,/Discord|Kongregate/);
 const kg=WIKI_TOPICS.map(t=>wikiArticle(t.id,{level:120,portal:'kongregate'}).html).join('\n');
 assert.match(kg,/Your farm on Kongregate/);assert.doesNotMatch(kg,/Discord|Who can chat|CrazyGames/);
});

test('the chat and the admin: the Discord pill, no app pills, the app notice by name, the group filter, Signs in with Discord',()=>{
 assert.deepEqual(groupPills({discord:true}),['Plays on Discord']);
 const saved=globalThis.window;globalThis.window={parent:{harvestPortal:DISCORD}};
 try{
  const sent=groupLine({meta:{group:{filters:{platform:'browser',notPlatform:'android',discord:true}}}});
  assert.doesNotMatch(sent,/Android|iPhone/,'no app of ours is named on Discord');assert.match(sent,/Plays in the browser/);assert.match(sent,/Plays on Discord/);
 }finally{if(saved===undefined)delete globalThis.window;else globalThis.window=saved;}
 const chat=read('src/chat-ui.js');
 assert.match(chat,/discord:'The app is not available on Discord\.'/);assert.match(chat,/showCenterNotice\(dialog,NO_APP\[bridge\.portal\?\.name\]\?\?NO_APP\.crazygames\)/);
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/<input type="checkbox" id="admin-dm-discord">Discord accounts only<\/label>/);assert.match(admin,/if\(\$dm\('discord'\)\.checked\)f\.discord=true;/);
 assert.equal(provider('discord'),'Discord');assert.equal(provider('kongregate'),'Kongregate');assert.equal(provider('crazygames'),'CrazyGames');
});

test('no number on an app icon, no tips about inviting or the app, and Try again and a new language open only our own page',async()=>{
 const set=[];
 await setAppBadge(3,{navigator:{setAppBadge:async n=>set.push(n)},caches:null,parent:{harvestBridge:{portal:DISCORD}}});assert.deepEqual(set,[]);
 await setAppBadge(2,{navigator:{setAppBadge:async n=>set.push(n)},caches:null,parent:{harvestBridge:{}}});assert.deepEqual(set,[2],'the website as before');
 const tips=portalTips(LOADING_TIPS,{documentElement:{dataset:{portal:'discord'}}});
 assert.ok(tips.length<LOADING_TIPS.length&&tips.every(([picture])=>!PORTAL_HIDDEN_TIPS.includes(picture)));
 // Settings › Language: the Discord page reloads itself (never Discord's own window).
 let reloads=0;const savedWindow=globalThis.window,savedDocument=globalThis.document;
 globalThis.document??={querySelector:()=>null};const select={innerHTML:'',value:'',addEventListener:(type,fn)=>{select.on=fn;},closest:()=>null};
 globalThis.window={parent:{harvestPortal:{...DISCORD,reload:()=>reloads++}},get top(){throw new Error('window.top must not be touched');}};
 try{renderLanguageSettings(select);select.value='de';select.on();assert.equal(reloads,1);}
 finally{if(savedWindow)globalThis.window=savedWindow;else delete globalThis.window;if(!savedDocument)delete globalThis.document;}
 // Try again on "Your farm could not load": the Discord page opens the farm again.
 let reopened=0;const retry={onclick:null};
 const doc={hidden:false,getElementById:()=>null,querySelector:sel=>sel==='#error .primary-button'?retry:null};
 const win={setInterval:()=>7,clearInterval(){},setTimeout(){},get parent(){throw new Error('the page around is the portal\'s to reload');}};
 watchLoading({},{...DISCORD,reopen:()=>reopened++},{doc,win,storage:null}).done(true);retry.onclick();assert.equal(reopened,1);
});

test('the farm page follows Discord\'s rules: no handler or script written in the page but the import map; its buttons wired in files',()=>{
 const farm=read('public/farm.html');
 assert.doesNotMatch(farm,/<[a-zA-Z][^<>]*?\son[a-z]+\s*=/,'no onclick and the like');
 const inline=[...farm.matchAll(/<script\b([^>]*)>/g)].map(m=>m[1]).filter(attrs=>!/\ssrc="/.test(attrs));
 assert.deepEqual(inline,[' type="importmap"'],'the import map has to be in the page (no file can hold one)');
 // Nor in what the farm frame writes as HTML.
 const code=[['public',f=>f.endsWith('.js')&&f!=='lucide-icons.js'],['src',f=>f.endsWith('.js')]].flatMap(([dir,keep])=>readdirSync(new URL(`../${dir}/`,import.meta.url)).filter(keep).map(f=>[`${dir}/${f}`,read(`${dir}/${f}`)]));
 assert.ok(code.length>100);
 for(const [path,text] of code)assert.doesNotMatch(text,/<[a-zA-Z][^<>]*?\son[a-z]+\s*=/,path);
 // The two buttons that had one: the boosts pill opens the shop as the diamonds do, Try again opens the page again (public/loading-screen.js).
 assert.match(farm,/<button id="active-boosts" class="active-boosts" hidden aria-label="View active boosts"><\/button>/);
 assert.match(read('public/boosts-ui.js'),/\$\('active-boosts'\)\.addEventListener\('click',\(\)=>\$\('diamond-button'\)\.click\(\)\);/);
 assert.match(farm,/<p id="error-message">Check your connection and try again\.<\/p><button class="primary-button">Try again<\/button>/);
 assert.match(read('public/loading-screen.js'),/const retry=doc\.querySelector\('#error \.primary-button'\);if\(retry\)retry\.onclick=reload;/);
 // The icons are drawn by their own file as it loads (scripts/build-lucide-subset.mjs makes it that way on every deploy).
 assert.match(read('public/lucide-icons.js'),/\ncreateIcons\(\);\n\}\)\(\);\n$/);
 // The portal code never reaches into Discord's own window.
 for(const path of ['public/portal.js','src/portal-ui.js','public/app-badge.js'])assert.doesNotMatch(read(path).replace(/\/\/[^\n]*/g,''),/window\.top|top\.location/,path);
});

// Settings › Your account, in the Activity, for a farm made on Discord only (Oct 2026, public/discord-link-ui.js): "Play your
// harvesttycoon.com farm here". A clear warning first; then the page around the game (src/discord-page.js linkExisting) opens the
// website in Discord's window and waits. This farm is deleted by our server only once the farmer taps Link on the website.
function settingsPage({level='12'}={}){
 const made=[],account={children:[],append(child){this.children.push(child);}},sound={closed:0,close(){this.closed++;}};
 const part=()=>({textContent:'',disabled:false,listeners:{},addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},click(){for(const fn of this.listeners.click??[])fn();}});
 const doc={
  querySelector:sel=>sel==='.settings-account'?account:null,
  getElementById:id=>id==='discord-switch'?made.find(row=>account.children.includes(row))??null:id==='level'?{textContent:level}:id==='sound-dialog'?sound:null,
  createElement(tag){const row={tag,id:'',className:'',parts:{'[data-switch-title]':part(),'[data-switch-copy]':part(),'[data-switch]':part(),'[data-switch-message]':part()},set innerHTML(v){this.html=v;},querySelector(sel){return this.parts[sel];}};made.push(row);return row;}
 };
 return {doc,account,sound,made};
}
test('Settings in the Activity: a Discord farm can make way for the farmer\'s harvesttycoon.com farm, after a clear warning',async()=>{
 let linked=0,answer={opened:true};const asked=[];let yes=true;
 const portal={...discordPortal(),discordOnly:true,get linkExisting(){return this.discordOnly?async()=>{linked++;if(answer instanceof Error)throw answer;return answer;}:undefined;}};
 const page=settingsPage(),ui=createDiscordSwitch({portal,farmer:()=>'Sunny Acres ',level:()=>3,doc:page.doc,ask:async o=>{asked.push(o);return yes;}});
 const row=page.account.children[0];
 assert.equal(row,ui.row);assert.equal(row.id,'discord-switch');assert.equal(row.className,'discord-switch');
 assert.equal(row.parts['[data-switch-title]'].textContent,'Play your harvesttycoon.com farm here');assert.equal(row.parts['[data-switch]'].textContent,'Link my farm');
 assert.equal(row.parts['[data-switch-copy]'].textContent,SWITCH_TEXT.copy);assert.doesNotMatch(row.html,/\son[a-z]+=/,'no handler in the markup (Discord runs none)');
 assert.equal(createDiscordSwitch({portal,doc:page.doc,ask:async()=>true}),null,'once');
 // The warning: this farm by name and level (the top bar's), deleted for good; red, and Keep this farm is the way out.
 row.parts['[data-switch]'].click();await settle();
 assert.equal(asked.length,1);assert.equal(asked[0].title,'Play your harvesttycoon.com farm here?');assert.equal(asked[0].tone,'danger');
 assert.equal(asked[0].description,'Your Discord farm Sunny Acres (level 12) will be deleted and Discord opens your harvesttycoon.com farm instead. This cannot be undone.');
 assert.equal(asked[0].confirmLabel,'Continue');assert.equal(asked[0].cancelLabel,'Keep this farm');
 assert.equal(linked,1);assert.equal(page.sound.closed,1,'Settings closes: the page around the game shows its waiting card');
 // Keep this farm: nothing happens.
 yes=false;assert.equal(await ui.start(),false);assert.equal(linked,1);yes=true;
 // No in Discord's own window: the farm stays as it is, Settings too, no message.
 answer={opened:false};assert.equal(await ui.start(),false);assert.equal(linked,2);assert.equal(page.sound.closed,1);assert.equal(row.parts['[data-switch-message]'].textContent,'');
 // It could not start (our server, Discord): the page's own words under the button, which works again.
 answer=new Error('We could not open harvesttycoon.com. Please try again.');assert.equal(await ui.start(),false);
 assert.equal(row.parts['[data-switch-message]'].textContent,'We could not open harvesttycoon.com. Please try again.');assert.equal(row.parts['[data-switch]'].disabled,false);
 // The farm open is no longer a Discord one by the time of the tap: nothing is asked of the page.
 portal.discordOnly=false;assert.equal(await ui.start(),false);assert.equal(linked,3);assert.equal(row.parts['[data-switch-message]'].textContent,SWITCH_TEXT.failed);
 // The level from the farm's start when the top bar has none yet.
 const early=settingsPage({level:''}),seen=[];createDiscordSwitch({portal:{...discordPortal(),discordOnly:true,linkExisting:async()=>({opened:false})},farmer:()=>'Sunny Acres',level:()=>7,doc:early.doc,ask:async o=>{seen.push(o);return false;}}).start();
 await settle();assert.equal(seen[0].description,switchWarning('Sunny Acres',7));
 assert.doesNotMatch(switchWarning('{0}','{1}'),/·/);
});
test('the row is nowhere else: the website, the other portals, a harvesttycoon.com farm played in Discord',()=>{
 const link=async()=>({opened:true});
 for(const [why,portal] of [['the website',null],['CrazyGames',{...CRAZY,discordOnly:true,linkExisting:link}],['Kongregate',{...KONG,discordOnly:true,linkExisting:link}],
  ['a website farm in Discord',{...discordPortal(),discordOnly:false,linkExisting:link}],['no way to link',{...discordPortal(),discordOnly:true}],['not said',{...discordPortal(),linkExisting:link}]]){
  const page=settingsPage();assert.equal(createDiscordSwitch({portal,doc:page.doc,ask:async()=>{throw new Error('never asked');}}),null,why);assert.equal(page.account.children.length,0,why);
 }
 // The frame asks for it on every portal and lets the portal decide; the website never asks.
 const cloud=read('src/game-cloud.js');
 assert.match(cloud,/if\(portal\)createDiscordSwitch\(\{portal,farmer:farmerName,level:\(\)=>firstLevel\}\);/);
 const css=read('public/settings.css');
 assert.match(css,/#sound-dialog \.discord-switch\{display:grid;grid-template-columns:minmax\(0,1fr\) auto;[^}]*border:1px solid #e2d7cb;border-radius:14px;background:#f3ede7\}/,'the cream of the Settings rows');
});

