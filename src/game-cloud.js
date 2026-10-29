import {createAvatarSettings} from '../public/avatar-settings.js';
import {skeleton} from '../public/skeleton.js';
import {WORLD_TWO_LEVEL} from '../public/farm-state.js';
import {createPlayerProfiles} from './player-profiles.js';
import {createAdminDashboard} from './admin-dashboard.js';
import {loadStaff,staffRole} from './staff-badge.js';
import {addSettingsCopyLinks,addFeedbackCopyLink} from '../public/settings-nav.js';
import {createChatUI} from './chat-ui.js';
import {createCloudUI} from './ui.js';
import {renderLeaderboard,updateOnlineIndicators} from './leaderboard.js';
import {loadFamilies} from '../public/family-badge.js';
import {showPaymentReturn} from './payment-ui.js';
import {createStarterPackUI} from './starter-pack-ui.js';
import {stopPageZoom} from './page-zoom.js';
import {watchLoading,errorLine} from '../public/loading-screen.js';
import {startTranslation} from '../public/i18n.js';
import {createPopupUI} from './popup-ui.js';
import {createOfferUI} from './offer-ui.js';
import {createCheckoutReminder} from './checkout-reminder-ui.js';
import {createPortalUI} from './portal-ui.js';
import {portalSells} from '../public/portal.js';
import {markAdminView,startAdminView} from './admin-view.js';
import {createAccountDelete} from './account-delete.js';
import {createSignInLine} from './account-sign-in-ui.js';
import {createDiscordLinkDialog,createDiscordSwitch,createDiscordUnlink} from '../public/discord-link-ui.js';
// 15 Oct 2026 (the 12% report, option 5): room for every file's resource timing. The farm page asks for ~200 files before game.js runs,
// and Chrome keeps only 250 entries by default, so the watch's count of arrived files (public/loading-screen.js filesIn) and its list of
// files that never came (missingFiles) stay right.
try{performance.setResourceTimingBufferSize?.(1000);}catch{}
// How far this start comes and the first thing that breaks on the way (18 Oct 2026, the 12% report, option 1): the stall note takes both
// (public/loading-screen.js noteStall), so a farm that stood still at 12% says where it stopped and why. The first error or rejected
// promise in this page, as one short line (errorLine), whatever threw it.
const startup=window.harvestStartup={stage:'begin',error:null};
const firstError=(reason,event)=>{try{if(!startup.error)startup.error=errorLine(reason,event);}catch{}};
window.addEventListener('error',event=>firstError(event?.error??event?.message,event));
window.addEventListener('unhandledrejection',event=>firstError(event?.reason));
// A browser without import maps (public/compat.js, 23 Oct 2026: Firefox before 108, Chrome before 89) cannot load the game's modules:
// compat.js shows why on this page's own card, and nothing here starts. Before, the farm page was opened again and again, then Try again.
if(window.harvestBoot?.tooOld){window.harvestBoot.show?.();throw new Error('This browser has no import maps.');}
// One part of this page that breaks (18 Oct 2026, review of the 12% fix): its error is the first error, and the page carries on without
// it, so the farm still opens, the watch hears so (and notes the broken part for farm-api: 'part') and the steps after the farm (payment
// return, pop-ups, CrazyGames' start, links from notifications) still run. Before, the rest of this page stopped there.
let brokenPart=false;
const part=start=>{try{return start();}catch(error){brokenPart=true;firstError(error);console.error('A part of the farm page could not start',error);return null;}};
// The game frame never zooms as a page: only the 3D field does (src/page-zoom.js).
stopPageZoom(document);
let bridge;
try{bridge=window.parent!==window?window.parent.harvestBridge:null;}catch{}
// The load chain (11 Oct 2026, Part A A1; public/farm-state.js FIRST_LOOK_CHAIN): the farm page started, on the clock of the page around
// it (where src/crazygames.js keeps its own steps; on the website the chain starts here). public/game.js adds models and render.
try{const chain=window.parent.harvestChain??={};chain.frame??=Math.round(window.parent.performance.now());}catch{}
// src/main.js starts this page while the farm is still on its way from the server (1 Oct 2026): wait for it here. When it does not
// come (a new name is needed, the session ended), the parent takes this page away; nothing more happens here.
let waited=false;
if(bridge?.pending){waited=true;bridge=await bridge.ready.catch(()=>null);}
if(!bridge){if(!waited)location.replace('/play.html');}else{
 window.harvestInitialFarm=bridge.takeInitial();
 // CrazyGames (Oct 2026): the page around the game is src/crazygames.js, with a portal on the bridge (public/portal.js). A farm page
 // that opens again by itself (its Try again) asks that page for the farm; the website's sign-in page never opens inside CrazyGames.
 const portal=bridge.portal??null;
 if(!window.harvestInitialFarm){if(portal)portal.reopen();else window.parent.location.reload();}else{
  // Marked before anything shows or loads: portal.css and the farm's loading tips (public/loading-screen.js) read it. A portal that sells
  // with its own currency (Kongregate's Kreds, 15 Oct 2026; off until Kongregate says yes) keeps the shop (html[data-portal-shop]).
  if(portal){document.documentElement.dataset.portal=portal.name;if(portalSells(portal))document.documentElement.dataset.portalShop='';}
  // The admin view (3 Oct 2026, src/admin-view.js): farm-api answers an admin account with its showcase farm and adminView; the page is
  // marked (and its stylesheet asked for) before it shows, so coins, diamonds and the tools never flash. Never on CrazyGames.
  const adminView=!portal&&window.harvestInitialFarm.adminView===true;
  if(adminView)markAdminView(document);
  // Visiting someone else's farm (24 Oct 2026, public/game.js harvestVisit opens this page over your own): to look at only, so it is
  // marked as an admin view (nothing to play, no pop-ups) and as a visit (only the farm and the way back show). On a portal too (25 Oct
  // 2026, a Kongregate player: the visit opened with every tool, and moving a building only said "You are visiting this farm").
  const visit=Boolean(window.harvestInitialFarm.visit);
  if(visit){markAdminView(document);document.documentElement.dataset.visitView='';}
  document.body.hidden=false;
  const watch=watchLoading(bridge,portal,{translate:()=>void startTranslation(document)});
  // The game's own code is asked for now, before this page's own parts below (18 Oct 2026, the 12% report, option 2: one of them that
  // broke kept public/game.js from ever being asked for, and the bar stood at 12% with every file in). It runs only after this start's
  // own steps, as before (an import never runs within the call), so the parts are there when it does; one that breaks no longer stops it.
  startup.stage='watch';
  const gameLoad=import(/* @vite-ignore */ '/game.js?v=familyhall-model-2');gameLoad.catch(()=>{});
  startup.stage='parts';
  // Our loading screen is on screen now: the page around takes its own away once it is drawn (public/loading-screen.js farmHandOver).
  // A new farm's first look (7 Oct 2026, the CrazyGames launch): the start of the page around this frame (play.html, crazygames.html)
  // and the frame's size in steps of 10 px right away, then when the farm page was first drawn and how long that took (shownAt, loadMs).
  // A tab in the background draws nothing, so only those two wait for a drawn frame. public/game.js sends it with the farm's first request.
  const nextFrame=globalThis.requestAnimationFrame??(fn=>setTimeout(fn,0));
  let started=globalThis.performance?.timeOrigin;try{started=window.parent.performance.timeOrigin||started;}catch{}
  const step=n=>Math.round((n||0)/10)*10,look=window.harvestFirstLook={...(started?{started}:{}),frame:`${step(globalThis.innerWidth)}x${step(globalThis.innerHeight)}`};
  nextFrame(()=>nextFrame(()=>{const now=Date.now();Object.assign(look,{shownAt:now,...(started?{loadMs:Math.round(now-started)}:{})});}));
  nextFrame(()=>nextFrame(()=>{try{window.parent.harvestFarmShown?.();}catch{}}));
  // The game takes the first farm over (and clears harvestInitialFarm); the pop-ups only need its start time (the first half hour).
  const firstState=window.harvestInitialFarm.state;
  const ui=part(()=>createCloudUI({onOpen:openBoard,onRetry:openBoard,onPlayer:()=>profiles?.open(bridge.playerId),onName:async username=>{const data=await bridge.request({operation:'rename',username});ui?.setProfile(data.profile,{id:bridge.playerId});},onSignOut:()=>bridge.signOut()}));
  const profiles=part(()=>createPlayerProfiles(bridge,{showBoard:key=>ui?.showBoard(key),village:()=>Boolean(ui?.villageShown)})),serverOffset=bridge.serverNow-(Number.isFinite(bridge.serverAt)?bridge.serverAt:Date.now());
  // The chat (header button, next to Farm Family) and the Admin dashboard, which the moderators may open too.
  const chat=part(()=>createChatUI({bridge,profiles}));
  // Farm Family's chat button (public/family-ui.js) opens it on the family's own tab.
  if(chat)window.harvestChat=chat;
  part(()=>createAdminDashboard(bridge,{chat}));
  // Its own topbar numbers and menu (How to play, Chat, Admin panel), before the game's menu starts.
  if(adminView)part(()=>startAdminView({bridge}));
  // On CrazyGames the purchases, links and account buttons step aside (portal.css) and the page's own lines come in (src/portal-ui.js).
  if(portal)part(()=>createPortalUI({portal}));
  // Discord (Oct 2026, public/discord-link-ui.js): in the Activity, a farm made on Discord only can make way for the farmer's
  // harvesttycoon.com farm (Settings, Your account). Nowhere else: the portal says whether this is one (discordOnly).
  const farmerName=()=>document.getElementById('player-name')?.dataset.username??'',firstLevel=window.harvestInitialFarm.profile?.level;
  if(portal)part(()=>createDiscordSwitch({portal,farmer:farmerName,level:()=>firstLevel}));
  // Settings, Your account: "You sign in with Google." and the masked address, with Set a password for an account without one (17 Oct
  // 2026, src/account-sign-in-ui.js). On the website and in both apps; never on a portal (the portal made the account; its bridge has no
  // signIn) or in the admin view.
  if(!portal&&!adminView&&bridge.signIn)part(()=>createSignInLine({info:bridge.signIn,setPassword:bridge.setPassword}));
  // Settings › Privacy › Delete account (3 Oct 2026, src/account-delete.js): on the website and in both apps, never on CrazyGames.
  if(!portal)part(()=>createAccountDelete({bridge,name:()=>document.getElementById('player-name')?.dataset.username??''}));
  // Settings › Privacy › Played on Discord (Oct 2026, public/discord-link-ui.js): a farm a Discord account plays, and Unlink Discord.
  // On the website and in both apps (src/main.js bridge.discordLink), never on a portal.
  const discordUnlink=!portal&&typeof bridge.discordLink==='function'?part(()=>createDiscordUnlink({request:bridge.discordLink})):null;
  // The Family Members list opens a farmer's profile too (public/family-ui.js).
  if(profiles)window.harvestProfiles=profiles;
  if(ui)part(()=>{ui.setProfile(window.harvestInitialFarm.profile,{id:bridge.playerId});ui.status('Live rankings');});
  part(()=>createAvatarSettings(document.getElementById('avatar-settings'),{bridge,profile:window.harvestInitialFarm.profile,state:window.harvestInitialFarm.state,owner:loadStaff(bridge.chat).then(()=>staffRole(bridge.playerId)==='admin'),onSaved:profile=>ui?.setProfile(profile,{id:bridge.playerId})}));
  // Copy link beside each Settings part (4 Oct 2026, public/settings-nav.js) and beside Feedback's title (6 Oct 2026): for an admin or a
  // moderator only, never on CrazyGames.
  if(!portal)void loadStaff(bridge.chat).then(()=>{if(staffRole(bridge.playerId)){addSettingsCopyLinks(document.getElementById('sound-dialog'));addFeedbackCopyLink(document.getElementById('feedback-dialog'));}});
  const stopPresence=part(()=>bridge.presence?.subscribe(snapshot=>{if(ui?.open)updateOnlineIndicators(ui.results,{...snapshot,now:Date.now()+serverOffset});}));
  const boardRefresh=setInterval(()=>{if(ui?.open&&!profiles?.isOpen&&!document.hidden)openBoard(true);},30000);
  window.addEventListener('pagehide',()=>{stopPresence?.();clearInterval(boardRefresh);},{once:true});
  let boardRequest=0,board=null,boardPage=0;
  // The board keeps its page when it refreshes (every 30 seconds); a new board, or opening it again, starts on page 1.
  const drawBoard=()=>{renderLeaderboard(ui.results,{...board,page:boardPage,now:Date.now()+serverOffset},bridge.playerId,id=>profiles.open(id),page=>{boardPage=page;drawBoard();ui.results.scrollIntoView?.({block:'start'});});
   // The family badges (29 Oct 2026, public/family-badge.js): the farmers on this board, read once a minute; drawn again when one came in.
   const shown=board;void loadFamilies([...(board?.rows??[]).map(r=>r.player_id),board?.own?.player_id]).then(changed=>{if(changed&&ui?.open&&board===shown)drawBoard();});};
  // The last board of each kind shows at once when it opens again (or was read in the background after the farm opened), while
  // the newest loads; a board never seen shows placeholder rows (1 Oct 2026).
  const boardCache=new Map();
  async function openBoard(quiet=false){const request=++boardRequest,category=ui.category,cached=!quiet&&boardCache.get(category);if(cached){board=cached;boardPage=0;drawBoard();}else if(!quiet)ui.results.innerHTML=skeleton('Gathering the latest scores…',{rows:6});ui.results.setAttribute('aria-busy','true');try{const result=await bridge.leaderboard(category);await loadStaff(bridge.chat);if(request!==boardRequest)return;if(result.own)ui.showVillage((result.own.level??0)>=WORLD_TWO_LEVEL);if(!quiet&&!cached||board?.category!==result.category)boardPage=0;board=result;boardCache.set(result.category,result);drawBoard();ui.status('');}catch(error){if(request===boardRequest){if(!quiet)ui.message(error.message);ui.status('Could not refresh');}}finally{if(request===boardRequest)ui.results.setAttribute('aria-busy','false');}}
  startup.stage='game';
  let game=null;try{game=await gameLoad;startup.stage='farm';}catch(error){firstError(error);console.error('The game could not load',error);}
  // A farm start that broke before the game's own error card (11 Oct 2026: its loading screen, or a farm whose models nearly all failed,
  // public/game.js init) fails like the code that did not come: opened once more by itself, then Try again. Before, neither was said and
  // the bar stood still until the 30 seconds were up.
  const ready=game?await game.farmReady.catch(error=>{firstError(error);console.error('The game could not load',error);game=null;return false;}):false;
  if(ready)startup.stage='ready';
  // A farm whose start failed on its own error card (21 Oct 2026, public/farm-start.js): that failure ('[webgl]' or '[init]' and its error)
  // goes into the note for the next farm load (public/loading-screen.js watchLoading done).
  if(!game)watch.failed();else watch.done(ready,{brokenPart,failure:ready?null:game.farmFailure??null});
  if(ready){
   // CrazyGames' SDK (src/crazygames.js): the farm is loaded and can be played.
   if(portal){portal.event('loadingStop');portal.event('gameplayStart');}
   // The board the leaderboard opens on, read once in the background, so the first look needs no wait.
   if(ui)setTimeout(()=>{const category=ui.category;if(!boardCache.has(category))bridge.leaderboard(category).then(result=>{if(!boardCache.has(result.category))boardCache.set(result.category,result);}).catch(()=>{});},8000);
   // No purchases on CrazyGames (their rule): no payment return, special offer or Starter Pack there. On Kongregate only once it sells
   // Kreds (public/portal.js portalSells, 15 Oct 2026).
   const shop=!portal||portalSells(portal);
   if(shop)showPaymentReturn(bridge);
   // The app's store (Oct 2026, src/main.js: Google Play in the Android app, the App Store in the iPhone app): a purchase confirmed in the
   // app shows in the same window, and one paid while the game was closed (never confirmed) is confirmed now. A Stripe payment in a new
   // tab (the game in a frame on another site) shows there too, waiting for it ({tab:true}). Kreds on Kongregate the same way (15 Oct
   // 2026, src/kongregate-kreds.js): what was bought at Kongregate and never credited (the page closed during the purchase window) now.
   if(shop)bridge.purchaseDone=(id,more)=>showPaymentReturn(bridge,{id,cancelled:false,...more});
   if(shop&&(bridge.playSettle||bridge.kreds))void bridge.playRecover?.().catch(()=>{});
   // A pop-up from the admin (news with a button), once, when nothing else is open. It does not wait for the Starter Pack's catalog.
   void createPopupUI({client:bridge.chat,chat,state:firstState}).start();
   // The special offer listens for the Starter Pack's catalogue, so it starts first.
   // The reminder of a website purchase started but not paid (23 Oct 2026, src/checkout-reminder-ui.js): it listens for the same
   // catalogue and waits until nothing else is open (the special offer opens first); never on a portal.
   if(shop&&!portal)part(()=>createCheckoutReminder(bridge));
   if(shop){createOfferUI(bridge);
   await createStarterPackUI(bridge);}
   // One screen from a notification, a shortcut on the app icon or a link (public/app-links.js). src/main.js keeps it until the farm is
   // ready, and hands over what arrives later.
   let discordLink=null;
   window.harvestOpen=intent=>{
    if(intent?.open==='chat')void chat?.open(intent.channel?{channel:intent.channel}:{});
    else if(intent?.open==='today')window.harvestToday?.();
    else if(intent?.open==='leaderboard')document.getElementById('leaderboard-button')?.click();
    // Settings at one part (4 Oct 2026, /settings/<part>): public/game.js harvestSettings, the list when the part is not here.
    else if(intent?.open==='settings')window.harvestSettings?.(intent.part);
    // The Feedback window (6 Oct 2026, /feedback): the button that opens it, as a pop-up's or a chat chip does.
    else if(intent?.open==='feedback')document.getElementById('feedback-button')?.click();
    // Play this farm on Discord? (Oct 2026, /discord-link?t=…, public/discord-link-ui.js): on the website and in our apps only, whose
    // page around the game asks our server with this farmer's session (src/main.js bridge.discordLink). Never on a portal. Link goes to
    // Discord first (bridge.discordVerify) and comes back here, in this tab or another, with Discord's answer (/discord-link/callback:
    // the intent's code, state or error), which is all the question needs. Signed in with another account than the one that tapped
    // Link: Sign out there keeps that answer for the next sign-in (bridge.discordSignOut).
    else if(intent?.open==='discord-link'&&!portal&&typeof bridge.discordLink==='function')void (discordLink??=createDiscordLinkDialog({request:bridge.discordLink,verify:bridge.discordVerify,signOut:bridge.discordSignOut,farmer:farmerName})).open(intent.t,intent).then(result=>{if(result?.linked)discordUnlink?.show();});
   };
   const waiting=window.parent?.harvestTakeOpen?.();if(waiting)window.harvestOpen(waiting);
  }
 }
}
