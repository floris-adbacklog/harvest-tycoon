import {supabase,portalClient,useClient,supabaseKey,functionsUrl,isConfigured,verifiedUser,farmRequest,cloudError} from './supabase.js';
import {createFarmSession} from './farm-session.js';
import {createFarmPresence} from './presence.js';
import {fetchLeaderboard} from './leaderboard.js';
import {createChatClient} from './chat-client.js';
import {createKongregateLink,localStandIn} from './kongregate-link.js';
import {runKongregatePage} from './kongregate-page.js';
import {isLocalHost} from './crazygames-link.js';
import {stopPageZoom} from './page-zoom.js';
import {startUpdateCheck} from './app-update.js';
import {startTranslation,chooseLanguage,chosenLanguage} from '../public/i18n.js';
import {startLoadingTips,farmHandOver} from '../public/loading-screen.js';
// Harvest Tycoon on Kongregate (Oct 2026): public/kongregate.html, shown by Kongregate in a frame on its game page (their "Iframe" game
// type), with Kongregate's API script (src/kongregate-link.js). What the page does is src/kongregate-page.js; this file hands it the
// real things it talks to: Kongregate's API, our Supabase project, the farm session, the translation and the loading screen.
const framed=window.parent!==window,local=isLocalHost(location.hostname);
// Opened on its own on our own address: this page is for Kongregate only, so the visitor goes to the website.
if(!framed&&!local)location.replace('/');
else void runKongregatePage({
 link:framed?createKongregateLink({win:window}):localStandIn({search:location.search}),
 portalClient,setClient:useClient,functionsUrl,supabaseKey,isConfigured,createFarmSession,cloudError,
 sessionDeps:{supabase:()=>supabase,verifiedUser,farmRequest,fetchLeaderboard,createFarmPresence,createChatClient},
 startTranslation,chooseLanguage,chosenLanguage,startUpdateCheck,startLoadingTips,farmHandOver,stopPageZoom
});
