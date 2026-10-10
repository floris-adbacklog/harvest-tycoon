// A farm from harvesttycoon.com in the Discord Activity (Oct 2026), the website's side: the link from Discord
// (www.harvesttycoon.com/discord-link?t=…) reaches the farm through vercel.json, public/app-links.js and src/main.js, and the farm asks
// its farmer "Play this farm on Discord?" (public/discord-link-ui.js) with the farmer's own session (src/main.js bridge.discordLink).
// Link gets a state from our server (discord-auth begin, bound to the farmer's account) and goes to Discord with it
// (bridge.discordVerify); Discord comes back through /discord-link/callback with its code and that state, in this tab or a new one,
// which links only for that account and the ticket's own Discord account. Never on a portal; the home page looks and works as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {withoutOpen,discordTicket,discordAuthorizeUrl,discordBack,DISCORD_CALLBACK,DISCORD_CLIENT_ID,OPEN_SCREENS} from '../public/app-links.js';
import vm from 'node:vm';
import {openIntent,openIntentOfUrl} from '../public/app-links.js';
import {createDiscordLinkDialog,createDiscordUnlink,linkProblem,linkQuestion,LINK_TEXT,UNLINK_TEXT} from '../public/discord-link-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
// A ticket as discord-auth makes them: 32 random bytes in base64url. S, S2, S3: Link's states as its op begin makes them (the same
// form). C: a code from Discord.
const T=Buffer.from(Array.from({length:32},(_,i)=>i*7+3)).toString('base64url'),C='Nh7vTDYsFcdgNLnnLijcl7Ku7bEEeee';
const [S,S2,S3]=[5,6,7].map(n=>Buffer.alloc(32,n).toString('base64url'));

test('the link from Discord: /discord-link keeps its ticket on the way to the game, and the address loses it once read',()=>{
 assert.equal(T.length,43);assert.equal(discordTicket(T),T);
 assert.ok(OPEN_SCREENS.includes('discord-link'));
 // Vercel keeps the query of a redirect and adds the destination's: the order does not matter.
 for(const search of [`?open=discord-link&t=${T}`,`?t=${T}&open=discord-link`])assert.deepEqual(openIntent(search),{open:'discord-link',t:T},search);
 // A ticket cut short or made up: the farm still opens the question, which says the link no longer works (no request with it).
 for(const bad of ['short','<script>',`${T}!`,'x'.repeat(129),''])assert.deepEqual(openIntent(`?open=discord-link&t=${encodeURIComponent(bad)}`),{open:'discord-link'},bad);
 assert.deepEqual(openIntent('?open=discord-link'),{open:'discord-link'});
 for(const bad of [null,undefined,42,{},'a b'.repeat(20)])assert.equal(discordTicket(bad),null);
 // The ticket leaves the address with the link's own part, so it is not shared by accident; another link's t stays as it was.
 assert.equal(withoutOpen(`https://www.harvesttycoon.com/?t=${T}&open=discord-link&src=discord#x`),'/?src=discord#x');
 assert.equal(withoutOpen('https://www.harvesttycoon.com/?open=chat&t=keep'),'/?t=keep');
 assert.equal(withoutOpen('https://x.example/?open=settings&part=chat&src=a'),'/?src=a','the other links as before');
 // Kept in this tab through a sign-in that leaves the page (src/main.js OPEN_KEY), read back as a link: the same intent.
 const kept={open:'discord-link',t:T,at:1};
 assert.deepEqual(openIntent(`?${new URLSearchParams(Object.entries(kept).filter(([key])=>key!=='at').map(([key,value])=>[key,String(value)]))}`),{open:'discord-link',t:T});
});

test('back from Discord after Link: /discord-link/callback brings Discord\'s code, state or error to the same question, never a ticket',()=>{
 for(const search of [`?open=discord-link&code=${C}&state=${S}`,`?code=${C}&state=${S}&open=discord-link`])assert.deepEqual(openIntent(search),{open:'discord-link',code:C,state:S},search);
 assert.deepEqual(openIntent(`?open=discord-link&error=access_denied&error_description=The+resource+owner+or+authorization+server+denied+the+request&state=${S}`),{open:'discord-link',error:'access_denied',state:S});
 // A t beside Discord's answer is not the farmer's: Discord's state names the link.
 assert.deepEqual(openIntent(`?open=discord-link&t=${T}&code=${C}&state=${S}`),{open:'discord-link',code:C,state:S});
 // Only what Discord can send: a code of visible characters, a state of our server's form, an error word.
 assert.deepEqual(discordBack(new URLSearchParams(`code=a b&state=short&error=Not+Allowed`)),{});
 assert.deepEqual(discordBack(new URLSearchParams(`code=${'x'.repeat(257)}&state=${'n'.repeat(129)}`)),{});
 assert.deepEqual(discordBack(new URLSearchParams(`state=${'n'.repeat(31)}`)),{},'shorter than our server\'s state');
 assert.deepEqual(openIntent('?open=discord-link&code=a%20b'),{open:'discord-link'},'nothing usable: the question says the link no longer works');
 // The address loses all of it with the link's own part.
 assert.equal(withoutOpen(`https://www.harvesttycoon.com/?open=discord-link&code=${C}&state=${S}&error=access_denied&error_description=x&src=discord#x`),'/?src=discord#x');
 assert.equal(withoutOpen(`https://www.harvesttycoon.com/play.html?code=pkce&state=keep`),'/play.html?code=pkce&state=keep','a sign-in\'s own return stays as it was');
 // Kept in this tab through a sign-in (src/main.js OPEN_KEY), for the ticket's 10 minutes: read back as the same intent.
 const kept={open:'discord-link',code:C,state:S,at:1};
 assert.deepEqual(openIntent(`?${new URLSearchParams(Object.entries(kept).filter(([key])=>key!=='at').map(([key,value])=>[key,String(value)]))}`),{open:'discord-link',code:C,state:S});
 // Discord's own page: the Activity's app, identify only, prompt none, back to the callback, our server's state and nothing else.
 assert.equal(DISCORD_CLIENT_ID,'1558371264882540605');assert.equal(DISCORD_CALLBACK,'https://www.harvesttycoon.com/discord-link/callback');
 assert.equal(discordAuthorizeUrl(S),`https://discord.com/oauth2/authorize?client_id=1558371264882540605&response_type=code&scope=identify&prompt=none&redirect_uri=https%3A%2F%2Fwww.harvesttycoon.com%2Fdiscord-link%2Fcallback&state=${S}`);
 assert.doesNotMatch(discordAuthorizeUrl(S),new RegExp(T));
 // Link again after Discord answered for another account: Discord's page shows which account it uses (prompt consent), the rest the same.
 assert.equal(discordAuthorizeUrl(S,true),discordAuthorizeUrl(S).replace('prompt=none','prompt=consent'));
 assert.equal(discordAuthorizeUrl(S,'yes'),discordAuthorizeUrl(S),'only true');
});

test('vercel.json: /discord-link and Discord\'s way back go to the game like /feedback; the home page and the language pages are untouched',()=>{
 const vercel=JSON.parse(read('vercel.json')),sources=['/discord-link','/discord-link/','/discord-link/callback'];
 // Vercel keeps a redirect's query: the callback's code, state or error arrive with ?open=discord-link.
 for(const source of sources)assert.deepEqual(vercel.redirects.filter(r=>r.source===source),[{source,destination:'/?open=discord-link',permanent:false}],source);
 assert.equal(new URL(DISCORD_CALLBACK).pathname,'/discord-link/callback');
 // Nothing else mentions it: / and /xx/ are served, rewritten and cached exactly as before.
 const others=[...vercel.redirects,...vercel.rewrites,...vercel.headers].filter(r=>!sources.includes(r.source));
 assert.doesNotMatch(JSON.stringify(others),/discord-link/);
 assert.deepEqual(vercel.redirects.filter(r=>r.source==='/'),[{source:'/',has:[{type:'query',key:'frame_id'}],destination:'/discord.html',permanent:false}]);
 // The home page itself (/ and /xx/ are written from it) looks and works as before: nothing of the link after its head. The Discord
 // things there are the owner's own choices of 10 Oct 2026: the footer's community icon (a plain link to our server) and the sign-in
 // button "Continue with Discord" (Supabase's own Discord sign-in, src/social-login.js), neither part of the Activity's link.
 const home=read('public/play.html'),body=home.slice(home.indexOf('</head>')).replace(/<a class="footer-social" href="https:\/\/discord\.gg\/CQrc42CMgf"[^]*?<\/a>/,'').replace(/<button type="button" class="social-button" data-provider="discord"[^]*?<\/button>/,'');
 assert.doesNotMatch(body,/discord/i);
});

test('the ticket leaves the address before Google Tag Manager loads, so no page view of the analytics carries it; src/main.js takes it back',()=>{
 const home=read('public/play.html'),script=/<script>(\(function\(w,d,i\)\{[\s\S]*?)<\/script>/.exec(home)[1];
 assert.ok(home.indexOf(script)<home.indexOf('googletagmanager'),'the first thing in the Tag Manager script');
 // The head script run as a returning farmer who accepted cookies: Tag Manager loads at once, and finds the address without t.
 const run=search=>{
  const loaded=[],state={href:`/${search}`},location={pathname:'/',hash:'#x',get search(){return state.href.replace(/^[^?#]*/,'').replace(/#.*$/,'');}};
  const w={location,navigator:{userAgent:'Mozilla/5.0 Chrome/130'},history:{replaceState(_,__,url){const to=new URL(url,`https://www.harvesttycoon.com${state.href}`);state.href=to.pathname+to.search+to.hash;}}};
  const d={getElementsByTagName:()=>[{parentNode:{insertBefore:j=>loaded.push({src:j.src,address:state.href})}}],createElement:()=>({})};
  vm.runInNewContext(script,{window:w,document:d,localStorage:{getItem:()=>JSON.stringify({choice:'accepted',at:Date.now()})},JSON,Date,URLSearchParams});
  return {w,loaded,address:state.href};
 };
 const linked=run(`?open=discord-link&t=${T}&src=discord`);
 assert.equal(linked.loaded.length,1);assert.doesNotMatch(linked.loaded[0].address,new RegExp(T));assert.equal(linked.address,'/?open=discord-link&src=discord#x');
 assert.deepEqual({...linked.w.harvestDiscordLink},{t:T});
 // Back from Discord (/discord-link/callback): its code, state and error leave the address the same way, before Tag Manager.
 const back=run(`?open=discord-link&code=${C}&state=${S}&src=discord`);
 assert.equal(back.loaded.length,1);assert.equal(back.loaded[0].address,'/?open=discord-link&src=discord#x');assert.equal(back.address,'/?open=discord-link&src=discord#x');
 assert.deepEqual({...back.w.harvestDiscordLink},{code:C,state:S});
 const denied=run(`?error=access_denied&error_description=The+resource+owner+denied+the+request&state=${S}&open=discord-link`);
 assert.equal(denied.loaded[0].address,'/?open=discord-link#x');assert.deepEqual({...denied.w.harvestDiscordLink},{state:S,error:'access_denied',error_description:'The resource owner denied the request'});
 for(const search of ['?open=feedback&t=keep','?src=x','','?code=pkce&state=abc']){const other=run(search);assert.equal(other.w.harvestDiscordLink,undefined,search);assert.equal(other.loaded.length,1);}
 assert.equal(run('?open=feedback&t=keep').address,'/?open=feedback&t=keep','another link\'s address stays as it was');
 assert.equal(run('?code=pkce&state=abc').address,'/?code=pkce&state=abc','a sign-in\'s own return (Supabase reads it) stays as it was');
 // The head stays small: Tag Manager's address within the first 1024 bytes, with the charset before it (tests/analytics.test.mjs).
 assert.ok(home.indexOf('googletagmanager.com/gtm.js')<1024);
 // src/main.js reads the link from the address as before, and takes the parts back from where the head put them.
 const main=read('src/main.js');
 assert.match(main,/let pendingOpen=openIntent\(location\.search\);\nif\(pendingOpen\)history\.replaceState\(null,'',withoutOpen\(location\.href\)\);\n(\/\/.*\n)+const discordParts=window\.harvestDiscordLink;delete window\.harvestDiscordLink;\nif\(pendingOpen\?\.open==='discord-link'&&discordParts&&typeof discordParts==='object'\)pendingOpen=openIntent\(`\?\$\{new URLSearchParams\(\{\.\.\.discordParts,open:'discord-link'\}\)\}`\);\n(\/\/.*\n)+const OPEN_KEY=/,'before the intent is kept in this tab (through a sign-in)');
 assert.deepEqual(openIntent(`?open=discord-link&t=${encodeURIComponent(T)}`),{open:'discord-link',t:T});
});

// One page load as the browser runs it: the address after vercel.json's redirect, play.html's head script (no Tag Manager: not
// accepted), then src/main.js's router as it is (its first lines, up to harvestTakeOpen). storage: the tab's sessionStorage.
function router({search,storage=new Map(),now=Date.now()}){
 const head=/<script>(\(function\(w,d,i\)\{[\s\S]*?)<\/script>/.exec(read('public/play.html'))[1];
 const main=read('src/main.js'),start=main.indexOf('let pendingOpen=openIntent(location.search);'),end=main.indexOf('\n',main.indexOf('window.harvestTakeOpen='));
 const site='https://www.harvesttycoon.com',state={href:`/${search}`},at=()=>new URL(state.href,site);
 const location={get search(){return at().search;},get hash(){return at().hash;},get href(){return at().href;}};
 const history={replaceState(_,__,url){const to=new URL(url,at());state.href=to.pathname+to.search+to.hash;}};
 const window={location,history,navigator:{userAgent:'Mozilla/5.0 Chrome/130'}};
 const sessionStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
 vm.runInNewContext(head,{window,document:{},localStorage:{getItem:()=>null},JSON,Date,URLSearchParams});
 const afterHead=state.href;
 vm.runInNewContext(main.slice(start,end),{openIntent,withoutOpen,location,history,window,sessionStorage,JSON,Date:{now:()=>now},URLSearchParams,Object,String,Number,encodeURIComponent});
 return {window,storage,afterHead,address:state.href,take:()=>{const intent=window.harvestTakeOpen();return intent&&{...intent};}};
}
test('back from Discord while signed out: the sign-in card, and after a sign-in (also one that leaves the page) the same question with Discord\'s answer',()=>{
 // Discord's callback after vercel.json: ?open=discord-link with its code and state; the head takes them out before anything else.
 const first=router({search:`?open=discord-link&code=${C}&state=${S}&src=discord`});
 assert.equal(first.afterHead,'/?open=discord-link&src=discord');assert.equal(first.address,'/?src=discord');assert.equal(first.window.harvestDiscordLink,undefined,'taken once');
 assert.deepEqual(JSON.parse(first.storage.get('harvest-tycoon:open')),{open:'discord-link',code:C,state:S,at:JSON.parse(first.storage.get('harvest-tycoon:open')).at},'kept in this tab through the sign-in');
 // Google or Facebook come back to /play.html: the question with Discord's answer opens once the farm is there, then it is gone.
 const after=router({search:'',storage:first.storage});
 assert.deepEqual(after.take(),{open:'discord-link',code:C,state:S});assert.equal(after.storage.has('harvest-tycoon:open'),false);
 // A sign-in on this page (email and password): the farm takes it straight away. Discord's no comes the same way.
 const denied=router({search:`?open=discord-link&error=access_denied&error_description=The+resource+owner+denied+the+request&state=${S}`});
 assert.equal(denied.afterHead,'/?open=discord-link');assert.deepEqual(denied.take(),{open:'discord-link',error:'access_denied',state:S});
 // Never the ticket from the address with Discord's answer: Discord's state names the link.
 assert.deepEqual(router({search:`?open=discord-link&t=${T}&code=${C}&state=${S}`}).take(),{open:'discord-link',code:C,state:S});
 // After the ticket's 10 minutes: nothing.
 const late=router({search:'',storage:first.storage.set('harvest-tycoon:open',JSON.stringify({open:'discord-link',code:C,state:S,at:1})),now:600002});
 assert.equal(late.take(),null);
 // The link from Discord itself works as before, and other links too.
 const plain=router({search:`?open=discord-link&t=${T}`});assert.equal(plain.afterHead,'/?open=discord-link');assert.deepEqual(plain.take(),{open:'discord-link',t:T});
 assert.deepEqual(router({search:'?open=feedback'}).take(),{open:'feedback'});
 // Discord's answer in a new tab (Discord's app on a phone): the same intent with nothing from the tab that tapped Link.
 const fresh=router({search:`?open=discord-link&code=${C}&state=${S}`});
 assert.deepEqual([...fresh.storage.keys()],['harvest-tycoon:open'],'only the intent, for a sign-in on the way');
 assert.deepEqual(fresh.take(),{open:'discord-link',code:C,state:S});assert.equal(fresh.storage.size,0);
 // Link keeps nothing in the tab: the state is our server's, bound to the farmer's account.
 assert.doesNotMatch(read('src/main.js'),/harvest-tycoon:discord-link|discordStarted|expireDiscordLink/);
 // The sign-in card says what it is for (landing, the wiring test below).
 assert.match(read('src/main.js'),/if\(!message&&pendingOpen\?\.open==='discord-link'\)message=DISCORD_SIGN_IN;/);
});

test('a link the installed app catches in a window that is open (launchQueue, sw.js): the address as tapped opens the same screen',()=>{
 const site='https://www.harvesttycoon.com';
 assert.deepEqual(openIntentOfUrl(`${site}/discord-link?t=${T}`),{open:'discord-link',t:T});
 assert.deepEqual(openIntentOfUrl(`${site}/discord-link/?t=${T}`),{open:'discord-link',t:T});
 assert.deepEqual(openIntentOfUrl(`${site}/discord-link?t=short`),{open:'discord-link'});
 // Discord's way back after Link, as Discord sends it: the same question with its answer, never a ticket from the address.
 assert.deepEqual(openIntentOfUrl(`${DISCORD_CALLBACK}?code=${C}&state=${S}`),{open:'discord-link',code:C,state:S});
 assert.deepEqual(openIntentOfUrl(`${DISCORD_CALLBACK}?error=access_denied&error_description=denied&state=${S}`),{open:'discord-link',error:'access_denied',state:S});
 assert.deepEqual(openIntentOfUrl(`${DISCORD_CALLBACK}?code=${C}&state=${S}&t=${T}`),{open:'discord-link',code:C,state:S});
 assert.equal(openIntentOfUrl(`${site}/discord-link/elsewhere?code=${C}`),null);
 assert.deepEqual(openIntentOfUrl(`${site}/feedback`),{open:'feedback'});assert.deepEqual(openIntentOfUrl(`${site}/feedback/`),{open:'feedback'});
 assert.deepEqual(openIntentOfUrl(`${site}/settings`),{open:'settings'});assert.deepEqual(openIntentOfUrl(`${site}/settings/`),{open:'settings'});
 assert.deepEqual(openIntentOfUrl(`${site}/settings/privacy`),{open:'settings',part:'privacy'});assert.deepEqual(openIntentOfUrl(`${site}/settings/farm-app/`),{open:'settings',part:'farm-app'});
 assert.equal(openIntentOfUrl(`${site}/settings/nope`),null,'only vercel.json\'s parts');
 // Everything else as before: ?open= (a shortcut, a notification), relative to the page as sw.js sends it.
 assert.deepEqual(openIntentOfUrl(`${site}/?open=chat&channel=global`),{open:'chat',channel:'global'});
 assert.deepEqual(openIntentOfUrl('/?open=today',site),{open:'today'});
 for(const none of [`${site}/`,`${site}/play.html`,`${site}/wiki/crops`,'not a url',null])assert.equal(openIntentOfUrl(none),null,String(none));
 const main=read('src/main.js');
 assert.match(main,/openScreen\(openIntentOfUrl\(String\(event\.data\.url\),location\.origin\)\)/);
 assert.match(main,/window\.launchQueue\?\.setConsumer\?\.\(params=>\{try\{openScreen\(openIntentOfUrl\(params\.targetURL\)\);\}catch\{\}\}\);/);
});

// The dialog in a page of its own: the parts it fills, its buttons and its listeners.
function fakePage(){
 const made=[],state={focused:0};
 const part=extra=>({textContent:'',hidden:false,disabled:false,className:'',listeners:{},addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},click(){for(const fn of this.listeners.click??[])fn({target:this});},...extra});
 const doc={
  body:{append(dialog){dialog.appended=true;}},
  createElement(tag){
   const dialog={tag,className:'',attrs:{},listeners:{},shown:false,removed:false,
    parts:{h2:part(),'#discord-link-copy':part(),'[data-warning]':part({hidden:true}),'[data-note]':part({hidden:true}),'[data-status]':part(),'[data-cancel]':part(),'[data-link]':part({hidden:true})},
    setAttribute(key,value){this.attrs[key]=value;},set innerHTML(value){this.html=value;},get innerHTML(){return this.html;},querySelector(selector){return this.parts[selector];},
    addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},
    fire(name,event={}){const e={target:dialog,prevented:false,preventDefault(){e.prevented=true;},...event};for(const fn of this.listeners[name]??[])fn(e);return e;},
    getBoundingClientRect:()=>({left:10,right:310,top:10,bottom:210}),
    remove(){this.removed=true;},showModal(){this.shown=true;},close(){if(!this.shown)return;this.shown=false;this.fire('close');}};
   made.push(dialog);return dialog;
  }
 };
 return {doc,made,state};
}
// discord-auth as the page around the game hands it over: every call recorded as [op, what names the link (with Discord's code)],
// each answer in turn (a function throws or answers).
function fakeServer(...answers){
 const calls=[];
 const request=async(op,fields)=>{calls.push([op,fields]);const next=answers.shift();if(typeof next==='function')return next();return next;};
 return {calls,request};
}
// The page's trip to Discord (src/main.js bridge.discordVerify): records the state it would go with and its options (or throws `fail`).
function fakeTrip({fail=null}={}){
 const trips=[],options=[];
 return {trips,options,verify:async(state,given)=>{trips.push(state);options.push(given);if(fail)throw fail;}};
}
const refusal=(status,code)=>()=>{throw Object.assign(new Error('English text from the server'),{status,code});};
const view=dialog=>({copy:dialog.parts['#discord-link-copy'].textContent,...(dialog.parts['[data-warning]'].hidden?{}:{warning:dialog.parts['[data-warning]'].textContent}),note:dialog.parts['[data-note]'].hidden?null:dialog.parts['[data-note]'].textContent,
 status:dialog.parts['[data-status]'].textContent,kind:dialog.parts['[data-status]'].className,
 link:dialog.parts['[data-link]'].hidden?null:dialog.parts['[data-link]'].textContent,linkOff:dialog.parts['[data-link]'].disabled,cancel:dialog.parts['[data-cancel]'].textContent});

test('Play this farm on Discord?: who asks, the farmer\'s own farm; Link gets a state and goes to Discord, and back from Discord the farm is linked',async()=>{
 const page=fakePage(),trip=fakeTrip();
 const server=fakeServer({display_name:'Sunny',expires_in:540},{state:S});
 const ui=createDiscordLinkDialog({request:server.request,verify:trip.verify,farmer:()=>' Green Acres ',doc:page.doc});
 const closed=ui.open(T,{open:'discord-link',t:T}),dialog=page.made[0];
 assert.equal(dialog.shown,true);assert.equal(dialog.appended,true);assert.match(dialog.className,/diamond-confirm sale-confirm discord-link-dialog/,'the look of the other confirmations');
 assert.equal(dialog.parts.h2.textContent,'Play this farm on Discord?');assert.equal(dialog.attrs['aria-labelledby'],'discord-link-title');
 assert.equal(view(dialog).copy,'Checking the link…');assert.equal(view(dialog).link,null,'nothing to tap but Cancel while the link is checked');
 assert.match(dialog.html,/<button type="button" class="small-button" data-cancel autofocus><\/button>/);assert.doesNotMatch(dialog.html,/\son[a-z]+=/);
 await settle();
 assert.deepEqual(server.calls,[['peek',{ticket:T}]]);
 // The farmer knows Discord comes next and asks whether it is them.
 assert.equal(LINK_TEXT.note,'Link takes you to Discord to confirm it is you. Only link your own Discord account.');
 assert.deepEqual(view(dialog),{copy:'Discord user @Sunny wants to play your farm Green Acres in Discord.',note:LINK_TEXT.note,status:'',kind:'discord-link-status',link:'Link',linkOff:false,cancel:'Cancel'});
 dialog.parts['[data-link]'].click();await settle();
 assert.deepEqual(server.calls,[['peek',{ticket:T}],['begin',{ticket:T}]],'Link: a state from our server first, nothing linked before Discord answers');
 assert.deepEqual(trip.trips,[S],'then to Discord with that state, never the ticket');assert.deepEqual(trip.options,[{again:false}]);
 assert.equal(view(dialog).status,'Linking…');assert.equal(view(dialog).linkOff,true,'one trip');
 dialog.parts['[data-link]'].click();await settle();assert.deepEqual(trip.trips,[S]);assert.equal(server.calls.length,2);
 dialog.close();assert.deepEqual(await closed,{linked:false});
 // Back from Discord (/discord-link/callback), in this tab or in a new one: Discord's state alone names the link, and its code links
 // at once. Nothing of the tab that tapped Link is needed.
 let answer;const confirming=new Promise(resolve=>{answer=resolve;});
 const back=fakeServer({display_name:'Sunny',expires_in:500},()=>confirming),returned=fakeTrip();
 const ui2=createDiscordLinkDialog({request:back.request,verify:returned.verify,farmer:()=>'Green Acres',doc:page.doc});
 const second=ui2.open(undefined,{open:'discord-link',code:C,state:S}),d2=page.made[1];await settle();
 assert.deepEqual(back.calls,[['peek',{state:S}],['confirm',{state:S,code:C}]],'Discord\'s code goes with the Link the farmer gave before');
 assert.equal(view(d2).status,'Linking…');assert.equal(view(d2).linkOff,true);assert.equal(d2.parts['[data-cancel]'].disabled,true);
 // Not closed while the server answers: Escape, a tap beside it, Link again.
 assert.equal(d2.fire('cancel').prevented,true);d2.fire('click',{clientX:0,clientY:0});d2.parts['[data-link]'].click();
 assert.equal(d2.shown,true);assert.equal(back.calls.length,2);assert.deepEqual(returned.trips,[]);
 answer({ok:true});await settle();
 assert.deepEqual(view(d2),{copy:'Discord user @Sunny wants to play your farm Green Acres in Discord.',note:null,status:'Done. Go back to Discord: your farm opens there.',kind:'discord-link-status is-done',link:null,linkOff:true,cancel:'Close'});
 assert.equal(d2.parts['[data-cancel]'].disabled,false);
 d2.parts['[data-cancel]'].click();
 assert.deepEqual(await second,{linked:true});assert.equal(d2.removed,true);
 // A new link later asks again, in a new dialog.
 const again=fakeServer({display_name:'',expires_in:60});const ui3=createDiscordLinkDialog({request:again.request,verify:trip.verify,farmer:()=>'Green Acres',doc:page.doc});
 const third=ui3.open(T);await settle();assert.equal(view(page.made[2]).copy,'Someone on Discord wants to play your farm Green Acres in Discord.','no Discord name from the server');
 page.made[2].fire('cancel');page.made[2].close();assert.deepEqual(await third,{linked:false});
 // From Settings on a farm made on Discord: the website says that Link deletes that farm, before and after the trip to Discord.
 const relinked=fakeServer({display_name:'sunny',relink:true,expires_in:500}),relinkTrip=fakeTrip();const ui4=createDiscordLinkDialog({request:relinked.request,verify:relinkTrip.verify,farmer:()=>'Green Acres',doc:page.doc});
 const fourth=ui4.open(T),d4=page.made[3];await settle();
 assert.deepEqual(view(d4),{copy:'Discord user @sunny wants to play your farm Green Acres in Discord.',warning:LINK_TEXT.relink,note:LINK_TEXT.note,status:'',kind:'discord-link-status',link:'Link',linkOff:false,cancel:'Cancel'});
 assert.equal(LINK_TEXT.relink,'Linking deletes the farm this Discord account plays now. This cannot be undone.');
 d4.close();await fourth;
 const relinkBack=fakeServer({display_name:'sunny',relink:true,expires_in:400},{ok:true}),kept4=fakeTrip();
 const ui5=createDiscordLinkDialog({request:relinkBack.request,verify:kept4.verify,farmer:()=>'Green Acres',doc:page.doc});
 const fifth=ui5.open(undefined,{code:C,state:S}),d5=page.made[4];await settle();
 assert.equal(view(d5).warning,undefined,'done: only the answer');assert.equal(view(d5).status,LINK_TEXT.done);
 d5.close();assert.deepEqual(await fifth,{linked:true});
});

test('back from Discord: Discord\'s state alone, from any tab; another account, Discord\'s no and a refused code link nothing, and Link goes again',async()=>{
 const ask=async({back,answers=[{display_name:'Sunny',expires_in:500}],ticket})=>{
  const page=fakePage(),server=fakeServer(...answers),trip=fakeTrip();
  const ui=createDiscordLinkDialog({request:server.request,verify:trip.verify,farmer:()=>'Green Acres',doc:page.doc});
  const closed=ui.open(ticket,back),dialog=page.made[0];await settle();
  return {dialog,server,trip,closed,view:()=>view(dialog),link:async()=>{dialog.parts['[data-link]'].click();await settle();}};
 };
 // No state our server could have given (an address cut short or made up): nothing asked, nothing linked.
 assert.equal(LINK_TEXT.unchecked,'This link could not be checked. Open it again from Discord.');
 for(const back of [{code:C},{code:C,state:'short'},{code:C,state:`${S}!`},{error:'access_denied'}]){
  const r=await ask({back});
  assert.deepEqual(r.view(),{copy:LINK_TEXT.unchecked,note:null,status:'',kind:'',link:null,linkOff:false,cancel:'Close'},JSON.stringify(back));
  assert.deepEqual(r.server.calls,[]);assert.deepEqual(r.trip.trips,[]);r.dialog.close();assert.deepEqual(await r.closed,{linked:false});
 }
 // Signed in on this browser with another account than the one that tapped Link (discord-auth LINK_OTHER_ACCOUNT): its words, and
 // nothing more to tap here.
 assert.equal(LINK_TEXT.otherAccount,'This link was started on another account. Sign in with that account, or open the link again from Discord.');
 const other=await ask({back:{code:C,state:S},answers:[refusal(403,'LINK_OTHER_ACCOUNT')]});
 assert.deepEqual(other.view(),{copy:LINK_TEXT.otherAccount,note:null,status:'',kind:'discord-link-status',link:null,linkOff:false,cancel:'Close'});
 assert.deepEqual(other.server.calls,[['peek',{state:S}]],'never confirmed');other.dialog.close();assert.deepEqual(await other.closed,{linked:false});
 // The state is done (the browser's Back after Done showed Discord's page again, which sent the farmer here once more; or its time
 // is up): whether this farm is linked decides. Linked: done, not an error. Not linked, or no answer: the link is gone.
 const again=await ask({back:{code:C,state:S},answers:[refusal(410,'TICKET_GONE'),{linked:true}]});
 assert.deepEqual(again.view(),{copy:LINK_TEXT.done,note:null,status:'',kind:'discord-link-status',link:null,linkOff:false,cancel:'Close'});
 assert.deepEqual(again.server.calls,[['peek',{state:S}],['status',undefined]]);again.dialog.close();assert.deepEqual(await again.closed,{linked:true});
 for(const answer of [{linked:false},refusal(503)]){
  const r=await ask({back:{code:C,state:S},answers:[refusal(410,'TICKET_GONE'),answer]});
  assert.deepEqual(r.view(),{copy:LINK_TEXT.gone,note:null,status:'',kind:'discord-link-status',link:null,linkOff:false,cancel:'Close'});r.dialog.close();assert.deepEqual(await r.closed,{linked:false});
 }
 // From Discord's link (not back from Discord) a dead link is just that: status is not asked.
 const plain=await ask({ticket:T,answers:[refusal(410,'TICKET_GONE')]});
 assert.deepEqual(plain.server.calls,[['peek',{ticket:T}]]);assert.equal(plain.view().copy,LINK_TEXT.gone);
 // A ticket in the address beside Discord's answer is never used: Discord's state names the link.
 const own=await ask({back:{code:C,state:S},ticket:Buffer.alloc(32,9).toString('base64url'),answers:[{display_name:'Sunny'},{ok:true}]});
 assert.deepEqual(own.server.calls,[['peek',{state:S}],['confirm',{state:S,code:C}]]);
 // The farmer said no on Discord's page (access_denied), or Discord sent no code: nothing linked. Link asks our server for a new
 // state from the old one (this tab may never have known the ticket) and goes to Discord again.
 assert.equal(LINK_TEXT.cancelled,'Discord did not confirm it is you, so nothing was linked. Tap Link to try again.');
 for(const back of [{error:'access_denied',state:S},{state:S}]){
  const r=await ask({back,answers:[{display_name:'Sunny',expires_in:500},{state:S2}]});
  assert.deepEqual(r.view(),{copy:'Discord user @Sunny wants to play your farm Green Acres in Discord.',note:LINK_TEXT.note,status:LINK_TEXT.cancelled,kind:'discord-link-status is-error',link:'Link',linkOff:false,cancel:'Cancel'},JSON.stringify(back));
  assert.deepEqual(r.server.calls,[['peek',{state:S}]],'no confirm');
  await r.link();assert.deepEqual(r.server.calls.at(-1),['begin',{state:S}]);assert.deepEqual(r.trip.trips,[S2]);assert.equal(r.view().status,'Linking…');
 }
 // A Link after that goes with the newest state (the old one is done): here the trip could not start (the page around the game said
 // no: its words), then Link again.
 const page=fakePage(),busy=fakeServer({display_name:'Sunny'},{state:S2},{state:S3});let fails=1;
 const stuck={trips:[],verify:async state=>{stuck.trips.push(state);if(fails-->0)throw new Error('Your session is paused. Reconnect to continue.');}};
 createDiscordLinkDialog({request:busy.request,verify:stuck.verify,doc:page.doc}).open(undefined,{error:'access_denied',state:S});await settle();
 page.made[0].parts['[data-link]'].click();await settle();
 assert.equal(view(page.made[0]).status,'Your session is paused. Reconnect to continue.');assert.equal(view(page.made[0]).linkOff,false);
 page.made[0].parts['[data-link]'].click();await settle();
 assert.deepEqual(busy.calls,[['peek',{state:S}],['begin',{state:S}],['begin',{state:S2}]]);assert.deepEqual(stuck.trips,[S2,S3]);
 // Discord's code for another account than the ticket's (the ticket's link sent to someone else, or another account signed in to
 // discord.com in this browser): refused, and Link goes again, now with Discord's page showing which account it uses (again).
 assert.equal(LINK_TEXT.mismatch,'This link belongs to another Discord account. Only link your own Discord account.');
 const wrong=await ask({back:{code:C,state:S},answers:[{display_name:'Sunny'},refusal(403,'DISCORD_MISMATCH'),{state:S2}]});
 assert.deepEqual(wrong.view(),{copy:'Discord user @Sunny wants to play your farm Green Acres in Discord.',note:LINK_TEXT.note,status:LINK_TEXT.mismatch,kind:'discord-link-status is-error',link:'Link',linkOff:false,cancel:'Cancel'});
 assert.deepEqual(wrong.trip.trips,[]);
 await wrong.link();assert.deepEqual(wrong.trip.trips,[S2]);assert.deepEqual(wrong.trip.options,[{again:true}]);assert.deepEqual(wrong.server.calls,[['peek',{state:S}],['confirm',{state:S,code:C}],['begin',{state:S}]]);
 // A code Discord refused (401 without a code of ours: used or too old): as Discord's no, and Link fetches a new one.
 const stale=await ask({back:{code:C,state:S},answers:[{display_name:'Sunny'},refusal(401),{state:S2}]});
 assert.equal(stale.view().status,LINK_TEXT.cancelled);assert.equal(stale.view().link,'Link');
 await stale.link();assert.deepEqual(stale.trip.trips,[S2]);assert.deepEqual(stale.server.calls.map(c=>c[0]),['peek','confirm','begin'],'never the old code again');
 assert.deepEqual(stale.trip.options,[{again:false}],'Discord\'s page as the first time');
 // The state used up at confirm (another tab linked first): the farm's status decides, as above.
 const raced=await ask({back:{code:C,state:S},answers:[{display_name:'Sunny'},refusal(410,'TICKET_GONE'),{linked:true}]});
 assert.deepEqual(raced.view(),{copy:LINK_TEXT.done,note:null,status:'',kind:'discord-link-status',link:null,linkOff:true,cancel:'Close'});
 raced.dialog.close();assert.deepEqual(await raced.closed,{linked:true});
 // Signed out meanwhile (SIGN_IN): as before.
 const out=await ask({back:{code:C,state:S},answers:[{display_name:'Sunny'},refusal(401,'SIGN_IN')]});
 assert.equal(out.view().status,LINK_TEXT.session);assert.equal(out.view().link,null);
 // The question itself failed on the way back (no connection): Try again asks it, then links with Discord's code after all.
 const flaky=await ask({back:{code:C,state:S},answers:[()=>{throw Object.assign(new Error('x'),{transient:true});},{display_name:'Sunny'},{ok:true}]});
 assert.equal(flaky.view().copy,LINK_TEXT.away);assert.equal(flaky.view().link,'Try again');
 await flaky.link();assert.deepEqual(flaky.server.calls,[['peek',{state:S}],['peek',{state:S}],['confirm',{state:S,code:C}]]);assert.equal(flaky.view().status,LINK_TEXT.done);
 // No state from our server (or not one of its form): nothing goes to Discord, and Link can be tapped again.
 const empty=await ask({ticket:T,answers:[{display_name:'Sunny'},{state:'short'}]});
 await empty.link();assert.deepEqual(empty.trip.trips,[]);assert.equal(empty.view().status,LINK_TEXT.failed);assert.equal(empty.view().linkOff,false);
});

test('Link on a link that is done (another tab linked it, or this one did and the answer was lost): this farm\'s status decides',async()=>{
 const transient=()=>{throw Object.assign(new Error('x'),{transient:true});};
 // Back from Discord in a new tab: confirm reached our server, which linked, but the answer was lost on the way. Link asks for a new
 // state, and the old one is done: the farm is linked, so Done, never "expired".
 const page=fakePage(),server=fakeServer({display_name:'Sunny'},transient,refusal(410,'TICKET_GONE'),{linked:true}),trip=fakeTrip();
 const closed=createDiscordLinkDialog({request:server.request,verify:trip.verify,farmer:()=>'Green Acres',doc:page.doc}).open(undefined,{code:C,state:S}),dialog=page.made[0];await settle();
 assert.equal(view(dialog).status,LINK_TEXT.away);assert.equal(view(dialog).link,'Link');
 dialog.parts['[data-link]'].click();await settle();
 assert.deepEqual(server.calls,[['peek',{state:S}],['confirm',{state:S,code:C}],['begin',{state:S}],['status',undefined]]);assert.deepEqual(trip.trips,[]);
 assert.deepEqual(view(dialog),{copy:LINK_TEXT.done,note:null,status:'',kind:'discord-link-status',link:null,linkOff:true,cancel:'Close'});
 assert.equal(dialog.parts['[data-cancel]'].disabled,false);
 dialog.close();assert.deepEqual(await closed,{linked:true});
 // Link in this tab from Discord's link, Discord's app opened the answer in another tab, which linked; back here Link works again
 // (this tab shown again), and the ticket is done: linked is Done, not linked is the link gone.
 for(const [answer,copy,linked] of [[{linked:true},LINK_TEXT.done,true],[{linked:false},LINK_TEXT.gone,false],[refusal(503),LINK_TEXT.gone,false]]){
  const p=fakePage(),bag={},s=fakeServer({display_name:'Sunny'},{state:S},refusal(410,'TICKET_GONE'),answer),t=fakeTrip();
  Object.assign(p.doc,{visibilityState:'visible',addEventListener(name,fn){(bag[name]??=new Set()).add(fn);},removeEventListener(name,fn){bag[name]?.delete(fn);}});
  const c=createDiscordLinkDialog({request:s.request,verify:t.verify,farmer:()=>'Green Acres',doc:p.doc}).open(T),d=p.made[0];await settle();
  d.parts['[data-link]'].click();await settle();assert.deepEqual(t.trips,[S]);assert.equal(view(d).linkOff,true);
  for(const fn of bag.visibilitychange??[])fn({type:'visibilitychange'});assert.equal(view(d).linkOff,false);
  d.parts['[data-link]'].click();await settle();
  assert.deepEqual(s.calls,[['peek',{ticket:T}],['begin',{ticket:T}],['begin',{ticket:T}],['status',undefined]]);assert.deepEqual(t.trips,[S]);
  assert.deepEqual(view(d),{copy,note:null,status:'',kind:'discord-link-status',link:null,linkOff:true,cancel:'Close'});
  d.close();assert.deepEqual(await c,{linked});
 }
});

test('back from Discord while another account is signed in: Sign out keeps Discord\'s answer for the sign-in with the account that tapped Link',async()=>{
 for(const [back,answers,kept] of [
  [{code:C,state:S},[refusal(403,'LINK_OTHER_ACCOUNT')],{code:C,state:S}],
  [{error:'access_denied',state:S},[refusal(403,'LINK_OTHER_ACCOUNT')],{state:S,error:'access_denied'}],
  // The account changed between the question and Link's yes: the same.
  [{code:C,state:S},[{display_name:'Sunny'},refusal(403,'LINK_OTHER_ACCOUNT')],{code:C,state:S}]
 ]){
  const page=fakePage(),server=fakeServer(...answers),trip=fakeTrip(),out=[];
  const closed=createDiscordLinkDialog({request:server.request,verify:trip.verify,signOut:answer=>{out.push(answer);},farmer:()=>'Green Acres',doc:page.doc}).open(undefined,back),dialog=page.made[0];await settle();
  const shown=view(dialog);
  assert.equal(answers.length===1?shown.copy:shown.status,LINK_TEXT.otherAccount,JSON.stringify(back));
  assert.deepEqual([shown.link,shown.linkOff,shown.cancel,shown.note],['Sign out',false,'Close',null]);
  assert.equal(server.calls.length,answers.length===1?1:2);
  dialog.parts['[data-link]'].click();await settle();
  assert.deepEqual(out,[kept],'only Discord\'s answer, never a ticket');assert.equal(dialog.shown,false);assert.deepEqual(await closed,{linked:false});
  assert.equal(server.calls.length,answers.length===1?1:2,'nothing more asked here');assert.deepEqual(trip.trips,[]);
 }
 // Without a way to sign out (only Close), and other refusals never offer it.
 const page=fakePage(),server=fakeServer(refusal(403,'STAFF_ACCOUNT'));
 createDiscordLinkDialog({request:server.request,signOut:()=>assert.fail('never'),doc:page.doc}).open(undefined,{code:C,state:S});await settle();
 assert.deepEqual([view(page.made[0]).copy,view(page.made[0]).link,view(page.made[0]).cancel],[LINK_TEXT.staff,null,'Close']);
});

test('one question at a time; Cancel says no and links nothing; a link without a ticket is not asked about',async()=>{
 const page=fakePage(),server=fakeServer({display_name:'Sunny',expires_in:540});
 const ui=createDiscordLinkDialog({request:server.request,farmer:()=>'Green Acres',doc:page.doc});
 const first=ui.open(T);assert.equal(ui.open(T),first);assert.equal(page.made.length,1);await settle();
 page.made[0].parts['[data-cancel]'].click();assert.deepEqual(await first,{linked:false});assert.deepEqual(server.calls,[['peek',{ticket:T}]],'never confirmed');
 // A tap beside the dialog closes it too (not one inside it).
 const beside=fakeServer({display_name:'Sunny',expires_in:540}),ui2=createDiscordLinkDialog({request:beside.request,doc:page.doc}),open2=ui2.open(T);await settle();
 page.made[1].fire('click',{clientX:100,clientY:100});assert.equal(page.made[1].shown,true);page.made[1].fire('click',{clientX:400,clientY:100});assert.deepEqual(await open2,{linked:false});
 // Cut short or made up: the answer at once, no request.
 for(const bad of [undefined,'short']){
  const none=fakeServer(),p=fakePage(),closed=createDiscordLinkDialog({request:none.request,doc:p.doc}).open(bad);
  assert.deepEqual(view(p.made[0]),{copy:LINK_TEXT.gone,note:null,status:'',kind:'',link:null,linkOff:false,cancel:'Close'});assert.deepEqual(none.calls,[]);
  p.made[0].parts['[data-cancel]'].click();assert.deepEqual(await closed,{linked:false});
 }
 // No way to ask our server (a portal's page around the game): nothing at all.
 assert.equal(createDiscordLinkDialog({request:undefined,doc:page.doc}),null);
});

test('this page again after Link (the browser\'s Back on Discord\'s page, or back from Discord\'s app): no longer "Linking…", Link works again',async()=>{
 const page=fakePage(),bags={win:{},top:{},doc:{}},server=fakeServer({display_name:'Sunny'},{state:S},{state:S2}),trip=fakeTrip();
 const on=bag=>({addEventListener(name,fn){(bag[name]??=new Set()).add(fn);},removeEventListener(name,fn){bag[name]?.delete(fn);}});
 const fire=(bag,type,event={})=>{for(const fn of [...(bag[type]??[])])fn({type,...event});};
 // The dialog is in the farm's frame; the page around the game is the one that went to Discord.
 Object.assign(page.doc,{defaultView:{...on(bags.win),parent:on(bags.top)},visibilityState:'visible',...on(bags.doc)});
 const ui=createDiscordLinkDialog({request:server.request,verify:trip.verify,farmer:()=>'Green Acres',doc:page.doc});
 const closed=ui.open(T),dialog=page.made[0],link=async()=>{dialog.parts['[data-link]'].click();await settle();};
 await settle();
 fire(bags.top,'pageshow',{persisted:true});assert.equal(view(dialog).linkOff,false,'nothing to undo before Link');
 await link();assert.equal(view(dialog).status,'Linking…');assert.equal(view(dialog).linkOff,true);
 fire(bags.win,'pageshow',{persisted:false});assert.equal(view(dialog).linkOff,true,'a page loaded anew is another page');
 // Back on Discord's page: this page as it was, from the back-forward cache.
 fire(bags.top,'pageshow',{persisted:true});
 assert.deepEqual([view(dialog).status,view(dialog).linkOff,view(dialog).link,view(dialog).cancel],['',false,'Link','Cancel']);
 // Discord's app opened instead of its page: this tab hidden, then shown again.
 await link();assert.deepEqual(trip.trips,[S,S2],'a new state each Link');assert.deepEqual(server.calls.map(c=>c[0]),['peek','begin','begin']);
 page.doc.visibilityState='hidden';fire(bags.doc,'visibilitychange');assert.equal(view(dialog).linkOff,true);
 page.doc.visibilityState='visible';fire(bags.doc,'visibilitychange');assert.equal(view(dialog).linkOff,false);assert.equal(view(dialog).status,'');
 dialog.close();assert.deepEqual(await closed,{linked:false});
 for(const bag of Object.values(bags))for(const set of Object.values(bag))assert.equal(set.size,0,'nothing left listening once closed');
});

test('the server\'s refusals in the farmer\'s words: a dead link, a portal account, an unconfirmed address, a farm or Discord account linked already',async()=>{
 // The codes are discord-auth's own (LINK_ERRORS): one text here for each the website can get.
 const {LINK_ERRORS}=await import('../supabase/functions/discord-auth/discord.js');
 for(const key of ['signIn','portal','staff','email','mismatch','otherAccount','alreadyLinked','discordLinked','gone'])assert.notEqual(linkProblem({code:LINK_ERRORS[key],status:403}).text,LINK_TEXT.failed,key);
 const bare401=refusal(401),cases=[
  [refusal(410,'TICKET_GONE'),LINK_TEXT.gone,false],[refusal(410),LINK_TEXT.gone,false],
  [refusal(403,'EMAIL_UNCONFIRMED'),'Confirm your email address first (Settings, Email address), then open the link again.',false],
  [refusal(403,'PORTAL_ACCOUNT'),LINK_TEXT.portal,false],[refusal(403,'STAFF_ACCOUNT'),'Staff accounts cannot be played on Discord.',false],[refusal(409,'ALREADY_LINKED'),LINK_TEXT.farmTaken,false],[refusal(409,'DISCORD_LINKED'),LINK_TEXT.discordTaken,false],
  [refusal(403,'DISCORD_MISMATCH'),'This link belongs to another Discord account. Only link your own Discord account.',true],
  [refusal(403,'LINK_OTHER_ACCOUNT'),'This link was started on another account. Sign in with that account, or open the link again from Discord.',false],
  [refusal(401,'SIGN_IN'),'Your session has ended. Please sign in again.',false],[bare401,LINK_TEXT.session,false],[refusal(429,'TOO_MANY_TICKETS'),LINK_TEXT.away,true],
  [()=>{throw Object.assign(new Error('x'),{transient:true});},'We could not connect. Please try again.',true],[refusal(503,'SERVER_UNAVAILABLE'),LINK_TEXT.away,true],[refusal(429),LINK_TEXT.away,true],
  [refusal(400),LINK_TEXT.failed,true],[()=>{throw new Error('Your session is paused. Reconnect to continue.');},'Your session is paused. Reconnect to continue.',true]
 ];
 for(const [fail,bare,retryBare] of cases){
  // At Link, back from Discord: the question stays, the answer under it; Link again (to Discord, for a new code) only where it can
  // still work. A 401 without a code of ours there is Discord refusing its code (discord-auth confirm), so Link fetches a new one.
  // A dead link there: whether this farm is linked decides (not linked here: the link is gone).
  const [text,retry]=fail===bare401?[LINK_TEXT.cancelled,true]:[bare,retryBare],dead=text===LINK_TEXT.gone;
  const page=fakePage(),server=fakeServer({display_name:'Sunny',expires_in:540},fail,dead?{linked:false}:{state:S2}),trip=fakeTrip();
  const ui=createDiscordLinkDialog({request:server.request,verify:trip.verify,farmer:()=>'Green Acres',doc:page.doc});
  const closed=ui.open(undefined,{code:C,state:S}),dialog=page.made[0];await settle();
  assert.deepEqual(server.calls,[['peek',{state:S}],['confirm',{state:S,code:C}],...(dead?[['status',undefined]]:[])]);
  if(dead)assert.deepEqual([view(dialog).copy,view(dialog).status],[LINK_TEXT.gone,'']);
  else{assert.equal(view(dialog).status,text,text);assert.equal(view(dialog).kind,'discord-link-status is-error');}
  assert.doesNotMatch(view(dialog).status,/English text from the server/);
  assert.equal(view(dialog).link,retry?'Link':null,text);assert.equal(view(dialog).cancel,retry?'Cancel':'Close');
  if(retry){dialog.parts['[data-link]'].click();await settle();assert.deepEqual(trip.trips,[S2],'tapped again: a new state, to Discord again');assert.deepEqual(server.calls.at(-1),['begin',{state:S}]);}
  dialog.close();assert.deepEqual(await closed,{linked:false});
  // At the question itself: the answer instead of the question; Try again asks once more where that can help.
  const p=fakePage(),s=fakeServer(fail,{display_name:'Sunny',expires_in:500}),u=createDiscordLinkDialog({request:s.request,verify:trip.verify,farmer:()=>'Green Acres',doc:p.doc});
  const c=u.open(T),d=p.made[0];await settle();
  assert.equal(view(d).copy,bare);assert.equal(view(d).note,null);assert.equal(view(d).link,retryBare?'Try again':null);
  if(retryBare){d.parts['[data-link]'].click();await settle();assert.equal(view(d).copy,'Discord user @Sunny wants to play your farm Green Acres in Discord.');assert.equal(view(d).link,'Link');}
  d.close();await c;
 }
 assert.deepEqual(linkProblem(null),{text:LINK_TEXT.failed,retry:true});
 assert.equal(linkQuestion('@sunny','Green Acres'),'Discord user @sunny wants to play your farm Green Acres in Discord.');
 // Every text plain, without a middle dot, and nothing logged (a ticket is never written anywhere).
 for(const text of [...Object.values(LINK_TEXT),...Object.values(UNLINK_TEXT),linkQuestion('{0}','{1}'),linkQuestion('','{0}')])assert.doesNotMatch(text,/·/);
 assert.doesNotMatch(read('public/discord-link-ui.js'),/console\./);
});

test('the wiring: the website and our apps ask (the farmer\'s own session), a portal never; the sign-in card says what it is for',()=>{
 const cloud=read('src/game-cloud.js'),main=read('src/main.js'),session=read('src/farm-session.js');
 assert.match(cloud,/else if\(intent\?\.open==='discord-link'&&!portal&&typeof bridge\.discordLink==='function'\)void \(discordLink\?\?=createDiscordLinkDialog\(\{request:bridge\.discordLink,verify:bridge\.discordVerify,signOut:bridge\.discordSignOut,farmer:farmerName\}\)\)\.open\(intent\.t,intent\)\.then\(result=>\{if\(result\?\.linked\)discordUnlink\?\.show\(\);\}\);/,'the intent carries Discord\'s answer');
 // Settings › Privacy's Played on Discord: the website and both apps, never a portal.
 assert.match(cloud,/const discordUnlink=!portal&&typeof bridge\.discordLink==='function'\?createDiscordUnlink\(\{request:bridge\.discordLink\}\):null;/);
 // Only src/main.js (the website and our apps) gives the farm a way to ask; the portals' farm session has none.
 assert.doesNotMatch(session,/discordLink|discord-auth/);
 assert.match(main,/const DISCORD_AUTH='discord-auth\?forceFunctionRegion=eu-central-1';/);
 assert.match(main,/bridge\.discordLink=async\(op,\{ticket:linkTicket,state,code:discordCode\}=\{\}\)=>\{\n\s+if\(ticket!==generation\|\|!navigator\.onLine\)throw new Error\('Your session is paused\. Reconnect to continue\.'\);\n\s+const \{data,error\}=await supabase\.functions\.invoke\(DISCORD_AUTH,\{body:\{op,ticket:linkTicket,state,code:discordCode\},timeout:20000\}\);/,'supabase-js sends the farmer\'s session and the project\'s key; the link by its ticket or its state, confirm with Discord\'s code');
 // Link's trip to Discord: from this page (top level, never the farm's frame), with the state our server gave (begin), nothing kept
 // in this tab: Discord's answer may come back to a new tab or browser, where code and state are all there is.
 const verify=/bridge\.discordVerify=async\(state,\{again=false\}=\{\}\)=>\{\n[\s\S]*?\n  \};/.exec(main)?.[0]??'';
 assert.match(verify,/const valid=discordTicket\(state\);\n\s+if\(!valid\)throw new Error\('We could not connect\. Please try again\.'\);\n\s+location\.assign\(discordAuthorizeUrl\(valid,again===true\)\);/);
 assert.doesNotMatch(verify,/sessionStorage|localStorage|window\.open|frame/);
 assert.doesNotMatch(main,/harvest-tycoon:discord-link|discordStarted|nonce/);
 // Another account signed in than the one that tapped Link: the dialog's Sign out keeps Discord's answer (only what Discord sends,
 // with a state) as a link through a sign-in, and signs out; the sign-in card then says what it is for.
 assert.match(main,/bridge\.discordSignOut=answer=>\{\n\s+if\(ticket!==generation\)return;\n\s+const back=discordBack\(new Map\(Object\.entries\(Object\(answer\)\)\)\);\n\s+if\(!back\.state\)return;\n\s+pendingOpen=\{open:'discord-link',\.\.\.back\};keepOpen\(pendingOpen\);void signOut\(\);\n\s+\};/);
 assert.deepEqual(discordBack(new Map(Object.entries({code:C,state:S,error:null,t:T}))),{code:C,state:S});
 assert.deepEqual(discordBack(new Map(Object.entries(Object(undefined)))),{});
 assert.doesNotMatch(read('public/privacy.html'),/harvest-tycoon:discord-link/,'nothing of it in the privacy policy\'s list either');
 assert.match(main,/const \{transient,status\}=describeFailure\(error,detail\),code=\[detail\?\.code,detail\?\.error\]\.find\(value=>typeof value==='string'&&\/\^\[A-Z\]\[A-Z_\]\{2,39\}\$\/\.test\(value\)\);throw Object\.assign\(new Error\('We could not connect\. Please try again\.'\),\{status,code,transient\}\);/,'the code as discord-auth sends it ({error:CODE}); its English never reaches the screen');
 // Not signed in on this browser: the sign-in card (they have a farm), with one line on why. Without the link, as before.
 assert.match(main,/function landing\(message=''\)\{connection\.stop\(\);dispose\(\);if\(inApp\)forgetAppPushLink\(window\);if\(!message&&pendingOpen\?\.open==='discord-link'\)message=DISCORD_SIGN_IN;setMode\(/);
 assert.match(main,/const DISCORD_SIGN_IN='Sign in to play your farm on Discord\.';/);
 assert.match(main,/setMode\(message\|\|knownPlayer\(\)\?'signin':'register'\)/,'a message opens the sign-in card');
 // Kept through a sign-in elsewhere for the ticket's 10 minutes, the other links for 30.
 assert.match(main,/Date\.now\(\)-Number\(kept\.at\)<\(kept\.open==='discord-link'\?600000:1800000\)/);
 assert.match(main,/\nif\(pendingOpen\)history\.replaceState\(null,'',withoutOpen\(location\.href\)\);/,'read once, then gone from the address');
});

test('the privacy policy says that Discord confirms the account before a link (identify, the token used once and not kept)',()=>{
 const policy=read('public/privacy.html');
 // Link's check value is our server's (op begin), with the account that tapped Link, not the browser tab's.
 assert.match(policy,/When you tap <em>Link<\/em>, our server keeps with the ticket a scrambled form \(a hash\) of a one-time check value that goes to Discord and back, and which account on our website tapped <em>Link<\/em>, so that Discord’s answer counts only for that account, also when Discord opens it in another browser tab, once and for at most 10 minutes;/);
 assert.match(policy,/While you sign in, our website remembers the link in that browser tab for at most 10 minutes \(<code>harvest-tycoon:open<\/code>, <a href="#cookies">section 8<\/a>\)\./);
 assert.match(policy,/Before linking, our website asks Discord to confirm that you are the same Discord account that asked \(Discord’s <em>identify<\/em> permission\): Discord sends you back with a one-time code, our server exchanges it for an access token, uses that token once to read your Discord user ID and links only if it matches; the token is not stored\./);
 // Updated today, as the sitemap says.
 const day=/Last updated: (\d+) October 2026/.exec(policy)?.[1];
 assert.match(read('public/sitemap.xml'),new RegExp(`<loc>https://www\\.harvesttycoon\\.com/privacy</loc><lastmod>2026-10-${day.padStart(2,'0')}</lastmod>`));
 assert.doesNotMatch(policy,/ · /);
});

test('the look: the game\'s cream dialog, its buttons, a green or red answer line',()=>{
 const css=read('public/settings.css');
 assert.match(css,/\.discord-link-dialog \[hidden\]\{display:none!important\}/,'a hidden button stays hidden (buttons.css gives them a display)');
 assert.match(css,/\.discord-link-dialog \.discord-link-status\.is-done\{color:#3f6b4a\}/);assert.match(css,/\.discord-link-dialog \.discord-link-status\.is-error\{color:#b4513f\}/);
 assert.match(read('public/farm.html'),/<link rel="stylesheet" href="\/settings\.css">/);
});

// Settings › Privacy on the website and in our apps: Played on Discord, and Unlink Discord.
function fakeSettings(){
 const el=extra=>({textContent:'',hidden:false,disabled:false,listeners:{},addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},click(){return Promise.all((this.listeners.click??[]).map(fn=>fn({})));},...extra});
 const classes=new Set(),observers=[];
 const section=el({id:'privacy-settings',classList:{contains:c=>classes.has(c)},append(row){this.appended=row;}});
 const danger=el({before(row){this.placed=row;}}),ids={'privacy-settings':section,'delete-account-row':danger};
 const doc={getElementById:id=>ids[id]??null,createElement(){
  const parts={'[data-unlink]':el(),'[data-unlink-copy]':el(),'[data-unlink-message]':el(),'[data-unlink-title]':el()};
  return {...el(),set innerHTML(v){this.html=v;},get innerHTML(){return this.html;},querySelector:sel=>parts[sel],parts};
 }};
 class Observer{constructor(fn){this.fn=fn;observers.push(this);}observe(target,options){this.target=target;this.options=options;}}
 // Settings › Privacy opens (settings-nav.js gives it is-open), or closes.
 const privacy=open=>{if(open)classes.add('is-open');else classes.delete('is-open');for(const o of observers)o.fn([]);};
 return {doc,section,danger,Observer,observers,privacy};
}
test('Played on Discord in Settings › Privacy: asked once when Privacy opens; Unlink asks first, then Discord opens the farm no more',async()=>{
 const page=fakeSettings(),asks=[];let yes=true;
 const server=fakeServer({linked:true},{ok:true});
 const ui=createDiscordUnlink({request:server.request,doc:page.doc,Observer:page.Observer,ask:async options=>{asks.push(options);return yes;}});
 const row=ui.row;assert.equal(page.danger.placed,row,'above Delete account');assert.equal(row.id,'discord-unlink');assert.equal(row.hidden,true);
 assert.match(row.className,/discord-switch/,'the look of the Settings rows');assert.doesNotMatch(row.html,/\son[a-z]+=/);
 assert.deepEqual(page.observers.map(o=>[o.target,o.options]),[[page.section,{attributes:true,attributeFilter:['class']}]]);
 assert.deepEqual(server.calls,[],'nothing asked before Privacy opens');
 page.privacy(false);await settle();assert.deepEqual(server.calls,[]);
 page.privacy(true);page.privacy(true);await settle();
 assert.deepEqual(server.calls,[['status',undefined]],'once a visit');assert.equal(row.hidden,false);
 assert.equal(row.parts['[data-unlink-title]'].textContent,'Played on Discord');assert.equal(row.parts['[data-unlink-copy]'].textContent,'A Discord account plays this farm too.');
 assert.equal(row.parts['[data-unlink]'].textContent,'Unlink Discord');
 yes=false;await row.parts['[data-unlink]'].click();assert.equal(server.calls.length,1,'Keep it linked: nothing asked');
 assert.deepEqual(asks[0],{title:'Unlink this farm from Discord?',description:'Discord no longer opens this farm, and it is signed out on your other devices. You can link it again from Discord.',confirmLabel:'Unlink',cancelLabel:'Keep it linked',picture:'farm',tone:'danger'});
 yes=true;await row.parts['[data-unlink]'].click();await settle();
 assert.deepEqual(server.calls.at(-1),['unlink',undefined]);
 assert.equal(row.parts['[data-unlink-copy]'].textContent,'Discord no longer opens this farm.');assert.equal(row.parts['[data-unlink]'].hidden,true);
 // Not linked: the row stays away; no answer: asked again the next time Privacy opens.
 const quiet=fakeSettings(),none=fakeServer({linked:false});const q=createDiscordUnlink({request:none.request,doc:quiet.doc,Observer:quiet.Observer});
 quiet.privacy(true);await settle();assert.equal(q.row.hidden,true);
 const flaky=fakeSettings(),down=fakeServer(refusal(503),{linked:true});const f=createDiscordUnlink({request:down.request,doc:flaky.doc,Observer:flaky.Observer});
 flaky.privacy(true);await settle();assert.equal(f.row.hidden,true);flaky.privacy(true);await settle();assert.equal(f.row.hidden,false);assert.equal(down.calls.length,2);
 // Linked in this visit (the dialog's Link): shown at once, no question.
 const fresh=fakeSettings(),idle=fakeServer();const r=createDiscordUnlink({request:idle.request,doc:fresh.doc,Observer:fresh.Observer});r.show();assert.equal(r.row.hidden,false);
 // A refusal in the farmer's words, the row as it was.
 const refused=fakeSettings(),no=fakeServer({linked:true},refusal(503));const x=createDiscordUnlink({request:no.request,doc:refused.doc,Observer:refused.Observer,ask:async()=>true});
 refused.privacy(true);await settle();await x.row.parts['[data-unlink]'].click();await settle();
 assert.equal(x.row.parts['[data-unlink-message]'].textContent,LINK_TEXT.away);assert.equal(x.row.parts['[data-unlink]'].hidden,false);assert.equal(x.row.parts['[data-unlink]'].disabled,false);
 // No way to ask our server (a portal's page around the game): nothing.
 assert.equal(createDiscordUnlink({request:undefined,doc:page.doc}),null);
});
